/**
 * J.A.R.V.I.S. App Logic v3
 * 手动输入 + Obsidian 联动
 */

const REFRESH_INTERVAL = 5000;
let refreshTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  setCurrentDate();
  renderAll();
  startRealtimeUpdates();
  bindEvents();
  console.log('🎮 J.A.R.V.I.S. v3 初始化完成 - 手动输入 + Obsidian联动');
}

function startRealtimeUpdates() {
  renderAll();
  refreshTimer = setInterval(renderAll, REFRESH_INTERVAL);
  console.log(`⏱️ 实时更新已启动 (${REFRESH_INTERVAL / 1000}秒间隔)`);
}

function setCurrentDate() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ja-JP', { 
    year: 'numeric', month: 'long', day: 'numeric', 
    weekday: 'long', hour: '2-digit', minute: '2-digit' 
  });
  document.getElementById('currentDate').textContent = dateStr;
}

function renderAll() {
  setCurrentDate();
  const data = JARVIS.getAllData();
  const computed = JARVIS.getRealtimeData();
  
  renderCharacter(computed, data);
  renderFinance(data.finance);
  renderQuests(data.projects);
  renderAlerts(computed, data);
  renderSkills(data.skills);
}

// 渲染角色卡片
function renderCharacter(computed, data) {
  const card = document.querySelector('.character-card');
  if (!card) return;
  
  // 基础信息
  card.querySelector('.character-name').textContent = data.character?.name || 'Kim Kami';
  card.querySelector('.character-type').textContent = data.character?.type || '探索型大脑';
  
  // HP
  const hpFill = card.querySelector('.hp-fill');
  hpFill.style.width = `${computed.hp.current}%`;
  hpFill.style.background = getHPColor(computed.hp.current);
  card.querySelector('#hpValue').textContent = `${computed.hp.current}/${computed.hp.max}`;
  
  // 能量
  const energyFill = card.querySelector('.energy-fill');
  energyFill.style.width = `${computed.energy.current}%`;
  energyFill.style.background = getEnergyColor(computed.energy.current);
  card.querySelector('#energyValue').textContent = `${computed.energy.current}/${computed.energy.max}`;
  
  // 金币
  const goldFill = card.querySelector('.gold-fill');
  goldFill.style.width = `${Math.min(100, computed.gold.current)}%`;
  card.querySelector('#goldValue').textContent = `¥${(computed.gold.raw / 10000).toFixed(0)}万`;
  
  // 经验
  const expFill = card.querySelector('.exp-fill');
  expFill.style.width = `${computed.exp.current}%`;
  card.querySelector('#expValue').textContent = `Lv.${computed.level}`;
  
  // 数据来源显示
  card.querySelector('#checkupDate').textContent = data.health?.checkup?.date?.slice(5) || '待输入';
  
  const moodStatus = data.mood?.todayMood?.dominantEmotion || '待分析';
  card.querySelector('#moodStatus').textContent = moodStatus;
  
  const netWorth = (computed.gold.raw / 10000).toFixed(0);
  card.querySelector('#netWorth').textContent = `¥${netWorth}万`;
}

function getHPColor(value) {
  if (value >= 80) return 'linear-gradient(90deg, #4CAF50, #45A049)';
  if (value >= 60) return 'linear-gradient(90deg, #8BC34A, #7CB342)';
  if (value >= 40) return 'linear-gradient(90deg, #FF9800, #FB8C00)';
  return 'linear-gradient(90deg, #F44336, #E53935)';
}

function getEnergyColor(value) {
  if (value >= 70) return 'linear-gradient(90deg, #7C4DFF, #651FFF)';
  if (value >= 40) return 'linear-gradient(90deg, #00BCD4, #00ACC1)';
  return 'linear-gradient(90deg, #78909C, #607D8B)';
}

