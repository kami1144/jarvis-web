#!/usr/bin/env python3
"""
外部情报收集器
每天自动运行，收集行业/政策/人才市场信息，分析对我们项目的影响
"""

import json
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import requests
except ImportError:
    requests = None

# ============ 配置 ============

SIGNALS_FILE = Path(__file__).parent.parent / "public" / "jARVIS-signals.json"

# 信息源URL
SOURCES = {
    "industry": [
        "https://www.yano.co.jp/press/press.php/202503271500",
        "https://www.yano.co.jp/research/market/adult-goods",
    ],
    "policy": [
        "https://www.meti.go.jp/press/2024/",
    ],
    "talent": [
        "https://www.reed.co.uk/career-advice/",
    ],
}

# ============ 信息源（带搜索关键词的回退方案）============

SEARCH_QUERIES = {
    "ecommerce": ["成人用品 电商 日本 2024 2025", "adult goods e-commerce market size"],
    "talent": ["星火人才 招聘 动态", "人才平台 市场趋势 2025"],
    "policy_cn": ["中国 跨境电商 政策 2025 外资", "中国 电商法 修订"],
    "policy_jp": ["日本 电商 法规 外国人 2025", "日本 特区 外资 电商"],
}


def search_news(query: str, limit: int = 3) -> list:
    """使用 DuckDuckGo 搜索新闻"""
    if not requests:
        return []
    
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        url = f"https://lite.duckduckgo.com/lite/?q={query}&format=json"
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            # 解析JSON响应
            data = resp.json()
            results = []
            for item in data.get("results", [])[:limit]:
                results.append({
                    "title": item.get("title", ""),
                    "url": item.get("url", ""),
                    "snippet": item.get("body", "")[:150]
                })
            return results
    except Exception:
        pass
    return []


def fetch_industry_news() -> list:
    """抓取电商行业动态"""
    signals = []
    
    # 搜索成人用品电商市场
    for query in SEARCH_QUERIES["ecommerce"]:
        results = search_news(query, limit=2)
        for r in results:
            signals.append({
                "id": f"ind_{hash(r['url']) % 100000}",
                "category": "industry",
                "title": r["title"],
                "source": extract_domain(r["url"]),
                "url": r["url"],
                "summary": r["snippet"],
                "timestamp": datetime.now().isoformat(),
                "impact": assess_impact(r["title"] + " " + r["snippet"], "industry"),
                "recommendation": generate_recommendation(r["title"] + " " + r["snippet"], "industry")
            })
    
    return signals


def fetch_policy_news() -> list:
    """抓取政策法规"""
    signals = []
    
    for query in SEARCH_QUERIES["policy_cn"] + SEARCH_QUERIES["policy_jp"]:
        results = search_news(query, limit=2)
        for r in results:
            signals.append({
                "id": f"pol_{hash(r['url']) % 100000}",
                "category": "policy",
                "title": r["title"],
                "source": extract_domain(r["url"]),
                "url": r["url"],
                "summary": r["snippet"],
                "timestamp": datetime.now().isoformat(),
                "impact": assess_impact(r["title"] + " " + r["snippet"], "policy"),
                "recommendation": generate_recommendation(r["title"] + " " + r["snippet"], "policy")
            })
    
    return signals


def fetch_talent_news() -> list:
    """抓取人才市场动态"""
    signals = []
    
    for query in SEARCH_QUERIES["talent"]:
        results = search_news(query, limit=2)
        for r in results:
            signals.append({
                "id": f"tal_{hash(r['url']) % 100000}",
                "category": "talent",
                "title": r["title"],
                "source": extract_domain(r["url"]),
                "url": r["url"],
                "summary": r["snippet"],
                "timestamp": datetime.now().isoformat(),
                "impact": assess_impact(r["title"] + " " + r["snippet"], "talent"),
                "recommendation": generate_recommendation(r["title"] + " " + r["snippet"], "talent")
            })
    
    return signals


