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
      (liabilities.creditCard || 0) +
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
  // 今日正在处理的案例（叙事格式）
  today: {
    date: new Date().toISOString().split('T')[0],
    score: 75,
    currentCase: {
      patternId: 'wp4',
      originalThought: '不符合预期的行动，即使挣钱了也没有成就感，所以没有跟自己想法一致就提不起兴趣，即便生活有压力了，也不能改变',
      identifiedFlaw: '用模糊的"预期"当行动门槛，其实是在逃避不确定性。不是先有成就感才做，是做了才有。',
      correctReplacement: '一件事不是先有成就感才做，是做了才有。成就感来自过程，不是行动的前置条件。',
      exercises: [
        { id: 'e1', title: '3秒决策练习', desc: '选一件"没感觉但应该做的事"，3秒内决定做不做，不许想太多', completed: false },
        { id: 'e2', title: '先做5分钟', desc: '选了之后立刻做5分钟，不许停，不许评判结果', completed: false },
        { id: 'e3', title: '记录感受', desc: '做完之后记录：做了之后感觉如何？真的有预想的那么糟吗？', completed: false }
      ]
    }
  },

  // 错误思维模式库
  wrongPatterns: [
    { id: 'wp1', name: '过度思考', icon: '🤔', desc: '想太多，行动太少', frequency: 3 },
    { id: 'wp2', name: '非黑即白', icon: '⚫', desc: '思维二极管，没有中间地带', frequency: 2 },
    { id: 'wp3', name: '灾难化', icon: '💥', desc: '小事想成大灾难', frequency: 1 },
    { id: 'wp4', name: '成就感前置', icon: '🎯', desc: '没有成就感就不想做，把结果当前提', frequency: 1 }
  ],

  // 正确思维模式
  correctPatterns: [
    { id: 'cp1', name: '概率思维', icon: '📊', desc: '用概率评估可能性，而非绝对' },
    { id: 'cp2', name: '成长心态', icon: '🌱', desc: '相信能力和智力可以发展' },
    { id: 'cp3', name: '实验思维', icon: '🧪', desc: '把每个决定当作实验' },
    { id: 'cp4', name: '过程优先', icon: '⚡', desc: '先做了才有成就感，不是先有成就感才做' },
    { id: 'cp5', name: '行动驱动', icon: '🚀', desc: '用行动创造正反馈，而非等正反馈才行动' }
  ],

  // 历史案例
  cases: [],

  // 计算思维模式得分
  calculateScore() {
    const exercises = this.today.currentCase?.exercises || [];
    const completedCount = exercises.filter(e => e.completed).length;
    const exerciseRate = exercises.length > 0 ? completedCount / exercises.length : 0;
    return Math.round(75 * (1 - exerciseRate * 0.3) + exerciseRate * 30);
  },

  // 归档当前案例到历史
  archiveCurrentCase() {
    if (!this.today.currentCase) return;
    // 保留完整快照（含完成状态）
    const snapshot = {
      ...this.today.currentCase,
      completedAt: new Date().toISOString(),
      exercises: this.today.currentCase.exercises.map(e => ({ ...e }))
    };
    this.cases.unshift(snapshot);
    if (this.cases.length > 30) this.cases = this.cases.slice(0, 30);
    return snapshot;
  },

  // 切换到新案例
  switchToNewCase(newCase) {
    this.archiveCurrentCase();
    this.today.currentCase = newCase;
    this.today.date = new Date().toISOString().split('T')[0];
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
    localStorage.setItem('jarvis_data_guest', JSON.stringify(data));
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
    // 优先读取游客数据（jarvis_data_guest），其次读正式数据（jarvis_data_v3）
    const stored = localStorage.getItem('jarvis_data_guest') || localStorage.getItem(JAVIS_DATA_KEY);
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
          history: [],
          cases: []
        };
      } else {
        // 增量迁移：新版本添加的 patterns 和 exercises
        const currentWrongIds = (data.mindModel.wrongPatterns || []).map(p => p.id);
        const currentCorrectIds = (data.mindModel.correctPatterns || []).map(p => p.id);

        // 补齐新的错误模式
        MindModelData.wrongPatterns.forEach(newP => {
          if (!currentWrongIds.includes(newP.id)) {
            data.mindModel.wrongPatterns.push(newP);
          }
        });

        // 补齐新的正确模式
        MindModelData.correctPatterns.forEach(newP => {
          if (!currentCorrectIds.includes(newP.id)) {
            data.mindModel.correctPatterns.push(newP);
          }
        });

        // 新叙事格式迁移：如果有旧格式的 exercises，转到 currentCase
        if (!data.mindModel.today?.currentCase) {
          const oldExercises = data.mindModel.today?.exercises || [];
          data.mindModel.today = {
            ...(data.mindModel.today || {}),
            currentCase: {
              patternId: MindModelData.today.currentCase.patternId,
              originalThought: MindModelData.today.currentCase.originalThought,
              identifiedFlaw: MindModelData.today.currentCase.identifiedFlaw,
              correctReplacement: MindModelData.today.currentCase.correctReplacement,
              exercises: MindModelData.today.currentCase.exercises
            }
          };
          // 旧 exercises 合并
          const newExerciseIds = data.mindModel.today.currentCase.exercises.map(e => e.id);
          oldExercises.forEach(oldE => {
            if (!newExerciseIds.includes(oldE.id)) {
              data.mindModel.today.currentCase.exercises.push(oldE);
            }
          });
        } else if (!data.mindModel.today.currentCase.originalThought) {
          // currentCase 存在但缺 narrative 字段，补全叙事内容
          data.mindModel.today.currentCase = {
            ...MindModelData.today.currentCase,
            ...data.mindModel.today.currentCase,
            exercises: data.mindModel.today.currentCase.exercises || MindModelData.today.currentCase.exercises
          };
        }

        // 确保 cases 字段存在
        if (!data.mindModel.cases) {
          // 旧版用 history，新版用 cases
          data.mindModel.cases = data.mindModel.history ? [...data.mindModel.history] : [];
          delete data.mindModel.history;
        }
      }
      saveData(data);
      return data;
    }
  } catch (e) {}
  return getDefaultData();
}

