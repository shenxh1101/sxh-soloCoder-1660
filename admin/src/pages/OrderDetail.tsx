import React, { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Image,
  Timeline,
  Space,
  Button,
  Modal,
  Form,
  Select,
  Input,
  message,
  Popconfirm,
  Spin,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  EnvironmentOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { RepairOrder, statusMap, statusColorMap, priorityMap, priorityColorMap, repairTypeMap } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;

const OrderDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [assignForm] = Form.useForm();

  useEffect(() => {
    if (id) {
      loadOrderDetail();
    }
  }, [id]);

  const loadOrderDetail = async () => {
    try {
      setLoading(true);
      const data = await api.orders.getDetail(id!) as RepairOrder;
      setOrder(data);
    } catch (error: any) {
      console.error('加载工单详情失败:', error);
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
          currentOrderCount: load?.pendingOrders || 0
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

  const handleAssignClick = () => {
    assignForm.resetFields();
    setAssignModalVisible(true);
    loadWorkers();
  };

  const handleAssignSubmit = async (values: any) => {
    try {
      await api.orders.assign(id!, values.workerId, values.remark);
      message.success('派单成功');
      setAssignModalVisible(false);
      loadOrderDetail();
    } catch (error: any) {
      console.error('派单失败:', error);
      message.error(error.message || '派单失败');
    }
  };

  const handleCancelOrder = async () => {
    try {
      await api.orders.cancel(id!, '客服取消');
      message.success('工单已取消');
      loadOrderDetail();
    } catch (error: any) {
      console.error('取消工单失败:', error);
      message.error(error.message || '取消失败');
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}小时${mins}分钟`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-container">
        <Card>工单不存在</Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>
            返回列表
          </Button>
          <h2 className="page-title">工单详情</h2>
        </Space>
        <Space>
          {order.status === 'pending' && (
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleAssignClick}>
              派单
            </Button>
          )}
          {(order.status === 'pending' || order.status === 'assigned') && (
            <Popconfirm
              title="确定要取消该工单吗？"
              onConfirm={handleCancelOrder}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<CloseCircleOutlined />}>
                取消工单
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      <Card className="card-shadow" style={{ marginBottom: 16 }}>
        <Descriptions
          title={
            <Space size="middle">
              <span style={{ fontSize: 16, fontWeight: 600 }}>
                #{order.orderNo} - {order.title}
              </span>
              <Tag color={statusColorMap[order.status]}>
                {statusMap[order.status]}
              </Tag>
              <Tag color={priorityColorMap[order.priority]}>
                优先级：{priorityMap[order.priority]}
              </Tag>
            </Space>
          }
          column={3}
          bordered
          size="middle"
        >
          <Descriptions.Item label="报修类型">{order.repairTypeName}</Descriptions.Item>
          <Descriptions.Item label="提交时间">
            {dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {dayjs(order.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="问题描述" span={3}>
            {order.description}
          </Descriptions.Item>
          {order.images && order.images.length > 0 && (
            <Descriptions.Item label="报修图片" span={3}>
              <Image.PreviewGroup>
                <Space wrap>
                  {order.images.map((img, idx) => (
                    <Image
                      key={idx}
                      width={100}
                      height={100}
                      src={img}
                      style={{ borderRadius: 4, objectFit: 'cover' }}
                    />
                  ))}
                </Space>
              </Image.PreviewGroup>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card title="报修人信息" className="card-shadow">
            <Descriptions column={1} size="small">
              <Descriptions.Item label={<><UserOutlined /> 姓名</>}>
                {order.owner?.name}
              </Descriptions.Item>
              <Descriptions.Item label={<><PhoneOutlined /> 联系电话</>}>
                {order.contact?.phone || order.owner?.phone}
              </Descriptions.Item>
              <Descriptions.Item label={<><EnvironmentOutlined /> 位置</>}>
                {order.location?.building} {order.location?.room}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="维修人员信息" className="card-shadow">
            {order.worker ? (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="姓名">{order.worker.name}</Descriptions.Item>
                <Descriptions.Item label="电话">{order.worker.phone}</Descriptions.Item>
                <Descriptions.Item label="技能">
                  {order.worker.skills?.map(s => repairTypeMap[s as keyof typeof repairTypeMap] || s).join('、') || '暂无'}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <div style={{ color: '#86909c', textAlign: 'center', padding: 20 }}>
                暂未派单
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {(order.responseTime || order.completionTime || order.totalTime) && (
        <Card title="处理时效" className="card-shadow" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            {order.responseTime && (
              <Col span={8}>
                <div className="stat-card">
                  <Statistic
                    title="响应时长"
                    value={formatDuration(order.responseTime)}
                    valueStyle={{ fontSize: 20, color: '#1677FF' }}
                  />
                </div>
              </Col>
            )}
            {order.completionTime && (
              <Col span={8}>
                <div className="stat-card">
                  <Statistic
                    title="处理时长"
                    value={formatDuration(order.completionTime)}
                    valueStyle={{ fontSize: 20, color: '#00B42A' }}
                  />
                </div>
              </Col>
            )}
            {order.totalTime && (
              <Col span={8}>
                <div className="stat-card">
                  <Statistic
                    title="总时长"
                    value={formatDuration(order.totalTime)}
                    valueStyle={{ fontSize: 20, color: '#722ED1' }}
                  />
                </div>
              </Col>
            )}
          </Row>
        </Card>
      )}

      {order.repairResult && (
        <Card title="维修结果" className="card-shadow" style={{ marginBottom: 16 }}>
          <p style={{ marginBottom: 12 }}>{order.repairResult.description}</p>
          {order.repairResult.images && order.repairResult.images.length > 0 && (
            <Image.PreviewGroup>
              <Space wrap>
                {order.repairResult.images.map((img, idx) => (
                  <Image
                    key={idx}
                    width={100}
                    height={100}
                    src={img}
                    style={{ borderRadius: 4, objectFit: 'cover' }}
                  />
                ))}
              </Space>
            </Image.PreviewGroup>
          )}
        </Card>
      )}

      {order.rating && (
        <Card title="业主评价" className="card-shadow" style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ marginRight: 8 }}>评分：</span>
            {[1, 2, 3, 4, 5].map(star => (
              <span
                key={star}
                style={{
                  color: star <= order.rating!.score ? '#FFD700' : '#E5E6EB',
                  fontSize: 20
                }}
              >
                ★
              </span>
            ))}
            <span style={{ marginLeft: 12, color: '#86909c' }}>
              {order.rating.score}分
            </span>
          </div>
          {order.rating.comment && (
            <p style={{ color: '#4E5969', marginBottom: 8 }}>{order.rating.comment}</p>
          )}
          <p style={{ color: '#86909c', fontSize: 12 }}>
            评价时间：{dayjs(order.rating.ratedAt).format('YYYY-MM-DD HH:mm:ss')}
          </p>
        </Card>
      )}

      <Card title="处理进度" className="card-shadow">
        <Timeline
          className="timeline-custom"
          items={order.timeline.map(item => ({
            color: statusColorMap[item.status] || '#1677FF',
            children: (
              <div>
                <div style={{ fontWeight: 500 }}>{item.title}</div>
                <div style={{ color: '#4E5969', fontSize: 14, marginTop: 4 }}>
                  {item.description}
                </div>
                {item.operatorName && (
                  <div style={{ color: '#86909c', fontSize: 12, marginTop: 4 }}>
                    操作人：{item.operatorName}
                  </div>
                )}
                <div style={{ color: '#86909c', fontSize: 12, marginTop: 4 }}>
                  {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </div>
              </div>
            )
          }))}
        />
      </Card>

      <Modal
        title="分配维修师傅"
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={handleAssignSubmit}
        >
          <Form.Item
            name="workerId"
            label="选择维修师傅"
            rules={[{ required: true, message: '请选择维修师傅' }]}
          >
            <Select
              placeholder="请选择维修师傅"
              loading={workersLoading}
              optionFilterProp="label"
              options={workers.map(w => ({
                value: w.id,
                label: `${w.name} (当前${w.currentOrderCount}单待处理) - ${w.skills?.join('、') || '无技能标签'}`,
                disabled: w.currentOrderCount >= 3
              }))}
            />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请输入派单备注（选填）" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setAssignModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">确定派单</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OrderDetailPage;
