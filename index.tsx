import React from 'react';
import { render } from 'ink';
import { WelcomeScreen } from './src/tui/screens/welcome';
import { InputScreen } from './src/tui/screens/input';
import { ProcessingScreen } from './src/tui/screens/processing';
import { ResultsScreen } from './src/tui/screens/results';
import { DetailScreen } from './src/tui/screens/detail';
import {
  parseArgs,
  type CliOptions,
  type StartupSelfCheckResult,
  type UserIntent,
  type MatchedRepository,
} from './agent';

const options = parseArgs(process.argv.slice(2));

function createDetailScreen(
  match: MatchedRepository,
  intent: UserIntent,
  matches: MatchedRepository[],
  summary: string,
): void {
  const { unmount } = render(
    <DetailScreen
      match={match}
      onBack={() => {
        unmount();
        createResultsScreen(intent, matches, summary, () => {
          createInputScreen(
            (input: string) => {
              createProcessingScreen(input, options.offline, () => {
                process.exit(0);
              });
            },
            () => {
              process.exit(0);
            },
          );
        });
      }}
      onExit={() => {
        unmount();
      }}
    />,
    { exitOnCtrlC: true },
  );
}

function createResultsScreen(
  intent: UserIntent,
  matches: MatchedRepository[],
  summary: string,
  onBack: () => void,
): void {
  const { unmount } = render(
    <ResultsScreen
      matches={matches}
      intent={intent}
      summary={summary}
      onSelect={(index: number) => {
        unmount();
        createDetailScreen(matches[index]!, intent, matches, summary);
      }}
      onExit={() => {
        unmount();
        onBack();
      }}
    />,
    { exitOnCtrlC: true },
  );
}

function createProcessingScreen(userInput: string, offline: boolean, onBack: () => void): void {
  const processingOptions: CliOptions = { ...options, offline };
  const { unmount } = render(
    <ProcessingScreen
      userInput={userInput}
      options={processingOptions}
      onComplete={(intent, matches, summary) => {
        unmount();
        createResultsScreen(intent, matches, summary, onBack);
      }}
      onError={() => {
        unmount();
        onBack();
      }}
    />,
    { exitOnCtrlC: true },
  );
}

function createInputScreen(onSubmit: (input: string) => void, onExit: () => void): void {
  const { unmount } = render(
    <InputScreen
      onSubmit={(input: string) => {
        onSubmit(input);
        unmount();
      }}
      onExit={() => {
        onExit();
        unmount();
      }}
    />,
    { exitOnCtrlC: true },
  );
}

if (options.selfCheckOnly) {
  import('./agent')
    .then(({ runStartupSelfCheck, getOpenRouterProvider }) => {
      runStartupSelfCheck(options, getOpenRouterProvider()).then((result) => {
        console.log(result.message);
        process.exit(0);
      });
    })
    .catch((error) => {
      console.error('启动失败:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
} else if (options.userInput) {
  createProcessingScreen(options.userInput, options.offline, () => {
    process.exit(0);
  });
} else {
  render(
    <WelcomeScreen
      options={options}
      onReady={(result: StartupSelfCheckResult) => {
        createInputScreen(
          (input: string) => {
            createProcessingScreen(input, result.offline, () => {
              createInputScreen(
                (newInput: string) => {
                  createProcessingScreen(newInput, options.offline, () => {
                    process.exit(0);
                  });
                },
                () => {
                  process.exit(0);
                },
              );
            });
          },
          () => {
            process.exit(0);
          },
        );
      }}
    />,
    { exitOnCtrlC: true },
  );
}
