import React, { useState, useEffect } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useUserStore } from '../../store/useUserStore';
import classnames from 'classnames';

type LoginTab = 'owner' | 'worker';

const LoginPage: React.FC = () => {
  const { login, isLogin, initFromStorage } = useUserStore();
  const [activeTab, setActiveTab] = useState<LoginTab>('owner');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [logining, setLogining] = useState(false);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useDidShow(() => {
    if (isLogin) {
      Taro.switchTab({ url: '/pages/home/index' });
    }
  });

  const handleLogin = async () => {
    if (!phone.trim()) {
      Taro.showToast({ title: '请输入账号', icon: 'none' });
      return;
    }
    if (!password.trim()) {
      Taro.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    try {
      setLogining(true);
      console.log('[LoginPage] 登录:', phone);
      
      await login(phone, password);
      
      Taro.showToast({ title: '登录成功', icon: 'success' });
      
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/home/index' });
      }, 1000);
    } catch (error) {
      console.error('[LoginPage] 登录失败:', error);
    } finally {
      setLogining(false);
    }
  };

  const handleWechatLogin = async () => {
    try {
      console.log('[LoginPage] 微信登录');
      const res = await Taro.login();
      
      if (res.code) {
        Taro.showToast({ title: '微信登录功能开发中', icon: 'none' });
      }
    } catch (error) {
      console.error('[LoginPage] 微信登录失败:', error);
      Taro.showToast({ title: '微信登录失败', icon: 'none' });
    }
  };

  const fillDemoAccount = (demoPhone: string, demoPassword: string) => {
    setPhone(demoPhone);
    setPassword(demoPassword);
  };

  if (isLogin) {
    return null;
  }

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.logo}>🏢</View>
        <Text className={styles.title}>智慧物业</Text>
        <Text className={styles.subtitle}>便捷报修 · 高效处理</Text>
      </View>

      <View className={styles.loginCard}>
        <View className={styles.tabBar}>
          <View
            className={classnames(styles.tabItem, { [styles.active]: activeTab === 'owner' })}
            onClick={() => setActiveTab('owner')}
          >
            业主登录
          </View>
          <View
            className={classnames(styles.tabItem, { [styles.active]: activeTab === 'worker' })}
            onClick={() => setActiveTab('worker')}
          >
            师傅登录
          </View>
        </View>

        <View className={styles.formItem}>
          <Text className={styles.label}>账号</Text>
          <View className={styles.inputWithIcon}>
            <Text className={styles.inputIcon}>👤</Text>
            <Input
              className={styles.input}
              placeholder="请输入账号"
              value={phone}
              onInput={(e) => setPhone(e.detail.value)}
            />
          </View>
        </View>

        <View className={styles.formItem}>
          <Text className={styles.label}>密码</Text>
          <View className={styles.inputWithIcon}>
            <Text className={styles.inputIcon}>🔒</Text>
            <Input
              className={styles.input}
              password
              placeholder="请输入密码"
              value={password}
              onInput={(e) => setPassword(e.detail.value)}
            />
          </View>
        </View>

        <Button
          className={styles.loginBtn}
          onClick={handleLogin}
          disabled={!phone || !password || logining}
          loading={logining}
        >
          {logining ? '登录中...' : '登 录'}
        </Button>

        <View className={styles.wechatLogin}>
          <Button className={styles.wechatBtn} onClick={handleWechatLogin}>
            <Text>💬</Text>
            <Text>微信一键登录</Text>
          </Button>
        </View>

        <View className={styles.demoAccounts}>
          <Text className={styles.demoTitle}>🎯 测试账号（点击快速填入）：</Text>
          {activeTab === 'owner' ? (
            <>
              <Text 
                className={styles.demoItem} 
                onClick={() => fillDemoAccount('owner1', '123456')}
              >
                业主：owner1 / 123456
              </Text>
              <Text 
                className={styles.demoItem}
                onClick={() => fillDemoAccount('owner2', '123456')}
              >
                业主：owner2 / 123456
              </Text>
            </>
          ) : (
            <>
              <Text 
                className={styles.demoItem}
                onClick={() => fillDemoAccount('worker1', '123456')}
              >
                师傅：worker1 / 123456（李师傅）
              </Text>
              <Text 
                className={styles.demoItem}
                onClick={() => fillDemoAccount('worker2', '123456')}
              >
                师傅：worker2 / 123456（王师傅）
              </Text>
            </>
          )}
        </View>
      </View>

      <Text className={styles.tips}>
        登录即表示同意《用户协议》和《隐私政策》
      </Text>
    </View>
  );
};

export default LoginPage;
