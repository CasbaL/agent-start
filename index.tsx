import React from 'react';
import { render } from 'ink';
import { WelcomeScreen } from './src/tui/screens/welcome';
import { InputScreen } from './src/tui/screens/input';
import { parseArgs, type CliOptions, type StartupSelfCheckResult } from './agent';

const options = parseArgs(process.argv.slice(2));

function createInputScreen(): void {
  const { unmount } = render(
    <InputScreen
      onSubmit={() => {
        unmount();
      }}
      onExit={() => {
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
  createInputScreen();
} else {
  render(
    <WelcomeScreen
      options={options}
      onReady={(_result: StartupSelfCheckResult) => {
        createInputScreen();
      }}
    />,
    { exitOnCtrlC: true },
  );
}