function saveData(data) {
  try {
    localStorage.setItem('jarvis_data_guest', JSON.stringify(data));
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
    finance: {
      assets: {
        cash: 0,
        bankDeposits: 0,
        investments: 0,
        realEstate: 0,
        otherAssets: 0
      },
      liabilities: {
        mortgage: 0,
        loans: 0,
        otherDebts: 0
      },
      monthly: {
        income: 0,
        expenses: 0,
        records: []
      }
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

  // 更新思维模式数据
  updateMindModel(mindData, options = {}) {
    const data = loadData();
    if (!data.mindModel) return;

    // 如果指定了 archiveCurrentCase，先归档当前案例
    if (options.archiveCurrentCase && data.mindModel.today?.currentCase) {
      data.mindModel.cases = data.mindModel.cases || [];
      const snapshot = {
        ...data.mindModel.today.currentCase,
        completedAt: new Date().toISOString()
      };
      data.mindModel.cases.unshift(snapshot);
      if (data.mindModel.cases.length > 30) data.mindModel.cases = data.mindModel.cases.slice(0, 30);
    }

    if (mindData.today) data.mindModel.today = { ...data.mindModel.today, ...mindData.today };
    if (mindData.wrongPatterns) data.mindModel.wrongPatterns = mindData.wrongPatterns;
    if (mindData.correctPatterns) data.mindModel.correctPatterns = mindData.correctPatterns;
    data.lastUpdate = new Date().toISOString();
    saveData(data);
    return data.mindModel;
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

    // 🟠 HP < 50
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

    // 🟡 HP < 70
    if (hp < 70 && hp >= 50) {
      alerts.push({
        id: 'hp_caution',
        category: 'health',
        level: 'info',
        title: 'HP需要注意',
        description: `当前HP: ${hp}/100，建议关注健康`,
        currentValue: hp,
        threshold: 70,
        trend: hp < 60 ? 'worsening' : 'stable',
        suggestion: '保持良好作息，适度运动',
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
// AI Purpose 提炼器
// ==========================================

const AIEvaluator = {
  // 从任务名称提取背后的"意义"
  extractPurpose(taskName) {
    const name = taskName.toLowerCase();

    // 基于关键词匹配提炼意义（简单规则引擎）
    const purposeRules = [
      // 健康相关
      { keywords: ['运动', '跑步', '健身', '锻炼', '瑜伽'], purpose: '保持身体健康，有精力陪伴家人' },
      { keywords: ['体检', '检查', '身体'], purpose: '预防问题，保证长期战斗力' },

      // 家庭相关
      { keywords: ['女儿', '儿子', '孩子', '家人', '陪伴'], purpose: '给孩子高质量的陪伴' },
      { keywords: ['家长会', '学校', '家长日'], purpose: '参与孩子成长' },

      // 财务相关
      { keywords: ['赚钱', '收入', '变现', '销售'], purpose: '提供家庭经济保障' },
      { keywords: ['投资', '理财'], purpose: '积累财富' },

      // 事业相关
      { keywords: ['上线', '发布', '网站', '产品'], purpose: '完成项目，创造价值' },
      { keywords: ['学习', '课程', '培训'], purpose: '提升能力' },
      { keywords: ['面试', '招聘', '人才'], purpose: '组建团队' },

      // 技能相关
      { keywords: ['日语', '英语', '语言', '韩语'], purpose: '拓展可能性' },
      { keywords: ['编程', '代码', '开发'], purpose: '用技术解决问题' }
    ];

    // 遍历匹配
    for (const rule of purposeRules) {
      for (const kw of rule.keywords) {
        if (name.includes(kw)) {
          return rule.purpose;
        }
      }
    }

    // 默认通用回复
    return '确认这个目标对你是否还有意义';
  },

  // 判断任务是否需要意义确认（超过3天未确认且status为pending）
  needsMeaningConfirm(task) {
    const today = new Date().toISOString().split('T')[0];
    const lastConfirmed = task.last_meaning_confirmed || task.purpose_created_at || today;
    const daysSince = Math.floor((new Date(today) - new Date(lastConfirmed)) / 86400000);

    return task.meaning_status === 'pending' && daysSince >= 3;
  },

  // 获取需要确认的任务列表
  getTasksNeedingConfirm() {
    const tasks = TaskTracker.loadTasks();
    return tasks.filter(t => this.needsMeaningConfirm(t));
  },

  // 确认任务意义
  confirmMeaning(taskId, action, newPurpose = null) {
    const tasks = TaskTracker.loadTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return tasks;

    const today = new Date().toISOString().split('T')[0];

    if (action === 'confirm') {
      // [在]：meaning_status → 'confirmed'
      task.meaning_status = 'confirmed';
      task.last_meaning_confirmed = today;
    } else if (action === 'modify') {
      // [改了目标]：记录旧purpose，输入新purpose
      task.previous_purpose = task.purpose;
      task.purpose = newPurpose;
      task.purpose_created_at = today;
      task.last_meaning_confirmed = today;
      task.meaning_status = 'confirmed';
    } else if (action === 'abandon') {
      // [放弃]：meaning_status → 'abandoned'
      task.meaning_status = 'abandoned';
      task.last_meaning_confirmed = today;
    }

    TaskTracker.saveTasks(tasks);
    return tasks;
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
    const today = new Date().toISOString().split('T')[0];

    // AI 提炼 purpose（简单实现）
    const purpose = AIEvaluator.extractPurpose(task.name);

    const newTask = {
      id: 'task_' + Date.now(),
      name: task.name,
      project: task.project,
      progress: task.progress || 0,
      status: task.status || 'pending',
      deadline: task.deadline || null,
      owner: task.owner || 'Kim',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // 意义确认相关字段
      purpose: purpose,                    // AI 提炼的意义
      purpose_created_at: today,        // purpose 创建时间
      last_meaning_confirmed: today,    // 上次确认时间
      meaning_status: 'pending',     // pending | confirmed | modified | abandoned
      previous_purpose: null,      // 改了目标时记录旧purpose
      pattern_note: ''           // 长时间未动的模式备注
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
window.AIEvaluator = AIEvaluator;
window.NotificationService = NotificationService;

// ==========================================
// 每日指挥官数据
// ==========================================

const NotificationService = {
  // 推送服务配置
  config: {
    // 飞书 webhook（用户在设置中配置）
    webhookUrl: localStorage.getItem('feishu_webhook_url') || '',
    // Telegram bot（用户在设置中配置）
    telegramBotToken: localStorage.getItem('telegram_bot_token') || '',
    telegramChatId: localStorage.getItem('telegram_chat_id') || ''
  },

  // 配置 webhook
  configureFeishu(url) {
    localStorage.setItem('feishu_webhook_url', url);
    this.config.webhookUrl = url;
  },

  configureTelegram(botToken, chatId) {
    localStorage.setItem('telegram_bot_token', botToken);
    localStorage.setItem('telegram_chat_id', chatId);
    this.config.telegramBotToken = botToken;
    this.config.telegramChatId = chatId;
  },

  // 检查是否已配置
  isConfigured() {
    return this.config.webhookUrl || (this.config.telegramBotToken && this.config.telegramChatId);
  },

  // 构建推送消息
  buildMessage(tasks) {
    const taskList = tasks.map((t, i) => {
      const daysAgo = Math.floor((new Date() - new Date(t.last_meaning_confirmed || t.purpose_created_at)) / 86400000);
      return `${i + 1}. ${t.name}（${daysAgo}天前确认）— ${t.purpose}`;
    }).join('\n');

    return {
      title: '🎯 意义确认提醒',
      subtitle: `有 ${tasks.length} 个任务需要你确认意义`,
      content: taskList,
      footer: '点击访问 J.A.R.V.I.S. 进行确认'
    };
  },

  // 推送飞书消息
  async sendFeishu(message) {
    if (!this.config.webhookUrl) return;

    try {
      const res = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msg_type: 'post',
          content: {
            title: message.title,
            subtitle: message.subtitle,
            content: message.content,
            footer: message.footer
          }
        })
      });
      return res.ok;
    } catch (e) {
      console.warn('飞书推送失败:', e.message);
      return false;
    }
  },

  // 推送 Telegram 消息
  async sendTelegram(message) {
    if (!this.config.telegramBotToken || !this.config.telegramChatId) return;

    const text = `*${message.title}*\n_${message.subtitle}_\n\n${message.content}\n\n💡 ${message.footer}`;
    const url = `https://api.telegram.org/bot${this.config.telegramBotToken}/sendMessage`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.config.telegramChatId,
          text: text,
          parse_mode: 'Markdown'
        })
      });
      return res.ok;
    } catch (e) {
      console.warn('Telegram 推送失败:', e.message);
      return false;
    }
  },

  // 发送通知（自动选择已配置的平台）
  async send(message) {
    const results = [];

    if (this.config.webhookUrl) {
      results.push(await this.sendFeishu(message));
    }

    if (this.config.telegramBotToken && this.config.telegramChatId) {
      results.push(await this.sendTelegram(message));
    }

    return results.some(r => r);
  },

  // 每日检查并推送（供 cronjob 调用）
  async checkAndNotify() {
    const tasks = AIEvaluator.getTasksNeedingConfirm();

    if (tasks.length === 0) {
      console.log('📝 无需意义确认的任务');
      return;
    }

    const message = this.buildMessage(tasks);
    const sent = await this.send(message);

    if (sent) {
      console.log(`✅ 已推送 ${tasks.length} 个任务到通知渠道`);
    } else {
      console.log('⚠️ 通知渠道未配置，消息未发送');
    }
  }
};

const DailyCommander = {
  STORAGE_KEY: 'jarvis_daily_commander',

  // 获取今日日期字符串
  getTodayKey() {
    return new Date().toISOString().split('T')[0];
  },
  
  // 获取数据
  load() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : {};
      // 如果不是今天的数据，重置
      if (data.date !== this.getTodayKey()) {
        return this.getDefault();
      }
      return data;
    } catch (e) {
      return this.getDefault();
    }
  },
  
  // 保存数据
  save(data) {
    data.date = this.getTodayKey();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },
  
  // 默认数据
  getDefault() {
    return {
      date: this.getTodayKey(),
      role: '创业者', // 父亲 | 创业者 | 开发者 | 休息者
      tasks: ['', '', ''], // 3件事
      completed: [false, false, false] // 完成状态
    };
  },
  
  // 切换角色
  setRole(role) {
    const data = this.load();
    data.role = role;
    this.save(data);
  },
  
  // 设置任务
  setTask(index, text) {
    const data = this.load();
    data.tasks[index] = text;
    this.save(data);
  },
  
  // 切换完成状态
  toggleComplete(index) {
    const data = this.load();
    data.completed[index] = !data.completed[index];
    this.save(data);
  },
  
  // 获取完成数
  getCompletedCount() {
    const data = this.load();
    return data.completed.filter(c => c).length;
  },
  
  // 获取AI建议
  getAIAdvice() {
    const data = this.load();
    const count = this.getCompletedCount();
    const role = data.role;
    
    const roleMessages = {
      '父亲': '陪伴是最好的投资 ✨',
      '创业者': '决策胜于完美 💡',
      '开发者': '代码是最好的表达 💻',
      '休息者': '恢复是为了走更远 🧘'
    };
    
    if (count === 0) {
      return { main: '先完成1件事，打破沉默 ⚡', sub: roleMessages[role] || '' };
    } else if (count === 1) {
      return { main: '好的开始，继续推进 🚀', sub: roleMessages[role] || '' };
    } else if (count === 2) {
      return { main: '即将达成，再坚持一下 🎯', sub: roleMessages[role] || '' };
    } else {
      return { main: '🎉 今日任务完成！', sub: '你今天做得很好，明天继续！' };
    }
  }
};

