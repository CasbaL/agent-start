import React from 'react';
import { Box, Text } from 'ink';

type BoxFrameProps = {
  title?: string;
  children: React.ReactNode;
  padding?: number;
  footer?: string;
};

export function BoxFrame({ title, children, padding = 1, footer }: BoxFrameProps) {
  return (
    <Box flexDirection="column">
      {title && (
        <Text bold>
          {'  '}
          {title}
        </Text>
      )}
      <Box paddingLeft={padding}>{children}</Box>
      {footer && (
        <Text dimColor>
          {'  '}
          {footer}
        </Text>
      )}
    </Box>
  );
}
