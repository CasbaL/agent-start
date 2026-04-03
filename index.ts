import { runCli } from './agent';

runCli().catch((error) => {
  console.error('\n[error] 程序执行失败');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
