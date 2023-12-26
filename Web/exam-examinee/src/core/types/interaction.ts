export enum InteractionV2EventNames {
  RecvC2cMessage = 'recvc2cmessage',
  RecvGroupMessage = 'recvgroupmessage',
}

type ImUser = Optional<_ImUser, 'userNick' | 'userAvatar' | 'userExtension'>;

interface _ImUser {
  /**
   * @param user_id 用户id
   */
  userId: string;
  /**
   * @param user_nick 用户昵称
   */
  userNick: string;
  /**
   * @param user_avatar 用户头像地址
   */
  userAvatar: string;
  /**
   * @param user_extension 用户扩展信息
   */
  userExtension: string;
}

export interface ImMessage {
  /**
   * @param group_id 话题id,聊天插件实例id
   */
  groupId?: string;
  /**
   * @param message_id 消息id
   */
  messageId: string;
  /**
   *@param type 消息类型。系统消息小于10000
    */
  type: number;
  /**
   *@param sender 发送者
    */
  sender?: ImUser;
  /**
   **@param data 消息内容
    */
  data: string;
  /**
   *@param seqnum 消息顺序号
    */
  seqnum: number;
  /**
   *@param timestamp 消息发送时间
    */
  timestamp: number;
  /**
   *@param level 消息分级
    **/
  level: ImMessageLevel;
}

enum ImMessageLevel {
  NORMAL = 0,
  HIGH = 1
}

export type ImSendMessageToGroupReq = Optional<_ImSendMessageToGroupReq, 'skipMuteCheck' | 'skipAudit' | 'level'>;

interface _ImSendMessageToGroupReq {
    /**
     * @param group_id 话题id,聊天插件实例id
     */
    groupId: string;
    /**
     * @param type 消息类型，小于等于10000位系统消息，大于10000位自定义消息
     */
    type: number;
    /**
     * @param data 消息体
     */
    data: string;
    /**
     * @param skip_mute_check 跳过禁言检测，true:忽略被禁言用户，还可发消息；false：当被禁言时，消息无法发送，默认为false，即为不跳过禁言检测。
     */
    skipMuteCheck: boolean;
    /**
     * @param skip_audit 跳过安全审核，true:发送的消息不经过阿里云安全审核服务审核；false：发送的消息经过阿里云安全审核服务审核，审核失败则不发送；
     */
    skipAudit: boolean;
    /**
     * @param level 消息分级
     */
    level: ImMessageLevel;
}

export type ImSendMessageToUserReq = Optional<_ImSendMessageToUserReq, 'skipAudit' | 'level'>;

interface _ImSendMessageToUserReq {
    /**
     * 消息类型。系统消息小于10000
     */
    type: number;
    /**
     * 消息体
     */
    data: string;
    /**
     * 接收者用户
     */
    receiverId: string;
    /**
     * 跳过安全审核，true:发送的消息不经过阿里云安全审核服务审核；false：发送的消息经过阿里云安全审核服务审核，审核失败则不发送；
     */
    skipAudit: boolean;
    /**
     * 消息分级
     */
    level: ImMessageLevel;
}

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
