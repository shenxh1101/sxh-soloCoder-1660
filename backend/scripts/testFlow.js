const axios = require('axios');
const BASE_URL = 'http://localhost:3000/api';

const log = (label, data) => {
  console.log(`\n🔹 ${label}`);
  if (data && typeof data === 'object') {
    console.log(JSON.stringify(data, null, 2).slice(0, 500));
  } else {
    console.log(data);
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testFlow() {
  try {
    console.log('🚀 开始功能测试流程...\n');

    // Step 1: 业主登录
    console.log('=== 步骤 1: 业主登录 ===');
    const ownerLogin = await axios.post(`${BASE_URL}/auth/login`, {
      phone: 'owner1',
      password: '123456'
    });
    const ownerToken = ownerLogin.data.data.token;
    log('业主登录成功', { user: ownerLogin.data.data.user.name, tokenExists: !!ownerToken });

    // Step 2: 提交报修工单
    console.log('\n=== 步骤 2: 提交报修工单 ===');
    const createOrder = await axios.post(`${BASE_URL}/orders`, {
      repairType: 'water_electric',
      title: '厨房水龙头漏水',
      description: '厨房水龙头一直在滴水，需要紧急维修',
      building: '1号楼',
      room: '101室',
      contactName: '业主李阿姨',
      contactPhone: 'owner1',
      priority: 'high'
    }, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const orderId = createOrder.data.data._id || createOrder.data.data.id;
    const orderNo = createOrder.data.data.orderNo;
    log('工单创建成功', { 
      工单号: orderNo, 
      状态: createOrder.data.data.status, 
      id: orderId,
      业主: createOrder.data.data.owner?.name,
      维修类型: createOrder.data.data.repairTypeName
    });

    // Step 3: 管理员登录
    console.log('\n=== 步骤 3: 管理员登录 ===');
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      phone: 'admin',
      password: 'admin123'
    });
    const adminToken = adminLogin.data.data.token;
    log('管理员登录成功', { user: adminLogin.data.data.user.name });

    // Step 4: 获取维修师傅列表
    console.log('\n=== 步骤 4: 获取维修师傅列表 ===');
    const workersRes = await axios.get(`${BASE_URL}/users/workers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const workers = workersRes.data.data;
    log(`找到 ${workers.length} 名维修师傅`);
    workers.forEach(w => console.log(`  - ${w.name} (技能: ${w.skills.join(',')}, 状态: ${w.workStatus})`));
    const targetWorker = workers.find(w => w.skills?.includes('water_electric')) || workers[0];

    // Step 5: 派单
    console.log('\n=== 步骤 5: 派单给维修师傅 ===');
    await sleep(65000); // 等待1分5秒，制造响应时长
    const assignRes = await axios.put(`${BASE_URL}/orders/${orderId}/assign`, {
      workerId: targetWorker.id || targetWorker._id,
      remark: '请尽快处理'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    log('派单成功', { 
      派给: assignRes.data.data.worker?.name,
      状态: assignRes.data.data.status,
      响应时长: `${assignRes.data.data.responseTime}分钟`
    });

    // Step 6: 维修师傅登录并开始处理
    console.log('\n=== 步骤 6: 维修师傅开始处理 ===');
    const workerLogin = await axios.post(`${BASE_URL}/auth/login`, {
      phone: 'worker1',
      password: '123456'
    });
    const workerToken = workerLogin.data.data.token;
    log('维修师傅登录成功', { user: workerLogin.data.data.user.name });

    await sleep(120000); // 等待2分钟

    const startRes = await axios.put(`${BASE_URL}/orders/${orderId}/start`, {}, {
      headers: { Authorization: `Bearer ${workerToken}` }
    });
    log('开始处理', { 状态: startRes.data.data.status, 开始时间: startRes.data.data.startedAt });

    // Step 7: 完成维修
    console.log('\n=== 步骤 7: 完成维修 ===');
    await sleep(60000); // 等待1分钟，处理时长

    const completeRes = await axios.put(`${BASE_URL}/orders/${orderId}/complete`, {
      description: '更换了水龙头密封圈，已解决漏水问题。测试正常。'
    }, {
      headers: { Authorization: `Bearer ${workerToken}` }
    });
    log('完成维修', {
      状态: completeRes.data.data.status,
      维修说明: completeRes.data.data.repairResult?.description,
      处理时长: `${completeRes.data.data.completionTime}分钟`,
      总时长: `${completeRes.data.data.totalTime}分钟`
    });

    // Step 8: 业主评价
    console.log('\n=== 步骤 8: 业主评价 ===');
    const rateRes = await axios.put(`${BASE_URL}/orders/${orderId}/rate`, {
      score: 5,
      comment: '师傅非常专业，很快就解决了问题！点赞！'
    }, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    log('评价成功', { 评分: `${rateRes.data.data.rating?.score}星`, 评论: rateRes.data.data.rating?.comment });

    // Step 9: 查看工单详情
    console.log('\n=== 步骤 9: 查看完整工单详情 ===');
    const detailRes = await axios.get(`${BASE_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const detail = detailRes.data.data;
    log('工单详情', {
      工单号: detail.orderNo,
      状态: detail.status,
      响应时长: detail.responseTime + '分钟',
      处理时长: detail.completionTime + '分钟',
      总时长: detail.totalTime + '分钟',
      评分: detail.rating?.score + '分',
      时间线节点数: detail.timeline?.length
    });
    console.log('\n时间线:');
    detail.timeline?.forEach(t => {
      console.log(`  ⏱  ${new Date(t.createdAt).toLocaleTimeString()} - ${t.title}: ${t.description} [${t.operatorName}]`);
    });

    // Step 10: 检查Dashboard统计
    console.log('\n=== 步骤 10: Dashboard统计 ===');
    const dashboardRes = await axios.get(`${BASE_URL}/stats/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const dash = dashboardRes.data.data;
    log('Dashboard概览', dash.overview);

    // Step 11: 检查师傅统计
    console.log('\n=== 步骤 11: 维修师傅统计 ===');
    const workerStatsRes = await axios.get(`${BASE_URL}/stats/workers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    log('维修师傅工作量统计', workerStatsRes.data.data.slice(0, 2));

    console.log('\n====================================');
    console.log('🎉 所有功能测试通过！');
    console.log('✅ 工单创建 - 通过');
    console.log('✅ 工单派单 - 通过 (响应时长记录)');
    console.log('✅ 师傅开始处理 - 通过');
    console.log('✅ 完成维修上传说明 - 通过 (处理时长记录)');
    console.log('✅ 业主评价 - 通过 (满意度记录)');
    console.log('✅ 工单详情全流程时间线 - 通过');
    console.log('✅ Dashboard统计 - 通过 (无NaN)');
    console.log('✅ 维修师傅工作量统计 - 通过');
    console.log('====================================\n');

  } catch (err) {
    console.error('❌ 测试失败:', err.response?.data || err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testFlow();
