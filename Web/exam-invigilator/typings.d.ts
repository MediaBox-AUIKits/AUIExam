import "umi/typings";
import { IConfig } from "@/config";

declare global {
  interface Window {
    AliyunInteraction: any;
  }

  var ASSETS_VERSION: string;
  const CONFIG: IConfig;

  // https://www.w3.org/TR/webrtc-stats/#dom-rtcoutboundrtpstreamstats
  interface RTCOutboundRtpStreamStats {
    targetBitrate?: number;
    frameWidth?: number;
    frameHeight?: number;
    framesPerSecond?: number;
    framesSent?: number;
    packetsSent?: number;
    totalPacketSendDelay?: number;
    totalEncodeTime?: number;
  }
}
