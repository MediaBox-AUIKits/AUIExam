import { ERtsEndType, ERtsExceptionType, reporter } from "../utils/Reporter";
import SdpUtil from "../utils/SdpUtil";
import { ERtsType, IProps as IBaseProps, RtsBase } from "./rts-base";
import AudioChannelPlayer from "./AudioChannelPlayer";

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
  private _hiddenEl?: HTMLVideoElement;
  private _lastStreamId?: string;

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
            this._hiddenEl = this._hiddenEl || document.createElement('video');
            this._hiddenEl.muted = true;

            // 需要确保源流可以播放，再赋值，否则会导致外层 detectCanplay 误判（音频轨道会触发 timeupdate）
            this._hiddenEl.addEventListener('canplay', () => {
              if (!this._hiddenEl) return;

              // 中途自动重试，不会触发 sub.then，需要感知到流变化了，并重新给 renderEl 赋值
              if (this._lastStreamId !== remoteStream.mediaStream?.id) {
                  this._lastStreamId = remoteStream.mediaStream?.id;
                  this.initAudioChannelPlayer();
                  // @ts-ignore
                  const stream = this._audioChannelPlayer.load(remoteStream.mediaStream);
                  // construct a new stream to play
                  const playStream = new MediaStream([remoteStream.videoTrack!, stream.getAudioTracks()[0]]);
                  renderEl.srcObject = playStream;
                  renderEl.play();
              }
            });

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

    if (this._hiddenEl) {
      this._hiddenEl.pause();
      this._hiddenEl.srcObject = null;
      this._hiddenEl.load();
      this._hiddenEl = undefined;
    }

    if (this._audioChannelPlayer) {
      this._audioChannelPlayer.dispose();
      this._audioChannelPlayer = undefined;
    }
  }

  public dispose() {
    super.dispose();
    this.unSubscribe();
    this._lastStreamId = undefined;
    this._pullUrl = undefined;
    this._props = undefined;
  }

  private initAudioChannelPlayer() {
    if (this._audioChannelPlayer) {
      this._audioChannelPlayer.dispose();
    }
    this._audioChannelPlayer = new AudioChannelPlayer();
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
      this._props?.onRetry && this._props?.onRetry();
    });

    this._rtsClient.on('onError', (err) => {
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
    })
  }
}
