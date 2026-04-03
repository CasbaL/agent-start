import { describe, expect, it } from 'vitest';

import {
  buildOfflineSummary,
  buildRuleBasedIntent,
  matchRepositories,
  parseArgs,
  runStartupSelfCheck,
  type CliOptions,
} from '../agent';

describe('parseArgs', () => {
  it('ignores the standalone separator and parses flags', () => {
    const options = parseArgs([
      '--offline',
      '--debug',
      '--self-check',
      '--top=3',
      '--',
      '帮我推荐 Vue 仓库',
    ]);

    expect(options).toMatchObject({
      offline: true,
      debug: true,
      selfCheckOnly: true,
      topK: 3,
      userInput: '帮我推荐 Vue 仓库',
    });
  });
});

describe('buildRuleBasedIntent', () => {
  it('extracts repository matching intent from natural language', () => {
    const intent = buildRuleBasedIntent('帮我推荐适合做 Node.js AI Agent 的仓库');

    expect(intent.requestType).toBe('recommend');
    expect(intent.categories).toContain('ai');
    expect(intent.technologies).toContain('node.js');
    expect(intent.capabilities).toContain('agent');
    expect(intent.keywords).toEqual(expect.arrayContaining(['node.js', 'ai', 'agent']));
  });

  it('understands cloud video editing architecture queries', () => {
    const intent = buildRuleBasedIntent('web 云剪辑架构的项目');

    expect(intent.requestType).toBe('architecture');
    expect(intent.categories).toEqual(expect.arrayContaining(['media', 'frontend']));
    expect(intent.technologies).toContain('web');
    expect(intent.capabilities).toEqual(expect.arrayContaining(['timeline', 'render', 'export']));
    expect(intent.keywords).toEqual(expect.arrayContaining(['云剪辑', '视频编辑', '时间线']));
  });
});

describe('matchRepositories', () => {
  it('returns AI-oriented repositories first for AI agent requests', () => {
    const intent = buildRuleBasedIntent('帮我推荐适合做 Node.js AI Agent 的仓库', 2);
    const matches = matchRepositories(intent);

    expect(matches).toHaveLength(2);
    expect(matches[0]?.repo.fullName).toBe('langchain-ai/langchainjs');
    expect(matches[1]?.repo.fullName).toBe('modelcontextprotocol/servers');
  });

  it('falls back to generic recommendations when there is no strong hit', () => {
    const intent = buildRuleBasedIntent('我想找火星基地运维仓库', 1);
    const matches = matchRepositories(intent);

    expect(matches).toHaveLength(1);
    expect(matches[0]?.score).toBeGreaterThan(0);
    expect(matches[0]?.reasons[0]).toContain('泛推荐');
  });

  it('prioritizes media repositories for cloud editing architecture requests', () => {
    const intent = buildRuleBasedIntent('web 云剪辑架构的项目', 3);
    const matches = matchRepositories(intent);

    expect(matches).toHaveLength(3);
    expect(matches[0]?.repo.category).toBe('media');
    expect(matches[0]?.repo.fullName).toBe('remotion-dev/remotion');
    expect(matches[1]?.repo.category).toBe('media');
  });
});

describe('buildOfflineSummary', () => {
  it('builds a readable grouped summary', () => {
    const userInput = '帮我推荐适合做 Node.js AI Agent 的仓库';
    const intent = buildRuleBasedIntent(userInput, 2);
    const matches = matchRepositories(intent);
    const summary = buildOfflineSummary(userInput, intent, matches);

    expect(summary).toContain('分类结果：');
    expect(summary).toContain('推荐列表：');
    expect(summary).toContain('langchain-ai/langchainjs');
  });
});

describe('runStartupSelfCheck', () => {
  function createOptions(overrides: Partial<CliOptions> = {}): CliOptions {
    return {
      offline: false,
      debug: false,
      selfCheckOnly: false,
      model: 'openai/test-model',
      ...overrides,
    };
  }

  it('switches to offline mode when model is missing', async () => {
    const options = createOptions({ model: '' });
    const result = await runStartupSelfCheck(options, (() => 'unused') as never);

    expect(result.canUseLLM).toBe(false);
    expect(result.offline).toBe(true);
    expect(result.message).toContain('未配置 OPENROUTER_MODEL');
    expect(options.offline).toBe(true);
  });

  it('passes self-check when provider and model probe succeed', async () => {
    const options = createOptions();
    let probeCalled = false;

    const result = await runStartupSelfCheck(
      options,
      ((model: string) => model) as never,
      async (_provider, model) => {
        probeCalled = model === 'openai/test-model';
      },
    );

    expect(probeCalled).toBe(true);
    expect(result.canUseLLM).toBe(true);
    expect(result.offline).toBe(false);
    expect(result.message).toContain('模型连通性检查通过');
  });

  it('falls back to offline mode when model probe fails', async () => {
    const options = createOptions();

    const result = await runStartupSelfCheck(
      options,
      ((model: string) => model) as never,
      async () => {
        throw new Error('No endpoints found for test model.');
      },
    );

    expect(result.canUseLLM).toBe(false);
    expect(result.offline).toBe(true);
    expect(result.message).toContain('No endpoints found for test model.');
    expect(options.offline).toBe(true);
  });
});
