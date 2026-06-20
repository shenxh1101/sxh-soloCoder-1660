export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/orders/index',
    'pages/repair/index',
    'pages/mine/index',
    'pages/login/index',
    'pages/order-detail/index',
    'pages/order-process/index',
    'pages/order-rate/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1677FF',
    navigationBarTitleText: '智慧物业',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F5F7FA'
  },
  tabBar: {
    color: '#86909C',
    selectedColor: '#1677FF',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页'
      },
      {
        pagePath: 'pages/orders/index',
        text: '工单'
      },
      {
        pagePath: 'pages/repair/index',
        text: '报修'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
})
