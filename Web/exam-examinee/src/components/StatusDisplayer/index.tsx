import { BroadcastSvg, CloseSvg, VoiceSvg } from "@/assets/CustomIcon";
import { ExamContext } from "@/context/exam";
import {
  PublishStatus,
  SubscribeStatus,
} from "@/types";
import {
  AudioPlayer,
  AudioPlayerEvents,
  InteractionEvents,
} from "@/core";
import { getSystemType } from "@/utils/common";
import { reporter } from "@/utils/Reporter";
import {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { throttle } from "throttle-debounce";
import styles from "./index.less";

const isIOS = getSystemType() === "iOS";
const LoadTimeout = 10000;

const PublishTextMap: {
  [x in PublishStatus]: string;
} = {
  init: "",
  nodata: "",
  success: "正常拍摄中",
  fail: "网络不稳定推流失败，正在重试中",
};

interface IStatusDisplayer {
  publishStatus: PublishStatus;
  subscribeStatus: SubscribeStatus;
  connectType: string;
  publishVideoElement?: HTMLVideoElement;
}

function StatusDisplayer(props: IStatusDisplayer) {
  const { publishStatus, subscribeStatus, connectType, publishVideoElement } =
    props;
  const { state, radioTimer, interaction } = useContext(ExamContext);
  const { userInfo, groupJoined } = state;
  const [subErrorTipVisible, setSubErrorTipVisible] = useState<boolean>(false);
  const [pubErrorTipVisible, setPubErrorTipVisible] = useState<boolean>(false);
  const [radioPlaying, setRadioPlaying] = useState<boolean>(false);
  const [audioPlaying, setAudioPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const publishVideoRef = useRef<HTMLVideoElement>();
  const audioPlayerRef = useRef<AudioPlayer>();
  const loadTimer = useRef<number>();
  const currentSecondUrl = useRef<string | undefined>();
  const boardcastSid = useRef<string>("");

  useEffect(() => {
    listenRadioTimerEvent();
    listenInteractionEvent();
    if (isIOS) {
      initAudioPlayer();
    }

    if (audioRef.current) {
      audioRef.current.addEventListener("loadedmetadata", () => {
        console.log("loadedmetadata 尝试开始播放");
        audioRef.current?.play().then(() => {
          console.log('播放成功');
        }).catch((err) => {
          console.log('播放失败', err);
        });
      });
      audioRef.current.addEventListener("ended", () => {
        console.log("系统广播播放结束");
        setAudioPlaying(false);
      });
      audioRef.current.addEventListener("playing", () => {
        console.log("系统广播播放开始");
        interaction.feedbackBroadcastAudio(); // 改为播放了才反馈
        setAudioPlaying(true);
        reporter.audioPlaying({
          src: audioRef.current?.src,
          from: "boardcast",
        });
        clearLoadTimer();
      });
      audioRef.current.addEventListener("error", () => {
        if (!boardcastSid.current) {
          return;
        }
        reporter.audioPlayFail({
          src: audioRef.current?.src,
          from: "boardcast",
          event: "error",
        });
        clearLoadTimer();
        loadSecondUrl();
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (publishStatus === PublishStatus.fail) {
      setPubErrorTipVisible(true);
      // 发送推流失败消息给老师
      interaction.sendPubFail();
    } else if (publishStatus === PublishStatus.success) {
      setPubErrorTipVisible(false);
      // 发送推流成功消息给老师
      interaction.sendPubSuccess();
    } else if (publishStatus === PublishStatus.nodata) {
      // 发送推流失败消息给老师
      interaction.sendPubFail();
    }
  }, [publishStatus, groupJoined]);

  useEffect(() => {
    publishVideoRef.current = publishVideoElement;
  }, [publishVideoElement]);

  useEffect(() => {
    if (subscribeStatus === SubscribeStatus.fail) {
      setSubErrorTipVisible(true);
    } else if (
      subscribeStatus === SubscribeStatus.success ||
      subscribeStatus === SubscribeStatus.disconnect
    ) {
      setSubErrorTipVisible(false);
    }
  }, [subscribeStatus]);

  const connectText = useMemo(() => {
    if (subscribeStatus === "success") {
      console.log("connectType-->", connectType);
      return connectType === "single" ? "连麦中" : "全员口播中";
    }
    return "";
  }, [connectType, subscribeStatus]);

  const listenRadioTimerEvent = () => {
    radioTimer.on("ended", (data: any) => {
      console.log(`${data ? data.name : "音频"}播放完成`);
      setRadioPlaying(false);
    });
    radioTimer.on("playing", (data: any) => {
      console.log(`${data ? data.name : "音频"}正在播放中`);
      setRadioPlaying(true);
    });
  };

  const listenInteractionEvent = useCallback(() => {
    // 系统广播事件
    interaction.on(
      InteractionEvents.BroadcastAudio,
      throttle(
        500,
        (data: any) => {
          if (boardcastSid.current !== data.sid) {
            boardcastSid.current = data.sid;
            playAudioElement(data);
          }
        },
        { noLeading: true }
      )
    );
    interaction.on(InteractionEvents.StopBroadcastAudio, stopPlayAudioElement);
    // 收到状态重置消息时，停止系统广播
    interaction.on(InteractionEvents.Reset, stopPlayAudioElement);
  }, []);

  const playAudioElement = useCallback((item: any) => {
    if (!item?.url) return;

    if (isIOS) {
      audioPlayerRef.current?.load({
        type: "URL",
        value: item.url,
        secondUrl: item.ossUrl,
      });
    } else if (audioRef.current) {
      loadAudio(item.url, item.ossUrl);
    }
  }, []);

  const loadAudio = useCallback((url: string, secondUrl?: string) => {
    currentSecondUrl.current = secondUrl; // 记录第二可用地址，无则说明不需要
    if (!audioRef.current) {
      return;
    }
    const el = audioRef.current;

    el.currentTime = 0;
    el.src = url;
    el.load();
    clearLoadTimer();
    loadTimer.current = window.setTimeout(() => {
      reporter.audioPlayFail({ src: url, from: "boardcast", event: "timeout" });
      loadSecondUrl();
    }, LoadTimeout);
  }, []);

  const clearLoadTimer = useCallback(() => {
    if (loadTimer.current) {
      window.clearTimeout(loadTimer.current);
    }
  }, []);

  const loadSecondUrl = useCallback(() => {
    if (currentSecondUrl.current) {
      loadAudio(currentSecondUrl.current);
    }
  }, []);

  const stopPlayAudioElement = useCallback(
    throttle(
      500,
      () => {
        interaction.feedbackStopBroadcastAudio();
        setAudioPlaying(false);
        boardcastSid.current = "";
        clearLoadTimer();

        if (isIOS) {
          audioPlayerRef.current?.stop();
          audioPlayerRef.current?.clear();
        } else {
          const audioEl = audioRef.current;
          if (!audioEl) {
            return;
          }

          audioEl.pause();
          audioEl.currentTime = 0;
          audioEl.src = "";
          audioEl.load();
        }
      },
      { noLeading: true }
    ),
    []
  );

  const unMutePublishVideo = () => {
    if (getSystemType() === "iOS" && publishVideoRef?.current) {
      publishVideoRef.current.muted = false;
      console.log("Unmute");
      setTimeout(() => {
        mutePublishVideo();
      }, 500);
    }
  };

  const mutePublishVideo = () => {
    if (getSystemType() === "iOS" && publishVideoRef?.current) {
      if (publishVideoRef.current) {
        publishVideoRef.current.muted = true;
        console.log("Mute again");
      }
    }
  };

  const initAudioPlayer = () => {
    audioPlayerRef.current = new AudioPlayer();

    audioPlayerRef.current.on(AudioPlayerEvents.Ended, () => {
      console.log("系统广播播放结束");
      setAudioPlaying(false);
    });

    audioPlayerRef.current.on(AudioPlayerEvents.Playing, () => {
      console.log("系统广播播放开始");
      interaction.feedbackBroadcastAudio(); // 需要反馈播放了
      setAudioPlaying(true);
    });
  };

  return (
    <Fragment>
      <div className={styles["status-displayer"]}>
        {radioPlaying ? (
          <div className={styles["status-item"]}>
            <VoiceSvg />
            <span>定时音频播放中</span>
          </div>
        ) : null}

        {audioPlaying ? (
          <div className={styles["status-item"]}>
            <BroadcastSvg />
            <span>系统广播中</span>
          </div>
        ) : null}

        {connectText ? (
          <div className={styles["status-item"]}>
            <BroadcastSvg />
            <span>{connectText}</span>
          </div>
        ) : null}

        {userInfo ? (
          <div className={styles["status-item"]}>
            考生：{userInfo.name}&nbsp;{PublishTextMap[publishStatus] || ""}
          </div>
        ) : null}

        <audio ref={audioRef} controls={false} autoPlay />
      </div>

      <div className={styles["error-wrap"]}>
        {pubErrorTipVisible ? (
          <div className={styles["error-item"]}>
            <span
              className={styles["close-btn"]}
              onClick={() => setPubErrorTipVisible(false)}
            >
              <CloseSvg />
            </span>
            音视频推送失败，请检查网络环境
          </div>
        ) : null}

        {subErrorTipVisible ? (
          <div className={styles["error-item"]}>
            <span
              className={styles["close-btn"]}
              onClick={() => setSubErrorTipVisible(false)}
            >
              <CloseSvg />
            </span>
            监考员音频拉取失败，请检查网络环境
          </div>
        ) : null}
      </div>
    </Fragment>
  );
}

export default StatusDisplayer;
