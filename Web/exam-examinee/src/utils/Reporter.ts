/**
 * 埋点工具
 */
import SlsTracker from "@aliyun-sls/web-track-browser";
import { AliRTS } from "aliyun-rts-sdk";
import type { ErrorCode as ERtsErrorCode } from "aliyun-rts-sdk/dist/core/error/errorcode";
import { createGuid, getParamFromSearch } from "./common";
import { IVideoProfile } from "@/types/exam";

/**
 * 业务类型
 */
enum EBizType {
  /**
   * 考生端
   */
  Examinee = 1,
  /**
   * 监考端
   */
  Invigilator = 2,
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
  // 考试业务公共 10xx
  INIT_PARAMS_ILLEGAL = 1001,
  INIT_ERROR = 1002,
  JOIN_GROUP_ERROR = 1003, // 加入互相消息组失败
  SEND_MESSAGE_ERROR = 1004, // 发送互动消息失败
  RONG_IM_ERROR = 1005, // 融云异常
  TIMER_RADIO_PLAY = 1006, // 触发加载定时
  JOIN_GROUP_SUCCESS = 1007, // 加入互相消息组成功
  AUDIO_PLAYING = 1008, // 音频播放中
  AUDIO_ERROR = 1009, // 音频播放失败
  // 考生端 12xx
  FEEDBACK = 1200, // 反馈成功后上报
  RECEIVE_BOARDCAST_LIVE = 1201, // 收到全员口播
  RECEIVE_STOP_BOARDCAST_LIVE = 1202,
  RECEIVE_BOARDCAST_AUDIO = 1203, // 收到系统广播音频
  RECEIVE_STOP_BOARDCAST_AUDIO = 1204,
  RECEIVE_SINGLE_CALL = 1205, // 收到单人连麦
  RECEIVE_SINGLE_HANGUP = 1206,
  RECEIVE_END_ROOM = 1207, // 收到结束考试
  RECEIVE_RESET = 1208, // 收到结束考试
  RECEIVE_DATE_RESULT = 1209, // 对服务端返回的定时广播日期做 new Date() 的结果
  SEND_ENTER_ROOM = 1210,
  SEND_PUB_SUCCESS = 1211,
  SEND_PUB_FAIL = 1212,

  // 本地录制相关
  START_RECORD = 1250,
  START_RECORD_ERROR = 1251, // 因所用插件开启录制接口不会抛错，所以废弃
  STOP_RECORD = 1252,
  STOP_RECORD_ERROR = 1253, // 因所用插件停止录制接口不会抛错，所以废弃
  OSS_INIT_ERROR = 1254,
  CHUNK_UPLOAD_SUCCESS = 1255,
  CHUNK_UPLOAD_FAIL = 1256,
  GET_STS_ERROR = 1257,
  GET_STS_SUCCESS = 1258,

  // 防作弊检测相关
  CHEAT_DETECTION_NEEDLESS = 1280, // 不需要检测
  CHEAT_DETECTION_INITED = 1281,
  CHEAT_DETECTION_ERR = 1282,

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

  RTS_SUB_EXCEPTION = 2100,
  RTS_PUB_EXCEPTION,
  RTS_PUB_UNDERFLOW,
  RTS_PUB_RESUME,
  RTS_SDP_SUPPORT_264,
  RTS_PAGE_STATE,

  RTS_RECEIVE_VIDEO_PROFILE = 2200, // 传入的 VideoProfile 参数值
  RTS_VALIDATED_VIDEO_PROFILE, // 校验处理后的 VideoProfile
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
  msgname?: typeof EMsgid;

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
      biz: EBizType.Examinee,
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
        msgname: EMsgid[params.msgid!],
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

  public audioPlaying(params: any = {}) {
    this.report({
      msgid: EMsgid.AUDIO_PLAYING,
      args: { ...params },
    });
  }

  public audioPlayFail(params: any = {}) {
    this.report({
      msgid: EMsgid.AUDIO_ERROR,
      args: { ...params },
    });
  }

  public feedback(params: any = {}) {
    this.report({
      msgid: EMsgid.FEEDBACK,
      args: { ...params },
    });
  }

  public receiveBoardcastLive(server: string, sid?: string) {
    this.report({
      msgid: EMsgid.RECEIVE_BOARDCAST_LIVE,
      args: { server, sid },
    });
  }

  public receiveStopBoardcastLive(server: string, sid?: string) {
    this.report({
      msgid: EMsgid.RECEIVE_STOP_BOARDCAST_LIVE,
      args: { server, sid },
    });
  }

  public receiveBoardcastAudio(server: string, params: any = {}) {
    this.report({
      msgid: EMsgid.RECEIVE_BOARDCAST_AUDIO,
      args: { server, ...params },
    });
  }

  public receiveStopBoardcastAudio(server: string, sid?: string) {
    this.report({
      msgid: EMsgid.RECEIVE_STOP_BOARDCAST_AUDIO,
      args: { server, sid },
    });
  }

