import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { StatusLine } from '../components/status-line';
import {
  analyzeIntent,
  matchRepositories,
  summarizeMatches,
  getOpenRouterProvider,
  type CliOptions,
  type UserIntent,
  type MatchedRepository,
} from '../../../agent';

type StepStatus = 'pending' | 'running' | 'done' | 'error';

type ProcessingScreenProps = {
  userInput: string;
  options: CliOptions;
  onComplete: (intent: UserIntent, matches: MatchedRepository[], summary: string) => void;
  onError: (error: string) => void;
};

export function ProcessingScreen({
  userInput,
  options,
  onComplete,
  onError,
}: ProcessingScreenProps) {
  const [intentStatus, setIntentStatus] = useState<StepStatus>('running');
  const [matchStatus, setMatchStatus] = useState<StepStatus>('pending');
  const [summaryStatus, setSummaryStatus] = useState<StepStatus>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const currentStepRef = React.useRef<'intent' | 'match' | 'summary'>('intent');

  const run = useCallback(async () => {
    try {
      currentStepRef.current = 'intent';
      setIntentStatus('running');
      const intent = await analyzeIntent(userInput, options, getOpenRouterProvider());
      setIntentStatus('done');

      currentStepRef.current = 'match';
      setMatchStatus('running');
      const matches = matchRepositories(intent);
      setMatchStatus('done');

      currentStepRef.current = 'summary';
      setSummaryStatus('running');
      const summary = await summarizeMatches(
        userInput,
        intent,
        matches,
        options,
        getOpenRouterProvider(),
      );
      setSummaryStatus('done');

      onComplete(intent, matches, summary);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setErrorMessage(msg);
      if (currentStepRef.current === 'intent') setIntentStatus('error');
      else if (currentStepRef.current === 'match') setMatchStatus('error');
      else setSummaryStatus('error');
    }
  }, [userInput, options, onComplete]);

  useEffect(() => {
    run();
  }, [run]);

  useInput((input) => {
    if (errorMessage) {
      if (input === '\r') {
        setIntentStatus('running');
        setMatchStatus('pending');
        setSummaryStatus('pending');
        setErrorMessage(null);
        run();
      }
      if (input === 'q') {
        onError(errorMessage);
      }
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box flexDirection="column" alignItems="center" marginBottom={1}>
        <Text bold>⚙ 正在处理...</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2}>
        <StatusLine label="分析用户意图" status={intentStatus} />
        <StatusLine label="匹配候选仓库" status={matchStatus} />
        <StatusLine label="生成推荐总结" status={summaryStatus} />
        {errorMessage && (
          <Box marginTop={1} flexDirection="column">
            <Text color="red">✗ 错误: {errorMessage}</Text>
            <Text dimColor>按 Enter 重试，按 q 退出</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
