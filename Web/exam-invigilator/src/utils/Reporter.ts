/**
 * 埋点工具
 */
import SlsTracker from "@aliyun-sls/web-track-browser";
import { AliRTS } from "aliyun-rts-sdk";
import type { ErrorCode as ERtsErrorCode } from "aliyun-rts-sdk/dist/core/error/errorcode";
import { createGuid, getParamFromSearch } from "./common";

/**
 * 业务类型
 */
export enum EBizType {
  /**
   * 考生端
   */
  Examinee = 1,
  /**
   * 监考端
   */
  Invigilator = 2,
  /**
   * 巡考员
   */
  Inspector = 3,
}

/**
 * 需要上报的信息
 *
 * # RTS 相关
 * - 开始推拉流
 * - 推拉流成功
 * - 推拉流失败
 * - 起播成功/起播耗时
 * - 推拉流状态（码率、帧率、拉流卡顿时长）
 * - 拉流结束（主动结束，码率降为0持续5秒，连接被断开）
 * - 推流断开（主动结束，连接被断开）
 * - 特定异常（UDP 不通、摄像头未授权、重试超过最大限制）
 */

enum EMsgid {
  // 业务类 1xx
  // 考试业务公共 10xx
  INIT_PARAMS_ILLEGAL = 1001,
  INIT_ERROR = 1002,
  JOIN_GROUP_ERROR = 1003, // 加入互相消息组失败
  SEND_MESSAGE_ERROR = 1004, // 发送互动消息失败
  RONG_IM_ERROR = 1005, // 融云异常
  TIMER_RADIO_PLAY = 1006, // 定时音频播放
  JOIN_GROUP_SUCCESS = 1007, // 加入互相消息组成功
  // 目前 1008 1009 只在考生端使用了
  AUDIO_PLAYING = 1008, // 音频播放中
  AUDIO_ERROR = 1009, // 音频播放失败
  ALIVC_IM_ERROR = 1050, // 新版IM异常上报
  // 监考端 11xx
  BOARDCAST_LIVE = 1101, // 全员口播
  STOP_BOARDCAST_LIVE = 1102,
  BOARDCAST_AUDIO = 1103, // 系统广播音频
  STOP_BOARDCAST_AUDIO = 1104,
  SINGLE_CALL = 1105, // 单人连麦
  SINGLE_HANGUP = 1106,
  END_ROOM = 1107, // 结束考试
  END_ROOM_ERROR = 1108,
  BOARDCAST_LIVE_RESULT = 1109, // 全员口播考生接收情况
  BOARDCAST_AUDIO_RESULT = 1110, // 系统广播音频考生接收情况
  SINGLE_CALL_RESULT = 1111, // 单人连麦接收情况
  RECEIVE_STREAM_PUBLISH = 1112, // 收到推流消息
  RECEIVE_STREAM_STOP = 1113, // 收到断流消息
  UPDATE_BOARDCAST_LIVE_STATUS_ERROR = 1114, // 更新服务端考场口播状态失败
  RECEIVE_ENTER_ROOM = 1115,
  RECEIVE_PUB_SUCCESS = 1116,
  RECEIVE_PUB_FAIL = 1117,
  PLAY_CHANNEL_MODE = 1118, // 单声道 vs 默认播放

  // 技术类 2xx

  RTS_SUB_ERROR = 2001,
  RTS_PUB_ERROR,
  RTS_SUB_START,
  RTS_PUB_START,
  RTS_SUB_OK,
  RTS_PUB_OK,
  RTS_SUB_FIRSTFRAME,
  RTS_SUB_STATS,
  RTS_PUB_STATS,
  RTS_SUB_END,
  RTS_PUB_END,
  RTS_RUN_GC,

  RTS_SUB_EXCEPTION = 2100,
  RTS_PUB_EXCEPTION,
}

/**
 * 推拉流结束的原因
 */
export enum ERtsEndType {
  /**
   * 正常停止订阅/发布
   */
  NornalStop = 1,
  /**
   * 拉取数据超时（一段时间内 bytes-received 持续为 0）
   */
  Timeout,
  /**
   * Peerconnection 断开（停止推流、或网络原因断开）
   */
  Disconnected,
}

/**
 * 特定异常的原因
 */
