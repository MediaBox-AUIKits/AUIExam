export interface IConfig {
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
}

// 使用于 .umirc.ts 中，实际代码中请使用 CONFIG
const config: IConfig = {
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
};

export default config;
