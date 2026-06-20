import { create } from 'zustand';
import { User } from '../types';
import { api } from '../services/api';
import { message } from 'antd';

interface UserState {
  user: User | null;
  token: string | null;
  isLogin: boolean;
  login: (phone: string, password: string) => Promise<void>;
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
      console.log('[UserStore] 登录:', phone);
      const result = await api.auth.login(phone, password) as any;
      
      const { token, user } = result;
      
      localStorage.setItem('token', token);
      localStorage.setItem('userInfo', JSON.stringify(user));
      
      set({ user, token, isLogin: true });
      
      console.log('[UserStore] 登录成功:', user.name);
      message.success('登录成功');
    } catch (error: any) {
      console.error('[UserStore] 登录失败:', error);
      message.error(error.message || '登录失败');
      throw error;
    }
  },

  logout: () => {
    console.log('[UserStore] 退出登录');
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    set({ user: null, token: null, isLogin: false });
    message.success('已退出登录');
  },

  updateUser: (userData: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData } as User;
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    }
  },

  fetchProfile: async () => {
    try {
      console.log('[UserStore] 获取用户信息');
      const user = await api.auth.getProfile();
      localStorage.setItem('userInfo', JSON.stringify(user));
      set({ user: user as User });
    } catch (error) {
      console.error('[UserStore] 获取用户信息失败:', error);
    }
  },

  initFromStorage: () => {
    const token = localStorage.getItem('token');
    const userInfo = localStorage.getItem('userInfo');
    
    if (token && userInfo) {
      console.log('[UserStore] 从本地存储恢复登录状态');
      try {
        set({
          user: JSON.parse(userInfo),
          token,
          isLogin: true
        });
      } catch (error) {
        console.error('[UserStore] 解析用户信息失败:', error);
      }
    }
  }
}));
