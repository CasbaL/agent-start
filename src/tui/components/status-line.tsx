import React from 'react';
import { Text } from 'ink';

type StatusKind = 'pending' | 'running' | 'done' | 'error';

type StatusLineProps = {
  label: string;
  status: StatusKind;
};

const icons: Record<StatusKind, string> = {
  pending: '○',
  running: '⠋',
  done: '✓',
  error: '✗',
};

const textProps: Record<StatusKind, React.ComponentProps<typeof Text>> = {
  pending: { dimColor: true },
  running: { color: 'yellow' },
  done: { color: 'green' },
  error: { color: 'red' },
};

export function StatusLine({ label, status }: StatusLineProps) {
  const icon = icons[status];
  const props = textProps[status];
  return (
    <Text {...props}>
      {icon} {label}
    </Text>
  );
}