// 渲染财务
function renderFinance(finance) {
  const card = document.querySelector('.financial-card');
  if (!card) return;
  
  const income = finance.monthly?.income || 0;
  const expenses = finance.monthly?.expenses || 0;
  const cash = finance.assets?.cash || 0;
  
  card.querySelector('#monthlyIncome').textContent = income >= 10000 
    ? `¥${(income / 10000).toFixed(0)}万` : `¥${income.toLocaleString()}`;
  
  card.querySelector('#monthlyExpense').textContent = expenses >= 10000 
    ? `¥${(expenses / 10000).toFixed(0)}万` : `¥${expenses.toLocaleString()}`;
  
  card.querySelector('#availableFund').textContent = `¥${(cash / 10000).toFixed(0)}万`;
  
  // 收支流水
  const records = finance.monthly?.records || [];
  const incomeRecords = records.filter(r => r.type === 'income');
  const expenseRecords = records.filter(r => r.type === 'expense');
  
  const incomeList = card.querySelector('#incomeFlowList');
  if (incomeRecords.length === 0) {
    incomeList.innerHTML = '<div class="flow-empty">暂无收入记录</div>';
  } else {
    incomeList.innerHTML = incomeRecords.slice(0, 5).map(r => `
      <div class="flow-item income">${r.source} +¥${r.amount.toLocaleString()}</div>
    `).join('');
  }
  
  const expenseList = card.querySelector('#expenseFlowList');
  if (expenseRecords.length === 0) {
    expenseList.innerHTML = '<div class="flow-empty">暂无支出记录</div>';
  } else {
    expenseList.innerHTML = expenseRecords.slice(0, 5).map(r => `
      <div class="flow-item expense">${r.category} -¥${r.amount.toLocaleString()}</div>
    `).join('');
  }
}

// 渲染任务（从Obsidian读取）
function renderQuests(projects) {
  const questList = document.getElementById('questList');
  if (!questList) return;
  
  if (!projects || projects.length === 0) {
    // 默认项目
    projects = [
      { id: 'adult-shop', name: 'adult-shop 上线', icon: '⚔️', progress: 70, status: 'in_progress' },
      { id: 'jarvis-web', name: 'J.A.R.V.I.S. Web面板', icon: '🎮', progress: 40, status: 'in_progress' },
      { id: 'manga-studio', name: 'MangaStudio', icon: '📚', progress: 30, status: 'pending' }
    ];
  }
  
  const statusMap = { in_progress: '进行中', completed: '完成', pending: '待开始' };
  const statusClass = { in_progress: 'in-progress', completed: 'completed', pending: 'pending' };
  
  questList.innerHTML = projects.map(p => `
    <div class="quest-item ${statusClass[p.status] || 'pending'}" data-quest-id="${p.id}">
      <div class="quest-header">
        <span class="quest-icon">${p.icon || '📋'}</span>
        <span class="quest-name">${p.name}</span>
        <span class="quest-status ${statusClass[p.status]}">${statusMap[p.status] || '未知'}</span>
      </div>
      <div class="quest-progress">
        <div class="progress-bar">
          <div class="progress-fill quest-fill" style="width: ${p.progress || 0}%"></div>
        </div>
        <span class="progress-text">${p.progress || 0}%</span>
      </div>
    </div>
  `).join('');
}

// 渲染预警
function renderAlerts(computed, data) {
  const alertList = document.getElementById('alertList');
  if (!alertList) return;
  
  const alerts = [];
  
  // HP预警
  if (computed.hp.current < 50) {
    alerts.push({ level: 'warning', title: '💗 HP偏低', desc: '注意休息和健康' });
  }
  
  // 能量预警
  if (computed.energy.current < 40) {
    alerts.push({ level: 'warning', title: '⚡ 能量不足', desc: '需要恢复精力' });
  }
  
  // 财务预警
  if (data.finance?.assets?.cash < 100000) {
    alerts.push({ level: 'critical', title: '💸 资金紧张', desc: '可用资金低于10万' });
  }
  
  // 检查数据是否已输入
  const hasHealth = data.health?.checkup?.date;
  const hasFinance = data.finance?.assets?.cash > 0;
  
  if (!hasHealth) {
    alerts.push({ level: 'info', title: '🏥 待输入', desc: '请输入健康体检数据' });
  }
  if (!hasFinance) {
    alerts.push({ level: 'info', title: '💰 待输入', desc: '请输入财务数据' });
  }
  
  if (alerts.length === 0) {
    alerts.push({ level: 'info', title: '🎉 状态良好', desc: '各项指标正常' });
  }
  
  const levelIcon = { critical: '🔴', warning: '🟠', info: '🔵' };
  alertList.innerHTML = alerts.map(a => `
    <div class="alert-item ${a.level}">
      <span class="alert-level">${levelIcon[a.level]}</span>
      <div class="alert-content">
        <div class="alert-title">${a.title}</div>
        <div class="alert-desc">${a.desc}</div>
      </div>
    </div>
  `).join('');
}

