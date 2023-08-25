import { ERetryType, RtsSubscriber } from "@/core";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import styles from "./index.less";

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
    className,
    muted,
    controls,
    autoPlay,
    streamPublishStatus,
  } = props;
  const [subscriber, setSubscriber] = useState<RtsSubscriber>();
  const [activeSubscribeUrl, setActiveSubscribeUrl] = useState<string>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canplayTimerRef = useRef<{ timer?: NodeJS.Timer }>({
    timer: undefined,
  });
  const [videoWidth, setVideoWidth] = useState<number>(0);
  const [videoHeight, setVideoHeight] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const sizeRef = useRef<React.CSSProperties>();
  const videoSizeTimerRef = useRef<{ timer?: NodeJS.Timer }>({
    timer: undefined,
  });

  const wrapStyle: CSSProperties = useMemo(() => {
    const styles: CSSProperties = {};
    if (!videoWidth || !videoHeight || !containerHeight || !containerWidth) {
      styles.display = "none";
      return styles;
    }
    // 只展示 80% 画面，左右两边 10% 隐藏
    const contentWidth = videoWidth * 0.8;
    const containerRatio = containerWidth / containerHeight;
    const contentRatio = contentWidth / videoHeight;
    if (containerRatio < contentRatio) {
      // 宽度得 100%
      styles.width = containerWidth;
      styles.height = Math.round(containerWidth / contentRatio);
    } else {
      // 高度得 100%
      styles.height = containerHeight;
      styles.width = Math.round(containerHeight * contentRatio);
    }

    return styles;
  }, [videoHeight, videoWidth, containerHeight, containerWidth]);

  useEffect(() => {
    // 监听页面resize事件，更新容器尺寸
    function updateContainerSize() {
      if (!containerRef.current) {
        return;
      }
      const domRect = containerRef.current.getBoundingClientRect();
      setContainerWidth(domRect.width);
      setContainerHeight(domRect.height);
    }
    updateContainerSize();

    window.addEventListener("resize", updateContainerSize);

    return () => {
      window.removeEventListener("resize", updateContainerSize);
    };
  }, []);

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

  sizeRef.current = wrapStyle;

  return (
    <div ref={containerRef} className={className}>
      <div className={styles.wrap} style={wrapStyle}>
        <video
          autoPlay={autoPlay ?? true}
          controls={controls ?? true}
          muted={muted ?? true}
          className={className}
          ref={videoRef}
          onResize={() => {
            if (videoRef.current) {
              setVideoWidth(videoRef.current.videoWidth);
              setVideoHeight(videoRef.current.videoHeight);
            }
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          onCanPlay={() => {
            detectCanPlay();
            if (videoSizeTimerRef.current.timer) {
              clearInterval(videoSizeTimerRef.current.timer);
            }

            videoSizeTimerRef.current.timer = setInterval(() => {
              if (videoRef.current) {
                const _wrapStyle = sizeRef.current || {};
                videoRef.current.style.width = `${_wrapStyle.width}px`;
                videoRef.current.style.height = `${_wrapStyle.height}px`;
              }
            }, 1000);
          }}
        ></video>
      </div>
    </div>
  );
}
