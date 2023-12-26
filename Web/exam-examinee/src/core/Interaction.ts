/*
本文件是对互动消息SDK的封装
*/
import { reporter } from "@/utils/Reporter";
import * as RongIMLib from "@rongcloud/imlib-next";
import { v4 as uuidv4 } from "uuid";
import Emitter from "./Emitter";
import AliVCImEngine, { ITokenConfig, DisconnectCodes } from "./AlivcImEngine";
import {
  InteractionEvents,
  InteractionTypes,
  InteractionV2EventNames,
  ImMessage,
  ImSendMessageToUserReq,
} from "./types";

const INTERVAL = 3000; // 3秒1次
const MAX_RETRY_NUM = 2; // 最多 2 次

interface IMessageCache {
  sid: string;
  time: number;
}

interface IRCContent {
  type: InteractionTypes;
  sid: string;
  [x: string]: any;
}

interface IRCCache {
  messageUId: string;
  sid: string;
}

interface InteractionOptions {
  rongCloudIm?: {
    appkey: string;
  }
}

const RCEvents = RongIMLib.Events;

class Interaction extends Emitter {
  private engine: InstanceType<typeof AliVCImEngine>;
  private userInfo?: any;
  public joinedGroupId: string = "";
  private answerUserId: string = ""; // 为监考员的id
  private messageCacheMap: Map<string, IMessageCache> = new Map();
  private rcGroupId: string = "";
  private rcMessageCache: Map<InteractionTypes, IRCCache> = new Map();
  private initDatetime: number = Date.now();
  // 互动消息定时器数据
  private timerCache: Map<InteractionTypes, number> = new Map();

  // 自定义融云消息
  static ArtMessage: new (content: unknown) => RongIMLib.BaseMessage<unknown>;

  constructor(options?: InteractionOptions) {
    super();

    // 初始化融云，请务必保证此过程只被执行一次
    if (options?.rongCloudIm && options.rongCloudIm.appkey) {
      RongIMLib.init({
        appkey: options.rongCloudIm.appkey
      });
      Interaction.ArtMessage = RongIMLib.registerMessageType(
        "ART:Message",
        true,
        true,
        [],
        false
      );
      this.listenRCEvents();
    }

    // 初始化阿里云新版IM
    this.engine = new AliVCImEngine();
  }

  setTokenConfig(tokenConfig: ITokenConfig, refreshFunc: () => Promise<ITokenConfig>) {
    this.userInfo = {
      userId: tokenConfig?.auth?.userId,
    };
    this.engine.setTokenConfig(tokenConfig, refreshFunc);
  }

  async aliyunIMV2Init() {
    await this.engine.initEngine().then(() => {
      this.listenAliyunIMV2Event();
    });
  }

  private listenAliyunIMV2Event() {
    const handleMessage = (eventData: ImMessage) => {
      console.log("收到信息啦", eventData);
      const { type, data, groupId } = eventData || {};
      if (groupId !== this.joinedGroupId) {
        return;
      }
      this.handleMessageByType("aliyun", type, JSON.parse(data) || {});
    }

    this.engine.getMessageManager()
      ?.on(InteractionV2EventNames.RecvC2cMessage, handleMessage);

    this.engine.getMessageManager()
      ?.on(InteractionV2EventNames.RecvGroupMessage, handleMessage);

    this.engine.on("disconnect", (code: number) => {
      if (code === DisconnectCodes.Kicked || code === DisconnectCodes.OtherDeviceLogin) {
        // 考试项目：当是被踢出群组，或是同一账号其他设备也登录了就上报异常
        // 后续如果有需要，可以返回事件通知 UI 层展示错误提示
        reporter.alivcIMError({ event: "disconnect", code });
      }
    });
    this.engine.on("connectfailed", (error) => {
      reporter.alivcIMError({
        event: "connectfailed",
        message: error && error.message ?  error.message : "no reason",
      });
    });
  }

