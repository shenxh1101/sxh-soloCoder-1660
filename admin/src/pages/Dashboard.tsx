import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Space, Spin, message } from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ToolOutlined,
  TeamOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { api } from '../services/api';
import { RepairOrder, statusMap, statusColorMap, repairTypeMap } from '../types';
import dayjs from 'dayjs';

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<RepairOrder[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashboardData, ordersData] = await Promise.all([
        api.stats.getDashboard(),
        api.orders.getList({ pageSize: 10 })
      ]);

      setStats(dashboardData);
      setRecentOrders((ordersData as any).list || []);
    } catch (error: any) {
      console.error('加载数据失败:', error);
      message.error(error.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBarOption = () => {
    if (!stats?.statusDistribution) return {};
    
    const data = stats.statusDistribution.map((item: any) => ({
      value: item.count,
      name: statusMap[item.status as keyof typeof statusMap] || item.status,
      itemStyle: { color: statusColorMap[item.status as keyof typeof statusColorMap] || '#1677FF' }
    }));

    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 16, fontWeight: 'bold' }
        },
        data
      }]
    };
  };

  const getTrendOption = () => {
    if (!stats?.dailyTrend) return {};

    const dates = stats.dailyTrend.map((item: any) => item._id);
    const counts = stats.dailyTrend.map((item: any) => item.count);
    const completed = stats.dailyTrend.map((item: any) => item.completed);

    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['报修数', '完成数'] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '报修数',
          type: 'line',
          smooth: true,
          data: counts,
          lineStyle: { color: '#1677FF', width: 3 },
          areaStyle: { color: 'rgba(22, 119, 255, 0.1)' }
        },
        {
          name: '完成数',
          type: 'line',
          smooth: true,
          data: completed,
          lineStyle: { color: '#00B42A', width: 3 },
          areaStyle: { color: 'rgba(0, 180, 42, 0.1)' }
        }
      ]
    };
  };

  const getTypeBarOption = () => {
    if (!stats?.repairTypeStats) return {};

    const types = stats.repairTypeStats.map((item: any) => 
      repairTypeMap[item.repairType as keyof typeof repairTypeMap] || item.repairType
    );
    const counts = stats.repairTypeStats.map((item: any) => item.count);

    return {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: types,
        axisLabel: { interval: 0, rotate: 0 }
      },
      yAxis: { type: 'value' },
      series: [{
        type: 'bar',
        data: counts,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#4096FF' },
              { offset: 1, color: '#1677FF' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '50%'
      }]
    };
  };

  const orderColumns = [
    {
      title: '工单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 140
    },
    {
      title: '报修类型',
      dataIndex: 'repairTypeName',
      key: 'repairTypeName',
      width: 100
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true
    },
    {
      title: '报修人',
      dataIndex: ['owner', 'name'],
      key: 'ownerName',
      width: 100
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
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  const overview = stats?.overview || {};

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">数据概览</h2>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <div className="stat-card" style={{ borderTop: '3px solid #1677FF' }}>
            <FileTextOutlined style={{ fontSize: 24, color: '#1677FF', marginBottom: 8 }} />
            <div className="stat-number" style={{ color: '#1677FF' }}>{overview.totalOrders || 0}</div>
            <div className="stat-label">总工单数</div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className="stat-card" style={{ borderTop: '3px solid #FF7D00' }}>
            <ExclamationCircleOutlined style={{ fontSize: 24, color: '#FF7D00', marginBottom: 8 }} />
            <div className="stat-number" style={{ color: '#FF7D00' }}>{overview.pendingOrders || 0}</div>
            <div className="stat-label">待派单</div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className="stat-card" style={{ borderTop: '3px solid #722ED1' }}>
            <ToolOutlined style={{ fontSize: 24, color: '#722ED1', marginBottom: 8 }} />
            <div className="stat-number" style={{ color: '#722ED1' }}>{overview.processingOrders || 0}</div>
            <div className="stat-label">处理中</div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className="stat-card" style={{ borderTop: '3px solid #00B42A' }}>
            <CheckCircleOutlined style={{ fontSize: 24, color: '#00B42A', marginBottom: 8 }} />
            <div className="stat-number" style={{ color: '#00B42A' }}>{overview.completedOrders || 0}</div>
            <div className="stat-label">已完成</div>
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <div className="stat-card">
            <ClockCircleOutlined style={{ fontSize: 20, color: '#1677FF', marginBottom: 8 }} />
            <div style={{ fontSize: 24, fontWeight: 600, color: '#1D2129' }}>
              {overview.avgResponseTime || 0} <span style={{ fontSize: 14 }}>分钟</span>
            </div>
            <div className="stat-label">平均响应时长</div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div className="stat-card">
            <ClockCircleOutlined style={{ fontSize: 20, color: '#00B42A', marginBottom: 8 }} />
            <div style={{ fontSize: 24, fontWeight: 600, color: '#1D2129' }}>
              {overview.avgCompletionTime || 0} <span style={{ fontSize: 14 }}>分钟</span>
            </div>
            <div className="stat-label">平均处理时长</div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div className="stat-card">
            <TeamOutlined style={{ fontSize: 20, color: '#722ED1', marginBottom: 8 }} />
            <div style={{ fontSize: 24, fontWeight: 600, color: '#1D2129' }}>
              {overview.busyWorkers || 0} / {overview.totalWorkers || 0}
            </div>
            <div className="stat-label">忙碌/总维修师傅</div>
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="工单状态分布" className="card-shadow">
            <ReactECharts option={getStatusBarOption()} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="报修类型统计" className="card-shadow">
            <ReactECharts option={getTypeBarOption()} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="近7天报修趋势" className="card-shadow">
            <ReactECharts option={getTrendOption()} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Card
        title="最近工单"
        className="card-shadow"
        extra={<a onClick={() => window.location.href = '#/orders'}>查看全部</a>}
      >
        <Table
          columns={orderColumns}
          dataSource={recentOrders}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default DashboardPage;
