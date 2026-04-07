import React from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { MatchedRepository, UserIntent } from '../../../agent';

type ResultsScreenProps = {
  matches: MatchedRepository[];
  intent: UserIntent;
  summary: string;
  onSelect: (index: number) => void;
  onExit: () => void;
};

export function ResultsScreen({ matches, summary, onSelect, onExit }: ResultsScreenProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
    if (key.downArrow && selectedIndex < matches.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
    if (input === '\r') {
      onSelect(selectedIndex);
    }
    if (input === 'q') {
      exit();
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box flexDirection="column" alignItems="center" marginBottom={1}>
        <Text bold>📦 推荐结果</Text>
        <Text dimColor>{matches.length} 个仓库</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2}>
        {matches.map((item, index) => (
          <Box key={item.repo.fullName} flexDirection="column" marginBottom={1}>
            <Text bold {...(index === selectedIndex ? { color: 'cyan' } : {})}>
              {index === selectedIndex ? '▸ ' : '  '}
              {item.repo.fullName}
            </Text>
            <Text dimColor>
              {index === selectedIndex ? '  ' : '    '}
              {item.repo.description}
            </Text>
            <Text dimColor>
              {index === selectedIndex ? '  ' : '    '}
              技术栈: {item.repo.technologies.join(', ')} | 评分: {item.score}
            </Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1} marginLeft={2}>
        <Text dimColor>↑↓ 浏览 | Enter 查看详情 | q 退出</Text>
      </Box>
    </Box>
  );
}
