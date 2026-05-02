#!/usr/bin/env python3
"""
外部情报收集器 v3 — RSS精准抓取 + AI分析
"""

import json
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path

SIGNALS_FILE = Path.home() / "jarvis-web" / "public" / "jARVIS-signals.json"

# ============ RSS信息源 ============
RSS_SOURCES = [
    # 电商行业
    {
        "name": "INTERNET Watch",
        "url": "https://internet.watch.impress.co.jp/data/rss/1.0/iw_all.rdf",
        "category": "industry",
        "keywords": ["EC", "电商", "販売", "市場", "ネット", "物流", "カード", "支付", "Pay", "Amazon", "楽天"],
    },
    {
        "name": "ITmedia ビジネス中方",
        "url": "https://www.itmedia.co.jp/business/rss/index.rdf",
        "category": "industry",
        "keywords": ["EC", "电商", "販売", "市場", "プラットフォーム", "D2C", "越境"],
    },
    # 宏观政策
    {
        "name": "日本経済新聞 政策",
        "url": "https://www.nikkei.com/news/rss/?息切れ_Parser",
        "category": "policy",
        "keywords": ["政策", "規制", "外资", "中国", "改革", "経済"],
    },
]

# 备选：用curl直接搜的关键词
SEARCH_KEYWORDS = [
    "adult goods ecommerce Japan market 2025",
    "中国 跨境电商 政策 2025 外资",
    "日本 EC 成人用品 市場 動向",
]


def fetch_url(url: str) -> str:
    import subprocess
    try:
        result = subprocess.run(
            ["curl", "-s", "-L", "--max-time", "15",
             "-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
             "-H", "Accept: application/rss+xml, application/xml, text/xml, */*",
             url],
            capture_output=True, text=True, timeout=20
        )
        return result.stdout
    except:
        return ""


def parse_rss(xml_content: str, source_config: dict) -> list:
    """解析RSS XML，提取条目"""
    signals = []
    
    try:
        # 尝试不同命名空间
        root = ET.fromstring(xml_content)
        
        # 尝试标准RSS 2.0
        items = root.findall(".//item")
        if not items:
            items = root.findall(".//entry")
        
        for item in items:
            title = ""
            link = ""
            desc = ""
            
            for child in item:
                tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
                if tag == "title":
                    title = child.text or ""
                elif tag in ("link", "guid"):
                    link = child.text or ""
                elif tag in ("description", "summary", "content"):
                    desc = child.text or ""
            
            title = title.strip()
            if not title or len(title) < 8:
                continue
            
            # 过滤导航类
            skip = ["ログイン", "パスワード", "Copyright", "プライバシー", "利用規約", "RSS", "Feed"]
            if any(s in title for s in skip):
                continue
            
            # 匹配关键词
            matched_kw = None
            for kw in source_config["keywords"]:
                if kw.lower() in title.lower():
                    matched_kw = kw
                    break
            
            if matched_kw:
                signals.append({
                    "title": title[:150],
                    "url": link if link.startswith("http") else "",
                    "keyword": matched_kw,
                    "source": source_config["name"]
                })
    
    except ET.ParseError:
        pass
    
    return signals[:6]  # 最多6条


