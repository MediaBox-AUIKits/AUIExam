/**
 * 该文件为项目初期本地开发为不依赖后端接口，加快开发所写的 mock 数据
 * 当页面url参数中包含 mock=1 ，services 将从这里取 mock 数据
 * 
 * 该文件中需要替换的是考生列表 userlistData 中的大小流地址 PULL_URL_ORIGIN_0、PULL_URL_TRANSCODE_0
 * 以及 userinfoData 中的推流地址 rtcPushUrl
 * 因为推拉流地址一般会有认证参数，一定时间后无法使用，你可以到直播控制台地址生成器中生成 https://live.console.aliyun.com/#/tool/builder
 * 
 */

// 监考老师id
export const MockTeacherId = "teacher1";
// 考场id
export const MockRoomId = "eb943750-51c6-4378-b117-ea3e9400fef6";
// 考试id
export const MockExamId = "examid123";
// 配置您的推流域名
const PushDomain = 'push.h5video.vip';
// 配置您的大流拉流域名
const PullDomain = 'pull.h5video.vip';
// 配置您的小流拉流域名
const RTSPullDomain = 'smallpull.h5video.vip';
// 考生id列表
const MockExaminees = [
  {
    id: "examinee1",
    name: "examinee1",
    userStatus: 0,
    publishStatus: 1, // 用户推流状态
  },
  // {
  //   id: "examinee2",
  //   name: "examinee2",
  //   userStatus: 0,
  //   publishStatus: 1, // 用户推流状态
  // },
  // {
  //   id: "examinee3",
  //   name: "examinee3",
  //   userStatus: 0,
  //   publishStatus: 1, // 用户推流状态
  // },
];
// 需要模拟考生数量
const MockExamineeNum = 2;

// 生成mock考生名
function getExamineeName(num: number) {
  const text = "ABCDEFGHIJKLMNOPQRTSUVWXYZ";
  const index = num % text.length;
  const length = Math.floor(num / text.length) + 2;
  return text[index].repeat(length);
}

// 考生列表数据
function userlistData(roomId: string) {
  // 测试大流地址
  const PULL_URL_ORIGIN =
    "artc://pulltestjg.alivecdn.com/exam/25pulltest?auth_key=1671106924-0-0-f7dd6b6597deedf76e8c37b60f196acc";
  // 测试转码流地址
  const PULL_URL_TRANSCODE =
    "artc://pulltestjg.alivecdn.com/exam/25pulltest_250k-RTS?auth_key=1671106794-0-0-2ac5fab4e8617a36d1af69c87326c350";

  let userList = [];
  for (let i = 0; i < MockExamineeNum; i++) {
    if (i < MockExaminees.length) {
      const streamName = `${MockExamId}-${roomId}-${MockExaminees[i].id}`;
      userList.push({
        ...MockExaminees[i],
        // 学生原始大流地址
        rtcPullUrl: `artc://${PullDomain}/exam/${streamName}?auth_key=1679306315-0-0-af8facd6487d878b674b198f6ae03f9b`,
        // 学生转码流地址，清晰度降至 240p
        rtsPullUrl: `artc://${RTSPullDomain}/exam/${streamName}_240p?auth_key=1679306266-0-0-c7d5b2130eb6912341e12afbe855d399`,
      });
    } else {
      userList.push({
        id: `examinee${i + 1}`,
        name: getExamineeName(i),
        userStatus: 0,
        publishStatus: 1, // 用户推流状态
        rtcPullUrl: PULL_URL_ORIGIN, // 大流地址
        rtsPullUrl: PULL_URL_TRANSCODE, // 小流地址
      });
    }
  }
  return userList;
}

function roominfoData(roomId: string) {
  return {
    id: roomId, // 考场id，目前 Mock 数据考场Id 和 IM 消息组ID 要一致
    name: "模拟考试测试考场1", // 考场名称
    examId: MockExamId, // 考试id
    roomStatus: 1, // 状态
    imGroupId: roomId, // im消息组id，需要与下方 imtoken 数据来源一致
    createTeacher: MockTeacherId, // 考场创建者id
    audioStatus: 0, // 考场口播状态
  };
}

function examinfoData() {
  return {
    id: "exam12345", // 考场id
    startTime: "2022/12/21 14:00:00", // 开始时间
    endTime: "2022/12/21 17:00:00", // 结束时间
    // 定时广播
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
学生720P推流地址：artc://yourPushDomain/exam/xxx-xxx-xxx?grtn_twin_rtmp=on
老师推流无需转码，所以不需要 grtn_twin_rtmp=on 参数
老师拉学生240P：artc://yourPullDomain/exam/xxx-xxx-xxx_240p
老师拉学生720P：artc://yourPullDomain/exam/xxx-xxx-xxx

监考端只有初始化时获取当前监考老师才会使用到 userInfo 接口，所以不需要处理考生
*/
function userinfoData(userId: string, roomId: string) {
  const streamName = `${MockExamId}-${roomId}-${userId}`;
  return {
    id: userId,
    name: '监考员',
    // 监考员推流地址
    rtcPushUrl:
      `artc://${PushDomain}/exam/${streamName}?auth_key=1679306377-0-0-dc2f8865107cc18df4a9ad2ca69e038c`,
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

function selectAudioData() {
  return {
    pageNum: 1,
    pageSize: 1,
    size: 0,
    startRow: 0,
    endRow: 0,
    pages: 0,
    prePage: 0,
    nextPage: 0,
    isFirstPage: false,
    isLastPage: false,
    hasPreviousPage: false,
    hasNextPage: false,
    navigatePages: 0,
    navigatepageNums: [0],
    navigateFirstPage: 0,
    navigateLastPage: 0,
    total: 100,
    list: Array(6)
      .fill(1)
      .map((i, index) => {
        return {
          id: index,
          classify: 0,
          name: "test" + Date.now() + index,
          // cdn 地址
          url: "https://ice-pub-media.myalicdn.com/vod-demo/Funshine.mp3",
          // oss 地址
          // ossUrl: "",
        };
      }),
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
    }
  }

  post(path: string, options: any = {}) {
    if (path === "getIMToken") {
      return this.getIMToken(options.userId);
    } else if (path === "selectAudio") {
      return Promise.resolve(selectAudioData());
    }
    return Promise.resolve({});
  }

  get(path: string, options: any = {}) {
    const { params } = options;
    if (path === "getIMToken") {
      return this.getIMToken(params.userId);
    }
    return new Promise((resolve, reject) => {
      let data: any = {};
      if (path === "userList") {
        data = userlistData(params.roomId);
      } else if (path === "roomInfo") {
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
