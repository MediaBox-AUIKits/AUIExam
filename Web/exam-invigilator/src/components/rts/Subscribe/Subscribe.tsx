import { ERetryType, RtsSubscriber } from "@/core";
import { useEffect, useMemo, useRef, useState } from "react";

interface IProps {
  /**
   * 订阅地址
   */
  subscribeUrl: string;

  /**
   * 已经开始拉流，但是无法播放的状态，对应界面显示 loading
   * 包括：
   * 1. 拉流到 canplay 之间的状态
   * 2. 断流重试到 canplay 之间的状态
   */
  onSubscribeLoading: () => any;

  /**
   * 拉流成功，可以播放，此时应该通知业务系统学生已经可以播放老师的声音了。
   */
  onCanplay: () => any;

  /**
   * 重试超过指定次数，不再重试
   */
  onSubscribeRetryFailed: (type: ERetryType) => any;

  /**
   * UDP 失败，提示用户
   */
  onUdpFailed: () => any;

  /**
   * 自定义 video 样式
   */
  videoStyle?: React.CSSProperties;

  /**
   * video class
   */
  className?: string;

  /**
   * muted or not
   */
  muted?: boolean;

  /**
   * show video controls or not
   */
  controls?: boolean;

  autoPlay?: boolean;

  // 需要订阅的流地址的推流状态
  streamPublishStatus?: number;

  playSingleChannel?: boolean;

  /**
   * 是否拉流之后自动开启混音（小流需要点击unmute再混音，大流拉到流直接混音）
   */
  autoMix?: boolean;

  /**
   * 画面旋转角度
   */
  rotateDegree?: number;
}

export default function Subscribe(props: IProps) {
  const {
    subscribeUrl,
    onSubscribeLoading,
    onCanplay,
    onSubscribeRetryFailed,
    onUdpFailed,
    videoStyle,
    className,
    muted,
    controls,
    autoPlay,
    streamPublishStatus,
    playSingleChannel,
    autoMix,
    rotateDegree
  } = props;
  const [subscriber, setSubscriber] = useState<RtsSubscriber>();
  const [activeSubscribeUrl, setActiveSubscribeUrl] = useState<string>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canplayTimerRef = useRef<{ timer?: NodeJS.Timer }>({
    timer: undefined,
  });

  const canPlayRef = useRef<any>(null);
  useEffect(() => {
    canPlayRef.current = onCanplay;
  }, [onCanplay]);

  /**
   * 初始化 rts client
   */
  useEffect(() => {
    const _subscriber = new RtsSubscriber({
      playSingleChannel,
      autoMix,
      streamPublishStatus: props.streamPublishStatus,
      onRetry: () => {
        clearCanplayTimer();
        onSubscribeLoading && onSubscribeLoading();
      },
      onRetryReachLimit: (type) => {
        onSubscribeRetryFailed && onSubscribeRetryFailed(type);
      },
      onUdpFailed: () => {
        onUdpFailed && onUdpFailed();
      },
    });
    setSubscriber(_subscriber);

    return () => {
      clearCanplayTimer();
      _subscriber?.dispose();
    };
  }, []);

  // 同步更新至 RtsSubscriber
  useEffect(() => {
    if (subscriber && typeof streamPublishStatus === "number") {
      subscriber.setStreamPublishStatus(streamPublishStatus);
    }
  }, [subscriber, streamPublishStatus]);

  /**
   * 开始拉流
   */
  useEffect(() => {
    startSubscribe();
  }, [subscriber]);

  /**
   * 拉流地址变化后，重新订阅
   */
  useEffect(() => {
    if (subscribeUrl && activeSubscribeUrl) {
      if (subscribeUrl !== activeSubscribeUrl) {
        console.log(
          `Sub URL changed from ${activeSubscribeUrl} to ${subscribeUrl}`
        );
        startSubscribe();
      }
    }
  }, [subscribeUrl]);

  /**
   * 混音情况下，手动维护一个 AC，由它直接发声，video 标签是一直静音的
   */
  useEffect(() => {
    muted ?
      subscriber?.suspendAudioContext()
      : subscriber?.resumeAudioContext();
  }, [muted])

  const startSubscribe = async () => {
    if (subscriber && videoRef.current) {
      try {
        onSubscribeLoading && onSubscribeLoading();
        setActiveSubscribeUrl(subscribeUrl);
        await subscriber.subscribe(subscribeUrl, videoRef.current);
      } catch (error) {
        console.log("订阅失败", error);
      }
    }
  };

  const detectCanPlay = () => {
    if (!videoRef.current) return;
    let currentTime = videoRef.current!.currentTime;
    clearCanplayTimer();
    const timer = setInterval(() => {
      if (videoRef.current && currentTime !== videoRef.current.currentTime) {
        clearCanplayTimer();
        canPlayRef.current && canPlayRef.current();
      }
    }, 500);

    canplayTimerRef.current.timer = timer;
  };

  const clearCanplayTimer = () => {
    if (canplayTimerRef.current?.timer) {
      clearInterval(canplayTimerRef.current?.timer);
      canplayTimerRef.current.timer = undefined;
    }
  };

  const rotateStyle = useMemo(() => {
    if (rotateDegree === 0) return {};

    const tag = videoRef.current;
    if (!tag) return {};

    const isVertical = tag.videoHeight > tag.videoWidth;
    let scale = 1;
    if (rotateDegree !== 180) { // 上下颠倒的时候不缩放
      const viewWidth = tag.offsetWidth;
      const viewHeight = tag.offsetHeight;
  
      // 实际图像高度 viewHeight
      // 实际图像宽度 tag.videoWidth * (viewHeight / tag.videoHeight)
      const imageWidth = tag.videoWidth * (viewHeight / tag.videoHeight);
      const imageHeight = viewHeight;
  
      // 如果容器宽高比 > 图像宽高比
      const viewRatio = viewWidth / viewHeight;
      const imageRatio = Math.max(imageWidth, imageHeight) / Math.min(imageWidth, imageHeight); // 长边比短边
  
      if (isVertical) {
        scale = viewRatio < imageRatio ?
          viewWidth / imageHeight
          : viewHeight / imageWidth;
      } else {
        scale = viewRatio < imageRatio ?
          imageHeight / viewWidth
          : viewHeight / imageWidth;
      }
    }

    return {
      transform: `rotate(${rotateDegree}deg) scale(${scale})`
    }
  }, [rotateDegree])

  return (
    <video
      autoPlay={autoPlay ?? true}
      controls={controls ?? true}
      muted={muted ?? true}
      className={className}
      ref={videoRef}
      style={{ ...rotateStyle, ...videoStyle }}
      onCanPlay={() => {
        detectCanPlay();
      }}
    ></video>
  );
}
