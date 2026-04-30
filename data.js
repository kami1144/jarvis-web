/**
 * J.A.R.V.I.S. Data Layer v3
 * 手动输入 + Obsidian 联动
 */

const JAVIS_DATA_KEY = 'jarvis_data_v3';
const OBSIDIAN_DATA_KEY = 'jarvis_obsidian_data';
const UPDATE_INTERVAL = 5000; // 5秒更新

// ==========================================
// 健康数据结构
// ==========================================

const HealthData = {
  // 用户体检数据
  checkup: {
    date: '2026-04-01',      // 最近体检日期
    weight: 68,              // 体重 kg
    height: 175,             // 身高 cm
    bmi: 22.2,               // BMI
    bloodPressure: { systolic: 120, diastolic: 75 }, // 血压
    heartRate: 72,           // 静心率
    bodyFat: 18,              // 体脂率 %
  },
  
  // 运动计划
  exercisePlan: {
    weeklyGoal: 150,          // 周目标（分钟）
    weeklyCompleted: 60,      // 本周完成
    dailyGoal: 30,           // 日目标（分钟）
    todayCompleted: 30,      // 今日完成
    streak: 3,              // 连续天数
    lastWorkout: '2026-04-30'
  },
  
  // 日常健康
  daily: {
    sleepHours: 7,           // 睡眠小时
    sleepQuality: 80,       // 睡眠质量 %
    stressLevel: 40,        // 压力 0-100
    waterIntake: 2000,      // 饮水量 ml
    illnessDays: 0          // 生病天数
  },
  
  // 计算HP
  calculateHP() {
    let hp = 100;
    
    // 睡眠影响 (理想7-8小时)
    const sleepDiff = Math.abs(this.daily.sleepHours - 7.5);
    hp -= sleepDiff * 5;
    hp -= (100 - this.daily.sleepQuality) * 0.15;
    
    // 运动计划完成度影响
    const exerciseCompletion = this.exercisePlan.weeklyCompleted / this.exercisePlan.weeklyGoal;
    if (exerciseCompletion < 0.5) hp -= 15;
    else if (exerciseCompletion >= 1.0) hp += 5;
    
    // 压力影响
    hp -= this.daily.stressLevel * 0.3;
    
    // 疾病影响
    hp -= this.daily.illnessDays * 10;
    
    // 体检数据影响（过期或不正常）
    const monthsSinceCheckup = this.monthsSince(new Date(this.checkup.date));
    if (monthsSinceCheckup > 6) hp -= 10;
    
    // BMI影响
    if (this.checkup.bmi < 18.5 || this.checkup.bmi > 25) hp -= 5;
    
    return Math.max(0, Math.min(100, Math.round(hp)));
  },
  
  monthsSince(date) {
    const now = new Date();
    return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  }
};

// ==========================================
// 情绪/能量数据（Hermes wiki分析结果）
// ==========================================

const MoodData = {
  // 今日聊天情绪分析（Hermes 每天生成）
  todayMood: {
    score: 0.75,              // 0-1 情绪分数
    dominantEmotion: '平静',   // 主要情绪
    energy: 70,              // 精力值 0-100
    stress: 30,              // 压力值 0-100
    summary: '今日对话平稳，有建设性'
  },
  
  // 历史记录
  history: [],
  
  // 计算能量
  calculateEnergy() {
    let energy = this.todayMood.energy;
    
    // 疲劳衰减（每小时-3%）
    const hoursSinceRest = this.todayMood.hoursSinceRest || 0;
    energy -= hoursSinceRest * 3;
    
    // 压力衰减
    energy -= this.todayMood.stress * 0.3;
    
    // 情绪加成
    energy += (this.todayMood.score - 0.5) * 40;
    
    return Math.max(0, Math.min(100, Math.round(energy)));
  }
};

// ==========================================
// 财务数据
// ==========================================

const FinanceData = {
  // 资产
  assets: {
    cash: 500000,           // 现金
    bank: 0,               // 银行存款
    investments: 0,         // 投资
    receivables: 0          // 应收
  },
  
  // 负债
  liabilities: {
    creditCard: 0,
    loans: 0
  },
  
  // 本月收支
  monthly: {
    income: 0,
    expenses: 20000,
    records: []
  },
  
  // 计算净资产
  getNetWorth() {
    return Object.values(this.assets).reduce((a, b) => a + b, 0) - 
           Object.values(this.liabilities).reduce((a, b) => a + b, 0);
  },
  
  // 计算金币（归一化）
  calculateGold() {
    const netWorth = this.getNetWorth();
    const maxGold = 5000000; // 500万为100%
    return Math.min(100, Math.round((netWorth / maxGold) * 100));
  }
};

