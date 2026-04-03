import React from 'react';
import { render } from 'ink';
import { WelcomeScreen } from './src/tui/screens/welcome';
import { InputScreen } from './src/tui/screens/input';
import { parseArgs, type CliOptions, type StartupSelfCheckResult } from './agent';

const options = parseArgs(process.argv.slice(2));

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
  const { unmount } = render(
    <InputScreen
      onSubmit={(input) => {
        console.log('\n[debug] Input:', input);
        unmount();
      }}
      onExit={() => {
        console.log('\n[debug] Exit');
        unmount();
      }}
    />,
    { exitOnCtrlC: true },
  );
} else {
  const { unmount } = render(
    <WelcomeScreen
      options={options}
      onReady={(result: StartupSelfCheckResult) => {
        unmount();
        const { unmount: unmountInput } = render(
          <InputScreen
            onSubmit={(input) => {
              console.log('\n[debug] Input:', input);
              unmountInput();
            }}
            onExit={() => {
              console.log('\n[debug] Exit');
              unmountInput();
            }}
          />,
          { exitOnCtrlC: true },
        );
      }}
    />,
    { exitOnCtrlC: true },
  );
}