  private handleMessageByType(
    server: string,
    type: InteractionTypes,
    data: any
  ) {
    // 连麦、广播、口播消息会重发，这里会根据receiverIdList过滤不需要接受的消息
    if (
      server === "aliyun" && data.receiverIdList && !data.receiverIdList.includes(this.userInfo.userId)
    ) {
      return;
    }

    switch (type) {
      case InteractionTypes.StartCalling:
        this.handleStartCalling(server, data);
        break;
      case InteractionTypes.EndCalling:
        this.handleEndCalling(server, data);
        break;
      case InteractionTypes.StartBroadcastLive:
        this.handleStartBroadcastLive(server, data);
        break;
      case InteractionTypes.StopBroadcastLive:
        this.handleStopBroadcastLive(server, data);
        break;
      case InteractionTypes.EndRoom:
        reporter.receiveEndRoom(server, data?.sid);
        this.emit(InteractionEvents.EndRoom, data);
        break;
      case InteractionTypes.BroadcastAudio:
        this.handleBroadcastAudio(server, data);
        break;
      case InteractionTypes.StopBroadcastAudio:
        this.handleStopBroadcastAudio(server, data);
        break;
      case InteractionTypes.Reset:
        this.handleReset(server, data);
        break;
      default:
        break;
    }
  }

  // 监听融云消息
  private listenRCEvents() {
    RongIMLib.addEventListener(RCEvents.CONNECTED, () => {
      console.log("RC连接成功");
    });
    // 监听断联消息
    RongIMLib.addEventListener(RCEvents.DISCONNECT, (code) => {
      this.reportRongIMError("disconnect event", code);
    });
    // 消息事件
    RongIMLib.addEventListener(RCEvents.MESSAGES, (evt) => {
      const messages = evt.messages;
      messages.forEach((message) => {
        const { targetId, sentTime, messageType, messageUId } = message;
        const rcContent: IRCContent = message.content as any;
        // 非当前融云群组id的消息直接抛弃
        if (targetId !== this.rcGroupId) {
          return;
        }
        console.log("融云消息", message);
        // 结束考试，直接处理
        if (rcContent.type === InteractionTypes.EndRoom) {
          reporter.receiveEndRoom("rongcloud", rcContent.sid);
          this.emit(InteractionEvents.EndRoom, rcContent);
          return;
        }
        // 抛弃过期的消息
        if (this.initDatetime - sentTime > 15000) {
          return;
        }
        if (messageType === "ART:Message" && messageUId && rcContent) {
          this.rcMessageCache.set(rcContent.type, {
            sid: rcContent.sid,
            messageUId,
          });
          this.handleMessageByType("rongcloud", rcContent.type, rcContent);
        }
      });
    });
  }

  private saveMesssageCache(eventName: string, data: any): IMessageCache {
    let cur = this.messageCacheMap.get(eventName);
    if (!cur || cur.sid !== data.sid) {
      cur = {
        sid: data.sid,
        time: Date.now(),
      };
      this.messageCacheMap.set(eventName, cur);
    }
    return cur;
  }

  // 检查当前事件的时间是否比相对的另一个事件的时间大
  private checkTime(eventName: string, time: number) {
    const endCallCache = this.messageCacheMap.get(eventName);
    if (endCallCache && endCallCache.time > time) {
      return false;
    }
    return true;
  }

  private handleStartCalling(server: string, data: any) {
    reporter.receiveSingleCall(server, data?.sid);
    // 保存信息
    const cur = this.saveMesssageCache(InteractionEvents.StartCalling, data);
    // 若比结束通话的时间小则不处理
    if (this.checkTime(InteractionEvents.EndCalling, cur.time)) {
      return this.emit(InteractionEvents.StartCalling, data);
    }
  }

  private handleEndCalling(server: string, data: any) {
    reporter.receiveSingleHangUp(server, data?.sid);
    const cur = this.saveMesssageCache(InteractionEvents.EndCalling, data);
    if (this.checkTime(InteractionEvents.StartCalling, cur.time)) {
      return this.emit(InteractionEvents.EndCalling, data);
    }
  }

