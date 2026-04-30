/**
 * J.A.R.V.I.S. Data Layer v2
 * 实时动态数据联动系统
 * HP ← 健康 | 能量 ← 情绪 | 金币 ← 财务 | 经验值 ← 综合
 */

const JAVIS_DATA_KEY = 'jarvis_data_v2';
const UPDATE_INTERVAL = 3000; // 3秒更新一次

// ==========================================
// 动态数据源（实时计算）
// ==========================================

const DataSources = {
  // HP数据源：健康状态
  health: {
    lastUpdated: null,
    data: {
      sleepHours: 7,        // 睡眠小时
      sleepQuality: 80,     // 睡眠质量 %
      exerciseMinutes: 30,  // 运动分钟
      stressLevel: 40,      // 压力等级 0-100
      illnessDays: 0        // 最近生病天数
    },
    // 计算HP：基于睡眠、运动、压力、疾病
    calculate() {
      const h = this.data;
      let hp = 100;
      
      // 睡眠影响 (理想7-8小时)
      const sleepDiff = Math.abs(h.sleepHours - 7.5);
      hp -= sleepDiff * 5;
      
      // 睡眠质量影响
      hp -= (100 - h.sleepQuality) * 0.15;
      
      // 运动影响 (理想每天30分钟)
      if (h.exerciseMinutes < 15) hp -= 10;
      else if (h.exerciseMinutes >= 30) hp += 5;
      
      // 压力影响
      hp -= h.stressLevel * 0.3;
      
      // 疾病影响
      hp -= h.illnessDays * 10;
      
      return Math.max(0, Math.min(100, Math.round(hp)));
    }
  },
  
  // 能量数据源：精神/情绪状态
  mood: {
    lastUpdated: null,
    data: {
      // 基于最近活动的情绪评分
      recentActivities: [
        { type: 'work', valence: 0.7 },   // 工作完成 = 正向
        { type: 'learning', valence: 0.8 }, // 学习 = 正向
        { type: 'social', valence: 0.5 },  // 社交 = 中性
        { type: 'rest', valence: 0.6 }     // 休息 = 正向
      ],
      // 聊天情绪记录（模拟）
      chatMoodScores: [0.7, 0.8, 0.6, 0.75, 0.65, 0.8],
      // 能量衰减率
      hoursSinceRest: 4,
      contextWindows: 3  // 上下文窗口数（越多越累）
    },
    // 计算能量：基于活动+聊天情绪+疲劳
    calculate() {
      const m = this.data;
      
      // 活动情绪平均
      const activityAvg = m.recentActivities.reduce((a, b) => a + b.valence, 0) / m.recentActivities.length;
      
      // 聊天情绪（最近7次）
      const chatAvg = m.chatMoodScores.slice(-7).reduce((a, b) => a + b, 0) / Math.min(m.chatMoodScores.length, 7);
      
      // 疲劳衰减
      let fatigue = m.hoursSinceRest * 3; // 每小时-3%
      fatigue += m.contextWindows * 5;       // 每个上下文窗口-5%
      
      // 综合能量
      let energy = (activityAvg * 0.3 + chatAvg * 0.4 + 0.3) * 100;
      energy -= fatigue;
      
      return Math.max(0, Math.min(100, Math.round(energy)));
    }
  },
  
  // 金币数据源：财务状态
  finance: {
    lastUpdated: null,
    data: {
      // 收入流水
      incomeFlow: [
        { amount: 0, source: 'adult-shop', date: new Date().toISOString() },
        { amount: 0, source: '接单', date: new Date().toISOString() }
      ],
      // 支出流水
      expensesFlow: [
        { amount: 20000, category: '生活', date: new Date().toISOString() }
      ],
      // 资产
      assets: {
        availableCash: 500000,     // 可用现金
        frozen: 0,                 // 冻结资金
        investments: 0,            // 投资
        receivables: 0             // 应收
      },
      // 负债
      liabilities: {
        creditCard: 0,
        loans: 0
      }
    },
    // 计算金币：当前净资产
    calculate() {
      const f = this.data;
      const totalAssets = f.assets.availableCash + f.assets.frozen + f.assets.investments + f.assets.receivables;
      const totalLiabilities = f.liabilities.creditCard + f.liabilities.loans;
      const netWorth = totalAssets - totalLiabilities;
      
      // 归一化到0-100范围（设定净资产500万为100%）
      return Math.min(100, Math.round((netWorth / 5000000) * 100));
    },
    // 获取金币原始值（日元）
    getRawGold() {
      const f = this.data;
      return f.assets.availableCash - f.liabilities.creditCard - f.liabilities.loans;
    }
  },
  
  // 经验值数据源：综合评分
  experience: {
    // 组成权重
    weights: {
      hp: 0.25,        // HP权重25%
      mood: 0.20,       // 情绪权重20%
      skills: 0.25,     // 技能权重25%
      projects: 0.30    // 项目进度权重30%
    },
    data: {
      // 技能进度
      skills: [
        { name: 'AI工具', level: 3, maxLevel: 10, category: 'tech' },
        { name: '电商运营', level: 2, maxLevel: 10, category: 'business' },
        { name: '日语', level: 8, maxLevel: 10, category: 'language' },
        { name: '中文', level: 10, maxLevel: 10, category: 'language' },
        { name: '韩语', level: 6, maxLevel: 10, category: 'language' }
      ],
      // 项目进度
      projects: [
        { id: 'adult-shop', progress: 70, weight: 0.5 },
        { id: 'jarvis-web', progress: 40, weight: 0.3 },
        { id: 'manga-studio', progress: 30, weight: 0.2 }
      ]
    },
    // 计算经验值：综合HP+情绪+技能+项目
    calculate(hpValue, moodValue) {
      const e = this.data;
      
      // 技能完成度
      const skillProgress = e.skills.reduce((sum, s) => sum + (s.level / s.maxLevel), 0) / e.skills.length;
      
      // 项目完成度（加权平均）
      const projectProgress = e.projects.reduce((sum, p) => sum + p.progress * p.weight, 0);
      
      // 综合经验
      const exp = (
        hpValue * this.weights.hp +
        moodValue * this.weights.mood +
        skillProgress * 100 * this.weights.skills +
        projectProgress * this.weights.projects
      );
      
      return Math.max(0, Math.min(100, Math.round(exp)));
    },
    // 获取等级
    getLevel(expValue) {
      // 每20%经验 = 1级，共5级
      return Math.max(1, Math.min(100, Math.ceil(expValue / 20)));
    }
  }
};

