/**
 * JARVIS 认证系统
 * 登录弹窗 + 认证状态管理
 */

// 当前用户
let currentUser = null;
let isGuestMode = true;

// 登录弹窗HTML
const loginModalHTML = `
<div id="loginModal" class="login-modal" style="display:none;">
  <div class="login-backdrop"></div>
  <div class="login-container">
    <div class="login-header">
      <h2>⚔️ J.A.R.V.I.S.</h2>
      <p>人生游戏操控台</p>
    </div>
    
    <div class="login-divider">
      <span>登录以开始</span>
    </div>
    
    <div class="login-buttons">
      <button id="googleSignIn" class="login-btn login-btn-google">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span>Google 登录</span>
      </button>
      
      <button id="appleSignIn" class="login-btn login-btn-apple">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.36c1.35.04 2.18.63 3.3.35 1.18-.36 2.27-.31 3.2.34.23.15.42.32.61.5 1.15.92 1.38 2.15.72 3.64-.25.44-.51.88-.77 1.32-.3.3-.6.32-.92.02-.15-.18-.3-.33-.45-.5z"/>
          <path fill="currentColor" d="M12.93 5.3c1.67-.68 3.15-1.74 3.35-2.55.13-.52-.4-.92-1.2-.74-.45.1-.87.32-1.25.55-.25-.67-.69-1.27-1.32-1.66-1.38-.96-3.42-.96-4.8 0-.63.39-1.07.99-1.32 1.66-.38-.23-.8-.45-1.25-.55-.8-.18-1.33.22-1.2.74.2.81 1.68 1.87 3.35 2.55.87.33 1.73.5 2.6.5.87 0 1.73-.17 2.6-.5z"/>
        </svg>
        <span>Apple 登录</span>
      </button>
      
      <div class="login-or">
        <span>或</span>
      </div>
      
      <button id="guestMode" class="login-btn login-btn-guest">
        <span>先看看（游客模式）</span>
      </button>
    </div>
    
    <div class="login-footer">
      <p>登录即表示同意我们的<span class="link">服务条款</span>和<span class="link">隐私政策</span></p>
    </div>
  </div>
</div>
`;

// 样式
const loginStyles = `
.login-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
}

.login-container {
  position: relative;
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 40px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  animation: loginSlideIn 0.3s ease;
}

@keyframes loginSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h2 {
  font-size: 28px;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.login-header p {
  color: #888;
  margin: 0;
  font-size: 14px;
}

.login-divider {
  text-align: center;
  margin: 20px 0;
  color: #666;
  font-size: 13px;
  position: relative;
}

.login-divider::before,
.login-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 35%;
  height: 1px;
  background: linear-gradient(90deg, transparent, #444, transparent);
}

.login-divider::before { left: 0; }
.login-divider::after { right: 0; }

.login-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(0,0,0,0.3);
}

.login-btn:active {
  transform: translateY(0);
}

.login-btn-google {
  background: #fff;
  color: #333;
}

.login-btn-google:hover {
  background: #f5f5f5;
}

.login-btn-apple {
  background: #000;
  color: #fff;
}

.login-btn-apple:hover {
  background: #1a1a1a;
}

.login-btn-guest {
  background: rgba(255,255,255,0.05);
  color: #888;
  border: 1px solid rgba(255,255,255,0.1);
}

.login-btn-guest:hover {
  background: rgba(255,255,255,0.1);
  color: #aaa;
}

.login-or {
  text-align: center;
  color: #555;
  font-size: 12px;
  margin: 8px 0;
}

.login-footer {
  margin-top: 25px;
  text-align: center;
}

.login-footer p {
  color: #555;
  font-size: 11px;
  margin: 0;
}

.login-footer .link {
  color: #667eea;
  cursor: pointer;
}

.login-footer .link:hover {
  text-decoration: underline;
}

/* 登出按钮样式 */
.user-menu {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.user-email {
  font-size: 13px;
  color: #888;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-btn {
  background: rgba(255,255,255,0.1);
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: rgba(255,255,255,0.15);
  color: #fff;
}

/* 会员标签 */
.vip-badge {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: #fff;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.free-badge {
  background: rgba(255,255,255,0.1);
  color: #888;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
}
`;

// 初始化登录系统
function initAuth() {
  // 注入样式
  const styleSheet = document.createElement('style');
  styleSheet.textContent = loginStyles;
  document.head.appendChild(styleSheet);
  
  // 注入HTML
  document.body.insertAdjacentHTML('beforeend', loginModalHTML);
  
  // 绑定事件
  bindAuthEvents();
  
  // 监听认证状态
  if (typeof onAuthStateChange === 'function') {
    onAuthStateChange(handleAuthStateChange);
  }
}

