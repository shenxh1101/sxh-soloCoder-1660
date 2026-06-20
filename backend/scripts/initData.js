require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = require('../models/User');
const RepairOrder = require('../models/RepairOrder');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/property-repair');
    console.log('MongoDB 连接成功');
  } catch (error) {
    console.error('MongoDB 连接失败:', error.message);
    process.exit(1);
  }
};

const initData = async () => {
  await connectDB();

  try {
    console.log('开始初始化数据...');

    const existingAdmin = await User.findOne({ phone: 'admin' });
    if (existingAdmin) {
      console.log('管理员已存在，跳过创建');
    } else {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = new User({
        phone: 'admin',
        password: hashedPassword,
        name: '系统管理员',
        role: 'admin'
      });
      await admin.save();
      console.log('管理员创建成功: admin / admin123');
    }

    const existingManager = await User.findOne({ phone: 'manager' });
    if (existingManager) {
      console.log('经理已存在，跳过创建');
    } else {
      const hashedPassword = await bcrypt.hash('manager123', 10);
      const manager = new User({
        phone: 'manager',
        password: hashedPassword,
        name: '物业经理',
        role: 'manager'
      });
      await manager.save();
      console.log('经理创建成功: manager / manager123');
    }

    const existingWorkers = await User.countDocuments({ role: 'worker' });
    if (existingWorkers > 0) {
      console.log(`已存在 ${existingWorkers} 名维修师傅，跳过创建`);
    } else {
      const workers = [
        { name: '张师傅', phone: 'worker1', password: '123456', skills: ['water_electric', 'elevator'] },
        { name: '李师傅', phone: 'worker2', password: '123456', skills: ['water_electric', 'public_facility'] },
        { name: '王师傅', phone: 'worker3', password: '123456', skills: ['access_control', 'public_facility'] }
      ];

      for (const worker of workers) {
        const hashedPassword = await bcrypt.hash(worker.password, 10);
        const w = new User({
          phone: worker.phone,
          password: hashedPassword,
          name: worker.name,
          role: 'worker',
          skills: worker.skills,
          workStatus: 'free',
          currentOrderCount: 0
        });
        await w.save();
        console.log(`维修师傅创建成功: ${worker.phone} / ${worker.password} - ${worker.name}`);
      }
    }

    const existingOwners = await User.countDocuments({ role: 'owner', phone: /^owner/ });
    if (existingOwners > 0) {
      console.log(`已存在 ${existingOwners} 名测试业主，跳过创建`);
    } else {
      const owners = [
        { name: '业主1', phone: 'owner1', password: '123456', building: '1号楼', room: '101' },
        { name: '业主2', phone: 'owner2', password: '123456', building: '1号楼', room: '202' },
        { name: '业主3', phone: 'owner3', password: '123456', building: '2号楼', room: '303' }
      ];

      for (const owner of owners) {
        const hashedPassword = await bcrypt.hash(owner.password, 10);
        const o = new User({
          phone: owner.phone,
          password: hashedPassword,
          name: owner.name,
          role: 'owner',
          building: owner.building,
          room: owner.room
        });
        await o.save();
        console.log(`业主创建成功: ${owner.phone} / ${owner.password} - ${owner.name}`);
      }
    }

    console.log('数据初始化完成!');
    console.log('');
    console.log('默认账号:');
    console.log('  管理员: admin / admin123');
    console.log('  经理: manager / manager123');
    console.log('  维修师傅: worker1/worker2/worker3 / 123456');
    console.log('  业主: owner1/owner2/owner3 / 123456');

    process.exit(0);
  } catch (error) {
    console.error('初始化失败:', error);
    process.exit(1);
  }
};

initData();
