import { AudioPlayerEvents } from "@/core";
import { reporter } from "@/utils/Reporter";
import axios, { AxiosInstance } from "axios";
import Emitter from "./Emitter";

interface ILoadParams {
  type?: "URL" | "STREAM";
  value?: string | MediaStream;
  secondUrl?: string; // 用于第一个音频地址加载失败后的重试
  onLoaded?: () => any;
}

class AudioPlayer extends Emitter {
  static VOLUME = 8;

  private _context?: AudioContext;
  private _gainNode?: GainNode;
  private _sourceNode?: AudioBufferSourceNode | MediaStreamAudioSourceNode;
  private _request?: AxiosInstance;

  constructor() {
    super();

    this._request = this.initRequest();
  }

  // 更新静态变量
  static updateVolume(val: number) {
    if (
      typeof val !== 'number' ||
      isNaN(val) ||
      val < 0
    ) {
      return;
    }
    
    AudioPlayer.VOLUME = val;
  }

  set volume(val: number) {
    if (!this._gainNode) return;
    this._gainNode.gain.value = val;
  }

  load(params: ILoadParams = {}) {
    this.initContext();
    switch (params.type) {
      case "URL":
        if (typeof params.value !== "string") {
          console.warn("[AudioPlayer] url should be string");
          return;
        }

        this.fetchAudio(params.value)
          .then(() => {})
          .catch(() => {
            // 第一个失败后尝试第二个
            if (params.secondUrl) {
              this.fetchAudio(params.secondUrl);
            }
          });
        return;
      case "STREAM":
        if (!(params.value instanceof MediaStream)) {
          console.warn("[AudioPlayer] value should be MediaStream");
          return;
        }
        this.createSourceFromStream(params.value);
        return;
      default:
        return;
    }
  }

  private fetchAudio(url: string) {
    return new Promise((resolve, reject) => {
      const request = this._request;
      if (!request) {
        reject();
        return;
      }
      request
        .get(url)
        .then((res) => {
          this._context?.decodeAudioData(
            res.data,
            (buffer) => {
              console.log("decode response");
              this.createSourceFromBuffer(buffer, url);
              resolve(true);
            },
            (err) => {
              reporter.audioPlayFail({
                src: url,
                event: "decode",
                msg: err.message,
              });
              reject();
            }
          );
        })
        .catch((err) => {
          this.log("fetch error", err);
          reporter.audioPlayFail({
            src: url,
            event: "fetch",
            msg: err.message,
          });
          reject();
        });
    });
  }

  play() {
    return this._context?.resume();
  }

  pause() {
    return this._context?.suspend();
  }

  stop() {
    if (!this._sourceNode) return;
    if ("stop" in this._sourceNode) {
      return this._sourceNode?.stop();
    }
  }

  clear() {
    this._sourceNode?.disconnect();
    this._context?.close();
    this._sourceNode = undefined;
    this._context = undefined;
    this._gainNode = undefined;
  }

  dispose() {
    this.stop();
    this.clear();
    this.removeAllEvents();
    this._request = undefined;
  }

  private log(...rest: any[]) {
    console.log("[AudioPlayer]", ...rest);
  }

  private initRequest() {
    return axios.create({
      responseType: "arraybuffer",
      timeout: 10 * 1000,
    });
  }

  private initContext() {
    if (this._context) return;

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const gainNode = context.createGain();
    gainNode.gain.value = AudioPlayer.VOLUME;
    gainNode.connect(context.destination);
    // console.log(context.state); // running

    // context.addEventListener('statechange', () => {
    //   const state = context.state;
    //   console.log('======== statechange ========', state);
    //   switch(state) {
    //     case 'running':
    //       break;
    //     case 'suspended':
    //       break;
    //     case 'closed':
    //       break;
    //     default:
    //   }
    // })

    this._context = context;
    this._gainNode = gainNode;
  }

  private createSourceFromBuffer(buffer: AudioBuffer, originSrc: string) {
    const source = this._context?.createBufferSource();
    if (!source || !this._gainNode) return;
    source.buffer = buffer;
    source.connect(this._gainNode);

    source.addEventListener("ended", () => {
      console.log("audio play ended");
      this.clear();
      this.emit(AudioPlayerEvents.Ended, {});
    });

    source.start();
    this.emit(AudioPlayerEvents.Playing, {});
    reporter.audioPlaying({ src: originSrc });
    this._sourceNode = source;
    this.log("source start");
  }

  private createSourceFromStream(stream: MediaStream) {
    const source = this._context?.createMediaStreamSource(stream);
    if (!source || !this._gainNode) return;
    source.connect(this._gainNode);
    this.emit(AudioPlayerEvents.Playing, {});
    this._sourceNode = source;
  }
}

// In iOS Safari, when a user leaves the page (e.g. switches tabs, minimizes the browser, or turns off the screen) the audio context's state changes to "interrupted" and needs to be resumed. For example:
// function play() {
//   if (audioCtx.state === "interrupted") {
//     audioCtx.resume().then(() => play());
//     return;
//   }
//   // rest of the play() function
// }

export default AudioPlayer;
