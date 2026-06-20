export type UserRole = 'owner' | 'worker' | 'admin' | 'manager';

export type RepairType = 'water_electric' | 'access_control' | 'elevator' | 'public_facility' | 'other';

export type OrderStatus = 'pending' | 'assigned' | 'processing' | 'completed' | 'cancelled' | 'closed';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
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

export const repairTypeMap: Record<RepairType, string> = {
  water_electric: '水电维修',
  access_control: '门禁系统',
  elevator: '电梯故障',
  public_facility: '公共设施',
  other: '其他报修'
};

export const statusMap: Record<OrderStatus, string> = {
  pending: '待派单',
  assigned: '已派单',
  processing: '处理中',
  completed: '已完成',
  cancelled: '已取消',
  closed: '已关闭'
};

export const statusColorMap: Record<OrderStatus, string> = {
  pending: '#FF7D00',
  assigned: '#1677FF',
  processing: '#722ED1',
  completed: '#00B42A',
  cancelled: '#86909C',
  closed: '#86909C'
};

export const priorityMap: Record<Priority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急'
};

export const priorityColorMap: Record<Priority, string> = {
  low: '#86909C',
  medium: '#1677FF',
  high: '#FF7D00',
  urgent: '#F53F3F'
};
