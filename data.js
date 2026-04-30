/**
 * J.A.R.V.I.S. Data Layer
 * 财务/任务/预警数据管理 + localStorage 持久化
 */

const JAVIS_DATA_KEY = 'jarvis_data';

// 初始化数据结构
const defaultData = {
  character: {
    name: 'Kim Kami',
    type: '探索型大脑',
    level: 12,
    hp: { current: 85, max: 100 },
    energy: { current: 60, max: 100 },
    gold: { current: 500000, max: 2000000 },
    exp: { current: 35, max: 100 }
  },
  finance: {
    monthlyIncome: 0,
    monthlyExpense: 20000,
    availableFund: 500000,
    currency: 'JPY'
  },
  quests: [
    {
      id: 'quest_001',
      name: 'adult-shop 上线',
      icon: '⚔️',
      progress: 70,
      status: 'in_progress',
      subtasks: [
        { id: 'st_001', name: '网站技术', completed: true },
        { id: 'st_002', name: 'AI功能', completed: true },
        { id: 'st_003', name: '工厂确认', completed: false, inProgress: true },
        { id: 'st_004', name: 'PayPal配置', completed: false },
        { id: 'st_005', name: '产品上架', completed: false }
      ],
      deadline: '2026-05-10',
      owner: '团队'
    },
    {
      id: 'quest_002',
      name: 'J.A.R.V.I.S. Web面板',
      icon: '🎮',
      progress: 20,
      status: 'in_progress',
      subtasks: [
        { id: 'st_010', name: 'HTML结构', completed: true },
        { id: 'st_011', name: 'CSS样式', completed: true },
        { id: 'st_012', name: 'JavaScript', completed: false },
        { id: 'st_013', name: '数据层', completed: false },
        { id: 'st_014', name: '部署上线', completed: false }
      ],
      deadline: '2026-05-07',
      owner: '小新+3号'
    },
    {
      id: 'quest_003',
      name: '星火人才 战略规划',
      icon: '📚',
      progress: 0,
      status: 'pending',
      subtasks: [],
      deadline: null,
      owner: '4号'
    }
  ],
  alerts: [
    {
      id: 'alert_001',
      level: 'critical',
      title: '有限公司执照',
      description: '无执照，无法正规运营成人用品电商',
      suggestion: '立即处理营业执照问题',
      dismissed: false,
      createdAt: '2026-04-30'
    },
    {
      id: 'alert_002',
      level: 'warning',
      title: '资金缓冲期',
      description: '月可用2万，约3个月缓冲期（无收入情况下）',
      suggestion: '加快变现速度',
      dismissed: false,
      createdAt: '2026-04-30'
    },
    {
      id: 'alert_003',
      level: 'info',
      title: '域名待注册',
      description: '品牌名确定后需立即注册',
      suggestion: '确认 felic 品牌名后注册 .com 域名',
      dismissed: false,
      createdAt: '2026-04-30'
    }
  ],
  radar: {
    opportunities: [
      { id: 'opp_001', name: '日本电商', emoji: '🇯🇵', angle: 0, distance: 30 },
      { id: 'opp_002', name: 'AI工具', emoji: '🤖', angle: 72, distance: 60 },
      { id: 'opp_003', name: '内容创作', emoji: '📱', angle: 144, distance: 45 },
      { id: 'opp_004', name: '中国制造', emoji: '🏭', angle: 216, distance: 80 },
      { id: 'opp_005', name: '接单平台', emoji: '💼', angle: 288, distance: 55 }
    ]
  },
  aiAdvices: [
    '根据当前资源状态，建议优先确保 adult-shop 第一笔收入。金币缓冲期仅剩3个月，每一天都在消耗战斗值。',
    'J.A.R.V.I.S. Web面板开发中，预计本周内可上线，届时可以实时监控所有项目状态。',
    '成人用品电商在日本市场有稳定需求，但需要尽快解决执照问题才能正规运营。',
    'MangaStudio 项目技术问题正在解决，JSON格式统一后可以大幅提升排版效率。'
  ],
  settings: {
    theme: 'light',
    notifications: true,
    language: 'ja'
  }
};