export enum ERtsExceptionType {
  /**
   * UDP 不通
   */
  UdpConnectionFailed = 1,
  /**
   * 摄像头、麦克风异常
   */
  DeviceError,
  /**
   * 重试超过特定次数
   */
  RetryReachLimit,
}

interface ICommonParams {
  /**
   * sls 必要字段
   */
  APIVersion: string;
  /**
   * 点位版本
   * reporter version
   */
  rv: string;
  /**
   * 前端代码版本
   * front version
   */
  av: string;
  /**
   * 业务类型
   */
  biz: EBizType;
  /**
   * 系统类型
   */
  os: string;
  /**
   * 系统版本
   */
  ov: string;
  /**
   * 浏览器类型
   */
  bt: string;
  /**
   * 浏览器版本
   */
  bv: string;
  /**
   * 当前页面 host
   */
  host: string;
  /**
   * 当前页面地址 page url
   */
  pu: string;
  /**
   * 页面不刷新就不会变
   */
  tid: string;
  /**
   * uuid
   */
  uuid: string;
  /**
   * 采集时间
   */
  ct?: number;
  /**
   * useragent
   */
  ua: string;

  /**
   * 考试id
   */
  examid?: string;

  /**
   * 考官、考生id
   */
  userid?: string;
  username?: string;

  /**
   * 考场id
   */
  roomid?: string;
  roomname?: string;

  /**
   * 事件id
   */
  msgid?: EMsgid;

  /**
   * msgid 对应的参数
   */
  args?: Record<string, any>;
}

interface IProps {
  enableLog: boolean;
}

const SystemUtil = AliRTS.SystenUtil;
const BrowserUtil = AliRTS.BrowserUtil;

export class Reporter {
  private _commonParams: ICommonParams;
  private _enableLog: boolean;

  private _track: SlsTracker;

  constructor(props: IProps) {
    this._enableLog = props.enableLog;
    this._track = this.initTracker();
    this._commonParams = this.initCommonParams();
  }

  private initTracker() {
    const opts = {
      host: CONFIG.reporter.host, // 所在地域的服务入口。例如cn-hangzhou.log.aliyuncs.com
      project: CONFIG.reporter.projectName, // Project名称。
      logstore: CONFIG.reporter.logstore, // Logstore名称。
      time: 5, // 发送日志的时间间隔，默认是10秒。
      count: 10, // 发送日志的数量大小，默认是10条。
      topic: "topic", // 自定义日志主题。
      source: "source",
      tags: {
        tags: "tags",
      },
    };
    return new SlsTracker(opts);
  }

  private initCommonParams(): ICommonParams {
    return {
      APIVersion: "0.6.0",
      rv: "1.0.0",
      av: ASSETS_VERSION,
      biz: EBizType.Invigilator,
      os: SystemUtil.platform,
      ov: SystemUtil.systemVersion,
      bt: BrowserUtil.browserName,
      bv: BrowserUtil.browserVersion,
      host: window.location.origin,
      pu: window.location.href,
      tid: createGuid(32),
      uuid: this.getUuid(),
      ua: (navigator && navigator.userAgent) || "",
      examid: "",
      userid: getParamFromSearch("userId") || "",
      username: "",
      roomid: getParamFromSearch("roomId") || "",
      roomname: "",
    };
  }

  private getUuid() {
    const STORE_KEY = window.btoa ?
     window.btoa(CONFIG.reporter.projectName)
     : `__${CONFIG.reporter.projectName}__UUID__`;

    const uuid = localStorage.getItem(STORE_KEY) || createGuid(32);
    localStorage.setItem(STORE_KEY, uuid);
    return uuid;
  }

  /**
   * 更新公共点位
   */
  public updateCommonParams(params: Partial<ICommonParams> = {}) {
    this._commonParams = {
      ...this._commonParams,
      ...params,
    };
  }

  public report(params: Pick<ICommonParams, "args" | "msgid">) {
    if (this._enableLog) {
      const reportData = {
        ...this._commonParams,
        ...params,
        ct: new Date().getTime(),
      };
      this._track.send(reportData);
    }
  }

  public illegalInitialParams(params: any = {}) {
    this.report({
      msgid: EMsgid.INIT_PARAMS_ILLEGAL,
      args: { ...params },
    });
  }

