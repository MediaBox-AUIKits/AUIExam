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
  pcRtcPushUrl: string; // pc推流地址
  pcRtcPullUrl: string; // pc大流拉流地址
  pcRtsPullUrl: string; // pc小流拉流地址
  isMainMonitor: boolean; // 是否当前显示主机位
  muted: boolean;
  rotateDegree: number; // 旋转角度
  interactiveStatus?: UserInteractiveStatus; // 考生通过IM通知老师的状态
}

export enum SubscribeStatusEnum {
  init = "init",
  canplay = "canplay",
  loading = "loading",
  fail = "fail",
}
