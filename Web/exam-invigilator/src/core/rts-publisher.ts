import { AliRTS } from "aliyun-rts-sdk";
import { ERtsExceptionType, reporter } from "../utils/Reporter";
import {
  EConnectStatus,
  ERtsType,
  IProps as IBaseProps,
  RtsBase,
} from "./rts-base";
import { PublishMonitor } from "./rts-monitor/publish-monitor";
import type { LocalStream } from "aliyun-rts-sdk";

export enum DeviceErrorCode {
  ERROR_DEVICE_UNKNOWNERROR = 10000,
  ERROR_DEVICE_AUDIODEVICE_NOTFOUND,
  ERROR_DEVICE_VIDEODEVICE_NOTFOUND,
  ERROR_DEVICE_AUDIODEVICE_NOTALLOWED,
  ERROR_DEVICE_VIDEODEVICE_NOTALLOWED,
  ERROR_DEVICE_AUDIODEVICE_NOTREADABLE,
  ERROR_DEVICE_VIDEODEVICE_NOTREADABLE,
  ERROR_DEIVCE_CONSTRAINEDERROR = 10007,

  ERROR_SCREENSHARE_UNKNOWNERRO = 10010,
  ERROR_SCREENSHARE_NOTALLOWED = 10011,
  ERROR_SCREENSHARE_ENDED = 10012,
  ERROR_SCREENSHARE_NOPERMISSION = 10013,
  ERROR_SCREENSHARE_INVALIDACCESS = 10014,

  ERROR_SCREENSHARE_NOTSUPPORT = 10018,
  ERROR_DEVICE_NOTSUPPORT = 10019,
}

export enum EDeviceType {
  Camera = "camera",
  Mic = "mic",
}

export enum EPublisherStatus {
  /**
   * 推流不可用，如n秒内推流未成功、推流暂时中断、推流结束等
   */
  Unavailable = "unavailable",
  /**
   * 推流恢复
   */
  Available = "available",
}

type IProps = {
  /**
   * 推流状态改变的回调，如推流中断、断开、恢复。
   * 用于通知开启本地录制
   */
  onStatusChange: (state: EPublisherStatus) => any;

  /**
   * 推流成功
   */
  onPublishOk: () => any;

  /**
   * 推流失败
   */
  onPublishFailed?: () => any;

  /**
   * 重试已超过次数，不再重试
   */
  onRetryReachLimit: () => any;

  /**
   * track 断开，如麦克风、摄像头被拔出（常见于耳机麦克风一体的设备被拔出）
   */
  onTrackEnded: () => any;

  /**
   * 最大重试次数
   */
  maxRetry?: number;
} & IBaseProps;

export class RtsPublisher extends RtsBase {
  static MAX_RETRY = 3;
  static RETRY_INTERVAL = 2 * 1000;

  private _publishUrl?: string;
  private _localStream?: LocalStream;
  private _publishMonitor: PublishMonitor;
  private _retryCount = 0;
  private _retryTimer?: NodeJS.Timer;
  private _maxRetry = RtsPublisher.MAX_RETRY;

  private _props: IProps;

  constructor(props: IProps) {
    super({
      ...props,
      type: ERtsType.Publish,
    });
    if (props.maxRetry !== undefined) {
      this._maxRetry = props.maxRetry;
    }
    this._props = props;

    this._publishMonitor = new PublishMonitor({
      rtsClient: this._rtsClient,
      onUnderflow: () => {
        console.log("REpublish");
        this._publishUrl && this.publish(this._publishUrl);
      },
      onReportData: (data) => {
        reporter.publishStats({
          ...data,
          url: this._url,
          traceId: this._traceId,
        });
      },
    });

    this.bindEvents();
  }