  public initError(params: any = {}) {
    this.report({
      msgid: EMsgid.INIT_ERROR,
      args: { ...params },
    });
  }

  public joinGroupError(params: any = {}) {
    this.report({
      msgid: EMsgid.JOIN_GROUP_ERROR,
      args: { ...params },
    });
  }

  public joinGroupSuccess(groupId: string) {
    this.report({
      msgid: EMsgid.JOIN_GROUP_SUCCESS,
      args: { groupId },
    });
  }

  public sendMessageError(params: any = {}) {
    this.report({
      msgid: EMsgid.SEND_MESSAGE_ERROR,
      args: { ...params },
    });
  }

  public alivcIMError(params: any = {}) {
    this.report({
      msgid: EMsgid.ALIVC_IM_ERROR,
      args: { ...params },
    });
  }

  public rongIMError(params: any = {}) {
    this.report({
      msgid: EMsgid.RONG_IM_ERROR,
      args: { ...params },
    });
  }

  public timerRadioPlay(params: any = {}) {
    this.report({
      msgid: EMsgid.TIMER_RADIO_PLAY,
      args: { ...params },
    });
  }

  public callSingle(userId: string, sid: string) {
    this.report({
      msgid: EMsgid.SINGLE_CALL,
      args: { userId, sid },
    });
  }

  public callSingleResult(result: boolean, sid: string) {
    this.report({
      msgid: EMsgid.SINGLE_CALL_RESULT,
      args: { result, sid },
    });
  }

  public hangupSingle(userId: string, sid: string) {
    this.report({
      msgid: EMsgid.SINGLE_HANGUP,
      args: { userId, sid },
    });
  }

  public broadcastLive(sid: string) {
    this.report({
      msgid: EMsgid.BOARDCAST_LIVE,
      args: { sid },
    });
  }

  public broadcastLiveResult(failIds: string[], sid: string) {
    this.report({
      msgid: EMsgid.BOARDCAST_LIVE_RESULT,
      args: { failIds, sid },
    });
  }

  public stopBroadcastLive(sid: string) {
    this.report({
      msgid: EMsgid.STOP_BOARDCAST_LIVE,
      args: { sid },
    });
  }

  public broadcastAudio(data: any, sid: string) {
    this.report({
      msgid: EMsgid.BOARDCAST_AUDIO,
      args: { ...(data || {}), sid },
    });
  }

  public broadcastAudioResult(
    failIds: string[],
    params: any = {},
    sid: string
  ) {
    this.report({
      msgid: EMsgid.BOARDCAST_AUDIO_RESULT,
      args: { ...params, failIds, sid },
    });
  }

  public stopBroadcastAudio(sid: string) {
    this.report({
      msgid: EMsgid.STOP_BOARDCAST_AUDIO,
      args: { sid },
    });
  }

  public endRoom() {
    this.report({ msgid: EMsgid.END_ROOM });
  }

  public endRoomError(params: any = {}) {
    this.report({
      msgid: EMsgid.END_ROOM_ERROR,
      args: { ...params },
    });
  }

  public receiveStreamPublish(server: string, params: any = {}) {
    this.report({
      msgid: EMsgid.RECEIVE_STREAM_PUBLISH,
      args: { server, ...params },
    });
  }

  public receiveStreamStop(server: string, params: any = {}) {
    this.report({
      msgid: EMsgid.RECEIVE_STREAM_STOP,
      args: { server, ...params },
    });
  }

  public receiveEnterRoom(server: string, params: any = {}) {
    this.report({
      msgid: EMsgid.RECEIVE_ENTER_ROOM,
      args: { server, ...params },
    });
  }

  public receivePubFail(server: string, params: any = {}) {
    this.report({
      msgid: EMsgid.RECEIVE_PUB_FAIL,
      args: { server, ...params },
    });
  }

  public receivePubSuccess(server: string, params: any = {}) {
    this.report({
      msgid: EMsgid.RECEIVE_PUB_SUCCESS,
      args: { server, ...params },
    });
  }

  public updateBoardcastLiveStatusError(params: any = {}) {
    this.report({
      msgid: EMsgid.UPDATE_BOARDCAST_LIVE_STATUS_ERROR,
      args: { ...params },
    });
  }

