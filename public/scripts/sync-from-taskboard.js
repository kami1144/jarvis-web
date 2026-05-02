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
        note: v['备注'] || ''
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
        note: v['备注'] || ''
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
        note: v['备注'] || ''
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
        note: v['备注'] || ''
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
}

sync();