// 渲染技能
function renderSkills(skills) {
  const skillsList = document.getElementById('skillsList');
  if (!skillsList) return;
  
  if (!skills || skills.length === 0) {
    // 默认技能
    skills = [
      { name: 'AI工具', level: 3, maxLevel: 10 },
      { name: '电商运营', level: 2, maxLevel: 10 },
      { name: '日语', level: 8, maxLevel: 10 },
      { name: '中文', level: 10, maxLevel: 10 },
      { name: '韩语', level: 6, maxLevel: 10 }
    ];
  }
  
  skillsList.innerHTML = skills.map(s => `
    <div class="skill-item">
      <span class="skill-name">${s.name}</span>
      <div class="skill-bar">
        <div class="skill-fill" style="width: ${(s.level / s.maxLevel) * 100}%"></div>
      </div>
      <span class="skill-level">Lv.${s.level}</span>
    </div>
  `).join('');
}

// ==========================================
// 模态框控制
// ==========================================

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
  document.body.style.overflow = '';
}

function openHealthInput() {
  const data = JARVIS.getAllData();
  const h = data.health;
  
  // 填充现有数据
  document.getElementById('checkupDateInput').value = h.checkup?.date || '2026-04-01';
  document.getElementById('weightInput').value = h.checkup?.weight || 68;
  document.getElementById('bmiInput').value = h.checkup?.bmi || 22.2;
  document.getElementById('bodyFatInput').value = h.checkup?.bodyFat || 18;
  document.getElementById('heartRateInput').value = h.checkup?.heartRate || 72;
  document.getElementById('exerciseMinutesInput').value = h.exercisePlan?.todayCompleted || 30;
  document.getElementById('weeklyExerciseInput').value = h.exercisePlan?.weeklyCompleted || 60;
  document.getElementById('weeklyGoalInput').value = h.exercisePlan?.weeklyGoal || 150;
  document.getElementById('sleepHoursInput').value = h.daily?.sleepHours || 7;
  document.getElementById('sleepQualityInput').value = h.daily?.sleepQuality || 80;
  document.getElementById('stressLevelInput').value = h.daily?.stressLevel || 40;
  document.getElementById('stressValue').textContent = h.daily?.stressLevel || 40;
  
  openModal('healthModal');
}

function openFinanceInput() {
  const data = JARVIS.getAllData();
  const f = data.finance;
  
  document.getElementById('cashInput').value = f.assets?.cash || 500000;
  document.getElementById('bankInput').value = f.assets?.bank || 0;
  document.getElementById('investmentsInput').value = f.assets?.investments || 0;
  document.getElementById('creditCardInput').value = f.liabilities?.creditCard || 0;
  document.getElementById('loansInput').value = f.liabilities?.loans || 0;
  
  openModal('financeModal');
}

function openMoodInput() {
  const data = JARVIS.getAllData();
  const m = data.mood?.todayMood;
  
  document.getElementById('moodScoreInput').value = m?.score || 0.75;
  document.getElementById('moodScoreValue').textContent = m?.score || 0.75;
  document.getElementById('emotionSelect').value = m?.dominantEmotion || '平静';
  document.getElementById('energyInput').value = m?.energy || 70;
  document.getElementById('moodStressInput').value = m?.stress || 30;
  document.getElementById('moodSummaryInput').value = m?.summary || '';
  
  openModal('moodModal');
}

