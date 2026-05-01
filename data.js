/**
 * J.A.R.V.I.S. Data Layer v3.1
 * 手动输入 + Obsidian 联动 + 预警系统 + 任务追踪
 */

const JAVIS_DATA_KEY = 'jarvis_data_v3';
const JAVIS_DATA_KEY_V31 = 'jarvis_data_v31';
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
  // 计算净资产
  getNetWorth() {
    const data = loadData();
    const assets = data.finance?.assets || {};
    const liabilities = data.finance?.liabilities || {};
    
    // 资产合计
    const totalAssets = (
      (assets.cash || 0) +
      (assets.bankDeposits || 0) +
      (assets.investments || 0) +
      (assets.realEstate || 0) +
      (assets.otherAssets || 0)
    );
    
    // 负债合计
    const totalLiabilities = (
      (liabilities.mortgage || 0) +
      (liabilities.loans || 0) +
      (liabilities.otherDebts || 0)
    );
    
    return totalAssets - totalLiabilities;
  }
};

// ==========================================
// 思维模式数据
// ==========================================

const MindModelData = {
  // 今日思维模式分析
  today: {
    date: new Date().toISOString().split('T')[0],
    score: 75,              // 今日思维模式得分 0-100
    patterns: [
      { id: 'p1', name: '抽象建模', status: 'good', desc: '能够快速抓住本质' },
      { id: 'p2', name: '过度思考', status: 'warning', desc: '想太多而行动不足' },
      { id: 'p3', name: '模式识别', status: 'good', desc: '擅长发现规律和联系' }
    ],
    // 今日练习
    exercises: [
      { id: 'e1', title: '3秒决策练习', desc: '对小事3秒内做决定', completed: false },
      { id: 'e2', title: '行动优先', desc: '先做再优化', completed: true }
    ]
  },
  
  // 错误思维模式库
  wrongPatterns: [
    { id: 'wp1', name: '过度思考', icon: '🤔', desc: '想太多，行动太少', frequency: 3 },
    { id: 'wp2', name: '非黑即白', icon: '⚫', desc: '思维二极管，没有中间地带', frequency: 2 },
    { id: 'wp3', name: '灾难化', icon: '💥', desc: '小事想成大灾难', frequency: 1 }
  ],
  
  // 正确思维模式
  correctPatterns: [
    { id: 'cp1', name: '概率思维', icon: '📊', desc: '用概率评估可能性，而非绝对' },
    { id: 'cp2', name: '成长心态', icon: '🌱', desc: '相信能力和智力可以发展' },
    { id: 'cp3', name: '实验思维', icon: '🧪', desc: '把每个决定当作实验' }
  ],
  
  // 历史记录
  history: [],
  
  // 计算思维模式得分
  calculateScore() {
    // 基于今日模式状态计算
    const goodCount = this.today.patterns.filter(p => p.status === 'good').length;
    const total = this.today.patterns.length;
    const exerciseRate = this.today.exercises.filter(e => e.completed).length / this.today.exercises.length;
    return Math.round((goodCount / total) * 70 + exerciseRate * 30);
  }
};

// ==========================================
// 机会雷达数据
// ==========================================

