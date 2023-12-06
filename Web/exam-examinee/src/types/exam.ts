export enum ExamStatusEnum {
  not_start = 0,
  examing = 1,
  end = 2,
}

export interface IAudioFile {
  id: string;
  name: string;
  url: string; // cdn 地址
  ossUrl?: string; // oss 地址
}

export interface IRadioFile extends IAudioFile {
  startTime: string; // 广播开始时间
}

export interface IVideoProfileData {
  width: number; // 宽
  height: number; // 高
  frameRate: number; // 帧率
  maxBitrate: number; // 最大码率
}

export interface IVideoProfile {
  name: string;
  data: IVideoProfileData;
}

export interface IExam {
  id: string; // 考试ID
  name: string; // 考试名称
  startTime: string;
  endTime: string;
  radioInfo: IRadioFile[]; // 自动广播音频文件
  audioInfo: IAudioFile[]; // 需要老师手动触发播放的文件
  videoProfile?: IVideoProfile; // 动态下发的视频 VideoProfile 数据
}

export enum PublishStatus {
  init = "init",
  success = "success",
  fail = "fail",
  nodata = "nodata",
}

export enum SubscribeStatus {
  disconnect = "disconnect",
  connecting = "connecting",
  success = "success",
  fail = "fail",
}
