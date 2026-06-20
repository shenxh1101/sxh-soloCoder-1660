import Taro from '@tarojs/taro';

const BASE_URL = process.env.TARO_ENV === 'h5' 
  ? '/api' 
  : 'http://localhost:3000/api';

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
  showLoading?: boolean;
}

const request = async <T = any>(options: RequestOptions): Promise<T> => {
  const { url, method = 'GET', data, header = {}, showLoading = true } = options;

  const token = Taro.getStorageSync('token');
  if (token) {
    header['Authorization'] = `Bearer ${token}`;
  }

  if (showLoading) {
    Taro.showLoading({ title: '加载中...', mask: true });
  }

  try {
    console.log(`[API] ${method} ${url}`, data);

    const response = await Taro.request({
      url: BASE_URL + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...header
      },
      timeout: 15000
    });

    console.log(`[API] Response ${method} ${url}:`, response.data);

    if (showLoading) {
      Taro.hideLoading();
    }

    const result = response.data as any;

    if (result.success) {
      return result.data as T;
    } else {
      Taro.showToast({
        title: result.message || '请求失败',
        icon: 'none',
        duration: 2000
      });
      return Promise.reject(new Error(result.message || '请求失败'));
    }
  } catch (error: any) {
    console.error(`[API] Error ${method} ${url}:`, error);
    
    if (showLoading) {
      Taro.hideLoading();
    }

    if (error.statusCode === 401) {
      Taro.removeStorageSync('token');
      Taro.removeStorageSync('userInfo');
      Taro.redirectTo({ url: '/pages/login/index' });
    }

    Taro.showToast({
      title: error.message || '网络错误',
      icon: 'none',
      duration: 2000
    });

    return Promise.reject(error);
  }
};

export const api = {
  auth: {
    login: (phone: string, password: string) => 
      request({ url: '/auth/login', method: 'POST', data: { phone, password } }),
    
    wechatLogin: (code: string, userInfo?: any) =>
      request({ url: '/auth/wechat-login', method: 'POST', data: { code, userInfo } }),
    
    getProfile: () =>
      request({ url: '/auth/profile' }),
    
    updateProfile: (data: any) =>
      request({ url: '/auth/profile', method: 'PUT', data })
  },

  orders: {
    create: (data: any) =>
      request({ url: '/orders', method: 'POST', data }),
    
    getList: (params?: any) =>
      request({ url: '/orders', method: 'GET', data: params }),
    
    getDetail: (id: string) =>
      request({ url: `/orders/${id}` }),
    
    assign: (id: string, workerId: string, remark?: string) =>
      request({ url: `/orders/${id}/assign`, method: 'PUT', data: { workerId, remark } }),
    
    start: (id: string) =>
      request({ url: `/orders/${id}/start`, method: 'PUT' }),
    
    complete: (id: string, data: any) =>
      request({ url: `/orders/${id}/complete`, method: 'PUT', data }),
    
    rate: (id: string, score: number, comment?: string) =>
      request({ url: `/orders/${id}/rate`, method: 'PUT', data: { score, comment } }),
    
    cancel: (id: string, reason?: string) =>
      request({ url: `/orders/${id}/cancel`, method: 'PUT', data: { reason } }),
    
    getWorkerWorkload: () =>
      request({ url: '/orders/workers/workload' })
  },

  users: {
    getWorkers: (params?: any) =>
      request({ url: '/users/workers', method: 'GET', data: params }),
    
    createWorker: (data: any) =>
      request({ url: '/users/workers', method: 'POST', data }),
    
    updateWorker: (id: string, data: any) =>
      request({ url: `/users/workers/${id}`, method: 'PUT', data }),
    
    getList: (params?: any) =>
      request({ url: '/users', method: 'GET', data: params })
  },

  stats: {
    getDashboard: () =>
      request({ url: '/stats/dashboard' }),
    
    getRepairTypeStats: (params?: any) =>
      request({ url: '/stats/repair-types', method: 'GET', data: params }),
    
    getWorkerStats: (params?: any) =>
      request({ url: '/stats/workers', method: 'GET', data: params }),
    
    exportOrders: (params?: any) =>
      request({ url: '/stats/export', method: 'GET', data: params })
  }
};

export default request;
