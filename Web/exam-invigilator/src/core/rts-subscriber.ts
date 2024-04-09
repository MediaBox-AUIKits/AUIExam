import { ERtsEndType, ERtsExceptionType, reporter } from "../utils/Reporter";
import SdpUtil from "../utils/SdpUtil";
import { runGC } from "../utils/common";
import { ERtsType, IProps as IBaseProps, RtsBase } from "./rts-base";
import AudioChannelPlayer from "./AudioChannelPlayer";
import type { RemoteStream } from "aliyun-rts-sdk";

/**
 * 重试超过次数对应的场景
 * - 信令（应该提示用户，更换设备、网络，或联系管理员）
 * - 媒体超时（不需要提示用户，静默失败）
 */
export enum ERetryType {
  Signal = "signal",
  Media = "media",
}

type IProps = {
  /**
   * 自动重试的时候触发
   */
  onRetry: () => any;

  /**
   * 重试已超过次数，不再重试
   */
  onRetryReachLimit: (type: ERetryType) => any;

  /**
   * 流地址的推流状态，用于埋点区分异常
   * 0: 从未推过流，1：推流中 2：停止推流
   */
  streamPublishStatus?: number;

  /**
   * 1v1连麦场景下，只取其中一个声道，用于消除考生端推过来的监考的声音（防止监考听到自己的声音）
   */
  playSingleChannel?: boolean;

  /**
   * 是否拉流之后自动开启混音（小流需要点击unmute再混音，大流拉到流直接混音）
   */
  autoMix?: boolean;
} & IBaseProps;

// 自动重试，timeout 也要重试，ended 也要重试；只要不收到结束的消息，就一直重试
export class RtsSubscriber extends RtsBase {
  static MAX_RETRY = 3;
  static MAX_TIMEOUT_RETRY = 3;
  static RETRY_INTERVAL = 5 * 1000;

  private _pullUrl?: string;
  private _props?: IProps;
  private _streamPublishStatus?: number;
  private _audioChannelPlayer?: AudioChannelPlayer;
  private _hiddenEl?: HTMLVideoElement
  private _remoteStream?: RemoteStream;

  constructor(props: IProps) {
    super({
      ...props,
      type: ERtsType.Subscribe,
    });
    this._props = props;
    this._streamPublishStatus = props.streamPublishStatus;
    this.bindEvents();
  }

  public setStreamPublishStatus(status: number) {
    this._streamPublishStatus = status;
  }

  public subscribe(
    pullUrl: string,
    renderEl: HTMLVideoElement
  ) {
    console.log("开始拉流：", pullUrl);

    this.disposeAudioChannelPlayer();
    this._pullUrl = pullUrl;
    return new Promise((resolve, reject) => {
      if (!this._rtsClient) return reject("no rtsClient");

      this._rtsClient
        .subscribe(pullUrl, {
          mediaTimeout: 8000,
          retryTimes: RtsSubscriber.MAX_RETRY,
          retryInterval: RtsSubscriber.RETRY_INTERVAL,
          offerSdpHook: (sdp) => {
            if (this._props?.playSingleChannel) {
              const sdpUtil = new SdpUtil(sdp);
              sdpUtil.addStereo();
              return sdpUtil.sdp;
            }
            return sdp;
          }
        })
        .then((remoteStream) => {
          reporter.playChannelMode(this._props?.playSingleChannel ? 'single' : 'default');
          if (!this._props?.playSingleChannel) {
            remoteStream.play(renderEl);
          } else {
            this._remoteStream = remoteStream;

            this._hiddenEl = this._hiddenEl || document.createElement('video');
            this._hiddenEl.muted = true;

            renderEl.oncanplay = () => { renderEl.play() };

            /**
             * 自动重试不会进入到这里，所以要监听每次变化重新执行
             * RTS 自动重试的逻辑：RemoteStream 不会变（id 不变），但是它的 mediaStream 是新构造的
             */
            // 每次自动重试成功，触发 canplay，手动刷新 renderEl 的流
            this._hiddenEl.addEventListener('canplay', () => {
              const curVideoTrack = (renderEl.srcObject as MediaStream)?.getVideoTracks()[0];
              const newVideoTrack = (this._hiddenEl?.srcObject as MediaStream)?.getVideoTracks()[0];
              // 同一个流可能多次触发 canplay
              if (curVideoTrack?.id === newVideoTrack?.id) return;
              renderEl.srcObject = new MediaStream([remoteStream.videoTrack!]);

              // 小流需要点击 unmute 才能混音，大流直接混音（因为大流由用户操作直接触发）
              if (this._props?.autoMix) {
                this.startMix();
              }
            })

            // RTS 每次重试会自动替换 remoteStream 中的 mediaStream，所以这里只需要 play 一次
            remoteStream.play(this._hiddenEl); 
          }
          resolve("");
        })
        .catch((err) => {
          const signalError = err?.errorCode === 10205;
          this._props?.onRetryReachLimit &&
            this._props?.onRetryReachLimit(signalError ? ERetryType.Signal : ERetryType.Media);
          reporter.subscribeException({
            url: this._pullUrl || "",
            errorCode: ERtsExceptionType.RetryReachLimit,
            retryCount: RtsSubscriber.MAX_RETRY,
            traceId: this._traceId,
            streamPublishStatus: this._streamPublishStatus,
          });
          // 订阅失败
          reject(err);
        });
    });
  }

