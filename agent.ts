import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output } from 'ai';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { z } from 'zod';
import 'dotenv/config';

import { repositoryCatalog, type RepositoryRecord } from './repo-catalog';

export const DEFAULT_MODEL = process.env.OPENROUTER_MODEL?.trim() || 'openrouter/free';
const LLM_TIMEOUT_MS = 20_000;
const SLOW_STEP_NOTICE_MS = 4_000;

export const intentSchema = z.object({
  userGoal: z.string().describe('用户想解决的核心问题'),
  requestType: z
    .enum(['recommend', 'compare', 'lookup', 'architecture', 'general'])
    .describe('本次请求类型'),
  categories: z.array(z.string()).describe('仓库分类或领域'),
  technologies: z.array(z.string()).describe('技术栈关键词'),
  capabilities: z.array(z.string()).describe('能力诉求，如 SSR、工作流、RAG、低代码'),
  keywords: z.array(z.string()).describe('补充检索关键词'),
  exclusions: z.array(z.string()).describe('需要避开的关键词'),
  topK: z.number().int().min(1).max(10).describe('希望返回的仓库数量'),
});

export type UserIntent = z.infer<typeof intentSchema>;

export type CliOptions = {
  offline: boolean;
  debug: boolean;
  selfCheckOnly: boolean;
  topK?: number;
  model: string;
  userInput?: string;
};

export type MatchedRepository = {
  repo: RepositoryRecord;
  score: number;
  reasons: string[];
};

type OpenRouterProvider = ReturnType<typeof createOpenRouter> | null;
type ActiveOpenRouterProvider = NonNullable<OpenRouterProvider>;
type ModelProbe = (provider: ActiveOpenRouterProvider, model: string) => Promise<void>;

export type StartupSelfCheckResult = {
  canUseLLM: boolean;
  offline: boolean;
  message: string;
  model?: string;
};

async function withProgressNotice<T>(label: string, task: () => Promise<T>) {
  console.log(`[progress] ${label}`);

  const slowTimer = setTimeout(() => {
    console.log(`[progress] ${label}，时间比预期稍长，仍在处理中...`);
  }, SLOW_STEP_NOTICE_MS);

  try {
    return await task();
  } finally {
    clearTimeout(slowTimer);
  }
}

export function getOpenRouterProvider(apiKey = process.env.OPENROUTER_API_KEY): OpenRouterProvider {
  if (!apiKey) {
    return null;
  }

  return createOpenRouter({
    apiKey,
  });
}

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    offline: false,
    debug: false,
    selfCheckOnly: false,
    model: DEFAULT_MODEL,
  };

  const queryParts: string[] = [];

  for (const arg of argv) {
    if (arg === '--') {
      continue;
    }

    if (arg === '--offline') {
      options.offline = true;
      continue;
    }

    if (arg === '--debug') {
      options.debug = true;
      continue;
    }

    if (arg === '--self-check') {
      options.selfCheckOnly = true;
      continue;
    }

    if (arg.startsWith('--top=')) {
      const value = Number(arg.slice('--top='.length));
      if (Number.isFinite(value) && value > 0) {
        options.topK = Math.min(10, Math.floor(value));
      }
      continue;
    }

    if (arg.startsWith('--model=')) {
      const value = arg.slice('--model='.length).trim();
      if (value) {
        options.model = value;
      }
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    queryParts.push(arg);
  }

  if (queryParts.length > 0) {
    options.userInput = queryParts.join(' ').trim();
  }

  return options;
}

export function printHelp() {
  console.log(`
用法:
  pnpm start -- "帮我推荐适合做 AI Agent 的 Node.js 仓库"
  pnpm start -- --offline --top=3 "我想找一个 Vue 生态的核心仓库"

参数:
  --offline     不调用大模型，使用规则模式完成意图识别和总结
  --debug       打印结构化意图和匹配分数
  --self-check  仅执行启动自检，不进入正常问答流程
  --top=5       控制返回仓库数量，范围 1-10
  --model=...   指定 OpenRouter 模型名称
`);
}

export async function readUserInput(preloaded?: string) {
  if (preloaded) {
    return preloaded;
  }

  const rl = createInterface({ input, output });
  const answer = await rl.question('请输入你的需求：');
  rl.close();

  return answer.trim();
}

