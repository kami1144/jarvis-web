/**
 * JARVIS Firebase 初始化
 * 认证 + 实时数据库
 */

// Firebase 配置（需要替换为你自己的配置）
const firebaseConfig = {
  apiKey: "AIzaSyBXOBNP-df7G-8BE0GEDlQRsTvaXDRAYTc",
  authDomain: "jarvis-199f2.firebaseapp.com",
  projectId: "jarvis-199f2",
  storageBucket: "jarvis-199f2.firebasestorage.app",
  messagingSenderId: "195625659217",
  appId: "1:195625659217:web:5e52900f03293d01d94170",
  measurementId: "G-BLCSRHQTMG"
};

// 初始化 Firebase
let app, auth, db;

function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.warn('⚠️ Firebase SDK 未加载，跳过初始化');
    return false;
  }
  
  app = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
  
  console.log('🔥 Firebase 初始化完成');
  return true;
}

// 监听认证状态
function onAuthStateChange(callback) {
  if (!auth) return () => {};
  return auth.onAuthStateChanged(callback);
}

// 获取当前用户
function getCurrentUser() {
  return auth?.currentUser || null;
}

// Google 登录
async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    console.log('✅ Google 登录成功:', result.user.email);
    return result.user;
  } catch (error) {
    console.error('❌ Google 登录失败:', error);
    throw error;
  }
}

// Apple 登录
async function signInWithApple() {
  const provider = new firebase.auth.OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  
  try {
    const result = await auth.signInWithPopup(provider);
    console.log('✅ Apple 登录成功:', result.user.email);
    return result.user;
  } catch (error) {
    console.error('❌ Apple 登录失败:', error);
    throw error;
  }
}

// 邮箱登录
async function signInWithEmail(email, password) {
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    console.log('✅ 邮箱登录成功:', result.user.email);
    return result.user;
  } catch (error) {
    console.error('❌ 邮箱登录失败:', error);
    throw error;
  }
}

// 邮箱注册
async function signUpWithEmail(email, password) {
  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    console.log('✅ 邮箱注册成功:', result.user.email);
    return result.user;
  } catch (error) {
    console.error('❌ 邮箱注册失败:', error);
    throw error;
  }
}

// 登出
async function signOut() {
  try {
    await auth.signOut();
    console.log('👋 已登出');
  } catch (error) {
    console.error('❌ 登出失败:', error);
    throw error;
  }
}

// 获取用户专属数据key
function getUserDataKey(user) {
  return user ? `jarvis_data_${user.uid}` : 'jarvis_data_guest';
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
});
