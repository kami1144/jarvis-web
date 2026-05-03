/**
 * J.A.R.V.I.S. Proactive Guidance Engine v1.0
 * 主动引导引擎 - 当用户状态出现偏差时，主动推送引导卡片
 */

const GUIDANCE_KEY = 'jarvis_guidance_v1';
const GUIDANCE_LAST_CHECK = 'guidance_last_check';

// ==========================================
// 触发条件配置
// ==========================================

const TRIGGER_CONFIG = {
  health: {
    threshold: 70,
    dimension: 'health',
    label: '健康 HP',
    check: (data, computed) => computed.hp.current < 70,
    getValue: (data, computed) => computed.hp.current,
    getDescription: (value, threshold) => `当前HP: ${value}/${threshold}，低于阈值`,
    getEmotionTrigger: (value) => {
      if (value < 30) return '身体在报警！你还想撑着吗？';
      if (value < 50) return '再撑下去要出问题亮了';
      return '你已经连续几天没运动了，身体在抗议';
    },
    getSuggestion: (value) => {
      if (value < 30) return '立即休息，保证8小时睡眠，停止一切非必要工作';
      if (value < 50) return '今天走8000步，补充睡眠，建议23点前入睡';
      return '建议今日步行8000步或运动30分钟恢复HP';
    },
    getTask: (value) => ({
      title: value < 50 ? '恢复HP：充足睡眠' : '今日运动：走8000步',
      description: `HP当前${value}，需要恢复`,
      priority: value < 50 ? 'high' : 'medium',
      deadline: new Date().toISOString().split('T')[0] + 'T23:59:59Z'
    })
  },
  finance: {
    threshold: 0.2,  // 20% over budget
    dimension: 'finance',
    label: '财务',
    check: (data, computed) => {
      const budget = data.finance?.monthly?.budget || 0;
      const expenses = data.finance?.monthly?.expenses || 0;
      return budget > 0 && expenses > budget * 1.2;
    },
    getValue: (data, computed) => {
      const budget = data.finance?.monthly?.budget || 1;
      const expenses = data.finance?.monthly?.expenses || 0;
      return ((expenses / budget - 1) * 100).toFixed(0);
    },
    getDescription: (value, threshold) => `本月支出超出预算 ${value}%`,
    getEmotionTrigger: (value) => {
      const over = parseInt(value);
      if (over > 30) return '钱包在流血！你看到了吗？';
      if (over > 20) return '支出又超了就这么无所谓吗？';
      return '真的需要花这么多吗？';
    },
    getSuggestion: (value) => {
      const over = parseInt(value);
      if (over > 30) return '立即停止非必要消费，审查所有待付账单';
      if (over > 20) return '下调可选消费，优先保障现金流';
      return '建议审查本周支出，控制非必要花费';
    },
    getTask: (value) => ({
      title: '财务检查：控制本月支出',
      description: `支出超出预算${value}%，需要控制`,
      priority: 'high',
      deadline: new Date().toISOString().split('T')[0] + 'T23:59:59Z'
    })
  },
  emotion: {
    threshold: 50,
    dimension: 'emotion',
    label: '能量',
    check: (data, computed, history) => {
      // 连续3天能量 < 50
      const energyHistory = loadEnergyHistory();
      if (energyHistory.length < 3) return false;
      return energyHistory.slice(0, 3).every(e => e < 50);
    },
    getValue: (data, computed) => computed.energy.current,
    getDescription: (value, threshold) => `当前能量: ${value}，连续3天低于${threshold}`,
    getEmotionTrigger: (value) => {
      if (value < 30) return '你已经精疲力尽了，还要继续撑？';
      return '能量这么低，效率能高吗？';
    },
    getSuggestion: (value) => {
      if (value < 30) return '立即停止工作，强制休息至少2小时';
      return '建议短暂休息或做喜欢的事恢复精力';
    },
    getTask: (value) => ({
      title: value < 30 ? '强制休息2小时' : '能量恢复：短暂休息',
      description: `能量${value}，需要恢复`,
      priority: 'high',
      deadline: new Date().toISOString().split('T')[0] + 'T23:59:59Z'
    })
  },
  task: {
    threshold: 3,
    dimension: 'task',
    label: '任务阻塞',
    check: (data, computed) => {
      const blockedDays = getBlockedTaskDays();
      return blockedDays > 3;
    },
    getValue: (data, computed) => getBlockedTaskDays(),
    getDescription: (value, threshold) => `有任务阻塞超过${value}天无进展`,
    getEmotionTrigger: (value) => {
      if (value > 7) return '再拖下去这个项目要废了吗？';
      if (value > 5) return '任务卡这么久打算怎么处理？';
      return '别让问题一直拖着';
    },
    getSuggestion: (value) => {
      if (value > 7) return '立即排查阻塞原因，寻求帮助解决';
      return '建议与相关人员沟通，推进任务进展';
    },
    getTask: (value) => ({
      title: '解除任务阻塞',
      description: `有${value}个任务阻塞超过3天，需要推进`,
      priority: 'high',
      deadline: new Date().toISOString().split('T')[0] + 'T23:59:59Z'
    })
  }
};