const OpportunityData = {
  // 机会/项目列表
  opportunities: [
    {
      id: 'adult-shop',
      name: 'adult-shop',
      icon: '🛒',
      type: 'project',      // project = 已验证项目, opportunity = 机会点
      status: 'active',      // active, paused, completed
      distance: 'near',      // near, medium, far
      description: '日本成人用品电商独立站',
      progress: 35,
      link: 'https://adult-shop-kami1144s-projects.vercel.app'
    },
    {
      id: 'manga-studio',
      name: 'MangaStudio',
      icon: '📚',
      type: 'project',
      status: 'active',
      distance: 'medium',
      description: '成人漫画AI排版工具',
      progress: 60,
      link: null
    },
    {
      id: 'star-talent',
      name: '星火人才',
      icon: '🔥',
      type: 'opportunity',
      status: 'planning',
      distance: 'far',
      description: 'AI+教育方向',
      progress: 10,
      link: null
    }
  ],
  
  // 获取当前活动项目
  getActiveProjects() {
    return this.opportunities.filter(o => o.type === 'project' && o.status === 'active');
  },
  
  // 获取机会点
  getOpportunities() {
    return this.opportunities.filter(o => o.type === 'opportunity');
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

// ==========================================
// 个人信息和家庭成员
// ==========================================

const ProfileData = {
  // 用户个人信息
  user: {
    name: 'Kim Kami',
    birthDate: '1982-01-19',
    age: 44,
    type: '探索型大脑'
  },
  
  // 家庭成员
  family: [
    { relation: '父亲', name: null, birthDate: '1954-05-12', age: 72, note: null },
    { relation: '母亲', name: null, birthDate: '1954-06-12', age: 71, note: null },
    { relation: '女儿', name: '金智雅', birthDate: '2016-08-15', age: 9, note: '小学4年级' },
    { relation: '儿子', name: '金俊成', birthDate: '2018-04-19', age: 8, note: '小学1年级' }
  ]
};

// ==========================================
// 数据持久层
// ==========================================

function loadData() {
  try {
    const stored = localStorage.getItem(JAVIS_DATA_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // 确保新字段存在（迁移旧数据）
      if (!data.opportunities) {
        data.opportunities = [...OpportunityData.opportunities];
      }
      if (!data.mindModel) {
        data.mindModel = {
          today: { ...MindModelData.today },
          wrongPatterns: [...MindModelData.wrongPatterns],
          correctPatterns: [...MindModelData.correctPatterns],
          history: []
        };
      }
      saveData(data);
      return data;
    }
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
    profile: {
      user: { ...ProfileData.user },
      family: ProfileData.family.map(f => ({ ...f }))
    },
    health: {
      checkup: { ...HealthData.checkup },
      exercisePlan: { ...HealthData.exercisePlan },
      daily: { ...HealthData.daily }
    },
    mood: {
      todayMood: { ...MoodData.todayMood },
      history: []
    },
    mindModel: {
      today: { ...MindModelData.today },
      wrongPatterns: [...MindModelData.wrongPatterns],
      correctPatterns: [...MindModelData.correctPatterns],
      history: []
    },
    skills: [],
    projects: [],
    opportunities: [...OpportunityData.opportunities],
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
    
    // 思维模式计算
    MindModelData.today = { ...data.mindModel.today };
    const mindScore = MindModelData.calculateScore();
    
    // 经验计算
    ExperienceData.skills = data.skills.length > 0 ? data.skills : (data._lastSkills || []);
    ExperienceData.projects = data.projects.length > 0 ? data.projects : (data._lastProjects || []);
    const exp = ExperienceData.calculateExp(hp, energy);
    const level = ExperienceData.getLevel(exp);
    
    this.cachedValues = {
      hp: { current: hp, max: 100 },
      energy: { current: energy, max: 100 },
      mindScore: { current: mindScore, max: 100 },
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
  
  // 更新个人信息
  updateProfile(profileData) {
    const data = loadData();
    if (profileData.user) data.profile.user = { ...data.profile.user, ...profileData.user };
    if (profileData.family) data.profile.family = profileData.family;
    data.lastUpdate = new Date().toISOString();
    saveData(data);
    return data.profile;
  },
  
  // 获取个人信息
  getProfile() {
    const data = loadData();
    return data.profile;
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

// ==========================================
// 预警系统 (Alert System)
// ==========================================

const AlertSystem = {
  // 加载预警数据
  loadAlerts() {
    try {
      const stored = localStorage.getItem(JAVIS_DATA_KEY_V31);
      if (stored) {
        const data = JSON.parse(stored);
        return data.alerts || [];
      }
    } catch (e) {}
    return [];
  },

  // 保存预警数据
  saveAlerts(alerts) {
    try {
      const stored = localStorage.getItem(JAVIS_DATA_KEY_V31);
      const data = stored ? JSON.parse(stored) : {};
      data.alerts = alerts;
      localStorage.setItem(JAVIS_DATA_KEY_V31, JSON.stringify(data));
    } catch (e) {}
  },

  // 生成预警
  generateAlerts(data, computed) {
    const alerts = [];
    const now = new Date();

    // ===== 财务预警 =====
    const monthlyExpenses = data.finance?.monthly?.expenses || 20000;
    const cash = data.finance?.assets?.cash || 0;
    const monthlyIncome = data.finance?.monthly?.income || 0;

    // 🔴 现金流低于安全线（< 3个月支出）
    const safeCash = monthlyExpenses * 3;
    if (cash < safeCash && cash > 0) {
      alerts.push({
        id: 'cash_critical',
        category: 'financial',
        level: 'critical',
        title: '现金流紧张',
        description: `可用现金 ¥${(cash/10000).toFixed(1)}万，低于3个月支出安全线 ¥${(safeCash/10000).toFixed(1)}万`,
        currentValue: cash,
        threshold: safeCash,
        trend: 'worsening',
        suggestion: '加快 adult-shop 变现，控制非必要支出，考虑增加收入来源',
        createdAt: now.toISOString(),
        acknowledged: false
      });
    }

    // 🟡 收入连续下降（需历史数据判断）
    const incomeHistory = data.finance?.monthly?.incomeHistory || [];
    if (incomeHistory.length >= 2) {
      const recentIncome = incomeHistory.slice(0, 2);
      if (recentIncome[0] < recentIncome[1] * 0.8) {
        alerts.push({
          id: 'income_decline',
          category: 'financial',
          level: 'warning',
          title: '收入下降',
          description: `本月收入 ¥${(monthlyIncome/10000).toFixed(1)}万，较上月下降`,
          currentValue: monthlyIncome,
          threshold: monthlyIncome * 1.2,
          trend: 'worsening',
          suggestion: '关注收入来源稳定性，考虑拓展新渠道',
          createdAt: now.toISOString(),
          acknowledged: false
        });
      }
    }

    // 🟡 支出超出预算20%+
    const budget = data.finance?.monthly?.budget || monthlyExpenses;
    if (monthlyExpenses > budget * 1.2 && budget > 0) {
      alerts.push({
        id: 'expense_over',
        category: 'financial',
        level: 'warning',
        title: '支出超预算',
        description: `本月支出 ¥${(monthlyExpenses/10000).toFixed(1)}万，超出预算20%`,
        currentValue: monthlyExpenses,
        threshold: budget * 1.2,
        trend: 'worsening',
        suggestion: '审查非必要支出，下调可选消费',
        createdAt: now.toISOString(),
        acknowledged: false
      });
    }

    // ===== 健康预警 =====
    const hp = computed.hp?.current || 100;

    // 🔴 HP < 30
    if (hp < 30) {
      alerts.push({
        id: 'hp_critical',
        category: 'health',
        level: 'critical',
        title: 'HP严重不足',
        description: `当前HP: ${hp}/100，身体状况警示`,
        currentValue: hp,
        threshold: 30,
        trend: 'worsening',
        suggestion: '立即休息，保证充足睡眠，减少工作强度',
        createdAt: now.toISOString(),
        acknowledged: false
      });
    }

    // 🟡 HP < 50
    if (hp < 50 && hp >= 30) {
      alerts.push({
        id: 'hp_warning',
        category: 'health',
        level: 'warning',
        title: 'HP偏低',
        description: `当前HP: ${hp}/100，需要注意健康`,
        currentValue: hp,
        threshold: 50,
        trend: hp < 40 ? 'worsening' : 'stable',
        suggestion: '保证睡眠，适度运动，关注身体状态',
        createdAt: now.toISOString(),
        acknowledged: false
      });
    }

    // 🟡 连续3天睡眠 < 5小时
    const sleepHistory = data.health?.daily?.sleepHistory || [];
    const lowSleepDays = sleepHistory.filter(s => s.hours < 5).length;
    if (lowSleepDays >= 3) {
      alerts.push({
        id: 'sleep_deficit',
        category: 'health',
        level: 'warning',
        title: '睡眠不足',
        description: `已连续${lowSleepDays}天睡眠不足5小时`,
        currentValue: lowSleepDays,
        threshold: 3,
        trend: 'worsening',
        suggestion: '优先保证睡眠时间，避免熬夜',
        createdAt: now.toISOString(),
        acknowledged: false
      });
    }

    // ===== 人际关系预警 =====
    const contacts = data.relationships?.contacts || [];
    const nowTime = now.getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    contacts.forEach(contact => {
      const lastContact = new Date(contact.lastContact).getTime();
      const daysSince = (nowTime - lastContact) / (24 * 60 * 60 * 1000);

      if (contact.importance === 'core' && daysSince > 30) {
        alerts.push({
          id: `contact_${contact.id}`,
          category: 'relationship',
          level: 'warning',
          title: `核心人脉远离: ${contact.name}`,
          description: `与${contact.name}已${Math.floor(daysSince)}天无联系`,
          currentValue: daysSince,
          threshold: 30,
          trend: 'worsening',
          suggestion: `主动联系${contact.name}，维护重要关系`,
          createdAt: now.toISOString(),
          acknowledged: false
        });
      }
    });

    // ===== 项目阻塞预警 =====
    const projects = data.projects || [];
    projects.forEach(project => {
      if (project.status === 'blocked') {
        alerts.push({
          id: `project_blocked_${project.id}`,
          category: 'project',
          level: 'warning',
          title: `任务阻塞: ${project.name}`,
          description: `${project.name} 处于阻塞状态`,
          currentValue: 0,
          threshold: 1,
          trend: 'stable',
          suggestion: '排查阻塞原因，寻求帮助解决',
          createdAt: now.toISOString(),
          acknowledged: false
        });
      }

      // 截止日期 < 3天
      if (project.deadline) {
        const deadline = new Date(project.deadline).getTime();
        const daysLeft = (deadline - nowTime) / (24 * 60 * 60 * 1000);
        if (daysLeft > 0 && daysLeft < 3) {
          alerts.push({
            id: `deadline_${project.id}`,
            category: 'project',
            level: daysLeft < 1 ? 'critical' : 'warning',
            title: `截止临近: ${project.name}`,
            description: `距离截止还有${Math.ceil(daysLeft)}天`,
            currentValue: daysLeft,
            threshold: 3,
            trend: 'stable',
            suggestion: '优先处理，确保按时完成',
            createdAt: now.toISOString(),
            acknowledged: false
          });
        }
      }
    });

    // 排序：critical > warning > info
    const levelOrder = { critical: 0, warning: 1, info: 2 };
    return alerts.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
  },

  // 确认预警
  acknowledgeAlert(alertId) {
    const alerts = this.loadAlerts();
    const index = alerts.findIndex(a => a.id === alertId);
    if (index !== -1) {
      alerts[index].acknowledged = true;
      this.saveAlerts(alerts);
    }
    return alerts;
  }
};

// ==========================================
// 任务追踪器 (Task Tracker)
// ==========================================

const TaskTracker = {
  // 加载任务
  loadTasks() {
    try {
      const stored = localStorage.getItem(JAVIS_DATA_KEY_V31);
      if (stored) {
        const data = JSON.parse(stored);
        return data.tasks || [];
      }
    } catch (e) {}
    return [];
  },

  // 保存任务
  saveTasks(tasks) {
    try {
      const stored = localStorage.getItem(JAVIS_DATA_KEY_V31);
      const data = stored ? JSON.parse(stored) : {};
      data.tasks = tasks;
      localStorage.setItem(JAVIS_DATA_KEY_V31, JSON.stringify(data));
    } catch (e) {}
  },

  // 添加任务
  addTask(task) {
    const tasks = this.loadTasks();
    const newTask = {
      id: 'task_' + Date.now(),
      name: task.name,
      project: task.project,
      progress: task.progress || 0,
      status: task.status || 'pending',
      deadline: task.deadline || null,
      owner: task.owner || 'Kim',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    tasks.unshift(newTask);
    this.saveTasks(tasks);
    return tasks;
  },

  // 更新任务
  updateTask(taskId, updates) {
    const tasks = this.loadTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveTasks(tasks);
    }
    return tasks;
  },

  // 删除任务
  deleteTask(taskId) {
    const tasks = this.loadTasks();
    const filtered = tasks.filter(t => t.id !== taskId);
    this.saveTasks(filtered);
    return filtered;
  }
};

// ==========================================
// 历史数据 (History Charts)
// ==========================================

const HistoryTracker = {
  // 记录历史数据点
  recordSnapshot(computed) {
    try {
      const stored = localStorage.getItem(JAVIS_DATA_KEY_V31);
      const data = stored ? JSON.parse(stored) : {};
      const history = data.history || [];

      const snapshot = {
        timestamp: new Date().toISOString(),
        hp: computed.hp?.current || 0,
        energy: computed.energy?.current || 0,
        gold: computed.gold?.current || 0,
        level: computed.level || 1
      };

      history.unshift(snapshot);

      // 保留90天数据
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const filtered = history.filter(h => new Date(h.timestamp) > ninetyDaysAgo);

      data.history = filtered;
      localStorage.setItem(JAVIS_DATA_KEY_V31, JSON.stringify(data));
    } catch (e) {}
  },

  // 获取历史数据
  getHistory(days = 7) {
    try {
      const stored = localStorage.getItem(JAVIS_DATA_KEY_V31);
      if (!stored) return [];

      const data = JSON.parse(stored);
      const history = data.history || [];

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      return history.filter(h => new Date(h.timestamp) > cutoff);
    } catch (e) {}
    return [];
  }
};

// ==========================================
// 环境感知模块 (Environment Perception)
// ==========================================

const EnvironmentTracker = {
  // 加载环境数据
  loadEnvData() {
    try {
      const stored = localStorage.getItem(JAVIS_DATA_KEY_V31);
      if (stored) {
        const data = JSON.parse(stored);
        return {
          industry: data.industry || [],
          policy: data.policy || [],
          relationships: data.relationships?.items || []
        };
      }
    } catch (e) {}
    return { industry: [], policy: [], relationships: [] };
  },

  // 保存环境数据
  saveEnvData(envData) {
    try {
      const stored = localStorage.getItem(JAVIS_DATA_KEY_V31);
      const data = stored ? JSON.parse(stored) : {};
      data.industry = envData.industry;
      data.policy = envData.policy;
      if (!data.relationships) data.relationships = {};
      data.relationships.items = envData.relationships;
      localStorage.setItem(JAVIS_DATA_KEY_V31, JSON.stringify(data));
    } catch (e) {}
  },

  // 添加行业动态
  addIndustry(text) {
    const envData = this.loadEnvData();
    envData.industry.unshift({
      id: 'ind_' + Date.now(),
      text,
      createdAt: new Date().toISOString()
    });
    // 保留最新50条
    envData.industry = envData.industry.slice(0, 50);
    this.saveEnvData(envData);
    return envData.industry;
  },

  // 删除行业动态
  deleteIndustry(id) {
    const envData = this.loadEnvData();
    envData.industry = envData.industry.filter(i => i.id !== id);
    this.saveEnvData(envData);
    return envData.industry;
  },

  // 添加政策变化
  addPolicy(text) {
    const envData = this.loadEnvData();
    envData.policy.unshift({
      id: 'pol_' + Date.now(),
      text,
      createdAt: new Date().toISOString()
    });
    envData.policy = envData.policy.slice(0, 50);
    this.saveEnvData(envData);
    return envData.policy;
  },

  // 删除政策变化
  deletePolicy(id) {
    const envData = this.loadEnvData();
    envData.policy = envData.policy.filter(p => p.id !== id);
    this.saveEnvData(envData);
    return envData.policy;
  },

  // 添加人际关系动态
  addRelationship(text) {
    const envData = this.loadEnvData();
    // 解析联系人名称（格式：姓名 + 动态）
    const match = text.match(/^([^：:]+)[:：]\s*(.+)$/);
    const name = match ? match[1].trim() : '未知联系人';
    const content = match ? match[2].trim() : text;

    if (!envData.relationships) envData.relationships = { items: [], contacts: [] };

    // 更新或添加联系人
    let contact = envData.relationships.contacts.find(c => c.name === name);
    if (!contact) {
      contact = { id: 'contact_' + Date.now(), name, importance: 'normal', lastContact: new Date().toISOString() };
      envData.relationships.contacts.push(contact);
    }
    contact.lastContact = new Date().toISOString();

    envData.relationships.items.unshift({
      id: 'rel_' + Date.now(),
      name,
      text: content,
      createdAt: new Date().toISOString()
    });
    envData.relationships.items = envData.relationships.items.slice(0, 50);
    this.saveEnvData(envData);
    return envData.relationships.items;
  },

  // 删除人际关系动态
  deleteRelationship(id) {
    const envData = this.loadEnvData();
    if (envData.relationships) {
      envData.relationships.items = envData.relationships.items.filter(r => r.id !== id);
      this.saveEnvData(envData);
    }
    return envData.relationships?.items || [];
  },

  // 获取联系人预警（30天无联系的核心联系人）
  getContactWarnings() {
    const envData = this.loadEnvData();
    const contacts = envData.relationships?.contacts || [];
    const now = new Date().getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    return contacts.filter(c => {
      const lastContact = new Date(c.lastContact).getTime();
      return c.importance === 'core' && (now - lastContact) > thirtyDaysMs;
    });
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
window.AlertSystem = AlertSystem;
window.TaskTracker = TaskTracker;
window.HistoryTracker = HistoryTracker;
window.EnvironmentTracker = EnvironmentTracker;