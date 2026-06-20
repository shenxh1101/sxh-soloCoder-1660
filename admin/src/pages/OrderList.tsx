import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  DatePicker,
  Space,
  Tag,
  Modal,
  Form,
  message,
  Popconfirm,
  Spin,
  Image,
  Card,
  Radio,
  Tooltip
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { RepairOrder, statusMap, statusColorMap, repairTypeMap, priorityMap, priorityColorMap } from '../types';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { RangePicker } = DatePicker;
const { Option } = Select;

const OrderListPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RepairOrder | null>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [assignMode, setAssignMode] = useState<'smart' | 'all'>('smart');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [assignForm] = Form.useForm();
  const [filters, setFilters] = useState({
    keyword: '',
    status: '',
    repairType: '',
    dateRange: null as any
  });

  useEffect(() => {
    loadOrders();
  }, [pagination.current, pagination.pageSize]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.current,
        pageSize: pagination.pageSize
      };

      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.status) params.status = filters.status;
      if (filters.repairType) params.repairType = filters.repairType;
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.startDate = filters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = filters.dateRange[1].format('YYYY-MM-DD');
      }

      const result = await api.orders.getList(params) as any;
      setOrders(result.list || []);
      setPagination(prev => ({ ...prev, total: result.pagination?.total || 0 }));
    } catch (error: any) {
      console.error('加载工单失败:', error);
      message.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkers = async () => {
    try {
      setWorkersLoading(true);
      const workersList = await api.users.getWorkers() as any[];
      const workload = await api.orders.getWorkerWorkload() as any[];
      
      const workersWithLoad = workersList.map(w => {
        const load = workload.find((l: any) => l._id === w.id);
        return {
          ...w,
          currentOrderCount: load?.pendingOrders || 0,
          workloadText: load ? `当前${load.pendingOrders}单，共处理${load.totalOrders}单` : '暂无数据'
        };
      });
      
      setWorkers(workersWithLoad);
    } catch (error: any) {
      console.error('加载师傅列表失败:', error);
      message.error(error.message || '加载师傅列表失败');
    } finally {
      setWorkersLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    loadOrders();
  };

  const handleReset = () => {
    setFilters({
      keyword: '',
      status: '',
      repairType: '',
      dateRange: null
    });
    setPagination(prev => ({ ...prev, current: 1 }));
    setTimeout(() => loadOrders(), 100);
  };

  const handleAssignClick = (order: RepairOrder) => {
    setSelectedOrder(order);
    assignForm.resetFields();
    setAssignMode('smart');
    setSelectedWorkerId('');
    setAssignModalVisible(true);
    loadWorkers();
  };

  const getDisplayedWorkers = () => {
    if (!workers.length) return [];
    
    const list = [...workers];
    const repairType = selectedOrder?.repairType;
    
    if (assignMode === 'smart' && repairType) {
      // 智能推荐：技能匹配的排前面，然后按待处理+处理中数量从少到多
      list.sort((a, b) => {
        const aHasSkill = a.skills?.includes(repairType) ? 0 : 1;
        const bHasSkill = b.skills?.includes(repairType) ? 0 : 1;
        if (aHasSkill !== bHasSkill) return aHasSkill - bHasSkill;
        const aLoad = (a.pendingOrders || 0) + (a.processingOrders || 0);
        const bLoad = (b.pendingOrders || 0) + (b.processingOrders || 0);
        return aLoad - bLoad;
      });
    } else {
      // 全部在岗：按待处理+处理中数量从少到多
      list.sort((a, b) => {
        const aLoad = (a.pendingOrders || 0) + (a.processingOrders || 0);
        const bLoad = (b.pendingOrders || 0) + (b.processingOrders || 0);
        return aLoad - bLoad;
      });
    }
    
    return list;
  };

  const handleAssignSubmit = async (values: any) => {
    if (!selectedOrder) return;

    try {
      await api.orders.assign(selectedOrder.id, values.workerId, values.remark);
      message.success('派单成功');
      setAssignModalVisible(false);
      loadOrders();
    } catch (error: any) {
      console.error('派单失败:', error);
      message.error(error.message || '派单失败');
    }
  };

  const handleCancelOrder = async (order: RepairOrder) => {
    try {
      await api.orders.cancel(order.id, '客服取消');
      message.success('工单已取消');
      loadOrders();
    } catch (error: any) {
      console.error('取消工单失败:', error);
      message.error(error.message || '取消失败');
    }
  };

  const columns: ColumnsType<RepairOrder> = [
    {
      title: '工单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 140,
      fixed: 'left'
    },
    {
      title: '报修类型',
      dataIndex: 'repairType',
      key: 'repairType',
      width: 100,
      render: (type: string) => repairTypeMap[type as keyof typeof repairTypeMap] || type
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 180,
      ellipsis: true
    },
    {
      title: '报修图片',
      dataIndex: 'images',
      key: 'images',
      width: 100,
      render: (images: string[]) => images?.length ? (
        <Image
          width={40}
          height={40}
          src={images[0]}
          style={{ borderRadius: 4, objectFit: 'cover' }}
        />
      ) : '-'
    },
    {
      title: '报修人',
      dataIndex: ['owner', 'name'],
      key: 'ownerName',
      width: 100
    },
    {
      title: '联系电话',
      dataIndex: ['contact', 'phone'],
      key: 'contactPhone',
      width: 120
    },
    {
      title: '位置',
      dataIndex: ['location', 'building'],
      key: 'location',
      width: 120,
      render: (building: string, record) => 
        `${building || ''} ${record.location?.room || ''}`
    },
    {
      title: '维修师傅',
      dataIndex: ['worker', 'name'],
      key: 'workerName',
      width: 100,
      render: (name: string) => name || '-'
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => (
        <Tag color={priorityColorMap[priority as keyof typeof priorityColorMap]}>
          {priorityMap[priority as keyof typeof priorityMap]}
        </Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={statusColorMap[status as keyof typeof statusColorMap]}>
          {statusMap[status as keyof typeof statusMap]}
        </Tag>
      )
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/orders/${record.id}`)}
          >
            详情
          </Button>
          {record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleAssignClick(record)}
            >
              派单
            </Button>
          )}
          {(record.status === 'pending' || record.status === 'assigned') && (
            <Popconfirm
              title="确定要取消该工单吗？"
              onConfirm={() => handleCancelOrder(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseCircleOutlined />}
              >
                取消
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">工单管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info('请在小程序端提交报修')}>
          新增工单
        </Button>
      </div>

      <Card className="card-shadow" style={{ marginBottom: 16 }}>
        <div className="filter-bar">
          <Input
            placeholder="搜索工单号、标题、报修人"
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            allowClear
          />
          <Select
            placeholder="工单状态"
            style={{ width: 140 }}
            value={filters.status || undefined}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value || '' }))}
            allowClear
          >
            {Object.entries(statusMap).map(([key, value]) => (
              <Option key={key} value={key}>{value}</Option>
            ))}
          </Select>
          <Select
            placeholder="报修类型"
            style={{ width: 140 }}
            value={filters.repairType || undefined}
            onChange={(value) => setFilters(prev => ({ ...prev, repairType: value || '' }))}
            allowClear
          >
            {Object.entries(repairTypeMap).map(([key, value]) => (
              <Option key={key} value={key}>{value}</Option>
            ))}
          </Select>
          <RangePicker
            value={filters.dateRange}
            onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates as any }))}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </div>
      </Card>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => setPagination({ current: page, pageSize, total: pagination.total })
          }}
        />
      </Card>

      <Modal
        title="分配维修师傅"
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedOrder && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f7fa', borderRadius: 8 }}>
            <p style={{ margin: '4px 0' }}><strong>工单号：</strong>{selectedOrder.orderNo}</p>
            <p style={{ margin: '4px 0' }}><strong>标题：</strong>{selectedOrder.title}</p>
            <p style={{ margin: '4px 0' }}><strong>类型：</strong>{selectedOrder.repairTypeName}</p>
          </div>
        )}
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={handleAssignSubmit}
        >
          <Form.Item name="workerId" rules={[{ required: true, message: '请选择维修师傅' }]} style={{ marginBottom: 8 }}>
            <Radio.Group
              value={assignMode}
              onChange={(e) => setAssignMode(e.target.value)}
              style={{ marginBottom: 12 }}
              size="small"
            >
              <Radio.Button value="smart">智能推荐</Radio.Button>
              <Radio.Button value="all">全部在岗</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <div
            style={{
              maxHeight: 320,
              overflowY: 'auto',
              marginBottom: 12,
              paddingRight: 4
            }}
          >
            {workersLoading ? (
              <div style={{ textAlign: 'center', padding: 32 }}><Spin size="small" /></div>
            ) : (getDisplayedWorkers().length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>暂无符合条件的师傅</div>
            ) : (
              getDisplayedWorkers().map((w: any) => {
                const isSelected = selectedWorkerId === w.id;
                const isBusy = (w.pendingOrders + w.processingOrders) >= 3;
                const hasSkill = selectedOrder && w.skills?.includes(selectedOrder.repairType);
                return (
                  <div
                    key={w.id}
                    onClick={() => {
                      if (isBusy) return;
                      setSelectedWorkerId(w.id);
                      assignForm.setFieldsValue({ workerId: w.id });
                    }}
                    style={{
                      padding: 12,
                      marginBottom: 8,
                      border: `2px solid ${isSelected ? '#1677ff' : isBusy ? '#ffccc7' : '#e8e8e8'}`,
                      borderRadius: 8,
                      cursor: isBusy ? 'not-allowed' : 'pointer',
                      background: isSelected ? '#e6f4ff' : '#fff',
                      opacity: isBusy ? 0.6 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong>{w.name}</strong>
                        {hasSkill && assignMode === 'smart' && (
                          <Tag color="green" style={{ margin: 0 }}>技能匹配</Tag>
                        )}
                        {isBusy && <Tag color="red" style={{ margin: 0 }}>繁忙</Tag>}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {w.skills?.slice(0, 3).map((s: string) => (
                          <Tag key={s} color="blue" style={{ margin: 0 }}>
                            {repairTypeMap[s as keyof typeof repairTypeMap] || s}
                          </Tag>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 12, color: '#666' }}>
                      <div>
                        <div style={{ fontWeight: 500, color: '#fa8c16', fontSize: 16 }}>{w.pendingOrders || 0}</div>
                        <div>待处理</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: '#1677ff', fontSize: 16 }}>{w.processingOrders || 0}</div>
                        <div>处理中</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: '#52c41a', fontSize: 16 }}>{w.completedLast30Days || 0}</div>
                        <div>近30天完成</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: '#722ed1', fontSize: 16 }}>
                          {w.avgCompletionTime || '-'}
                        </div>
                        <div>平均处理</div>
                      </div>
                    </div>
                  </div>
                );
              })
            ))}
          </div>

          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="请输入派单备注（选填）" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setAssignModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" disabled={!selectedWorkerId}>
                确定派单
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OrderListPage;
