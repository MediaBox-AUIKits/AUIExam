import { getSystemType } from "@/utils/common";
import { reporter } from "@/utils/Reporter";
import AudioPlayer from "./AudioPlayer";
import Emitter from "./Emitter";
import { AudioPlayerEvents, IRadioFile } from "./types";

const isIOS = getSystemType() === "iOS";

interface IRadioItem extends IRadioFile {
  _status: number;
  status: number;
}

enum RadioStatusEnum {
  not_start = 0,
  playing = 1,
  ended = 2,
}

const LoadTimeout = 10000;

class RadioTimer extends Emitter {
  private list: IRadioItem[] = [];
  private waitingList: IRadioItem[] = [];
  private playingItem?: IRadioItem;
  private audioEl?: HTMLAudioElement | null;
  private timer?: number;
  private loadTimer?: number; // 用于判断 10s 内是否加载成功
  private currentSecondUrl?: string; // 储存当前音频可用的第二用地址

  private audioPlayer?: AudioPlayer;

  constructor() {
    super();

    if (isIOS) {
      this.audioPlayer = new AudioPlayer();
      this.audioPlayer.on(AudioPlayerEvents.Ended, () => {
        this.handleEnded();
      });
      this.audioPlayer.on(AudioPlayerEvents.Playing, () => {
        this.emit("playing", this.playingItem);
      });
    } else {
      this.audioEl = document.createElement("audio");
      this.audioEl.autoplay = true;
      this.audioEl.controls = false;
      this.addAudioEvents();
    }
  }

  // 结束、错误都执行
  private handleEnded() {
    if (this.playingItem) {
      this.playingItem.status = RadioStatusEnum.ended;
    }
    this.emit("ended", this.playingItem);
  }

  private addAudioEvents() {
    const el = this.audioEl;
    if (!el) {
      return;
    }
    el.addEventListener("ended", () => {
      this.handleEnded();
    });
    el.addEventListener("playing", () => {
      this.emit("playing", this.playingItem);
      reporter.audioPlaying({ src: el.src, from: "timer" });
      this.clearLoadTimer();
    });
    el.addEventListener("error", () => {
      reporter.audioPlayFail({ src: el.src, from: "timer", event: "error" });
      this.clearLoadTimer();
      this.loadSecondUrl();
    });
  }

  public init(list: IRadioFile[]) {
    const now = new Date();
    const that = this;

    try {
      const item = list[0];
      reporter.receiveDateResult({
        source: item.startTime,
        result: String(new Date(item.startTime)),
      });
    } catch (error) {}

    // 保证下顺序，时间早的在前面
    const _list = list.sort((a, b) => {
      return new Date(a.startTime).valueOf() - new Date(b.startTime).valueOf();
    });
    _list.forEach((item) => {
      // @ts-ignore
      const newItem: IRadioItem = {
        ...item,
        _status: RadioStatusEnum.not_start,
      };

      // 劫持 status 变更，并进行通知
      Object.defineProperty(newItem, "status", {
        get() {
          return this._status;
        },
        set(newValue) {
          if (this._status !== newValue) {
            this._status = newValue;
            that.emit("statusChange", newItem);
          }
        },
      });

      const date = new Date(item.startTime);
      // 广播待播放
      if (date > now) {
        this.waitingList.push(newItem);
      } else {
        newItem.status = RadioStatusEnum.ended;
      }
      this.list.push(newItem);
    });

    if (this.waitingList.length) {
      this.startTimer();
    }
  }

  private startTimer() {
    this.timer = window.setInterval(() => {
      this.checkTime();
    }, 5000);
  }

  private clearLoadTimer() {
    if (this.loadTimer) {
      window.clearTimeout(this.loadTimer);
    }
  }

  private checkTime() {
    const item = this.waitingList[0];

    if (item && item.startTime && item.url) {
      const now = new Date().valueOf();
      const date = new Date(item.startTime).valueOf();
      const diff = Math.abs(date - now);
      if ((this.audioEl || this.audioPlayer) && diff < 5000) {
        reporter.timerRadioPlay({ ...item, _status: undefined });
        // 误差范围内开始播放

        if (this.audioEl) {
          this.loadAudio(item.url, item.ossUrl);
        } else {
          this.audioPlayer?.load({
            type: "URL",
            value: item.url,
            secondUrl: item.ossUrl,
          });
        }

        // 记录，从等待播放列表中移除
        item.status = RadioStatusEnum.playing;
        this.playingItem = item;
        this.waitingList.shift();
      } else if (date < now && diff > 5000) {
        item.status = RadioStatusEnum.ended;
      }
    } else {
      // 不合法的 item 直接移除
      this.waitingList.shift();
    }

    // 如果已经是最后一个广播，则不再轮训
    if (this.waitingList.length === 0) {
      window.clearInterval(this.timer);
    }
  }

  private loadAudio(url: string, secondUrl?: string) {
    this.currentSecondUrl = secondUrl; // 记录第二可用地址，无则说明不需要
    if (!this.audioEl) {
      return;
    }
    const el = this.audioEl;

    el.currentTime = 0;
    el.src = url;
    el.load();
    this.clearLoadTimer();
    this.loadTimer = window.setTimeout(() => {
      reporter.audioPlayFail({ src: url, from: "timer", event: "timeout" });
      this.loadSecondUrl();
    }, LoadTimeout);
  }

  private loadSecondUrl() {
    if (this.currentSecondUrl) {
      this.loadAudio(this.currentSecondUrl);
    }
  }

  public destroy() {
    window.clearTimeout(this.timer);
    this.waitingList.splice(0, this.waitingList.length);
    this.removeAllEvents();
    this.audioEl?.pause();
    this.audioEl = null;
    this.audioPlayer?.dispose();
    this.audioPlayer = undefined;
  }
}

export default RadioTimer;
