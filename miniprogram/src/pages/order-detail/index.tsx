import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, Button, ScrollView } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useUserStore } from '../../store/useUserStore';
import { RepairOrder, statusTextMap, priorityTextMap } from '../../types';
import { formatDate, formatDuration, getRepairTypeIcon, normalizeOrder } from '../../utils';
import Timeline from '../../components/Timeline';
import StatusTag from '../../components/StatusTag';
import { api } from '../../services/api';
import classnames from 'classnames';

const OrderDetailPage: React.FC = () => {
  const router = useRouter();
  const { user, isLogin, initFromStorage } = useUserStore();
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const orderId = router.params.id;

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      Taro.showToast({ title: '参数错误', icon: 'none' });
      return;
    }

    try {
      setLoading(true);
      console.log('[OrderDetail] 加载工单详情:', orderId);

      const data = await api.orders.getDetail(orderId);
      setOrder(normalizeOrder(data));
    } catch (error) {
      console.error('[OrderDetail] 加载失败:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useDidShow(() => {
    if (isLogin) {
      loadOrder();
    }
  });

  const handlePreviewImage = (urls: string[], current: number) => {
    Taro.previewImage({
      current: urls[current],
      urls
    });
  };

  const handleStartProcess = () => {
    Taro.navigateTo({
      url: `/pages/order-process/index?id=${orderId}`
    });
  };

  const handleRate = () => {
    Taro.navigateTo({
      url: `/pages/order-rate/index?id=${orderId}`
    });
  };

  const handleCancel = () => {
    Taro.showModal({
      title: '提示',
      content: '确定要取消该工单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.orders.cancel(orderId, '业主取消');
            Taro.showToast({ title: '取消成功', icon: 'success' });
            setTimeout(() => {
              Taro.navigateBack();
            }, 1000);
          } catch (error) {
            console.error('[OrderDetail] 取消失败:', error);
          }
        }
      }
    });
  };

  const renderFooter = () => {
    if (!order) return null;

    if (user?.role === 'worker') {
      if (order.status === 'assigned') {
        return (
          <View className={styles.footer}>
            <Button className={styles.btnPrimary} onClick={handleStartProcess}>
              开始处理
            </Button>
          </View>
        );
      }
      if (order.status === 'processing') {
        return (
          <View className={styles.footer}>
            <Button className={styles.btnPrimary} onClick={handleStartProcess}>
              继续处理 / 完成
            </Button>
          </View>
        );
      }
      return null;
    }

    if (user?.role === 'owner') {
      if (order.status === 'pending' || order.status === 'assigned') {
        return (
          <View className={styles.footer}>
            <Button className={styles.btnDanger} onClick={handleCancel}>
              取消工单
            </Button>
          </View>
        );
      }
      if (order.status === 'completed') {
        return (
          <View className={styles.footer}>
            <Button className={styles.btnPrimary} onClick={handleRate}>
              立即评价
            </Button>
          </View>
        );
      }
    }

    return null;
  };

  if (!isLogin) {
    Taro.redirectTo({ url: '/pages/login/index' });
    return null;
  }

  if (loading) {
    return (
      <View className={styles.page}>
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>⏳</Text>
          <Text className={styles.emptyText}>加载中...</Text>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View className={styles.page}>
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>📋</Text>
          <Text className={styles.emptyText}>工单不存在</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.page}>
      <View className={styles.orderHeader}>
        <Text className={styles.orderNo}>#{order.orderNo}</Text>
        <Text className={styles.orderTitle}>{order.title}</Text>
        <View className={styles.orderStatusRow}>
          <StatusTag status={order.status} size="lg" />
          <View className={styles.priorityBadge}>
            优先级：{priorityTextMap[order.priority]}
          </View>
        </View>
      </View>

      <ScrollView scrollY>
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>
            <Text className={styles.titleIcon}>{getRepairTypeIcon(order.repairType)}</Text>
            报修信息
          </Text>
          
          <View className={styles.detailRow}>
            <Text className={styles.detailLabel}>报修类型</Text>
            <Text className={styles.detailValue}>{order.repairTypeName}</Text>
          </View>
          <View className={styles.detailRow}>
            <Text className={styles.detailLabel}>问题描述</Text>
            <Text className={styles.detailValue}>{order.description}</Text>
          </View>
          
          {order.images && order.images.length > 0 && (
            <View className={styles.imageList}>
              {order.images.map((img, idx) => (
                <View key={idx} className={styles.imageItem}>
                  <Image
                    src={img}
                    className={styles.image}
                    mode="aspectFill"
                    onClick={() => handlePreviewImage(order.images!, idx)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>
            <Text className={styles.titleIcon}>📍</Text>
            位置信息
          </Text>
          
          <View className={styles.detailRow}>
            <Text className={styles.detailLabel}>报修位置</Text>
            <Text className={styles.detailValue}>
              {order.location?.building} {order.location?.room}
            </Text>
          </View>
          <View className={styles.detailRow}>
            <Text className={styles.detailLabel}>联系人</Text>
            <Text className={styles.detailValue}>{order.contact?.name}</Text>
          </View>
          <View className={styles.detailRow}>
            <Text className={styles.detailLabel}>联系电话</Text>
            <Text className={styles.detailValue}>{order.contact?.phone}</Text>
          </View>
        </View>

        {order.worker && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>
              <Text className={styles.titleIcon}>🔧</Text>
              维修人员
            </Text>
            
            <View className={styles.workerCard}>
              <View className={styles.workerAvatar}>
                {order.worker.name?.charAt(0)}
              </View>
              <View className={styles.workerInfo}>
                <Text className={styles.workerName}>{order.worker.name}</Text>
                <Text className={styles.workerSkills}>
                  技能：{order.worker.skills?.join('、') || '暂无'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {(order.responseTime || order.completionTime || order.totalTime) && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>
              <Text className={styles.titleIcon}>⏱️</Text>
              处理时效
            </Text>
            
            {order.responseTime && (
              <View className={styles.detailRow}>
                <Text className={styles.detailLabel}>响应时长</Text>
                <Text className={styles.detailValue}>{formatDuration(order.responseTime)}</Text>
              </View>
            )}
            {order.completionTime && (
              <View className={styles.detailRow}>
                <Text className={styles.detailLabel}>处理时长</Text>
                <Text className={styles.detailValue}>{formatDuration(order.completionTime)}</Text>
              </View>
            )}
            {order.totalTime && (
              <View className={styles.detailRow}>
                <Text className={styles.detailLabel}>总时长</Text>
                <Text className={styles.detailValue}>{formatDuration(order.totalTime)}</Text>
              </View>
            )}
          </View>
        )}

        {order.repairResult && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>
              <Text className={styles.titleIcon}>✅</Text>
              维修结果
            </Text>
            
            <View className={styles.detailRow}>
              <Text className={styles.detailLabel}>维修说明</Text>
              <Text className={styles.detailValue}>{order.repairResult.description}</Text>
            </View>
            
            {order.repairResult.images && order.repairResult.images.length > 0 && (
              <View className={styles.imageList}>
                {order.repairResult.images.map((img, idx) => (
                  <View key={idx} className={styles.imageItem}>
                    <Image
                      src={img}
                      className={styles.image}
                      mode="aspectFill"
                      onClick={() => handlePreviewImage(order.repairResult!.images!, idx)}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {order.rating && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>
              <Text className={styles.titleIcon}>⭐</Text>
              业主评价
            </Text>
            
            <View className={styles.ratingSection}>
              <View className={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Text
                    key={star}
                    className={classnames(styles.star, {
                      [styles.active]: star <= order.rating!.score
                    })}
                  >
                    ★
                  </Text>
                ))}
              </View>
              {order.rating.comment && (
                <Text className={styles.ratingComment}>{order.rating.comment}</Text>
              )}
              <Text className={styles.detailValue} style={{ marginTop: 16 }}>
                评价时间：{formatDate(order.rating.ratedAt)}
              </Text>
            </View>
          </View>
        )}

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>
            <Text className={styles.titleIcon}>📊</Text>
            处理进度
          </Text>
          
          <Timeline items={order.timeline} />
        </View>
      </ScrollView>

      {renderFooter()}
    </View>
  );
};

export default OrderDetailPage;