// ==========================================
// 周度复盘 (Weekly Review)
// ==========================================

const WeeklyReview = {
  STORAGE_KEY: 'jarvis_weekly_review',

  // 获取本周的起止日期
  getWeekRange() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  },

  // 获取周复盘数据
  load() {
    const key = this.STORAGE_KEY;
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return this.getDefault();
  },

  // 保存周复盘数据
  save(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  // 默认数据结构
  getDefault() {
    const week = this.getWeekRange();
    return {
      weekStart: week.start,
      weekEnd: week.end,
      goals: [],
      lessons: [],
      summary: ''
    };
  },

  // 添加目标
  addGoal(text) {
    const data = this.load();
    const week = this.getWeekRange();

    if (data.weekStart !== week.start) {
      data = this.getDefault();
    }

    data.goals.unshift({
      id: 'goal_' + Date.now(),
      text: text,
      completed: false,
      note: '',
      createdAt: new Date().toISOString()
    });
    this.save(data);
    return data;
  },

  // 切换目标完成状态
  toggleGoal(goalId) {
    const data = this.load();
    const goal = data.goals.find(g => g.id === goalId);
    if (goal) {
      goal.completed = !goal.completed;
      this.save(data);
    }
    return data;
  },

  // 添加经验教训
  addLesson(text, type) {
    const data = this.load();
    const week = this.getWeekRange();

    if (data.weekStart !== week.start) {
      data = this.getDefault();
    }

    data.lessons.unshift({
      id: 'lesson_' + Date.now(),
      text: text,
      type: type,
      createdAt: new Date().toISOString()
    });
    this.save(data);
    return data;
  },

  // 保存总结
  saveSummary(summary) {
    const data = this.load();
    data.summary = summary;
    this.save(data);
    return data;
  },

  // 获取完成率
  getCompletionRate() {
    const data = this.load();
    if (data.goals.length === 0) return 0;
    const completed = data.goals.filter(g => g.completed).length;
    return Math.round((completed / data.goals.length) * 100);
  }
};

