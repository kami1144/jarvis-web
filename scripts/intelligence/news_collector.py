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
    """
    评估信息对项目的影响
    输出：前端期望的完整 impact 结构
    """
    text = (title + " " + content).lower()
    query_lower = query.lower()
    
    # ==========================================
    # 第一层：判断信号和我们的相关性
    # ==========================================
    # 直接相关关键词（adult-shop核心业务）
    adult_shop_kw = ["adult product", "sex toy", "sexual wellness", "pleasure product",
                     "成人用品", "避孕", "润滑", "性感", "intimate product",
                     "adult goods", "erotic"]
    # 间接相关关键词（电商/市场趋势）
    ecommerce_kw = ["ecommerce", "e-commerce", "online shopping", "cross border",
                    "ec market", "b2c", "Platform", "赵云巢", "越境EC", "ネット販売"]
    # 政策相关
    policy_kw = ["regulation", "policy", "regulatory", "law", "ban", "restrict",
                 "visa", "immigration", "foreign", "tax", "規制", "法", "政策", "外资", "ビザ"]
    # 人才相关
    talent_kw = ["talent", "hiring", "freelance", "remote work", "it engineer",
                "人材", "派遣", "採用", "スキル", "人才", "エンジニア"]
    
    # 计算各类别匹配数
    adult_score = sum(1 for kw in adult_shop_kw if kw in text)
    ecommerce_score = sum(1 for kw in ecommerce_kw if kw in text)
    policy_score = sum(1 for kw in policy_kw if kw in text)
    talent_score = sum(1 for kw in talent_kw if kw in text)
    
    # 确定相关性类型
    if adult_score > 0:
        relevance = "direct"       # 直接影响 adult-shop
        primary_domain = "adult-shop"
    elif policy_score > 0:
        relevance = "policy"       # 政策法规影响
        primary_domain = "adult-shop"
    elif ecommerce_score > 0:
        relevance = "market"       # 市场趋势影响
        primary_domain = "adult-shop"
    elif talent_score > 0:
        relevance = "talent"       # 人才市场影响
        primary_domain = "starfire"  # 星火人才
    else:
        relevance = "indirect"
        primary_domain = "adult-shop"
    
    # ==========================================
    # 第二层：判断方向（机会/风险/中性）
    # ==========================================
    # 增长/机会信号
    opportunity_signals = [
        "growth", "growing", "expand", "expanding", "increase", "increasing",
        "surge", "rising", "soar", "booming", "positive", "opportunity",
        "gaining traction", "on the rise", "strong demand", "bloom",
        "成長", "拡大", "急成長", "増加", "伸長", "躍進", "市場拡大"
    ]
    # 风险/负面信号
    risk_signals = [
        "decline", "decreasing", "drop", "fall", "shrinking", "contraction",
        "ban", "banned", "restrict", "regulation", "regulatory", "risk",
        "concern", "warning", "volatile", "uncertain", "headwind",
        "下跌", "減少", "規制", "禁止", "停止", "縮小", "心配"
    ]
    # 中性信号
    neutral_signals = [
        "trend", "analysis", "guide", "overview", "report", "survey",
        "insight", "perspective", "forecast", "projection", "estimate"
    ]
    
    opp_count = sum(1 for s in opportunity_signals if s in text)
    risk_count = sum(1 for s in risk_signals if s in text)
    
    # neutral信号只作为降级条件，不作为升级条件
    # 如果同时有增长和风险，增长优先
    if opp_count >= 2 and opp_count > risk_count:
        direction = "opportunity"
        base_score = 15 + opp_count * 8
    elif risk_count >= 2 and risk_count > opp_count:
        direction = "risk"
        base_score = -(15 + risk_count * 8)
    elif opp_count >= 1 and opp_count > risk_count:
        direction = "opportunity"
        base_score = 10 + opp_count * 5
    elif risk_count >= 1 and risk_count > opp_count:
        direction = "risk"
        base_score = -(10 + risk_count * 5)
    else:
        direction = "neutral"
        base_score = 0
    
    # ==========================================
    # 第三层：计算置信度（0.0 ~ 1.0）
    # ==========================================
    # 内容长度：摘要越长，置信度越高
    content_length = len(content)
    length_factor = min(1.0, content_length / 500)  # 500字封顶
    
    # 相关性加成：直接相关 > 政策 > 市场趋势
    relevance_factor = {"direct": 0.9, "policy": 0.7, "market": 0.6, "talent": 0.7, "indirect": 0.3}
    rel_factor = relevance_factor.get(relevance, 0.5)
    
    confidence = round(length_factor * 0.4 + rel_factor * 0.6, 2)
    confidence = max(0.2, min(0.95, confidence))  # 钳制在 0.2~0.95
    
    # ==========================================
    # 第四层：生成具体建议
    # ==========================================
    if primary_domain == "starfire":
        if direction == "opportunity":
            rec = "星火人才业务利好！人才需求增加，考虑扩大产能或提高报价"
        elif direction == "risk":
            rec = "星火人才面临风险！关注政策变化对派遣业务的影响"
        else:
            rec = "人才市场动态，建议评估对星火人才定价策略的影响"
    elif relevance == "direct":
        if direction == "opportunity":
            rec = "成人用品市场利好！直接机会，考虑加速 adult-shop 产品上线"
        elif direction == "risk":
            rec = "成人用品领域风险！检查 adult-shop 合规性和品类风险"
        else:
            rec = "成人用品行业动态，评估对 adult-shop 产品定位的影响"
    elif relevance == "policy":
        if direction == "risk":
            rec = "政策法规风险！立即评估对 adult-shop 外资架构/合规的影响"
        else:
            rec = "政策法规变化，关注对 adult-shop 跨境供应链和资质的影响"
    elif relevance == "market":
        if direction == "opportunity":
            rec = "日本电商市场扩张！评估 adult-shop 如何抓住这波增长红利"
        elif direction == "risk":
            rec = "电商市场风险！关注竞争加剧，思考 adult-shop 差异化策略"
        else:
            rec = "日本电商趋势，持续关注市场变化对 adult-shop 的机会"
    else:
        rec = "关注动态变化，评估对本项目潜在影响"
    
    # ==========================================
    # 第五层：判断时间范围
    # ==========================================
    if any(kw in text for kw in ["2025", "2026", "now", "current", "今年", "現在"]):
        horizon = "short"
    elif any(kw in text for kw in ["forecast", "project", "2027", "2028", "未来", "予測"]):
        horizon = "long"
    else:
        horizon = "mid"
    
    # 分数钳制
    score = max(-30, min(40, base_score))
    
    return {
        "status": "pending",
        "direction": direction,
        "score": score,
        "confidence": confidence,
        "horizon": horizon,
        "rationale": f"[{relevance.upper()}] {direction} — {primary_domain}",
        "recommendation": rec,
        "projectId": primary_domain
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