export function normalizeTerm(value: string) {
  return value.trim().toLowerCase();
}

export function uniqueTerms(values: string[]) {
  return [...new Set(values.map(normalizeTerm).filter(Boolean))];
}

function sanitizeChineseKeyword(token: string) {
  return token.replace(/^(做|找|看|查)/u, '').replace(/(项目|仓库|系统|方案|架构|的)$/u, '');
}

type IntentHintRule = {
  triggers: string[];
  categories: string[];
  technologies: string[];
  capabilities: string[];
  keywords: string[];
};

function collectIntentHints(text: string) {
  const categories = new Set<string>();
  const technologies = new Set<string>();
  const capabilities = new Set<string>();
  const keywords = new Set<string>();

  const hintRules: IntentHintRule[] = [
    {
      triggers: ['云剪辑', '视频编辑', '视频剪辑', '剪辑', 'timeline', '时间线'],
      categories: ['media', 'frontend'],
      technologies: ['web'],
      capabilities: ['timeline', 'preview', 'render', 'export'],
      keywords: ['云剪辑', '视频编辑', '时间线'],
    },
    {
      triggers: ['ffmpeg', '转码', '导出', '编码'],
      categories: ['media', 'backend'],
      technologies: ['ffmpeg'],
      capabilities: ['transcode', 'render', 'export'],
      keywords: ['ffmpeg', '转码'],
    },
    {
      triggers: ['canvas', '画布', 'konva'],
      categories: ['frontend', 'media'],
      technologies: ['canvas'],
      capabilities: ['canvas', 'timeline'],
      keywords: ['canvas', '画布'],
    },
    {
      triggers: ['web'],
      categories: ['frontend'],
      technologies: ['web'],
      capabilities: [],
      keywords: ['web'],
    },
  ];

  for (const rule of hintRules) {
    if (!rule.triggers.some((trigger) => text.includes(normalizeTerm(trigger)))) {
      continue;
    }

    rule.categories.forEach((value) => categories.add(value));
    rule.technologies.forEach((value) => technologies.add(value));
    rule.capabilities.forEach((value) => capabilities.add(value));
    rule.keywords.forEach((value) => keywords.add(value));
  }

  return {
    categories: [...categories],
    technologies: [...technologies],
    capabilities: [...capabilities],
    keywords: [...keywords],
  };
}

export function inferTopKFromText(text: string) {
  const matched = text.match(/([1-9]|10)\s*(个|款|个仓库|个项目)?/);
  if (!matched) {
    return 5;
  }

  return Math.min(10, Math.max(1, Number(matched[1])));
}

