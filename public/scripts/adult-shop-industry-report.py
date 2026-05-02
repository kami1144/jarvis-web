#!/usr/bin/env python3
"""
adult-shop 行业简报生成器 v2
使用 Crawl4AI 爬取行业动态，提取有效新闻片段
"""

import asyncio
import re
from datetime import datetime
from crawl4ai import AsyncWebCrawler

# 数据源：针对日本EC/成人市场相关
SOURCES = [
    {
        "name": "PR TIMES",
        "url": "https://prtimes.jp/main/modules/list/pulldown_search.php?category%5B%5D=13",  # 美容・ファッション
        "category": "行业新闻",
    },
    {
        "name": "EC業界ニュース",
        "url": "https://www.ecnomikata.com/news/",
        "category": "EC动态",
    },
    {
        "name": "流通ニュース",
        "url": "https://www.ryutsuu.biz/",
        "category": "流通新闻",
    },
    {
        "name": "日本ネット経済新聞",
        "url": "https://www.jnkn.com/",
        "category": "网络经济",
    },
]

# 关键词：过滤成人/EC相关
EC_KEYWORDS = ["EC", "电商", "販売", "市場", "プラットフォーム", "物流", "支付", "カード",
               "コンビニ", "ネット販売", "オムニチャネル", "D2C", "定期購入", "越境EC"]
ADULT_KEYWORDS = ["成人", "アダルト", "セクシャル", "ナイトライフ", "風俗", "套", "避孕", "润滑", "性感"]


def is_valid_snippet(line):
    """判断是否是有效的新闻片段"""
    line = line.strip()
    if len(line) < 15 or len(line) > 300:
        return False
    # 排除导航/菜单/页脚
    skip_patterns = ["ログイン", "パスワード", "検索", "メニュー", "ホーム", "会社概要",
                      "プライバシーポリシー", "利用規約", "Copyright", "cookie", "Cookie",
                      "http://", "https://", "img", ">>>", "<<<"]
    for p in skip_patterns:
        if p in line:
            return False
    # 排除纯标题标签
    if re.match(r'^#+\s', line):
        return False
    # 排除图片引用
    if line.startswith('![') or line.startswith('[') and line.endswith(')'):
        return False
    return True


def extract_snippets(markdown, keywords, max_snippets=8):
    """从markdown中提取有效片段"""
    snippets = []
    lines = markdown.split('\n')
    for line in lines:
        line = line.strip()
        if not is_valid_snippet(line):
            continue
        for kw in keywords:
            if kw in line:
                # 清理markdown残留
                line = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', line)
                line = re.sub(r'[#*`>\\|]', '', line)
                line = line.strip()
                if line and line not in snippets:
                    snippets.append(line)
                    break
        if len(snippets) >= max_snippets:
            break
    return snippets


async def crawl_url(crawler, url):
    """抓取单个URL"""
    try:
        result = await crawler.arun(url=url, bypass_cache=True)
        return result.markdown if result.markdown else ""
    except Exception as e:
        return f"[抓取失败: {e}]"


def format_report(results):
    """格式化报告"""
    date_str = datetime.now().strftime("%Y-%m-%d")
    report = f"📊 adult-shop 行业简报 — {date_str}\n\n"

    all_snippets = []

    for src in results:
        name = src["name"]
        category = src["category"]
        snippets = src["snippets"]
        error = src.get("error", "")

        report += f"【{category} — {name}】\n"
        if snippets:
            for s in snippets:
                report += f"  • {s}\n"
                all_snippets.append(s)
        elif error:
            report += f"  • {error}\n"
        else:
            report += f"  • (暂无相关内容)\n"
        report += "\n"

    report += "【💡 机会洞察】\n"
    if all_snippets:
        report += "  基于今日抓取内容，EC市场有以下趋势值得关注：\n"
        for s in all_snippets[:3]:
            report += f"  → {s[:100]}\n"
    else:
        report += "  今日未能抓取到EC行业新闻，请检查数据源连接。\n"

    return report, all_snippets


async def main():
    print("📊 adult-shop 行业简报生成中...", flush=True)

    results = []
    async with AsyncWebCrawler() as crawler:
        for src in SOURCES:
            name = src["name"]
            url = src["url"]
            category = src["category"]

            print(f"  抓取: {name}...", flush=True)
            content = await crawl_url(crawler, url)

            # 先用EC关键词提取
            snippets = extract_snippets(content, EC_KEYWORDS)

            # 如果EC关键词太少，用ADULT关键词补充
            if len(snippets) < 3:
                snippets2 = extract_snippets(content, ADULT_KEYWORDS)
                snippets = list(dict.fromkeys(snippets + snippets2))[:8]

            results.append({
                "name": name,
                "category": category,
                "snippets": snippets,
                "error": "" if snippets or "抓取失败" not in str(content) else content[:100]
            })

    report, snippets = format_report(results)

    print("\n--- 报告内容 ---\n")
    print(report)

    # 保存
    output_path = "/tmp/adult-shop-industry-report.txt"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"\n✅ 已保存: {output_path}")

    return report, len(snippets)


if __name__ == "__main__":
    asyncio.run(main())
