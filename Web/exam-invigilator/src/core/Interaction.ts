/*
本文件是对互动消息SDK的封装
*/
import { reporter } from "../utils/Reporter";
import * as RongIMLib from '@rongcloud/imlib-next';
import { v4 as uuidv4 } from "uuid";
import Emitter from "./Emitter";
import AliVCImEngine, { ITokenConfig, DisconnectCodes } from "./AlivcImEngine";
import {
  BasicMap,
  InteractionEvents,
  InteractionTypes,
  ImMessage,
  InteractionV2EventNames,
  ImSendMessageToGroupReq,
} from "./types";

interface InteractionOptions {
  rongCloudIm?: {
    appkey: string;
  }
}

const INTERVAL = 3000; // 3秒1次
const MAX_RETRY_NUM = 5; // 最多 5 次

const RCEvents = RongIMLib.Events;

interface IRCContent {
  type: InteractionTypes;
  sid: string;
  [x: string]: any;
}

interface IMessageCacheItem {
  sid: string;
  resolve: Function;
  reject: Function;
  timer: number;
  receiverIdSet: Set<string>;
}

class Interaction extends Emitter {
  private engine: InstanceType<typeof AliVCImEngine>;
  private detectMessageCache: Set<string> = new Set();
  private messageCache: Map<InteractionTypes, IMessageCacheItem> = new Map();
  public joinedGroupId: string = "";
  private rcGroupId: string = "";
  private rcMessageCache: Map<string, IRCContent> = new Map();
  private initDatetime: number = Date.now();
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
      const { type } = eventData || {};
      const data = JSON.parse((eventData || {}).data);
      const senderId = (eventData || {})?.sender?.userId as string;

      switch (type) {
        case InteractionTypes.StreamStop:
          reporter.receiveStreamStop("aliyun", data);
          this.emit(InteractionEvents.StreamStop, data);
          break;
        case InteractionTypes.StreamPublish:
          reporter.receiveStreamPublish("aliyun", data);
          this.emit(InteractionEvents.StreamPublish, data);
          break;
        case InteractionTypes.CallConnected:
          this.handleFeedback(
            InteractionTypes.StartCalling,
            data.sid,
            senderId
          );
          break;
        case InteractionTypes.CallDisconnected:
          this.handleFeedback(InteractionTypes.EndCalling, data.sid, senderId);
          break;
        case InteractionTypes.BroadcastLiveFeedback:
          if (data.sid) {
            this.handleFeedback(
              InteractionTypes.StartBroadcastLive,
              data.sid,
              senderId,
              InteractionEvents.BroadcastLiveFeedback
            );
          } else {
            // 考生初始化时同步服务端记录的口播状态，会同步口播并通知监考端，此时并无 sid，所以单独处理
            this.emit(InteractionEvents.BroadcastLiveFeedback, senderId);
          }
          break;
        case InteractionTypes.StopBroadcastLiveFeedback:
          this.handleFeedback(
            InteractionTypes.StopBroadcastLive,
            data.sid,
            senderId
          );
          break;
        case InteractionTypes.BroadcastAudioFeedback:
          this.handleFeedback(
            InteractionTypes.BroadcastAudio,
            data.sid,
            senderId,
            InteractionEvents.BroadcastAudioFeedback
          );
          break;
        case InteractionTypes.StopBroadcastAudioFeedback:
          this.handleFeedback(
            InteractionTypes.StopBroadcastAudio,
            data.sid,
            senderId
          );
          break;
        case InteractionTypes.EnterRoom:
          reporter.receiveEnterRoom("aliyun", { userId: senderId });
          this.emit(InteractionEvents.EnterRoom, senderId);
          break;
        case InteractionTypes.PubFail:
          reporter.receivePubFail("aliyun", { userId: senderId });
          this.emit(InteractionEvents.PubFail, senderId);
          break;
        case InteractionTypes.PubSuccess:
          reporter.receivePubSuccess("aliyun", { userId: senderId });
          this.emit(InteractionEvents.PubSuccess, senderId);
          break;
        case InteractionTypes.SendDetectMessage:
          this.handleDetectMessage(data);
          break;
        default:
          break;
      }
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
      console.log("融云消息", evt);

      const handleExaminee = (content: any, senderId: string) => {
        const { type } = content; 
        switch (type) {
          case InteractionTypes.EnterRoom:
            reporter.receiveEnterRoom("rongcloud", { userId: senderId });
            this.emit(InteractionEvents.EnterRoom, senderId);
            break;
          case InteractionTypes.PubFail:
            reporter.receivePubFail("rongcloud", { userId: senderId });
            this.emit(InteractionEvents.PubFail, senderId);
            break;
          case InteractionTypes.PubSuccess:
            reporter.receivePubSuccess("rongcloud", { userId: senderId });
            this.emit(InteractionEvents.PubSuccess, senderId);
            break;
          case InteractionTypes.SendDetectMessage:
            this.handleDetectMessage(content);
            break;
          default:
            break;
        }
      };

