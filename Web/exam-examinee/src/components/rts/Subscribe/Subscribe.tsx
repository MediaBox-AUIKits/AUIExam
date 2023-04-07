import { AudioPlayer, ERetryType, RtsSubscriber, AudioPlayerEvents } from "@/core";
import { getSystemType } from "@/utils/common";
import { useEffect, useRef, useState } from "react";

interface IProps {
  className?: string;
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
}

const isIOS = getSystemType() === "iOS";

export default function Subscribe(props: IProps) {
  const {
    className,
    subscribeUrl,
    onSubscribeLoading,
    onCanplay,
    onSubscribeRetryFailed,
    onUdpFailed,
  } = props;
  const [subscriber, setSubscriber] = useState<RtsSubscriber>();
  const [activeSubscribeUrl, setActiveSubscribeUrl] = useState<string>();
  const audioRef = useRef<HTMLVideoElement>(null);
  const canplayTimerRef = useRef<{ timer?: NodeJS.Timer }>({
    timer: undefined,
  });
  const audioPlayerRef = useRef<AudioPlayer>();

  /**
   * 初始化 rts client
   */
  useEffect(() => {
    const _subscriber = new RtsSubscriber({
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

    if (isIOS) {
      initAudioPlayer();
    }

    return () => {
      clearCanplayTimer();
      _subscriber?.dispose();

      if (audioPlayerRef.current) {
        audioPlayerRef.current.dispose();
        audioPlayerRef.current = undefined;
      }
    };
  }, []);

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

  const initAudioPlayer = () => {
    audioPlayerRef.current = new AudioPlayer();

    audioPlayerRef.current.on(AudioPlayerEvents.Playing, () => {
      onCanplay && onCanplay();
    });
  };

  const startSubscribe = async () => {
    if (subscriber && (audioRef.current || audioPlayerRef.current)) {
      try {
        onSubscribeLoading && onSubscribeLoading();
        setActiveSubscribeUrl(subscribeUrl);
        await subscriber.subscribe(
          makeAudioUrl(subscribeUrl),
          // @ts-ignore-next-line
          isIOS ? audioPlayerRef.current : audioRef.current
        );
      } catch (error) {
        console.log("订阅失败", error);
      }
    }
  };

  const makeAudioUrl = (sourceUrl: string) => {
    let resultUrl = sourceUrl;
    const TOKEN = "@subvideo=no";
    if (!sourceUrl.includes(TOKEN)) {
      resultUrl = sourceUrl + TOKEN;
    }
    return resultUrl;
  };

  const detectCanPlay = () => {
    if (!audioRef.current) return;
    let currentTime = audioRef.current!.currentTime;
    const timer = setInterval(() => {
      if (audioRef.current && currentTime !== audioRef.current!.currentTime) {
        clearCanplayTimer();
        onCanplay && onCanplay();
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
    <div className={className}>
      <audio
        autoPlay
        ref={audioRef}
        onCanPlay={() => {
          detectCanPlay();
        }}
      ></audio>
    </div>
  );
}
