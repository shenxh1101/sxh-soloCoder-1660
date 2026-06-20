import { RepairOrder, User } from '../types';

export const mockUsers: User[] = [
  {
    id: '1',
    phone: 'owner1',
    name: '业主张三',
    role: 'owner',
    building: '1号楼',
    room: '101',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: '2',
    phone: 'worker1',
    name: '李师傅',
    role: 'worker',
    skills: ['water_electric', 'elevator'],
    workStatus: 'free',
    currentOrderCount: 0,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: '3',
    phone: 'worker2',
    name: '王师傅',
    role: 'worker',
    skills: ['access_control', 'public_facility'],
    workStatus: 'busy',
    currentOrderCount: 2,
    status: 'active',
    createdAt: '2024-01-02T00:00:00.000Z'
  }
];

export const mockOrders: RepairOrder[] = [
  {
    id: '1',
    orderNo: 'BX202406200001',
    owner: mockUsers[0],
    repairType: 'water_electric',
    repairTypeName: '水电维修',
    title: '客厅灯不亮了',
    description: '客厅的吊灯突然不亮了，开关和灯泡都检查过没有问题，可能是线路故障。',
    images: [
      'https://picsum.photos/id/1/300/300',
      'https://picsum.photos/id/2/300/300'
    ],
    location: {
      building: '1号楼',
      room: '101'
    },
    contact: {
      name: '业主张三',
      phone: '138****1234'
    },
    status: 'processing',
    worker: mockUsers[1],
    assignedAt: '2024-06-20T09:30:00.000Z',
    startedAt: '2024-06-20T10:00:00.000Z',
    priority: 'medium',
    timeline: [
      {
        status: 'pending',
        title: '工单已提交',
        description: '等待客服派单',
        operatorName: '业主张三',
        createdAt: '2024-06-20T09:15:00.000Z'
      },
      {
        status: 'assigned',
        title: '工单已派单',
        description: '已派单给李师傅',
        operatorName: '客服',
        createdAt: '2024-06-20T09:30:00.000Z'
      },
      {
        status: 'processing',
        title: '开始维修',
        description: '李师傅已开始处理',
        operatorName: '李师傅',
        createdAt: '2024-06-20T10:00:00.000Z'
      }
    ],
    createdAt: '2024-06-20T09:15:00.000Z',
    updatedAt: '2024-06-20T10:00:00.000Z'
  },
  {
    id: '2',
    orderNo: 'BX202406190002',
    owner: mockUsers[0],
    repairType: 'access_control',
    repairTypeName: '门禁系统',
    title: '单元门禁刷卡没反应',
    description: '楼下单元门的门禁刷卡没有反应，无法开门，影响正常出入。',
    images: [
      'https://picsum.photos/id/3/300/300'
    ],
    location: {
      building: '1号楼',
      room: '1单元'
    },
    contact: {
      name: '业主张三',
      phone: '138****1234'
    },
    status: 'completed',
    worker: mockUsers[2],
    assignedAt: '2024-06-19T14:00:00.000Z',
    startedAt: '2024-06-19T14:30:00.000Z',
    completedAt: '2024-06-19T15:10:00.000Z',
    repairResult: {
      description: '门禁读卡器损坏，已更换新的读卡器，测试正常。',
      images: [
        'https://picsum.photos/id/4/300/300'
      ]
    },
    responseTime: 15,
    completionTime: 40,
    totalTime: 85,
    rating: {
      score: 5,
      comment: '师傅上门很快，维修也很专业，非常满意！',
      ratedAt: '2024-06-19T16:00:00.000Z'
    },
    priority: 'high',
    timeline: [
      {
        status: 'pending',
        title: '工单已提交',
        description: '等待客服派单',
        operatorName: '业主张三',
        createdAt: '2024-06-19T13:45:00.000Z'
      },
      {
        status: 'assigned',
        title: '工单已派单',
        description: '已派单给王师傅',
        operatorName: '客服',
        createdAt: '2024-06-19T14:00:00.000Z'
      },
      {
        status: 'processing',
        title: '开始维修',
        description: '王师傅已开始处理',
        operatorName: '王师傅',
        createdAt: '2024-06-19T14:30:00.000Z'
      },
      {
        status: 'completed',
        title: '维修完成',
        description: '维修已完成，等待业主确认',
        operatorName: '王师傅',
        createdAt: '2024-06-19T15:10:00.000Z'
      },
      {
        status: 'closed',
        title: '业主已评价',
        description: '评分：5星，评价：师傅上门很快...',
        operatorName: '业主张三',
        createdAt: '2024-06-19T16:00:00.000Z'
      }
    ],
    createdAt: '2024-06-19T13:45:00.000Z',
    updatedAt: '2024-06-19T16:00:00.000Z'
  },
  {
    id: '3',
    orderNo: 'BX202406200003',
    owner: mockUsers[0],
    repairType: 'elevator',
    repairTypeName: '电梯故障',
    title: '电梯按键失灵',
    description: '3号楼电梯的3楼按键失灵，按了没反应。',
    images: [],
    location: {
      building: '3号楼',
      room: '电梯'
    },
    contact: {
      name: '业主张三',
      phone: '138****1234'
    },
    status: 'pending',
    priority: 'urgent',
    timeline: [
      {
        status: 'pending',
        title: '工单已提交',
        description: '等待客服派单',
        operatorName: '业主张三',
        createdAt: '2024-06-20T10:30:00.000Z'
      }
    ],
    createdAt: '2024-06-20T10:30:00.000Z',
    updatedAt: '2024-06-20T10:30:00.000Z'
  },
  {
    id: '4',
    orderNo: 'BX202406180004',
    owner: mockUsers[0],
    repairType: 'public_facility',
    repairTypeName: '公共设施',
    title: '小区健身器材损坏',
    description: '小区花园的跑步机坏了，跑带不动。',
    images: [
      'https://picsum.photos/id/5/300/300'
    ],
    location: {
      building: '小区花园',
      room: '健身区'
    },
    contact: {
      name: '业主张三',
      phone: '138****1234'
    },
    status: 'assigned',
    worker: mockUsers[2],
    assignedAt: '2024-06-18T10:00:00.000Z',
    priority: 'low',
    responseTime: 20,
    timeline: [
      {
        status: 'pending',
        title: '工单已提交',
        description: '等待客服派单',
        operatorName: '业主张三',
        createdAt: '2024-06-18T09:40:00.000Z'
      },
      {
        status: 'assigned',
        title: '工单已派单',
        description: '已派单给王师傅',
        operatorName: '客服',
        createdAt: '2024-06-18T10:00:00.000Z'
      }
    ],
    createdAt: '2024-06-18T09:40:00.000Z',
    updatedAt: '2024-06-18T10:00:00.000Z'
  }
];

export const mockOwnerDashboard = {
  totalOrders: 12,
  pendingOrders: 1,
  processingOrders: 1,
  completedOrders: 10,
  recentOrders: mockOrders.slice(0, 3)
};

export const mockWorkerDashboard = {
  todayOrders: 3,
  pendingOrders: 1,
  processingOrders: 1,
  completedOrders: 1,
  avgResponseTime: 18,
  avgCompletionTime: 45,
  recentOrders: mockOrders.filter(o => o.status === 'assigned' || o.status === 'processing')
};
