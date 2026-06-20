import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import { OrderStatus } from '../../types';
import { getStatusInfo } from '../../utils';

interface StatusTagProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
}

const StatusTag: React.FC<StatusTagProps> = ({ status, size = 'md' }) => {
  const statusInfo = getStatusInfo(status);

  return (
    <View
      className={`${styles.statusTag} ${styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`]}`}
      style={{
        backgroundColor: statusInfo.bgColor,
        color: statusInfo.textColor
      }}
    >
      <Text className={styles.statusText}>{statusInfo.text}</Text>
    </View>
  );
};

export default StatusTag;