      const messages = evt.messages;
      messages.forEach((message) => {
        const { targetId, sentTime, messageType, content, senderUserId } =
          message;
        // 抛弃过期的、非当前融云群组id的消息
        if (
          targetId !== this.rcGroupId ||
          this.initDatetime - sentTime > INTERVAL * MAX_RETRY_NUM
        ) {
          return;
        }
        switch (messageType) {
          // ART:StreamPublish、ART:StreamStop两类融云自定义消息为服务端监听回调下发
          case "ART:StreamPublish":
            reporter.receiveStreamPublish("rongcloud", content);
            this.emit(InteractionEvents.StreamPublish, content);
            break;
          case "ART:StreamStop":
            reporter.receiveStreamStop("rongcloud", content);
            this.emit(InteractionEvents.StreamStop, content);
            break;
          case "ART:Message":
            // 来自考生的消息
            handleExaminee((content as any), senderUserId);
            break;
          default:
            break;
        }
      });
    });
    const eventMap: any = {
      [InteractionTypes.StartBroadcastLive]:
        InteractionEvents.BroadcastLiveFeedback,
      [InteractionTypes.BroadcastAudio]:
        InteractionEvents.BroadcastAudioFeedback,
    };
    // 回执事件
    RongIMLib.addEventListener(RCEvents.MESSAGE_RECEIPT_RESPONSE, (evt) => {
      const { receivedUserId, messageUIdList } = evt;
      // conversation 群组会话
      // receivedUserId 为消息接收者，即谁响应了之前发送的消息回执请求
      // messageUIdList 为 消息接收者已查看了的消息UId列表
      console.log("MESSAGE_RECEIPT_RESPONSE", receivedUserId, messageUIdList);
      messageUIdList.forEach((messageUId) => {
        const item = this.rcMessageCache.get(messageUId);
        if (!item) {
          return;
        }
        this.rcMessageCache.delete(messageUId);
        this.handleFeedback(
          item.type,
          item.sid,
          receivedUserId,
          eventMap[item.type]
        );
      });
    });
  }

  private handleDetectMessage(content: any) {
    const { sid } = content;
    if (this.detectMessageCache.has(sid)) {
      return;
    }
    this.detectMessageCache.add(sid);
    this.emit(InteractionEvents.SendDetectMessage, content);
  }

  private handleFeedback(
    type: InteractionTypes,
    sid: string,
    senderId: string,
    eventName?: string
  ) {
    const item = this.messageCache.get(type);
    if (!item || item.sid !== sid) {
      return;
    }
    const set: Set<string> = item.receiverIdSet;
    if (!set.has(senderId)) {
      return;
    }
    // 移除已反馈的用户id
    set.delete(senderId);
    if (!set.size) {
      this.clearTimerByType(type);
      item.resolve([]);
    }
    if (eventName) {
      this.emit(eventName, senderId);
    }
  }

  auth() {
    return this.engine.loginEngine();
  }

  async connectRC(token: string, groupId: string) {
    const res = await RongIMLib.connect(token);
    this.rcGroupId = groupId;
    if (res.code !== RongIMLib.ErrorCode.SUCCESS) {
      this.reportRongIMError("connect", res.code, res.msg);
      throw res;
    }
    return res.code;
  }

  disconnectRC() {
    return RongIMLib.disconnect();
  }

  logout(): Promise<any> {
    return this.engine.logout();
  }

  async leaveGroup() {
    if (!this.joinedGroupId) {
      return Promise.resolve(true);
    }
    const res = await this.engine.leaveGroup();
    this.joinedGroupId = '';
    return res;
  }

  async joinGroup(groupId: string) {
    const res = await this.engine.joinGroup(groupId);
    this.joinedGroupId = groupId;
    return res;
  }

  private clearTimerByType(type: InteractionTypes) {
    const item = this.messageCache.get(type);
    if (item) {
      window.clearTimeout(item.timer);
      this.messageCache.delete(type);
    }
  }

  private async sendRCMessage(
    content: IRCContent,
    directionalUserIdList?: string[],
    needFeedback = true
  ) {
    if (!this.rcGroupId) {
      return;
    }
    const conversation = {
      conversationType: RongIMLib.ConversationType.GROUP,
      targetId: this.rcGroupId,
    };
    const message = new Interaction.ArtMessage(content);
    const options = directionalUserIdList
      ? { directionalUserIdList }
      : undefined;
    try {
      const res = await RongIMLib.sendMessage(conversation, message, options);
      if (res.code === RongIMLib.ErrorCode.SUCCESS) {
        console.log("RC消息发送成功", res.data);
        if (res.data?.messageUId && needFeedback) {
          this.rcMessageCache.set(res.data.messageUId, content);
          // 发起群组消息已读回执请求
          const result = await RongIMLib.sendReadReceiptRequest(
            this.rcGroupId,
            res.data.messageUId
          );
          if (result.code === 0) {
            console.log("RC回执请求发送成功");
          } else {
            console.log("RC回执请求发送失败", res.code, res.msg);
            this.reportRongIMError("sendReadReceiptRequest", res.code, res.msg);
          }
        }
      } else {
        console.log("RC消息发送失败", res.code, res.msg);
        this.reportRongIMError("sendMessage", res.code, res.msg, content);
      }
    } catch (error: any) {
      console.log("RC消息发送异常", error);
      this.reportRongIMError("sendMessage", -1, error.message, content);
    }
  }

  // 多次发送，提高可靠性
  private sendMessage(
    sid: string,
    resolve: Function,
    reject: Function,
    options: BasicMap<any>
  ) {
    let num = 0;
    const type: InteractionTypes = options.type;
    const receiverIdSet: Set<string> = new Set(options.receiverIdList || []);
    // 默认IM服务会对内容检测，有可能误触发错误，所以统一加上跳过检测字段
    options.skipAudit = true;

    const sendAliyunMessageToGroupUsers = (parmas: any): Promise<string> => {
      if (!parmas.groupId) {
        console.log('groupId 为空，未加入阿里云互动消息群组，不执行发送消息');
        return Promise.resolve('');
      }
      const _parmas = {
        ...parmas,
        data: JSON.stringify({
          ...JSON.parse(options.data),
          receiverIdList: parmas.receiverIdList,
        }),
      }
      // 后续阿里云新版IM会支持 sendMessageToGroupUsers
      // 现在先用群发代替(需要反馈)，消息接收者根据data里的receiverIdList去删选是否接受消息
      return this.engine.getMessageManager()
        ?.sendGroupMessage(_parmas) as Promise<string>;
    }

    const send = (parmas: any) => {
      num += 1;
      sendAliyunMessageToGroupUsers(parmas).catch((err: any) => {
        console.log(err);
        this.reportSendMessageError(options, err);
      });
      // 融云只发一次
      if (num === 1) {
        let data = {};
        try {
          data = JSON.parse(options.data);
        } catch (error) {
          //
        }
        const rcContent = { ...data, sid, type };
        this.sendRCMessage(rcContent, options.receiverIdList);
      }
    };

    const timer = window.setInterval(() => {
      const item = this.messageCache.get(type);
      if (!item) {
        return;
      }
      const set: Set<string> = item.receiverIdSet;
      if (!set.size) {
        item.resolve([]);
        return;
      }
      if (num < MAX_RETRY_NUM) {
        // 更新传输的接收用户列表，不向已反馈的用户发送消息了
        options.receiverIdList = [...set];
        send(options);
      } else {
        this.clearTimerByType(type);
        item.resolve([...set]);
      }
    }, INTERVAL);

    this.messageCache.set(type, {
      sid,
      timer,
      receiverIdSet,
      resolve,
      reject,
    });

    send(options);
  }

  callSingle(userId: string, sid: string, enableAudioMix?: boolean): Promise<any> {
    reporter.callSingle(userId, sid);
    this.clearTimerByType(InteractionTypes.StartCalling);
    this.clearTimerByType(InteractionTypes.EndCalling);
    return new Promise((resolve, reject) => {
      const options = {
        groupId: this.joinedGroupId,
        type: InteractionTypes.StartCalling,
        data: JSON.stringify({ sid, enableAudioMix }),
        receiverIdList: [userId],
      };
      this.sendMessage(sid, resolve, reject, options);
    });
  }

  hangUpSingle(userId: string): Promise<any> {
    const sid = uuidv4();
    reporter.hangupSingle(userId, sid);
    this.clearTimerByType(InteractionTypes.StartCalling);
    this.clearTimerByType(InteractionTypes.EndCalling);
    return new Promise((resolve, reject) => {
      const options = {
        groupId: this.joinedGroupId,
        type: InteractionTypes.EndCalling,
        data: JSON.stringify({ sid }),
        receiverIdList: [userId],
      };
      this.sendMessage(sid, resolve, reject, options);
    });
  }

  // 老师全员口播
  broadcastLive(receiverIdList: string[], sid: string): Promise<any> {
    reporter.broadcastLive(sid);
    this.clearTimerByType(InteractionTypes.StartBroadcastLive);
    this.clearTimerByType(InteractionTypes.StopBroadcastLive);
    return new Promise((resolve, reject) => {
      const options = {
        groupId: this.joinedGroupId,
        type: InteractionTypes.StartBroadcastLive,
        data: JSON.stringify({ sid }),
        receiverIdList,
      };
      this.sendMessage(sid, resolve, reject, options);
    });
  }

  // 老师停止全员口播
  stopBroadcastLive(receiverIdList: string[]): Promise<any> {
    const sid = uuidv4();
    reporter.stopBroadcastLive(sid);
    this.clearTimerByType(InteractionTypes.StartBroadcastLive);
    this.clearTimerByType(InteractionTypes.StopBroadcastLive);
    return new Promise((resolve, reject) => {
      const options = {
        groupId: this.joinedGroupId,
        type: InteractionTypes.StopBroadcastLive,
        data: JSON.stringify({ sid }),
        receiverIdList,
      };
      this.sendMessage(sid, resolve, reject, options);
    });
  }

  // 老师广播预录制的音频
  broadcastAudio(
    receiverIdList: string[],
    data: BasicMap<any>,
    sid: string
  ): Promise<any> {
    reporter.broadcastAudio(data, sid);
    this.clearTimerByType(InteractionTypes.BroadcastAudio);
    this.clearTimerByType(InteractionTypes.StopBroadcastAudio);
    return new Promise((resolve, reject) => {
      const options = {
        groupId: this.joinedGroupId,
        type: InteractionTypes.BroadcastAudio,
        data: JSON.stringify({ ...data, sid }),
        receiverIdList,
        skipAudit: true,
      };
      this.sendMessage(sid, resolve, reject, options);
    });
  }

  stopBroadcastAudio(receiverIdList: string[]): Promise<any> {
    const sid = uuidv4();
    reporter.stopBroadcastAudio(sid);
    this.clearTimerByType(InteractionTypes.BroadcastAudio);
    this.clearTimerByType(InteractionTypes.StopBroadcastAudio);
    return new Promise((resolve, reject) => {
      const options = {
        groupId: this.joinedGroupId,
        type: InteractionTypes.StopBroadcastAudio,
        data: JSON.stringify({ sid }),
        receiverIdList,
        skipAudit: true,
      };
      this.sendMessage(sid, resolve, reject, options);
    });
  }

  // 发全消息组的消息，非某部分人，考生不用反馈
  private sendMessageToGroup(
    sid: string,
    options: ImSendMessageToGroupReq,
    retryNum = 3
  ) {
    let num = 1;
    const type: InteractionTypes = options.type;
    // 默认IM服务会对内容检测，有可能误触发错误，所以统一加上跳过检测字段
    options.skipAudit = true;

    if (retryNum > 1) {
      let timer = window.setInterval(() => {
        options.groupId &&
          this.engine
            .getMessageManager()
            ?.sendGroupMessage(options)
            .catch((err: any) => {
              this.reportSendMessageError(options, err);
            });
        num += 1;
        if (num >= retryNum) {
          window.clearInterval(timer);
        }
      }, INTERVAL);
    }

    options.groupId &&
    this.engine
      .getMessageManager()
      ?.sendGroupMessage(options)
      .catch((err: any) => {
        this.reportSendMessageError(options, err);
      });
    this.sendRCMessage({ sid, type }, undefined, false);
  }

  // 通知结束考试，全局定时发送3次，跟其他消息不一样
  endRoom() {
    // 停止其他信令的定时器
    this.clearTimerByType(InteractionTypes.BroadcastAudio);
    this.clearTimerByType(InteractionTypes.StopBroadcastAudio);
    this.clearTimerByType(InteractionTypes.StartBroadcastLive);
    this.clearTimerByType(InteractionTypes.StopBroadcastLive);
    this.clearTimerByType(InteractionTypes.StartCalling);
    this.clearTimerByType(InteractionTypes.EndCalling);

    const sid = uuidv4();
    const options = {
      groupId: this.joinedGroupId,
      type: InteractionTypes.EndRoom,
      data: JSON.stringify({ sid }),
    };

    this.sendMessageToGroup(sid, options);
  }

  // 广播通知考生重置状态
  public resetStatus() {
    const sid = uuidv4();
    const options = {
      groupId: this.joinedGroupId,
      type: InteractionTypes.Reset,
      data: JSON.stringify({ sid }),
    };

    this.sendMessageToGroup(sid, options, 1);
  }

  private reportSendMessageError(options: any, err: any) {
    let params: any = {};
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
