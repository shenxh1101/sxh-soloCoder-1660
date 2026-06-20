import React, { useEffect } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useUserStore } from '../../store/useUserStore';

const menuItems = [
  { icon: '📋', label: '我的工单', path: '/pages/orders/index', tab: true },
  { icon: '⚙️', label: '设置', path: '/pages/settings/index' },
  { icon: '📞', label: '联系客服', path: '/pages/service/index' },
  { icon: 'ℹ️', label: '关于我们', path: '/pages/about/index' }
];

const MinePage: React.FC = () => {
  const { user, isLogin, logout, initFromStorage, fetchProfile } = useUserStore();

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useDidShow(() => {
    if (isLogin && user?.id) {
      fetchProfile();
    }
  });

  const getRoleText = (role: string) => {
    const roleMap: Record<string, string> = {
      owner: '业主',
      worker: '维修师傅',
      admin: '管理员',
      manager: '经理'
    };
    return roleMap[role] || role;
  };

  const handleMenuClick = (item: typeof menuItems[0]) => {
    if (item.tab) {
      Taro.switchTab({ url: item.path });
    } else {
      Taro.navigateTo({ url: item.path });
    }
  };

  const handleLogout = () => {
    Taro.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          logout();
          Taro.showToast({ title: '已退出登录', icon: 'success' });
          setTimeout(() => {
            Taro.redirectTo({ url: '/pages/login/index' });
          }, 1000);
        }
      }
    });
  };

  if (!isLogin) {
    Taro.redirectTo({ url: '/pages/login/index' });
    return null;
  }

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.userInfo}>
          <View className={styles.avatar}>
            <Text>{user?.name?.charAt(0) || '用'}</Text>
          </View>
          <View className={styles.userDetail}>
            <Text className={styles.userName}>{user?.name || '用户'}</Text>
            <View>
              <View className={styles.userRole}>{getRoleText(user?.role || 'owner')}</View>
            </View>
            {user?.building && (
              <Text className={styles.userLocation}>
                📍 {user.building} {user.room}
              </Text>
            )}
            <Text className={styles.phone}>📱 {user?.phone || ''}</Text>
          </View>
        </View>
      </View>

      <View className={styles.menuSection}>
        {menuItems.map((item, index) => (
          <View
            key={index}
            className={styles.menuItem}
            onClick={() => handleMenuClick(item)}
          >
            <View className={styles.menuIcon}>
              <Text>{item.icon}</Text>
            </View>
            <Text className={styles.menuText}>{item.label}</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
        ))}
      </View>

      <View className={styles.logoutSection}>
        <Button className={styles.logoutBtn} onClick={handleLogout}>
          退出登录
        </Button>
      </View>

      <Text className={styles.version}>智慧物业 v1.0.0</Text>
    </View>
  );
};

export default MinePage;
