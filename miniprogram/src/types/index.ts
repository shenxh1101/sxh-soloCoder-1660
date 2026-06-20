export type UserRole = 'owner' | 'worker' | 'admin' | 'manager';

export type RepairType = 'water_electric' | 'access_control' | 'elevator' | 'public_facility' | 'other';

export type OrderStatus = 'pending' | 'assigned' | 'processing' | 'completed' | 'cancelled' | 'closed';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
  openid?: string;
  phone: string;
  name: string;
  avatar?: string;
  role: UserRole;
  building?: string;
  room?: string;
  skills?: string[];
  workStatus?: 'free' | 'busy' | 'offline';
  currentOrderCount?: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Location {
  building?: string;
  room?: string;
  address?: string;
}

export interface Contact {
  name?: string;
  phone?: string;
}

export interface TimelineItem {
  status: OrderStatus;
  title: string;
  description: string;
  operator?: string;
  operatorName?: string;
  createdAt: string;
}

export interface RepairResult {
  description: string;
  images?: string[];
}

export interface Rating {
  score: number;
  comment?: string;
  ratedAt: string;
}

export interface RepairOrder {
  id: string;
  orderNo: string;
  owner: User;
  repairType: RepairType;
  repairTypeName: string;
  title: string;
  description: string;
  images?: string[];
  location?: Location;
  contact?: Contact;
  status: OrderStatus;
  worker?: User;
  assignedAt?: string;
  assignedBy?: User;
  startedAt?: string;
  completedAt?: string;
  closedAt?: string;
  repairResult?: RepairResult;
  priority: Priority;
  responseTime?: number;
  completionTime?: number;
  totalTime?: number;
  rating?: Rating;
  timeline: TimelineItem[];
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RepairTypeOption {
  value: RepairType;
  label: string;
  color: string;
  icon: string;
}

export const repairTypeOptions: RepairTypeOption[] = [
  { value: 'water_electric', label: '水电维修', color: '#1677FF', icon: '🔧' },
  { value: 'access_control', label: '门禁系统', color: '#722ED1', icon: '🔐' },
  { value: 'elevator', label: '电梯故障', color: '#13C2C2', icon: '🛗' },
  { value: 'public_facility', label: '公共设施', color: '#FA8C16', icon: '🏢' },
  { value: 'other', label: '其他报修', color: '#8C8C8C', icon: '📋' }
];

export const statusTextMap: Record<OrderStatus, string> = {
  pending: '待派单',
  assigned: '已派单',
  processing: '处理中',
  completed: '已完成',
  cancelled: '已取消',
  closed: '已关闭'
};

export const statusColorMap: Record<OrderStatus, { bg: string; text: string }> = {
  pending: { bg: '#FFF7E8', text: '#FF7D00' },
  assigned: { bg: '#E8F3FF', text: '#1677FF' },
  processing: { bg: '#F2ECFF', text: '#722ED1' },
  completed: { bg: '#E8FFEA', text: '#00B42A' },
  cancelled: { bg: '#F2F3F5', text: '#86909C' },
  closed: { bg: '#F2F3F5', text: '#86909C' }
};

export const priorityTextMap: Record<Priority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急'
};
