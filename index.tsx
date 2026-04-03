import React from 'react';
import { render } from 'ink';
import { WelcomeScreen } from './src/tui/screens/welcome';
import { parseArgs, type CliOptions } from './agent';

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
} else {
  const { unmount } = render(
    <WelcomeScreen
      options={options}
      onReady={(result) => {
        console.log('\n[debug] Welcome done, offline:', result.offline);
        unmount();
      }}
    />,
    { exitOnCtrlC: true },
  );
}
