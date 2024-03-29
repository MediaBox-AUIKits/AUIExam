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
   * 获取到远端订阅流
   */
  onRemoteStream?: (remoteStream: any) => any;
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
} & IBaseProps;

// 自动重试，timeout 也要重试，ended 也要重试；只要不收到结束的消息，就一直重试
export class RtsSubscriber extends RtsBase {
  static MAX_RETRY = 6; // 多试几次，适用于监考端拔出耳麦自动切换到系统麦克风的场景
  static RETRY_INTERVAL = 5 * 1000;

  private _pullUrl?: string;
  private _renderEl?: HTMLVideoElement | AudioPlayer;
  private _props?: IProps;
  private _streamPublishStatus?: number;

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
    renderEl: HTMLVideoElement | AudioPlayer
  ) {
    console.log("开始拉流：", pullUrl);

    this._pullUrl = pullUrl;
    this._renderEl = renderEl;
    return new Promise((resolve, reject) => {

      if (!this._rtsClient) return reject("no rtsClient");

      this._rtsClient
        .subscribe(pullUrl, {
          retryTimes: RtsSubscriber.MAX_RETRY,
          retryInterval: RtsSubscriber.RETRY_INTERVAL
        })
        .then((remoteStream) => {
          this._props?.onRemoteStream && this._props?.onRemoteStream(remoteStream);
          // mediaElement是媒体标签audio或video
          if (renderEl instanceof AudioPlayer) {
            renderEl.load({
              type: "STREAM",
              value: remoteStream.mediaStream,
            });
          } else {
            remoteStream.play(renderEl);
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
  }

  public dispose() {
    super.dispose();
    console.log("subscriber dispose");

    this.unSubscribe();
    this._pullUrl = undefined;

    if (this._renderEl instanceof AudioPlayer) {
      this._renderEl.dispose();
    }

    this._renderEl = undefined;
    this._props = undefined;
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
          console.log("play event", data.event);

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
    })
  }
}
