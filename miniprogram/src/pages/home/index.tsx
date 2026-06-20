import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import styles from './index.module.scss';
import { useUserStore } from '../../store/useUserStore';
import { mockOrders, mockOwnerDashboard, mockWorkerDashboard } from '../../data/mock';
import OrderCard from '../../components/OrderCard';
import { RepairOrder } from '../../types';
import classnames from 'classnames';

const HomePage: React.FC = () => {
  const { user, isLogin, initFromStorage } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [recentOrders, setRecentOrders] = useState<RepairOrder[]>([]);
  const [stats, setStats] = useState<any>(null);

  const loadData = useCallback(async () => {
    if (!isLogin) {
      Taro.redirectTo({ url: '/pages/login/index' });
      return;
    }

    try {
      setLoading(true);
      console.log('[HomePage] 加载首页数据');

      if (user?.role === 'worker') {
        setStats(mockWorkerDashboard);
        setRecentOrders(mockOrders.filter(o => 
          o.status === 'assigned' || o.status === 'processing'
        ).slice(0, 3));
      } else {
        setStats(mockOwnerDashboard);
        setRecentOrders(mockOrders.slice(0, 3));
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('[HomePage] 加载失败:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
      Taro.stopPullDownRefresh();
    }
  }, [isLogin, user]);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useDidShow(() => {
    if (isLogin) {
      loadData();
    }
  });

  usePullDownRefresh(() => {
    loadData();
  });

  const handleQuickAction = () => {
    if (user?.role === 'worker') {
      Taro.switchTab({ url: '/pages/orders/index' });
    } else {
      Taro.switchTab({ url: '/pages/repair/index' });
    }
  };

  const handleSeeAll = () => {
    Taro.switchTab({ url: '/pages/orders/index' });
  };

  const getRoleText = (role: string) => {
    const roleMap: Record<string, string> = {
      owner: '业主',
      worker: '维修师傅',
      admin: '管理员',
      manager: '经理'
    };
    return roleMap[role] || role;
  };

  const renderOwnerContent = () => (
    <>
      <ScrollView scrollX className={styles.statsContainer}>
        <View className={styles.statsCard}>
          <Text className={styles.statNumber}>{stats?.totalOrders || 0}</Text>
          <Text className={styles.statLabel}>全部工单</Text>
        </View>
        <View className={styles.statsCard}>
          <Text className={classnames(styles.statNumber, styles.warning)}>{stats?.pendingOrders || 0}</Text>
          <Text className={styles.statLabel}>待处理</Text>
        </View>
        <View className={styles.statsCard}>
          <Text className={classnames(styles.statNumber, styles.processing)}>{stats?.processingOrders || 0}</Text>
          <Text className={styles.statLabel}>处理中</Text>
        </View>
        <View className={styles.statsCard}>
          <Text className={classnames(styles.statNumber, styles.success)}>{stats?.completedOrders || 0}</Text>
          <Text className={styles.statLabel}>已完成</Text>
        </View>
      </ScrollView>
    </>
  );

  const renderWorkerContent = () => (
    <>
      <View className={styles.workerStats}>
        <View className={styles.statRow}>
          <View className={styles.statItem}>
            <Text className={classnames(styles.statNumber, styles.warning)}>{stats?.todayOrders || 0}</Text>
            <Text className={styles.statLabel}>今日工单</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={classnames(styles.statNumber, styles.processing)}>{stats?.pendingOrders || 0}</Text>
            <Text className={styles.statLabel}>待处理</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={classnames(styles.statNumber, styles.success)}>{stats?.completedOrders || 0}</Text>
            <Text className={styles.statLabel}>今日完成</Text>
          </View>
        </View>
        <View className={styles.statRow}>
          <View className={styles.statItem}>
            <Text className={styles.statNumber}>{stats?.avgResponseTime || 0}</Text>
            <Text className={styles.statLabel}>平均响应(分钟)</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNumber}>{stats?.avgCompletionTime || 0}</Text>
            <Text className={styles.statLabel}>平均处理(分钟)</Text>
          </View>
        </View>
      </View>
    </>
  );

  if (!isLogin) {
    return null;
  }

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.welcomeText}>👋 欢迎回来</Text>
        <Text className={styles.userName}>{user?.name || '用户'}</Text>
        <View className={styles.roleTag}>{getRoleText(user?.role || 'owner')}</View>
      </View>

      <View className={styles.quickAction}>
        <Button className={styles.actionBtn} onClick={handleQuickAction}>
          {user?.role === 'worker' ? '📋 查看我的工单' : '🔧 一键报修'}
        </Button>
      </View>

      <View className={styles.section}>
        {user?.role === 'worker' ? renderWorkerContent() : renderOwnerContent()}
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>
            {user?.role === 'worker' ? '待处理工单' : '最近工单'}
          </Text>
          <Text className={styles.seeAll} onClick={handleSeeAll}>查看全部 ›</Text>
        </View>

        {loading && recentOrders.length === 0 ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>⏳</Text>
            <Text className={styles.emptyText}>加载中...</Text>
          </View>
        ) : recentOrders.length > 0 ? (
          recentOrders.map(order => (
            <OrderCard key={order.id} order={order} showWorker={user?.role === 'worker'} />
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📋</Text>
            <Text className={styles.emptyText}>暂无工单</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default HomePage;
