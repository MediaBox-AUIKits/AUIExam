import { AudioContext, GainNode, AudioBufferSourceNode, MediaStreamAudioSourceNode, MediaStreamAudioDestinationNode } from "standardized-audio-context";
import { AudioPlayerEvents } from "@/core";
import { reporter } from "@/utils/Reporter";
import { getSystemType } from '@/utils/common';
import { audioManager } from './ResourceManager';
import Emitter from "./Emitter";

interface ILoadParams {
  type?: "URL" | "STREAM";
  value?: string | MediaStream;
  secondUrl?: string; // 用于第一个音频地址加载失败后的重试
  onLoaded?: () => any;
}

// iOS 要解决音量小的问题，所以设置一个大值
const defaultVolume = getSystemType() === 'iOS' ? 8 : 2;

class AudioPlayer extends Emitter {
  static VOLUME = defaultVolume;

  private _context?: AudioContext;
  private _gainNode?: GainNode<AudioContext>;
  private _sourceNode?: AudioBufferSourceNode<AudioContext> | MediaStreamAudioSourceNode<AudioContext>;
  private _streamDestNode?:MediaStreamAudioDestinationNode<AudioContext>;

  constructor() {
    super();
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
      audioManager
        .get(url)
        .then((res) => {
          this._context?.decodeAudioData(
            res,
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
    this._streamDestNode = undefined;
  }

  dispose() {
    this.stop();
    this.clear();
    this.removeAllEvents();
  }

  private log(...rest: any[]) {
    console.log("[AudioPlayer]", ...rest);
  }

  private initContext() {
    if (this._context) return;

    const context = new AudioContext();
    const gainNode = context.createGain();
    gainNode.gain.value = AudioPlayer.VOLUME;
    gainNode.connect(context.destination);

    this._context = context;
    this._gainNode = gainNode;

    // copy 一个 stream 给外面，用于音频混流，从而云端可以同时录制考生的声音+广播声音
    this._streamDestNode = context.createMediaStreamDestination();
    this.emit(AudioPlayerEvents.Stream, this._streamDestNode.stream);
  }

  private createSourceFromBuffer(buffer: AudioBuffer, originSrc: string) {
    const source = this._context?.createBufferSource();
    if (!source || !this._gainNode) return;
    source.buffer = buffer;
    source.connect(this._gainNode);
    if (this._streamDestNode) {
      // 同步输出一路原始音量的流给 stream
      source.connect(this._streamDestNode);
    }

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
    if (this._streamDestNode) {
      // 同步输出一路原始音量的流给 stream
      source.connect(this._streamDestNode);
    }
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
