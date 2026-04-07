import React from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';

type InputScreenProps = {
  onSubmit: (input: string) => void;
  onExit: () => void;
};

export function InputScreen({ onSubmit, onExit }: InputScreenProps) {
  useInput((_input, key) => {
    if (key.escape) {
      onExit();
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box flexDirection="column" alignItems="center" marginBottom={1}>
        <Text bold>🔍 Repository Agent</Text>
        <Text dimColor>AI 驱动的仓库推荐工具</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2}>
        <Text>请输入你的需求：</Text>
        <Box marginTop={1}>
          <Text color="cyan">▸ </Text>
          <TextInput
            onSubmit={(v: string) => {
              if (v.trim()) {
                onSubmit(v.trim());
              }
            }}
            placeholder="例如：帮我推荐适合做 AI Agent 的 Node.js 仓库"
          />
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Enter 提交 | Esc 退出</Text>
        </Box>
      </Box>
    </Box>
  );
}
