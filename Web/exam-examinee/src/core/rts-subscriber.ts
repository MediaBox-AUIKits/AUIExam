import type { PlayEvent } from "aliyun-rts-sdk/dist/core/event/playevent";
import AudioPlayer from "./AudioPlayer";
import { ERtsEndType, ERtsExceptionType, reporter } from "@/utils/Reporter";
import { ERtsType, IProps as IBaseProps, RtsBase } from "./rts-base";

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
  private _renderEl?: HTMLVideoElement | AudioPlayer;
  private _props?: IProps;

  constructor(props: IProps) {
    super({
      ...props,
      type: ERtsType.Subscribe,
    });
    this._props = props;
    this.bindEvents();
  }

  public subscribe(
    pullUrl: string,
    renderEl: HTMLVideoElement | AudioPlayer,
    _resolve?: any,
    _reject?: any
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
        .subscribe(pullUrl)
        .then((remoteStream) => {
          // mediaElement是媒体标签audio或video
          if (renderEl instanceof AudioPlayer) {
            renderEl.load({
              type: "STREAM",
              // @ts-ignore-next-line
              value: remoteStream.mediastream,
            });
          } else {
            remoteStream.play(renderEl);
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
  }

  public dispose() {
    super.dispose();
    console.log("subscriber dispose");

    this.unSubscribe();
    this._retryCount = 0;
    this._timeoutRetryCount = 0;
    this._pullUrl = undefined;

    if (this._renderEl instanceof AudioPlayer) {
      this._renderEl.dispose();
    }

    this._renderEl = undefined;
    this._props = undefined;
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