// ==========================================
// 习惯追踪 (Habit Tracker)
// ==========================================

const HabitTracker = {
  STORAGE_KEY: 'jarvis_habit_tracker',

  load() {
    const key = this.STORAGE_KEY;
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  },

  save(habits) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(habits));
  },

  addHabit(name, goal, period = 'daily') {
    const habits = this.load();
    habits.unshift({
      id: 'habit_' + Date.now(),
      name: name,
      goal: goal,
      period: period,
      streak: 0,
      maxStreak: 0,
      completedDates: [],
      createdAt: new Date().toISOString()
    });
    this.save(habits);
    return habits;
  },

  deleteHabit(habitId) {
    const habits = this.load().filter(h => h.id !== habitId);
    this.save(habits);
    return habits;
  },

  markComplete(habitId) {
    const habits = this.load();
    const habit = habits.find(h => h.id === habitId);
    const today = new Date().toISOString().split('T')[0];

    if (habit) {
      if (!habit.completedDates.includes(today)) {
        habit.completedDates.push(today);
        habit.streak = this.calculateStreak(habit.completedDates);
        if (habit.streak > habit.maxStreak) {
          habit.maxStreak = habit.streak;
        }
        this.save(habits);
      }
    }
    return habits;
  },

  calculateStreak(completedDates) {
    if (completedDates.length === 0) return 0;
    const sorted = [...completedDates].sort().reverse();
    let streak = 0;
    let current = new Date();

    for (let i = 0; i < sorted.length; i++) {
      const dateStr = current.toISOString().split('T')[0];
      if (sorted.includes(dateStr)) {
        streak++;
        current.setDate(current.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  },

  isCompletedToday(habitId) {
    const habits = this.load();
    const habit = habits.find(h => h.id === habitId);
    const today = new Date().toISOString().split('T')[0];
    return habit?.completedDates?.includes(today);
  },

  getTodayProgress() {
    const habits = this.load();
    const today = new Date().toISOString().split('T')[0];
    const completed = habits.filter(h => h.completedDates.includes(today)).length;
    return {
      total: habits.length,
      completed: completed,
      percentage: habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0
    };
  }
};

// ==========================================
// 冲突处理 (Conflict Resolution)
// ==========================================

const ConflictResolution = {
  STORAGE_KEY: 'jarvis_conflict_resolution',

  load() {
    const key = this.STORAGE_KEY;
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  },

  save(conflicts) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(conflicts));
  },

  addConflict(person, reason, emotion) {
    const conflicts = this.load();
    conflicts.unshift({
      id: 'conflict_' + Date.now(),
      person: person,
      reason: reason,
      emotion: emotion,
      status: 'open',
      solution: '',
      reflection: '',
      resolution: '',
      createdAt: new Date().toISOString(),
      resolvedAt: null
    });
    this.save(conflicts);
    return conflicts;
  },

  updateConflict(conflictId, updates) {
    const conflicts = this.load();
    const conflict = conflicts.find(c => c.id === conflictId);
    if (conflict) {
      Object.assign(conflict, updates);
      if (updates.status === 'resolved') {
        conflict.resolvedAt = new Date().toISOString();
      }
      this.save(conflicts);
    }
    return conflicts;
  },

  resolveConflict(conflictId, solution, reflection) {
    return this.updateConflict(conflictId, {
      status: 'resolved',
      solution: solution,
      reflection: reflection,
      resolvedAt: new Date().toISOString()
    });
  },

  deleteConflict(conflictId) {
    const conflicts = this.load().filter(c => c.id !== conflictId);
    this.save(conflicts);
    return conflicts;
  },

  getGuidanceQuestions() {
    return [
      '对方的立场是什么？我理解吗？',
      '我的核心需求是什么？',
      '有没有双赢的解决方案？',
      '我需要放下什么？',
      '下一步最小的一步是什么？'
    ];
  },

  getEmotionIcon(emotion) {
    const icons = {
      'angry': '😠',
      'frustrated': '😤',
      'sad': '😢',
      'confused': '😵',
      'anxious': '😰'
    };
    return icons[emotion] || '😔';
  }
};

