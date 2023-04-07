export interface IUser {
  id: string;
  name: string;
  userStatus: string; // 0: 有进行中的考场 1: 无进行中的考场
  rtcPushUrl: string; // 推流地址
  rtcPullUrl: string; // 大流拉流地址
  rtsPullUrl: string; // 小流拉流地址
}