// ==========================================
// 经验值数据
// ==========================================

const ExperienceData = {
  // 技能（从Obsidian读取）
  skills: [],
  
  // 项目（从Obsidian task-board.json 读取）
  projects: [],
  
  // 权重配置
  weights: {
    hp: 0.25,
    mood: 0.20,
    skill: 0.25,
    project: 0.30
  },
  
  // 计算经验值
  calculateExp(hpValue, moodValue) {
    // 技能完成度
    const skillAvg = this.skills.length > 0 
      ? this.skills.reduce((sum, s) => sum + (s.level / s.maxLevel), 0) / this.skills.length 
      : 0;
    
    // 项目完成度（加权）
    const projectAvg = this.projects.length > 0
      ? this.projects.reduce((sum, p) => sum + p.progress * (p.weight || 0.33), 0)
      : 0;
    
    const exp = (
      hpValue * this.weights.hp +
      moodValue * this.weights.mood +
      skillAvg * 100 * this.weights.skill +
      projectAvg * this.weights.project
    );
    
    return Math.max(0, Math.min(100, Math.round(exp)));
  },
  
  getLevel(exp) {
    return Math.max(1, Math.min(100, Math.ceil(exp / 20)));
  }
};

// ==========================================
// Obsidian 数据读取
// ==========================================

const ObsidianReader = {
  // 读取 task-board.json
  async readTaskBoard() {
    try {
      // 模拟读取（实际需要通过API或文件）
      // 这里先返回结构化数据
      return {
        adultShop: { progress: 70, name: 'adult-shop上线' },
        jarvisWeb: { progress: 40, name: 'J.A.R.V.I.S. Web面板' },
        mangaStudio: { progress: 30, name: 'MangaStudio' }
      };
    } catch (e) {
      console.warn('读取 task-board 失败:', e);
      return null;
    }
  },
  
  // 读取技能数据（从 Obsidian 笔记）
  async readSkills() {
    // 预设技能结构，实际从 Obsidian 读取
    return [
      { name: 'AI工具', level: 3, maxLevel: 10, category: 'tech' },
      { name: '电商运营', level: 2, maxLevel: 10, category: 'business' },
      { name: '日语', level: 8, maxLevel: 10, category: 'language' },
      { name: '中文', level: 10, maxLevel: 10, category: 'language' },
      { name: '韩语', level: 6, maxLevel: 10, category: 'language' }
    ];
  }
};

// ==========================================
// 数据持久层
// ==========================================