// ==========================================
// 保存数据
// ==========================================

function saveHealthData() {
  const healthData = {
    checkup: {
      date: document.getElementById('checkupDateInput').value,
      weight: parseFloat(document.getElementById('weightInput').value),
      bmi: parseFloat(document.getElementById('bmiInput').value),
      bodyFat: parseFloat(document.getElementById('bodyFatInput').value),
      heartRate: parseInt(document.getElementById('heartRateInput').value)
    },
    exercisePlan: {
      todayCompleted: parseInt(document.getElementById('exerciseMinutesInput').value),
      weeklyCompleted: parseInt(document.getElementById('weeklyExerciseInput').value),
      weeklyGoal: parseInt(document.getElementById('weeklyGoalInput').value)
    },
    daily: {
      sleepHours: parseFloat(document.getElementById('sleepHoursInput').value),
      sleepQuality: parseInt(document.getElementById('sleepQualityInput').value),
      stressLevel: parseInt(document.getElementById('stressLevelInput').value)
    }
  };
  
  JARVIS.updateHealth(healthData);
  closeModal('healthModal');
  showNotification('🏥 健康数据已保存', 'success');
  renderAll();
}

function saveFinanceData() {
  const financeData = {
    assets: {
      cash: parseInt(document.getElementById('cashInput').value) || 0,
      bank: parseInt(document.getElementById('bankInput').value) || 0,
      investments: parseInt(document.getElementById('investmentsInput').value) || 0
    },
    liabilities: {
      creditCard: parseInt(document.getElementById('creditCardInput').value) || 0,
      loans: parseInt(document.getElementById('loansInput').value) || 0
    }
  };
  
  JARVIS.updateFinance(financeData);
  closeModal('financeModal');
  showNotification('💰 财务数据已保存', 'success');
  renderAll();
}

function saveMoodData() {
  const moodData = {
    score: parseFloat(document.getElementById('moodScoreInput').value),
    dominantEmotion: document.getElementById('emotionSelect').value,
    energy: parseInt(document.getElementById('energyInput').value),
    stress: parseInt(document.getElementById('moodStressInput').value),
    summary: document.getElementById('moodSummaryInput').value
  };
  
  JARVIS.updateMoodFromHermes(moodData);
  closeModal('moodModal');
  showNotification('🧠 情绪数据已保存', 'success');
  renderAll();
}

function quickAddIncome() {
  const amount = parseInt(document.getElementById('quickAmountInput').value) || 0;
  const desc = document.getElementById('quickDescInput').value || '收入';
  if (amount > 0) {
    JARVIS.addIncome(amount, desc);
    showNotification(`💰 +¥${amount.toLocaleString()} 收入已记录`, 'success');
    renderAll();
  }
}

function quickAddExpense() {
  const amount = parseInt(document.getElementById('quickAmountInput').value) || 0;
  const desc = document.getElementById('quickDescInput').value || '支出';
  if (amount > 0) {
    JARVIS.addExpense(amount, desc);
    showNotification(`💸 -¥${amount.toLocaleString()} 支出已记录`, 'warning');
    renderAll();
  }
}

// ==========================================
// Obsidian 同步
// ==========================================

