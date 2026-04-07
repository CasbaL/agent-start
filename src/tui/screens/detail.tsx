import React from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { MatchedRepository } from '../../../agent';

type DetailScreenProps = {
  match: MatchedRepository;
  onBack: () => void;
  onExit: () => void;
};

export function DetailScreen({ match, onBack, onExit }: DetailScreenProps) {
  const { exit } = useApp();

  useInput((input) => {
    if (input === 'b') {
      onBack();
    }
    if (input === 'q') {
      exit();
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box flexDirection="column" alignItems="center" marginBottom={1}>
        <Text bold>📋 {match.repo.fullName}</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2}>
        <Text>描述: {match.repo.description}</Text>
        <Text>分类: {match.repo.category}</Text>
        <Text>技术栈: {match.repo.technologies.join(', ')}</Text>
        <Text>评分: {match.score}</Text>

        <Box marginTop={1} flexDirection="column">
          <Text bold>推荐理由:</Text>
          {match.reasons.map((reason, i) => (
            <Text key={i}> • {reason}</Text>
          ))}
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text bold>使用场景:</Text>
          {match.repo.useCases.map((uc, i) => (
            <Text key={i}> • {uc}</Text>
          ))}
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text bold>亮点:</Text>
          {match.repo.highlights.map((hl, i) => (
            <Text key={i}> • {hl}</Text>
          ))}
        </Box>
      </Box>

      <Box marginTop={1} marginLeft={2}>
        <Text dimColor>b 返回 | q 退出</Text>
      </Box>
    </Box>
  );
}
