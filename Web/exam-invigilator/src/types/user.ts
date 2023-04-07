export enum UserRoleEnum {
  invigilator = 0, // 监考
  inspector = 1, // 巡考
}

export enum UserPublishStatus {
  init = 0,
  start,
  stop,
}

export enum UserInteractiveStatus {
  EnterRoom = "EnterRoom",
  PubFail = "PubFail",
  PubSuccess = "PubSuccess",
}

export interface IUser {
  id: string;
  name: string;
  publishStatus: UserPublishStatus; // 推流状态
  rtcPushUrl: string; // 推流地址
  rtcPullUrl: string; // 大流拉流地址
  rtsPullUrl: string; // 小流拉流地址
  muted: boolean;
  interactiveStatus?: UserInteractiveStatus; // 考生通过IM通知老师的状态
}

export enum SubscribeStatusEnum {
  init = "init",
  canplay = "canplay",
  loading = "loading",
  fail = "fail",
}