def assess_impact(title: str, category: str) -> dict:
    """评估影响，对应前端期望的impact字段"""
    title_lower = title.lower()
    
    high_kw = ["規制", "禁止", "拡大", "成長", "改革", "新規", "参入", "大型", "革命", "躍進", "急成長", "市场规模"]
    medium_kw = ["市場", "販売", "増加", "拡大", "導入", "展開", "需要", "伸長", "好影響", "Dynamo"]
    
    high_count = sum(1 for kw in high_kw if kw in title_lower)
    medium_count = sum(1 for kw in medium_kw if kw in title_lower)
    
    # direction判断：增长类 → opportunity，风险类 → risk，中性
    if any(kw in title_lower for kw in ["成長", "拡大", "急成長", "躍進", "需要", "増加"]):
        direction = "opportunity"
        rationale = "市场正向变化，存在机会窗口"
    elif any(kw in title_lower for kw in ["規制", "禁止", "停止", "下跌", "減少"]):
        direction = "risk"
        rationale = "存在潜在风险，需要关注"
    else:
        direction = "neutral"
        rationale = "影响待评估"
    
    # 评分：high=正，medium=小正，low=0
    if high_count >= 2 or (high_count >= 1 and medium_count >= 1):
        score = 20
    elif medium_count >= 1 or high_count >= 1:
        score = 10
    else:
        score = 0
    
    # 生成建议
    if category == "industry":
        if direction == "opportunity":
            rec = "市场利好，评估是否加快 adult-shop 上线节奏"
        elif direction == "risk":
            rec = "关注风险，考虑合规和防御策略"
        else:
            rec = "持续关注，暂无明确行动项"
    elif category == "policy":
        if any(kw in title_lower for kw in ["外资", "中国", "跨境", "規制"]):
            rec = "重要！评估对 adult-shop 外资架构和合规的影响"
        else:
            rec = "跟踪政策动向，评估后行动"
    else:
        rec = "关注变化，评估对项目影响"
    
    return {
        "status": "pending",
        "direction": direction,
        "score": score,
        "confidence": 0.3,
        "horizon": "mid",
        "rationale": rationale,
        "projectId": "adult-shop"
    }


def generate_signal_id() -> str:
    import hashlib
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    h = hashlib.md5(ts.encode()).hexdigest()[:6]
    return f"sig_{ts}_{h}"


def main():
    print(f"[{datetime.now().isoformat()}] 开始情报收集...")
    
    existing = []
    if SIGNALS_FILE.exists():
        try:
            data = json.loads(SIGNALS_FILE.read_text())
            existing = data.get("signals", [])
            print(f"  已有 {len(existing)} 条信号")
        except:
            existing = []
    
    all_new = []
    
    for src in RSS_SOURCES:
        print(f"\n  抓取 {src['name']}...")
        xml = fetch_url(src["url"])
        
        if not xml or len(xml) < 100:
            print(f"    获取失败或内容为空")
            continue
        
        items = parse_rss(xml, src)
        print(f"    找到 {len(items)} 条相关内容")
        
        for item in items:
            impact = assess_impact(item["title"], src["category"])
            
            signal = {
                "id": generate_signal_id(),
                "type": src["category"],
                "source": item["source"],
                "sourceUrl": src["url"],
                "title": item["title"],
                "summary": f"关键词：{item['keyword']} | {item['url'][:80] if item['url'] else '无链接'}",
                "url": item["url"],
                "publishedAt": datetime.now().isoformat(),
                "receivedAt": datetime.now().isoformat(),
                "tags": [item["keyword"], src["category"]],
                "impact": assess_impact(item["title"], src["category"])
            }
            all_new.append(signal)
    
    print(f"\n共抓到 {len(all_new)} 条新信号")
    
    if not all_new:
        print("没有新信号")
        return
    
    # 去重
    existing_titles = {s.get("title", "")[:40] for s in existing}
    new_unique = [s for s in all_new if s["title"][:40] not in existing_titles]
    
    merged = existing + new_unique
    
    # 只保留最近30天
    cutoff = (datetime.now() - timedelta(days=30)).isoformat()
    merged = [s for s in merged if s.get("receivedAt", "") > cutoff]
    
    # 按时间排序
    merged.sort(key=lambda x: x.get("receivedAt", ""), reverse=True)
    
    SIGNALS_FILE.write_text(json.dumps({"signals": merged}, ensure_ascii=False, indent=2))
    
    print(f"写入 {len(merged)} 条信号（新增 {len(new_unique)} 条）")
    print(f"\n=== 摘要 ===")
    for s in new_unique[:5]:
        print(f"  [{s['source']}] {s['title'][:60]}")
        print(f"    → {s['impact']['recommendation']}")


if __name__ == "__main__":
    main()
