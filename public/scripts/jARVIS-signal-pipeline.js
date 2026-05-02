#!/usr/bin/env node
/**
 * JARVIS 信号管道 v1.0
 * 行业简报 → 结构化 Signal → JSON 存储
 * 
 * 流程：
 * 1. Crawl4AI 抓取行业页面
 * 2. 解析 Markdown 提取结构化条目
 * 3. 转换为 Signal 对象
 * 4. 写入 signals.json（本地）+ Firestore（可选）
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================================
// 配置
// ============================================================

const SIGNAL_STORE_PATH = '/Users/jinyonghao/.hermes/jARVIS-signals.json';
const SIGNAL_LOG_PATH  = '/Users/jinyonghao/.hermes/jARVIS-signals.log';

const SIGNAL_TYPES = {
  INDUSTRY: 'industry',
  POLICY: 'policy',
  MARKET: 'market',
  MACRO: 'macro',
  NEWS: 'news'
};

const PROJECT_KEYWORDS = {
  'adult-shop': [
    '成人用品', '性的商品', 'エロティカ', '日本EC', '跨境EC',
    'dropshipping', '輸入販売', ' Alibaba', '1688', 'OEM',
    'Amazon出品', '楽天市場', 'Shopify', '隐私配送', '保密发货',
    '購入恥じ', '大人向け', '性的な羞恥', '我慢', '錯覚'
  ],
  'jarvis-web': [
    '人生仪表盘', '健康管理', 'AI助手', 'productivity tool',
    'life dashboard', 'self-tracking', 'habit tracker'
  ]
};

// ============================================================
// 工具函数
// ============================================================

function generateId() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).slice(2, 8);
  return `sig_${dateStr}_${random}`;
}

function extractTags(text) {
  const tags = [];
  for (const [project, keywords] of Object.entries(PROJECT_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        tags.push(project);
        break;
      }
    }
  }
  // 通用标签
  const genericTags = {
    '政策': 'policy', '規制': 'regulation', '成長': 'growth',
    '拡大': 'growth', '機会': 'opportunity', 'リスク': 'risk',
    '問題': 'risk', '补助金': 'subsidy', 'Amazon': 'platform',
    '楽天': 'platform', 'Shopify': 'platform'
  };
  for (const [kw, tag] of Object.entries(genericTags)) {
    if (text.includes(kw) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  return [...new Set(tags)];
}

function extractProjectId(text) {
  for (const [projectId, keywords] of Object.entries(PROJECT_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) return projectId;
    }
  }
  return 'adult-shop'; // 默认
}

function detectType(source, text) {
  const lowerText = text.toLowerCase();
  if (source.includes('厚労') || source.includes('経産') || source.includes('政府') ||
      lowerText.includes('政策') || lowerText.includes('規制') || lowerText.includes('法')) {
    return SIGNAL_TYPES.POLICY;
  }
  if (lowerText.includes('経済') || lowerText.includes('GDP') || lowerText.includes('為替') ||
      lowerText.includes('円安') || lowerText.includes('金利')) {
    return SIGNAL_TYPES.MACRO;
  }
  if (lowerText.includes('市場') || lowerText.includes('売上') || lowerText.includes('価格') ||
      lowerText.includes('ランキング') || lowerText.includes('競合')) {
    return SIGNAL_TYPES.MARKET;
  }
  return SIGNAL_TYPES.INDUSTRY;
}

// ============================================================
// Signal 创建
// ============================================================

function createSignal({ title, url, summary, source, sourceUrl, publishedAt, rawContent }) {
  const now = new Date().toISOString();
  const tags = extractTags(title + ' ' + (summary || ''));

  return {
    id: generateId(),
    type: detectType(source || '', title + ' ' + (summary || '')),
    source: source || '未知来源',
    sourceUrl: sourceUrl || url || '',
    title: title.trim(),
    summary: (summary || '').trim().slice(0, 500),
    rawContent: (rawContent || summary || '').trim().slice(0, 5000),
    publishedAt: publishedAt || now,
    receivedAt: now,
    tags,
    impact: {
      projectId: extractProjectId(title + ' ' + (summary || '')),
      score: 0,
      direction: 'neutral',
      horizon: 'mid',
      confidence: 0,
      rationale: '',
      evaluatedAt: null,
      status: 'pending',
      confirmedScore: null
    }
  };
}

// ============================================================
// 信号存储
// ============================================================

function loadSignals() {
  try {
    if (fs.existsSync(SIGNAL_STORE_PATH)) {
      const data = fs.readFileSync(SIGNAL_STORE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('加载信号文件失败，创建新文件:', e.message);
  }
  return { signals: [], lastUpdated: null };
}

function saveSignals(store) {
  store.lastUpdated = new Date().toISOString();
  const dir = path.dirname(SIGNAL_STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SIGNAL_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function addSignals(newSignals) {
  const store = loadSignals();
  const existingUrls = new Set(store.signals.map(s => s.sourceUrl).filter(Boolean));
  const existingTitles = new Set(store.signals.map(s => s.title).filter(Boolean));

  let added = 0;
  let skipped = 0;

  for (const signal of newSignals) {
    // 去重：相同 URL 或相同标题
    if (signal.sourceUrl && existingUrls.has(signal.sourceUrl)) {
      skipped++;
      continue;
    }
    if (existingTitles.has(signal.title)) {
      skipped++;
      continue;
    }
    store.signals.push(signal);
    existingUrls.add(signal.sourceUrl);
    existingTitles.add(signal.title);
    added++;
  }

  // 保留最近 500 条信号
  if (store.signals.length > 500) {
    store.signals = store.signals.slice(-500);
  }

  saveSignals(store);
  return { added, skipped, total: store.signals.length };
}

// ============================================================
// Crawl4AI 调用
// ============================================================

function runPython(code) {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-c', code], { timeout: 120000 });
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());
    proc.on('close', code => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || stdout));
    });
  });
}

async function crawl(url) {
  const code = `
import asyncio
from crawl4ai import AsyncWebCrawler

async def crawl():
    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(url='${url}', bypass_cache=True)
        return result.markdown if result.markdown else ''

print(asyncio.run(crawl()))
`;
  try {
    const output = await runPython(code);
    return output.slice(0, 5000);
  } catch (e) {
    return `Crawl Error: ${e.message}`;
  }
}

// ============================================================
// 简报解析（从 Markdown 提取结构化条目）
// ============================================================

function parseMarkdownToSignals(markdown, sourceName, sourceUrl) {
  const signals = [];
  const lines = markdown.split('\n');
  let currentTitle = '';
  let currentContent = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // 匹配标题行（# 开头或数字编号）
    const h2Match = trimmed.match(/^##?\s+(.+)/);
    const numMatch = trimmed.match(/^\d+[.、]\s+(.+)/);
    const dashMatch = trimmed.match(/^[-•]\s+(.+)/);

    if (h2Match || numMatch || dashMatch) {
      // 保存前一个条目
      if (currentTitle && currentContent) {
        signals.push(createSignal({
          title: currentTitle,
          url: sourceUrl,
          source: sourceName,
          sourceUrl: sourceUrl,
          summary: currentContent.slice(0, 200),
          rawContent: currentContent
        }));
      }
      currentTitle = (h2Match?.[1] || numMatch?.[1] || dashMatch?.[1] || '').trim();
      currentContent = '';
    } else if (currentTitle) {
      currentContent += ' ' + trimmed;
    }
  }

  // 最后一个条目
  if (currentTitle && currentContent) {
    signals.push(createSignal({
      title: currentTitle,
      url: sourceUrl,
      source: sourceName,
      sourceUrl: sourceUrl,
      summary: currentContent.slice(0, 200),
      rawContent: currentContent
    }));
  }

  return signals;
}

// ============================================================
// 主流程
// ============================================================

const SOURCES = [
  { name: 'PR TIMES', url: 'https://prtimes.jp/', category: 'industry' },
  { name: 'EC業界ニュース', url: 'https://www.ecnomikata.com/news/', category: 'industry' },
  { name: '小売ドア', url: 'https://mag.shogyo.jp/', category: 'industry' },
];

async function runPipeline() {
  console.log('📡 JARVIS 信号管道 v1.0 启动');
  console.log(`⏰ ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n`);

  const allSignals = [];

  for (const source of SOURCES) {
    console.log(`🔍 抓取: ${source.name}...`);
    const content = await crawl(source.url);
    
    if (content.startsWith('Crawl Error:')) {
      console.log(`   ⚠️ 抓取失败: ${content.slice(13)}`);
      continue;
    }

    const signals = parseMarkdownToSignals(content, source.name, source.url);
    console.log(`   ✅ 提取到 ${signals.length} 条信号`);
    
    allSignals.push(...signals);

    // 延迟避免请求过快
    await new Promise(r => setTimeout(r, 2000));
  }

  if (allSignals.length > 0) {
    const result = addSignals(allSignals);
    console.log(`\n📦 信号写入完成`);
    console.log(`   + 新增: ${result.added}`);
    console.log(`   - 跳过: ${result.skipped}`);
    console.log(`   📊 总计: ${result.total} 条信号`);
    
    // 记录日志
    const log = `[${new Date().toISOString()}] 新增:${result.addd} 跳过:${result.skipped} 总计:${result.total}\n`;
    const logDir = path.dirname(SIGNAL_LOG_PATH);
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(SIGNAL_LOG_PATH, log, 'utf8');
  } else {
    console.log('\n⚠️ 未能提取到任何信号');
  }

  // 打印最新信号预览
  const store = loadSignals();
  if (store.signals.length > 0) {
    const latest = store.signals.slice(-5);
    console.log('\n📋 最新信号预览:');
    latest.forEach(s => {
      console.log(`   [${s.type}] ${s.title.slice(0, 50)}... → ${s.impact.projectId}`);
    });
  }
}

// 直接运行时执行
if (require.main === module) {
  runPipeline().catch(e => {
    console.error('❌ 管道执行失败:', e.message);
    process.exit(1);
  });
}

module.exports = { runPipeline, createSignal, addSignals, loadSignals };
