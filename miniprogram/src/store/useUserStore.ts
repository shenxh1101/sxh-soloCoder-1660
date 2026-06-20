import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { User } from '../types';
import { api } from '../services/api';

interface UserState {
  user: User | null;
  token: string | null;
  isLogin: boolean;
  login: (phone: string, password: string) => Promise<void>;
  wechatLogin: (code: string, userInfo?: any) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  fetchProfile: () => Promise<void>;
  initFromStorage: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  token: null,
  isLogin: false,

  login: async (phone: string, password: string) => {
    try {
      console.log('[UserStore] 开始登录:', phone);
      const result = await api.auth.login(phone, password);
      
      const { token, user } = result as any;
      
      Taro.setStorageSync('token', token);
      Taro.setStorageSync('userInfo', user);
      
      set({
        user,
        token,
        isLogin: true
      });
      
      console.log('[UserStore] 登录成功:', user.name);
    } catch (error) {
      console.error('[UserStore] 登录失败:', error);
      throw error;
    }
  },

  wechatLogin: async (code: string, userInfo?: any) => {
    try {
      console.log('[UserStore] 微信登录');
      const result = await api.auth.wechatLogin(code, userInfo);
      
      const { token, user } = result as any;
      
      Taro.setStorageSync('token', token);
      Taro.setStorageSync('userInfo', user);
      
      set({
        user,
        token,
        isLogin: true
      });
      
      console.log('[UserStore] 微信登录成功:', user.name);
    } catch (error) {
      console.error('[UserStore] 微信登录失败:', error);
      throw error;
    }
  },

  logout: () => {
    console.log('[UserStore] 退出登录');
    Taro.removeStorageSync('token');
    Taro.removeStorageSync('userInfo');
    set({
      user: null,
      token: null,
      isLogin: false
    });
  },

  updateUser: (userData: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData } as User;
      Taro.setStorageSync('userInfo', updatedUser);
      set({ user: updatedUser });
    }
  },

  fetchProfile: async () => {
    try {
      console.log('[UserStore] 获取用户信息');
      const user = await api.auth.getProfile();
      Taro.setStorageSync('userInfo', user);
      set({ user: user as User });
    } catch (error) {
      console.error('[UserStore] 获取用户信息失败:', error);
    }
  },

  initFromStorage: () => {
    const token = Taro.getStorageSync('token');
    const userInfo = Taro.getStorageSync('userInfo');
    
    if (token && userInfo) {
      console.log('[UserStore] 从本地存储恢复登录状态');
      set({
        user: userInfo,
        token,
        isLogin: true
      });
    }
  }
}));