export function buildRuleBasedIntent(userInput: string, topKOverride?: number): UserIntent {
  const text = normalizeTerm(userInput);
  const stopwords = new Set([
    '帮我',
    '推荐',
    '适合',
    '我想',
    '我想找',
    '查一下',
    '看看',
    '仓库',
    '项目',
    '一个',
    '一些',
    '做',
    '相关',
    '有没有',
    '推荐下',
    '推荐几个',
  ]);
  const stopwordFragments = ['推荐', '仓库', '项目', '适合', '帮我', '我想', '看看', '查一下'];

  const categoryAliases: Array<[string, string[]]> = [
    ['frontend', ['frontend', '前端', 'react', 'vue', 'ui', 'ssr']],
    ['backend', ['backend', '后端', 'api', 'server', '服务端']],
    ['ai', ['ai', 'agent', 'llm', 'rag', '智能体', '大模型', '检索增强']],
    ['automation', ['automation', 'workflow', '自动化', '编排', '集成']],
    ['database', ['database', 'db', 'postgres', '数据', '数据库']],
    ['infra', ['infra', 'devops', '部署', '基础设施', '云原生']],
    ['media', ['media', 'video', 'webav', '剪辑', '云剪辑', '视频编辑', '时间线', 'timeline']],
  ];

  const technologyAliases = [
    'node.js',
    'typescript',
    'javascript',
    'react',
    'vue',
    'next.js',
    'nestjs',
    'fastify',
    'postgres',
    'langchain',
    'mcp',
    'web',
    'canvas',
    'ffmpeg',
    'remotion',
    'konva',
  ];

  const capabilityAliases = [
    'ssr',
    '组件库',
    '工作流',
    '低代码',
    'rag',
    'agent',
    '多 agent',
    '权限',
    '认证',
    '实时',
    '向量检索',
    'timeline',
    'preview',
    'render',
    'export',
    'transcode',
    'canvas',
  ];

  const hintIntent = collectIntentHints(text);

  const categories = uniqueTerms([
    ...categoryAliases
      .filter(([, aliases]) => aliases.some((alias) => text.includes(normalizeTerm(alias))))
      .map(([category]) => category),
    ...hintIntent.categories,
  ]);

  const technologies = uniqueTerms([
    ...technologyAliases.filter((alias) => text.includes(normalizeTerm(alias))),
    ...hintIntent.technologies,
  ]);
  const capabilities = uniqueTerms([
    ...capabilityAliases.filter((alias) => text.includes(normalizeTerm(alias))),
    ...hintIntent.capabilities,
  ]);

  const requestType = text.includes('对比')
    ? 'compare'
    : text.includes('架构')
      ? 'architecture'
      : text.includes('查') || text.includes('看看')
        ? 'lookup'
        : text.includes('推荐') || text.includes('适合')
          ? 'recommend'
          : 'general';

  const englishKeywords = Array.from(userInput.matchAll(/[a-zA-Z][a-zA-Z0-9.+-]*/g)).map(
    (match) => match[0],
  );
  const chineseKeywords = Array.from(userInput.matchAll(/[\p{Script=Han}]{2,6}/gu))
    .map((match) => sanitizeChineseKeyword(match[0]))
    .filter((token) => !stopwords.has(token))
    .filter((token) => token.length >= 2)
    .filter((token) => !stopwordFragments.some((fragment) => token.includes(fragment)));

  const keywords = uniqueTerms([...englishKeywords, ...chineseKeywords, ...hintIntent.keywords]);

  return {
    userGoal: userInput.trim(),
    requestType,
    categories,
    technologies,
    capabilities,
    keywords,
    exclusions: [],
    topK: topKOverride ?? inferTopKFromText(userInput),
  };
}

export async function analyzeIntent(
  userInput: string,
  options: CliOptions,
  provider: OpenRouterProvider = getOpenRouterProvider(),
): Promise<UserIntent> {
  if (options.offline || !provider) {
    console.log('[progress] 使用规则模式分析用户意图...');
    return buildRuleBasedIntent(userInput, options.topK);
  }

  try {
    const { output: structuredIntent } = await withProgressNotice(
      '正在调用模型分析你的需求...',
      () =>
        generateText({
          model: provider(options.model),
          timeout: { totalMs: LLM_TIMEOUT_MS },
          system: [
            '你是一个仓库推荐系统的意图识别模块。',
            '你的任务是把用户自然语言请求提炼成结构化检索意图。',
            '只保留真正影响仓库匹配的关键词，避免过度发散。',
            'categories 请使用英文短词，例如 frontend、backend、ai、automation、database、infra。',
          ].join('\n'),
          prompt: `请分析下面的用户请求，并提取用于仓库检索的结构化意图。\n\n用户请求：${userInput}`,
          output: Output.object({
            schema: intentSchema,
          }),
        }),
    );

    return {
      ...structuredIntent,
      categories: uniqueTerms(structuredIntent.categories),
      technologies: uniqueTerms(structuredIntent.technologies),
      capabilities: uniqueTerms(structuredIntent.capabilities),
      keywords: uniqueTerms(structuredIntent.keywords),
      exclusions: uniqueTerms(structuredIntent.exclusions),
      topK: options.topK ?? structuredIntent.topK,
    };
  } catch (error) {
    options.offline = true;
    console.warn(`[warn] 意图识别调用失败，已自动切回规则模式：${toErrorMessage(error)}`);
    if (options.debug) {
      console.warn(error);
    }
    return buildRuleBasedIntent(userInput, options.topK);
  }
}

async function defaultModelProbe(provider: ActiveOpenRouterProvider, model: string) {
  await generateText({
    model: provider(model),
    prompt: 'ping',
    maxOutputTokens: 1,
    timeout: { totalMs: 10_000 },
  });
}

