/**
 * J.A.R.V.I.S. Guidance Cards UI Component v1.0
 * 引导卡片UI组件
 */

// ==========================================
// 渲染引导卡片
// ==========================================

function renderGuidanceCards() {
  const container = document.getElementById('guidanceCardsContainer');
  if (!container) return;

  // 获取活跃卡片
  const cards = GuidanceEngine.getActiveGuidanceCards();

  if (cards.length === 0) {
    container.innerHTML = '';
    return;
  }

  // 渲染卡片列表
  container.innerHTML = cards.map(card => `
    <div class="guidance-card" data-id="${card.id}" style="border-left-color: ${card.display.color};">
      <div class="guidance-card-header">
        <span class="guidance-card-badge" style="background: ${card.display.color};">${card.display.title}</span>
        <button class="guidance-card-close" onclick="handleGuidanceDismiss('${card.id}')">×</button>
      </div>
      <div class="guidance-card-body">
        <div class="guidance-card-description">${card.data.description}</div>
        <div class="guidance-card-emotion">💭 ${card.display.emotion_trigger}</div>
        <div class="guidance-card-suggestion">💡 ${card.display.suggestion}</div>
      </div>
      <div class="guidance-card-actions">
        <button class="guidance-btn guidance-btn-primary"
          onclick="handleGuidanceCreateTask('${card.id}')">
          ${card.display.task_button}
        </button>
        <button class="guidance-btn guidance-btn-secondary"
          onclick="handleGuidanceDismiss('${card.id}')">
          ${card.display.dismiss_button}
        </button>
      </div>
    </div>
  `).join('');

  // 显示容器
  container.style.display = 'block';
}

// ==========================================
// 处理创建任务
// ==========================================

function handleGuidanceCreateTask(cardId) {
  const task = GuidanceEngine.createTaskFromGuidance(cardId);
  if (task) {
    showNotification(`✅ 任务「${task.title}」已创建`, 'success');
    renderGuidanceCards();
    // 刷新任务列表
    if (typeof renderTasks === 'function') {
      renderTasks();
    }
  }
}

// ==========================================
// 处理忽略卡片
// ==========================================

function handleGuidanceDismiss(cardId) {
  GuidanceEngine.dismissGuidanceCard(cardId);
  renderGuidanceCards();
  showNotification('ℹ️ 已推迟提醒', 'info');
}

// ==========================================
// 初始化引导系统
// ==========================================

function initGuidanceSystem() {
  // 运行每日检查
  GuidanceEngine.runDailyGuidanceCheck();

  // 渲染活跃卡片
  renderGuidanceCards();
}

// ==========================================
// 注入引导卡片容器HTML（到页面）
// ==========================================

function injectGuidanceContainer() {
  const container = document.getElementById('guidanceCardsContainer');
  if (!container) {
    // 创建一个容器
    const wrapper = document.createElement('div');
    wrapper.id = 'guidanceCardsContainer';
    wrapper.className = 'guidance-cards-wrapper';
    wrapper.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      max-width: 360px;
      display: none;
    `;
    document.body.appendChild(wrapper);
  }
}

// ==========================================
// 自动初始化
// ==========================================

// 如果DOM已加载，直接初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectGuidanceContainer();
    initGuidanceSystem();
  });
} else {
  // DOM已加载
  setTimeout(() => {
    injectGuidanceContainer();
    initGuidanceSystem();
  }, 100);
}

// 导出到全局
window.GuidanceCards = {
  renderGuidanceCards,
  handleGuidanceCreateTask,
  handleGuidanceDismiss,
  initGuidanceSystem
};