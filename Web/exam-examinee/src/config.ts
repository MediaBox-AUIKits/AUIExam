export interface IConfig {
  pagePath: string;
  appServer: {
    origin: string;
    apiPrefixPath: string;
  };
  reporter: {
    enable: boolean;
    host: string;
    projectName: string;
    logstore: string;
  };
  localRecorder: {
    enable: boolean;
  };
  rongCloudIm: {
    enable: boolean;
    appkey: string;
  };
  licenseConfig: {
    licenseKey: string;
    licenseDomain: string;
  };
}

// 使用于 .umirc.ts 中，实际代码中请使用 CONFIG
const config: IConfig = {
  // 当前页面的域名+路径
  // 目前用于主机位页面（src->pages-pc）本地开发调试时设置进入考生移动端二维码的url
  // 用于将 localhost、127.0.0.1 替换为该值
  pagePath: "",
  appServer: {
    origin: "", // 配置 APPServer 服务域名，例子: https://xxx.xxx.xxx
    apiPrefixPath: "/exam/", // 配置api接口路径前缀
  },
  reporter: {
    enable: false, // 是否开启埋点
    host: "", // 所在地域的服务入口
    projectName: "", // sls 的工程名称
    logstore: "", // sls 的 logstore
  },
  localRecorder: {
    enable: true, // 是否开启本地录制
  },
  rongCloudIm: {
    enable: false, // 是否使用融云 IM 提高可用性
    appkey: "", // 正式的 appId
  },
  licenseConfig: { // 防作弊sdk license
    licenseKey: "",
    licenseDomain: "",
  },
};

export default config;
