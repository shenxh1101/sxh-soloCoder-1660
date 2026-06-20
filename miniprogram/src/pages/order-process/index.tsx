import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Textarea, Button, Image } from '@tarojs/components';
import Taro, { useRouter, useDidShow, useUnload } from '@tarojs/taro';
import styles from './index.module.scss';
import { useUserStore } from '../../store/useUserStore';
import { mockOrders } from '../../data/mock';
import { RepairOrder } from '../../types';
import { formatDate, getRepairTypeIcon } from '../../utils';
import ImageUploader from '../../components/ImageUploader';

const OrderProcessPage: React.FC = () => {
  const router = useRouter();
  const { user, isLogin, initFromStorage } = useUserStore();
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const orderId = router.params.id;

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      Taro.showToast({ title: '参数错误', icon: 'none' });
      return;
    }

    try {
      setLoading(true);
      console.log('[OrderProcess] 加载工单:', orderId);

      await new Promise(resolve => setTimeout(resolve, 300));
      
      const found = mockOrders.find(o => o.id === orderId);
      setOrder(found || null);

      if (found && found.status === 'processing') {
        setProcessing(true);
        setStartTime(new Date(found.startedAt!));
      }
    } catch (error) {
      console.error('[OrderProcess] 加载失败:', error);
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

  useEffect(() => {
    if (processing && startTime) {
      timerRef.current = setInterval(() => {
        const now = new Date().getTime();
        const start = startTime.getTime();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [processing, startTime]);

  useUnload(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  });

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStart = async () => {
    try {
      console.log('[OrderProcess] 开始处理工单');
      
      Taro.showLoading({ title: '开始处理...', mask: true });
      await new Promise(resolve => setTimeout(resolve, 500));
      Taro.hideLoading();

      setProcessing(true);
      setStartTime(new Date());

      Taro.showToast({ title: '已开始处理', icon: 'success' });
    } catch (error) {
      console.error('[OrderProcess] 开始处理失败:', error);
      Taro.hideLoading();
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  };

  const handleComplete = async () => {
    if (!description.trim()) {
      Taro.showToast({ title: '请填写维修说明', icon: 'none' });
      return;
    }

    try {
      setSubmitting(true);
      console.log('[OrderProcess] 完成工单:', {
        description,
        images,
        elapsedTime
      });

      Taro.showLoading({ title: '提交中...', mask: true });
      await new Promise(resolve => setTimeout(resolve, 1000));
      Taro.hideLoading();

      Taro.showToast({ 
        title: '工单已完成', 
        icon: 'success',
        duration: 2000 
      });

      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('[OrderProcess] 完成失败:', error);
      Taro.hideLoading();
      Taro.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreviewImage = (urls: string[], current: number) => {
    Taro.previewImage({
      current: urls[current],
      urls
    });
  };

  if (!isLogin) {
    Taro.redirectTo({ url: '/pages/login/index' });
    return null;
  }

  if (user?.role !== 'worker') {
    return (
      <View className={styles.page}>
        <View className="empty">
          <Text className="emptyIcon">🔒</Text>
          <Text className="emptyText">仅维修师傅可访问</Text>
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
        <Text className={styles.orderTitle}>
          {getRepairTypeIcon(order.repairType)} {order.repairTypeName} - {order.title}
        </Text>
        <Text className={styles.orderNo}>#{order.orderNo}</Text>
        <Text className={styles.orderDesc}>{order.description}</Text>
        <View className={styles.orderMeta}>
          <Text className={styles.metaItem}>📍 {order.location?.building} {order.location?.room}</Text>
          <Text className={styles.metaItem}>👤 {order.contact?.name}</Text>
          <Text className={styles.metaItem}>📞 {order.contact?.phone}</Text>
          <Text className={styles.metaItem}>⏰ {formatDate(order.createdAt)}</Text>
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

      {processing && (
        <View className={styles.timerSection}>
          <Text className={styles.timerLabel}>⏱️ 已处理时长</Text>
          <Text className={styles.timerValue}>{formatTime(elapsedTime)}</Text>
          <Text className={styles.timerTip}>开始时间：{formatDate(startTime!)}</Text>
        </View>
      )}

      {processing && (
        <View className={styles.formSection}>
          <Text className={styles.sectionTitle}>维修结果</Text>
          
          <View className={styles.formItem}>
            <Text className={styles.label}><Text style={{ color: '#F53F3F' }}>*</Text> 维修说明</Text>
            <Textarea
              className={styles.textarea}
              placeholder="请详细描述维修过程、更换的配件、处理结果等..."
              value={description}
              onInput={(e) => setDescription(e.detail.value)}
              maxlength={500}
            />
            <Text className={styles.tip}>{description.length}/500</Text>
          </View>

          <View className={styles.formItem}>
            <Text className={styles.label}>上传维修后照片（最多9张）</Text>
            <ImageUploader value={images} onChange={setImages} maxCount={9} />
          </View>
        </View>
      )}

      <View className={styles.footer}>
        {!processing ? (
          <Button
            className={styles.btnPrimary}
            onClick={handleStart}
          >
            🚀 开始处理
          </Button>
        ) : (
          <Button
            className={styles.btnSuccess}
            onClick={handleComplete}
            disabled={!description.trim() || submitting}
            loading={submitting}
          >
            {submitting ? '提交中...' : '✅ 完成维修'}
          </Button>
        )}
      </View>
    </View>
  );
};

export default OrderProcessPage;
