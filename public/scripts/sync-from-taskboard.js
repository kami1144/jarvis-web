#!/usr/bin/env node
/**
 * JARVIS Obsidian 同步脚本
 * 读取 ~/.shared/task-board.json → 生成 public/jARVIS-sync.json
 * 供 Vercel 部署的 JARVIS Web 前端读取
 */

const fs = require('fs');
const path = require('path');

const TASK_BOARD_PATH = '/Users/jinyonghao/.shared/task-board.json';
const OUTPUT_PATH = path.join(__dirname, '../jARVIS-sync.json');
const MEANINGFUL_DAY_OUTPUT = path.join(__dirname, '../meaningful-day-sync.json');

// 解析日期（支持 5/4, 05/04, 5月4日 等格式）
function parseDate(dateStr) {
  if (!dateStr) return null;
  const currentYear = new Date().getFullYear();

  // 匹配 M/D 或 MM/DD 格式
  let match = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
  if (match) {
    return new Date(currentYear, parseInt(match[1]) - 1, parseInt(match[2]));
  }

  // 匹配 M月D日 格式
  match = dateStr.match(/(\d{1,2})月(\d{1,2})日/);
  if (match) {
    return new Date(currentYear, parseInt(match[1]) - 1, parseInt(match[2]));
  }

  return null;
}

// 判断任务是否应该纳入今日任务
function isTodayOrRecent(nextStep, daysWindow = 7) {
  if (!nextStep) return false;

  const taskDate = parseDate(nextStep);
  if (!taskDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((taskDate - today) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= daysWindow;
}

// 从任务推断 purpose
function inferPurpose(taskName, nextStep) {
  const text = (taskName + ' ' + nextStep).toLowerCase();

  if (text.includes('工厂') || text.includes('1688') || text.includes('供应链')) {
    return '建立稳定供应链';
  }
  if (text.includes('品牌') || text.includes('域名') || text.includes('domain')) {
    return '确定品牌身份';
  }
  if (text.includes('内容') || text.includes('小红书') || text.includes('发布')) {
    return '获取流量';
  }
  if (text.includes('支付') || text.includes('paypal') || text.includes('付款')) {
    return '支持跨境支付';
  }
  if (text.includes('产品') || text.includes('上架') || text.includes('listing')) {
    return '完成产品上架';
  }
  if (text.includes('代发') || text.includes('dropship')) {
    return '建立代发渠道';
  }
  if (text.includes('隐私') || text.includes('包装')) {
    return '保护客户隐私';
  }
  if (text.includes('服务器') || text.includes('server') || text.includes('hosting')) {
    return '保障服务稳定';
  }
  if (text.includes('技术') || text.includes('tech') || text.includes('网站')) {
    return '技术实现';
  }
  if (text.includes('养号') || text.includes('运营')) {
    return '账号运营';
  }
  if (text.includes('排版') || text.includes('JSON')) {
    return '产品优化';
  }

  return '推进目标，建立事业';
}

// 推断工具
function inferTool(taskName, nextStep) {
  const text = (taskName + ' ' + nextStep).toLowerCase();

  if (text.includes('工厂') || text.includes('1688') || text.includes('供应链')) {
    return '精益创业画布';
  }
  if (text.includes('品牌') || text.includes('域名')) {
    return '精益创业画布';
  }
  if (text.includes('内容') || text.includes('小红书') || text.includes('发布')) {
    return '影响力六原则';
  }
  if (text.includes('技术') || text.includes('排版') || text.includes('JSON')) {
    return '六顶思考帽';
  }
  if (text.includes('运营') || text.includes('养号')) {
    return '每日快速复盘';
  }

  return '思考快与慢';
}

// 生成有意义的一天同步数据
function syncMeaningfulDay(taskBoard) {
  const today = new Date().toISOString().split('T')[0];
  const todayStr = new Date().toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });

  // 获取默认角色（从 adult-shop 的当前阶段）
  let defaultRole = '💼 创业者';

  // 收集今���任务
  const tasks = [];

  // 处理 adult-shop
  if (taskBoard['adult-shop']) {
    const sub = taskBoard['adult-shop']._subtasks || {};
    const adultShop = taskBoard['adult-shop'];

    // 获取 role（如果有 meaningful_day 字段）
    if (adultShop.meaningful_day?.role) {
      defaultRole = adultShop.meaningful_day.role;
    }

    for (const [taskName, task] of Object.entries(sub)) {
      const nextStep = task['下一步'];

      if (isTodayOrRecent(nextStep)) {
        // 如果 task 有 meaningful_day 数据，用它；否则自动推断
        const taskMd = task.meaningful_day || {};

        tasks.push({
          id: 'sync_task_' + tasks.length + 1,
          text: nextStep || taskName,
          purpose: taskMd.purpose || inferPurpose(taskName, nextStep),
          tool: taskMd.tool || inferTool(taskName, nextStep),
          project: 'adult-shop',
          completed: false
        });
      }
    }
  }

  // 处理 MangaStudio
  if (taskBoard['MangaStudio']) {
    const sub = taskBoard['MangaStudio']._subtasks || {};

    for (const [taskName, task] of Object.entries(sub)) {
      const nextStep = task['下一步'];

      if (isTodayOrRecent(nextStep)) {
        const taskMd = task.meaningful_day || {};

        tasks.push({
          id: 'sync_task_' + tasks.length + 1,
          text: nextStep || taskName,
          purpose: taskMd.purpose || inferPurpose(taskName, nextStep),
          tool: taskMd.tool || inferTool(taskName, nextStep),
          project: 'MangaStudio',
          completed: false
        });
      }
    }
  }

  // 生成同步数据
  const syncData = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    date: today,
    role: defaultRole,
    tasks: tasks.slice(0, 3)  // 最多3个任务
  };

  // 写入文件
  fs.writeFileSync(MEANINGFUL_DAY_OUTPUT, JSON.stringify(syncData, null, 2), 'utf8');
  console.log(`\n📥 有意义的一天同步: ${MEANINGFUL_DAY_OUTPUT}`);
  console.log(`   - 角色: ${defaultRole}`);
  console.log(`   - 任务数: ${tasks.length}`);

  return syncData;
}

