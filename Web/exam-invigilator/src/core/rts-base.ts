import { ERtsEndType, ERtsExceptionType, reporter } from "../utils/Reporter";
import { AliRTS } from "aliyun-rts-sdk";
import { RtsClient } from "aliyun-rts-sdk/dist/rtsclient";

export enum EConnectStatus {
  CONNECT_STATUS_DISCONNECTED = 0,
  CONNECT_STATUS_CONNECTING = 1,
  CONNECT_STATUS_CONNECTED = 2,
  CONNECT_STATUS_RECONNECTING = 3,
}

export enum ERtsType {
  Subscribe = "subscribe",
  Publish = "publish",
}

export interface IProps {
  /**
   * UDP 连接失败
   */
  onUdpFailed: () => void;

  /**
   * traceId 获取回调
   */
  onTraceId?: (traceId: string, url: string) => any;

  type?: ERtsType;
}

export class RtsBase {
  protected _type?: ERtsType;

  protected _rtsClient: RtsClient;

  /**
   * 用来判断是否 UDP 连接不通，connecting -> disconnected
   */
  protected _isConnecting?: boolean;
  /**
   * 只有连接成功才走到超时重试的逻辑，否则就是 UDP 不通
   */
  protected _isConnected?: boolean;

  protected _baseProps?: IProps;

  protected _url: string;
  protected _traceId: string;

  protected SystemUtil = AliRTS.SystenUtil;
  protected BrowserUtil = AliRTS.BrowserUtil;

  constructor(props: IProps) {
    this._type = props.type;
    this._baseProps = props;
    this._rtsClient = this.initRts();
    this._url = "";
    this._traceId = "";
  }

  protected initRts() {
    return AliRTS.createClient({
      trackLog: false,
      customReporter: (params) => {
        const msgId = Number(params.msgid);
        const args = JSON.parse(params.args || "{}");

        switch (msgId) {
          case 125:
            this._url = decodeURIComponent(args.vurl);
            reporter.subscribeStart({ url: this._url });
            break;

          case 220:
            this._url = decodeURIComponent(args.purl);
            reporter.publishStart({ url: this._url });
            break;

          case 126: // sub ok
          case 222: // pub ok
            const traceId = args.tcid;
            this._traceId = traceId;
            if (msgId === 126) {
              reporter.subscribeOk({
                url: decodeURIComponent(args.vurl),
                traceId: traceId,
              });
            } else {
              reporter.publishOk({
                url: decodeURIComponent(args.purl),
                traceId: traceId,
              });
            }

            console.log("traceId", traceId);
            if (this._baseProps?.onTraceId) {
              this._baseProps?.onTraceId(
                traceId,
                decodeURIComponent(args.purl || args.vurl)
              );
            }
            break;

          case 137: // first frame
            reporter.subscribeFirsrFrame({
              url: decodeURIComponent(args.vurl),
              traceId: args.tcid,
              cpct: args.cpct,
              hrct: args.hrct,
              ffct: args.ffct,
              cnct: args.cnct,
            });
            break;

          case 107: // 拉流心跳
            reporter.subscribeStats({
              url: this._url,
              traceId: this._traceId,
              ct: args.ct,
              tt: args.tt,
              rtt: args.rtt,
              w: args.w,
              h: args.h,
              vbps: args.vbps,
              fps: args.fps,
              vjb: args.vjb,
              abps: args.abps,
              ajb: args.ajb,
            });
            break;

          case 150:
            if (this._type === ERtsType.Publish) {
              reporter.publishError({
                url: this._url,
                errorCode: args.errorCode,
                errorMsg: args.message,
                traceId: args.tcid,
              });
            } else if (this._type === ERtsType.Subscribe) {
              if (Number(args.errorCode) !== 10207) {
                // 10207 是数据 timeout，会有单独点位上报代表拉流结束
                reporter.subscribeError({
                  url: this._url,
                  errorCode: args.errorCode,
                  errorMsg: args.message,
                  traceId: args.tcid,
                });
              }
            }
            this._traceId = "";
            break;
        }
      },
    });
  }

  protected bindEvents() {
    this._rtsClient.on("onError", (err) => {
      console.log("Error", err);
    });

    // connecting -> disconnected 是 UDP 连接失败
    this._rtsClient.on("connectStatusChange", (event) => {
      switch (event.status) {
        case EConnectStatus.CONNECT_STATUS_CONNECTING:
          this._isConnecting = true;
          this._isConnected = false;
          break;
        case EConnectStatus.CONNECT_STATUS_DISCONNECTED:
          const reportParams = {
            url: this._url,
            errorCode: ERtsEndType.Disconnected,
          };
          if (this._type === ERtsType.Subscribe) {
            reporter.subscribeEnd(reportParams);
          } else {
            reporter.publishEnd(reportParams);
          }
          if (this._isConnecting) {
            console.log(this._type, "UDP failed.");
            this._baseProps?.onUdpFailed && this._baseProps?.onUdpFailed();
            this._isConnecting = false;
            this._isConnected = false;
            const reportData = {
              url: this._url,
              errorCode: ERtsExceptionType.UdpConnectionFailed,
            };
            if (this._type === ERtsType.Subscribe) {
              reporter.subscribeException(reportData);
            } else {
              reporter.publishException(reportData);
            }
          }
          break;
        case EConnectStatus.CONNECT_STATUS_CONNECTED:
          this._isConnecting = false;
          this._isConnected = true;
          break;
      }
    });
  }

  protected dispose() {
    this._rtsClient?.removeAllListeners();
    this._isConnecting = false;
    this._isConnected = false;
  }
}
