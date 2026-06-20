import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  DatePicker,
  Button,
  Table,
  Space,
  Tag,
  Statistic,
  Spin,
  message,
  Select,
  Input
} from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  UserOutlined,
  StarOutlined,
  SearchOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { api } from '../services/api';
import { statusMap, statusColorMap, repairTypeMap } from '../types';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { RangePicker } = DatePicker;
const { Option } = Select;

const StatsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [typeStats, setTypeStats] = useState<any[]>([]);
  const [workerStats, setWorkerStats] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    dateRange: [dayjs().subtract(30, 'day'), dayjs()] as any,
    status: '',
    repairType: '',
    keyword: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {
        startDate: filters.dateRange[0].format('YYYY-MM-DD'),
        endDate: filters.dateRange[1].format('YYYY-MM-DD')
      };

      const [typeData, workerData, ordersData] = await Promise.all([
        api.stats.getRepairTypeStats(params),
        api.stats.getWorkerStats(params),
        api.orders.getList({ ...params, pageSize: 1000 })
      ]);

      setTypeStats(typeData as any[]);
      setWorkerStats(workerData as any[]);
      setOrders((ordersData as any).list || []);
    } catch (error: any) {
      console.error('加载统计数据失败:', error);
      message.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      const params: any = {
        startDate: filters.dateRange[0].format('YYYY-MM-DD'),
        endDate: filters.dateRange[1].format('YYYY-MM-DD')
      };
      if (filters.status) params.status = filters.status;
      if (filters.repairType) params.repairType = filters.repairType;

      const blob = await api.stats.exportOrders(params) as Blob;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `报修工单明细_${dayjs().format('YYYYMMDDHHmm')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error: any) {
      console.error('导出失败:', error);
      message.error(error.message || '导出失败');
    } finally {
      setExportLoading(false);
    }
  };

  const getTypeTimeOption = () => {
    if (!typeStats.length) return {};

    const types = typeStats.map(item =>
      repairTypeMap[item._id as keyof typeof repairTypeMap] ||
      repairTypeMap[item.repairType as keyof typeof repairTypeMap] ||
      item.repairTypeName || item._id
    );
    const avgResponse = typeStats.map(item => item.avgResponseTimeMinutes ?? item.avgResponseTimeNum ?? 0);
    const avgCompletion = typeStats.map(item => item.avgCompletionTimeMinutes ?? item.avgCompletionTimeNum ?? 0);

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['平均响应时间(分钟)', '平均处理时间(分钟)'] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: types,
        axisLabel: { interval: 0, rotate: 0 }
      },
      yAxis: { type: 'value', name: '分钟' },
      series: [
        {
          name: '平均响应时间(分钟)',
          type: 'bar',
          data: avgResponse,
          itemStyle: { color: '#1677FF', borderRadius: [4, 4, 0, 0] },
          barWidth: '35%'
        },
        {
          name: '平均处理时间(分钟)',
          type: 'bar',
          data: avgCompletion,
          itemStyle: { color: '#00B42A', borderRadius: [4, 4, 0, 0] },
          barWidth: '35%'
        }
      ]
    };
  };

  const getWorkerRankOption = () => {
    if (!workerStats.length) return {};

    const sortedWorkers = [...workerStats].sort((a, b) => b.totalOrders - a.totalOrders).slice(0, 10);
    const names = sortedWorkers.map(item => item.workerName || '未知');
    const counts = sortedWorkers.map(item => item.totalOrders || 0);

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', name: '工单数量' },
      yAxis: {
        type: 'category',
        data: names,
        axisLabel: { width: 80, overflow: 'truncate' }
      },
      series: [{
        type: 'bar',
        data: counts,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#1677FF' },
              { offset: 1, color: '#4096FF' }
            ]
          },
          borderRadius: [0, 4, 4, 0]
        },
        label: { show: true, position: 'right' },
        barWidth: '60%'
      }]
    };
  };

  const calculateSummary = () => {
    const completed = orders.filter(o => o.status === 'completed' || o.status === 'closed');
    const totalRating = completed.reduce((sum, o) => sum + (o.rating?.score || 0), 0);
    const avgRating = completed.length > 0 ? (totalRating / completed.length).toFixed(1) : '0';
    
    const totalResponseTime = orders.reduce((sum, o) => sum + (o.responseTime || 0), 0);
    const totalCompletionTime = completed.reduce((sum, o) => sum + (o.completionTime || 0), 0);
    
    const avgResponse = orders.length > 0 ? Math.round(totalResponseTime / orders.length) : 0;
    const avgCompletion = completed.length > 0 ? Math.round(totalCompletionTime / completed.length) : 0;

    return {
      total: orders.length,
      completed: completed.length,
      avgRating,
      avgResponse,
      avgCompletion
    };
  };

  const summary = calculateSummary();

  const filteredOrders = orders.filter(o => {
    if (filters.status && o.status !== filters.status) return false;
    if (filters.repairType && o.repairType !== filters.repairType) return false;
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      return (
        o.orderNo?.toLowerCase().includes(kw) ||
        o.title?.toLowerCase().includes(kw) ||
        o.owner?.name?.toLowerCase().includes(kw) ||
        o.worker?.name?.toLowerCase().includes(kw)
      );
    }
    return true;
  });

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatRating = (score?: number) => {
    if (!score) return '-';
    return (
      <span>
        <span style={{ color: '#FFD700' }}>
          {'★'.repeat(score)}{'☆'.repeat(5 - score)}
        </span>
        <span style={{ marginLeft: 4 }}>{score}分</span>
      </span>
    );
  };

  const detailColumns: ColumnsType<any> = [
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
      title: '维修师傅',
      dataIndex: ['worker', 'name'],
      key: 'workerName',
      width: 100,
      render: (name) => name || '-'
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
      title: '响应时长',
      dataIndex: 'responseTime',
      key: 'responseTime',
      width: 100,
      align: 'center',
      render: formatDuration
    },
    {
      title: '处理时长',
      dataIndex: 'completionTime',
      key: 'completionTime',
      width: 100,
      align: 'center',
      render: formatDuration
    },
    {
      title: '满意度',
      dataIndex: ['rating', 'score'],
      key: 'rating',
      width: 120,
      align: 'center',
      render: formatRating
    },
    {
      title: '完成时间',
      dataIndex: 'completedAt',
      key: 'completedAt',
      width: 160,
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">统计报表</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新数据
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={exportLoading}
            onClick={handleExport}
          >
            导出报表
          </Button>
        </Space>
      </div>

      <Card className="card-shadow" style={{ marginBottom: 16 }}>
        <div className="filter-bar">
          <span style={{ color: '#4E5969', fontWeight: 500 }}>统计周期：</span>
          <RangePicker
            value={filters.dateRange}
            onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates as any }))}
          />
          <Button type="primary" onClick={loadData}>查询</Button>
        </div>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <div className="stat-card">
            <BarChartOutlined style={{ fontSize: 20, color: '#1677FF', marginBottom: 8 }} />
            <Statistic
              title="总工单量"
              value={summary.total}
              valueStyle={{ color: '#1677FF', fontSize: 28 }}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className="stat-card">
            <ClockCircleOutlined style={{ fontSize: 20, color: '#00B42A', marginBottom: 8 }} />
            <Statistic
              title="平均响应时长"
              value={formatDuration(summary.avgResponse)}
              valueStyle={{ color: '#00B42A', fontSize: 28 }}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className="stat-card">
            <ClockCircleOutlined style={{ fontSize: 20, color: '#722ED1', marginBottom: 8 }} />
            <Statistic
              title="平均处理时长"
              value={formatDuration(summary.avgCompletion)}
              valueStyle={{ color: '#722ED1', fontSize: 28 }}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className="stat-card">
            <StarOutlined style={{ fontSize: 20, color: '#FF7D00', marginBottom: 8 }} />
            <Statistic
              title="平均满意度"
              value={summary.avgRating}
              suffix="分"
              valueStyle={{ color: '#FF7D00', fontSize: 28 }}
            />
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="各类型报修平均处理时长" className="card-shadow">
            <ReactECharts option={getTypeTimeOption()} style={{ height: 350 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="维修师傅工作量排行榜" className="card-shadow">
            <ReactECharts option={getWorkerRankOption()} style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>

      <Card title="维修师傅工作量明细" className="card-shadow" style={{ marginBottom: 16 }}>
        <Table
          dataSource={workerStats}
          rowKey="_id"
          size="middle"
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: '排名',
              key: 'rank',
              width: 60,
              align: 'center',
              render: (_, __, index) => {
                const medals = ['🥇', '🥈', '🥉'];
                return medals[index] || index + 1;
              }
            },
            {
              title: '维修师傅',
              dataIndex: 'workerName',
              key: 'workerName',
              width: 120,
              render: (name) => (
                <Space>
                  <UserOutlined />
                  {name}
                </Space>
              )
            },
            {
              title: '总工单数',
              dataIndex: 'totalOrders',
              key: 'totalOrders',
              width: 100,
              align: 'center',
              render: (val) => <strong style={{ color: '#1677FF' }}>{val || 0}</strong>
            },
            {
              title: '已完成',
              dataIndex: 'completedOrders',
              key: 'completedOrders',
              width: 80,
              align: 'center'
            },
            {
              title: '处理中',
              dataIndex: 'processingOrders',
              key: 'processingOrders',
              width: 80,
              align: 'center'
            },
            {
              title: '平均响应时长',
              dataIndex: 'avgResponseTime',
              key: 'avgResponseTime',
              width: 120,
              align: 'center',
              render: formatDuration
            },
            {
              title: '平均处理时长',
              dataIndex: 'avgCompletionTime',
              key: 'avgCompletionTime',
              width: 120,
              align: 'center',
              render: formatDuration
            },
            {
              title: '平均评分',
              dataIndex: 'avgRating',
              key: 'avgRating',
              width: 100,
              align: 'center',
              render: (val) => val ? `${val.toFixed(1)}分` : '-'
            }
          ]}
        />
      </Card>

      <Card title="报修工单明细" className="card-shadow">
        <div className="filter-bar" style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索工单号、标题、报修人、维修师傅"
            prefix={<SearchOutlined />}
            style={{ width: 280 }}
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
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
        </div>
        <Table
          columns={detailColumns}
          dataSource={filteredOrders}
          rowKey="id"
          scroll={{ x: 1300 }}
          size="middle"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </Card>
    </div>
  );
};

export default StatsPage;
