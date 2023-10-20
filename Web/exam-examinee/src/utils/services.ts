import { getParamFromSearch } from "@/utils/common";
import axios from "axios";
import LocalMock from "./LocalMock";

// 配置 APPServer 服务域名
export const ServicesOrigin = CONFIG.appServer.origin;

// 配置api接口路径前缀
export const ApiPrefixPath = CONFIG.appServer.apiPrefixPath;

export const RequestBaseUrl = `${ServicesOrigin}${ApiPrefixPath}`;

// 方便使用mock数据测试
let RequestClass = axios;
if (getParamFromSearch("mock") === "1") {
  RequestClass = LocalMock as any;
}

class Services {
  // 创建 axios 实例
  private request = RequestClass.create({
    baseURL: RequestBaseUrl,
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  constructor() {
    // 统一处理请求
    this.request.interceptors.request.use(
      (config: any) => {
        // Do something before request is sent
        if (config.method === "get") {
          config.params["ts"] = Date.now(); // 防止缓存
        }
        return config;
      },
      (error: any) => {
        // Do something with request error
        return Promise.reject(error);
      }
    );

    // 统一处理接口返回
    this.request.interceptors.response.use(
      (res) => {
        const err: any = { url: res.config.url };
        if (res.status === 200 && res.data) {
          if (res.data.success) {
            return res.data.data;
          }
          err.code = res.data.errorCode;
          err.msg = res.data.errorMsg;
          // 可以再处理下非 200，但接口未成功的情况
        }
        return this.handleError(err);
      },
      (error: any) => {
        return this.handleError(error);
      }
    );
  }

  // 在这个函数中处理特殊，比如 token 失效时主动 refresh、登录失效时提示用户
  private handleError(error: any) {
    // if (error.response) {
    //   return Promise.reject(error);
    // }
    // 特殊异常处理，若 401 是登录失效，可以在这里做弹窗提示等操作
    // if (error.response.status === 401) {}
    return Promise.reject(error);
  }

  // 将登录 token 设置为请求 header 的
  public setHeaderAuthorization(token: string) {
    this.request.defaults.headers.common.authorization = token;
  }

  /**
   * getRoomInfo 获取考场信息
   * @param {string} roomId
   * @return {Promise}
   */
  public getRoomInfo(roomId: string) {
    return this.request.get("roomInfo", {
      params: { roomId },
    });
  }

  /**
   * getRoomInfo 获取用户信息
   * @param {string} userId
   * @return {Promise}
   */
  public getUserInfo(userId: string, roomId: string) {
    return this.request.get("userInfo", {
      params: { userId, roomId },
    });
  }

  /**
   * 获取考试信息
   * @param {string} examId
   * @return {Promise}
   */
  public getExamInfo(examId: string) {
    return this.request.get("examInfo", {
      params: { examId },
    });
  }

  /**
   * 获取 STS 鉴权等数据
   * @param {string} examId
   * @return {Promise}
   */
  public getSTSData(examId: string) {
    return this.request.get("getOssConfig", {
      params: { examId },
    });
  }

  /**
   * 获取互动消息sdk 所需的 token 接口
   * @param {string} roomId
   * @return {Promise}
   */
  public getInteractionToken(roomId: string, userId: string) {
    return this.request.post("getIMToken", {
      roomId,
      deviceId: `art-${Date.now()}`,
      deviceType: "web",
      userId,
    });
  }

  /**
   * 获取防作弊检测配置
   * @param {string} examId
   * @return {Promise}
   */
  public getCheatConfig(examId: string) {
    return this.request.post("cheat/getCheatConfig", {
      examId,
    });
  }

  /**
   * 上传作弊检测消息
   */
    public uploadDetectMessage(options: {
      examId: string,
      data: string
    }) {
      return this.request.post("cheat/addCheatRecord", options);
    }
}

export default new Services();
