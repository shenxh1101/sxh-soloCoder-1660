import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Button } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh, useReachBottom } from '@tarojs/taro';
import styles from './index.module.scss';
import { useUserStore } from '../../store/useUserStore';
import { api } from '../../services/api';
import { normalizeOrder } from '../../utils';
import OrderCard from '../../components/OrderCard';
import { RepairOrder, OrderStatus, statusTextMap } from '../../types';
import classnames from 'classnames';

const filterOptions = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待派单' },
  { value: 'assigned', label: '已派单' },
  { value: 'processing', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
];

const OrdersPage: React.FC = () => {
  const { user, isLogin, initFromStorage } = useUserStore();
  const [currentFilter, setCurrentFilter] = useState<string>('');
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [allOrders, setAllOrders] = useState<RepairOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadOrders = useCallback(async (reset = false) => {
    if (!isLogin) {
      Taro.redirectTo({ url: '/pages/login/index' });
      return;
    }

    try {
      setLoading(true);
      console.log('[OrdersPage] 加载工单列表, 筛选:', currentFilter);

      const currentPage = reset ? 1 : page;
      const result = await api.orders.getList({
        page: currentPage,
        pageSize: 10,
        status: currentFilter || undefined
      });

      const rawList: any[] = result?.list || result || [];
      const list = rawList.map(normalizeOrder);
      const total: number = result?.total ?? list.length;

      if (reset) {
        setAllOrders(list);
        setOrders(list);
        setPage(1);
        setHasMore(total > list.length);
      } else {
        setAllOrders(prev => [...prev, ...list]);
        setOrders(prev => [...prev, ...list]);
        setHasMore((currentPage * 10) < total);
      }
    } catch (error) {
      console.error('[OrdersPage] 加载失败:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
      Taro.stopPullDownRefresh();
    }
  }, [isLogin, currentFilter, page, user]);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useDidShow(() => {
    if (isLogin) {
      loadOrders(true);
    }
  });

  usePullDownRefresh(() => {
    loadOrders(true);
  });

  useReachBottom(() => {
    if (hasMore && !loading) {
      setPage(p => p + 1);
      loadOrders(false);
    }
  });

  useEffect(() => {
    if (isLogin) {
      loadOrders(true);
    }
  }, [currentFilter]);

  const getFilterCount = (value: string) => {
    if (!value) return allOrders.length;
    return allOrders.filter(o => o.status === value).length;
  };

  const handleFilterChange = (value: string) => {
    setCurrentFilter(value);
  };

  const handleGoRepair = () => {
    Taro.switchTab({ url: '/pages/repair/index' });
  };

  if (!isLogin) {
    return null;
  }

  return (
    <View className={styles.page}>
      <View className={styles.filterContainer}>
        <ScrollView scrollX className={styles.filterScroll}>
          {filterOptions.map(option => (
            <View
              key={option.value}
              className={classnames(styles.filterItem, {
                [styles.active]: currentFilter === option.value
              })}
              onClick={() => handleFilterChange(option.value)}
            >
              <Text>{option.label}</Text>
              <Text className={styles.filterCount}>({getFilterCount(option.value)})</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View className={styles.listContainer}>
        {loading && orders.length === 0 ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>⏳</Text>
            <Text className={styles.emptyText}>加载中...</Text>
          </View>
        ) : orders.length > 0 ? (
          <>
            {orders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                showWorker={user?.role === 'worker'}
              />
            ))}
            
            {hasMore && (
              <View className={styles.loadMore}>
                {loading ? '加载中...' : '上拉加载更多'}
              </View>
            )}
            {!hasMore && orders.length > 0 && (
              <View className={styles.loadMore}>没有更多了</View>
            )}
          </>
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📋</Text>
            <Text className={styles.emptyText}>
              {currentFilter ? `暂无${statusTextMap[currentFilter as OrderStatus]}的工单` : '暂无工单'}
            </Text>
            {user?.role !== 'worker' && (
              <Button className={styles.emptyBtn} onClick={handleGoRepair}>
                立即报修
              </Button>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

export default OrdersPage;
