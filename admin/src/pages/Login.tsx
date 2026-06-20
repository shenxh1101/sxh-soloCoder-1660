import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Tabs, message } from 'antd';
import { UserOutlined, LockOutlined, WechatOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLogin } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'admin' | 'manager'>('admin');

  useEffect(() => {
    if (isLogin) {
      navigate('/dashboard');
    }
  }, [isLogin, navigate]);

  const handleSubmit = async (values: { phone: string; password: string }) => {
    try {
      setLoading(true);
      await login(values.phone, values.password);
      navigate('/dashboard');
    } catch (error) {
      console.error('登录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (account: string, password: string) => {
    const form = document.querySelector('form');
    if (form) {
      const phoneInput = form.querySelector('input[name="phone"]') as HTMLInputElement;
      const passwordInput = form.querySelector('input[name="password"]') as HTMLInputElement;
      if (phoneInput) phoneInput.value = account;
      if (passwordInput) passwordInput.value = password;
      
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      if (nativeInputValueSetter && phoneInput) {
        nativeInputValueSetter.call(phoneInput, account);
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (nativeInputValueSetter && passwordInput) {
        nativeInputValueSetter.call(passwordInput, password);
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1677FF 0%, #4096FF 50%, #69B1FF 100%)'
      }}
    >
      <Card
        style={{
          width: 420,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          borderRadius: 16
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              fontSize: 48,
              marginBottom: 16
            }}
          >
            🏢
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1d2129', marginBottom: 8 }}>
            智慧物业管理后台
          </h1>
          <p style={{ color: '#86909c', fontSize: 14 }}>
            专业的报修派单管理系统
          </p>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'admin' | 'manager')}
          centered
          items={[
            { key: 'admin', label: '管理员登录' },
            { key: 'manager', label: '经理登录' }
          ]}
        />

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={handleSubmit}
          size="large"
        >
          <Form.Item
            name="phone"
            rules={[{ required: true, message: '请输入账号' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入账号"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ width: '100%', height: 44, fontSize: 16 }}
            >
              登 录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 24 }}>
          <Button
            icon={<WechatOutlined />}
            style={{ width: '100%', marginBottom: 16 }}
            onClick={() => message.info('微信登录功能开发中')}
          >
            微信扫码登录
          </Button>
          
          <div style={{ padding: 12, background: '#f5f7fa', borderRadius: 8, fontSize: 12 }}>
            <p style={{ marginBottom: 8, fontWeight: 500, color: '#4e5969' }}>🎯 测试账号（点击快速填入）：</p>
            <p style={{ margin: '4px 0', color: '#86909c', cursor: 'pointer' }}
               onClick={() => fillDemoAccount('admin', 'admin123')}>
              管理员：admin / admin123
            </p>
            <p style={{ margin: '4px 0', color: '#86909c', cursor: 'pointer' }}
               onClick={() => fillDemoAccount('manager', 'manager123')}>
              经理：manager / manager123
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