// ==========================================
// 影响力自检 (Influence Check)
// ==========================================

const InfluenceCheck = {
  STORAGE_KEY: 'jarvis_influence_check',

  load() {
    const key = this.STORAGE_KEY;
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return this.getDefault();
  },

  save(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  getDefault() {
    return {
      dimensions: {
        technical: { score: 5, maxScore: 10, desc: '技术能力' },
        decision: { score: 5, maxScore: 10, desc: '决策影响力' },
        emotional: { score: 5, maxScore: 10, desc: '情绪感染力' },
        resource: { score: 5, maxScore: 10, desc: '资源调动力' }
      },
      audience: [],
      lastUpdated: new Date().toISOString()
    };
  },

  updateDimensionScore(dimension, score) {
    const data = this.load();
    if (data.dimensions[dimension]) {
      data.dimensions[dimension].score = Math.min(score, data.dimensions[dimension].maxScore);
      data.lastUpdated = new Date().toISOString();
      this.save(data);
    }
    return data;
  },

  addAudience(name, influence = 'normal', relation = 'colleague') {
    const data = this.load();
    data.audience.unshift({
      id: 'audience_' + Date.now(),
      name: name,
      influence: influence,
      relation: relation,
      addedAt: new Date().toISOString()
    });
    data.lastUpdated = new Date().toISOString();
    this.save(data);
    return data;
  },

  deleteAudience(audienceId) {
    const data = this.load();
    data.audience = data.audience.filter(a => a.id !== audienceId);
    data.lastUpdated = new Date().toISOString();
    this.save(data);
    return data;
  },

  getRadarData() {
    const data = this.load();
    return Object.entries(data.dimensions).map(([key, val]) => ({
      dimension: key,
      label: val.desc,
      value: val.score,
      maxValue: val.maxScore
    }));
  },

  getTotalScore() {
    const data = this.load();
    const scores = Object.values(data.dimensions);
    const total = scores.reduce((sum, s) => sum + s.value, 0);
    const max = scores.reduce((sum, s) => sum + s.maxScore, 0);
    return Math.round((total / max) * 100);
  },

  getHighInfluenceAudience() {
    const data = this.load();
    return data.audience.filter(a => a.influence === 'high');
  }
};

// 导出到全局
window.WeeklyReview = WeeklyReview;
window.HabitTracker = HabitTracker;
window.ConflictResolution = ConflictResolution;
window.InfluenceCheck = InfluenceCheck;

// ==========================================
// 月度复盘 (Monthly Review)
// ==========================================

const MonthlyReview = {
  STORAGE_KEY: 'jarvis_monthly_review',

  // 获取本月的起止日期
  getMonthRange() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      year: year,
      month: month + 1
    };
  },

  // 获取月度数据
  load() {
    const key = this.STORAGE_KEY;
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return this.getDefault();
  },

  // 保存月度数据
  save(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  // 默认数据结构
  getDefault() {
    const month = this.getMonthRange();
    return {
      year: month.year,
      month: month.month,
      goals: [],
      achievements: [],
      lessons: [],
      summary: '',
      createdAt: new Date().toISOString()
    };
  },

  // 添加目标
  addGoal(text) {
    const data = this.load();
    const month = this.getMonthRange();

    if (data.year !== month.year || data.month !== month.month) {
      data = this.getDefault();
    }

    data.goals.unshift({
      id: 'mgoal_' + Date.now(),
      text: text,
      completed: false,
      note: '',
      createdAt: new Date().toISOString()
    });
    this.save(data);
    return data;
  },

  // 切换目标完成状态
  toggleGoal(goalId) {
    const data = this.load();
    const goal = data.goals.find(g => g.id === goalId);
    if (goal) {
      goal.completed = !goal.completed;
      this.save(data);
    }
    return data;
  },

  // 添加成就
  addAchievement(text, category) {
    const data = this.load();
    const month = this.getMonthRange();

    if (data.year !== month.year || data.month !== month.month) {
      data = this.getDefault();
    }

    data.achievements.unshift({
      id: 'achievement_' + Date.now(),
      text: text,
      category: category,
      createdAt: new Date().toISOString()
    });
    this.save(data);
    return data;
  },

  // 添加经验教训
  addLesson(text) {
    const data = this.load();
    const month = this.getMonthRange();

    if (data.year !== month.year || data.month !== month.month) {
      data = this.getDefault();
    }

    data.lessons.unshift({
      id: 'lesson_' + Date.now(),
      text: text,
      createdAt: new Date().toISOString()
    });
    this.save(data);
    return data;
  },

  // 保存总结
  saveSummary(summary) {
    const data = this.load();
    data.summary = summary;
    this.save(data);
    return data;
  },

  // 获取完成率
  getCompletionRate() {
    const data = this.load();
    if (data.goals.length === 0) return 0;
    const completed = data.goals.filter(g => g.completed).length;
    return Math.round((completed / data.goals.length) * 100);
  }
};