// 绑定认证事件
function bindAuthEvents() {
  const modal = document.getElementById('loginModal');
  const backdrop = modal?.querySelector('.login-backdrop');
  const googleBtn = document.getElementById('googleSignIn');
  const appleBtn = document.getElementById('appleSignIn');
  const guestBtn = document.getElementById('guestMode');
  
  // Google 登录
  googleBtn?.addEventListener('click', async () => {
    googleBtn.disabled = true;
    googleBtn.textContent = '登录中...';
    try {
      const user = await signInWithGoogle();
      hideLoginModal();
      handleLoginSuccess(user);
    } catch (error) {
      alert('登录失败: ' + error.message);
      googleBtn.disabled = false;
      googleBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg><span>Google 登录</span>';
    }
  });
  
  // Apple 登录
  appleBtn?.addEventListener('click', async () => {
    appleBtn.disabled = true;
    appleBtn.textContent = '登录中...';
    try {
      const user = await signInWithApple();
      hideLoginModal();
      handleLoginSuccess(user);
    } catch (error) {
      alert('登录失败: ' + error.message);
      appleBtn.disabled = false;
      appleBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.36c1.35.04 2.18.63 3.3.35 1.18-.36 2.27-.31 3.2.34.23.15.42.32.61.5 1.15.92 1.38 2.15.72 3.64-.25.44-.51.88-.77 1.32-.3.3-.6.32-.92.02-.15-.18-.3-.33-.45-.5z"/><path fill="currentColor" d="M12.93 5.3c1.67-.68 3.15-1.74 3.35-2.55.13-.52-.4-.92-1.2-.74-.45.1-.87.32-1.25.55-.25-.67-.69-1.27-1.32-1.66-1.38-.96-3.42-.96-4.8 0-.63.39-1.07.99-1.32 1.66-.38-.23-.8-.45-1.25-.55-.8-.18-1.33.22-1.2.74.2.81 1.68 1.87 3.35 2.55.87.33 1.73.5 2.6.5.87 0 1.73-.17 2.6-.5z"/></svg><span>Apple 登录</span>';
    }
  });
  
  // 游客模式
  guestBtn?.addEventListener('click', () => {
    hideLoginModal();
    handleGuestMode();
  });
  
  // 点击背景关闭（不允许，只能操作按钮）
  backdrop?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
}

// 处理认证状态变化
function handleAuthStateChange(user) {
  currentUser = user;
  
  if (user) {
    // 已登录
    isGuestMode = false;
    console.log('✅ 已登录:', user.email);
    updateUIForLoggedInUser(user);
    loadUserData(user.uid);
  } else {
    // 未登录，显示登录弹窗（每次都会显示）
    showLoginModal();
  }
}

// 显示登录弹窗
function showLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

// 隐藏登录弹窗
function hideLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// 登录成功处理
function handleLoginSuccess(user) {
  currentUser = user;
  isGuestMode = false;
  updateUIForLoggedInUser(user);
  
  // 显示欢迎提示
  showToast(`欢迎回来，${user.displayName || user.email}！`);
}

// 游客模式处理
function handleGuestMode() {
  isGuestMode = true;
  currentUser = null;
  updateUIForGuestUser();
  loadGuestData();
  showToast('游客模式已启动，数据保存在本地');
}

// 更新UI（已登录）
function updateUIForLoggedInUser(user) {
  // 更新头部用户信息
  const headerRight = document.querySelector('.header-right');
  if (headerRight) {
    const initial = (user.displayName || user.email || 'U')[0].toUpperCase();
    headerRight.innerHTML = `
      <span class="live-indicator">
        <span class="live-dot"></span>
        <span id="liveStatus">实时联动</span>
      </span>
      <span class="date" id="currentDate"></span>
      <div class="user-menu">
        <div class="user-avatar">${initial}</div>
        <span class="user-email">${user.email}</span>
        <span class="free-badge">免费版</span>
        <button class="logout-btn" onclick="handleLogout()">登出</button>
      </div>
    `;
  }
}

// 更新UI（游客）
function updateUIForGuestUser() {
  const headerRight = document.querySelector('.header-right');
  if (headerRight) {
    headerRight.innerHTML = `
      <span class="live-indicator">
        <span class="live-dot"></span>
        <span id="liveStatus">实时联动</span>
      </span>
      <span class="date" id="currentDate"></span>
      <div class="user-menu">
        <div class="user-avatar">👤</div>
        <span class="user-email">游客</span>
        <button class="logout-btn" onclick="showLoginModal()">登录</button>
      </div>
    `;
  }
}

// 登出处理
async function handleLogout() {
  try {
    await signOut();
    currentUser = null;
    showLoginModal();
    showToast('已登出');
  } catch (error) {
    console.error('登出失败:', error);
  }
}

// 加载用户数据
function loadUserData(uid) {
  const userDataKey = `jarvis_data_${uid}`;
  const savedData = localStorage.getItem(userDataKey);
  
  if (savedData) {
    try {
      const data = JSON.parse(savedData);
      console.log('📂 用户数据已加载:', userDataKey);
      // TODO: 用用户数据覆盖当前数据
    } catch (e) {
      console.error('加载用户数据失败:', e);
    }
  }
}

// 加载游客数据
function loadGuestData() {
  const guestDataKey = 'jarvis_data_guest';
  const savedData = localStorage.getItem(guestDataKey);
  
  if (savedData) {
    try {
      const data = JSON.parse(savedData);
      console.log('📂 游客数据已加载');
    } catch (e) {
      console.error('加载数据失败:', e);
    }
  }
}

// 保存当前用户数据
function saveCurrentUserData() {
  const data = window.JARVIS?.getAllData?.();
  if (!data) return;
  
  const key = isGuestMode ? 'jarvis_data_guest' : `jarvis_data_${currentUser?.uid}`;
  localStorage.setItem(key, JSON.stringify(data));
  console.log('💾 数据已保存:', key);
}

// Toast 提示
function showToast(message) {
  const existing = document.querySelector('.toast-message');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.9);
    color: #fff;
    padding: 12px 24px;
    border-radius: 30px;
    font-size: 14px;
    z-index: 10001;
    animation: toastFade 0.3s ease;
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes toastFade {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// 自动保存（每30秒）
setInterval(saveCurrentUserData, 30000);

// 页面卸载前保存
window.addEventListener('beforeunload', saveCurrentUserData);

// 导出
window.JARVIS_AUTH = {
  initAuth,
  showLoginModal,
  hideLoginModal,
  handleLogout,
  saveCurrentUserData,
  isGuestMode: () => isGuestMode,
  getCurrentUser: () => currentUser
};
