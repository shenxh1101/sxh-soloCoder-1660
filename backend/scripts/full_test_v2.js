const axios = require('axios');
const BASE_URL = 'http://localhost:3000/api';
const fs = require('fs');
const path = require('path');

const log = (label, data) => {
  console.log(`\n🔹 ${label}`);
  if (data && typeof data === 'object') {
    const str = JSON.stringify(data, null, 2);
    console.log(str.length > 500 ? str.slice(0, 500) + '...' : str);
  } else {
    console.log(data);
  }
};

const hasNaN = (str) => String(str).includes('NaN');

async function test() {
  const cleanup = [];
  try {
    console.log('🚀 开始4个需求端到端测试...\n');

    // 登录
    const ownerLogin = await axios.post(`${BASE_URL}/auth/login`, { phone: 'owner1', password: '123456' });
    const ownerToken = ownerLogin.data.data.token;
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, { phone: 'admin', password: 'admin123' });
    const adminToken = adminLogin.data.data.token;
    const workerLogin = await axios.post(`${BASE_URL}/auth/login`, { phone: 'worker1', password: '123456' });
    const workerToken = workerLogin.data.data.token;

    // ═══════════════════════════════════════════════════
    // 需求1: 报修图片持久化
    // ═══════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════');
    console.log('🧪 需求1: 报修图片持久化（上传后列表、详情、后台都能看到）');
    console.log('═══════════════════════════════════════════════════');

    // 模拟图片URL（ImageUploader上传后返回的格式）
    const testImages = [
      '/uploads/general/test_img_1.jpg',
      '/uploads/general/test_img_2.jpg'
    ];

    const createRes = await axios.post(`${BASE_URL}/orders`, {
      repairType: 'water_electric',
      title: '水管漏水',
      description: '厨房水龙头漏水严重，希望尽快处理',
      building: '1号楼',
      room: '302',
      contactName: '业主李先生',
      contactPhone: '13800000001',
      priority: 'high',
      images: testImages
    }, { headers: { Authorization: `Bearer ${ownerToken}` } });
    const orderId = createRes.data.data._id || createRes.data.data.id;
    const orderNo = createRes.data.data.orderNo;
    cleanup.push(['order', orderId]);

    log('✅ 业主提交带图片的报修成功', {
      工单号: orderNo,
      状态: createRes.data.data.status,
      报修图片: createRes.data.data.images,
      图片数量: createRes.data.data.images?.length || 0
    });

    // 1. 业主工单列表能看到缩略图
    const ownerList = await axios.get(`${BASE_URL}/orders`, {
      params: { pageSize: 50 },
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const listOrder = ownerList.data.data.list?.find(o => String(o._id || o.id) === String(orderId));
    const listHasImages = listOrder?.images?.length === 2 && 
      listOrder.images[0] === testImages[0] && 
      listOrder.images[1] === testImages[1];
    log(`业主端工单列表: 图片正确显示 ${listHasImages ? '✅是' : '❌否'}`, {
      列表图片: listOrder?.images,
      期望: testImages
    });

    // 2. 业主工单详情能看到图片
    const ownerDetail = await axios.get(`${BASE_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const detailImages = ownerDetail.data.data.images;
    const detailHasImages = detailImages?.length === 2 && 
      detailImages[0] === testImages[0] && 
      detailImages[1] === testImages[1];
    log(`业主端工单详情: 图片正确显示 ${detailHasImages ? '✅是' : '❌否'}`, {
      详情图片: detailImages
    });

    // 3. 客服后台能看到图片
    const adminDetail = await axios.get(`${BASE_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminImages = adminDetail.data.data.images;
    const adminHasImages = adminImages?.length === 2 && 
      adminImages[0] === testImages[0] && 
      adminImages[1] === testImages[1];
    log(`客服后台工单详情: 图片正确显示 ${adminHasImages ? '✅是' : '❌否'}`, {
      后台图片: adminImages
    });

    const req1Pass = listHasImages && detailHasImages && adminHasImages;
    console.log(`\n✅ 需求1: ${req1Pass ? '通过' : '❌失败'}`);

    // ═══════════════════════════════════════════════════
    // 需求2: 维修后图片持久化
    // ═══════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════');
    console.log('🧪 需求2: 维修后图片持久化（和维修说明一起保存）');
    console.log('═══════════════════════════════════════════════════');

    // 客服派单
    const assignRes = await axios.put(`${BASE_URL}/orders/${orderId}/assign`, {
      workerId: workerLogin.data.data.user.id,
      remark: '请尽快处理'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });

    // 师傅开始处理
    await axios.put(`${BASE_URL}/orders/${orderId}/start`, {}, {
      headers: { Authorization: `Bearer ${workerToken}` }
    });

    // 师傅完成维修，上传维修后图片
    const repairImages = [
      '/uploads/repairImages/repair_1.jpg',
      '/uploads/repairImages/repair_2.jpg'
    ];
    const repairDesc = '已更换水龙头密封圈，调试后无漏水现象，水压正常。';
    
    const completeRes = await axios.put(`${BASE_URL}/orders/${orderId}/complete`, {
      description: repairDesc,
      images: repairImages
    }, { headers: { Authorization: `Bearer ${workerToken}` } });

    const repairResult = completeRes.data.data.repairResult;
    log('✅ 师傅完成维修', {
      维修说明: repairResult?.description,
      维修图片: repairResult?.images,
      图片数量: repairResult?.images?.length || 0
    });

    // 维修说明和图片都正确保存
    const descOK = repairResult?.description?.includes('更换水龙头');
    const imagesOK = repairResult?.images?.length === 2 &&
      repairResult.images[0] === repairImages[0] &&
      repairResult.images[1] === repairImages[1];

    // 业主端看维修结果
    const ownerDetail2 = await axios.get(`${BASE_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const ownerRepair = ownerDetail2.data.data.repairResult;
    const ownerDescOK = ownerRepair?.description?.includes('更换水龙头');
    const ownerImagesOK = ownerRepair?.images?.length === 2;

    // 客服后台看维修结果
    const adminDetail2 = await axios.get(`${BASE_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminRepair = adminDetail2.data.data.repairResult;
    const adminDescOK = adminRepair?.description?.includes('更换水龙头');
    const adminImagesOK = adminRepair?.images?.length === 2;

    log('维修结果验证', {
      师傅端: { 说明OK: descOK, 图片OK: imagesOK },
      业主端: { 说明OK: ownerDescOK, 图片OK: ownerImagesOK },
      客服后台: { 说明OK: adminDescOK, 图片OK: adminImagesOK }
    });

    const req2Pass = descOK && imagesOK && ownerDescOK && ownerImagesOK && adminDescOK && adminImagesOK;
    console.log(`\n✅ 需求2: ${req2Pass ? '通过' : '❌失败'}`);

    // ═══════════════════════════════════════════════════
    // 需求3: 统计报表时长显示格式，无NaN
    // ═══════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════');
    console.log('🧪 需求3: 统计报表时长格式正确，无NaN/NaNh');
    console.log('═══════════════════════════════════════════════════');

    // 先完成多几个工单让统计有数据
    for (let i = 0; i < 3; i++) {
      const o = await axios.post(`${BASE_URL}/orders`, {
        repairType: 'water_electric',
        title: `测试工单${i}`,
        description: '测试描述',
        building: '1号楼',
        room: `10${i}`,
        contactName: '测试业主',
        contactPhone: '13800000000',
        priority: 'medium'
      }, { headers: { Authorization: `Bearer ${ownerToken}` } });
      const oid = o.data.data._id;
      cleanup.push(['order', oid]);
      
      await axios.put(`${BASE_URL}/orders/${oid}/assign`, {
        workerId: workerLogin.data.data.user.id
      }, { headers: { Authorization: `Bearer ${adminToken}` } });
      await axios.put(`${BASE_URL}/orders/${oid}/start`, {}, {
        headers: { Authorization: `Bearer ${workerToken}` }
      });
      // 等一小段时间模拟维修
      await new Promise(r => setTimeout(r, 10));
      await axios.put(`${BASE_URL}/orders/${oid}/complete`, {
        description: '测试完成',
        images: []
      }, { headers: { Authorization: `Bearer ${workerToken}` } });
    }

    // 获取统计数据
    const workerStats = await axios.get(`${BASE_URL}/stats/workers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const ws = workerStats.data.data || [];

    console.log(`\n维修师傅工作量明细（共${ws.length}人）:`);
    let formatOK = true;
    let noNaN = true;
    ws.forEach(w => {
      const respNaN = hasNaN(w.avgResponseTime);
      const compNaN = hasNaN(w.avgCompletionTime);
      if (respNaN || compNaN) noNaN = false;
      
      // 检查格式：应该是 "X分钟" 或 "X小时Y分钟" 或 "-"
      const respFormat = /^(\d+分钟|\d+小时\d+分钟|-)$/.test(w.avgResponseTime);
      const compFormat = /^(\d+分钟|\d+小时\d+分钟|-)$/.test(w.avgCompletionTime);
      if (!respFormat || !compFormat) formatOK = false;
      
      console.log(`  ${w.workerName}: 响应=${w.avgResponseTime}, 处理=${w.avgCompletionTime}, 评分=${w.avgRating}` +
        ` ${respNaN ? '❌NaN' : respFormat ? '✅格式' : '⚠️ 格式错'} ${compNaN ? '❌NaN' : compFormat ? '✅格式' : '⚠️ 格式错'}`);
    });

    // 筛选后再检查
    const wsFiltered = await axios.get(`${BASE_URL}/stats/workers`, {
      params: { status: 'completed', repairType: 'water_electric' },
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const wsF = wsFiltered.data.data || [];
    console.log(`\n筛选后（status=completed, repairType=water_electric）共${wsF.length}条:`);
    wsF.forEach(w => {
      const respNaN = hasNaN(w.avgResponseTime);
      const compNaN = hasNaN(w.avgCompletionTime);
      if (respNaN || compNaN) noNaN = false;
      console.log(`  ${w.workerName}: 响应=${w.avgResponseTime}, 处理=${w.avgCompletionTime}` +
        ` ${respNaN ? '❌NaN' : '✅OK'} ${compNaN ? '❌NaN' : '✅OK'}`);
    });

    // 类型统计也检查
    const typeStats = await axios.get(`${BASE_URL}/stats/repair-types`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const ts = typeStats.data.data || [];
    console.log(`\n报修类型统计（共${ts.length}种）:`);
    ts.forEach(t => {
      const respNaN = hasNaN(t.avgResponseTime);
      const compNaN = hasNaN(t.avgCompletionTime);
      if (respNaN || compNaN) noNaN = false;
      console.log(`  ${t.repairTypeName}: 响应=${t.avgResponseTime}, 处理=${t.avgCompletionTime}` +
        ` ${respNaN ? '❌NaN' : '✅OK'} ${compNaN ? '❌NaN' : '✅OK'}`);
    });

    const req3Pass = formatOK && noNaN;
    console.log(`\n✅ 需求3: 格式正确=${formatOK ? '✅' : '❌'}, 无NaN=${noNaN ? '✅' : '❌'}, 总结果=${req3Pass ? '通过' : '❌失败'}`);

    // ═══════════════════════════════════════════════════
    // 需求4: 师傅管理新增/编辑+派单联动
    // ═══════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════');
    console.log('🧪 需求4: 师傅管理新增/编辑保存成功，派单弹窗同步更新');
    console.log('═══════════════════════════════════════════════════');

    // 初始师傅数量
    const workersBefore = await axios.get(`${BASE_URL}/users/workers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const countBefore = workersBefore.data.data.length;
    log('新增师傅前派单可选数量', countBefore);

    // 1. 新增师傅
    const phoneNew = `test_${Date.now()}`;
    const createW = await axios.post(`${BASE_URL}/users/workers`, {
      name: '测试王师傅',
      phone: phoneNew,
      password: '123456',
      skills: ['water_electric', 'elevator']
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    const newWid = createW.data.data._id || createW.data.data.id;
    cleanup.push(['worker', newWid]);
    log('✅ 新增师傅成功', {
      姓名: createW.data.data.name,
      ID: newWid,
      技能: createW.data.data.skills,
      状态: createW.data.data.status
    });

    // 状态必须是 active 才能被派单
    const statusOK = createW.data.data.status === 'active';
    log(`新增师傅状态是 active: ${statusOK ? '✅是' : '❌否'}`);

    // 2. 列表立刻刷新（派单可选列表）
    const workersAfterCreate = await axios.get(`${BASE_URL}/users/workers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const countAfterCreate = workersAfterCreate.data.data.length;
    const listHasNew = workersAfterCreate.data.data.some(w => String(w._id || w.id) === String(newWid));
    log(`新增后派单列表: 数量${countAfterCreate}（之前${countBefore}）, 包含新师傅: ${listHasNew ? '✅是' : '❌否'}`);

    // 3. 师傅工作负载列表也包含新师傅（派单弹窗用的）
    const workload = await axios.get(`${BASE_URL}/orders/workers/workload`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const loadHasNew = workload.data.data.some(w => String(w._id || w.id) === String(newWid));
    log(`派单负载列表包含新师傅: ${loadHasNew ? '✅是' : '❌否'}`);

    // 4. 编辑师傅（修改技能和在岗状态）
    const editRes = await axios.put(`${BASE_URL}/users/workers/${newWid}`, {
      name: '测试王师傅(已认证)',
      skills: ['water_electric', 'elevator', 'access_control'],
      status: 'inactive'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    log('✅ 编辑师傅成功', {
      姓名: editRes.data.data.name,
      技能: editRes.data.data.skills,
      状态: editRes.data.data.status
    });

    // 5. 编辑后派单列表不包含休息的师傅（getWorkerList 只返回 active）
    const workersAfterEdit = await axios.get(`${BASE_URL}/users/workers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const listNotHasInactive = !workersAfterEdit.data.data.some(w => String(w._id || w.id) === String(newWid));
    log(`编辑为休息状态后，派单列表不再包含: ${listNotHasInactive ? '✅是' : '❌否'}`);

    // 6. 改回在岗，派单列表又能看到
    await axios.put(`${BASE_URL}/users/workers/${newWid}`, {
      status: 'active'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    const workersAfterReactive = await axios.get(`${BASE_URL}/users/workers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const listHasAgain = workersAfterReactive.data.data.some(w => String(w._id || w.id) === String(newWid));
    const updatedW = workersAfterReactive.data.data.find(w => String(w._id || w.id) === String(newWid));
    const skillsUpdated = updatedW?.skills?.length === 3 && updatedW.skills.includes('access_control');
    log(`改回在岗后，派单列表重新包含: ${listHasAgain ? '✅是' : '❌否'}, 技能已更新: ${skillsUpdated ? '✅是 (' + updatedW.skills.join(',') + ')' : '❌否'}`);

    const req4Pass = statusOK && listHasNew && loadHasNew && listNotHasInactive && listHasAgain && skillsUpdated;
    console.log(`\n✅ 需求4: ${req4Pass ? '通过' : '❌失败'}`);

    // ═══════════════════════════════════════════════════
    // 总览
    // ═══════════════════════════════════════════════════
    console.log('\n\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    const allPass = req1Pass && req2Pass && req3Pass && req4Pass;
    console.log(`║         ${allPass ? '🎉 全部4项需求测试通过 🎉' : '⚠️  部分需求未通过'}                      ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  需求1 报修图片持久化: ${req1Pass ? '✅' : '❌'} 提交图片→列表/详情/后台都可见`);
    console.log(`  需求2 维修结果持久化: ${req2Pass ? '✅' : '❌'} 维修说明+图片→业主/后台都可见`);
    console.log(`  需求3 时长格式无NaN: ${req3Pass ? '✅' : '❌'} 统一显示"X分钟/X小时Y分钟/-"`);
    console.log(`  需求4 师傅管理联动: ${req4Pass ? '✅' : '❌'} 新增/编辑→列表/派单同步`);
    console.log('');
    console.log(`💡 清理项（可手动删除）: ${cleanup.map(c => c[1]).join(', ')}`);
    console.log('');

    if (!allPass) {
      process.exit(1);
    }
  } catch (e) {
    console.error('\n❌ 测试失败:', e.message);
    if (e.response?.data) {
      console.error('响应详情:', JSON.stringify(e.response.data, null, 2).slice(0, 800));
    }
    console.error(e.stack?.split('\n').slice(0, 8).join('\n'));
    process.exit(1);
  }
}

test();