export async function runStartupSelfCheck(
  options: CliOptions,
  provider: OpenRouterProvider = getOpenRouterProvider(),
  probeModel: ModelProbe = defaultModelProbe,
): Promise<StartupSelfCheckResult> {
  if (options.offline) {
    return {
      canUseLLM: false,
      offline: true,
      message: '[self-check] 已启用离线模式，跳过模型连通性检查。',
    };
  }

  if (!provider) {
    options.offline = true;
    return {
      canUseLLM: false,
      offline: true,
      message: '[self-check] 未检测到 OPENROUTER_API_KEY，已切换到离线模式。',
    };
  }

  const model = options.model.trim();
  if (!model) {
    options.offline = true;
    return {
      canUseLLM: false,
      offline: true,
      message:
        '[self-check] 未配置 OPENROUTER_MODEL，也没有通过 --model 指定模型，已切换到离线模式。',
    };
  }

  try {
    await probeModel(provider, model);
    return {
      canUseLLM: true,
      offline: false,
      model,
      message: `[self-check] 模型连通性检查通过：${model}`,
    };
  } catch (error) {
    options.offline = true;
    return {
      canUseLLM: false,
      offline: true,
      model,
      message: `[self-check] 模型连通性检查失败，已切换到离线模式：${toErrorMessage(error)}`,
    };
  }
}

export function computeMatchScore(repo: RepositoryRecord, intent: UserIntent) {
  const corpus = uniqueTerms([
    repo.fullName,
    repo.category,
    repo.description,
    ...repo.tags,
    ...repo.technologies,
    ...repo.useCases,
    ...repo.highlights,
  ]);

  let score = 0;
  const reasons: string[] = [];

  for (const category of intent.categories) {
    if (corpus.some((item) => item.includes(category))) {
      score += 25;
      reasons.push(`命中分类: ${category}`);
    }
  }

  for (const technology of intent.technologies) {
    if (corpus.some((item) => item.includes(technology))) {
      score += 18;
      reasons.push(`命中技术栈: ${technology}`);
    }
  }

  for (const capability of intent.capabilities) {
    if (corpus.some((item) => item.includes(capability))) {
      score += 15;
      reasons.push(`命中能力诉求: ${capability}`);
    }
  }

  for (const keyword of intent.keywords) {
    if (corpus.some((item) => item.includes(keyword) || keyword.includes(item))) {
      score += 8;
      reasons.push(`命中关键词: ${keyword}`);
    }
  }

  for (const exclusion of intent.exclusions) {
    if (corpus.some((item) => item.includes(exclusion))) {
      score -= 20;
      reasons.push(`排除项命中: ${exclusion}`);
    }
  }

  if (
    intent.requestType === 'architecture' &&
    repo.highlights.some((item) => normalizeTerm(item).includes('架构'))
  ) {
    score += 12;
    reasons.push('适合做架构参考');
  }

  if (intent.requestType === 'compare') {
    score += 4;
  }

  return {
    score,
    reasons: uniqueTerms(reasons),
  };
}