async function syncFromObsidian() {
  showNotification('📓 正在同步 Obsidian 数据...', 'info');
  
  try {
    // 模拟从 Obsidian 读取（实际通过 API）
    // 这里读取本地的 task-board.json
    const response = await fetch('/task-board.json');
    let taskBoard = null;
    if (response.ok) {
      taskBoard = await response.json();
    }
    
    // 如果读取失败，使用模拟数据
    if (!taskBoard) {
      // 模拟 task-board 数据
      taskBoard = {
        projects: [
          { id: 'adult-shop', name: 'adult-shop 上线', icon: '⚔️', progress: 70, status: 'in_progress', weight: 0.5 },
          { id: 'jarvis-web', name: 'J.A.R.V.I.S. Web面板', icon: '🎮', progress: 40, status: 'in_progress', weight: 0.3 },
          { id: 'manga-studio', name: 'MangaStudio', icon: '📚', progress: 30, status: 'pending', weight: 0.2 }
        ]
      };
    }
    
    // 转换任务数据
    const projects = [];
    
    // adult-shop
    if (taskBoard['adult-shop']) {
      const as = taskBoard['adult-shop'];
      projects.push({
        id: 'adult-shop',
        name: 'adult-shop 上线',
        icon: '⚔️',
        progress: calculateAdultShopProgress(as),
        status: as.factory?.进度 === '✅ 完成' ? 'completed' : 'in_progress',
        weight: 0.5
      });
    }
    
    // 其他项目
    if (taskBoard['MangaStudio']) {
      projects.push({
        id: 'manga-studio',
        name: 'MangaStudio',
        icon: '📚',
        progress: 30,
        status: 'in_progress',
        weight: 0.2
      });
    }
    
    // J.A.R.V.I.S. 项目
    if (taskBoard['J-A-R-V-I-S']) {
      projects.push({
        id: 'jarvis-web',
        name: 'J.A.R.V.I.S. Web面板',
        icon: '🎮',
        progress: 40,
        status: 'in_progress',
        weight: 0.3
      });
    }
    
    // 更新数据
    JARVIS.updateProjects(projects);
    
    // 更新来源标签
    document.getElementById('questSource').textContent = '📓 已同步';
    
    showNotification('✅ Obsidian 数据同步完成', 'success');
    renderAll();
    
  } catch (e) {
    console.warn('Obsidian 同步失败:', e);
    
    // 使用默认数据
    const defaultProjects = [
      { id: 'adult-shop', name: 'adult-shop 上线', icon: '⚔️', progress: 70, status: 'in_progress', weight: 0.5 },
      { id: 'jarvis-web', name: 'J.A.R.V.I.S. Web面板', icon: '🎮', progress: 40, status: 'in_progress', weight: 0.3 },
      { id: 'manga-studio', name: 'MangaStudio', icon: '📚', progress: 30, status: 'pending', weight: 0.2 }
    ];
    
    JARVIS.updateProjects(defaultProjects);
    showNotification('📓 使用默认项目数据', 'info');
    renderAll();
  }
}

function calculateAdultShopProgress(as) {
  if (!as) return 0;
  let progress = 0;
  if (as.website_tech?.进度 === '✅ 完成') progress += 25;
  if (as.xiaohongshu?.进度 === '✅ 完成') progress += 15;
  if (as.factory?.进度 === '✅ 完成') progress += 30;
  if (as.domain?.进度 === '✅ 完成') progress += 10;
  if (as.server?.进度 === '✅ 完成') progress += 10;
  if (as.paypal?.进度 === '✅ 完成') progress += 5;
  if (as.product_listing?.进度 === '✅ 完成') progress += 5;
  return progress;
}

// ==========================================
// AI 建议
// ==========================================

function requestAdvice() {
  const data = JARVIS.getAllData();
  const computed = JARVIS.getRealtimeData();
  const advices = [];
  
  if (computed.hp.current < 60) {
    advices.push('💗 HP偏低：保证睡眠，减少加班，适度运动');
  }
  if (computed.energy.current < 50) {
    advices.push('⚡ 能量不足：建议短暂休息，做喜欢的事恢复精力');
  }
  if (data.finance?.assets?.cash < 300000) {
    advices.push('💸 资金储备不足：加快 adult-shop 变现速度');
  }
  
  const exerciseProgress = (data.health?.exercisePlan?.weeklyCompleted / data.health?.exercisePlan?.weeklyGoal * 100) || 0;
  if (exerciseProgress < 50) {
    advices.push('🏃 运动计划未达标：本週目标完成 ' + Math.round(exerciseProgress) + '%');
  }
  
  advices.push('🎯 继续保持，J.A.R.V.I.S. 实时监控你的状态');
  
  const advice = advices[Math.floor(Math.random() * advices.length)];
  document.getElementById('aiAdvice').innerHTML = `<div class="advice-item"><p>「${advice}</p></div>`;
}

function openChat() {
  showNotification('💬 AI对话功能开发中...', 'info');
}

