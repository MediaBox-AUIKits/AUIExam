/**
 * 监控是否一直没有数据（推流异常、被电话抢占、被切后台）
 */

interface IConfig {
  timeout?: number;
  handler?: (type: EMediaType) => void;
  resumeHandler?: (type: EMediaType) => void;
}

export enum EMediaType {
  Video,
  Audio,
}

export interface IMediaData {
  video?: {
    bytesPerSecond?: number;
    rtt?: number;
  };
  audio?: {
    bytesPerSecond?: number;
  };
}

export class MediaObserver {
  static DEFAULT_TIMEOUT = 5000;

  private timeout: number;
  private handler: (type: EMediaType) => void;
  private resumeHandler: (type: EMediaType) => void;

  private videoWatchTimer: NodeJS.Timeout | null;
  private audioWatchTimer: NodeJS.Timeout | null;

  constructor(config: IConfig) {
    // 多长时间没有数据判定为超时
    this.timeout = config.timeout || MediaObserver.DEFAULT_TIMEOUT;
    this.handler = config.handler || (() => {});
    this.resumeHandler = config.resumeHandler || (() => {});

    this.videoWatchTimer = null;
    this.audioWatchTimer = null;
  }

  get actTimeout() {
    return this.timeout;
  }

  public check(eventData: IMediaData) {
    if (eventData.video) {
      this.checkVideo(eventData.video);
    }
    if (eventData.audio) {
      this.checkAudio(eventData.audio);
    }
  }

  public checkVideo(data: IMediaData["video"]) {
    if (this.hasNoData(data)) {
      if (!this.videoWatchTimer) {
        this.videoWatchTimer = setTimeout(() => {
          this.handler(EMediaType.Video);
          this.videoWatchTimer = null;
        }, this.timeout);
      }
    } else {
      if (this.videoWatchTimer) {
        this.resumeHandler(EMediaType.Video);
        clearTimeout(this.videoWatchTimer);
        this.videoWatchTimer = null;
      }
    }
  }

  public checkAudio(data: IMediaData["audio"]) {
    if (this.hasNoData(data)) {
      if (!this.audioWatchTimer) {
        this.audioWatchTimer = setTimeout(() => {
          this.handler(EMediaType.Audio);
          this.audioWatchTimer = null;
        }, this.timeout);
      }
    } else {
      if (this.audioWatchTimer) {
        this.resumeHandler(EMediaType.Audio);
        clearTimeout(this.audioWatchTimer);
        this.audioWatchTimer = null;
      }
    }
  }

  private hasNoData(data: IMediaData["video"] | IMediaData["audio"]) {
    if (!data) return true;
    return !(Number(data.bytesPerSecond) > 0);
  }

  public updateConfig(config: IConfig) {
    this.timeout = config.timeout || this.timeout;
    this.handler = config.handler || this.handler;
  }

  public reset() {
    if (this.videoWatchTimer) {
      clearTimeout(this.videoWatchTimer);
      this.videoWatchTimer = null;
    }

    if (this.audioWatchTimer) {
      clearTimeout(this.audioWatchTimer);
      this.audioWatchTimer = null;
    }
  }

  public dispose() {
    this.timeout = MediaObserver.DEFAULT_TIMEOUT;
    this.handler = () => {};
    this.reset();
  }
}
