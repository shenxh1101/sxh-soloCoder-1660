import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { RepairOrder } from '../../types';
import { formatRelativeTime, getRepairTypeIcon } from '../../utils';
import StatusTag from '../StatusTag';
import classnames from 'classnames';

interface OrderCardProps {
  order: RepairOrder;
  onClick?: (order: RepairOrder) => void;
  showWorker?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onClick, showWorker = false }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(order);
    } else {
      Taro.navigateTo({
        url: `/pages/order-detail/index?id=${order.id}`
      });
    }
  };

  return (
    <View className={classnames('card', styles.orderCard)} onClick={handleClick}>
      <View className={styles.cardHeader}>
        <View className={styles.leftInfo}>
          <View className={styles.typeIcon}>{getRepairTypeIcon(order.repairType)}</View>
          <View className={styles.typeText}>{order.repairTypeName}</View>
        </View>
        <StatusTag status={order.status} size="md" />
      </View>

      <View className={styles.cardBody}>
        <Text className={styles.orderTitle}>{order.title}</Text>
        <Text className={styles.orderDesc}>
          {order.description.length > 60 ? order.description.slice(0, 60) + '...' : order.description}
        </Text>

        {order.images && order.images.length > 0 && (
          <View className={styles.imageList}>
            {order.images.slice(0, 3).map((img, idx) => (
              <Image
                key={idx}
                src={img}
                className={styles.orderImage}
                mode="aspectFill"
              />
            ))}
            {order.images.length > 3 && (
              <View className={styles.moreImages}>
                <Text className={styles.moreText}>+{order.images.length - 3}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View className={styles.cardFooter}>
        <View className={styles.footerLeft}>
          <Text className={styles.orderNo}>#{order.orderNo}</Text>
          <Text className={styles.timeText}>{formatRelativeTime(order.createdAt)}</Text>
        </View>
        
        {showWorker && order.worker && (
          <View className={styles.workerInfo}>
            <Text className={styles.workerText}>维修员：{order.worker.name}</Text>
          </View>
        )}

        {order.location && (
          <View className={styles.locationInfo}>
            <Text className={styles.locationText}>
              📍 {order.location.building}{order.location.room}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default OrderCard;
