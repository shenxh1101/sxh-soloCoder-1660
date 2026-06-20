import React, { useState, useEffect } from 'react';
import { View, Text, Input, Textarea, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { useUserStore } from '../../store/useUserStore';
import RepairTypeSelector from '../../components/RepairTypeSelector';
import ImageUploader from '../../components/ImageUploader';
import { RepairType } from '../../types';
import { api } from '../../services/api';
import classnames from 'classnames';

const RepairPage: React.FC = () => {
  const { user, isLogin, initFromStorage } = useUserStore();
  const [repairType, setRepairType] = useState<RepairType | undefined>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useEffect(() => {
    if (user) {
      setBuilding(user.building || '');
      setRoom(user.room || '');
      setContactName(user.name || '');
      setContactPhone(user.phone || '');
    }
  }, [user]);

  const validateForm = () => {
    if (!repairType) {
      Taro.showToast({ title: '请选择报修类型', icon: 'none' });
      return false;
    }
    if (!title.trim()) {
      Taro.showToast({ title: '请输入报修标题', icon: 'none' });
      return false;
    }
    if (!description.trim()) {
      Taro.showToast({ title: '请输入报修描述', icon: 'none' });
      return false;
    }
    if (!building.trim() || !room.trim()) {
      Taro.showToast({ title: '请填写报修位置', icon: 'none' });
      return false;
    }
    if (!contactName.trim()) {
      Taro.showToast({ title: '请填写联系人姓名', icon: 'none' });
      return false;
    }
    if (!contactPhone.trim()) {
      Taro.showToast({ title: '请填写联系电话', icon: 'none' });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      console.log('[RepairPage] 提交报修:', {
        repairType,
        title,
        description,
        images,
        building,
        room,
        contactName,
        contactPhone
      });

      await api.orders.create({
        repairType,
        title,
        description,
        building,
        room,
        contactName,
        contactPhone,
        priority: 'medium',
        images: images || []
      });

      Taro.showToast({
        title: '提交成功',
        icon: 'success',
        duration: 2000
      });

      setTimeout(() => {
        Taro.switchTab({ url: '/pages/orders/index' });
      }, 1500);

      setRepairType(undefined);
      setTitle('');
      setDescription('');
      setImages([]);
    } catch (error) {
      console.error('[RepairPage] 提交失败:', error);
      Taro.showToast({ title: '提交失败，请重试', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLogin) {
    Taro.redirectTo({ url: '/pages/login/index' });
    return null;
  }

  if (user?.role === 'worker') {
    return (
      <View className={classnames(styles.page, 'container')}>
        <View className="empty">
          <Text className="emptyIcon">🔧</Text>
          <Text className="emptyText">维修师傅无需提交报修</Text>
        </View>
      </View>
    );
  }

  const canSubmit = repairType && title.trim() && description.trim() && !submitting;

  return (
    <View className={styles.page}>
      <View className={styles.formSection}>
        <Text className={styles.sectionTitle}>报修类型</Text>
        <RepairTypeSelector value={repairType} onChange={setRepairType} />
      </View>

      <View className={styles.formSection}>
        <Text className={styles.sectionTitle}>报修信息</Text>
        
        <View className={styles.formItem}>
          <Text className={classnames(styles.label, styles.required)}>报修标题</Text>
          <Input
            className={styles.input}
            placeholder="请简要描述问题（如：客厅灯不亮）"
            value={title}
            onInput={(e) => setTitle(e.detail.value)}
            maxlength={50}
          />
        </View>

        <View className={styles.formItem}>
          <Text className={classnames(styles.label, styles.required)}>详细描述</Text>
          <Textarea
            className={styles.textarea}
            placeholder="请详细描述问题情况，包括出现的现象、位置等信息..."
            value={description}
            onInput={(e) => setDescription(e.detail.value)}
            maxlength={500}
          />
          <Text className={styles.tip}>{description.length}/500</Text>
        </View>

        <View className={styles.formItem}>
          <Text className={styles.label}>上传图片（最多9张）</Text>
          <ImageUploader value={images} onChange={setImages} maxCount={9} />
        </View>
      </View>

      <View className={styles.formSection}>
        <Text className={styles.sectionTitle}>位置与联系</Text>
        
        <View className={styles.formItem}>
          <Text className={classnames(styles.label, styles.required)}>报修位置</Text>
          <View className={styles.locationRow}>
            <Input
              className={classnames(styles.input, styles.locationInput)}
              placeholder="楼栋号"
              value={building}
              onInput={(e) => setBuilding(e.detail.value)}
            />
            <Input
              className={classnames(styles.input, styles.locationInput)}
              placeholder="房间号"
              value={room}
              onInput={(e) => setRoom(e.detail.value)}
            />
          </View>
        </View>

        <View className={styles.formItem}>
          <Text className={classnames(styles.label, styles.required)}>联系人</Text>
          <Input
            className={styles.input}
            placeholder="请输入联系人姓名"
            value={contactName}
            onInput={(e) => setContactName(e.detail.value)}
          />
        </View>

        <View className={styles.formItem}>
          <Text className={classnames(styles.label, styles.required)}>联系电话</Text>
          <Input
            className={styles.input}
            type="number"
            placeholder="请输入联系电话"
            value={contactPhone}
            onInput={(e) => setContactPhone(e.detail.value)}
            maxlength={11}
          />
        </View>
      </View>

      <View className={styles.footer}>
        <Button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={!canSubmit}
          loading={submitting}
        >
          {submitting ? '提交中...' : '提交报修'}
        </Button>
      </View>
    </View>
  );
};

export default RepairPage;