  public createStream(
    renderEl: HTMLVideoElement,
    config?: { video?: any; audio?: any }
  ) {
    return new Promise((resolve, reject) => {
      AliRTS.createStream({
        audio: config?.audio ?? true,
        video: config?.video ?? true,
        screen: false,
      })
        .then((localStream) => {
          console.log("created stream: ", localStream);

          // @ts-ignore-next-line
          if (localStream.hasVideo) {
            // @ts-ignore-next-line
            localStream.VideoProfileMap.set("custom_540_800k", {
              width: 960,
              height: 540,
              frameRate: 15,
              maxBitrate: 800,
            });
            localStream.setVideoProfile("custom_540_800k");

            // @ts-ignore-next-line
            localStream.sdpHook = (sdp: string) => {
              if (this.SystemUtil.isIos) {
                return sdp.replace(
                  /sps-pps-idr-in-keyframe=1/g,
                  "sps-pps-idr-in-keyframe=1;x-google-min-bitrate=700"
                ); // min-bitrate 需要调高一点才能达到预期的值
              } else if (this.SystemUtil.isAndroid) {
                return sdp.replace(
                  /sps-pps-idr-in-keyframe=1/g,
                  "sps-pps-idr-in-keyframe=1;x-google-min-bitrate=1400"
                ); // 早期chrome版本码率会一直保持在最低值的一半，这里 double 解决
              }
              return sdp;
            };
          }

          localStream.on('audioTrackEnded', () => {
            this._props?.onTrackEnded();
          });

          localStream.on('videoTrackEnded', () => {
            this._props?.onTrackEnded();
          });

          this._localStream = localStream;
          // 预览推流内容，mediaElement是媒体标签audio或video
          renderEl && localStream.play(renderEl);
          resolve("");
        })
        .catch((err) => {
          // 创建本地流失败
          console.log("创建本地流失败", err);
          reporter.publishException({
            url: this._publishUrl || "",
            errorCode: ERtsExceptionType.DeviceError,
            deviceErrorCode: err.errorCode,
          });
          let deviceType;
          if (
            [
              DeviceErrorCode.ERROR_DEVICE_AUDIODEVICE_NOTALLOWED,
              DeviceErrorCode.ERROR_DEVICE_AUDIODEVICE_NOTFOUND,
              DeviceErrorCode.ERROR_DEVICE_AUDIODEVICE_NOTREADABLE,
            ].includes(err.errorCode)
          ) {
            deviceType = EDeviceType.Mic;
          } else if (
            [
              DeviceErrorCode.ERROR_DEVICE_VIDEODEVICE_NOTALLOWED,
              DeviceErrorCode.ERROR_DEVICE_VIDEODEVICE_NOTFOUND,
              DeviceErrorCode.ERROR_DEVICE_VIDEODEVICE_NOTREADABLE,
            ].includes(err.errorCode)
          ) {
            deviceType = EDeviceType.Camera;
          }
          if (deviceType) {
            reject({ deviceType });
          } else {
            console.error("未知错误");
          }
        });
    });
  }

  public publish(pushUrl: string) {
    console.log("开始推流：", pushUrl);
    this._publishUrl = pushUrl;
    this._publishMonitor?.stop();
    return new Promise((resolve, reject) => {
      if (!this._localStream) {
        reject("no localstream");
        return;
      }

      this._rtsClient
        .publish(pushUrl, this._localStream, {
          retryTimes: this._maxRetry,
          retryInterval: RtsPublisher.RETRY_INTERVAL
        })
        .then(() => {
          // 推流成功
          console.log("推流成功, ", pushUrl);
          this._props.onStatusChange &&
            this._props.onStatusChange(EPublisherStatus.Available);
          this._props.onPublishOk && this._props.onPublishOk();
          resolve("");
        })
        .catch((err) => {
          this._props.onPublishFailed && this._props.onPublishFailed();
          this._props?.onRetryReachLimit && this._props?.onRetryReachLimit();
          reporter.publishException({
            url: this._publishUrl || "",
            errorCode: ERtsExceptionType.RetryReachLimit,
            retryCount: this._maxRetry,
            traceId: this._traceId,
          });
          this._props.onStatusChange &&
            this._props.onStatusChange(EPublisherStatus.Unavailable);
          // 推流失败
          console.log("推流失败", err);
          reject(err);
        });
    });
  }

  public unPublish() {
    this._rtsClient?.unpublish();
  }

  public dispose() {
    super.dispose();

    this.unPublish();
    // 停止从系统获取音视频流
    if (this._localStream) {
      this._localStream.stop();
    }
    this._localStream = undefined;
    this._publishUrl = undefined;
    this._publishMonitor.dispose();
  }

  protected bindEvents() {
    super.bindEvents();

    let { onStatusChange } = this._props || {};
    onStatusChange = onStatusChange || (() => {}) /* noop */;

    if (this._rtsClient) {
      this._rtsClient.on("connectStatusChange", (event) => {
        console.log("connectStatusChange", event.status);
        switch (event.status) {
          case EConnectStatus.CONNECT_STATUS_DISCONNECTED:
            onStatusChange(EPublisherStatus.Unavailable);
            break;
          case EConnectStatus.CONNECT_STATUS_RECONNECTING:
            onStatusChange(EPublisherStatus.Unavailable);
            break;
          case EConnectStatus.CONNECT_STATUS_CONNECTED:
            onStatusChange(EPublisherStatus.Available);
            this._publishMonitor.start();
            break;
        }
      });
    }
  }

  /**
   * 获取从系统获取到的 MediaSteam
   */
  public getMediaStream() {
    if (this._localStream) {
      return this._localStream.mediaStream;
    }
    return null;
  }
}
