/**
 * J.A.R.V.I.S. App Logic v2
 * 实时动态数据展示 + 自动刷新
 */

// 实时更新间隔（毫秒）
const REFRESH_INTERVAL = 3000; // 3秒
let refreshTimer = null;

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // 设置当前日期
  setCurrentDate();
  
  // 初始渲染
  renderAll();
  
  // 启动实时更新
  startRealtimeUpdates();
  
  // 绑定事件
  bindEvents();
  
  // 初始化数据源状态面板
  initDataSourcePanel();
  
  console.log('🎮 J.A.R.V.I.S. v2 初始化完成 - 实时数据联动');
}

// 启动实时更新
function startRealtimeUpdates() {
  // 立即执行一次
  renderAll();
  
  // 定时刷新
  refreshTimer = setInterval(() => {
    renderAll();
  }, REFRESH_INTERVAL);
  
  console.log(`⏱️ 实时更新已启动 (${REFRESH_INTERVAL / 1000}秒间隔)`);
}

// 停止实时更新
function stopRealtimeUpdates() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
    console.log('⏹️ 实时更新已停止');
  }
}

// 设置当前日期
function setCurrentDate() {
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  const dateStr = now.toLocaleDateString('ja-JP', options);
  const timeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  document.getElementById('currentDate').textContent = `${dateStr} ${timeStr}`;
}

// 渲染所有模块
function renderAll() {
  // 更新日期时间
  setCurrentDate();
  
  // 获取实时数据
  const data = JARVIS.getRealtimeData();
  const rawData = JARVIS.getAllData();
  
  // 渲染各模块
  renderCharacter(data, rawData);
  renderFinance(rawData.financeData);
  renderQuests(rawData.projectData);
  renderAlerts(rawData);
  renderSkills(rawData.skillData);
}

// 渲染角色卡片（动态数据联动）
function renderCharacter(data, rawData) {
  const card = document.querySelector('.character-card');
  if (!card) return;
  
  // 基础信息
  card.querySelector('.character-name').textContent = rawData.character?.name || 'Kim Kami';
  card.querySelector('.character-type').textContent = rawData.character?.type || '探索型大脑';
  
  // HP进度条 - 颜色随值变化
  const hpFill = card.querySelector('.hp-fill');
  const hpPercent = data.hp.current;
  hpFill.style.width = `${hpPercent}%`;
  hpFill.style.background = getHPColor(hpPercent);
  card.querySelectorAll('.stat')[0].querySelector('.stat-value').textContent = `${data.hp.current}/${data.hp.max}`;
  
  // 能量进度条 - 随情绪变化
  const energyFill = card.querySelector('.energy-fill');
  const energyPercent = data.energy.current;
  energyFill.style.width = `${energyPercent}%`;
  energyFill.style.background = getEnergyColor(energyPercent);
  card.querySelectorAll('.stat')[1].querySelector('.stat-value').textContent = `${data.energy.current}/${data.energy.max}`;
  
  // 金币进度条 - 随净资产变化
  const goldFill = card.querySelector('.gold-fill');
  const goldPercent = data.gold.current;
  goldFill.style.width = `${Math.min(100, goldPercent)}%`;
  card.querySelectorAll('.stat')[2].querySelector('.stat-value').textContent = `¥${(data.gold.raw / 10000).toFixed(0)}万`;
  
  // 经验值进度条 - 综合评分
  const expFill = card.querySelector('.exp-fill');
  const expPercent = data.exp.current;
  expFill.style.width = `${expPercent}%`;
  card.querySelectorAll('.stat')[3].querySelector('.stat-value').textContent = `Lv.${data.level}`;
  
  // 添加数值变化动画效果
  animateValueChange(card);
}

// HP颜色：100=满血绿, 70+=黄, 40+=橙, <40=红
function getHPColor(value) {
  if (value >= 80) return 'linear-gradient(90deg, #4CAF50, #45A049)';
  if (value >= 60) return 'linear-gradient(90deg, #8BC34A, #7CB342)';
  if (value >= 40) return 'linear-gradient(90deg, #FF9800, #FB8C00)';
  return 'linear-gradient(90deg, #F44336, #E53935)';
}