  public receiveSingleCall(server: string, sid?: string) {
    this.report({
      msgid: EMsgid.RECEIVE_SINGLE_CALL,
      args: { server, sid },
    });
  }

  public receiveSingleHangUp(server: string, sid?: string) {
    this.report({
      msgid: EMsgid.RECEIVE_SINGLE_HANGUP,
      args: { server, sid },
    });
  }

  public receiveEndRoom(server: string, sid?: string) {
    this.report({
      msgid: EMsgid.RECEIVE_END_ROOM,
      args: { server, sid },
    });
  }

  public receiveReset(server: string, sid?: string) {
    this.report({
      msgid: EMsgid.RECEIVE_RESET,
      args: { server, sid },
    });
  }

  public receiveDateResult(params: { result?: string; source?: string } = {}) {
    this.report({
      msgid: EMsgid.RECEIVE_DATE_RESULT,
      args: {
        ...params,
      },
    });
  }

  public sendEnterRoom(params: any = {}) {
    this.report({
      msgid: EMsgid.SEND_ENTER_ROOM,
      args: {
        ...params,
      },
    });
  }

  public sendPubSuccess(params: any = {}) {
    this.report({
      msgid: EMsgid.SEND_PUB_SUCCESS,
      args: {
        ...params,
      },
    });
  }

  public sendPubFail(params: any = {}) {
    this.report({
      msgid: EMsgid.SEND_PUB_FAIL,
      args: {
        ...params,
      },
    });
  }

  public startRecord() {
    this.report({ msgid: EMsgid.START_RECORD });
  }

  public stopRecord() {
    this.report({ msgid: EMsgid.STOP_RECORD });
  }

  public startRecordError(params: any = {}) {
    this.report({
      msgid: EMsgid.START_RECORD_ERROR,
      args: {
        ...params,
        message: params.message,
      },
    });
  }

  public stopRecordError(params: any = {}) {
    this.report({
      msgid: EMsgid.STOP_RECORD_ERROR,
      args: {
        ...params,
        message: params.message,
      },
    });
  }

  public ossInitError(params: any = {}) {
    this.report({
      msgid: EMsgid.OSS_INIT_ERROR,
      args: { ...params },
    });
  }

  public chunkUploadSuccess(params: any = {}) {
    this.report({
      msgid: EMsgid.CHUNK_UPLOAD_SUCCESS,
      args: { ...params },
    });
  }

  public chunkUploadFail(params: any = {}) {
    this.report({
      msgid: EMsgid.CHUNK_UPLOAD_FAIL,
      args: { ...params },
    });
  }

  public getSTSError(params: any = {}) {
    this.report({
      msgid: EMsgid.GET_STS_ERROR,
      args: { ...params },
    });
  }

  public getSTSSuccess() {
    this.report({ msgid: EMsgid.GET_STS_SUCCESS });
  }

  public cheactDetectionNeedless(config: any) {
    this.report({
      msgid: EMsgid.CHEAT_DETECTION_NEEDLESS,
      args: config,
    });
  }

  public cheactDetectionInited(config: any) {
    this.report({
      msgid: EMsgid.CHEAT_DETECTION_INITED,
      args: config,
    });
  }

  public cheactDetectionError(from: string, err: any) {
    this.report({
      msgid: EMsgid.CHEAT_DETECTION_ERR,
      args: { from, err },
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
    candiRemoteProtocol: string;
    candiRemoteAddr: string;
    candiLocalProtocol: string;
    candiLocalAddr: string;
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
    streamConfig?: any;
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

  public publishUnderFlow() {
    this.report({
      msgid: EMsgid.RTS_PUB_UNDERFLOW,
      args: {},
    });
  }

  public publishResume() {
    this.report({
      msgid: EMsgid.RTS_PUB_RESUME,
      args: {},
    });
  }

  public sdpSupportH264(params: { res: number }) {
    this.report({
      msgid: EMsgid.RTS_SDP_SUPPORT_264,
      args: {
        ...params,
      },
    });
  }

  public receiveVideoProfile(videoProfile?: IVideoProfile) {
    this.report({
      msgid: EMsgid.RTS_RECEIVE_VIDEO_PROFILE,
      args: videoProfile,
    });
  }

  public validatedVideoProfile(videoProfile: IVideoProfile) {
    this.report({
      msgid: EMsgid.RTS_VALIDATED_VIDEO_PROFILE,
      args: videoProfile,
    });
  }
  
  public pageState(params: { state: 'resume' | 'pause'/* 被打断，后台、电话、系统弹窗等 */ }) {
    this.report({
      msgid: EMsgid.RTS_PAGE_STATE,
      args: {
        ...params
      }
    })
  }
}

export const reporter = new Reporter({ enableLog: CONFIG.reporter.enable });
