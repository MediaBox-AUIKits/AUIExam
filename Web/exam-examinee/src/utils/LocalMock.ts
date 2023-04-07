// 监考老师id
export const MockTeacherId = "teacher1";
// 考场id
export const MockRoomId = "eb943750-51c6-4378-b117-ea3e9400fef6";
// 考试id
export const MockExamId = "examid123";
// 当前mock考生id
export const MockCurrentUserId = 'examinee1';
// 配置您的推流域名
const PushDomain = 'push.h5video.vip';
// 配置您的大流拉流域名
const PullDomain = 'pull.h5video.vip';

function roominfoData(roomId: string) {
  return {
    id: roomId, // 考场id，目前 Mock 数据考场Id 和 IM 消息组ID 要一致
    name: "模拟考试测试考场1", // 考场名称
    examId: MockExamId, // 考试id
    status: 0, // 状态
    imGroupId: roomId, // im消息组id，需要与下方 imtoken 数据来源一致
    createTeacher: MockTeacherId, // 考场创建者id
    audioStatus: 0, // 0:未口播、1:正在口播
  };
}

function examinfoData() {
  return {
    id: "exam12345", // 考场id
    startTime: "2023/03/15 14:00:00", // 开始时间
    endTime: "2023/03/15 17:00:00", // 结束时间
    radioInfo: [
      {
        name: "考前须知",
        id: "ra1",
        url: "https://ice-pub-media.myalicdn.com/vod-demo/mp3/%E8%80%83%E5%89%8D%E9%A1%BB%E7%9F%A5.mp3",
        ossUrl: "https://ice-pub-media.myalicdn.com/vod-demo/mp3/%E8%80%83%E5%89%8D%E9%A1%BB%E7%9F%A5.mp3",
        startTime: "2023/03/28 11:21:15",
      },
      {
        name: "考试结束",
        id: "ra2",
        url: "https://ice-pub-media.myalicdn.com/vod-demo/mp3/%E8%80%83%E8%AF%95%E7%BB%93%E6%9D%9F.mp3",
        ossUrl: "https://ice-pub-media.myalicdn.com/vod-demo/mp3/%E8%80%83%E8%AF%95%E7%BB%93%E6%9D%9F.mp3",
        startTime: "2023/03/28 16:00:00",
      },
    ],
    audioInfo: [
      {
        name: "音频1",
        id: "au1",
        url: "xxxx",
      },
      {
        name: "音频2",
        id: "au2",
        url: "xxxx",
      },
    ],
  };
}

/*
推流地址：artc://{yourPushDomain}/exam/xxx-xxx-xxx?grtn_twin_rtmp=on
老师拉学生240P：artc://{yourSmallPullDomain}/exam/xxx-xxx-xxx_240p
老师拉学生720P：artc://{yourBigPullDomain}/exam/xxx-xxx-xxx

地址规则： artc://${推流域名或拉流域名}/${AppName}/${StreamName}${转码模板名，不一定有}
StreamName 可以按这个规则生成 examid-roomid-userid
要注意区分大流域名、小流域名、推流域名

auth_key 参数是认证参数，建议项目初始时先不开启
详情请看：https://help.aliyun.com/document_detail/197400.html
*/
function userinfoData(userId: string, roomId: string) {
  const streamName = `${MockExamId}-${roomId}-${userId}`;
  return userId === MockTeacherId
    ? {
        // 监考员数据，只需要大流地址即可
        id: userId,
        name: "监考员",
        rtcPushUrl: "xxxx",
        // 请从直播地址生成器中生成地址
        rtcPullUrl:
          `artc://${PullDomain}/exam/${streamName}?auth_key=1679306377-0-0-e33b5aa40da41f411190acc78f952087`, // 大流地址
        rtsPullUrl: "xxx", // 小流地址
      }
    : {
        // 当前用户数据，只需要推流地址即可
        id: userId,
        name: userId,
        // 请从直播地址生成器中生成地址
        rtcPushUrl:
          `artc://${PushDomain}/exam/${streamName}?grtn_twin_rtmp=on&auth_key=1679306315-0-0-f0f983836c727f71c52609fb24f83461`,
        rtcPullUrl: "xxx", // 大流地址
        rtsPullUrl: "xxx", // 小流地址
      };
}

// 用于本地录制的视频上传 OSS ，会过期，本地需要测试时需要更新
function stsData() {
  return {
    region: "oss-cn-hangzhou",
    accessKeyId: "yourAccessKeyId",
    accessKeySecret: "yourAccessKeySecret",
    // 从STS服务获取的安全令牌（SecurityToken）。
    stsToken: "yourSecurityToken",
    // 填写Bucket名称。
    bucket: "examplebucket",
  };
}

class LocalMock {
  config: any;
  interceptors: any;
  defaults: any;

  constructor(config: any) {
    this.config = config;
    this.interceptors = {
      response: {
        use: () => {},
      },
      request: {
        use: () => {},
      },
    };
    this.defaults = {
      headers: {
        common: {},
      },
    };
  }

  static create(config: any) {
    return new LocalMock(config);
  }

  /**
   * 这里是获取阿里云直播互相消息sdk登录所需的 token
   * 请参考 https://help.aliyun.com/document_detail/462737.html 部署 appserver 生成对应的token
   */
  public async getIMToken(username: string) {
    return {
      // 阿里云直播互相消息服务生成的 token
      accessToken: "",
      // 如果需要使用融云 IM，需要在这里返回 rongToken
      // rongToken: '',
    };
  }

  post(path: string, options: any = {}) {
    if (path === "getIMToken") {
      return this.getIMToken(options.userId);
    }
  }

  get(path: string, options: any = {}) {
    const { params } = options;
    if (path === "getIMToken") {
      return this.getIMToken(params.userId);
    }
    return new Promise((resolve, reject) => {
      let data: any = {};
      if (path === "roomInfo") {
        data = roominfoData(params.roomId);
      } else if (path === "examInfo") {
        data = examinfoData();
      } else if (path === "userInfo") {
        data = userinfoData(params.userId, params.roomId);
      } else if (path === "getOssConfig") {
        data = stsData();
      }

      setTimeout(() => {
        resolve(data);
      }, 500);
    });
  }
}

export default LocalMock;