// ==========================================
// Escalation 措辞强度
// ==========================================

const ESCALATION_LEVELS = [
  { level: 0, severity: 'normal', color: '#4CAF50', label: '提醒' },
  { level: 1, severity: 'warning', color: '#FF9800', label: '警告' },
  { level: 2, severity: 'critical', color: '#F44336', label: '严重' },
  { level: 3, severity: 'critical', color: '#D32F2F', label: '强制' }
];

// ==========================================
// 数据加载/保存
// ==========================================

function loadGuidanceCards() {
  try {
    const stored = localStorage.getItem(GUIDANCE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return [];
}

function saveGuidanceCards(cards) {
  try {
    localStorage.setItem(GUIDANCE_KEY, JSON.stringify(cards));
  } catch (e) {}
}

function loadEnergyHistory() {
  try {
    const stored = localStorage.getItem('jarvis_energy_history');
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return [];
}

function saveEnergyHistory(history) {
  try {
    localStorage.setItem('jarvis_energy_history', JSON.stringify(history.slice(0, 90)));
  } catch (e) {}
}

function getBlockedTaskDays() {
  const tasks = TaskTracker.loadTasks();
  const now = new Date();
  let maxDays = 0;

  tasks.forEach(task => {
    if (task.status === 'blocked') {
      const created = new Date(task.createdAt);
      const days = Math.floor((now - created) / (24 * 60 * 60 * 1000));
      if (days > maxDays) maxDays = days;
    }
  });

  return maxDays;
}

// ==========================================
// 时间检查 (10:00-15:00)
// ==========================================

function isWithinCheckTime() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 10 && hour < 15;
}

function getTodayDateStr() {
  return new Date().toISOString().split('T')[0];
}

function hasCheckedToday() {
  const lastCheck = localStorage.getItem(GUIDANCE_LAST_CHECK);
  return lastCheck === getTodayDateStr();
}

// ==========================================
// 核心触发检查
// ==========================================

function checkGuidanceTriggers() {
  // 检查是否在10:00-15:00
  if (!isWithinCheckTime()) {
    console.log('⏰ 不在检查时间窗口 (10:00-15:00)');
    return [];
  }

  // 如果今天已经检查过，不再重复
  if (hasCheckedToday()) {
    console.log('⏰ 今日已检查');
    return [];
  }

  const data = JARVIS.getAllData();
  const computed = JARVIS.getRealtimeData();
  const triggeredCards = [];

  // 记录当前能量到历史
  const energy = computed.energy.current;
  const energyHistory = loadEnergyHistory();
  const todayStr = getTodayDateStr();

  // 只记录今天的第一个能量值
  if (!energyHistory[0] || energyHistory[0].date !== todayStr) {
    energyHistory.unshift({ date: todayStr, value: energy });
    saveEnergyHistory(energyHistory);
  }

  // 检查每个维度
  for (const [dim, config] of Object.entries(TRIGGER_CONFIG)) {
    if (config.check(data, computed, energyHistory)) {
      // 检查今天是否已推送过该维度
      const existingCards = loadGuidanceCards();
      const todayPushed = existingCards.filter(c =>
        c.dimension === dim &&
        c.status === 'active' &&
        c.triggered_at.startsWith(todayStr)
      );

      if (todayPushed.length > 0) {
        console.log(`⏭️ ${dim} 今日已推送，跳过`);
        continue;
      }

      const value = config.getValue(data, computed);
      triggeredCards.push({
        id: 'guidance_' + dim + '_' + Date.now(),
        dimension: dim,
        triggered_at: new Date().toISOString(),
        severity: 'normal',
        ignore_count: 0,
        status: 'active',
        data: {
          current_value: value,
          threshold: config.threshold,
          dimension_label: config.label,
          description: config.getDescription(value, config.threshold),
          emotion_trigger: config.getEmotionTrigger(value),
          suggestion: config.getSuggestion(value),
          suggested_task: config.getTask(value)
        }
      });
    }
  }

  return triggeredCards;
}

// ==========================================
// 生成卡片（带 escalation）
// ==========================================

function generateGuidanceCard(cardData) {
  const escalation = ESCALATION_LEVELS[Math.min(cardData.ignore_count, 3)];
  const base = cardData.data;

  // 根据 escalation 调整措辞
  let emotionTrigger = base.emotion_trigger;
  let suggestion = base.suggestion;
  let color = escalation.color;
  let severity = escalation.severity;

  if (cardData.ignore_count > 0) {
    // 增强措辞
    const multipliers = ['', '！', '？？', '！！！'];
    emotionTrigger += multipliers[Math.min(cardData.ignore_count, 3)];
  }

  return {
    ...cardData,
    severity,
    display: {
      color,
      title: `${base.dimension_label} ${escalation.label}`,
      description: base.description,
      emotion_trigger: emotionTrigger,
      suggestion: suggestion,
      task_button: '创建任务',
      dismiss_button: cardData.ignore_count >= 3 ? '我已经知道' : '稍后提醒'
    }
  };
}

// ==========================================
// 卡片操作
// ==========================================

function addGuidanceCard(card) {
  const cards = loadGuidanceCards();
  cards.unshift(card);
  saveGuidanceCards(cards);
  return cards;
}

function dismissGuidanceCard(cardId) {
  const cards = loadGuidanceCards();
  const index = cards.findIndex(c => c.id === cardId);

  if (index !== -1) {
    cards[index].ignore_count++;
    cards[index].status = 'dismissed';
    cards[index].dismissed_at = new Date().toISOString();
    saveGuidanceCards(cards);
  }

  return cards;
}

function resolveGuidanceCard(cardId) {
  const cards = loadGuidanceCards();
  const index = cards.findIndex(c => c.id === cardId);

  if (index !== -1) {
    cards[index].status = 'resolved';
    cards[index].resolved_at = new Date().toISOString();
    saveGuidanceCards(cards);
  }

  return cards;
}

function createTaskFromGuidance(cardId) {
  const cards = loadGuidanceCards();
  const card = cards.find(c => c.id === cardId);

  if (!card || !card.data.suggested_task) return null;

  const taskData = card.data.suggested_task;
  TaskTracker.addTask({
    name: taskData.title,
    project: 'jarvis-web',
    progress: 0,
    status: 'pending',
    deadline: taskData.deadline,
    owner: 'Kim'
  });

  // 标记卡片为已解决
  resolveGuidanceCard(cardId);

  return taskData;
}

// ==========================================
// 每日检查入口
// ==========================================

function runDailyGuidanceCheck() {
  // 记录检查日期
  localStorage.setItem(GUIDANCE_LAST_CHECK, getTodayDateStr());

  // 检查触发条件
  const triggered = checkGuidanceTriggers();

  // 添加新卡片
  triggered.forEach(card => {
    addGuidanceCard(card);
  });

  return triggered;
}

// ==========================================
// 获取活跃卡片（用于显示）
// ==========================================

function getActiveGuidanceCards() {
  const cards = loadGuidanceCards();
  return cards
    .filter(c => c.status === 'active')
    .map(c => generateGuidanceCard(c));
}

// ==========================================
// 导出到全局
// ==========================================

window.GuidanceEngine = {
  runDailyGuidanceCheck,
  getActiveGuidanceCards,
  dismissGuidanceCard,
  createTaskFromGuidance,
  isWithinCheckTime,
  hasCheckedToday
};