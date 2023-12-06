export interface IConfig {
  // 开通直播、点播、OSS 等服务的阿里云userId
  aliyunUid: string;
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
    // 上传至 OSS 或者 VOD
    mode: "OSS" | "VOD";
    // OSS 模块时指定存储的基础路径，VOD 模式无用
    basePath: string;
    // VOD 模式时有效
    vod?: {
      // 存储节点区域
      region: string;
      // 创建的额外参数，详情请看 https://help.aliyun.com/zh/vod/developer-reference/api-vod-2017-03-21-createuploadvideo#api-detail-35
      // 注意 Title、StorageLocation 这里设置无效，若有特殊要求，请至 VODUploader 文件中修改
      params?: {
        [index: string]: any;
      };
    }
  };
  rongCloudIm: {
    enable: boolean;
    appkey: string;
  };
  cheatDetect: {
    licenseKey: string;
    licenseDomain: string;
  };
  mobileCameraSwitcher: {
    enable: boolean; // 移动端是否加载切换摄像头模块
  };
  defaultVideoProfile: {
    name: string; // 名称
    data: {
      width: number; // 视频宽度
      height: number; // 视频高度
      frameRate: number; // 帧率
      maxBitrate: number; // 最大码率
    };
  };
}

// 在 .umirc.ts 中将 config 对象挂在全局的 CONFIG 下
// 工程逻辑代码中请使用 CONFIG 访问相关配置项，例：CONFIG.appServer.appServer
const config: IConfig = {
  // 开通直播、点播、OSS 等服务的阿里云userId，注意是主账号的userid
  aliyunUid: "",
  // 当前页面的域名+路径
  // 目前用于主机位页面（src->pages-pc）本地开发调试时设置进入考生移动端二维码的url
  // 用于将 localhost、127.0.0.1 替换为该值
  pagePath: "",
  // 配置 APPServer
  appServer: {
    origin: "", // 配置 APPServer 服务域名，例子: https://xxx.xxx.xxx
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
  // 配置本地录制
  localRecorder: {
    enable: false, // 是否开启本地录制
    // 两种模式的上传均使用的是 STS 临时授权方案
    // VOD 请查看：https://help.aliyun.com/zh/vod/user-guide/use-sts-to-create-a-ram-role-and-grant-temporary-permissions
    // OSS 请查看：https://help.aliyun.com/zh/oss/developer-reference/use-temporary-access-credentials-provided-by-sts-to-access-oss
    mode: "OSS",
    // OSS 时有用，注意：开头、结束字符必须要是 /
    // 若遇到 403 问题，检查服务端获取 STS 接口的 policy 里的仓库路径与 basePath 是否匹配
    basePath: "/record/local/",
    // VOD 时有用
    vod: {
      region: "", // VOD 区域节点，如 "cn-shanghai"
      // 创建的额外参数，详情请看 https://help.aliyun.com/zh/vod/developer-reference/api-vod-2017-03-21-createuploadvideo#api-detail-35
      // 注意 Title、StorageLocation 这里设置无效，若有特殊要求，请至 VODUploader 文件中修改
      params: {
        Tags: "AUIExam",
      },
    },
  },
  // 融云 IM 服务配置项
  rongCloudIm: {
    enable: false, // 是否使用融云 IM 提高可用性
    appkey: "", // 正式的 appId
  },
  // 防作弊服务配置项
  cheatDetect: { 
    licenseKey: "", // 防作弊 SDK 的 license
    licenseDomain: "", // 防作弊 SDK 允许运行的域名（localhost不受限制）
  },
  // 移动端摄像头切换模块的配置项
  mobileCameraSwitcher: {
    enable: false, // 是否展示该模块
  },
  // 默认摄像头流参数
  defaultVideoProfile: {
    name: "custom_360_800k", // 名称
    data: {
      // 低配低版本安卓手机，若高于 360P 可能取到的画面是黑屏
      // 正式考试时建议请勿配置高于 360P（640*360/360*640）
      width: 640, // 视频宽度
      height: 360, // 视频高度
      frameRate: 30, // 帧率
      maxBitrate: 800, // 最大码率
    },
  },
};

export default config;
