import { ERetryType, RtsSubscriber } from "@/core";
import { useEffect, useRef, useState } from "react";

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

  return (
    <video
      autoPlay={autoPlay ?? true}
      controls={controls ?? true}
      muted={muted ?? true}
      className={className}
      ref={videoRef}
      style={{ ...videoStyle }}
      onCanPlay={() => {
        detectCanPlay();
      }}
    ></video>
  );
}