export function matchRepositories(
  intent: UserIntent,
  catalog: RepositoryRecord[] = repositoryCatalog,
) {
  console.log('[progress] 正在匹配候选仓库...');
  const matched = catalog
    .map((repo) => {
      const result = computeMatchScore(repo, intent);
      return {
        repo,
        score: result.score,
        reasons: result.reasons,
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, intent.topK);

  if (matched.length > 0) {
    return matched;
  }

  return catalog.slice(0, Math.min(intent.topK, catalog.length)).map((repo) => ({
    repo,
    score: 1,
    reasons: ['未找到强命中项，作为泛推荐候选返回'],
  }));
}

export function groupByCategory(matches: MatchedRepository[]) {
  return matches.reduce<Record<string, MatchedRepository[]>>((accumulator, current) => {
    const key = current.repo.category;
    accumulator[key] ??= [];
    accumulator[key].push(current);
    return accumulator;
  }, {});
}

export function buildMatchDigest(matches: MatchedRepository[]) {
  return matches.map((item) => ({
    fullName: item.repo.fullName,
    category: item.repo.category,
    description: item.repo.description,
    technologies: item.repo.technologies,
    useCases: item.repo.useCases,
    highlights: item.repo.highlights,
    score: item.score,
    reasons: item.reasons,
  }));
}

export function buildOfflineSummary(
  userInput: string,
  intent: UserIntent,
  matches: MatchedRepository[],
) {
  const grouped = groupByCategory(matches);
  const categoryLines = Object.entries(grouped).map(([category, items]) => {
    const repos = items
      .map((item) => `${item.repo.fullName}（${item.repo.description}）`)
      .join('；');
    return `- ${category}: ${repos}`;
  });

  const recommendationLines = matches.map((item, index) => {
    const reason = item.reasons.slice(0, 3).join('、');
    return `${index + 1}. ${item.repo.fullName}：${item.repo.description}。推荐理由：${reason}。`;
  });

  return [
    `你的需求是“${userInput}”。系统识别出的核心目标是：${intent.userGoal}。`,
    `本次更偏向 ${intent.requestType} 场景，重点关注 ${
      [...intent.categories, ...intent.technologies, ...intent.capabilities].join(' / ') ||
      '通用能力'
    }。`,
    '',
    '分类结果：',
    ...categoryLines,
    '',
    '推荐列表：',
    ...recommendationLines,
    '',
    '如果你愿意，下一步可以继续把仓库目录改成读取你们自己的仓库清单或数据库，这样这个 agent 就能直接用于真实内部仓库推荐。',
  ].join('\n');
}

export async function summarizeMatches(
  userInput: string,
  intent: UserIntent,
  matches: MatchedRepository[],
  options: CliOptions,
  provider: OpenRouterProvider = getOpenRouterProvider(),
) {
  if (options.offline || !provider) {
    console.log('[progress] 使用规则模式生成最终结果...');
    return buildOfflineSummary(userInput, intent, matches);
  }

  try {
    const digest = JSON.stringify(buildMatchDigest(matches), null, 2);

    const { text } = await withProgressNotice('正在整理仓库并生成最终回答...', () =>
      generateText({
        model: provider(options.model),
        timeout: { totalMs: LLM_TIMEOUT_MS },
        system: [
          '你是一个面向开发团队的仓库推荐助手。',
          '请基于给定的用户意图和候选仓库，输出清晰的中文总结。',
          '你的回答需要包含：需求理解、按分类汇总、Top 推荐以及每个推荐的适用原因。',
          '如果候选仓库并不完美，请明确指出边界和取舍。',
        ].join('\n'),
        prompt: [
          `用户原始需求：${userInput}`,
          `结构化意图：${JSON.stringify(intent, null, 2)}`,
          `候选仓库：${digest}`,
          '',
          '请输出一份适合直接展示给用户的中文结果。',
        ].join('\n'),
      }),
    );

    return text;
  } catch (error) {
    console.warn(`[warn] 总结生成失败，已自动切回规则摘要：${toErrorMessage(error)}`);
    if (options.debug) {
      console.warn(error);
    }
    return buildOfflineSummary(userInput, intent, matches);
  }
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function printDebugBlock(intent: UserIntent, matches: MatchedRepository[]) {
  console.log('\n=== 结构化意图 ===');
  console.log(JSON.stringify(intent, null, 2));

  console.log('\n=== 匹配结果 ===');
  for (const item of matches) {
    console.log(`- ${item.repo.fullName} | score=${item.score} | ${item.reasons.join(' / ')}`);
  }
}

export async function runCli(
  argv = process.argv.slice(2),
  provider: OpenRouterProvider = getOpenRouterProvider(),
) {
  const options = parseArgs(argv);
  const selfCheckResult = await runStartupSelfCheck(options, provider);
  console.log(selfCheckResult.message);

  if (options.selfCheckOnly) {
    return;
  }

  const userInput = await readUserInput(options.userInput);

  if (!userInput) {
    throw new Error('缺少用户输入，请输入你的仓库检索需求。');
  }

  const intent = await analyzeIntent(userInput, options, provider);
  const matches = matchRepositories(intent, repositoryCatalog);
  const summary = await summarizeMatches(userInput, intent, matches, options, provider);

  if (options.debug) {
    printDebugBlock(intent, matches);
  }

  console.log('\n=== 仓库推荐结果 ===\n');
  console.log(summary);
}