  private handleStartBroadcastLive(server: string, data: any) {
    reporter.receiveBoardcastLive(server, data?.sid);
    const cur = this.saveMesssageCache(
      InteractionEvents.StartBroadcastLive,
      data
    );
    if (this.checkTime(InteractionEvents.StopBroadcastLive, cur.time)) {
      return this.emit(InteractionEvents.StartBroadcastLive, data);
    }
  }

  private handleStopBroadcastLive(server: string, data: any) {
    reporter.receiveStopBoardcastLive(server, data?.sid);
    const cur = this.saveMesssageCache(
      InteractionEvents.StopBroadcastLive,
      data
    );
    if (this.checkTime(InteractionEvents.StartBroadcastLive, cur.time)) {
      return this.emit(InteractionEvents.StopBroadcastLive, data);
    }
  }

  private handleBroadcastAudio(server: string, data: any) {
    reporter.receiveBoardcastAudio(server, data);
    const cur = this.saveMesssageCache(InteractionEvents.BroadcastAudio, data);
    if (this.checkTime(InteractionEvents.StopBroadcastAudio, cur.time)) {
      return this.emit(InteractionEvents.BroadcastAudio, data);
    }
  }

  private handleStopBroadcastAudio(server: string, data: any) {
    reporter.receiveStopBoardcastAudio(server, data?.sid);
    const cur = this.saveMesssageCache(
      InteractionEvents.StopBroadcastAudio,
      data
    );
    if (this.checkTime(InteractionEvents.BroadcastAudio, cur.time)) {
      return this.emit(InteractionEvents.StopBroadcastAudio, data);
    }
  }

  private handleReset(server: string, data: any) {
    reporter.receiveReset(server, data?.sid);
    this.saveMesssageCache(InteractionEvents.Reset, data);
    return this.emit(InteractionEvents.Reset, data);
  }

  auth() {
    return this.engine.loginEngine();
  }

  logout(): Promise<any> {
    return this.engine.logout();
  }

  async connectRC(token: string, groupId: string) {
    const res = await RongIMLib.connect(token);
    this.rcGroupId = groupId;
    if (res.code !== RongIMLib.ErrorCode.SUCCESS) {
      this.reportRongIMError("connect", res.code, res.msg);
    }
    this.sendRCMessageToInvigilator(InteractionTypes.EnterRoom);
    reporter.sendEnterRoom({ server: "rongcloud" });
    return res.code === RongIMLib.ErrorCode.SUCCESS;
  }

  disconnectRC() {
    return RongIMLib.disconnect();
  }

  async leaveGroup() {
    if (!this.joinedGroupId) {
      return Promise.resolve(true);
    }
    const res = await this.engine.leaveGroup();
    this.joinedGroupId = '';
    return res;
  }

