import React from 'react';
import { render } from 'ink';
import { WelcomeScreen } from './src/tui/screens/welcome';
import { parseArgs, type CliOptions } from './agent';

const options = parseArgs(process.argv.slice(2));

if (options.selfCheckOnly) {
  // For --self-check, just run and exit (keep existing behavior)
  import('./agent').then(({ runStartupSelfCheck, getOpenRouterProvider }) => {
    runStartupSelfCheck(options, getOpenRouterProvider()).then((result) => {
      console.log(result.message);
      process.exit(0);
    });
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
