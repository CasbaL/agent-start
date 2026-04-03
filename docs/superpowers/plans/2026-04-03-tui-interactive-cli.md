# TUI Interactive CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace plain-text CLI interaction with a full-screen TUI using ink + @inkjs/ui, covering startup self-check, input, processing animation, results browsing, and detail view.

**Architecture:** Create a React-based TUI with a screen state machine (Welcome → Input → Processing → Results ↔ Detail). All business logic stays in agent.ts; TUI components import and call agent functions.

**Tech Stack:** ink v6, @inkjs/ui v2, React 19, tsx (existing), zod (existing)

---

### Task 0: Add dependencies and update tsconfig

**Files:**

- Modify: `package.json` — add ink, @inkjs/ui, react, @types/react
- Modify: `tsconfig.json` — add `src/` and `*.tsx` to include, add `jsx` option
- Test: `pnpm install`

- [ ] **Step 1: Add TUI dependencies**

Add to `package.json` dependencies:

```json
"ink": "^6.0.0",
"@inkjs/ui": "^2.0.0",
"react": "^19.0.0",
"@types/react": "^19.0.0"
```

- [ ] **Step 2: Update tsconfig.json**

Change `tsconfig.json` to support JSX and include src/:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "jsx": "react-jsx",
    "types": ["node", "vitest/globals"]
  },
  "include": ["*.ts", "*.tsx", "src/**/*.ts", "src/**/*.tsx", "test/**/*.ts"]
}
```

- [ ] **Step 3: Install dependencies**

```bash
pnpm install
```

- [ ] **Step 4: Verify typecheck still passes**

```bash
pnpm typecheck
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json
git commit -m "chore: add ink, react, and @inkjs/ui dependencies for TUI"
```

---

### Task 1: Create shared TUI components

**Files:**

- Create: `src/tui/components/box-frame.tsx`
- Create: `src/tui/components/status-line.tsx`

- [ ] **Step 1: Create BoxFrame component**

Create `src/tui/components/box-frame.tsx` — a bordered card container:

```tsx
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
```

- [ ] **Step 2: Create StatusLine component**

Create `src/tui/components/status-line.tsx` — shows step status with icons:

```tsx
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
  running: (t) => <Text yellow>{t}</Text>,
  done: (t) => <Text green>{t}</Text>,
  error: (t) => <Text red>{t}</Text>,
};

export function StatusLine({ label, status }: StatusLineProps) {
  const icon = icons[status];
  const colorFn = colors[status];
  return <Text>{colorFn(`${icon}  ${label}`)}</Text>;
}
```

- [ ] **Step 3: Verify typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/tui/components/
git commit -m "feat: add shared TUI components (BoxFrame, StatusLine)"
```

---

### Task 2: Create Welcome screen

**Files:**

- Create: `src/tui/screens/welcome.tsx`
- Modify: `index.ts` — temporarily wire up Welcome screen for testing

- [ ] **Step 1: Create Welcome screen**

Create `src/tui/screens/welcome.tsx`:

```tsx
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
            <Text green>✓ {result.message}</Text>
            <Box marginTop={1}>
              <Text dimColor>按 Enter 开始...</Text>
            </Box>
          </>
        ) : null}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Update index.ts to render Welcome screen**

Modify `index.ts`:

```tsx
import React from 'react';
import { render } from 'ink';
import { WelcomeScreen } from './src/tui/screens/welcome';
import { parseArgs, type CliOptions } from './agent';

const options = parseArgs(process.argv.slice(2));

if (options.selfCheckOnly) {
  // For --self-check, just run and exit (keep existing behavior)
  import('./agent').then(({ runStartupSelfCheck, getOpenRouterProvider }) => {
    runStartupSelfCheck(options, getOpenRouterProvider()).then((result) => {
      console.log(result.message);
      process.exit(0);
    });
  });
} else {
  const { unmount } = render(
    <WelcomeScreen
      options={options}
      onReady={(result) => {
        console.log('\n[debug] Welcome done, offline:', result.offline);
        unmount();
      }}
    />,
    { exitOnCtrlC: true },
  );
}
```

- [ ] **Step 3: Test Welcome screen**

```bash
pnpm start -- --offline
```

Expected: Shows title, self-check result, waits for Enter.

- [ ] **Step 4: Commit**

```bash
git add index.ts src/tui/screens/welcome.tsx
git commit -m "feat: add Welcome screen with startup self-check"
```

---

### Task 3: Create Input screen

**Files:**

- Create: `src/tui/screens/input.tsx`
- Modify: `index.ts` — wire Input screen after Welcome

- [ ] **Step 1: Create Input screen**

Create `src/tui/screens/input.tsx`:

```tsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';

type InputScreenProps = {
  onSubmit: (input: string) => void;
  onExit: () => void;
};

