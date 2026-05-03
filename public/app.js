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
  renderAll(); // async but non-blocking
  startRealtimeUpdates();
  bindEvents();
  console.log('🎮 J.A.R.V.I.S. v3 初始化完成 - 手动输入 + Obsidian联动');
}

function startRealtimeUpdates() {
  renderAll(); // initial call
  refreshTimer = setInterval(() => renderAll(), REFRESH_INTERVAL);
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

// 缓存同步数据
let syncCache = null;

async function loadSyncData() {
  if (syncCache) return syncCache;
  try {
    const res = await fetch('/jARVIS-sync.json?t=' + Date.now());
    if (res.ok) {
      syncCache = await res.json();
      return syncCache;
    }
  } catch (e) {}
  return null;
}

async function renderAll() {
  setCurrentDate();
  const data = JARVIS.getAllData();
  const computed = JARVIS.getRealtimeData();

  // 异步加载同步数据
  const syncData = await loadSyncData();

  renderCharacter(computed, data);
  renderFamily(data.profile);
  renderMindModel(data.mindModel);
  renderQuests(syncData?.projects || null);
  renderRadar(syncData?.projects || data.opportunities);
  renderAlerts(computed, data);
  renderSkills(data.skills);
  renderEnvironment();
  renderDailySchedule();
  renderSignals();
  initAIAdvice();
  updateMeaningBadge();
}

// 渲染家庭成员
function renderFamily(profile) {
  const familyList = document.getElementById('familyList');
  if (!familyList || !profile?.family) return;
  
  familyList.innerHTML = profile.family.map(f => {
    const relationIcon = {
      '父亲': '👴', '母亲': '👵', '女儿': '👧', '儿子': '👦'
    }[f.relation] || '👤';
    
    return `
      <div class="family-tag">
        <span class="relation">${relationIcon} ${f.relation}</span>
        ${f.name ? `<span class="name">${f.name}</span>` : ''}
        <span class="age">${f.age}岁</span>
        ${f.note ? `<span class="note">${f.note}</span>` : ''}
      </div>
    `;
  }).join('');
}

// 渲染角色卡片
function renderCharacter(computed, data) {
  const card = document.querySelector('.character-card');
  if (!card) return;

  // 基础信息（从 profile.user 读取）
  card.querySelector('.character-name').textContent = data.profile?.user?.name || 'Kim Kami';
  card.querySelector('.character-type').textContent = data.profile?.user?.type || '探索型大脑';

  // HP
  const hpFill = card.querySelector('.hp-fill');
  hpFill.style.width = `${computed.hp.current}%`;
  hpFill.style.background = getHPColor(computed.hp.current);
  card.querySelector('#hpValue').textContent = `${computed.hp.current}/${computed.hp.max}`;

  // 能量（真实能量值）
  const energyFill = card.querySelector('.energy-fill');
  energyFill.style.width = `${computed.energy.current}%`;
  energyFill.style.background = getEnergyColor(computed.energy.current);
  card.querySelector('#energyValue').textContent = `${computed.energy.current}/${computed.energy.max}`;

  // 金币（财务净资产）
  const goldFill = card.querySelector('.gold-fill');
  const financeNetWorth = FinanceData.getNetWorth();
  const goldPercent = Math.min(100, Math.max(0, financeNetWorth / 1000000 * 100));
  goldFill.style.width = `${goldPercent}%`;
  goldFill.style.background = 'linear-gradient(90deg, #FFD700, #FFA500)';
  card.querySelector('#goldValue').textContent = `${(financeNetWorth / 10000).toFixed(0)}万`;

  // 经验
  const expFill = card.querySelector('.exp-fill');
  expFill.style.width = `${computed.exp.current}%`;
  card.querySelector('#expValue').textContent = `Lv.${computed.level}`;

  // 数据来源显示（修正）
  // 体检日期
  card.querySelector('#checkupDate').textContent = data.health?.checkup?.date?.slice(5) || '待输入';
  // 净资产（显示真实财务净资产，单位万日元）
  card.querySelector('#netWorth').textContent = `${(financeNetWorth / 10000).toFixed(0)}万`;
  // 情绪（显示真实情绪）
  card.querySelector('#moodStatus').textContent = data.mood?.todayMood?.dominantEmotion || '待分析';
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

// 折叠状态跟踪
const mindCaseCollapse = {
  current: false, // false = 展开
  history: true,  // true = 折叠
  historyItems: {} // idx -> true(folded)
};

// 渲染思维模式仪表盘（折叠式）
function renderMindModel(mindData) {
  const card = document.querySelector('.mind-model-card');
  if (!card) return;

  const today = mindData?.today || MindModelData.today;
  const cc = today.currentCase;
  const cases = mindData?.cases || [];

  // 更新得分
  const scoreEl = card.querySelector('.mind-score-value');
  if (scoreEl) {
    scoreEl.textContent = today.score || 75;
  }

  const caseContainer = card.querySelector('.mind-case-narrative');
  if (!caseContainer) return;

  // 当前案例完成度
  const exercises = cc?.exercises || [];
  const completedCount = exercises.filter(e => e.completed).length;
  const allDone = exercises.length > 0 && completedCount === exercises.length;

  caseContainer.innerHTML = `
    <!-- 当前案例（展开状态） -->
    <div class="mind-case-item current-case" data-case-id="current">
      <div class="case-header" onclick="toggleCase('current')">
        <div class="case-meta">
          <span class="case-badge current-badge">📌 进行中</span>
          <span class="case-date">${today.date || new Date().toISOString().split('T')[0]}</span>
        </div>
        <div class="case-summary">
          <span class="case-preview">${cc?.originalThought?.slice(0, 20) || ''}...</span>
          <span class="case-progress">${completedCount}/${exercises.length} 完成</span>
        </div>
        <span class="case-toggle">${mindCaseCollapse.current ? '▶' : '▼'}</span>
      </div>
      <div class="case-detail" id="case-detail-current" style="display:${mindCaseCollapse.current ? 'none' : 'block'};">
        ${cc ? `
        <div class="case-section">
          <div class="case-label">💭 原来的思维</div>
          <div class="case-content original-thought">"${cc.originalThought}"</div>
        </div>
        <div class="case-section">
          <div class="case-label">🔍 识别出的漏洞</div>
          <div class="case-content identified-flaw">${cc.identifiedFlaw}</div>
        </div>
        <div class="case-section">
          <div class="case-label">✅ 正确替代</div>
          <div class="case-content correct-replacement">${cc.correctReplacement}</div>
        </div>
        <div class="case-section">
          <div class="case-label">🎯 练习题 ${allDone ? '<span class="all-done-tag">✅ 全部完成</span>' : ''}</div>
          <div class="exercises-list">
            ${exercises.map((e, i) => `
              <div class="exercise-item ${e.completed ? 'done' : ''}" data-id="${e.id}">
                <span class="exercise-check">${e.completed ? '☑️' : '⬜'}</span>
                <div class="exercise-info">
                  <span class="exercise-title">${i + 1}. ${e.title}</span>
                  <span class="exercise-desc">${e.desc}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : '<div class="case-empty">暂无进行中的案例</div>'}
      </div>
    </div>

    <!-- 历史案例列表（折叠） -->
    ${cases.length > 0 ? `
    <div class="mind-case-item archived-cases" data-case-id="history">
      <div class="case-header" onclick="toggleCase('history')">
        <div class="case-meta">
          <span class="case-badge history-badge">📋 历史案例</span>
          <span class="case-count">${cases.length}个</span>
        </div>
        <div class="case-summary">
          <span class="case-preview">最近：${cases[0]?.originalThought?.slice(0, 15) || ''}...</span>
        </div>
        <span class="case-toggle" id="toggle-history">${mindCaseCollapse.history ? '▶' : '▼'}</span>
      </div>
      <div class="case-detail" id="case-detail-history" style="display:${mindCaseCollapse.history ? 'none' : 'block'};">
        ${cases.map((c, idx) => `
          <div class="history-case-item" onclick="toggleHistoryCase(${idx})">
            <div class="history-case-header">
              <span class="history-case-date">${c.completedAt ? new Date(c.completedAt).toLocaleDateString('zh') : '未知'}</span>
              <span class="history-case-preview">${c.originalThought?.slice(0, 25) || ''}...</span>
              <span class="history-case-toggle" id="hist-toggle-${idx}">${mindCaseCollapse.historyItems[idx] !== false ? '▶' : '▼'}</span>
            </div>
            <div class="history-case-detail" id="hist-detail-${idx}" style="display:${mindCaseCollapse.historyItems[idx] !== false ? 'none' : 'block'};">
              <div class="case-section">
                <div class="case-label">💭 原来的思维</div>
                <div class="case-content">"${c.originalThought}"</div>
              </div>
              <div class="case-section">
                <div class="case-label">🔍 漏洞</div>
                <div class="case-content">${c.identifiedFlaw}</div>
              </div>
              <div class="case-section">
                <div class="case-label">✅ 正确替代</div>
                <div class="case-content">${c.correctReplacement}</div>
              </div>
              <div class="case-section">
                <div class="case-label">🎯 练习 ${(c.exercises || []).filter(e => e.completed).length}/${(c.exercises || []).length}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
  `;

  // 绑定练习点击事件（只针对当前案例）
  caseContainer.querySelectorAll('.current-case .exercise-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = item.dataset.id;
      const exercise = exercises.find(e => e.id === id);
      if (exercise) {
        exercise.completed = !exercise.completed;
        JARVIS.updateMindModel({ today: { currentCase: { exercises } } });
        renderMindModel(JARVIS.getAllData().mindModel);
      }
    });
  });
}

// 折叠/展开案例
function toggleCase(caseId) {
  if (caseId === 'current') {
    mindCaseCollapse.current = !mindCaseCollapse.current;
  } else if (caseId === 'history') {
    mindCaseCollapse.history = !mindCaseCollapse.history;
  }
  // 只重新渲染思维模块，不重新生成整个HTML
  renderMindModel(JARVIS.getAllData().mindModel);
}

// 折叠/展开历史案例
function toggleHistoryCase(idx) {
  // undefined/false -> true(折叠), false/true -> false(展开)
  mindCaseCollapse.historyItems[idx] = !mindCaseCollapse.historyItems[idx];
  // 只更新这个历史案例的显示状态
  const detail = document.getElementById(`hist-detail-${idx}`);
  const toggle = document.getElementById(`hist-toggle-${idx}`);
  if (detail) detail.style.display = mindCaseCollapse.historyItems[idx] ? 'none' : 'block';
  if (toggle) toggle.textContent = mindCaseCollapse.historyItems[idx] ? '▶' : '▼';
}

// 渲染任务（合并Obsidian项目和本地任务）
function renderQuests(projects) {
  const questList = document.getElementById('questList');
  if (!questList) return;

  // 加载本地任务
  const tasks = TaskTracker.loadTasks();

  // 默认项目（从Obsidian）
  const defaultProjects = [
    { id: 'adult-shop', name: 'adult-shop 上线', icon: '⚔️', progress: 70, status: 'in_progress', source: 'obsidian' },
    { id: 'jarvis-web', name: 'J.A.R.V.I.S. Web面板', icon: '🎮', progress: 40, status: 'in_progress', source: 'obsidian' },
    { id: 'manga-studio', name: 'MangaStudio', icon: '📚', progress: 30, status: 'pending', source: 'obsidian' }
  ];

  // 使用传入的projects或默认值
  const projectData = (projects && projects.length > 0) ? projects : defaultProjects;

  const statusMap = {
    in_progress: '进行中', active: '进行中', '进行中': '进行中',
    completed: '完成', 完成: '完成',
    pending: '待开始', 待开始: '待开始',
    blocked: '阻塞', 阻塞: '阻塞',
    planning: '规划中'
  };
  const statusClass = {
    in_progress: 'in-progress', active: 'in-progress',
    completed: 'completed',
    pending: 'pending',
    blocked: 'blocked',
    planning: 'pending'
  };

  // 合并项目和本地任务
  const allItems = [
    ...projectData.map(p => ({
      id: p.id,
      name: p.name,
      icon: p.icon || '📋',
      progress: p.progress || 0,
      status: p.status || 'pending',
      source: 'obsidian',
      project: p.id
    })),
    ...tasks.map(t => ({
      id: t.id,
      name: t.name,
      icon: { 'adult-shop': '⚔️', 'jarvis-web': '🎮', 'manga-studio': '📚', 'other': '📋' }[t.project] || '📋',
      progress: t.progress || 0,
      status: t.status || 'pending',
      source: 'local',
      project: t.project,
      owner: t.owner,
      deadline: t.deadline
    }))
  ];

  questList.innerHTML = allItems.map(item => `
    <div class="quest-item ${statusClass[item.status] || 'pending'}" data-quest-id="${item.id}" data-source="${item.source}">
      <div class="quest-header">
        <span class="quest-icon">${item.icon}</span>
        <span class="quest-name">${item.name}</span>
        <span class="quest-status ${statusClass[item.status]}">${statusMap[item.status] || '未知'}</span>
        ${item.source === 'local' ? `<button class="task-delete" onclick="deleteTask('${item.id}')">🗑️</button>` : ''}
      </div>
      <div class="quest-progress">
        <div class="progress-bar">
          <div class="progress-fill quest-fill" style="width: ${item.progress || 0}%"></div>
        </div>
        <span class="progress-text">${item.progress || 0}%</span>
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
// 机会雷达渲染
// ==========================================

function renderRadar(opportunities) {
  const radarContainer = document.getElementById('radarContainer');
  if (!radarContainer) return;

  if (!opportunities || opportunities.length === 0) {
    radarContainer.innerHTML = '<div class="radar-empty">暂无机会数据</div>';
    return;
  }

  // 雷达参数
  const centerX = 150;
  const centerY = 120;
  const maxRadius = 100;
  
  // 距离映射到半径
  const distanceToRadius = {
    near: maxRadius * 0.3,
    medium: maxRadius * 0.6,
    far: maxRadius * 0.9
  };

  // 角度分布（均匀分布在圆周上）
  const angleStep = (2 * Math.PI) / Math.max(opportunities.length, 1);
  const startAngle = -Math.PI / 2; // 从顶部开始

  // 生成雷达背景圆
  const radarBg = `
    <svg class="radar-svg" viewBox="0 0 300 240">
      <!-- 背景圆 -->
      <circle cx="${centerX}" cy="${centerY}" r="${maxRadius * 0.3}" fill="none" stroke="#333" stroke-width="1" stroke-dasharray="4,4" opacity="0.3"/>
      <circle cx="${centerX}" cy="${centerY}" r="${maxRadius * 0.6}" fill="none" stroke="#333" stroke-width="1" stroke-dasharray="4,4" opacity="0.3"/>
      <circle cx="${centerX}" cy="${centerY}" r="${maxRadius * 0.9}" fill="none" stroke="#333" stroke-width="1" stroke-dasharray="4,4" opacity="0.3"/>
      
      <!-- 十字线 -->
      <line x1="${centerX}" y1="${centerY - maxRadius}" x2="${centerX}" y2="${centerY + maxRadius}" stroke="#333" stroke-width="1" opacity="0.2"/>
      <line x1="${centerX - maxRadius}" y1="${centerY}" x2="${centerX + maxRadius}" y2="${centerY}" stroke="#333" stroke-width="1" opacity="0.2"/>
      
      <!-- 中心点 -->
      <circle cx="${centerX}" cy="${centerY}" r="4" fill="#7C4DFF"/>
      
      <!-- 距离标签 -->
      <text x="${centerX + 5}" y="${centerY - maxRadius * 0.3}" class="radar-label">近</text>
      <text x="${centerX + 5}" y="${centerY - maxRadius * 0.6}" class="radar-label">中</text>
      <text x="${centerX + 5}" y="${centerY - maxRadius * 0.9}" class="radar-label">远</text>
    </svg>
  `;

  // 生成机会点
  const opportunityDots = opportunities.map((o, i) => {
    const angle = startAngle + (i * angleStep);
    const radius = distanceToRadius[o.distance] || maxRadius * 0.6;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    const fillColor = o.type === 'project' ? '#4CAF50' : '#FF9800';
    const isCompleted = o.status === 'completed';
    const size = isCompleted ? 8 : 10;
    
    return `
      <div class="radar-dot ${o.type} ${o.status}" 
           style="left: ${x}px; top: ${y}px;"
           data-id="${o.id}"
           title="${o.name}">
        <span class="radar-dot-icon">${o.icon}</span>
      </div>
    `;
  }).join('');

  // 生成图例
  const legend = `
    <div class="radar-legend">
      <span class="legend-item"><span class="legend-dot project"></span>已验证项目</span>
      <span class="legend-item"><span class="legend-dot opportunity"></span>机会点</span>
    </div>
  `;

  radarContainer.innerHTML = `
    ${radarBg}
    <div class="radar-dots">${opportunityDots}</div>
    ${legend}
    <div class="radar-tooltip" id="radarTooltip"></div>
  `;

  // 绑定悬停事件
  bindRadarEvents(opportunities);
}

function bindRadarEvents(opportunities) {
  const dots = document.querySelectorAll('.radar-dot');
  const tooltip = document.getElementById('radarTooltip');

  dots.forEach(dot => {
    const id = dot.dataset.id;
    const opp = opportunities.find(o => o.id === id);
    if (!opp) return;

    dot.addEventListener('mouseenter', (e) => {
      const rect = dot.getBoundingClientRect();
      const containerRect = dot.closest('#radarContainer').getBoundingClientRect();
      
      tooltip.innerHTML = `
        <div class="tooltip-title">${opp.icon} ${opp.name}</div>
        <div class="tooltip-desc">${opp.description}</div>
        <div class="tooltip-meta">
          <span>进度: ${opp.progress}%</span>
          <span>难度: ${opp.distance === 'near' ? '近' : opp.distance === 'medium' ? '中' : '远'}</span>
        </div>
        ${opp.link ? `<a href="${opp.link}" target="_blank" class="tooltip-link">访问 →</a>` : ''}
      `;
      tooltip.style.display = 'block';
      tooltip.style.left = `${rect.left - containerRect.left + 20}px`;
      tooltip.style.top = `${rect.top - containerRect.top - 10}px`;
    });

    dot.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });

    // 点击打开链接
    if (opp.link) {
      dot.style.cursor = 'pointer';
      dot.addEventListener('click', () => {
        window.open(opp.link, '_blank');
      });
    }
  });
}

// ==========================================
// 预警系统渲染
// ==========================================

function renderAlerts(computed, data) {
  const alertList = document.getElementById('alertList');
  if (!alertList) return;

  // 使用新的AlertSystem生成预警
  const alerts = AlertSystem.generateAlerts(data, computed);

  // 过滤未确认的预警
  const activeAlerts = alerts.filter(a => !a.acknowledged);

  if (activeAlerts.length === 0) {
    alertList.innerHTML = `
      <div class="alert-item info">
        <span class="alert-level">✅</span>
        <div class="alert-content">
          <div class="alert-title">状态良好</div>
          <div class="alert-desc">各项指标正常，无预警</div>
        </div>
      </div>
    `;
    return;
  }

  const levelIcon = { critical: '🔴', warning: '🟡', info: '🔵' };
  alertList.innerHTML = activeAlerts.slice(0, 5).map(a => `
    <div class="alert-item ${a.level}" onclick="showAlertDetail('${a.id}')" style="cursor:pointer;">
      <span class="alert-level">${levelIcon[a.level]}</span>
      <div class="alert-content">
        <div class="alert-title">${a.title}</div>
        <div class="alert-desc">${a.description}</div>
      </div>
    </div>
  `).join('');
}

function showAlertDetail(alertId) {
  const alerts = AlertSystem.loadAlerts();
  const data = JARVIS.getAllData();
  const computed = JARVIS.getRealtimeData();
  const allAlerts = AlertSystem.generateAlerts(data, computed);
  const alert = allAlerts.find(a => a.id === alertId);

  if (!alert) return;

  // 创建详情模态框
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'alertDetailModal';
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };

  const trendIcon = { worsening: '📉', stable: '➡️', improving: '📈' };
  const categoryLabel = {
    financial: '💰 财务',
    health: '💗 健康',
    relationship: '👥 人际关系',
    project: '📜 项目'
  };

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${categoryLabel[alert.category]} 预警详情</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <div class="modal-body">
        <div class="alert-detail-content">
          <div class="alert-detail-row">
            <span class="alert-detail-label">预警等级</span>
            <span class="alert-detail-value">${alert.level === 'critical' ? '🔴 严重' : alert.level === 'warning' ? '🟡 警告' : '🔵 信息'}</span>
          </div>
          <div class="alert-detail-row">
            <span class="alert-detail-label">趋势</span>
            <span class="alert-detail-value">${trendIcon[alert.trend]} ${alert.trend === 'worsening' ? '恶化' : alert.trend === 'stable' ? '稳定' : '改善'}</span>
          </div>
          <div class="alert-detail-row">
            <span class="alert-detail-label">当前值</span>
            <span class="alert-detail-value">${alert.currentValue}</span>
          </div>
          <div class="alert-detail-row">
            <span class="alert-detail-label">阈值</span>
            <span class="alert-detail-value">${alert.threshold}</span>
          </div>
          <div class="alert-detail-suggestion">
            <strong>💡 建议：</strong>${alert.suggestion}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn secondary" onclick="this.closest('.modal').remove()">关闭</button>
        <button class="btn primary" onclick="acknowledgeAlert('${alert.id}')">知道了</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function acknowledgeAlert(alertId) {
  AlertSystem.acknowledgeAlert(alertId);
  document.getElementById('alertDetailModal')?.remove();
  showNotification('✅ 预警已确认', 'success');
  renderAll();
}

// ==========================================
// 任务追踪器渲染
// ==========================================

function renderTasks() {
  const taskList = document.getElementById('taskList');
  if (!taskList) return;

  const tasks = TaskTracker.loadTasks();

  if (tasks.length === 0) {
    taskList.innerHTML = '<div class="task-empty">暂无任务，点击「➕ 添加任务」创建</div>';
    return;
  }

  const statusMap = {
    in_progress: { label: '进行中', class: 'in_progress' },
    pending: { label: '待开始', class: 'pending' },
    completed: { label: '已完成', class: 'completed' },
    blocked: { label: '阻塞', class: 'blocked' }
  };

  const projectIcon = {
    'adult-shop': '⚔️',
    'jarvis-web': '🎮',
    'manga-studio': '📚',
    'other': '📋'
  };

  taskList.innerHTML = tasks.map(task => {
    const status = statusMap[task.status] || statusMap.pending;
    const deadline = task.deadline ? new Date(task.deadline) : null;
    const now = new Date();
    let deadlineClass = '';
    let deadlineText = '';

    if (deadline) {
      const daysLeft = Math.ceil((deadline - now) / (24 * 60 * 60 * 1000));
      if (daysLeft < 0) {
        deadlineClass = 'overdue';
        deadlineText = '已过期';
      } else if (daysLeft <= 3) {
        deadlineClass = 'overdue';
        deadlineText = `${daysLeft}天后截止`;
      } else {
        deadlineText = deadline.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
      }
    }

    return `
      <div class="task-item ${status.class}">
        <div class="task-header">
          <span class="task-name">${task.name}</span>
          <span class="task-project">${projectIcon[task.project] || '📋'} ${task.project}</span>
          <button class="task-delete" onclick="deleteTask('${task.id}')">🗑️</button>
        </div>
        <div class="task-meta">
          <span>👤 ${task.owner}</span>
          ${deadline ? `<span class="task-deadline ${deadlineClass}">📅 ${deadlineText}</span>` : ''}
        </div>
        <div class="task-progress">
          <div class="progress-bar">
            <div class="progress-fill quest-fill" style="width: ${task.progress}%"></div>
          </div>
          <span class="progress-text">${task.progress}%</span>
        </div>
      </div>
    `;
  }).join('');
}

function openTaskInput() {
  // 设置默认截止日期为7天后
  const defaultDeadline = new Date();
  defaultDeadline.setDate(defaultDeadline.getDate() + 7);
  document.getElementById('taskDeadlineInput').value = defaultDeadline.toISOString().split('T')[0];
  document.getElementById('taskProgressValue').textContent = '0%';

  openModal('taskModal');
}

function saveTask() {
  const name = document.getElementById('taskNameInput').value.trim();
  const project = document.getElementById('taskProjectInput').value;
  const owner = document.getElementById('taskOwnerInput').value.trim() || 'Kim';
  const deadline = document.getElementById('taskDeadlineInput').value || null;
  const progress = parseInt(document.getElementById('taskProgressInput').value) || 0;
  const status = document.getElementById('taskStatusInput').value;

  if (!name) {
    showNotification('请输入任务名称', 'warning');
    return;
  }

  TaskTracker.addTask({ name, project, owner, deadline, progress, status });
  closeModal('taskModal');
  showNotification('✅ 任务已添加', 'success');
  renderTasks();
}

function deleteTask(taskId) {
  if (confirm('确定要删除这个任务吗？')) {
    TaskTracker.deleteTask(taskId);
    showNotification('🗑️ 任务已删除', 'info');
    renderTasks();
  }
}

// ==========================================
// 意义确认功能
// ==========================================

function openMeaningConfirm() {
  renderMeaningList();
  openModal('meaningModal');
}

function renderMeaningList() {
  const list = document.getElementById('meaningList');
  const empty = document.getElementById('meaningEmpty');
  if (!list || !empty) return;

  const tasks = AIEvaluator.getTasksNeedingConfirm();

  if (tasks.length === 0) {
    list.style.display = 'none';
    empty.style.display = 'block';
    updateMeaningBadge();
    return;
  }

  empty.style.display = 'none';
  list.style.display = 'block';

  // 更新 badge
  updateMeaningBadge();

  // 渲染任务列表
  const today = new Date().toISOString().split('T')[0];

  list.innerHTML = tasks.map(task => {
    const lastConfirmed = task.last_meaning_confirmed || task.purpose_created_at || today;
    const daysAgo = Math.floor((new Date(today) - new Date(lastConfirmed)) / 86400000);

    return `
      <div class="meaning-item" data-task-id="${task.id}">
        <div class="meaning-task-name">${task.name}</div>
        <div class="meaning-purpose">
          <span class="meaning-purpose-label">意义：</span>
          <span class="meaning-purpose-text">${task.purpose || '确认这个目标对你是否还有意义'}</span>
        </div>
        <div class="meaning-days">${daysAgo}天前确认</div>
        <div class="meaning-actions">
          <button class="meaning-btn confirm" onclick="confirmMeaning('${task.id}', 'confirm')">✅ 在</button>
          <button class="meaning-btn modify" onclick="confirmMeaningModify('${task.id}')">✏️ 改了目标</button>
          <button class="meaning-btn abandon" onclick="confirmMeaning('${task.id}', 'abandon')">🗑️ 放弃</button>
        </div>
      </div>
    `;
  }).join('');
}

function updateMeaningBadge() {
  const badge = document.getElementById('meaningBadge');
  if (!badge) return;

  const count = AIEvaluator.getTasksNeedingConfirm().length;
  badge.textContent = count > 0 ? count : '';
  badge.style.display = count > 0 ? 'inline' : 'none';
}

function confirmMeaning(taskId, action) {
  AIEvaluator.confirmMeaning(taskId, action);
  showNotification(action === 'confirm' ? '✅ 意义已确认' : action === 'abandon' ? '🗑️ 任务已放弃' : '', 'success');
  renderMeaningList();
  renderTasks();
}

function confirmMeaningModify(taskId) {
  const task = TaskTracker.loadTasks().find(t => t.id === taskId);
  if (!task) return;

  const newPurpose = prompt('请输入新的意义/目标：', task.purpose);
  if (newPurpose === null) return; // 用户取消

  const purpose = newPurpose.trim() || task.purpose;
  AIEvaluator.confirmMeaning(taskId, 'modify', purpose);
  showNotification('✏️ 目标已更新', 'success');
  renderMeaningList();
  renderTasks();
}

// 进度滑块事件
document.getElementById('taskProgressInput')?.addEventListener('input', (e) => {
  document.getElementById('taskProgressValue').textContent = e.target.value + '%';
});

// ==========================================
// 每日日程渲染
// ==========================================

function renderDailySchedule() {
  const container = document.getElementById('historyChart');
  if (!container) return;

  // 从 syncCache 读取任务数据（和 renderQuests 用同一数据源）
  const syncData = window.syncCache;
  if (!syncData || !syncData.projects) {
    container.innerHTML = '<div class="schedule-empty">📋 暂无日程数据</div>';
    return;
  }

  // 收集所有带 deadline 的子任务
  const allTasks = [];
  const projectIcons = { 'adult-shop': '⚔️', 'manga-studio': '📚', 'star-talent': '🔥', 'jarvis-web': '🎮' };

  syncData.projects.forEach(project => {
    if (!project.subTasks) return;
    project.subTasks.forEach(st => {
      if (!st.deadline) return;
      // 解析 deadline 为 Date 对象（MM/DD 格式，今年）
      const [m, d] = st.deadline.split('/').map(Number);
      const deadlineDate = new Date();
      deadlineDate.setMonth(m - 1, d);
      deadlineDate.setHours(23, 59, 59, 999);

      // 判断是否已完成
      const isCompleted = st.status && (st.status.includes('✅') || st.status.includes('完成'));

      allTasks.push({
        name: st.name,
        projectName: project.name,
        projectId: project.id,
        icon: projectIcons[project.id] || '📋',
        owner: st.owner,
        deadline: st.deadline,
        deadlineDate,
        status: st.status,
        isCompleted,
        nextStep: st.nextStep
      });
    });
  });

  // 今天是 5月2日，所以筛选 deadline = 5/2 的任务
  const today = new Date();
  const todayStr = `${today.getMonth() + 1}/${today.getDate()}`;

  const todayTasks = allTasks.filter(t => t.deadline === todayStr);

  // 如果今天没有，显示提示
  if (todayTasks.length === 0) {
    // 显示近期任务（3天内）作为参考
    const upcoming = allTasks
      .filter(t => !t.isCompleted && t.deadlineDate >= today && t.deadlineDate <= new Date(today.getTime() + 3 * 86400000))
      .sort((a, b) => a.deadlineDate - b.deadlineDate);

    container.innerHTML = `
      <div class="schedule-empty">📋 今天没有待办日程</div>
      ${upcoming.length > 0 ? `
        <div class="schedule-upcoming-header">📅 近期任务</div>
        <div class="schedule-list">
          ${upcoming.map(t => buildScheduleCard(t, false)).join('')}
        </div>
      ` : ''}
    `;
    return;
  }

  // 渲染今日日程
  const sorted = todayTasks.sort((a, b) => a.deadlineDate - b.deadlineDate);
  container.innerHTML = `
    <div class="schedule-header">📅 今日日程 · ${todayStr}</div>
    <div class="schedule-list">
      ${sorted.map(t => buildScheduleCard(t, true)).join('')}
    </div>
  `;
}

function buildScheduleCard(task, isToday) {
  const deadlineLabel = `${task.deadline}`;
  const statusClass = task.isCompleted ? 'completed' : '';
  const checkIcon = task.isCompleted ? '☑️' : '⬜';
  const rowClass = task.isCompleted ? 'schedule-item completed' : 'schedule-item';

  // 解析进度（从 status 字符串中提取数字）
  let progress = 0;
  const progressMatch = task.status?.match(/(\d+)%/);
  if (progressMatch) progress = parseInt(progressMatch[1]);

  return `
    <div class="${rowClass}" data-project="${task.projectId}">
      <div class="schedule-row-main">
        <span class="schedule-check">${checkIcon}</span>
        <span class="schedule-icon">${task.icon}</span>
        <div class="schedule-info">
          <span class="schedule-name">${task.name}</span>
          <span class="schedule-meta">${task.projectName} · ${task.owner} · ${deadlineLabel}</span>
        </div>
        <span class="schedule-progress">${progress}%</span>
      </div>
      ${!task.isCompleted && progress > 0 ? `
        <div class="schedule-progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
      ` : ''}
    </div>
  `;
}

// ==========================================
// 环境感知渲染
// ==========================================

function renderEnvironment() {
  renderIndustryList();
  renderPolicyList();
  renderRelationshipList();
  renderContactWarnings();
}

function renderIndustryList() {
  const list = document.getElementById('industryList');
  if (!list) return;

  const items = EnvironmentTracker.loadEnvData().industry.slice(0, 10);

  if (items.length === 0) {
    list.innerHTML = '<div class="env-item"><span class="env-item-text" style="color:#999;">暂无记录</span></div>';
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="env-item">
      <div class="env-item-content">
        <span class="env-item-text">${item.text}</span>
        <span class="env-item-time">${formatTime(item.createdAt)}</span>
      </div>
      <button class="env-item-delete" onclick="deleteIndustry('${item.id}')">×</button>
    </div>
  `).join('');
}

function renderPolicyList() {
  const list = document.getElementById('policyList');
  if (!list) return;

  const items = EnvironmentTracker.loadEnvData().policy.slice(0, 10);

  if (items.length === 0) {
    list.innerHTML = '<div class="env-item"><span class="env-item-text" style="color:#999;">暂无记录</span></div>';
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="env-item">
      <div class="env-item-content">
        <span class="env-item-text">${item.text}</span>
        <span class="env-item-time">${formatTime(item.createdAt)}</span>
      </div>
      <button class="env-item-delete" onclick="deletePolicy('${item.id}')">×</button>
    </div>
  `).join('');
}

function renderRelationshipList() {
  const list = document.getElementById('relationshipList');
  if (!list) return;

  const items = EnvironmentTracker.loadEnvData().relationships.slice(0, 10);

  if (items.length === 0) {
    list.innerHTML = '<div class="env-item"><span class="env-item-text" style="color:#999;">暂无记录</span></div>';
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="env-item">
      <div class="env-item-content">
        <span class="env-item-text">${item.name}: ${item.text}</span>
        <span class="env-item-time">${formatTime(item.createdAt)}</span>
      </div>
      <button class="env-item-delete" onclick="deleteRelationship('${item.id}')">×</button>
    </div>
  `).join('');
}

function renderContactWarnings() {
  const container = document.getElementById('contactWarnings');
  if (!container) return;

  const warnings = EnvironmentTracker.getContactWarnings();

  if (warnings.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = warnings.map(c => `
    <div class="contact-warning">
      <span>⚠️</span>
      <span>${c.name} 已超过30天无联系</span>
    </div>
  `).join('');
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}

// 环境感知添加函数
function addIndustry() {
  const input = document.getElementById('industryInput');
  const text = input.value.trim();
  if (text) {
    EnvironmentTracker.addIndustry(text);
    input.value = '';
    renderIndustryList();
    showNotification('✅ 行业动态已添加', 'success');
  }
}

function deleteIndustry(id) {
  EnvironmentTracker.deleteIndustry(id);
  renderIndustryList();
}

function addPolicy() {
  const input = document.getElementById('policyInput');
  const text = input.value.trim();
  if (text) {
    EnvironmentTracker.addPolicy(text);
    input.value = '';
    renderPolicyList();
    showNotification('✅ 政策变化已添加', 'success');
  }
}

function deletePolicy(id) {
  EnvironmentTracker.deletePolicy(id);
  renderPolicyList();
}

function addRelationship() {
  const input = document.getElementById('relationshipInput');
  const text = input.value.trim();
  if (text) {
    EnvironmentTracker.addRelationship(text);
    input.value = '';
    renderRelationshipList();
    renderContactWarnings();
    showNotification('✅ 人际关系动态已添加', 'success');
  }
}

function deleteRelationship(id) {
  EnvironmentTracker.deleteRelationship(id);
  renderRelationshipList();
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
  const f = data.finance || { assets: {}, liabilities: {} };
  
  document.getElementById('cashInput').value = f.assets?.cash || 500000;
  document.getElementById('bankInput').value = f.assets?.bankDeposits || 0;
  document.getElementById('investmentsInput').value = f.assets?.investments || 0;
  document.getElementById('realEstateInput').value = f.assets?.realEstate || 0;
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
      bankDeposits: parseInt(document.getElementById('bankInput').value) || 0,
      investments: parseInt(document.getElementById('investmentsInput').value) || 0,
      realEstate: parseInt(document.getElementById('realEstateInput').value) || 0
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

  // 基于当前数据的智能建议
  if (computed.hp.current < 50) {
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

  // 如果没有特殊建议，使用默认建议
  if (advices.length === 0) {
    advices.push('🎯 继续保持，J.A.R.V.I.S. 实时监控你的状态');
  }

  const advice = advices[Math.floor(Math.random() * advices.length)];
  document.getElementById('aiAdvice').innerHTML = `<div class="advice-item"><p>「${advice}</p></div>`;
}

// 初始化AI建议（简化版）
function initAIAdvice() {
  const data = JARVIS.getAllData();
  const computed = JARVIS.getRealtimeData();

  // 根据数据生成建议
  let advice = '基于当前数据，建议：';

  if (computed.hp.current < 60) {
    advice += '保证睡眠，';
  }

  if (computed.energy.current < 50) {
    advice += '减少非必要支出，';
  }

  if (data.finance?.assets?.cash < 500000) {
    advice += '关注财务状况，';
  }

  // 移除末尾的逗号并添加句号
  advice = advice.replace(/，$/, '。');

  // 如果建议没有实际内容，使用默认
  if (advice === '基于当前数据，建议：') {
    advice = '基于当前数据，建议：保证睡眠，减少非必要支出';
  }

  document.getElementById('aiAdvice').innerHTML = `<div class="advice-item"><p>「${advice}」</p></div>`;
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

  // 环境感知输入框回车事件
  document.getElementById('industryInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addIndustry();
  });
  document.getElementById('policyInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addPolicy();
  });
  document.getElementById('relationshipInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addRelationship();
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // 移动端卡片显示逻辑
  if (window.innerWidth < 768) {
    const cardGroups = {
      dashboard: ['.character-card', '.financial-card'],
      quests: ['.quest-card'],
      tasks: ['.task-card'],
      charts: ['.chart-card'],
      alerts: ['.alert-card', '.skills-card'],
      env: ['.env-card', '.relationship-card'],
      ai: ['.ai-card']
    };

    const showCards = cardGroups[tabName] || cardGroups.dashboard;

    document.querySelectorAll('.card').forEach(card => {
      const shouldShow = showCards.some(selector => card.matches(selector));
      card.style.display = shouldShow ? 'block' : 'none';
    });
  } else {
    document.querySelectorAll('.card').forEach(card => card.style.display = 'block');
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

// ==========================================
// External Signals System
// ==========================================

const SIGNAL_STORE_URL = '/jARVIS-signals.json';

let signalsCache = null;

async function loadSignals() {
  try {
    const res = await fetch(SIGNAL_STORE_URL + '?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      signalsCache = data.signals || [];
      return signalsCache;
    }
  } catch (e) {
    console.warn('信号加载失败:', e.message);
  }
  return [];
}

function saveSignals(signals) {
  signalsCache = signals;
  const store = { signals, lastUpdated: new Date().toISOString() };
  localStorage.setItem('jARVIS-signals-local', JSON.stringify(store));
}

function getSignals() {
  return signalsCache || [];
}

async function renderSignals() {
  const list = document.getElementById('signalList');
  const badge = document.getElementById('signalCount');
  if (!list) return;

  const signals = await loadSignals();

  if (signals.length === 0) {
    list.innerHTML = '<div class="signal-empty">📭 暂无信号数据，等待 cron 抓取...</div>';
    if (badge) badge.textContent = '0';
    return;
  }

  // 排序：待评估优先，然后按时间倒序
  const sorted = [...signals].sort((a, b) => {
    if (a.impact.status === 'pending' && b.impact.status !== 'pending') return -1;
    if (a.impact.status !== 'pending' && b.impact.status === 'pending') return 1;
    return new Date(b.receivedAt) - new Date(a.receivedAt);
  });

  // 更新 badge
  const pending = signals.filter(s => s.impact.status === 'pending').length;
  if (badge) badge.textContent = pending > 0 ? `${pending}待评估` : signals.length;

  const typeIcon = { industry: '🏭', policy: '📜', market: '📊', macro: '🌐', news: '📰' };
  const directionLabel = { opportunity: '机会', risk: '风险', neutral: '中性' };
  const directionClass = { opportunity: 'opportunity', risk: 'risk', neutral: 'neutral' };

  list.innerHTML = sorted.slice(0, 20).map(s => {
    const isEvaluated = s.impact.status !== 'pending';
    const evalClass = isEvaluated ? 'evaluated' : (s.impact.direction || 'neutral');
    const scoreClass = s.impact.score > 0 ? 'positive' : s.impact.score < 0 ? 'negative' : 'neutral';

    return `
      <div class="signal-item ${evalClass}" data-id="${s.id}" onclick="showSignalDetail('${s.id}')">
        <div class="signal-header">
          <span class="signal-title">${typeIcon[s.type] || '📰'} ${escapeHtml(s.title || '')}</span>
          <span class="signal-source">${escapeHtml(s.source || '')}</span>
        </div>
        ${s.summary ? `<div class="signal-summary" style="font-size:0.72rem;color:#777;margin:2px 0;">${escapeHtml(s.summary.slice(0, 80))}...</div>` : ''}
        ${s.impact.recommendation ? `<div class="signal-rec" style="font-size:0.72rem;color:#aaa;margin:3px 0 0 0;padding-left:4px;border-left:2px solid ${s.impact.direction === 'opportunity' ? '#4CAF50' : s.impact.direction === 'risk' ? '#F44336' : '#757575'};">💡 ${escapeHtml(s.impact.recommendation)}</div>` : ''}
        <div class="signal-meta">
          <span class="signal-tag type-${s.type}">${typeIcon[s.type] || ''} ${s.type}</span>
          ${s.impact.projectId ? `<span class="signal-tag project-${s.impact.projectId}">📁 ${s.impact.projectId}</span>` : ''}
          <span class="signal-direction ${directionClass[s.impact.direction] || 'neutral'}">${directionLabel[s.impact.direction] || '中性'}</span>
          ${isEvaluated ? `<span class="signal-score ${scoreClass}">评分: ${s.impact.score > 0 ? '+' : ''}${s.impact.score}</span>` : '<span class="signal-score neutral">⏳ 待评估</span>'}
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showSignalDetail(signalId) {
  const signals = getSignals();
  const signal = signals.find(s => s.id === signalId);
  if (!signal) return;

  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'signalDetailModal';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  const isEvaluated = signal.impact.status !== 'pending';
  const typeIcon = { industry: '🏭', policy: '📜', market: '📊', macro: '🌐', news: '📰' };

  modal.innerHTML = `
    <div class="modal-content" style="max-width:560px;">
      <div class="modal-header">
        <h3>${typeIcon[signal.type] || '📰'} 信号详情</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom:12px;">
          <div style="font-size:0.95rem;font-weight:600;color:#e0e0e0;margin-bottom:6px;">${escapeHtml(signal.title)}</div>
          <div style="font-size:0.72rem;color:#888;">来源: ${escapeHtml(signal.source)} · ${new Date(signal.publishedAt).toLocaleDateString('ja-JP')}</div>
          ${signal.sourceUrl ? `<a href="${signal.sourceUrl}" target="_blank" style="font-size:0.72rem;color:#64B5F6;">🔗 查看原文 →</a>` : ''}
        </div>
        ${signal.summary ? `<div style="font-size:0.8rem;color:#bbb;background:rgba(255,255,255,0.04);padding:10px;border-radius:8px;margin-bottom:12px;line-height:1.5;">${escapeHtml(signal.summary)}</div>` : ''}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
          <span class="signal-tag type-${signal.type}">${typeIcon[signal.type]} ${signal.type}</span>
          ${signal.tags.map(t => `<span class="signal-tag">${t}</span>`).join('')}
        </div>
        ${isEvaluated ? `
          <div style="background:rgba(76,175,80,0.1);border-radius:8px;padding:12px;">
            <div style="font-size:0.8rem;color:#4CAF50;margin-bottom:6px;">✅ 已评估</div>
            <div style="display:flex;gap:12px;font-size:0.78rem;color:#ccc;">
              <span>方向: <strong style="color:${signal.impact.direction === 'opportunity' ? '#64B5F6' : signal.impact.direction === 'risk' ? '#EF9A9A' : '#BDBDBD'}">${signal.impact.direction === 'opportunity' ? '机会' : signal.impact.direction === 'risk' ? '风险' : '中性'}</strong></span>
              <span>评分: <strong style="color:${signal.impact.score > 0 ? '#4CAF50' : signal.impact.score < 0 ? '#F44336' : '#9E9E9E'}">${signal.impact.score > 0 ? '+' : ''}${signal.impact.score}</strong></span>
              <span>置信度: <strong>${Math.round(signal.impact.confidence * 100)}%</strong></span>
              <span>时间范围: <strong>${signal.impact.horizon === 'short' ? '短期' : signal.impact.horizon === 'mid' ? '中期' : '长期'}</strong></span>
            </div>
            ${signal.impact.rationale ? `<div style="font-size:0.75rem;color:#999;margin-top:8px;">💡 ${escapeHtml(signal.impact.rationale)}</div>` : ''}
          </div>
        ` : `
          <div style="background:rgba(255,152,0,0.1);border-radius:8px;padding:12px;text-align:center;color:#FF9800;font-size:0.82rem;">
            ⏳ 此信号尚未评估，点击「评估信号」进行评分
          </div>
        `}
      </div>
      <div class="modal-footer">
        <button class="btn secondary" onclick="this.closest('.modal').remove()">关闭</button>
        <button class="btn primary" onclick="openSignalEvalModal();this.closest('.modal').remove();">🔍 评估</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function openSignalEvalModal() {
  const signals = getSignals();
  const savedWebhook = localStorage.getItem('n8n_webhook_url') || '';
  const hasWebhook = !!savedWebhook;

  if (signals.length === 0) {
    showNotification('📭 暂无信号可评估', 'info');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'signalEvalModal';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  const typeIcon = { industry: '🏭', policy: '📜', market: '📊', macro: '🌐', news: '📰' };

  modal.innerHTML = `
    <div class="modal-content" style="max-width:620px;">
      <div class="modal-header">
        <h3>🔍 评估外部信号</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <div class="modal-body">
        ${!hasWebhook ? `
        <div style="background:rgba(255,152,0,0.1);border:1px solid rgba(255,152,0,0.3);border-radius:10px;padding:12px;margin-bottom:14px;">
          <div style="font-size:0.8rem;color:#FF9800;margin-bottom:8px;">
            ⚠️ 未配置 n8n webhook，评估结果仅保存在浏览器本地
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="text" id="n8nWebhookInput" placeholder="https://your-n8n.com/webhook/jarvis-signals-sync"
              style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid #444;background:#222;color:#ccc;font-size:0.78rem;">
            <button class="btn primary" style="padding:6px 12px;font-size:0.78rem;" onclick="saveN8NWebhook()">保存</button>
          </div>
        </div>
        ` : `
        <div style="background:rgba(76,175,80,0.1);border-radius:8px;padding:8px 12px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:0.72rem;color:#4CAF50;">✅ n8n 已配置</span>
          <button onclick="clearN8NWebhook()" style="background:none;border:none;color:#888;font-size:0.7rem;cursor:pointer;">清除</button>
        </div>
        `}
        <div class="signal-eval-list">
          ${signals.map(s => `
            <div class="signal-eval-item ${s.impact.status !== 'pending' ? 'evaluated' : ''}" id="eval-${s.id}">
              <div class="signal-eval-title">${typeIcon[s.type] || '📰'} ${escapeHtml(s.title || '').slice(0, 60)}</div>
              ${s.summary ? `<div class="signal-eval-summary">${escapeHtml(s.summary || '').slice(0, 100)}</div>` : ''}
              <div class="signal-eval-controls">
                <label>方向:</label>
                <select id="dir-${s.id}" onchange="updateSignalPreview('${s.id}')">
                  <option value="opportunity" ${s.impact.direction === 'opportunity' ? 'selected' : ''}>📈 机会</option>
                  <option value="risk" ${s.impact.direction === 'risk' ? 'selected' : ''}>📉 风险</option>
                  <option value="neutral" ${s.impact.direction === 'neutral' ? 'selected' : ''}>➡️ 中性</option>
                </select>
                <label>评分:</label>
                <input type="range" id="score-${s.id}" min="-100" max="100" value="${s.impact.score || 0}"
                  oninput="document.getElementById('scoreVal-${s.id}').textContent = this.value > 0 ? '+'+this.value : this.value">
                <span id="scoreVal-${s.id}" style="font-size:0.75rem;color:#ccc;min-width:30px;">${s.impact.score > 0 ? '+' : ''}${s.impact.score || 0}</span>
                <label>置信:</label>
                <select id="conf-${s.id}">
                  <option value="0.3" ${s.impact.confidence == 0.3 ? 'selected' : ''}>低</option>
                  <option value="0.6" ${s.impact.confidence == 0.6 || !s.impact.confidence ? 'selected' : ''}>中</option>
                  <option value="0.8" ${s.impact.confidence == 0.8 ? 'selected' : ''}>高</option>
                  <option value="1.0" ${s.impact.confidence == 1.0 ? 'selected' : ''}>确定</option>
                </select>
                <label>范围:</label>
                <select id="horizon-${s.id}">
                  <option value="short" ${s.impact.horizon === 'short' ? 'selected' : ''}>短期</option>
                  <option value="mid" ${s.impact.horizon === 'mid' || !s.impact.horizon ? 'selected' : ''}>中期</option>
                  <option value="long" ${s.impact.horizon === 'long' ? 'selected' : ''}>长期</option>
                </select>
              </div>
              ${s.impact.status !== 'pending' ? `<div style="font-size:0.7rem;color:#4CAF50;margin-top:6px;">✅ 已评估 | 评分: ${s.impact.score > 0 ? '+' : ''}${s.impact.score}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn secondary" onclick="this.closest('.modal').remove()">取消</button>
        <button class="btn primary" onclick="saveAllSignalEvals()">💾 保存全部</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function saveN8NWebhook() {
  const url = document.getElementById('n8nWebhookInput')?.value?.trim();
  if (!url) {
    showNotification('请输入 webhook URL', 'warning');
    return;
  }
  localStorage.setItem('n8n_webhook_url', url);
  showNotification('✅ n8n webhook 已保存，评估将自动同步', 'success');
  // 重新打开 modal
  document.getElementById('signalEvalModal')?.remove();
  openSignalEvalModal();
}

function clearN8NWebhook() {
  localStorage.removeItem('n8n_webhook_url');
  localStorage.removeItem('n8n_webhook_hint_shown');
  showNotification('ℹ️ n8n webhook 已清除', 'info');
  document.getElementById('signalEvalModal')?.remove();
  openSignalEvalModal();
}

function updateSignalPreview(signalId) {
  // 实时预览效果（可选增强）
}

async function saveAllSignalEvals() {
  const signals = getSignals();
  const evals = {};  // 只收集变更的评估
  let changed = 0;

  for (const signal of signals) {
    const dirEl = document.getElementById(`dir-${signal.id}`);
    const scoreEl = document.getElementById(`score-${signal.id}`);
    const confEl = document.getElementById(`conf-${signal.id}`);
    const horizonEl = document.getElementById(`horizon-${signal.id}`);

    if (!dirEl || !scoreEl) continue;

    const newDirection = dirEl.value;
    const newScore = parseInt(scoreEl.value);
    const newConfidence = parseFloat(confEl?.value || 0.6);
    const newHorizon = horizonEl?.value || 'mid';

    if (signal.impact.direction !== newDirection ||
        signal.impact.score !== newScore ||
        signal.impact.confidence !== newConfidence ||
        signal.impact.horizon !== newHorizon) {
      signal.impact.direction = newDirection;
      signal.impact.score = newScore;
      signal.impact.confidence = newConfidence;
      signal.impact.horizon = newHorizon;
      signal.impact.status = 'evaluated';
      signal.impact.evaluatedAt = new Date().toISOString();
      evals[signal.id] = {
        direction: newDirection,
        score: newScore,
        confidence: newConfidence,
        horizon: newHorizon,
        status: 'evaluated',
        evaluatedAt: signal.impact.evaluatedAt
      };
      changed++;
    }
  }

  if (changed > 0) {
    saveSignals(signals);
    await syncEvalsToN8N(evals);
    showNotification(`✅ 已保存 ${changed} 个信号评估`, 'success');
  } else {
    showNotification('ℹ️ 没有变化', 'info');
  }

  document.getElementById('signalEvalModal')?.remove();
  renderSignals();
}

// n8n webhook URL（用户部署 n8n 后填入）
// 格式: https://your-n8n.com/webhook/jarvis-signals-sync
const N8N_WEBHOOK_URL = localStorage.getItem('n8n_webhook_url') || '';

async function syncEvalsToN8N(evals) {
  // 1. localStorage 持久化（始终）
  const localStore = JSON.parse(localStorage.getItem('jARVIS-signals-local') || '{"signals":[],"lastUpdated":null}');
  localStore.signals.forEach(s => {
    if (evals[s.id]) {
      Object.assign(s.impact, evals[s.id]);
    }
  });
  localStore.lastUpdated = new Date().toISOString();
  localStorage.setItem('jARVIS-signals-local', JSON.stringify(localStore));

  // 2. n8n webhook 同步（只发送变更的 evals diff）
  const webhookUrl = localStorage.getItem('n8n_webhook_url');
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evals, timestamp: new Date().toISOString() })
      });
      if (res.ok) {
        console.log('✅ 评估已同步到 n8n');
      } else {
        console.warn('⚠️ n8n 同步失败:', res.status);
      }
    } catch (e) {
      console.warn('⚠️ n8n 同步异常:', e.message);
    }
  } else {
    console.log('📝 评估已保存到本地（未配置 n8n webhook）');
  }
}

function configureN8NWebhook(url) {
  localStorage.setItem('n8n_webhook_url', url);
  showNotification('✅ n8n webhook 已配置', 'success');
}

// ==========================================
// Daily Commander - 每日指挥官
// ==========================================

// 初始化每日指挥官UI
function initDailyCommander() {
  const data = DailyCommander.load();
  
  // 设置角色按钮状态
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role === data.role);
  });
  
  // 填充任务
  for (let i = 0; i < 3; i++) {
    const input = document.getElementById(`dc-input-${i}`);
    const check = document.getElementById(`dc-check-${i}`);
    if (input) input.value = data.tasks[i] || '';
    if (check) {
      check.checked = data.completed[i];
      updateTaskStyle(i, data.completed[i]);
    }
  }
  
  // 更新完成度
  updateCompletionDisplay();
  
  // 更新AI建议
  updateAIAdvice();
}

// 角色切换
function DC_setRole(role) {
  DailyCommander.setRole(role);
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role === role);
  });
  updateAIAdvice();
}

// 保存任务
function DC_saveTask(index, value) {
  DailyCommander.setTask(index, value);
}

// 切换任务完成状态
function DC_toggleTask(index) {
  const check = document.getElementById(`dc-check-${index}`);
  DailyCommander.toggleComplete(index);
  updateTaskStyle(index, check.checked);
  updateCompletionDisplay();
  updateAIAdvice();
  
  // 如果全部完成，庆祝效果
  if (DailyCommander.getCompletedCount() === 3) {
    const status = document.querySelector('.completion-status');
    if (status) {
      status.classList.add('celebrate');
      setTimeout(() => status.classList.remove('celebrate'), 600);
    }
  }
}

// 更新任务样式（划线效果）
function updateTaskStyle(index, completed) {
  const input = document.getElementById(`dc-input-${index}`);
  const taskItem = document.getElementById(`dc-task-${index}`);
  if (input) {
    input.classList.toggle('completed', completed);
  }
  if (taskItem) {
    taskItem.style.opacity = completed ? '0.7' : '1';
  }
}

// 更新完成度显示
function updateCompletionDisplay() {
  const count = DailyCommander.getCompletedCount();
  const dots = document.getElementById('dc-dots');
  const counter = document.getElementById('dc-count');
  
  if (dots) {
    const filled = '● '.repeat(count);
    const empty = '○ '.repeat(3 - count);
    dots.textContent = (filled + empty).trim();
  }
  
  if (counter) {
    counter.textContent = `${count}/3`;
  }
}

// 更新AI建议
function updateAIAdvice() {
  const advice = DailyCommander.getAIAdvice();
  const container = document.getElementById('dc-advice');
  if (container) {
    container.innerHTML = `
      <span class="advice-main">${advice.main}</span>
      <span class="advice-sub">${advice.sub}</span>
    `;
  }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initDailyCommander, 100);
});

// 响应式
window.addEventListener('resize', () => {
  if (window.innerWidth >= 768) {
    document.querySelectorAll('.card').forEach(card => card.style.display = 'block');
  }
});

// 导出
window.JARVIS_APP = { renderAll, showNotification, syncFromObsidian };