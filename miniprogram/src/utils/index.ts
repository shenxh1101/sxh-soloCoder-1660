import dayjs from 'dayjs';
import { OrderStatus, statusColorMap, statusTextMap, User, RepairOrder } from '../types';

export const normalizeUser = (raw: any): User => {
  if (!raw) return raw;
  const id = String(raw.id || raw._id || '');
  return {
    ...raw,
    id,
    status: raw.status || 'active',
    createdAt: raw.createdAt || new Date().toISOString()
  };
};

export const normalizeOrder = (raw: any): RepairOrder => {
  if (!raw) return raw;
  const id = String(raw.id || raw._id || '');
  return {
    ...raw,
    id,
    owner: normalizeUser(raw.owner),
    worker: raw.worker ? normalizeUser(raw.worker) : undefined,
    assignedBy: raw.assignedBy ? normalizeUser(raw.assignedBy) : undefined,
    repairTypeName: raw.repairTypeName || repairTypeLabel(raw.repairType),
    timeline: (raw.timeline || []).map((t: any) => ({
      ...t,
      status: t.status || raw.status,
      createdAt: t.createdAt || t.time || new Date().toISOString()
    })),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString()
  };
};

const repairTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    water_electric: '水电维修',
    access_control: '门禁系统',
    elevator: '电梯故障',
    public_facility: '公共设施',
    other: '其他报修'
  };
  return map[type] || type || '其他';
};

export const formatDate = (date: string | Date, format: string = 'YYYY-MM-DD HH:mm'): string => {
  return dayjs(date).format(format);
};

export const formatRelativeTime = (date: string | Date): string => {
  const now = dayjs();
  const target = dayjs(date);
  const diffMinutes = now.diff(target, 'minute');
  
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  
  const diffHours = now.diff(target, 'hour');
  if (diffHours < 24) return `${diffHours}小时前`;
  
  const diffDays = now.diff(target, 'day');
  if (diffDays < 7) return `${diffDays}天前`;
  
  return formatDate(date, 'YYYY-MM-DD');
};

export const formatDuration = (minutes?: number): string => {
  if (!minutes) return '未计算';
  if (minutes < 60) return `${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return `${hours}小时${mins}分钟`;
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return `${days}天${remainHours}小时${mins}分钟`;
};

export const getStatusInfo = (status: OrderStatus) => {
  const colors = statusColorMap[status] || statusColorMap.pending;
  return {
    text: statusTextMap[status] || status,
    bgColor: colors.bg,
    textColor: colors.text
  };
};

export const getRepairTypeIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    water_electric: '🔧',
    access_control: '🔐',
    elevator: '🛗',
    public_facility: '🏢',
    other: '📋'
  };
  return iconMap[type] || '📋';
};

export const generateOrderNo = (): string => {
  const now = dayjs();
  const dateStr = now.format('YYYYMMDD');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BX${dateStr}${random}`;
};

export const calculateDuration = (start?: string, end?: string): number | null => {
  if (!start || !end) return null;
  return Math.floor((dayjs(end).valueOf() - dayjs(start).valueOf()) / 1000 / 60);
};

export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timer: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastTime = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn(...args);
    }
  };
};