// ==========================================
// 痛苦反思 (Pain Reflection)
// ==========================================

const PainReflection = {
  STORAGE_KEY: 'jarvis_pain_reflection',

  load() {
    const key = this.STORAGE_KEY;
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  },

  save(reflections) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reflections));
  },

  // 记录痛苦经历
  recordPain(event, emotion, intensity) {
    const reflections = this.load();
    reflections.unshift({
      id: 'pain_' + Date.now(),
      event: event,
      emotion: emotion,
      intensity: intensity, // 1-10
      stage: 'recorded', // recorded | analyzed | resolved
      analysis: '',
      insight: '',
      action: '',
      createdAt: new Date().toISOString(),
      resolvedAt: null
    });
    this.save(reflections);
    return reflections;
  },

  // 分析痛苦经历
  analyze(id, analysis, insight) {
    const reflections = this.load();
    const pain = reflections.find(p => p.id === id);
    if (pain) {
      pain.stage = 'analyzed';
      pain.analysis = analysis;
      pain.insight = insight;
      this.save(reflections);
    }
    return reflections;
  },

  // 标记为已解决
  resolve(id, action) {
    const reflections = this.load();
    const pain = reflections.find(p => p.id === id);
    if (pain) {
      pain.stage = 'resolved';
      pain.action = action;
      pain.resolvedAt = new Date().toISOString();
      this.save(reflections);
    }
    return reflections;
  },

  // 删除记录
  delete(id) {
    const reflections = this.load().filter(p => p.id !== id);
    this.save(reflections);
    return reflections;
  },

  // 获取情绪图标
  getEmotionIcon(emotion) {
    const icons = {
      'anger': '😠',
      'frustration': '😤',
      'sadness': '😢',
      'fear': '😨',
      'anxiety': '😰',
      'disappointment': '😞',
      'loneliness': '😔',
      'confusion': '😵'
    };
    return icons[emotion] || '😔';
  },

  // 获取阶段图标
  getStageIcon(stage) {
    const icons = {
      'recorded': '🔴',
      'analyzed': '🟡',
      'resolved': '🟢'
    };
    return icons[stage] || '⚪';
  },

  // 获取指导问题
  getGuidanceQuestions() {
    return [
      '这件事为什么会让我痛苦？',
      '我的核心需求是什么没有被满足？',
      '我可以控制什么？不能控制什么？',
      '一年后这还算事吗？',
      '我学到了什么？',
      '下一次我会怎么做不同？'
    ];
  }
};