  public unSubscribe() {
    this._rtsClient?.unsubscribe();

    this.disposeAudioChannelPlayer();
    if (this._hiddenEl) {
      this._hiddenEl.pause();
      this._hiddenEl.srcObject = null;
      this._hiddenEl.load();
      this._hiddenEl = undefined;
    }
  }

  public resumeAudioContext() {
    // 首次点击的时候再开始混流，防止自动播放失败导致的无声问题（Chrome下无用户操作直接创建的 AC 可能导致后续无法播放声音）
    if (this._props?.playSingleChannel && !this._audioChannelPlayer) {
      this.startMix();
    }
    this._audioChannelPlayer?.play();
  }

  public suspendAudioContext() {
    this._audioChannelPlayer?.suspend();
  }

  public dispose() {
    super.dispose();
    this.unSubscribe();
    this._pullUrl = undefined;
    this._props = undefined;
    this._remoteStream = undefined;
  }

  private startMix() {
    if (!this._remoteStream) return;
    this.initAudioChannelPlayer()
      .load(this._remoteStream!.mediaStream!);
  }

  private initAudioChannelPlayer() {
    this.disposeAudioChannelPlayer();
    this._audioChannelPlayer = new AudioChannelPlayer();
    return this._audioChannelPlayer;
  }

  private disposeAudioChannelPlayer() {
    if (this._audioChannelPlayer) {
      this._audioChannelPlayer.dispose();
      this._audioChannelPlayer = undefined;
    }
  }

  protected bindEvents() {
    super.bindEvents();

    this._rtsClient.on("onPlayEvent", (data) => {
      switch (data.event) {
        case "media":
          break;
        case "timeout":
        case "ended":
          if (!this._isConnected) return; // 这里需要防止超时重试比 UDP 失败发生早，导致 UDP 失败无法触发

          if (data.event === "timeout") {
            reporter.subscribeEnd({
              url: this._pullUrl || "",
              errorCode: ERtsEndType.Timeout,
            });
          }
          break;
      }
    });

    this._rtsClient.on('reconnect', (evt) => {
      if (evt.type !== 'sub') return;
      console.log('rts 自动重试', evt)
      this.disposeAudioChannelPlayer(); // 每次自动重试销毁 audioMixer，下次重新绑定新的 mediaStream
      this._props?.onRetry && this._props?.onRetry();
    });

    this._rtsClient.on('onError', (err) => {
      // 忽略自动播放失败
      if(err.errorCode === 10201) return;
      // 重试超过次数，会把最后一次错误抛出来(自动重试过程中不会抛错误)
      const reason = err.errorCode === 10205 ? ERetryType.Signal : ERetryType.Media;
      this._props?.onRetryReachLimit && this._props?.onRetryReachLimit(reason);
      reporter.subscribeException({
        url: this._pullUrl || "",
        errorCode: ERtsExceptionType.RetryReachLimit,
        retryCount: RtsSubscriber.MAX_RETRY,
        traceId: this._traceId,
        streamPublishStatus: this._streamPublishStatus,
      });

      if (err.message?.indexOf('so many') > -1) {
        // https://bugs.chromium.org/p/chromium/issues/detail?id=825576#c24
        runGC();
        reporter.runGC({ from: 'err-event' });
      }
    })
  }
}