  public playChannelMode(mode: 'single' | 'default') {
    this.report({
      msgid: EMsgid.PLAY_CHANNEL_MODE,
      args: { mode },
    });
  }

  public subscribeStart(params: { url: string }) {
    this.report({
      msgid: EMsgid.RTS_SUB_START,
      args: {
        ...params,
      },
    });
  }

  public publishStart(params: { url: string }) {
    this.report({
      msgid: EMsgid.RTS_PUB_START,
      args: {
        ...params,
      },
    });
  }

  public subscribeOk(params: { url: string; traceId: string }) {
    this.report({
      msgid: EMsgid.RTS_SUB_OK,
      args: {
        ...params,
      },
    });
  }

  public publishOk(params: { url: string; traceId: string }) {
    this.report({
      msgid: EMsgid.RTS_PUB_OK,
      args: {
        ...params,
      },
    });
  }

  public subscribeFirsrFrame(params: {
    url: string;
    traceId: string;
    cpct: number;
    hrct: number;
    ffct: number;
    cnct: number;
  }) {
    this.report({
      msgid: EMsgid.RTS_SUB_FIRSTFRAME,
      args: {
        ...params,
      },
    });
  }

  /**
   * 订阅过程中发生的所有 error
   */
  public subscribeError(params: {
    errorCode: ERtsErrorCode;
    /* RTS SDK ERROR */ errorMsg: string;
    url: string;
    traceId?: string;
  }) {
    this.report({
      msgid: EMsgid.RTS_SUB_ERROR,
      args: {
        ...params,
      },
    });
  }

  /**
   * 发布过程中发生的所有 error
   */
  public publishError(params: {
    errorCode: ERtsErrorCode;
    /* RTS SDK ERROR */ errorMsg: string;
    url: string;
    traceId?: string;
  }) {
    this.report({
      msgid: EMsgid.RTS_PUB_ERROR,
      args: {
        ...params,
      },
    });
  }

  /**
   * 拉流状态统计
   */
  public subscribeStats(params: {
    url: string;
    traceId: string;
    ct: number;
    tt: number;
    rtt: number;
    w: number;
    h: number;
    vbps: number;
    fps: number;
    vjb: number;
    abps: number;
    ajb: number;
  }) {
    this.report({
      msgid: EMsgid.RTS_SUB_STATS,
      args: {
        ...params,
      },
    });
  }

  public publishStats(params: {
    url: string;
    traceId: string;
    tt: number;
    rtt?: number;
    w?: number;
    h?: number;
    vbps?: number;
    fps?: number;
    abps?: number;
  }) {
    this.report({
      msgid: EMsgid.RTS_PUB_STATS,
      args: {
        ...params,
      },
    });
  }

  /**
   * 结束订阅，包括主动和被动断开
   */
  public subscribeEnd(params: { url: string; errorCode: ERtsEndType }) {
    this.report({
      msgid: EMsgid.RTS_SUB_END,
      args: {
        ...params,
      },
    });
  }

  /**
   * 结束发布，包括主动和被动断开
   */
  public publishEnd(params: { url: string; errorCode: ERtsEndType }) {
    this.report({
      msgid: EMsgid.RTS_PUB_END,
      args: {
        ...params,
      },
    });
  }

  public runGC(params: { from: string }) {
    this.report({
      msgid: EMsgid.RTS_RUN_GC,
      args: {
        ...params
      }
    })
  }

  public subscribeException(params: {
    url: string;
    errorCode: ERtsExceptionType;
    retryCount?: number;
    traceId?: string;
    streamPublishStatus?: number;
  }) {
    this.report({
      msgid: EMsgid.RTS_SUB_EXCEPTION,
      args: {
        ...params,
      },
    });
  }

  public publishException(params: {
    url: string;
    errorCode: ERtsExceptionType;
    retryCount?: number;
    deviceErrorCode?: number /* RTS SDK CODE */;
    traceId?: string;
  }) {
    this.report({
      msgid: EMsgid.RTS_PUB_EXCEPTION,
      args: {
        ...params,
      },
    });
  }
}

export const reporter = new Reporter({ enableLog: CONFIG.reporter.enable });
