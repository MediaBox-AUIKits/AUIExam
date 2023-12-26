export * from "./events";
export * from "./interaction";

export interface IAudioFile {
  id: string;
  name: string;
  url: string;
}

export interface IRadioFile extends IAudioFile {
  startTime: string; // 广播开始时间
}

export interface BasicMap<U> {
  [index: string]: U;
}
