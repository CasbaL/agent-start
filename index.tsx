import React from 'react';
import { render } from 'ink';
import { WelcomeScreen } from './src/tui/screens/welcome';
import { InputScreen } from './src/tui/screens/input';
import { ProcessingScreen } from './src/tui/screens/processing';
import { parseArgs, type CliOptions, type StartupSelfCheckResult } from './agent';

const options = parseArgs(process.argv.slice(2));

function createProcessingScreen(userInput: string, offline: boolean): void {
  const processingOptions: CliOptions = { ...options, offline };
  const { unmount } = render(
    <ProcessingScreen
      userInput={userInput}
      options={processingOptions}
      onComplete={(intent, matches, summary) => {
        console.log('\n=== 推荐结果 ===\n');
        console.log(summary);
        unmount();
      }}
      onError={() => {
        unmount();
      }}
    />,
    { exitOnCtrlC: true },
  );
}

function createInputScreen(onSubmit: (input: string) => void, onExit: () => void): void {
  const { unmount } = render(
    <InputScreen
      onSubmit={(input: string) => {
        onSubmit(input);
        unmount();
      }}
      onExit={() => {
        onExit();
        unmount();
      }}
    />,
    { exitOnCtrlC: true },
  );
}

if (options.selfCheckOnly) {
  import('./agent')
    .then(({ runStartupSelfCheck, getOpenRouterProvider }) => {
      runStartupSelfCheck(options, getOpenRouterProvider()).then((result) => {
        console.log(result.message);
        process.exit(0);
      });
    })
    .catch((error) => {
      console.error('启动失败:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
} else if (options.userInput) {
  createProcessingScreen(options.userInput, options.offline);
} else {
  render(
    <WelcomeScreen
      options={options}
      onReady={(result: StartupSelfCheckResult) => {
        createInputScreen(
          (input: string) => {
            createProcessingScreen(input, result.offline);
          },
          () => {
            process.exit(0);
          },
        );
      }}
    />,
    { exitOnCtrlC: true },
  );
}
