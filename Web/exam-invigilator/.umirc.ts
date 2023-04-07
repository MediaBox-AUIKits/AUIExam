import config from './src/config';

export default {
  define: {
    ASSETS_VERSION: require("./package.json").version,
    CONFIG: config,
  },
  alias: {
    "@": "./src",
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
};
