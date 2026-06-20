const generateOrderNo = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BX${year}${month}${day}${random}`;
};

const repairTypeMap = {
  water_electric: '水电维修',
  access_control: '门禁系统',
  elevator: '电梯故障',
  public_facility: '公共设施',
  other: '其他报修'
};

const statusMap = {
  pending: '待派单',
  assigned: '已派单',
  processing: '处理中',
  completed: '已完成',
  cancelled: '已取消',
  closed: '已关闭'
};

const statusColorMap = {
  pending: '#faad14',
  assigned: '#1890ff',
  processing: '#722ed1',
  completed: '#52c41a',
  cancelled: '#8c8c8c',
  closed: '#8c8c8c'
};

const calculateDuration = (start, end) => {
  if (!start || !end) return null;
  return Math.floor((new Date(end) - new Date(start)) / 1000 / 60);
};

const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined || isNaN(Number(minutes)) || Number(minutes) === 0) return '-';
  const m = Number(minutes);
  if (m < 60) return `${m}分钟`;
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  if (hours < 24) return `${hours}小时${mins}分钟`;
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return `${days}天${remainHours}小时${mins}分钟`;
};

module.exports = {
  generateOrderNo,
  repairTypeMap,
  statusMap,
  statusColorMap,
  calculateDuration,
  formatDuration
};