  joinGroup(groupId: string) {
    return new Promise((resolve, reject) => {
      this.engine
        .joinGroup(groupId)
        .then(res => {
          this.joinedGroupId = groupId;
          const sid = uuidv4();
          this.sendIMMessageToInvigilator(InteractionTypes.EnterRoom, sid);
          reporter.sendEnterRoom({ sid, server: "aliyun" });
          resolve(res);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  public setAnswerUserId(userId: string) {
    this.answerUserId = userId;
  }

  private responseRCMessage(
    type: InteractionTypes,
    feedbackType: InteractionTypes,
    sid?: string
  ) {
    const item = this.rcMessageCache.get(type);
    if (!item || !this.rcGroupId) {
      return;
    }
    const messageList = {
      [this.answerUserId]: [item.messageUId],
    };
    RongIMLib.sendReadReceiptResponseV2(this.rcGroupId, messageList)
      .then((res) => {
        this.rcMessageCache.delete(type);
        console.log("融云反馈结果：", res.code, res.msg);
        if (res.code !== RongIMLib.ErrorCode.SUCCESS) {
          this.reportRongIMError(
            "sendReadReceiptResponseV2",
            res.code,
            res.msg,
            messageList
          );
        } else {
          reporter.feedback({ server: "rongcloud", feedbackType, sid });
        }
      })
      .catch((error) => {
        console.log("融云反馈异常：", error);
        this.reportRongIMError(
          "sendReadReceiptResponseV2",
          -1,
          error.message,
          messageList
        );
      });
  }

  private sendMessageToGroupUsers(options: ImSendMessageToUserReq) {
    // 当前用到该方法的sendIMMessageToInvigilator、feedback，均为单发消息，因此用sendC2cMessage
    // 仅支持单发消息，若需要发给多个人请勿使用这个方法
    // 执行次数
    let num = 0;
    const send = (
      type: InteractionTypes,
      resolve: Function,
      reject: Function
    ) => {
      this.engine
        .getMessageManager()
        ?.sendC2cMessage(options)
        .then(() => {
          resolve();
        })
        .catch((err: any) => {
          num += 1;
          // 失败次数未达到最大次数，那么定时重试，否则返回错误
          if (num >= MAX_RETRY_NUM) {
            reject(err);
          } else {
            const timer = window.setTimeout(() => {
              send(type, resolve, reject);
            }, INTERVAL);
            this.timerCache.set(type, timer);
          }
        });
    };

    return new Promise((resolve, reject) => {
      const type: InteractionTypes = options.type;
      send(type, resolve, reject);
    });
  }

  private clearTimerByType(type: InteractionTypes) {
    const timer = this.timerCache.get(type);
    if (timer) {
      window.clearTimeout(timer);
      this.timerCache.delete(type);
    }
  }

  /**
   * @param {InteractionTypes} originType
   * @param {InteractionTypes} feedbackType
   * @param {InteractionEvents} event
   * @param {boolean} [initiative=false] 主动反馈无需有接收到的消息缓存
   */
  private feedback(
    originType: InteractionTypes,
    feedbackType: InteractionTypes,
    event: InteractionEvents,
    initiative: boolean = false
  ) {
    const item = initiative ? { sid: "" } : this.messageCacheMap.get(event);
    const sid = item?.sid;
    // 融云反馈
    this.responseRCMessage(originType, feedbackType, sid);
    // 互动消息反馈
    if (!item || !this.joinedGroupId) {
      return Promise.resolve();
    }
    const options = {
      groupId: this.joinedGroupId,
      type: feedbackType,
      data: JSON.stringify({ sid }),
      receiverId: this.answerUserId,
      // 默认IM服务会对内容检测，有可能误触发错误，所以统一加上跳过检测字段
      skipAudit: true,
    };
    return this.sendMessageToGroupUsers(options)
      .then(() => {
        reporter.feedback({ server: "aliyun", feedbackType, sid });
      })
      .catch((err: any) => {
        this.reportSendMessageError(options, err, sid);
      });
  }

  // 主动发消息给监考员
  private sendIMMessageToInvigilator(type: InteractionTypes, sid: string, data?: any) {
    if (this.joinedGroupId) {
      const options = {
        groupId: this.joinedGroupId,
        data: JSON.stringify({ sid, data }),
        type,
        receiverId: this.answerUserId,
        // 默认IM服务会对内容检测，有可能误触发错误，所以统一加上跳过检测字段
        skipAudit: true,
      };

      this.sendMessageToGroupUsers(options)
        .then((res: any) => {
          if (res && res.code !== 200) {
            console.log("res", res);
          }
        })
        .catch((err: any) => {
          const excludeMessages = ["user not online"];
          if (err && excludeMessages.includes(err.message)) {
            // 用户不在线的错误不需要上报
            return;
          }
          console.log("err", err);
          this.reportSendMessageError(options, err, sid);
        });
    }
  }

  private async sendRCMessageToInvigilator(type: InteractionTypes, sid?: string, data?: any) {
    if (!this.rcGroupId) {
      return;
    }
    const receiverIdList = [this.answerUserId];
    const content = { type, sid, data };
    const conversation = {
      conversationType: RongIMLib.ConversationType.GROUP,
      targetId: this.rcGroupId,
    };
    try {
      const message = new Interaction.ArtMessage(content);
      const res = await RongIMLib.sendMessage(conversation, message, {
        directionalUserIdList: receiverIdList,
      });
      if (res.code !== RongIMLib.ErrorCode.SUCCESS) {
        this.reportRongIMError("sendMessage", res.code, res.msg, {
          type,
          receiverIdList,
        });
      } else {
        console.log("融云发送成功", type);
      }
    } catch (error: any) {
      this.reportRongIMError("sendMessage", -1, error.message, {
        type,
        receiverIdList,
      });
    }
  }

  answerCallConnected() {
    // 发送已连接消息时，若当前还有连接已断开的消息等待发送时要先停止
    // 反过来也一样
    this.clearTimerByType(InteractionTypes.CallDisconnected);
    return this.feedback(
      InteractionTypes.StartCalling,
      InteractionTypes.CallConnected,
      InteractionEvents.StartCalling
    );
  }

  answerCallDisconnected() {
    this.clearTimerByType(InteractionTypes.CallConnected);
    return this.feedback(
      InteractionTypes.EndCalling,
      InteractionTypes.CallDisconnected,
      InteractionEvents.EndCalling
    );
  }

  /**
   * @param {boolean} [initiative=false] 主动反馈
   */
  feedbackBroadcastLive(initiative: boolean = false) {
    this.clearTimerByType(InteractionTypes.StopBroadcastLiveFeedback);
    return this.feedback(
      InteractionTypes.StartBroadcastLive,
      InteractionTypes.BroadcastLiveFeedback,
      InteractionEvents.StartBroadcastLive,
      initiative
    );
  }

  feedbackBroadcastAudio() {
    this.clearTimerByType(InteractionTypes.StopBroadcastAudioFeedback);
    return this.feedback(
      InteractionTypes.BroadcastAudio,
      InteractionTypes.BroadcastAudioFeedback,
      InteractionEvents.BroadcastAudio
    );
  }

  feedbackStopBroadcastLive() {
    this.clearTimerByType(InteractionTypes.BroadcastLiveFeedback);
    return this.feedback(
      InteractionTypes.StopBroadcastLive,
      InteractionTypes.StopBroadcastLiveFeedback,
      InteractionEvents.StopBroadcastLive
    );
  }

  feedbackStopBroadcastAudio() {
    this.clearTimerByType(InteractionTypes.BroadcastAudioFeedback);
    return this.feedback(
      InteractionTypes.StopBroadcastAudio,
      InteractionTypes.StopBroadcastAudioFeedback,
      InteractionEvents.StopBroadcastAudio
    );
  }

  sendPubSuccess() {
    const sid = uuidv4();
    reporter.sendPubSuccess({ sid });
    this.clearTimerByType(InteractionTypes.PubFail);
    this.sendIMMessageToInvigilator(InteractionTypes.PubSuccess, sid);
    this.sendRCMessageToInvigilator(InteractionTypes.PubSuccess);
  }

  sendPubFail() {
    const sid = uuidv4();
    reporter.sendPubFail({ sid });
    this.clearTimerByType(InteractionTypes.PubSuccess);
    this.sendIMMessageToInvigilator(InteractionTypes.PubFail, sid);
    this.sendRCMessageToInvigilator(InteractionTypes.PubFail);
  }

  sendDetectMessage(data: any) {
    const sid = uuidv4();
    this.sendIMMessageToInvigilator(InteractionTypes.SendDetectMessage, sid, data);
    this.sendRCMessageToInvigilator(InteractionTypes.SendDetectMessage, sid, data);
  }

  private reportSendMessageError(options: any, err: any, sid?: string) {
    let params: any = { sid };
    if (err) {
      if (err.body) {
        params = { ...err.body };
      } else {
        params.reason = err.message;
      }
    }
    params.options = options;
    reporter.sendMessageError(params);
  }

  private reportRongIMError(
    api: string,
    code: number,
    message?: string,
    options?: any
  ) {
    reporter.rongIMError({ api, code, message, options });
  }
}

export default Interaction;
