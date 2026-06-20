import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import { TimelineItem } from '../../types';
import { formatDate } from '../../utils';
import classnames from 'classnames';

interface TimelineProps {
  items: TimelineItem[];
}

const Timeline: React.FC<TimelineProps> = ({ items }) => {
  return (
    <View className={styles.timeline}>
      {items.map((item, index) => (
        <View
          key={index}
          className={classnames(styles.timelineItem, {
            [styles.firstItem]: index === 0,
            [styles.lastItem]: index === items.length - 1
          })}
        >
          <View className={styles.timelineLeft}>
            <View className={classnames(styles.dot, styles[`dot${item.status}`])} />
            {index < items.length - 1 && <View className={styles.line} />}
          </View>
          <View className={styles.timelineRight}>
            <View className={styles.itemHeader}>
              <Text className={styles.itemTitle}>{item.title}</Text>
              <Text className={styles.itemTime}>{formatDate(item.createdAt)}</Text>
            </View>
            <Text className={styles.itemDesc}>{item.description}</Text>
            {item.operatorName && (
              <Text className={styles.itemOperator}>操作人：{item.operatorName}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

export default Timeline;