def extract_domain(url: str) -> str:
    """从URL提取域名"""
    match = re.search(r'https?://([^/]+)', url)
    return match.group(1) if match else url[:30]


def assess_impact(text: str, category: str) -> str:
    """评估影响程度"""
    text_lower = text.lower()
    
    # 关键词匹配
    high_impact_keywords = [
        "政策", "禁止", "限制", "新規", "規制", "改革",
        "ban", "restrict", "policy", "regulation", "new law"
    ]
    medium_impact_keywords = [
        "市场", "增长", "趋势", "机会", "扩大",
        "market", "growth", "trend", "opportunity", "expand"
    ]
    
    high_count = sum(1 for kw in high_impact_keywords if kw in text_lower)
    medium_count = sum(1 for kw in medium_impact_keywords if kw in text_lower)
    
    if high_count >= 2:
        return "high"
    elif medium_count >= 1 or high_count >= 1:
        return "medium"
    return "low"


def generate_recommendation(text: str, category: str) -> str:
    """生成建议"""
    text_lower = text.lower()
    
    if category == "industry":
        if any(kw in text_lower for kw in ["增长", "growth", "拡大", "市場"]):
            return "把握增长机会，加快 adult-shop 上线节奏"
        elif any(kw in text_lower for kw in ["竞争", "競争", "competitive"]):
            return "关注差异化竞争点，优化产品定位"
        return "持续关注，暂无明确行动项"
    
    elif category == "policy":
        if any(kw in text_lower for kw in ["外资", "外资企業", "foreign"]):
            return "评估对 adult-shop 外资架构的影响"
        elif any(kw in text_lower for kw in ["电商", "EC", "e-commerce"]):
            return "关注合规要求，确保网站符合最新法规"
        return "跟踪政策动向，评估影响后行动"
    
    elif category == "talent":
        if any(kw in text_lower for kw in ["人才", "採用", "recruit"]):
            return "评估对星火人才业务模式的潜在影响"
        return "关注市场趋势变化"
    
    return "持续跟踪"


def deduplicate_signals(existing: list, new: list) -> list:
    """去重：新信号与已有信号按标题相似度去重"""
    seen_titles = {s.get("title", "")[:50] for s in existing}
    result = []
    for signal in new:
        title_key = signal.get("title", "")[:50]
        if title_key not in seen_titles:
            result.append(signal)
    return result


def main():
    print(f"[{datetime.now().isoformat()}] 开始情报收集...")
    
    # 读取已有信号
    existing_signals = []
    if SIGNALS_FILE.exists():
        try:
            data = json.loads(SIGNALS_FILE.read_text())
            existing_signals = data.get("signals", [])
            print(f"  已加载 {len(existing_signals)} 条已有信号")
        except Exception as e:
            print(f"  读取已有信号失败: {e}")
    
    # 收集新信号
    all_new_signals = []
    
    print("  抓取行业动态...")
    all_new_signals.extend(fetch_industry_news())
    
    print("  抓取政策法规...")
    all_new_signals.extend(fetch_policy_news())
    
    print("  抓取人才市场...")
    all_new_signals.extend(fetch_talent_news())
    
    print(f"  新增 {len(all_new_signals)} 条信号")
    
    # 去重
    new_signals = deduplicate_signals(existing_signals, all_new_signals)
    print(f"  去重后新增 {len(new_signals)} 条信号")
    
    if not new_signals:
        print("  没有新信号，退出")
        return
    
    # 合并
    merged = existing_signals + new_signals
    
    # 按时间排序，保留最近30天
    cutoff = (datetime.now() - timedelta(days=30)).isoformat()
    merged = [s for s in merged if s.get("timestamp", "") > cutoff]
    
    # 写入
    SIGNALS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SIGNALS_FILE.write_text(json.dumps({"signals": merged}, ensure_ascii=False, indent=2))
    
    print(f"  写入 {len(merged)} 条信号到 {SIGNALS_FILE}")
    print(f"[{datetime.now().isoformat()}] 情报收集完成！")


if __name__ == "__main__":
    main()