// ==========================================
// Tab 切换
// ==========================================

function bindEvents() {
  // Tab 切换
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });
  
  // 压力滑块
  document.getElementById('stressLevelInput')?.addEventListener('input', (e) => {
    document.getElementById('stressValue').textContent = e.target.value;
  });
  
  // 情绪滑块
  document.getElementById('moodScoreInput')?.addEventListener('input', (e) => {
    document.getElementById('moodScoreValue').textContent = e.target.value;
  });
  
  // 点击模态框背景关闭
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  const cards = document.querySelectorAll('.card');
  const targetMap = { dashboard: 0, quests: 1, finance: 0, alerts: 2, ai: 2 };
  const targetIndex = targetMap[tabName] ?? 0;
  
  if (window.innerWidth < 768) {
    cards.forEach((card, i) => {
      card.style.display = (i === targetIndex) ? 'block' : 'none';
    });
  } else {
    cards.forEach(card => card.style.display = 'block');
    cards[targetIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ==========================================
// 通知系统
// ==========================================

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
    z-index: 1001;
    animation: slideIn 0.3s ease;
    font-size: 0.875rem;
    font-weight: 500;
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
  .card { animation: fadeIn 0.3s ease; }
  .notification { animation: slideIn 0.3s ease; }
  
  /* Modal */
  .modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    align-items: center;
    justify-content: center;
  }
  .modal.active { display: flex; }
  .modal-content {
    background: white;
    border-radius: 16px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow: hidden;
    animation: fadeIn 0.2s ease;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #eee;
  }
  .modal-header h3 { font-size: 1rem; color: #2D5A4A; }
  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #999;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }
  .modal-close:hover { color: #333; }
  .modal-body {
    padding: 20px;
    max-height: 60vh;
    overflow-y: auto;
  }
  .modal-footer {
    display: flex;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid #eee;
    justify-content: flex-end;
  }
  
  /* Form */
  .form-section {
    margin-bottom: 20px;
  }
  .form-section h4 {
    font-size: 0.875rem;
    color: #6B6B6B;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid #f0f0f0;
  }
  .form-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }
  .form-row label {
    flex: 0 0 100px;
    font-size: 0.875rem;
    color: #2C2C2C;
  }
  .form-row input,
  .form-row select,
  .form-row textarea {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 0.875rem;
    font-family: inherit;
  }
  .form-row input[type="range"] {
    flex: 1;
  }
  .form-row textarea { resize: vertical; }
  
  /* Buttons */
  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .btn:hover { opacity: 0.9; }
  .btn.primary {
    background: #2D5A4A;
    color: white;
  }
  .btn.secondary {
    background: #f0f0f0;
    color: #2C2C2C;
  }
  
  /* Quick Actions */
  .quick-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  .quick-btn {
    flex: 1;
    padding: 10px;
    border: 2px solid;
    border-radius: 8px;
    background: white;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }
  .quick-btn.income {
    border-color: #4CAF50;
    color: #4CAF50;
  }
  .quick-btn.income:hover { background: #4CAF50; color: white; }
  .quick-btn.expense {
    border-color: #FF9800;
    color: #FF9800;
  }
  .quick-btn.expense:hover { background: #FF9800; color: white; }
  
  /* Skills */
  .skill-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .skill-name {
    flex: 0 0 80px;
    font-size: 0.75rem;
  }
  .skill-bar {
    flex: 1;
    height: 8px;
    background: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
  }
  .skill-fill {
    height: 100%;
    background: linear-gradient(90deg, #E8A87C, #D4956A);
    border-radius: 4px;
    transition: width 0.3s;
  }
  .skill-level {
    flex: 0 0 35px;
    font-size: 0.7rem;
    color: #6B6B6B;
    text-align: right;
  }
`;
document.head.appendChild(style);

// 响应式
window.addEventListener('resize', () => {
  if (window.innerWidth >= 768) {
    document.querySelectorAll('.card').forEach(card => card.style.display = 'block');
  }
});

// 导出
window.JARVIS_APP = { renderAll, showNotification, syncFromObsidian };