export enum UserPublishStatus {
  init = 0,
  start,
  stop,
}

export interface IUser {
  id: string;
  name: string;
  publishStatus: UserPublishStatus; // 推流状态
  userStatus: string; // 0: 有进行中的考场 1: 无进行中的考场
  rtcPushUrl: string; // 推流地址
  rtcPullUrl: string; // 大流拉流地址
  rtsPullUrl: string; // 小流拉流地址
  pcRtcPushUrl: string; // pc推流地址
  pcRtcPullUrl: string; // pc大流拉流地址
  pcRtsPullUrl: string; // pc小流拉流地址
  // muted: boolean;
}

export enum SubscribeVideoStatusEnum {
  init = "init",
  canplay = "canplay",
  loading = "loading",
  fail = "fail",
}
