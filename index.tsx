import React from 'react';
import { render } from 'ink';
import { App } from './src/tui/app';
import {
  parseArgs,
  runStartupSelfCheck,
  getOpenRouterProvider,
  analyzeIntent,
  matchRepositories,
  summarizeMatches,
} from './agent';

const options = parseArgs(process.argv.slice(2));

async function runNonInteractive() {
  const selfCheck = await runStartupSelfCheck(options, getOpenRouterProvider());
  const offline = selfCheck.offline || options.offline;

  console.log('🔍 Repository Agent - AI 驱动的仓库推荐工具\n');

  const intent = await analyzeIntent(options.userInput!, options, getOpenRouterProvider());
  const matches = matchRepositories(intent);
  const summary = await summarizeMatches(
    options.userInput!,
    intent,
    matches,
    { ...options, offline },
    getOpenRouterProvider(),
  );

  console.log('=== 推荐结果 ===\n');
  console.log(summary);
  console.log('\n=== 仓库列表 ===');
  matches.forEach((m, i) => {
    console.log(`\n${i + 1}. ${m.repo.fullName}`);
    console.log(`   ${m.repo.description}`);
    console.log(`   评分: ${m.score}`);
  });
}

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
} else if (options.userInput) {
  runNonInteractive()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('处理失败:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
} else if (!process.stdin.isTTY) {
  console.error('错误: TUI 模式需要一个交互式终端。');
  console.error('');
  console.error('使用方式:');
  console.error('  pnpm start -- "你的需求"           # 直接传入需求');
  console.error('  pnpm start --offline "你的需求"  # 离线模式');
  console.error('');
  console.error('示例:');
  console.error('  pnpm start -- "推荐一些 Node.js AI 仓库"');
  process.exit(1);
} else {
  try {
    render(<App options={options} />, { exitOnCtrlC: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('启动失败:', errMsg);
    process.exit(1);
  }
}
