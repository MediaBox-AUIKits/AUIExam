import { reporter } from "@/utils/Reporter";
import type { RtsClient } from "aliyun-rts-sdk";
import { EMediaType, IMediaData, MediaObserver } from "./media-observer";

interface IReportData {
  url: string;
  traceId: string;
  tt: number;
  rtt: number;
  w: number | undefined;
  h: number | undefined;
  vbps: number;
  fps: number | undefined;
  abps: number;
}

interface IProps {
  rtsClient: RtsClient;
  onUnderflow: (type: EMediaType) => any;
  onResume?: (type: EMediaType) => any;
  onReportData: (data: IReportData) => any; // for 心跳埋点
}

interface IStatsData {
  timeStamp: number;
  video: {};

  audio: {};
}

export class PublishMonitor {
  static INTERVAL = 1 * 1000;
  static REPORT_INTERVAL = 4 * 1000; // 每4秒上报一次心跳

  private _rtsClient?: RtsClient;
  private _timer?: NodeJS.Timer;
  private _reportIntervalCount = 0;
  private _onReportData: (data: IReportData) => any;

  private _mediaObserver?: MediaObserver;

  private _videoOutboundRtpStreamStats: Partial<RTCOutboundRtpStreamStats>;
  private _videoOutboundRtpStreamStatsDiff: Partial<RTCOutboundRtpStreamStats>;

  private _audioOutboundRtpStreamStats: Partial<RTCOutboundRtpStreamStats>;
  private _audioOutboundRtpStreamStatsDiff: Partial<RTCOutboundRtpStreamStats>;

  private _transportStats: { rtt?: number };
  private _remoteCandidate: Partial<RTCIceCandidate>;
  private _localCandidate: Partial<RTCIceCandidate>;

  constructor(props: IProps) {
    this._rtsClient = props.rtsClient;

    this._mediaObserver = new MediaObserver({
      // 音视频可能会同时触发跌 0，这里做个防抖
      handler: this.debounce((type: EMediaType) => {
        console.log("onUnderflow", type);
        reporter.publishUnderFlow();
        props.onUnderflow && props.onUnderflow(type);
      }, 500),
      resumeHandler: this.debounce((type: EMediaType) => {
        console.log("onResume", type);
        reporter.publishResume();
        props.onResume && props.onResume(type);
      }, 500),
      timeout: 30 * 1000,
    });

    this._onReportData = props.onReportData;

    this._videoOutboundRtpStreamStats = {};
    this._videoOutboundRtpStreamStatsDiff = {};

    this._audioOutboundRtpStreamStats = {};
    this._audioOutboundRtpStreamStatsDiff = {};

    this._transportStats = {};
    this._remoteCandidate = {};
    this._localCandidate = {};
  }

  get hasVideo() {
    return !!this.getVideoSender();
  }

  get hasAudio() {
    return !!this.getAudioSender();
  }

  /**
   * 连接成功的时候开始监控
   */
  public start() {
    this.stop();
    this._timer = setInterval(() => {
      this.getStats();

      this._reportIntervalCount++;
      if (
        this._reportIntervalCount >=
        PublishMonitor.REPORT_INTERVAL / PublishMonitor.INTERVAL
      ) {
        this._reportIntervalCount = 0;
        const reportData = {
          url: "",
          traceId: "",
          tt: PublishMonitor.REPORT_INTERVAL,
          rtt: this._transportStats.rtt ? this._transportStats.rtt * 1000 : -1,
          w: this._videoOutboundRtpStreamStats.frameWidth,
          h: this._videoOutboundRtpStreamStats.frameHeight,
          vbps: (this._videoOutboundRtpStreamStatsDiff.bytesSent || 0) * 8,
          fps: this._videoOutboundRtpStreamStats.framesPerSecond,
          encoder: this._videoOutboundRtpStreamStats.encoderImplementation,
          // @ts-ignore-next-line
          trackId: this._videoOutboundRtpStreamStats.trackId,
          codecId: this._videoOutboundRtpStreamStats.codecId,
          // @ts-ignore-next-line
          mid: this._videoOutboundRtpStreamStats.mid,
          // @ts-ignore-next-line
          mediaType: this._videoOutboundRtpStreamStats.mediaType,
          pktSentPs: this._videoOutboundRtpStreamStatsDiff.packetsSent,
          retransPktSentPs:
            this._videoOutboundRtpStreamStatsDiff.retransmittedPacketsSent,
          targetBitrate: this._videoOutboundRtpStreamStats.targetBitrate,
          encodedFps: this._videoOutboundRtpStreamStats.framesEncoded,
          encodedKeyFps: this._videoOutboundRtpStreamStats.keyFramesEncoded,
          totalEncodeTime: this._videoOutboundRtpStreamStats.totalEncodeTime,
          framesSentPs: this._videoOutboundRtpStreamStatsDiff.framesSent,
          hugeFramesSentPs:
            this._videoOutboundRtpStreamStatsDiff.hugeFramesSent,
          totalPacketSendDelay:
            this._videoOutboundRtpStreamStats.totalPacketSendDelay,
          // @ts-ignore-next-line
          qlr: this._videoOutboundRtpStreamStats.qualityLimitationReason,
          firCount: this._videoOutboundRtpStreamStats.firCount,
          pliCount: this._videoOutboundRtpStreamStats.pliCount,
          nackCount: this._videoOutboundRtpStreamStats.nackCount,
          qpSum: this._videoOutboundRtpStreamStats.qpSum,
          // @ts-ignore-next-line
          active: this._videoOutboundRtpStreamStats.active,

          abps: (this._audioOutboundRtpStreamStatsDiff.bytesSent || 0) * 8,

          /* candidates */
          candiRemoteProtocol: this._remoteCandidate.protocol,
          candiRemoteAddr: `${this._remoteCandidate.ip || this._remoteCandidate.address}:${this._remoteCandidate.port}`,
          candiLocalProtocol: this._localCandidate.protocol,
          candiLocalAddr: `${this._localCandidate.ip || this._localCandidate.address}:${this._localCandidate.port}`,
          candiLocalNetType: this._localCandidate.networkType
        };
        this._onReportData && this._onReportData(reportData);
      }
    }, PublishMonitor.INTERVAL);
  }

