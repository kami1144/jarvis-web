/**
 * J.A.R.V.I.S. App Logic
 * 交互逻辑、UI更新、事件处理
 */

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // 设置当前日期
  setCurrentDate();
  
  // 加载数据并渲染
  const data = JARVIS.loadData();
  renderAll(data);
  
  // 绑定事件
  bindEvents();
  
  // 启动动画效果
  initAnimations();
  
  console.log('🎮 J.A.R.V.I.S. 初始化完成');
}

// 设置当前日期
function setCurrentDate() {
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  const dateStr = now.toLocaleDateString('ja-JP', options);
  document.getElementById('currentDate').textContent = dateStr;
}

// 渲染所有模块
function renderAll(data) {
  renderCharacter(data.character);
  renderFinance(data.finance);
  renderQuests(data.quests);
  renderAlerts(data.alerts);
  renderRadar(data.radar);
  renderAIAdvice(data);
}

// 渲染角色卡片
function renderCharacter(character) {
  // 更新等级
  document.querySelector('.character-name').textContent = character.name;
  document.querySelector('.character-type').textContent = character.type;
  
  // 更新进度条
  const hpPercent = (character.hp.current / character.hp.max) * 100;
  const energyPercent = (character.energy.current / character.energy.max) * 100;
  const goldPercent = (character.gold.current / character.gold.max) * 100;
  const expPercent = (character.exp.current / character.exp.max) * 100;
  
  document.querySelector('.hp-fill').style.width = `${hpPercent}%`;
  document.querySelector('.energy-fill').style.width = `${energyPercent}%`;
  document.querySelector('.gold-fill').style.width = `${goldPercent}%`;
  document.querySelector('.exp-fill').style.width = `${expPercent}%`;
  
  // 更新数值
  const stats = document.querySelectorAll('.stat');
  stats[0].querySelector('.stat-value').textContent = `${character.hp.current}/${character.hp.max}`;
  stats[1].querySelector('.stat-value').textContent = `${character.energy.current}/${character.energy.max}`;
  stats[2].querySelector('.stat-value').textContent = `¥${character.gold.current.toLocaleString()} / ¥${(character.gold.max / 10000).toFixed(0)}万`;
  stats[3].querySelector('.stat-value').textContent = `Lv.${character.level}`;
}

// 渲染财务仪表盘
function renderFinance(finance) {
  const monthlyIncomeEl = document.getElementById('monthlyIncome');
  const monthlyExpenseEl = document.getElementById('monthlyExpense');
  const availableFundEl = document.getElementById('availableFund');
  
  monthlyIncomeEl.textContent = `¥${finance.monthlyIncome.toLocaleString()}`;
  monthlyExpenseEl.textContent = `¥${finance.monthlyExpense.toLocaleString()}`;
  availableFundEl.textContent = `¥${finance.availableFund.toLocaleString()}`;
  
  // 格式化
  if (finance.monthlyExpense >= 10000) {
    monthlyExpenseEl.textContent = `¥${(finance.monthlyExpense / 10000).toFixed(0)}万`;
  }
  if (finance.availableFund >= 10000) {
    availableFundEl.textContent = `¥${(finance.availableFund / 10000).toFixed(0)}万`;
  }
}

// 渲染任务列表
function renderQuests(quests) {
  const questList = document.getElementById('questList');
  if (!questList) return;
  
  questList.innerHTML = quests.map(quest => {
    const subtasksHtml = quest.subtasks && quest.subtasks.length > 0
      ? `<div class="quest-subtasks">
          ${quest.subtasks.map(st => {
            let cls = 'pending';
            if (st.completed) cls = 'completed';
            else if (st.inProgress) cls = 'in-progress';
            const icon = st.completed ? '✓' : st.inProgress ? '◐' : '○';
            return `<span class="subtask ${cls}">${icon} ${st.name}</span>`;
          }).join('')}
         </div>`
      : '';
    
    const statusLabel = {
      'pending': '待开始',
      'in_progress': '进行中',
      'completed': '完成'
    };
    
    const statusClass = {
      'pending': 'pending',
      'in_progress': 'in-progress',
      'completed': 'completed'
    };
    
    return `
      <div class="quest-item ${statusClass[quest.status] || 'pending'}" data-quest-id="${quest.id}">
        <div class="quest-header">
          <span class="quest-icon">${quest.icon}</span>
          <span class="quest-name">${quest.name}</span>
          <span class="quest-status ${statusClass[quest.status]}">${statusLabel[quest.status] || '未知'}</span>
        </div>
        <div class="quest-progress">
          <div class="progress-bar">
            <div class="progress-fill quest-fill" style="width: ${quest.progress}%"></div>
          </div>
          <span class="progress-text">${quest.progress}%</span>
        </div>
        ${subtasksHtml}
      </div>
    `;
  }).join('');
}

