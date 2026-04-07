import React from 'react';
import { render } from 'ink';
import { App } from './src/tui/app';
import { parseArgs, runStartupSelfCheck, getOpenRouterProvider } from './agent';

const options = parseArgs(process.argv.slice(2));

if (options.selfCheckOnly) {
  runStartupSelfCheck(options, getOpenRouterProvider())
    .then((result) => {
      console.log(result.message);
      process.exit(0);
    })
    .catch((error) => {
      console.error('启动失败:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
} else {
  render(<App options={options} />, { exitOnCtrlC: true });
}