// ==========================================
// 数据持久层
// ==========================================

const defaultData = {
  character: {
    name: 'Kim Kami',
    type: '探索型大脑',
    lastUpdate: null
  },
  healthData: { ...DataSources.health.data },
  moodData: { ...DataSources.mood.data },
  financeData: { ...DataSources.finance.data },
  skillData: { ...DataSources.experience.data.skills },
  projectData: { ...DataSources.experience.data.projects },
  settings: {
    updateInterval: UPDATE_INTERVAL,
    theme: 'light',
    notifications: true
  }
};

// 加载数据
function loadData() {
  try {
    const stored = localStorage.getItem(JAVIS_DATA_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 合并默认数据
      return deepMerge(defaultData, parsed);
    }
  } catch (e) {
    console.warn('Failed to load J.A.R.V.I.S. data:', e);
  }
  return { ...defaultData };
}

// 保存数据
function saveData(data) {
  try {
    localStorage.setItem(JAVIS_DATA_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save J.A.R.V.I.S. data:', e);
  }
}

// 深度合并
function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ==========================================
// 实时计算引擎
// ==========================================

const ComputeEngine = {
  cachedValues: null,
  lastComputeTime: null,
  
  // 执行完整计算
  compute() {
    const data = loadData();
    
    // 更新数据源
    DataSources.health.data = { ...data.healthData };
    DataSources.mood.data = { 
      ...data.moodData,
      chatMoodScores: data.moodData.chatMoodScores || DataSources.mood.data.chatMoodScores
    };
    DataSources.finance.data = { ...data.financeData };
    DataSources.experience.data = {
      skills: data.skillData || DataSources.experience.data.skills,
      projects: data.projectData || DataSources.experience.data.projects
    };
    
    // 计算各维度
    const hp = DataSources.health.calculate();
    const mood = DataSources.mood.calculate();
    const gold = DataSources.finance.calculate();
    const rawGold = DataSources.finance.getRawGold();
    const exp = DataSources.experience.calculate(hp, mood);
    const level = DataSources.experience.getLevel(exp);
    
    const result = {
      hp: { current: hp, max: 100 },
      energy: { current: mood, max: 100 },
      gold: { current: gold, max: 100, raw: rawGold },
      exp: { current: exp, max: 100 },
      level,
      timestamp: new Date().toISOString()
    };
    
    this.cachedValues = result;
    this.lastComputeTime = Date.now();
    
    return result;
  },
  
  // 获取当前值（带缓存）
  getValues() {
    if (!this.cachedValues || Date.now() - this.lastComputeTime > UPDATE_INTERVAL) {
      return this.compute();
    }
    return this.cachedValues;
  }
};

// ==========================================
// 数据更新API
// ==========================================

const JARVIS = {
  // 健康数据更新
  updateHealth(updates) {
    const data = loadData();
    data.healthData = { ...data.healthData, ...updates };
    DataSources.health.data = data.healthData;
    saveData(data);
    return DataSources.health.data;
  },
  
  // 情绪数据更新
  updateMood(updates) {
    const data = loadData();
    data.moodData = { ...data.moodData, ...updates };
    DataSources.mood.data = data.moodData;
    saveData(data);
    return DataSources.mood.data;
  },
  
  // 添加聊天情绪记录
  addChatMood(score) {
    const data = loadData();
    if (!data.moodData.chatMoodScores) data.moodData.chatMoodScores = [];
    data.moodData.chatMoodScores.push(Math.max(0, Math.min(1, score)));
    // 只保留最近20条
    if (data.moodData.chatMoodScores.length > 20) {
      data.moodData.chatMoodScores = data.moodData.chatMoodScores.slice(-20);
    }
    DataSources.mood.data = data.moodData;
    saveData(data);
    return data.moodData.chatMoodScores;
  },
  
  // 财务数据更新
  updateFinance(updates) {
    const data = loadData();
    if (updates.assets) {
      data.financeData.assets = { ...data.financeData.assets, ...updates.assets };
    } else {
      data.financeData = { ...data.financeData, ...updates };
    }
    DataSources.finance.data = data.financeData;
    saveData(data);
    return DataSources.finance.data;
  },
  
  // 添加收入
  addIncome(amount, source = 'other') {
    const data = loadData();
    data.financeData.incomeFlow.unshift({
      amount,
      source,
      date: new Date().toISOString()
    });
    data.financeData.assets.availableCash += amount;
    DataSources.finance.data = data.financeData;
    saveData(data);
    return data.financeData;
  },
  
  // 添加支出
  addExpense(amount, category = 'other') {
    const data = loadData();
    data.financeData.expensesFlow.unshift({
      amount,
      category,
      date: new Date().toISOString()
    });
    data.financeData.assets.availableCash -= amount;
    DataSources.finance.data = data.financeData;
    saveData(data);
    return data.financeData;
  },
  
  // 技能升级
  upgradeSkill(skillName, increment = 1) {
    const data = loadData();
    const skill = data.skillData.find(s => s.name === skillName);
    if (skill) {
      skill.level = Math.min(skill.maxLevel, skill.level + increment);
      DataSources.experience.data.skills = data.skillData;
      saveData(data);
    }
    return data.skillData;
  },
  
  // 项目进度更新
  updateProjectProgress(projectId, progress) {
    const data = loadData();
    const project = data.projectData.find(p => p.id === projectId);
    if (project) {
      project.progress = Math.max(0, Math.min(100, progress));
      DataSources.experience.data.projects = data.projectData;
      saveData(data);
    }
    return data.projectData;
  },
  
  // 获取实时数据
  getRealtimeData() {
    return ComputeEngine.getValues();
  },
  
  // 强制刷新计算
  refresh() {
    return ComputeEngine.compute();
  },
  
  // 获取所有原始数据
  getAllData() {
    return loadData();
  },
  
  // 获取数据源状态
  getDataSourceStatus() {
    return {
      health: {
        ...DataSources.health.data,
        computedHP: DataSources.health.calculate()
      },
      mood: {
        ...DataSources.mood.data,
        computedEnergy: DataSources.mood.calculate()
      },
      finance: {
        ...DataSources.finance.data,
        computedGold: DataSources.finance.calculate(),
        rawGold: DataSources.finance.getRawGold()
      },
      skills: DataSources.experience.data.skills,
      projects: DataSources.experience.data.projects
    };
  },
  
  // 导出数据
  exportData() {
    return JSON.stringify({
      stored: loadData(),
      computed: ComputeEngine.compute()
    }, null, 2);
  },
  
  // 重置数据
  resetData() {
    localStorage.removeItem(JAVIS_DATA_KEY);
    return loadData();
  }
};

// 导出给全局
window.JARVIS = JARVIS;
window.ComputeEngine = ComputeEngine;
window.DataSources = DataSources;