// 能量颜色：高能量=蓝紫, 中=青绿, 低=灰
function getEnergyColor(value) {
  if (value >= 70) return 'linear-gradient(90deg, #7C4DFF, #651FFF)';
  if (value >= 40) return 'linear-gradient(90deg, #00BCD4, #00ACC1)';
  return 'linear-gradient(90deg, #78909C, #607D8B)';
}

// 数值变化动画
const lastValues = {};
function animateValueChange(card) {
  card.querySelectorAll('.stat').forEach((stat, i) => {
    const valueEl = stat.querySelector('.stat-value');
    const currentValue = valueEl.textContent;
    
    if (lastValues[i] !== currentValue) {
      valueEl.classList.add('value-changed');
      setTimeout(() => valueEl.classList.remove('value-changed'), 500);
      lastValues[i] = currentValue;
    }
  });
}

// 渲染财务仪表盘
function renderFinance(financeData) {
  const card = document.querySelector('.financial-card');
  if (!card) return;
  
  // 计算月收入
  const now = new Date();
  const thisMonth = financeData.incomeFlow.filter(i => {
    const d = new Date(i.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlyIncome = thisMonth.reduce((sum, i) => sum + i.amount, 0);
  
  // 计算月支出
  const thisMonthExp = financeData.expensesFlow.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlyExpense = thisMonthExp.reduce((sum, e) => sum + e.amount, 0);
  
  // 更新显示
  const incomeEl = document.getElementById('monthlyIncome');
  const expenseEl = document.getElementById('monthlyExpense');
  const balanceEl = document.getElementById('availableFund');
  
  incomeEl.textContent = monthlyIncome >= 10000 
    ? `¥${(monthlyIncome / 10000).toFixed(0)}万` 
    : `¥${monthlyIncome.toLocaleString()}`;
  incomeEl.className = 'finance-value income';
  
  expenseEl.textContent = monthlyExpense >= 10000 
    ? `¥${(monthlyExpense / 10000).toFixed(0)}万` 
    : `¥${monthlyExpense.toLocaleString()}`;
  
  const available = financeData.assets.availableCash;
  balanceEl.textContent = `¥${(available / 10000).toFixed(0)}万`;
}

// 渲染任务列表
function renderQuests(projects) {
  const questList = document.getElementById('questList');
  if (!questList) return;
  
  const questMap = {
    'adult-shop': { name: 'adult-shop 上线', icon: '⚔️', progress: 70 },
    'jarvis-web': { name: 'J.A.R.V.I.S. Web面板', icon: '🎮', progress: 40 },
    'manga-studio': { name: 'MangaStudio', icon: '📚', progress: 30 }
  };
  
  // 合并项目进度
  const quests = projects.map(p => ({
    id: p.id,
    name: questMap[p.id]?.name || p.id,
    icon: questMap[p.id]?.icon || '📋',
    progress: p.progress,
    status: p.progress >= 100 ? 'completed' : p.progress > 0 ? 'in_progress' : 'pending'
  }));
  
  questList.innerHTML = quests.map(quest => {
    const statusLabel = { pending: '待开始', in_progress: '进行中', completed: '完成' };
    const statusClass = { pending: 'pending', in_progress: 'in-progress', completed: 'completed' };
    
    return `
      <div class="quest-item ${statusClass[quest.status]}" data-quest-id="${quest.id}">
        <div class="quest-header">
          <span class="quest-icon">${quest.icon}</span>
          <span class="quest-name">${quest.name}</span>
          <span class="quest-status ${statusClass[quest.status]}">${statusLabel[quest.status]}</span>
        </div>
        <div class="quest-progress">
          <div class="progress-bar">
            <div class="progress-fill quest-fill" style="width: ${quest.progress}%"></div>
          </div>
          <span class="progress-text">${quest.progress}%</span>
        </div>
      </div>
    `;
  }).join('');
  
  // 更新经验值中的项目进度
  updateProjectProgressBars(quests);
}

// 更新项目进度条
function updateProjectProgressBars(quests) {
  // 经验值现在由data.js的ComputeEngine实时计算
  // 这里只是辅助显示
}

// 渲染预警系统（基于实时数据）
function renderAlerts(rawData) {
  const alertList = document.getElementById('alertList');
  if (!alertList) return;
  
  const alerts = [];
  
  // 财务预警
  const finance = rawData.financeData;
  const monthlyExpense = finance.expensesFlow.reduce((sum, e) => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() ? sum + e.amount : sum;
  }, 0);
  
  const monthlyIncome = finance.incomeFlow.reduce((sum, i) => {
    const d = new Date(i.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() ? sum + i.amount : sum;
  }, 0);
  
  // 资金预警
  if (finance.assets.availableCash < 100000) {
    alerts.push({
      level: 'critical',
      title: '💸 资金告急',
      description: `可用资金仅剩¥${(finance.assets.availableCash / 10000).toFixed(0)}万`,
      suggestion: '立即寻找收入来源'
    });
  } else if (monthlyExpense > monthlyIncome * 3 && monthlyIncome > 0) {
    alerts.push({
      level: 'warning',
      title: '⚠️ 支出超标',
      description: '月支出是收入的3倍以上',
      suggestion: '控制非必要支出'
    });
  }
  
  // HP预警
  const hp = JARVIS.getRealtimeData().hp.current;
  if (hp < 40) {
    alerts.push({
      level: 'critical',
      title: '💗 健康预警',
      description: 'HP过低，需要休息和调整',
      suggestion: '保证睡眠，减少压力'
    });
  }
  
  // 能量预警
  const energy = JARVIS.getRealtimeData().energy.current;
  if (energy < 30) {
    alerts.push({
      level: 'warning',
      title: '⚡ 能量不足',
      description: '精神状态需要恢复',
      suggestion: '适当休息，做喜欢的事'
    });
  }
  
  // 无收入预警
  if (monthlyIncome === 0) {
    alerts.push({
      level: 'info',
      title: '📈 收入为零',
      description: '本月暂无收入记录',
      suggestion: '加快变现项目进度'
    });
  }
  
  if (alerts.length === 0) {
    alerts.push({
      level: 'info',
      title: '🎉 状态良好',
      description: '各项指标正常',
      suggestion: '继续保持'
    });
  }
  
  alertList.innerHTML = alerts.map(alert => {
    const levelIcon = { critical: '🔴', warning: '🟠', info: '🔵' };
    return `
      <div class="alert-item ${alert.level}">
        <span class="alert-level">${levelIcon[alert.level]}</span>
        <div class="alert-content">
          <div class="alert-title">${alert.title}</div>
          <div class="alert-desc">${alert.description}</div>
        </div>
      </div>
    `;
  }).join('');
}

// 渲染技能数据
function renderSkills(skills) {
  // 技能显示在经验值的子项中
  // 如果有技能卡片区域就更新
}

// 初始化数据源状态面板（开发调试用）
function initDataSourcePanel() {
  // 定期输出数据源状态到控制台
  setInterval(() => {
    const status = JARVIS.getDataSourceStatus();
    console.log('📊 数据源状态:', {
      HP: status.health.computedHP,
      能量: status.mood.computedEnergy,
      金币: `${status.finance.computedGold}% (¥${(status.finance.rawGold / 10000).toFixed(0)}万)`,
      技能: status.skills.map(s => `${s.name} Lv.${s.level}`).join(', '),
      项目: status.projects.map(p => `${p.id}:${p.progress}%`).join(', ')
    });
  }, 10000); // 每10秒输出一次
}

// 绑定事件
function bindEvents() {
  // Tab切换
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });
  
  // AI建议按钮
  window.requestAdvice = function() {
    const data = JARVIS.getRealtimeData();
    const advices = generateAdvices(data);
    const advice = advices[Math.floor(Math.random() * advices.length)];
    
    const adviceEl = document.getElementById('aiAdvice');
    if (adviceEl) {
      adviceEl.innerHTML = `<div class="advice-item"><p>「${advice}</p></div>`;
      adviceEl.style.animation = 'none';
      adviceEl.offsetHeight;
      adviceEl.style.animation = 'fadeIn 0.3s ease';
    }
  };
  
  // AI对话按钮
  window.openChat = function() {
    showNotification('💬 AI对话功能开发中...', 'info');
  };
  
  // 快捷数据更新（演示用）
  window.simulateIncome = function(amount) {
    JARVIS.addIncome(amount, '模拟收入');
    renderAll();
    showNotification(`💰 +¥${amount.toLocaleString()} 收入已记录`, 'success');
  };
  
  window.simulateExpense = function(amount) {
    JARVIS.addExpense(amount, '模拟支出');
    renderAll();
    showNotification(`💸 -¥${amount.toLocaleString()} 支出已记录`, 'warning');
  };
  
  window.simulateWork = function() {
    JARVIS.addChatMood(0.8 + Math.random() * 0.2); // 高情绪
    const data = JARVIS.getAllData();
    data.moodData.hoursSinceRest = 0;
    JARVIS.updateMood(data.moodData);
    renderAll();
    showNotification('⚡ 工作完成，能量+', 'success');
  };
  
  window.simulateRest = function() {
    const data = JARVIS.getAllData();
    data.moodData.hoursSinceRest = 0;
    data.moodData.contextWindows = 0;
    JARVIS.updateMood(data.moodData);
    renderAll();
    showNotification('😴 休息完成，能量恢复', 'info');
  };
}

// 生成AI建议（基于实时数据）
function generateAdvices(data) {
  const advices = [];
  
  // HP相关
  if (data.hp.current < 50) {
    advices.push('🏥 HP偏低，建议保证充足睡眠，减少熬夜');
  }
  
  // 能量相关
  if (data.energy.current < 50) {
    advices.push('⚡ 能量不足，可以尝试短暂休息或做喜欢的事恢复精力');
  }
  
  // 财务相关
  if (data.gold.raw < 300000) {
    advices.push('💸 资金储备低于30万，建议加快变现项目');
  }
  
  // 项目建议
  if (data.level < 20) {
    advices.push('📈 经验值积累中，持续学习新技能可加速升级');
  }
  
  // 综合建议
  advices.push('🎯 保持当前节奏，HP/能量/金币三位一体平衡发展');
  advices.push('⚔️ adult-shop项目进度良好，争取本周完成工厂对接');
  advices.push('🎮 J.A.R.V.I.S. Web面板已上线，持续迭代优化');
  
  return advices.length > 0 ? advices : ['🌟 状态良好，继续保持！'];
}

// Tab切换
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  const cardMap = { dashboard: 0, quests: 1, finance: 0, alerts: 2, ai: 2 };
  const cards = document.querySelectorAll('.card');
  const targetIndex = cardMap[tabName];
  
  if (window.innerWidth < 768) {
    cards.forEach((card, i) => {
      card.style.display = (i === targetIndex) ? 'block' : 'none';
    });
  } else {
    cards.forEach(card => card.style.display = 'block');
    cards[targetIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// 通知系统
function showNotification(message, type = 'info') {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : type === 'error' ? '#F44336' : '#2196F3'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// 动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .value-changed {
    animation: valuePulse 0.5s ease;
  }
  @keyframes valuePulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); color: #E8A87C; }
  }
  .card { animation: fadeIn 0.3s ease; }
  .income { color: #4CAF50 !important; }
`;
document.head.appendChild(style);

// 响应式
window.addEventListener('resize', () => {
  if (window.innerWidth >= 768) {
    document.querySelectorAll('.card').forEach(card => card.style.display = 'block');
  }
});

// 导出
window.JARVIS_APP = { renderAll, showNotification, switchTab, stopRealtimeUpdates, startRealtimeUpdates };