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

const colors: Record<StatusKind, (text: string) => React.ReactNode> = {
  pending: (t) => <Text dimColor>{t}</Text>,
  running: (t) => <Text color="yellow">{t}</Text>,
  done: (t) => <Text color="green">{t}</Text>,
  error: (t) => <Text color="red">{t}</Text>,
};

export function StatusLine({ label, status }: StatusLineProps) {
  const icon = icons[status];
  const colorFn = colors[status];
  return <Text>{colorFn(`${icon}  ${label}`)}</Text>;
}
