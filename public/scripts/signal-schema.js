/**
 * JARVIS Signal Schema v1.0
 * 外部信号的数据结构定义
 * 用于：行业简报、政策数据、市场数据 → 影响评估引擎
 */

const SignalSchema = {
  // 信号类型枚举
  TYPES: {
    INDUSTRY: 'industry',    // 行业动态
    POLICY: 'policy',         // 政策法规
    MARKET: 'market',        // 市场数据
    MACRO: 'macro',          // 宏观经济
    NEWS: 'news'             // 一般新闻
  },

  // 影响方向枚举
  DIRECTIONS: {
    OPPORTUNITY: 'opportunity', // 机会
    RISK: 'risk',               // 风险
    NEUTRAL: 'neutral'          // 中性
  },

  // 时间范围枚举
  HORIZONS: {
    SHORT: 'short', // 短期（< 1个月）
    MID: 'mid',     // 中期（1-6个月）
    LONG: 'long'    // 长期（> 6个月）
  },

  // 评估状态枚举
  EVAL_STATUS: {
    PENDING: 'pending',     // 待评估
    EVALUATED: 'evaluated', // 已评估
    CONFIRMED: 'confirmed'  // 已确认
  },

  /**
   * 创建空 Signal 对象（带默认值）
   */
  createEmpty() {
    return {
      id: this.generateId(),
      type: this.TYPES.INDUSTRY,
      source: '',
      sourceUrl: '',
      title: '',
      summary: '',
      rawContent: '',
      publishedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      tags: [],
      impact: {
        projectId: null,
        score: 0,
        direction: this.DIRECTIONS.NEUTRAL,
        horizon: this.HORIZONS.MID,
        confidence: 0,
        rationale: '',
        evaluatedAt: null,
        status: this.EVAL_STATUS.PENDING,
        confirmedScore: null
      }
    };
  },

  /**
   * 从行业简报条目创建 Signal
   * @param {Object} item - 行业简报条目 { title, url, summary, source, publishedAt }
   * @param {string} projectId - 关联项目ID
   */
  fromIndustryReport(item, projectId = 'adult-shop') {
    const signal = this.createEmpty();
    signal.type = this.TYPES.INDUSTRY;
    signal.source = item.source || '行业简报';
    signal.sourceUrl = item.url || '';
    signal.title = item.title || '';
    signal.summary = item.summary || item.description || '';
    signal.rawContent = item.rawContent || item.summary || '';
    signal.publishedAt = item.publishedAt || new Date().toISOString();
    signal.receivedAt = new Date().toISOString();
    signal.tags = this.extractTags(item.title + ' ' + (item.summary || ''));
    signal.impact.projectId = projectId;
    signal.impact.status = this.EVAL_STATUS.PENDING;
    return signal;
  },

  /**
   * 从关键词匹配自动提取标签
   * @param {string} text - 待分析的文本
   * @returns {string[]} - 提取的标签数组
   */
  extractTags(text) {
    const keywords = {
      // adult-shop 相关
      '成人用品': 'adult-shop',
      '性的商品': 'adult-shop',
      '日本EC': 'ec',
      '跨境EC': 'ec',
      'dropshipping': 'ec',
      '仕入': 'supply',
      'OEM': 'supply',
      'Amazon': 'platform',
      '楽天': 'platform',
      'Shopify': 'platform',
      'プライバシー配送': 'shipping',
      '規制': 'regulation',
      '法規制': 'regulation',
      '成長': 'growth',
      '拡大': 'growth',
      '機会': 'opportunity',
      'リスク': 'risk',
      '問題': 'risk',
      // 通用
      '政策': 'policy',
      '补助金': 'subsidy',
      '輸入': 'import',
      '輸出': 'export',
      '税関': 'customs'
    };

    const tags = [];
    for (const [keyword, tag] of Object.entries(keywords)) {
      if (text.includes(keyword)) {
        tags.push(tag);
      }
    }
    return [...new Set(tags)]; // 去重
  },

  /**
   * 生成唯一ID
   */
  generateId() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).slice(2, 8);
    return `sig_${dateStr}_${random}`;
  },

  /**
   * 验证 Signal 对象是否符合 Schema
   * @param {Object} signal - 待验证的 Signal
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(signal) {
    const errors = [];
    if (!signal.id) errors.push('缺少 id 字段');
    if (!signal.title) errors.push('缺少 title 字段');
    if (!signal.type || !Object.values(this.TYPES).includes(signal.type)) {
      errors.push('type 必须是有效类型');
    }
    if (signal.impact) {
      if (signal.impact.score < -100 || signal.impact.score > 100) {
        errors.push('impact.score 必须在 -100 ~ +100 之间');
      }
      if (signal.impact.confidence < 0 || signal.impact.confidence > 1) {
        errors.push('impact.confidence 必须在 0 ~ 1 之间');
      }
    }
    return { valid: errors.length === 0, errors };
  },

  /**
   * Signal 序列化（写入 JSON 文件）
   * @param {Object} signal - Signal 对象
   * @returns {string} - JSON 字符串
   */
  serialize(signal) {
    const validated = this.validate(signal);
    if (!validated.valid) {
      console.warn('Signal 验证失败:', validated.errors);
    }
    return JSON.stringify(signal, null, 2);
  },

  /**
   * Signal 反序列化（从 JSON 读取）
   * @param {string} jsonStr - JSON 字符串
   * @returns {Object|null} - Signal 对象或 null
   */
  deserialize(jsonStr) {
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Signal JSON 解析失败:', e.message);
      return null;
    }
  }
};

// 导出（Node.js / ES Module）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SignalSchema;
}