// ==========================================
// 人生原则清单 (Life Principles)
// ==========================================

const LifePrinciples = {
  STORAGE_KEY: 'jarvis_life_principles',

  load() {
    const key = this.STORAGE_KEY;
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return this.getDefault();
  },

  save(principles) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(principles));
  },

  getDefault() {
    return {
      principles: [
        {
          id: 'p1',
          text: '诚信第一',
          category: 'values',
          source: 'initial',
          createdAt: new Date().toISOString()
        },
        {
          id: 'p2',
          text: '行动驱动思考',
          category: 'mindset',
          source: 'initial',
          createdAt: new Date().toISOString()
        },
        {
          id: 'p3',
          text: '以终为始',
          category: 'habit',
          source: 'initial',
          createdAt: new Date().toISOString()
        }
      ],
      examples: [],
      versions: [],
      lastUpdated: new Date().toISOString()
    };
  },

  // 添加原则
  addPrinciple(text, category) {
    const data = this.load();
    data.principles.unshift({
      id: 'p_' + Date.now(),
      text: text,
      category: category,
      source: 'custom',
      createdAt: new Date().toISOString()
    });
    data.lastUpdated = new Date().toISOString();
    this.save(data);
    return data;
  },

  // 更新原则
  updatePrinciple(id, text) {
    const data = this.load();
    const principle = data.principles.find(p => p.id === id);
    if (principle) {
      // 记录历史版本
      data.versions.unshift({
        principleId: id,
        oldText: principle.text,
        newText: text,
        updatedAt: new Date().toISOString()
      });
      principle.text = text;
      data.lastUpdated = new Date().toISOString();
      this.save(data);
    }
    return data;
  },

  // 删除原则
  deletePrinciple(id) {
    const data = this.load();
    data.principles = data.principles.filter(p => p.id !== id);
    data.lastUpdated = new Date().toISOString();
    this.save(data);
    return data;
  },

  // 重新排序
  reorder(orderedIds) {
    const data = this.load();
    const principlesMap = new Map(data.principles.map(p => [p.id, p]));
    data.principles = orderedIds.map(id => principlesMap.get(id)).filter(Boolean);
    data.lastUpdated = new Date().toISOString();
    this.save(data);
    return data;
  },

  // 添加践行案例
  addExample(principleId, example) {
    const data = this.load();
    data.examples.unshift({
      id: 'ex_' + Date.now(),
      principleId: principleId,
      text: example,
      createdAt: new Date().toISOString()
    });
    data.lastUpdated = new Date().toISOString();
    this.save(data);
    return data;
  },

  // 获取分类
  getCategories() {
    return ['values', 'mindset', 'habit', 'relationship', 'health', 'career', 'finance'];
  },

  // 按分类获取
  getByCategory(category) {
    const data = this.load();
    return data.principles.filter(p => p.category === category);
  }
};

