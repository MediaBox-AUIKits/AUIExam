import type { PlayEvent } from "aliyun-rts-sdk/dist/core/event/playevent";
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

  private _retryCount = 0; // 因信令失败引起的重试
  private _retryTimer?: NodeJS.Timer;
  private _timeoutRetryCount = 0; // 因拉流超时引起的重试
  private _pullUrl?: string;
  private _renderEl?: HTMLVideoElement;
  private _props?: IProps;
  private _streamPublishStatus?: number;
  private _audioChannelPlayer?: AudioChannelPlayer;

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
    renderEl: HTMLVideoElement,
    _resolve?: any,
    _reject?: any,
  ) {
    console.log("开始拉流：", pullUrl);

    this.clearRetryTimer();

    this._pullUrl = pullUrl;
    this._renderEl = renderEl;
    return new Promise((resolve, reject) => {
      resolve = _resolve || resolve;
      reject = _reject || reject;

      if (!this._rtsClient) return reject("no rtsClient");

      this._rtsClient
        .subscribe(pullUrl, {
          mediaTimeout: 8000,
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
          // mediaElement是媒体标签audio或video
          remoteStream.play(renderEl);          

          if (this._props?.playSingleChannel) {
            renderEl.muted = true;
            this.initAudioChannelPlayer();
            // @ts-ignore
            this._audioChannelPlayer.load(remoteStream.mediastream);
          }

          this._retryCount = 0;
          resolve("");
        })
        .catch((err) => {
          if (this._retryCount < RtsSubscriber.MAX_RETRY) {
            this._retryCount++;

            this._retryTimer = setTimeout(() => {
              console.log(`Retrying ${this._retryCount}th time`);
              this.subscribe(pullUrl, renderEl, resolve, reject);
            }, RtsSubscriber.RETRY_INTERVAL);
          } else {
            this._retryCount = 0;
            this._props?.onRetryReachLimit &&
              this._props?.onRetryReachLimit(ERetryType.Signal);
            reporter.subscribeException({
              url: this._pullUrl || "",
              errorCode: ERtsExceptionType.RetryReachLimit,
              retryCount: RtsSubscriber.MAX_RETRY,
              traceId: this._traceId,
              streamPublishStatus: this._streamPublishStatus,
            });
            // 订阅失败
            reject(err);
          }
        });
    });
  }

  public unSubscribe() {
    this.clearRetryTimer();
    this._rtsClient?.unsubscribe();

    if (this._audioChannelPlayer) {
      this._audioChannelPlayer.dispose();
      this._audioChannelPlayer = undefined;
    }
  }

  public dispose() {
    super.dispose();
    console.log("subscriber dispose");

    this.unSubscribe();
    this._retryCount = 0;
    this._timeoutRetryCount = 0;
    this._pullUrl = undefined;
    this._renderEl = undefined;
    this._props = undefined;
  }

  private initAudioChannelPlayer() {
    if (this._audioChannelPlayer) {
      this._audioChannelPlayer.dispose();
    }
    this._audioChannelPlayer = new AudioChannelPlayer();
  }

  private clearRetryTimer() {
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = undefined;
    }
  }

  private retry() {
    if (this._pullUrl && this._renderEl) {
      if (this._timeoutRetryCount < RtsSubscriber.MAX_TIMEOUT_RETRY) {
        console.log(
          "订阅超时，重新订阅",
          `${this._timeoutRetryCount + 1}/ ${RtsSubscriber.MAX_TIMEOUT_RETRY}`,
          this._pullUrl
        );
        this._timeoutRetryCount++;
        this._props?.onRetry && this._props?.onRetry();
        this.subscribe(this._pullUrl, this._renderEl);
      } else {
        console.log(
          `当前已重试达到 ${RtsSubscriber.MAX_TIMEOUT_RETRY} 次，不再重试`,
          this._pullUrl
        );
        this._props?.onRetryReachLimit &&
          this._props?.onRetryReachLimit(ERetryType.Media);
        reporter.subscribeException({
          url: this._pullUrl || "",
          errorCode: ERtsExceptionType.RetryReachLimit,
          retryCount: RtsSubscriber.MAX_TIMEOUT_RETRY,
          traceId: this._traceId,
          streamPublishStatus: this._streamPublishStatus,
        });
      }
    }
  }

  private isMediaDataResume = (mediaData: PlayEvent["data"]) => {
    let resume = false;
    if (mediaData.video) {
      if (mediaData.video.bytesReceivedPerSecond > 0) {
        resume = true;
      }
    } else if (mediaData.audio) {
      if (mediaData.audio.bytesReceivedPerSecond > 0) {
        resume = true;
      }
    }
    if (resume) {
      this._timeoutRetryCount = 0;
    }
  };

  protected bindEvents() {
    super.bindEvents();

    this._rtsClient.on("onPlayEvent", (data) => {
      switch (data.event) {
        case "media":
          this.isMediaDataResume(data.data);
          break;
        case "timeout":
        case "ended":
          if (!this._isConnected) return; // 这里需要防止超时重试比 UDP 失败发生早，导致 UDP 失败无法触发
          console.log("play event", data.event);
          this.retry();

          if (data.event === "timeout") {
            reporter.subscribeEnd({
              url: this._pullUrl || "",
              errorCode: ERtsEndType.Timeout,
            });
          }
          break;
      }
    });
  }
}
