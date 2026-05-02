#!/usr/bin/env node
/**
 * adult-shop 行业简报生成器
 * 使用 Crawl4AI 爬取行业动态，生成简报
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = '/tmp/adult-shop-industry-report.txt';
const SOURCES = [
  { name: 'PR TIMES', url: 'https://prtimes.jp/', category: '行业新闻' },
  { name: 'EC業界ニュース', url: 'https://www.ecnomikata.com/news/', category: 'EC动态' },
  { name: '小売ドア', url: 'https://mag.shogyo.jp/', category: '零售动向' },
];

function runPython(code) {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-c', code], { timeout: 60000 });
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());
    proc.on('close', code => code === 0 ? resolve(stdout) : reject(new Error(stderr || stdout)));
  });
}

async function crawlUrl(url) {
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
    return output.slice(0, 2000); // 限制长度
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

async function generateReport() {
  console.log('📊 adult-shop 行业简报生成中...\n');

  let report = `📊 adult-shop 行业简报 — ${new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}

`;

  for (const source of SOURCES) {
    console.log(`  抓取: ${source.name}...`);
    const content = await crawlUrl(source.url);
    report += `【${source.category} - ${source.name}】\n`;
    report += content.slice(0, 800) + '\n\n';
  }

  // 写入文件
  fs.writeFileSync(OUTPUT_FILE, report, 'utf8');
  console.log(`\n✅ 报告已保存: ${OUTPUT_FILE}`);
  console.log('\n--- 报告预览 ---\n');
  console.log(report.slice(0, 1500));
  console.log('...\n-----------------');
}

generateReport().catch(console.error);