// 渲染预警列表
function renderAlerts(alerts) {
  const alertList = document.getElementById('alertList');
  if (!alertList) return;
  
  const activeAlerts = alerts.filter(a => !a.dismissed);
  
  if (activeAlerts.length === 0) {
    alertList.innerHTML = '<p style="text-align:center;color:#6B6B6B;padding:20px;">🎉 没有待处理预警</p>';
    return;
  }
  
  alertList.innerHTML = activeAlerts.map(alert => `
    <div class="alert-item ${alert.level}" data-alert-id="${alert.id}">
      <span class="alert-level">${alert.level === 'critical' ? '🔴' : alert.level === 'warning' ? '🟠' : '🔵'}</span>
      <div class="alert-content">
        <div class="alert-title">${alert.title}</div>
        <div class="alert-desc">${alert.description}</div>
      </div>
      <button class="alert-dismiss" onclick="dismissAlert('${alert.id}')" title="忽略">×</button>
    </div>
  `).join('');
}

// 渲染雷达
function renderRadar(radar) {
  const blips = document.querySelector('.radar-blips');
  if (!blips) return;
  
  blips.innerHTML = radar.opportunities.map(opp => `
    <div class="blip" style="--angle: ${opp.angle}deg; --dist: ${opp.distance}%;" title="${opp.name}">
      ${opp.emoji}
    </div>
  `).join('');
  
  // 更新图例
  const legend = document.querySelector('.radar-legend');
  if (legend) {
    legend.innerHTML = radar.opportunities.map(opp => 
      `<span class="legend-item">${opp.emoji} ${opp.name}</span>`
    ).join('');
  }
}

// 渲染AI建议
function renderAIAdvice(data) {
  const adviceEl = document.getElementById('aiAdvice');
  if (!adviceEl) return;
  
  const advice = data.aiAdvices[0]; // 使用第一条
  adviceEl.innerHTML = `<div class="advice-item"><p>「${advice}</p></div>`;
}

// 绑定事件
function bindEvents() {
  // Tab切换
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });
  
  // Quest子任务点击
  const questList = document.getElementById('questList');
  if (questList) {
    questList.addEventListener('click', (e) => {
      const subtask = e.target.closest('.subtask');
      if (subtask && !subtask.classList.contains('completed')) {
        const questItem = subtask.closest('.quest-item');
        const questId = questItem.dataset.questId;
        const subtaskName = subtask.textContent.replace(/^[✓◐○]\s*/, '').trim();
        
        // 找到subtask id
        const data = JARVIS.loadData();
        const quest = data.quests.find(q => q.id === questId);
        if (quest) {
          const subtaskObj = quest.subtasks.find(st => st.name === subtaskName);
          if (subtaskObj) {
            JARVIS.completeSubtask(questId, subtaskObj.id);
            renderAll(JARVIS.loadData());
            showNotification('✅ 任务完成！', 'success');
          }
        }
      }
    });
  }
  
  // 忽略预警
  window.dismissAlert = function(alertId) {
    JARVIS.dismissAlert(alertId);
    renderAlerts(JARVIS.loadData().alerts);
    showNotification('预警已忽略', 'info');
  };
  
  // AI建议按钮
  window.requestAdvice = function() {
    const advice = JARVIS.getRandomAdvice();
    const adviceEl = document.getElementById('aiAdvice');
    if (adviceEl) {
      adviceEl.innerHTML = `<div class="advice-item"><p>「${advice}</p></div>`;
      // 添加动画效果
      adviceEl.style.animation = 'none';
      adviceEl.offsetHeight; // 触发重排
      adviceEl.style.animation = 'fadeIn 0.3s ease';
    }
  };
  
  // AI对话按钮
  window.openChat = function() {
    showNotification('💬 AI对话功能开发中...', 'info');
  };
}

// Tab切换
function switchTab(tabName) {
  // 更新tab状态
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // 滚动到对应区域（简化处理）
  const cardMap = {
    'dashboard': 0,
    'quests': 1,
    'finance': 0,
    'alerts': 2,
    'ai': 2
  };
  
  // 简单的移动端Tab切换
  const cards = document.querySelectorAll('.card');
  const targetIndex = cardMap[tabName];
  
  cards.forEach((card, i) => {
    if (window.innerWidth < 768) {
      // 移动端：只显示对应卡片
      card.style.display = (i === targetIndex) ? 'block' : 'none';
    } else {
      card.style.display = 'block';
    }
  });
  
  if (window.innerWidth >= 768) {
    // 桌面端滚动
    cards[targetIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// 通知系统
function showNotification(message, type = 'info') {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // 添加样式
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  // 3秒后移除
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// 动画效果
function initAnimations() {
  // 添加动画样式
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
    .alert-dismiss {
      background: none;
      border: none;
      font-size: 1.2rem;
      color: #999;
      cursor: pointer;
      padding: 0 4px;
    }
    .alert-dismiss:hover {
      color: #333;
    }
  `;
  document.head.appendChild(style);
  
  // 卡片入场动画
  const cards = document.querySelectorAll('.card');
  cards.forEach((card, i) => {
    card.style.animationDelay = `${i * 0.05}s`;
  });
}

// 响应式处理
window.addEventListener('resize', () => {
  if (window.innerWidth >= 768) {
    document.querySelectorAll('.card').forEach(card => {
      card.style.display = 'block';
    });
  }
});

// 导出给全局
window.JARVIS_APP = {
  renderAll,
  showNotification,
  switchTab
};