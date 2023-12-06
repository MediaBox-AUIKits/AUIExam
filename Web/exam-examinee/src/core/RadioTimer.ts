import { reporter } from "@/utils/Reporter";
import AudioPlayer from "./AudioPlayer";
import Emitter from "./Emitter";
import { AudioPlayerEvents, IRadioFile } from "./types";

interface IRadioItem extends IRadioFile {
  _status: number;
  status: number;
}

enum RadioStatusEnum {
  not_start = 0,
  playing = 1,
  ended = 2,
}

class RadioTimer extends Emitter {
  private list: IRadioItem[] = [];
  private waitingList: IRadioItem[] = [];
  private playingItem?: IRadioItem;
  private timer?: number;
  private audioPlayer?: AudioPlayer;

  constructor() {
    super();

    /**
     * iOS 端使用 AudioContext，原因：
     * - 解决音量过小问题
     * 
     * Android 端也使用 AudioContext，原因：
     * - 方便直接使用音量键调节音量（不需要单独调节媒体音量）
     * - 解决偶现的音量小的问题
     * - 钉钉容器（chrome100版本）HtmlAudioElement.captureStream() 捕获的流无法播放，导致无法实现广播声音的混流 + 云端录制
     */
    this.audioPlayer = new AudioPlayer();
    this.audioPlayer.on(AudioPlayerEvents.Ended, () => {
      this.handleEnded();
    });
    this.audioPlayer.on(AudioPlayerEvents.Playing, () => {
      this.emit("playing", this.playingItem);
    });
    this.audioPlayer.on(AudioPlayerEvents.Stream, (stream: MediaStream) => {
      this.emit('stream', stream);
    })
  }

  // 结束、错误都执行
  private handleEnded() {
    if (this.playingItem) {
      this.playingItem.status = RadioStatusEnum.ended;
    }
    this.emit("ended", this.playingItem);
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

  private checkTime() {
    // // FIXME:
    // // @ts-ignore
    // if (!window.mocktimer)  {
    //   // @ts-ignore
    //   window.mocktimer = 1;

    //   setTimeout(() => {
    //     const URL = 'https://ice-pub-media.myalicdn.com/vod-demo/mp3/%E8%80%83%E8%AF%95%E7%BB%93%E6%9D%9F.mp3';
    //     this.audioPlayer?.load({
    //       type: "URL",
    //       value: URL,
    //       secondUrl: URL,
    //     });
    //     console.log('start play 定时广播...')
    //   }, 5000) // 5s 后模拟定时广播
    // }

    // return
    const item = this.waitingList[0];

    if (item && item.startTime && item.url) {
      const now = new Date().valueOf();
      const date = new Date(item.startTime).valueOf();
      const diff = Math.abs(date - now);
      if (this.audioPlayer && diff < 5000) {
        reporter.timerRadioPlay({ ...item, _status: undefined });
        // 误差范围内开始播放
        this.audioPlayer?.load({
          type: "URL",
          value: item.url,
          secondUrl: item.ossUrl,
        });

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

  public destroy() {
    window.clearTimeout(this.timer);
    this.waitingList.splice(0, this.waitingList.length);
    this.removeAllEvents();
    this.audioPlayer?.dispose();
    this.audioPlayer = undefined;
  }
}

export default RadioTimer;