function sync() {
  // 1. 读取 task-board.json
  let taskBoard;
  try {
    taskBoard = JSON.parse(fs.readFileSync(TASK_BOARD_PATH, 'utf8'));
  } catch (e) {
    console.error('❌ 无法读取 task-board.json:', e.message);
    process.exit(1);
  }

  // 2. 转换为 JARVIS 格式
  const projects = [];
  const skills = [];
  const alerts = [];

  // adult-shop 项目
  if (taskBoard['adult-shop']) {
    const s = taskBoard['adult-shop'];
    const sub = s._subtasks || {};

    // 计算整体进度
    const statuses = Object.values(sub).map(t => t['进度'] || '');
    let progress = 0;
    if (statuses.includes('✅ 完成')) progress = 90;
    else if (statuses.includes('进行中')) progress = 50;
    else if (statuses.some(s => s.includes('🔄'))) progress = 30;
    else if (statuses.some(s => s.includes('⏳'))) progress = 10;
    else if (statuses.some(s => s.includes('🔴'))) progress = 5;

    projects.push({
      id: 'adult-shop',
      name: 'adult-shop 上线',
      icon: '⚔️',
      type: 'project',
      status: sub.factory?.['进度']?.includes('🔴') ? 'blocked' :
              sub.factory?.['进度']?.includes('⏳') ? 'pending' : 'active',
      distance: 'near',
      description: s.description || '日本成人用品电商独立站',
      progress,
      link: 'https://adult-shop-kami1144s-projects.vercel.app',
      lastUpdated: taskBoard['last_updated'] || new Date().toISOString(),
      subTasks: Object.entries(sub).map(([k, v]) => ({
        name: k,
        owner: v['负责'] || '',
        status: v['进度'] || '',
        nextStep: v['下一步'] || '',
        note: v['备注'] || '',
        deadline: v['下一步'] ? v['下一步'].match(/\d{1,2}\/\d{1,2}/)?.[0] : null
      }))
    });
  }

  // MangaStudio
  if (taskBoard['MangaStudio']) {
    const s = taskBoard['MangaStudio'];
    projects.push({
      id: 'manga-studio',
      name: 'MangaStudio',
      icon: '📚',
      type: 'project',
      status: 'active',
      distance: 'medium',
      description: s.description || '成人漫画AI排版工具',
      progress: 30,
      link: null,
      lastUpdated: taskBoard['last_updated'] || new Date().toISOString(),
      subTasks: Object.entries(s._subtasks || {}).map(([k, v]) => ({
        name: k,
        owner: v['负责'] || '',
        status: v['进度'] || '',
        nextStep: v['下一步'] || '',
        note: v['备注'] || '',
        deadline: v['下一步'] ? v['下一步'].match(/\d{1,2}\/\d{1,2}/)?.[0] : null
      }))
    });
  }

  // 星火人才
  if (taskBoard['星火人才']) {
    const s = taskBoard['星火人才'];
    projects.push({
      id: 'star-talent',
      name: '星火人才',
      icon: '🔥',
      type: 'opportunity',
      status: 'planning',
      distance: 'far',
      description: s.description || 'AI+教育方向',
      progress: 10,
      link: null,
      lastUpdated: taskBoard['last_updated'] || new Date().toISOString(),
      subTasks: Object.entries(s._subtasks || {}).map(([k, v]) => ({
        name: k,
        owner: v['负责'] || '',
        status: v['进度'] || '',
        nextStep: v['下一步'] || '',
        note: v['备注'] || '',
        deadline: v['下一步'] ? v['下一步'].match(/\d{1,2}\/\d{1,2}/)?.[0] : null
      }))
    });
  }

  // J.A.R.V.I.S. 项目
  if (taskBoard['J-A-R-V-I-S']) {
    const s = taskBoard['J-A-R-V-I-S'];
    // 计算 JARVIS 项目总体进度
    const subTasks = Object.values(s._subtasks || {});
    const completedCount = subTasks.filter(t =>
      t['进度'] && (t['进度'].includes('✅') || t['进度'].includes('完成'))
    ).length;
    const totalCount = subTasks.length;
    const jarvisProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    projects.push({
      id: 'jarvis-web',
      name: 'J.A.R.V.I.S. Web面板',
      icon: '🎮',
      type: 'project',
      status: 'active',
      distance: 'near',
      description: s.description || '人生仪表盘',
      progress: jarvisProgress,
      link: 'https://jarvis-web-ashen.vercel.app',
      lastUpdated: taskBoard['last_updated'] || new Date().toISOString(),
      subTasks: subTasks.map((v, i) => ({
        name: Object.keys(s._subtasks || {})[i],
        owner: v['负责'] || '',
        status: v['进度'] || '',
        nextStep: v['下一步'] || '',
        note: v['备注'] || '',
        deadline: v['下一步'] ? v['下一步'].match(/\d{1,2}\/\d{1,2}/)?.[0] : null
      }))
    });
  }

  // 3. 生成同步数据
  const syncData = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    source: '~/.shared/task-board.json',
    projects,
    summary: {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'active').length,
      blockedProjects: projects.filter(p => p.status === 'blocked').length,
      completedProjects: projects.filter(p => p.status === 'completed').length
    },
    lastUpdated: taskBoard['last_updated'] || new Date().toISOString()
  };

  // 4. 写入文件
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(syncData, null, 2), 'utf8');
  console.log(`✅ 同步完成: ${OUTPUT_PATH}`);
  console.log(`   - 项目数: ${projects.length}`);
  console.log(`   - 进行中: ${syncData.summary.activeProjects}`);
  console.log(`   - 阻塞: ${syncData.summary.blockedProjects}`);

  // 5. 生成有意义的一天同步数据
  syncMeaningfulDay(taskBoard);
}

sync();
