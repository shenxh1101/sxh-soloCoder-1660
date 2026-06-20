import axios from 'axios';

const request = axios.create({
  baseURL: '/api',
  timeout: 15000
});

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

request.interceptors.response.use(
  (response) => {
    console.log(`[API] Response ${response.config.url}:`, response.data);
    const result = response.data;
    if (result.success) {
      return result.data;
    } else {
      return Promise.reject(new Error(result.message || '请求失败'));
    }
  },
  (error) => {
    console.error('[API] Response error:', error);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export const api = {
  auth: {
    login: (phone: string, password: string) =>
      request.post('/auth/login', { phone, password }),
    
    getProfile: () =>
      request.get('/auth/profile'),
    
    updateProfile: (data: any) =>
      request.put('/auth/profile', data)
  },

  orders: {
    getList: (params?: any) =>
      request.get('/orders', { params }),
    
    getDetail: (id: string) =>
      request.get(`/orders/${id}`),
    
    assign: (id: string, workerId: string, remark?: string) =>
      request.put(`/orders/${id}/assign`, { workerId, remark }),
    
    start: (id: string) =>
      request.put(`/orders/${id}/start`),
    
    complete: (id: string, data: any) =>
      request.put(`/orders/${id}/complete`, data),
    
    rate: (id: string, score: number, comment?: string) =>
      request.put(`/orders/${id}/rate`, { score, comment }),
    
    cancel: (id: string, reason?: string) =>
      request.put(`/orders/${id}/cancel`, { reason }),
    
    getWorkerWorkload: () =>
      request.get('/orders/workers/workload')
  },

  users: {
    getWorkers: (params?: any) =>
      request.get('/users/workers', { params }),
    
    createWorker: (data: any) =>
      request.post('/users/workers', data),
    
    updateWorker: (id: string, data: any) =>
      request.put(`/users/workers/${id}`, data),
    
    getList: (params?: any) =>
      request.get('/users', { params }),
    
    delete: (id: string) =>
      request.delete(`/users/${id}`)
  },

  stats: {
    getDashboard: () =>
      request.get('/stats/dashboard'),
    
    getRepairTypeStats: (params?: any) =>
      request.get('/stats/repair-types', { params }),
    
    getWorkerStats: (params?: any) =>
      request.get('/stats/workers', { params }),
    
    exportOrders: (params?: any) =>
      request.get('/stats/export', { params, responseType: 'blob' })
  }
};

export default request;