  public stop() {
    if (this._timer) {
      clearInterval(this._timer);
    }
    this._reportIntervalCount = 0;

    this._videoOutboundRtpStreamStats = {};
    this._videoOutboundRtpStreamStatsDiff = {};

    this._audioOutboundRtpStreamStats = {};
    this._audioOutboundRtpStreamStatsDiff = {};

    this._transportStats = {};
    this._remoteCandidate = {};
    this._localCandidate = {};
  }

  public dispose() {
    this.stop();
    this._rtsClient = undefined;
  }

  /**
   * 获取 Peerconnection 传输数据，监控推流状态
   */
  private async getStats() {
    try {
      await Promise.all([
        this.getVideoStats(),
        this.getAudioStats(),
        this.getTransportStats(),
      ]);
    } catch (error) {
      console.log("update stats edrror: ", error);
    }

    let dataToCheck: IMediaData = {};
    if (this.hasVideo) {
      dataToCheck.video = {
        bytesPerSecond: this._videoOutboundRtpStreamStatsDiff.bytesSent,
      };
    }

    if (this.hasAudio) {
      dataToCheck.audio = {
        bytesPerSecond: this._audioOutboundRtpStreamStatsDiff.bytesSent,
      };
    }

    this._mediaObserver?.check(dataToCheck);
  }

  private async getVideoStats() {
    const videoSender = this.getVideoSender();
    if (videoSender) {
      let stats;
      try {
        stats = await videoSender.getStats();
      } catch (error) {
        throw error;
      }
      stats.forEach((report) => {
        if (!report) return;

        if (report.type === "outbound-rtp") {
          this._videoOutboundRtpStreamStatsDiff = this.calcDiff(
            report,
            this._videoOutboundRtpStreamStats,
            [
              "bytesSent",
              "packetsSent",
              "retransmittedPacketsSent",
              "framesSent",
              "hugeFramesSent",
            ]
          );
          this._videoOutboundRtpStreamStats = report;
          // console.log('video report', report, this._videoOutboundRtpStreamStatsDiff);
        }
      });
    }
  }

  private async getAudioStats() {
    const audioSender = this.getAudioSender();
    if (audioSender) {
      let stats;
      try {
        stats = await audioSender.getStats();
      } catch (error) {
        throw error;
      }
      stats.forEach((report) => {
        if (!report) return;

        if (report.type === "outbound-rtp") {
          this._audioOutboundRtpStreamStatsDiff = this.calcDiff(
            report,
            this._audioOutboundRtpStreamStats,
            ["bytesSent"]
          );
          this._audioOutboundRtpStreamStats = report;
          // console.log('audio report', report, this._audioOutboundRtpStreamStatsDiff);
        }
      });
    }
  }

  private async getTransportStats() {
    const audioSender = this.getAudioSender();
    if (audioSender) {
      let stats;
      try {
        stats = await audioSender.getStats();
      } catch (error) {
        throw error;
      }
      stats.forEach((report) => {
        if (!report) return;

        switch (report.type) {
          case 'candidate-pair':
            if (report.state === 'succeeded' || report.bytesReceived/* 状态有可能是 in-progress */) {
              this._transportStats = {
                rtt: report.currentRoundTripTime || -1,
              }
            }
            break;
          case 'remote-candidate':
            this._remoteCandidate = report || {};
            break;
          case 'local-candidate':
            this._localCandidate = report || {};
            break;
        }
      });
    }
  }

  private getVideoSender() {
    return this.getSenders().find((sender) => sender.track?.kind === "video");
  }

  private getAudioSender() {
    return this.getSenders().find((sender) => sender.track?.kind === "audio");
  }

  private getSenders() {
    let senders: RTCRtpSender[] = [];
    try {
      // @ts-ignore-next-line
      senders = this._rtsClient.publisher.peerconnection.pc.getSenders();
    } catch (error) {
      console.log("get sender error", error);
      senders = [];
    }
    return senders;
  }

  // 计算一下两次 report 的差值
  private calcDiff<T, V extends keyof T>(
    report: T,
    prevReport: T,
    pickedKeys: V[]
  ): Pick<T, V> {
    let res: any = {};
    pickedKeys.forEach((key) => {
      res[key] = Number(report[key] || 0) - Number(prevReport[key] || 0);
    });
    return res;
  }

  private debounce(func: any, timeout: number) {
    let timer: NodeJS.Timer;
    return (...args: any) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        func.apply(this, args);
      }, timeout);
    };
  }
}
