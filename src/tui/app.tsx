import React, { useState } from 'react';
import { useApp } from 'ink';
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
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>({ type: 'welcome' });
  const [selfCheckResult, setSelfCheckResult] = useState<StartupSelfCheckResult | null>(null);
  const [lastResults, setLastResults] = useState<{
    intent: UserIntent;
    matches: MatchedRepository[];
    summary: string;
  } | null>(null);

  if (options.selfCheckOnly) {
    return null;
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
          onExit={() => exit()}
        />
      );

    case 'processing':
      return (
        <ProcessingScreen
          userInput={screen.userInput}
          options={{ ...options, offline: selfCheckResult?.offline ?? options.offline }}
          onComplete={(intent, matches, summary) => {
            setLastResults({ intent, matches, summary });
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
          onExit={() => exit()}
        />
      );

    case 'detail':
      return (
        <DetailScreen
          match={screen.match}
          onBack={() => {
            if (lastResults) {
              setScreen({
                type: 'results',
                intent: lastResults.intent,
                matches: lastResults.matches,
                summary: lastResults.summary,
              });
            }
          }}
          onExit={() => exit()}
        />
      );

    case 'exit':
      return null;

    default:
      return null;
  }
}
