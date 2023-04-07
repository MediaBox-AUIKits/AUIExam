import "umi/typings";
import { IConfig } from "@/config";

declare global {
  interface Window {
    AliyunInteraction: any;
  }

  const CONFIG: IConfig;
  const ASSETS_VERSION: string;
  const PUBLIC_PATH: string;

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
    encoderImplementation?: string;
  }

  interface RTCIceCandidate {
    ip?: string;
    networkType?: string;
  }
}
