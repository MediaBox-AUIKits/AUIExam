import config from './src/config';

export default {
  define: {
    ASSETS_VERSION: require("./package.json").version,
    PUBLIC_PATH: "/",
    CONFIG: config,
  },
  alias: {
    "@": "./src",
    public: "./public",
  },
  history: {
    type: "hash",
  },
  metas: [
    {
      name: "Viewport",
      content:
        "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0,viewport-fit=cover",
    },
    {
      name: "description",
      content: "监考",
    },
  ],
  targets: {
    chrome: 69 // 安卓钉钉 webview 版本
  },
  routes: [
    {
      name: 'mobile端考试页',
      path: '/',
      component: '@/pages',
    },
    {
      name: 'pc端考试页',
      path: '/pc',
      component: '@/pages/pc',
    },
    {
      name: 'pc端设备检测页',
      path: '/pc/deviceTest',
      component: '@/pages/pc/deviceTest',
    },
    {
      name: '考试结束页',
      path: '/ended',
      component: '@/pages/ended',
    },
  ],
  plugins: ['@umijs/plugins/dist/antd'],
  // 启用 https 以在移动端访问测试页面
  // https: {
  //   http2: false, // to avoid Chrome issue
  // }
};
