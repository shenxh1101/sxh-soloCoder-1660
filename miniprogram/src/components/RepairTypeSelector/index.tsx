import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import { repairTypeOptions, RepairType } from '../../types';
import classnames from 'classnames';

interface RepairTypeSelectorProps {
  value?: RepairType;
  onChange?: (value: RepairType) => void;
}

const RepairTypeSelector: React.FC<RepairTypeSelectorProps> = ({ value, onChange }) => {
  return (
    <View className={styles.selector}>
      {repairTypeOptions.map((item) => (
        <View
          key={item.value}
          className={classnames(styles.typeItem, {
            [styles.active]: value === item.value
          })}
          style={{
            borderColor: value === item.value ? item.color : 'transparent'
          }}
          onClick={() => onChange?.(item.value)}
        >
          <View
            className={styles.typeIcon}
            style={{ backgroundColor: value === item.value ? item.color : `${item.color}15` }}
        >
          <Text className={styles.iconText} style={{ color: value === item.value ? '#fff' : item.color }}>
            {item.icon}
          </Text>
        </View>
        <Text
          className={styles.typeLabel}
          style={{ color: value === item.value ? item.color : '#1D2129' }}
        >
          {item.label}
        </Text>
      </View>
    ))}
    </View>
  );
};

export default RepairTypeSelector;
