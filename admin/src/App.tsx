import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Layout, message } from 'antd';
import { useUserStore } from './store/useUserStore';
import MainLayout from './components/MainLayout';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import OrderListPage from './pages/OrderList';
import OrderDetailPage from './pages/OrderDetail';
import WorkerListPage from './pages/WorkerList';
import StatsPage from './pages/Stats';

const { Content } = Layout;

const App: React.FC = () => {
  const { isLogin, initFromStorage } = useUserStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useEffect(() => {
    if (!isLogin && location.pathname !== '/login') {
      message.warning('请先登录');
      navigate('/login');
    }
  }, [isLogin, location.pathname, navigate]);

  if (!isLogin && location.pathname !== '/login') {
    return null;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          isLogin ? (
            <MainLayout>
              <Content style={{ background: '#f5f7fa', minHeight: 'calc(100vh - 64px)' }}>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/orders" element={<OrderListPage />} />
                  <Route path="/orders/:id" element={<OrderDetailPage />} />
                  <Route path="/workers" element={<WorkerListPage />} />
                  <Route path="/stats" element={<StatsPage />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Content>
            </MainLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
};

export default App;
