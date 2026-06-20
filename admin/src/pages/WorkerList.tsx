import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Modal,
  Form,
  message,
  Popconfirm,
  Spin,
  Card,
  Avatar,
  Descriptions,
  Progress,
  Tooltip
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { api } from '../services/api';
import { repairTypeMap } from '../types';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;

const WorkerListPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWorker, setEditingWorker] = useState<any>(null);
  const [workerForm] = Form.useForm();
  const [filters, setFilters] = useState({
    keyword: '',
    skill: '',
    status: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [workersData, workloadData] = await Promise.all([
        api.users.getList({ role: 'worker' }),
        api.orders.getWorkerWorkload()
      ]);

      const workersWithLoad = (workersData as any).list?.map((w: any) => {
        const load = (workloadData as any[]).find((l: any) => l._id === w.id);
        return {
          ...w,
          pendingOrders: load?.pendingOrders || 0,
          processingOrders: load?.processingOrders || 0,
          completedOrders: load?.completedOrders || 0,
          totalOrders: load?.totalOrders || 0,
          avgCompletionTime: load?.avgCompletionTime || 0,
          workloadLevel: load ? Math.min(100, ((load.pendingOrders + load.processingOrders) / 3) * 100) : 0
        };
      }) || [];

      setWorkers(workersWithLoad);
      setPagination(prev => ({ ...prev, total: (workersData as any).pagination?.total || 0 }));
      setWorkload(workloadData as any[]);
    } catch (error: any) {
      console.error('加载数据失败:', error);
      message.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadData();
  };

  const handleReset = () => {
    setFilters({ keyword: '', skill: '', status: '' });
    setTimeout(() => loadData(), 100);
  };

  const handleAdd = () => {
    setEditingWorker(null);
    workerForm.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (worker: any) => {
    setEditingWorker(worker);
    workerForm.setFieldsValue({
      name: worker.name,
      phone: worker.phone,
      skills: worker.skills || [],
      status: worker.status
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.users.delete(id);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      console.error('删除失败:', error);
      message.error(error.message || '删除失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingWorker) {
        await api.users.updateWorker(editingWorker.id, values);
        message.success('更新成功');
      } else {
        await api.users.createWorker({
          ...values,
          password: '123456'
        });
        message.success('创建成功');
      }
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      console.error('保存失败:', error);
      message.error(error.message || '保存失败');
    }
  };

  const getWorkloadColor = (level: number) => {
    if (level < 33) return '#00B42A';
    if (level < 66) return '#FF7D00';
    return '#F53F3F';
  };

  const filteredWorkers = workers.filter(w => {
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      if (!w.name?.toLowerCase().includes(keyword) && 
          !w.phone?.toLowerCase().includes(keyword)) {
        return false;
      }
    }
    if (filters.skill && !w.skills?.includes(filters.skill)) {
      return false;
    }
    if (filters.status && w.status !== filters.status) {
      return false;
    }
    return true;
  });

  const columns: ColumnsType<any> = [
    {
      title: '师傅信息',
      key: 'worker',
      width: 180,
      fixed: 'left',
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677FF' }}>
            {record.name?.charAt(0)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            <div style={{ color: '#86909c', fontSize: 12 }}>{record.phone}</div>
          </div>
        </Space>
      )
    },
    {
      title: '技能',
      dataIndex: 'skills',
      key: 'skills',
      width: 200,
      render: (skills: string[]) => (
        <Space wrap>
          {(skills || []).map(skill => (
            <Tag key={skill} color="blue">
              {repairTypeMap[skill as keyof typeof repairTypeMap] || skill}
            </Tag>
          ))}
        </Space>
      )
    },
    {
      title: '当前负载',
      key: 'workload',
      width: 200,
      render: (_, record) => (
        <Tooltip title={`待处理: ${record.pendingOrders}单, 处理中: ${record.processingOrders}单`}>
          <Progress
            percent={Math.round(record.workloadLevel)}
            strokeColor={getWorkloadColor(record.workloadLevel)}
            size="small"
            format={(percent) => 
              percent === 0 ? '空闲' : 
              percent < 33 ? '轻松' :
              percent < 66 ? '适中' : '繁忙'
            }
          />
        </Tooltip>
      )
    },
    {
      title: '今日处理',
      dataIndex: 'pendingOrders',
      key: 'pending',
      width: 100,
      align: 'center',
      render: (pending: number, record) => (
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#FF7D00' }}>
            {record.processingOrders}
          </div>
          <div style={{ fontSize: 12, color: '#86909c' }}>处理中</div>
        </div>
      )
    },
    {
      title: '累计处理',
      dataIndex: 'completedOrders',
      key: 'completed',
      width: 100,
      align: 'center',
      render: (count: number) => (
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#00B42A' }}>{count}</div>
          <div style={{ fontSize: 12, color: '#86909c' }}>已完成</div>
        </div>
      )
    },
    {
      title: '平均耗时',
      dataIndex: 'avgCompletionTime',
      key: 'avgTime',
      width: 120,
      align: 'center',
      render: (minutes: number) => {
        if (!minutes) return <div style={{ color: '#86909c' }}>-</div>;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return (
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#722ED1' }}>
              {hours > 0 ? `${hours}h${mins}m` : `${mins}m`}
            </div>
            <div style={{ fontSize: 12, color: '#86909c' }}>平均</div>
          </div>
        );
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? '在岗' : '休息'}
        </Tag>
      )
    },
    {
      title: '入职时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除该师傅吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">维修师傅管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增师傅
        </Button>
      </div>

      <Card className="card-shadow" style={{ marginBottom: 16 }}>
        <div className="filter-bar">
          <Input
            placeholder="搜索姓名、电话"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            allowClear
          />
          <Select
            placeholder="技能筛选"
            style={{ width: 140 }}
            value={filters.skill || undefined}
            onChange={(value) => setFilters(prev => ({ ...prev, skill: value || '' }))}
            allowClear
          >
            {Object.entries(repairTypeMap).map(([key, value]) => (
              <Option key={key} value={key}>{value}</Option>
            ))}
          </Select>
          <Select
            placeholder="状态筛选"
            style={{ width: 120 }}
            value={filters.status || undefined}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value || '' }))}
            allowClear
          >
            <Option value="active">在岗</Option>
            <Option value="inactive">休息</Option>
          </Select>
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
          dataSource={filteredWorkers}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 位师傅`
          }}
        />
      </Card>

      <Modal
        title={editingWorker ? '编辑维修师傅' : '新增维修师傅'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={workerForm}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="账号"
            rules={[
              { required: true, message: '请输入账号' }
            ]}
          >
            <Input placeholder="请输入账号" disabled={!!editingWorker} />
          </Form.Item>
          <Form.Item
            name="skills"
            label="技能标签"
            rules={[{ required: true, message: '请选择至少一项技能' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择技能（可多选）"
              options={Object.entries(repairTypeMap).map(([key, value]) => ({
                label: value,
                value: key
              }))}
            />
          </Form.Item>
          {editingWorker && (
            <Form.Item
              name="status"
              label="状态"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select placeholder="请选择状态">
                <Option value="active">在岗</Option>
                <Option value="inactive">休息</Option>
              </Select>
            </Form.Item>
          )}
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingWorker ? '保存修改' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WorkerListPage;
