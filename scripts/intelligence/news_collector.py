#!/usr/bin/env python3
"""
外部情报收集器 v4 — Tavily精准搜索 + AI影响评估
写入 ~/jarvis-web/public/jARVIS-signals.json
"""

import json
import re
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

SIGNALS_FILE = Path.home() / "jarvis-web" / "public" / "jARVIS-signals.json"
TAVILY_API_KEY = "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"

# ============ 搜索主题 ============
SEARCH_QUERIES = [
    # 成人用品/电商行业
    {"query": "adult products ecommerce Japan market 2025 trends", "type": "industry", "category": "成人用品电商"},
    {"query": "Japan B2C ecommerce market size growth 2025", "type": "industry", "category": "日本电商"},
    {"query": "sex toys pleasure products market Asia 2025", "type": "industry", "category": "成人用品市场"},
    
    # 政策法规
    {"query": "Japan cross border ecommerce regulation foreign 2025", "type": "policy", "category": "跨境政策"},
    {"query": "China cross border ecommerce policy foreign investment 2025", "type": "policy", "category": "中国电商政策"},
    {"query": "Japan foreign entrepreneur visa startup 2025 policy", "type": "policy", "category": "在日外资政策"},
    
    # 人才市场
    {"query": "Japan IT talent shortage 2025 hiring trends", "type": "talent", "category": "日本IT人才"},
    {"query": "Japan remote work freelance platform market 2025", "type": "talent", "category": "人才平台"},
    
    # 消费趋势
    {"query": "Japan consumer behavior online shopping 2025", "type": "industry", "category": "消费趋势"},
    {"query": "Japan capsule hotels vending machines unattended retail 2025", "type": "industry", "category": "无人零售"},
]


def search_tavily(query: str, num_results: int = 5) -> list:
    """调用 Tavily API 搜索"""
    import subprocess
    import json as json_lib
    
    payload = json_lib.dumps({
        "api_key": TAVILY_API_KEY,
        "query": query,
        "num_results": num_results,
        "search_depth": "basic"
    })
    
    try:
        result = subprocess.run(
            ["curl", "-s", "-X", "POST", "https://api.tavily.com/search",
             "-H", "Content-Type: application/json",
             "-d", payload,
             "--max-time", "15"],
            capture_output=True, text=True, timeout=20
        )
        
        if result.returncode == 0 and result.stdout:
            data = json_lib.loads(result.stdout)
            return data.get("results", [])
    except Exception as e:
        print(f"    Tavily搜索失败: {e}", file=sys.stderr)
    
    return []


def assess_impact(title: str, url: str, content: str, query: str) -> dict:
    """评估信息对我们的影响"""
    text = (title + " " + content).lower()
    
    # 判断方向
    opportunity_kw = ["growth", "expand", "increase", "surge", "rising", "opportunity", "gaining traction", "growth", "拡大", "成長", "急成長"]
    risk_kw = ["ban", "restrict", "regulation", "decline", "drop", "shrink", "risk", "規制", "禁止", "下跌"]
    neutral_kw = ["trend", "analysis", "guide", "update", "overview", "guide", "trends"]
    
    opp_count = sum(1 for kw in opportunity_kw if kw in text)
    risk_count = sum(1 for kw in risk_kw if kw in text)
    
    if opp_count > risk_count:
        direction = "opportunity"
        rationale = "市场正向变化，存在机会窗口"
        score = min(30, opp_count * 10 + 10)
    elif risk_count > opp_count:
        direction = "risk"
        rationale = "存在监管/市场风险，需要关注"
        score = max(-20, -(risk_count * 8 + 5))
    else:
        direction = "neutral"
        rationale = "中性信息，影响待评估"
        score = 0
    
    # 生成建议
    if "adult" in text or "sex toy" in text or "pleasure" in text or " товар" in text:
        rec = "直接相关！评估对 adult-shop 产品线和定价策略的影响"
    elif "japan" in text and ("ecommerce" in text or "market" in text):
        rec = "日本电商市场动态，关注市场扩张对 adult-shop 的机会"
    elif "cross border" in text or "跨境" in text:
        rec = "跨境政策直接影响 adult-shop 供应链和合规策略"
    elif "foreign" in text or "外资" in text:
        rec = "外资政策影响 adult-shop 在日架构设计"
    elif "talent" in text or "人材" in text or "人才" in text:
        rec = "影响星火人才业务的定价和需求趋势"
    elif "consumer" in text or "shopping" in text or "consumer" in text:
        rec = "消费趋势变化影响 adult-shop 用户定位和营销策略"
    else:
        rec = "持续关注，评估对项目的影响"
    
    return {
        "status": "pending",
        "direction": direction,
        "score": score,
        "confidence": 0.6,
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
    
    # 读取已有信号
    existing = []
    if SIGNALS_FILE.exists():
        try:
            data = json.loads(SIGNALS_FILE.read_text())
            existing = data.get("signals", [])
            print(f"  已有 {len(existing)} 条信号")
        except:
            existing = []
    
    all_new = []
    
    for sq in SEARCH_QUERIES:
        print(f"\n  搜索: {sq['query'][:60]}...")
        results = search_tavily(sq["query"], num_results=4)
        
        if not results:
            print(f"    无结果")
            continue
        
        print(f"    获得 {len(results)} 条")
        
        for r in results:
            title = r.get("title", "")[:150]
            url = r.get("url", "")
            content = r.get("content", "")[:300]
            
            if not title or len(title) < 10:
                continue
            
            # 去重
            if any(title[:40] == s.get("title", "")[:40] for s in existing):
                continue
            if any(title[:40] == s.get("title", "")[:40] for s in all_new):
                continue
            
            impact = assess_impact(title, url, content, sq["query"])
            
            signal = {
                "id": generate_signal_id(),
                "type": sq["type"],
                "source": extract_domain(url),
                "sourceUrl": url,
                "title": title,
                "summary": content[:120] + "..." if len(content) > 120 else content,
                "url": url,
                "publishedAt": datetime.now().isoformat(),
                "receivedAt": datetime.now().isoformat(),
                "tags": [sq["category"], sq["type"]],
                "impact": impact
            }
            all_new.append(signal)
        
        time.sleep(1)  # 避免请求过快
    
    print(f"\n新增 {len(all_new)} 条信号")
    
    if not all_new:
        print("没有新信号")
        return
    
    # 合并去重
    merged = existing + all_new
    
    # 只保留最近30天
    cutoff = (datetime.now() - timedelta(days=30)).isoformat()
    merged = [s for s in merged if s.get("receivedAt", "") > cutoff]
    
    # 按时间排序
    merged.sort(key=lambda x: x.get("receivedAt", ""), reverse=True)
    
    # 写入
    SIGNALS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SIGNALS_FILE.write_text(json.dumps({"signals": merged}, ensure_ascii=False, indent=2))
    
    print(f"写入 {len(merged)} 条信号")
    print(f"\n=== 新信号摘要 ===")
    for s in all_new[:5]:
        icon = "📈" if s["impact"]["direction"] == "opportunity" else "📉" if s["impact"]["direction"] == "risk" else "➡️"
        print(f"  {icon} [{s['source']}] {s['title'][:50]}")
        print(f"     → {s['impact']['rationale']} | {s['impact']['projectId']}")
    
    return len(all_new)


def extract_domain(url: str) -> str:
    match = re.search(r'https?://([^/]+)', url)
    return match.group(1) if match else url[:30]


if __name__ == "__main__":
    n = main()
    sys.exit(0 if n > 0 else 1)
