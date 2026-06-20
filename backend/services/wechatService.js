const axios = require('axios');

class WechatService {
  constructor() {
    this.appid = process.env.WECHAT_APPID;
    this.secret = process.env.WECHAT_SECRET;
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  async getAccessToken() {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
        params: {
          grant_type: 'client_credential',
          appid: this.appid,
          secret: this.secret
        }
      });

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpiresAt = now + (response.data.expires_in - 300) * 1000;
        return this.accessToken;
      }
      return null;
    } catch (error) {
      console.error('获取微信access_token失败:', error.message);
      return null;
    }
  }

  async sendTemplateMessage(openid, templateId, data, page = '') {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) return false;

      const response = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
        {
          touser: openid,
          template_id: templateId,
          page,
          data
        }
      );

      return response.data.errcode === 0;
    } catch (error) {
      console.error('发送微信模板消息失败:', error.message);
      return false;
    }
  }

  async sendRepairStatusNotification(openid, orderNo, status, repairType, workerName, time) {
    const templateId = process.env.WECHAT_TEMPLATE_ID_REPAIR_STATUS;
    if (!templateId || !openid) return false;

    const data = {
      thing1: {
        value: orderNo
      },
      thing2: {
        value: repairType
      },
      thing3: {
        value: status
      },
      thing4: {
        value: workerName || '暂无'
      },
      time5: {
        value: time
      }
    };

    return this.sendTemplateMessage(
      openid,
      templateId,
      data,
      `/pages/order/detail?id=${orderNo}`
    );
  }

  async code2Session(code) {
    try {
      const response = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
        params: {
          appid: this.appid,
          secret: this.secret,
          js_code: code,
          grant_type: 'authorization_code'
        }
      });

      return response.data;
    } catch (error) {
      console.error('微信登录失败:', error.message);
      return null;
    }
  }
}

module.exports = new WechatService();