function loadData() {
  try {
    const stored = localStorage.getItem(JAVIS_DATA_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return getDefaultData();
}

function saveData(data) {
  try {
    localStorage.setItem(JAVIS_DATA_KEY, JSON.stringify(data));
  } catch (e) {}
}

function getDefaultData() {
  return {
    health: {
      checkup: { ...HealthData.checkup },
      exercisePlan: { ...HealthData.exercisePlan },
      daily: { ...HealthData.daily }
    },
    mood: {
      todayMood: { ...MoodData.todayMood },
      history: []
    },
    finance: {
      assets: { ...FinanceData.assets },
      liabilities: { ...FinanceData.liabilities },
      monthly: { ...FinanceData.monthly }
    },
    skills: [],
    projects: [],
    lastUpdate: new Date().toISOString()
  };
}

// ==========================================
// 计算引擎
// ==========================================

const ComputeEngine = {
  cachedValues: null,
  
  compute() {
    const data = loadData();
    
    // HP 计算
    const hpData = data.health;
    HealthData.checkup = { ...hpData.checkup };
    HealthData.exercisePlan = { ...hpData.exercisePlan };
    HealthData.daily = { ...hpData.daily };
    const hp = HealthData.calculateHP();
    
    // 能量计算
    const moodData = data.mood;
    MoodData.todayMood = { ...moodData.todayMood };
    const energy = MoodData.calculateEnergy();
    
    // 财务计算
    FinanceData.assets = { ...data.finance.assets };
    FinanceData.liabilities = { ...data.finance.liabilities };
    const gold = FinanceData.calculateGold();
    const rawGold = FinanceData.getNetWorth();
    
    // 经验计算
    ExperienceData.skills = data.skills.length > 0 ? data.skills : (data._lastSkills || []);
    ExperienceData.projects = data.projects.length > 0 ? data.projects : (data._lastProjects || []);
    const exp = ExperienceData.calculateExp(hp, energy);
    const level = ExperienceData.getLevel(exp);
    
    this.cachedValues = {
      hp: { current: hp, max: 100 },
      energy: { current: energy, max: 100 },
      gold: { current: gold, max: 100, raw: rawGold },
      exp: { current: exp, max: 100 },
      level,
      timestamp: new Date().toISOString()
    };
    
    return this.cachedValues;
  },
  
  getValues() {
    return this.cachedValues || this.compute();
  }
};

// ==========================================
// JARVIS API
// ==========================================

const JARVIS = {
  // 手动更新健康数据
  updateHealth(healthData) {
    const data = loadData();
    if (healthData.checkup) data.health.checkup = { ...data.health.checkup, ...healthData.checkup };
    if (healthData.exercisePlan) data.health.exercisePlan = { ...data.health.exercisePlan, ...healthData.exercisePlan };
    if (healthData.daily) data.health.daily = { ...data.health.daily, ...healthData.daily };
    data.lastUpdate = new Date().toISOString();
    saveData(data);
    return data.health;
  },
  
  // 手动更新财务数据
  updateFinance(financeData) {
    const data = loadData();
    if (financeData.assets) data.finance.assets = { ...data.finance.assets, ...financeData.assets };
    if (financeData.liabilities) data.finance.liabilities = { ...data.finance.liabilities, ...financeData.liabilities };
    if (financeData.monthly) data.finance.monthly = { ...data.finance.monthly, ...financeData.monthly };
    data.lastUpdate = new Date().toISOString();
    saveData(data);
    return data.finance;
  },
  
  // 添加收入记录
  addIncome(amount, source = '手动', description = '') {
    const data = loadData();
    data.finance.monthly.records.unshift({
      type: 'income',
      amount,
      source,
      description,
      date: new Date().toISOString()
    });
    data.finance.assets.cash += amount;
    data.finance.monthly.income += amount;
    data.lastUpdate = new Date().toISOString();
    saveData(data);
    return data.finance;
  },
  
  // 添加支出记录
  addExpense(amount, category = '手动', description = '') {
    const data = loadData();
    data.finance.monthly.records.unshift({
      type: 'expense',
      amount,
      category,
      description,
      date: new Date().toISOString()
    });
    data.finance.assets.cash -= amount;
    data.finance.monthly.expenses += amount;
    data.lastUpdate = new Date().toISOString();
    saveData(data);
    return data.finance;
  },
  
  // 更新情绪数据（Hermes wiki 分析结果）
  updateMoodFromHermes(moodData) {
    const data = loadData();
    data.mood.todayMood = {
      ...data.mood.todayMood,
      ...moodData,
      updatedAt: new Date().toISOString()
    };
    // 保存到历史
    data.mood.history.unshift({ ...data.mood.todayMood });
    if (data.mood.history.length > 30) data.mood.history = data.mood.history.slice(0, 30);
    data.lastUpdate = new Date().toISOString();
    saveData(data);
    return data.mood;
  },
  
  // 更新技能数据
  updateSkills(skills) {
    const data = loadData();
    data.skills = skills;
    data._lastSkills = skills;
    data.lastUpdate = new Date().toISOString();
    saveData(data);
    return data.skills;
  },
  
  // 更新项目数据（从 Obsidian）
  updateProjects(projects) {
    const data = loadData();
    data.projects = projects;
    data._lastProjects = projects;
    data.lastUpdate = new Date().toISOString();
    saveData(data);
    return data.projects;
  },
  
  // 获取实时数据
  getRealtimeData() {
    return ComputeEngine.compute();
  },
  
  // 获取原始数据
  getAllData() {
    return loadData();
  },
  
  // 获取健康数据
  getHealthData() {
    const data = loadData();
    return {
      ...data.health,
      computedHP: ComputeEngine.compute().hp.current
    };
  },
  
  // 获取财务数据
  getFinanceData() {
    const data = loadData();
    return {
      ...data.finance,
      netWorth: FinanceData.getNetWorth(),
      computedGold: ComputeEngine.compute().gold
    };
  },
  
  // 重置数据
  resetData() {
    localStorage.removeItem(JAVIS_DATA_KEY);
    return getDefaultData();
  }
};

// 导出
window.JARVIS = JARVIS;
window.ComputeEngine = ComputeEngine;
window.ObsidianReader = ObsidianReader;
window.HealthData = HealthData;
window.MoodData = MoodData;
window.FinanceData = FinanceData;
window.ExperienceData = ExperienceData;