export function InputScreen({ onSubmit, onExit }: InputScreenProps) {
  const [value, setValue] = useState('');

  useInput((input, key) => {
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
          <Text cyan>▸ </Text>
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={(v) => {
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
```

- [ ] **Step 2: Wire Input screen in index.ts**

Update `index.ts` to chain Welcome → Input:

```tsx
import React, { useState } from 'react';
import { render } from 'ink';
import { WelcomeScreen } from './src/tui/screens/welcome';
import { InputScreen } from './src/tui/screens/input';
import { parseArgs, type CliOptions, type StartupSelfCheckResult } from './agent';

const options = parseArgs(process.argv.slice(2));

if (options.selfCheckOnly) {
  import('./agent').then(({ runStartupSelfCheck, getOpenRouterProvider }) => {
    runStartupSelfCheck(options, getOpenRouterProvider()).then((result) => {
      console.log(result.message);
      process.exit(0);
    });
  });
} else if (options.userInput) {
  // If user input provided via CLI args, skip TUI input screen
  // This will be handled by Processing screen in later tasks
  const { unmount } = render(
    <InputScreen
      onSubmit={(input) => {
        console.log('\n[debug] Input:', input);
        unmount();
      }}
      onExit={() => {
        console.log('\n[debug] Exit');
        unmount();
      }}
    />,
    { exitOnCtrlC: true },
  );
} else {
  const { unmount } = render(
    <WelcomeScreen
      options={options}
      onReady={(result: StartupSelfCheckResult) => {
        // Will be replaced with InputScreen in next render
        unmount();
        const { unmount: unmountInput } = render(
          <InputScreen
            onSubmit={(input) => {
              console.log('\n[debug] Input:', input);
              unmountInput();
            }}
            onExit={() => {
              console.log('\n[debug] Exit');
              unmountInput();
            }}
          />,
          { exitOnCtrlC: true },
        );
      }}
    />,
    { exitOnCtrlC: true },
  );
}
```

- [ ] **Step 3: Test Input screen**

```bash
pnpm start -- --offline
```

Press Enter on Welcome, then type something and press Enter.

- [ ] **Step 4: Commit**

```bash
git add src/tui/screens/input.tsx index.ts
git commit -m "feat: add Input screen with text input"
```

---

### Task 4: Create Processing screen

**Files:**

- Create: `src/tui/screens/processing.tsx`
- Modify: `index.ts` — wire Processing screen

- [ ] **Step 1: Create Processing screen**

Create `src/tui/screens/processing.tsx`:

```tsx
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

  const run = useCallback(async () => {
    try {
      setIntentStatus('running');
      const intent = await analyzeIntent(userInput, options, getOpenRouterProvider());
      setIntentStatus('done');

      setMatchStatus('running');
      const matches = matchRepositories(intent);
      setMatchStatus('done');

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
      // Mark whichever step is currently running as error
      if (intentStatus === 'running') setIntentStatus('error');
      else if (matchStatus === 'running') setMatchStatus('error');
      else setSummaryStatus('error');
    }
  }, [userInput, options, onComplete]);

  useEffect(() => {
    run();
  }, [run]);

  useInput((input) => {
    if (errorMessage) {
      if (input === '\r') {
        // Retry: reset and run again
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
            <Text red>✗ 错误: {errorMessage}</Text>
            <Text dimColor>按 Enter 重试，按 q 退出</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Wire Processing screen in index.ts**

Update the flow: Welcome → Input → Processing (placeholder for now, just log output).

- [ ] **Step 3: Test Processing screen**

```bash
pnpm start -- --offline
```

Enter a query on Input screen, verify Processing shows step animation.

- [ ] **Step 4: Commit**

```bash
git add src/tui/screens/processing.tsx index.ts
git commit -m "feat: add Processing screen with step animation"
```

---

### Task 5: Create Results screen

**Files:**

- Create: `src/tui/screens/results.tsx`
- Modify: `index.ts` — wire Results screen

- [ ] **Step 1: Create Results screen**

Create `src/tui/screens/results.tsx`:

```tsx
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
            <Text bold color={index === selectedIndex ? 'cyan' : undefined}>
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
```

- [ ] **Step 2: Wire Results screen in index.ts**

Chain: Processing → Results. On completion of Processing, unmount and render Results.

- [ ] **Step 3: Test Results screen**

```bash
pnpm start -- --offline "帮我推荐适合做 AI Agent 的 Node.js 仓库"
```

Verify results list renders with navigation.

- [ ] **Step 4: Commit**

```bash
git add src/tui/screens/results.tsx index.ts
git commit -m "feat: add Results screen with navigable list"
```

---

### Task 6: Create Detail screen

**Files:**

- Create: `src/tui/screens/detail.tsx`
- Modify: `index.ts` — wire Detail screen

- [ ] **Step 1: Create Detail screen**

Create `src/tui/screens/detail.tsx`:

```tsx
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
```

- [ ] **Step 2: Wire Detail screen in index.ts**

Full chain: Welcome → Input → Processing → Results ↔ Detail

- [ ] **Step 3: Test Detail screen**

```bash
pnpm start -- --offline "帮我推荐适合做 AI Agent 的 Node.js 仓库"
```

Navigate to a result, press Enter to view detail, press b to go back, q to exit.

- [ ] **Step 4: Commit**

```bash
git add src/tui/screens/detail.tsx index.ts
git commit -m "feat: add Detail screen with full repo info"
```

---

### Task 7: Unify App as single state machine

**Files:**

- Create: `src/tui/app.tsx`
- Modify: `index.ts` — simplify to single render call

- [ ] **Step 1: Create App root component**

Create `src/tui/app.tsx` — a single state machine that manages all screens without unmounting/remounting:

```tsx
import React, { useState } from 'react';
import { WelcomeScreen } from './screens/welcome';
import { InputScreen } from './screens/input';
import { ProcessingScreen } from './screens/processing';
import { ResultsScreen } from './screens/results';
import { DetailScreen } from './screens/detail';
import {
  type CliOptions,
  type StartupSelfCheckResult,
  type UserIntent,
  type MatchedRepository,
} from '../../agent';

type Screen =
  | { type: 'welcome' }
  | { type: 'input' }
  | { type: 'processing'; userInput: string }
  | { type: 'results'; intent: UserIntent; matches: MatchedRepository[]; summary: string }
  | { type: 'detail'; match: MatchedRepository }
  | { type: 'exit' };

type AppProps = {
  options: CliOptions;
};

export function App({ options }: AppProps) {
  const [screen, setScreen] = useState<Screen>({ type: 'welcome' });
  const [selfCheckResult, setSelfCheckResult] = useState<StartupSelfCheckResult | null>(null);

  if (options.selfCheckOnly) {
    return null; // handled separately
  }

  switch (screen.type) {
    case 'welcome':
      return (
        <WelcomeScreen
          options={options}
          onReady={(result) => {
            setSelfCheckResult(result);
            setScreen({ type: 'input' });
          }}
        />
      );

    case 'input':
      return (
        <InputScreen
          onSubmit={(userInput) => {
            setScreen({ type: 'processing', userInput });
          }}
          onExit={() => setScreen({ type: 'exit' })}
        />
      );

    case 'processing':
      return (
        <ProcessingScreen
          userInput={screen.userInput}
          options={{ ...options, offline: selfCheckResult?.offline ?? options.offline }}
          onComplete={(intent, matches, summary) => {
            setScreen({ type: 'results', intent, matches, summary });
          }}
          onError={() => setScreen({ type: 'input' })}
        />
      );

    case 'results':
      return (
        <ResultsScreen
          matches={screen.matches}
          intent={screen.intent}
          summary={screen.summary}
          onSelect={(index) => {
            setScreen({ type: 'detail', match: screen.matches[index]! });
          }}
          onExit={() => setScreen({ type: 'exit' })}
        />
      );

    case 'detail':
      return (
        <DetailScreen
          match={screen.match}
          onBack={() =>
            setScreen({
              type: 'results',
              intent: screen.intent,
              matches: screen.matches,
              summary: screen.summary,
            })
          }
          onExit={() => setScreen({ type: 'exit' })}
        />
      );

    case 'exit':
      return null;

    default:
      return null;
  }
}
```

- [ ] **Step 2: Simplify index.ts**

Replace index.ts with a single render call:

```tsx
import React from 'react';
import { render } from 'ink';
import { App } from './src/tui/app';
import { parseArgs, runStartupSelfCheck, getOpenRouterProvider } from './agent';

const options = parseArgs(process.argv.slice(2));

if (options.selfCheckOnly) {
  runStartupSelfCheck(options, getOpenRouterProvider()).then((result) => {
    console.log(result.message);
    process.exit(0);
  });
} else {
  const { unmount } = render(<App options={options} />, { exitOnCtrlC: true });
}
```

- [ ] **Step 3: Run full test**

```bash
pnpm start -- --offline "帮我推荐适合做 AI Agent 的 Node.js 仓库"
```

Verify full flow: Welcome → Input → Processing → Results → Detail → back → exit.

- [ ] **Step 4: Run existing tests**

```bash
pnpm test
```

Expected: all 10 tests pass.

- [ ] **Step 5: Run typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/tui/app.tsx index.ts
git commit -m "refactor: unify TUI as single state machine App component"
```

---

### Task 8: Polish and update scripts

**Files:**

- Modify: `package.json` — add `tui` and `tui:offline` scripts
- Modify: `README.md` — update usage docs

- [ ] **Step 1: Add TUI scripts to package.json**

```json
"tui": "tsx index.ts",
"tui:offline": "tsx index.ts --offline"
```

- [ ] **Step 2: Update README.md**

Add TUI usage section to README.

- [ ] **Step 3: Run format**

```bash
pnpm format:write
```

- [ ] **Step 4: Final verification**

```bash
pnpm test && pnpm typecheck && pnpm format
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "docs: update README and scripts for TUI"
```
