require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

const { db, findAll, findById } = require('./config/nedb');
const { User } = require('./models');
const { notFound, errorHandler } = require('./middleware/error');

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const statsRoutes = require('./routes/stats');
const uploadRoutes = require('./routes/upload');

const app = express();

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const uploadsDir = path.join(__dirname, 'uploads');
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const avatarDir = path.join(uploadsDir, 'avatar');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
const repairDir = path.join(uploadsDir, 'repair');
if (!fs.existsSync(repairDir)) fs.mkdirSync(repairDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const initData = async () => {
  try {
    console.log('\n🔧 正在初始化数据...');

    const admin = await User.findOne({ phone: 'admin' });
    if (!admin) {
      const hashed = await bcrypt.hash('admin123', 10);
      await User.create({
        phone: 'admin',
        password: hashed,
        name: '系统管理员',
        role: 'admin'
      });
      console.log('✅ 创建管理员: admin / admin123');
    } else {
      console.log('ℹ️  管理员已存在，跳过创建');
    }

    const manager = await User.findOne({ phone: 'manager' });
    if (!manager) {
      const hashed = await bcrypt.hash('manager123', 10);
      await User.create({
        phone: 'manager',
        password: hashed,
        name: '物业经理',
        role: 'manager'
      });
      console.log('✅ 创建经理: manager / manager123');
    } else {
      console.log('ℹ️  经理已存在，跳过创建');
    }

    const workersCount = (await findAll(db.users, { role: 'worker' })).length;
    if (workersCount === 0) {
      const workers = [
        { name: '张师傅', phone: 'worker1', password: '123456', skills: ['water_electric', 'elevator'] },
        { name: '李师傅', phone: 'worker2', password: '123456', skills: ['water_electric', 'public_facility'] },
        { name: '王师傅', phone: 'worker3', password: '123456', skills: ['access_control', 'public_facility'] },
        { name: '赵师傅', phone: 'worker4', password: '123456', skills: ['elevator', 'water_electric'] }
      ];
      for (const w of workers) {
        const hashed = await bcrypt.hash(w.password, 10);
        await User.create({
          phone: w.phone,
          password: hashed,
          name: w.name,
          role: 'worker',
          skills: w.skills,
          workStatus: 'free',
          currentOrderCount: 0
        });
        console.log(`✅ 创建维修师傅: ${w.phone} / 123456 - ${w.name} (${w.skills.join(',')})`);
      }
    } else {
      console.log(`ℹ️  已存在 ${workersCount} 名维修师傅，跳过创建`);
    }

    const ownersCount = (await findAll(db.users, { role: 'owner' }))
      .filter(u => u.phone && u.phone.startsWith('owner')).length;
    if (ownersCount === 0) {
      const owners = [
        { name: '业主李阿姨', phone: 'owner1', password: '123456', building: '1号楼', room: '101室' },
        { name: '业主张先生', phone: 'owner2', password: '123456', building: '1号楼', room: '202室' },
        { name: '业主王女士', phone: 'owner3', password: '123456', building: '2号楼', room: '303室' },
        { name: '业主陈先生', phone: 'owner4', password: '123456', building: '3号楼', room: '505室' }
      ];
      for (const o of owners) {
        const hashed = await bcrypt.hash(o.password, 10);
        await User.create({
          phone: o.phone,
          password: hashed,
          name: o.name,
          role: 'owner',
          building: o.building,
          room: o.room
        });
        console.log(`✅ 创建测试业主: ${o.phone} / 123456 - ${o.name} (${o.building}${o.room})`);
      }
    } else {
      console.log(`ℹ️  已存在 ${ownersCount} 名测试业主，跳过创建`);
    }

    console.log('\n====================================');
    console.log('🎉 数据初始化完成！');
    console.log('');
    console.log('📋 默认账号：');
    console.log('  👨‍💼 管理员      admin      / admin123');
    console.log('  📊 经理         manager    / manager123');
    console.log('  🔧 维修师傅    worker1-4  / 123456');
    console.log('  👤 业主        owner1-4   / 123456');
    console.log('====================================\n');
  } catch (err) {
    console.error('❌ 初始化数据失败:', err.message);
  }
};

app.get('/api/health', async (req, res) => {
  const userCount = await findAll(db.users, {}).then(r => r.length).catch(() => 0);
  const orderCount = await findAll(db.orders, {}).then(r => r.length).catch(() => 0);
  res.json({
    success: true,
    message: '物业报修与派单管理系统 API 运行正常',
    timestamp: new Date().toISOString(),
    database: {
      type: 'NeDB (嵌入式文件数据库)',
      dataPath: path.join(__dirname, 'data'),
      users: userCount,
      orders: orderCount
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/upload', uploadRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

initData().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 服务器已启动`);
    console.log(`📍 本地地址: http://localhost:${PORT}`);
    console.log(`🩺 健康检查: http://localhost:${PORT}/api/health`);
    console.log(`💾 数据存储: ${path.join(__dirname, 'data')}\n`);
  });
});
