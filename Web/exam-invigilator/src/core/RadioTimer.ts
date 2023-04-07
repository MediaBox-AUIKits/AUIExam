import { IRadioFile } from "./types";
import Emitter from "./Emitter";
import { reporter } from "../utils/Reporter";

export enum RadioStatusEnum {
  not_start = 0,
  playing = 1,
  ended = 2,
}

export interface IRadioItem extends IRadioFile {
  _status: RadioStatusEnum;
  status: RadioStatusEnum;
}

class RadioTimer extends Emitter {
  private list: IRadioItem[] = [];
  private waitingList: IRadioItem[] = [];
  private playingItem?: IRadioItem;
  private audioEl?: HTMLAudioElement | null;
  private timer?: number;

  constructor() {
    super();
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    this.audioEl.controls = false;
    this.addAudioEvents();
  }

  private addAudioEvents() {
    this.audioEl?.addEventListener("ended", () => {
      if (this.playingItem) {
        this.playingItem.status = RadioStatusEnum.ended;
      }
      this.emit("ended", this.playingItem);
    });
  }

  public init(list: IRadioFile[]) {
    const now = new Date();
    const that = this;
    this.list = [];
    this.waitingList = [];
    this.playingItem = undefined;
    this.audioEl?.pause();
    window.clearTimeout(this.timer);

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

    // 初始化后通知一次 list 变更
    this.emit("listChange", this.list);

    if (this.waitingList.length) {
      this.startTimer();
    }
  }

  private startTimer() {
    this.timer = window.setInterval(() => {
      this.checkTime();
    }, 5000);
  }

  private checkTime() {
    const item = this.waitingList[0];
    if (item && item.startTime && item.url) {
      const now = new Date().valueOf();
      const date = new Date(item.startTime).valueOf();
      const diff = Math.abs(date - now);
      if (this.audioEl && diff < 5000) {
        reporter.timerRadioPlay({ ...item, _status: undefined });
        // 误差范围内开始播放
        this.audioEl.currentTime = 0;
        this.audioEl.src = item.url;
        this.audioEl.load();

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

  public getList() {
    return this.list;
  }

  public destroy() {
    window.clearTimeout(this.timer);
    this.waitingList.splice(0, this.waitingList.length);
    this.audioEl = null;
    this.removeAllEvents();
  }
}

export default RadioTimer;
