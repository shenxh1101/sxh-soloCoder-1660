import React, { useEffect } from 'react';
import { useDidShow, useDidHide } from '@tarojs/taro';
import './app.scss';
import { useUserStore } from './store/useUserStore';

function App(props) {
  const { initFromStorage } = useUserStore();

  useEffect(() => {
    console.log('[App] 应用启动');
    initFromStorage();
  }, [initFromStorage]);

  useDidShow(() => {
    console.log('[App] 应用显示');
  });

  useDidHide(() => {
    console.log('[App] 应用隐藏');
  });

  return props.children;
}

export default App;
