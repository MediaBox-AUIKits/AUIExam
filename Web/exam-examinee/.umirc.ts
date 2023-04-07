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
};
