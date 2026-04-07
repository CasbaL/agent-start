import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import {
  runStartupSelfCheck,
  getOpenRouterProvider,
  type CliOptions,
  type StartupSelfCheckResult,
} from '../../../agent';

type WelcomeScreenProps = {
  options: CliOptions;
  onReady: (result: StartupSelfCheckResult) => void;
};

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function WelcomeScreen({ options, onReady }: WelcomeScreenProps) {
  const [result, setResult] = useState<StartupSelfCheckResult | null>(null);
  const [checking, setChecking] = useState(true);
  const [spinnerFrame, setSpinnerFrame] = useState(0);
  const { exit } = useApp();

  useEffect(() => {
    runStartupSelfCheck(options, getOpenRouterProvider())
      .then((r) => {
        setResult(r);
        setChecking(false);
      })
      .catch((error) => {
        setResult({
          canUseLLM: false,
          offline: true,
          message: `自检失败: ${error instanceof Error ? error.message : String(error)}`,
        });
        setChecking(false);
      });
  }, []);

  useEffect(() => {
    if (!checking) return;
    const interval = setInterval(() => {
      setSpinnerFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(interval);
  }, [checking]);

  useInput((input, key) => {
    if (input === '\r' && result) {
      onReady(result);
    }
    if (input === 'q' || key.escape) {
      exit();
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box flexDirection="column" alignItems="center" marginBottom={1}>
        <Text bold>🔍 Repository Agent</Text>
        <Text dimColor>AI 驱动的仓库推荐工具</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2}>
        {checking ? (
          <Box>
            <Text>启动自检{SPINNER_FRAMES[spinnerFrame]}</Text>
          </Box>
        ) : result ? (
          <>
            <Text color="green">✓ {result.message}</Text>
            <Box marginTop={1}>
              <Text dimColor>按 Enter 开始...</Text>
            </Box>
          </>
        ) : null}
      </Box>
    </Box>
  );
}
