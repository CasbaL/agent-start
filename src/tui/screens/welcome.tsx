import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
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

export function WelcomeScreen({ options, onReady }: WelcomeScreenProps) {
  const [result, setResult] = useState<StartupSelfCheckResult | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    runStartupSelfCheck(options, getOpenRouterProvider()).then((r) => {
      setResult(r);
      setChecking(false);
    });
  }, []);

  useInput((input) => {
    if (input === '\r' && result) {
      onReady(result);
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
            <Text>启动自检</Text>
            <Spinner label="" />
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
