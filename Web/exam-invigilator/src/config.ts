export interface IConfig {
  // 开通直播、点播、OSS 等服务的阿里云userId
  aliyunUid: string;
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
  // 防作弊检测列表相关配置
  detectList: {
    enable: boolean;
  };
  // 多机位配置
  mutilMonitor: {
    enable: boolean; // 是否开启多机位
    preferMainMonitor: boolean; // 是否优先主机位
  };
  rongCloudIm: {
    enable: boolean;
    appkey: string;
  };
}

// 在 .umirc.ts 中将 config 对象挂在全局的 CONFIG 下
// 工程逻辑代码中请使用 CONFIG 访问相关配置项，例：CONFIG.appServer.appServer
const config: IConfig = {
  // 开通直播、点播、OSS 等服务的阿里云userId，注意是主账号的userid
  aliyunUid: "",
  // 配置 APPServer
  appServer: {
    origin: "", // 配置 APPServer 服务域名，例子: https://xxx.xxx.xxx，结尾请勿包含 /
    apiPrefixPath: "/exam/", // 配置api接口路径前缀
  },
  // 配置日志服务
  // 请查看 SLS 官方文档：https://help.aliyun.com/zh/sls/getting-started
  reporter: {
    enable: false, // 是否开启埋点
    host: "", // 所在地域的服务入口
    projectName: "", // sls 的工程名称
    logstore: "", // sls 的 logstore
  },
  // 防作弊检测消息相关功能
  detectList: {
    enable: false,
  },
  // 多机位配置项
  mutilMonitor: {
    enable: false, // 是否需要多机位，若不开启，则仅展示 mobile 副机位的流
    preferMainMonitor: true, // 是否优先展示 pc 主机位的流
  },
  // 融云 IM 服务配置项
  rongCloudIm: {
    enable: false, // 是否使用融云 IM 提高可用性
    appkey: "", // 正式的 appId
  },
};

export default config;
