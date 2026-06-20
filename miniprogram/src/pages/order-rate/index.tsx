import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Textarea, Button } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useUserStore } from '../../store/useUserStore';
import { mockOrders } from '../../data/mock';
import { RepairOrder } from '../../types';
import { formatDate } from '../../utils';
import classnames from 'classnames';

const ratingLabels = ['非常差', '较差', '一般', '满意', '非常满意'];
const quickTags = ['响应迅速', '技术专业', '态度友好', '清洁到位', '收费合理', '一次修好'];

const OrderRatePage: React.FC = () => {
  const router = useRouter();
  const { user, isLogin, initFromStorage } = useUserStore();
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const orderId = router.params.id;

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      Taro.showToast({ title: '参数错误', icon: 'none' });
      return;
    }

    try {
      setLoading(true);
      console.log('[OrderRate] 加载工单:', orderId);

      await new Promise(resolve => setTimeout(resolve, 300));
      
      const found = mockOrders.find(o => o.id === orderId);
      setOrder(found || null);
    } catch (error) {
      console.error('[OrderRate] 加载失败:', error);
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

  const handleStarClick = (value: number) => {
    setRating(value);
  };

  const handleTagClick = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Taro.showToast({ title: '请选择评分', icon: 'none' });
      return;
    }

    try {
      setSubmitting(true);
      console.log('[OrderRate] 提交评价:', {
        rating,
        comment,
        tags: selectedTags
      });

      Taro.showLoading({ title: '提交中...', mask: true });
      await new Promise(resolve => setTimeout(resolve, 1000));
      Taro.hideLoading();

      Taro.showToast({ 
        title: '评价成功', 
        icon: 'success',
        duration: 2000 
      });

      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('[OrderRate] 提交失败:', error);
      Taro.hideLoading();
      Taro.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  if (!isLogin) {
    Taro.redirectTo({ url: '/pages/login/index' });
    return null;
  }

  if (user?.role !== 'owner') {
    return (
      <View className={styles.page}>
        <View className="empty">
          <Text className="emptyIcon">🔒</Text>
          <Text className="emptyText">仅业主可访问</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View className={styles.page}>
        <View className="empty">
          <Text className="emptyIcon">⏳</Text>
          <Text className="emptyText">加载中...</Text>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View className={styles.page}>
        <View className="empty">
          <Text className="emptyIcon">📋</Text>
          <Text className="emptyText">工单不存在</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.page}>
      <View className={styles.orderInfo}>
        <Text className={styles.orderTitle}>{order.title}</Text>
        <Text className={styles.orderNo}>#{order.orderNo} · {formatDate(order.completedAt!)}</Text>
        
        {order.worker && (
          <View className={styles.workerInfo}>
            <View className={styles.workerAvatar}>
              {order.worker.name?.charAt(0)}
            </View>
            <View className={styles.workerDetail}>
              <Text className={styles.workerName}>{order.worker.name}</Text>
              <Text className={styles.workerMeta}>
                处理时长：{Math.floor((new Date(order.completedAt!).getTime() - new Date(order.startedAt!).getTime()) / 1000 / 60)}分钟
              </Text>
            </View>
          </View>
        )}
      </View>

      <View className={styles.ratingSection}>
        <Text className={styles.ratingTitle}>请对本次服务进行评价</Text>
        
        <View className={styles.ratingStars}>
          {[1, 2, 3, 4, 5].map(star => (
            <Text
              key={star}
              className={classnames(styles.star, {
                [styles.active]: star <= displayRating
              })}
              onClick={() => handleStarClick(star)}
              onTouchStart={() => setHoverRating(star)}
              onTouchEnd={() => setHoverRating(0)}
            >
              ★
            </Text>
          ))}
        </View>
        
        <Text className={styles.ratingText}>
          {rating > 0 ? ratingLabels[rating - 1] : '点击星星进行评分'}
        </Text>
        <Text className={styles.ratingHint}>1星最差，5星最好</Text>
      </View>

      <View className={styles.tagSection}>
        <Text className={styles.sectionTitle}>快速评价（可多选）</Text>
        <View className={styles.tagList}>
          {quickTags.map(tag => (
            <View
              key={tag}
              className={classnames(styles.tagItem, {
                [styles.active]: selectedTags.includes(tag)
              })}
              onClick={() => handleTagClick(tag)}
            >
              {tag}
            </View>
          ))}
        </View>
      </View>

      <View className={styles.commentSection}>
        <Text className={styles.sectionTitle}>补充评价（选填）</Text>
        <Textarea
          className={styles.textarea}
          placeholder="请分享您的服务体验，帮助我们改进..."
          value={comment}
          onInput={(e) => setComment(e.detail.value)}
          maxlength={500}
        />
        <Text className={styles.tip}>{comment.length}/500</Text>
      </View>

      <View className={styles.footer}>
        <Button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          loading={submitting}
        >
          {submitting ? '提交中...' : '提交评价'}
        </Button>
      </View>
    </View>
  );
};

export default OrderRatePage;