// 加载数据
function loadData() {
  try {
    const stored = localStorage.getItem(JAVIS_DATA_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 合并默认数据，确保新字段存在
      return { ...defaultData, ...parsed };
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

// 获取所有数据
function getAllData() {
  return loadData();
}

// 更新角色数据
function updateCharacter(updates) {
  const data = loadData();
  data.character = { ...data.character, ...updates };
  saveData(data);
  return data.character;
}

// 更新财务数据
function updateFinance(updates) {
  const data = loadData();
  data.finance = { ...data.finance, ...updates };
  saveData(data);
  return data.finance;
}

// 添加收入记录
function addIncome(amount, description = '') {
  const data = loadData();
  data.finance.monthlyIncome += amount;
  data.finance.availableFund += amount;
  saveData(data);
  return data.finance;
}

// 添加支出记录
function addExpense(amount, description = '') {
  const data = loadData();
  data.finance.monthlyExpense += amount;
  data.finance.availableFund -= amount;
  saveData(data);
  return data.finance;
}

// 更新任务进度
function updateQuest(questId, updates) {
  const data = loadData();
  const quest = data.quests.find(q => q.id === questId);
  if (quest) {
    Object.assign(quest, updates);
    // 自动计算进度
    if (quest.subtasks && quest.subtasks.length > 0) {
      const completed = quest.subtasks.filter(st => st.completed).length;
      quest.progress = Math.round((completed / quest.subtasks.length) * 100);
      quest.status = completed === quest.subtasks.length ? 'completed' : 'in_progress';
    }
    saveData(data);
  }
  return quest;
}

// 完成任务子项
function completeSubtask(questId, subtaskId) {
  const data = loadData();
  const quest = data.quests.find(q => q.id === questId);
  if (quest && quest.subtasks) {
    const subtask = quest.subtasks.find(st => st.id === subtaskId);
    if (subtask) {
      subtask.completed = true;
      subtask.inProgress = false;
      // 重新计算进度
      const completed = quest.subtasks.filter(st => st.completed).length;
      quest.progress = Math.round((completed / quest.subtasks.length) * 100);
      quest.status = completed === quest.subtasks.length ? 'completed' : 'in_progress';
      saveData(data);
    }
  }
  return quest;
}

// 忽略预警
function dismissAlert(alertId) {
  const data = loadData();
  const alert = data.alerts.find(a => a.id === alertId);
  if (alert) {
    alert.dismissed = true;
    saveData(data);
  }
  return alert;
}

// 添加新预警
function addAlert(alert) {
  const data = loadData();
  const newAlert = {
    id: `alert_${Date.now()}`,
    dismissed: false,
    createdAt: new Date().toISOString().split('T')[0],
    ...alert
  };
  data.alerts.unshift(newAlert);
  saveData(data);
  return newAlert;
}

// 获取随机AI建议
function getRandomAdvice() {
  const data = loadData();
  const advices = data.aiAdvices;
  return advices[Math.floor(Math.random() * advices.length)];
}

// 导出数据（用于调试）
function exportData() {
  return JSON.stringify(loadData(), null, 2);
}

// 导入数据
function importData(jsonStr) {
  try {
    const imported = JSON.parse(jsonStr);
    saveData(imported);
    return true;
  } catch (e) {
    console.error('Failed to import data:', e);
    return false;
  }
}

// 重置为默认数据
function resetData() {
  saveData(defaultData);
  return defaultData;
}

// 财务记录（详细）
function addTransaction(type, amount, category, description = '') {
  const data = loadData();
  if (!data.transactions) data.transactions = [];
  data.transactions.unshift({
    id: `txn_${Date.now()}`,
    type,
    amount,
    category,
    description,
    date: new Date().toISOString()
  });
  saveData(data);
  return data.transactions;
}

// 导出给全局使用
window.JARVIS = {
  loadData,
  saveData,
  getAllData,
  updateCharacter,
  updateFinance,
  addIncome,
  addExpense,
  updateQuest,
  completeSubtask,
  dismissAlert,
  addAlert,
  getRandomAdvice,
  exportData,
  importData,
  resetData,
  addTransaction
};