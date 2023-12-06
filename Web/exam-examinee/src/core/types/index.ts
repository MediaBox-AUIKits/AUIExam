export * from "./events";

// 上传 oss 的身份数据定义
export interface ISTSData {
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  region: string;
  stsToken: string;
  expiration?: string;
}

export interface IAudioFile {
  id: string;
  name: string;
  url: string; // cdn 地址
  ossUrl?: string; // oss 地址
}

// 定时广播音频定义
export interface IRadioFile extends IAudioFile {
  startTime: string; // 广播开始时间
}

export interface BasicMap<U> {
  [index: string]: U;
}
