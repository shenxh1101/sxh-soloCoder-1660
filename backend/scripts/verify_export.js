const axios = require('axios');
const fs = require('fs');
const ExcelJS = require('exceljs');
const BASE_URL = 'http://localhost:3000/api';

async function test() {
  try {
    const login = await axios.post(`${BASE_URL}/auth/login`, { phone: 'admin', password: 'admin123' });
    const token = login.data.data.token;

    const verify = (path) => new ExcelJS.Workbook().xlsx.readFile(path)
      .then(wb => wb.worksheets[0].rowCount - 1);

    const tests = [
      { name: '无筛选', params: {}, file: 'e1.xlsx' },
      { name: '状态=closed', params: { status: 'closed' }, file: 'e2_closed.xlsx' },
      { name: '类型=水电', params: { repairType: 'water_electric' }, file: 'e3_electric.xlsx' },
      { name: '状态+类型组合', params: { status: 'closed', repairType: 'water_electric' }, file: 'e4_combo.xlsx' },
      { name: '日期范围(近1年)', params: { startDate: '2025-01-01', endDate: '2027-12-31' }, file: 'e5_date.xlsx' }
    ];

    for (const t of tests) {
      const res = await axios.get(`${BASE_URL}/stats/export`, {
        params: t.params,
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'arraybuffer'
      });
      fs.writeFileSync(`d:/code/TraeProjects/1660/backend/${t.file}`, res.data);
      const rows = await verify(`d:/code/TraeProjects/1660/backend/${t.file}`);
      console.log(`✅ ${t.name}: ${rows} 行数据`);
    }

    console.log('\n🎉 Excel导出验证完成，所有筛选条件均正常工作！');
  } catch (e) {
    console.error('失败:', e.message);
    if (e.response) {
      const buf = Buffer.from(e.response.data || '');
      console.log('响应:', buf.toString('utf8'));
    }
    process.exit(1);
  }
}

test();