// 导出到全局
window.MonthlyReview = MonthlyReview;
window.PainReflection = PainReflection;
window.LifePrinciples = LifePrinciples;

// ==========================================
// 今日意义面板 (Meaningful Day Panel)
// ==========================================

const MeaningfulDayPanel = {
  STORAGE_KEY: 'jarvis_meaningful_day',
  MAX_TASKS: 3,  // 最多3个任务

  // 工具推荐映射（按角色）
  toolRecommendations: {
    '👨‍👧 父亲': ['心流匹配表', '冲突处理流程', '影响力六原则'],
    '💼 创业者': ['精益创业画布', '机会成本', '思考快与慢'],
    '💻 开发者': ['六顶思考帽', '每日快速复盘', '思考快与慢'],
    '🧘 休息者': ['心流匹配表', '痛苦-反思-进步记录', '月度系统复盘']
  },

  // 角色图标映射
  roleEmoji: {
    '👨‍👧 父亲': '👨‍👧',
    '💼 创业者': '💼',
    '💻 开发者': '💻',
    '🧘 休息者': '🧘'
  },

  // 角色映射（旧格式 → 新格式）
  roleMigration: {
    '父亲': '👨‍👧 父亲',
    '创业者': '💼 创业者',
    '开发者': '💻 开发者',
    '休息者': '🧘 休息者'
  },

  // 加载数据（每天自动清空 + 旧数据迁移）
  load() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const today = new Date().toISOString().split('T')[0];
    const data = saved ? JSON.parse(saved) : {};

    // 如果不是今天的数据，完全重置
    if (data.date !== today) {
      return {
        date: today,
        role: '💼 创业者',
        tasks: []  // 新的一天，任务清空
      };
    }

    // 迁移旧数据格式（currentRole → role with emoji）
    if (data.currentRole && !data.role) {
      const oldRole = data.currentRole;
      data.role = this.roleMigration[oldRole] || '💼 创业者';
      delete data.currentRole;
      this.save(data);
    }

    // 确保 role 有 emoji 前缀
    if (data.role && !data.role.includes(' ')) {
      data.role = this.roleMigration[data.role] || '💼 创业者';
      this.save(data);
    }

    return data;
  },

  // 保存数据
  save(data) {
    data.date = new Date().toISOString().split('T')[0];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  // 设置角色
  setRole(role) {
    const data = this.load();
    data.role = role;
    this.save(data);
  },

  // 验证能否添加任务
  canAddTask() {
    const data = this.load();
    return data.tasks.length < this.MAX_TASKS;
  },

  // 添加任务（限制最多3个）
  addTask(text, purpose, tool) {
    const data = this.load();

    if (data.tasks.length >= this.MAX_TASKS) {
      return { error: '最多只能添加3个任务，专注最重要的事' };
    }

    const task = {
      id: 'task_' + Date.now(),
      text: text.trim(),
      purpose: purpose || this._inferPurpose(text),
      tool: tool || null,
      completed: false
    };

    data.tasks.push(task);
    this.save(data);
    return { data, task };
  },

  // 推断 purpose
  _inferPurpose(text) {
    const lower = text.toLowerCase();
    if (lower.includes('运动') || lower.includes('跑步') || lower.includes('健身')) {
      return '保持健康，有精力陪伴家人';
    }
    if (lower.includes('女儿') || lower.includes('儿子') || lower.includes('孩子')) {
      return '在孩子需要我的时候在场';
    }
    if (lower.includes('学习') || lower.includes('日语') || lower.includes('英语')) {
      return '提升自己，创造更多机会';
    }
    if (lower.includes('工作') || lower.includes('项目') || lower.includes('上线')) {
      return '推进目标，建立事业';
    }
    if (lower.includes('adult') || lower.includes('shop')) {
      return '建立被动收入渠道';
    }
    if (lower.includes('manga') || lower.includes('漫画')) {
      return '完成作品，建立内容资产';
    }
    return '做一件有意义的事';
  },

  // 切换完成状态
  toggleComplete(taskId) {
    const data = this.load();
    const task = data.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.save(data);
    }
    return data;
  },

  // 删除任务
  removeTask(taskId) {
    const data = this.load();
    data.tasks = data.tasks.filter(t => t.id !== taskId);
    this.save(data);
    return data;
  },

  // 获取推荐工具
  getRecommendedTools(role) {
    return this.toolRecommendations[role] || [];
  },

  // 获取今日主题（所有purpose合并）
  getTodayThemes(data) {
    const purposes = data.tasks.map(t => t.purpose).filter(Boolean);
    return [...new Set(purposes)];
  }
};

// 导出
window.MeaningfulDayPanel = MeaningfulDayPanel;