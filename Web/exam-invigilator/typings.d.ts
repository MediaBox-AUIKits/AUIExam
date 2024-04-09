import "umi/typings";
import { IConfig } from "@/config";
import "./typings/AliVCInteraction.d.ts";
import type { AliyunInteraction } from "./typings/AliyunInteraction.d.ts";
import { AliVCInteraction } from "./typings/AliVCInteraction";

declare global {
  interface Window {
    AliyunInteraction: AliyunInteraction;
    AliVCInteraction: typeof AliVCInteraction;
    AliyunGcTask: any;
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
