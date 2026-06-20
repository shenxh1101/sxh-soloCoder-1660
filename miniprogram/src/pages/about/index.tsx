import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

const AboutPage: React.FC = () => {
  return (
    <View className={styles.page}>
      <View className={styles.placeholder}>
        <Text className={styles.icon}>🏢</Text>
        <Text className={styles.title}>智慧物业</Text>
        <Text className={styles.text}>
          专业的物业报修与派单管理系统
        </Text>
        <Text className={styles.text}>
          让物业运维更高效，让业主生活更便捷
        </Text>
        <Text className={styles.version}>v1.0.0</Text>
      </View>
    </View>
  );
};

export default AboutPage;
