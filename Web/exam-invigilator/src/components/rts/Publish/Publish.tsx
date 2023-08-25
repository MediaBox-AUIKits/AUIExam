import { EDeviceType, RtsPublisher } from "@/core";
import React, { useEffect, useRef, useState } from "react";

interface IProps {
  /**
   * 推流地址
   */
  publishUrl: string;
  /**
   * 推流成功回调
   */
  onPublishOk: () => any;

  /**
   * 开启摄像头、麦克风失败，需要引导用户开启权限
   *
   * @params type 需要开启权限的设备类型
   */
  onDeviceFailed: (type: EDeviceType) => any;

  /**
   * 重试超过指定次数，不再重试
   */
  onPublishRetryFailed: () => any;

  /**
   * UDP 失败，提示用户
   */
  onUdpFailed: () => any;

  /**
   * 自定义 video 样式
   */
  videoStyle?: React.CSSProperties;
}

export default function Publish(props: IProps) {
  const {
    publishUrl,
    onDeviceFailed,
    onPublishOk,
    onPublishRetryFailed,
    onUdpFailed,
    videoStyle,
  } = props;
  const [publisher, setPublisher] = useState<RtsPublisher>();
  const [activePublishUrl, setActivePublishUrl] = useState<string>();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const _publisher = new RtsPublisher({
      onPublishOk: () => {
        onPublishOk && onPublishOk();
      },
      onStatusChange: (status) => {
        console.log("onStatusChange", status);
      },
      onRetryReachLimit: () => {
        onPublishRetryFailed && onPublishRetryFailed();
      },
      onUdpFailed: () => {
        onUdpFailed && onUdpFailed();
      },
      onTrackEnded: () => {
        startPublish(_publisher);
      }
    });
    setPublisher(_publisher);

    return () => {
      console.log("推流已结束");
      _publisher.dispose();
    };
  }, []);

  useEffect(() => {
    if (publisher) {
      startPublish();
    }
  }, [publisher]);

  useEffect(() => {
    if (publishUrl && activePublishUrl) {
      if (publishUrl !== activePublishUrl) {
        console.log(
          `Pub URL changed from ${activePublishUrl} to ${publishUrl}`
        );
        startPublish();
      }
    }
  }, [publishUrl]);

  const startPublish = async (paramPublisher?: RtsPublisher) => {
    if (!videoRef.current) return;
    const thePublisher = paramPublisher || publisher;

    setActivePublishUrl(publishUrl);

    let publishOk = true;

    try {
      await thePublisher?.createStream(videoRef.current, { video: false });
    } catch (error: any) {
      console.log("提示用户给予摄像头麦克风权限", error);
      if (error) {
        onDeviceFailed && onDeviceFailed(error.deviceType);
        publishOk = false;
      }
    }

    if (!publishOk) return;

    try {
      await thePublisher?.publish(publishUrl);
    } catch (error) {
      console.log("信令失败或其他兼容错误", error);
    }
  };

  return (
    <video
      muted
      controls
      autoPlay
      playsInline
      style={{ ...videoStyle }}
      ref={videoRef}
    />
  );
}
