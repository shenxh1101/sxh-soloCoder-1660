import React, { useState } from 'react';
import { View, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';

interface ImageUploaderProps {
  value?: string[];
  onChange?: (files: string[]) => void;
  maxCount?: number;
  disabled?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  value = [],
  onChange,
  maxCount = 9,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);

  const handleChoose = async () => {
    if (disabled || uploading) return;
    if (value.length >= maxCount) {
      Taro.showToast({ title: `最多上传${maxCount}张图片`, icon: 'none' });
      return;
    }

    try {
      const res = await Taro.chooseImage({
        count: maxCount - value.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });

      console.log('[ImageUploader] 选择图片:', res.tempFilePaths);
      setUploading(true);

      const uploadedUrls: string[] = [];
      for (const tempPath of res.tempFilePaths) {
        try {
          const uploadRes = await Taro.uploadFile({
            url: process.env.TARO_ENV === 'h5' 
              ? '/api/upload' 
              : 'http://localhost:3000/api/upload',
            filePath: tempPath,
            name: 'file',
            header: {
              Authorization: `Bearer ${Taro.getStorageSync('token')}`
            }
          });

          const result = JSON.parse(uploadRes.data);
          if (result.success) {
            uploadedUrls.push(result.data.url);
          }
        } catch (error) {
          console.error('[ImageUploader] 上传失败:', error);
          uploadedUrls.push(tempPath);
        }
      }

      const newFiles = [...value, ...uploadedUrls];
      onChange?.(newFiles);
    } catch (error) {
      console.error('[ImageUploader] 选择图片失败:', error);
      if (error.errMsg && !error.errMsg.includes('cancel')) {
        Taro.showToast({ title: '选择图片失败', icon: 'none' });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (index: number) => {
    Taro.showModal({
      title: '提示',
      content: '确定要删除这张图片吗？',
      success: (res) => {
        if (res.confirm) {
          const newFiles = value.filter((_, i) => i !== index);
          onChange?.(newFiles);
        }
      }
    });
  };

  const handlePreview = (index: number) => {
    Taro.previewImage({
      current: value[index],
      urls: value
    });
  };

  return (
    <View className={styles.uploader}>
      {value.map((url, index) => (
        <View key={index} className={styles.imageItem}>
          <Image
            src={url}
            className={styles.image}
            mode="aspectFill"
            onClick={() => handlePreview(index)}
          />
          {!disabled && (
            <View
              className={styles.deleteBtn}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(index);
              }}
            >
              ×
            </View>
          )}
        </View>
      ))}

      {value.length < maxCount && !disabled && (
        <View
          className={classnames(styles.uploadBtn, {
            [styles.disabled]: uploading
          })}
          onClick={handleChoose}
        >
          <View className={styles.uploadIcon}>+</View>
          <View className={styles.uploadText}>{uploading ? '上传中...' : '上传图片'}</View>
        </View>
      )}
    </View>
  );
};

export default ImageUploader;
