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
  onRemoteStream: (stream: MediaStream) => void; // for audio mix
  onPlayEnd: () => void; // for stopping audio mix
}

function StatusDisplayer(props: IStatusDisplayer) {
  const { publishStatus, subscribeStatus, connectType, onRemoteStream, onPlayEnd } =
    props;
  const { state, radioTimer, interaction } = useContext(ExamContext);
  const { userInfo, groupJoined } = state;
  const [subErrorTipVisible, setSubErrorTipVisible] = useState<boolean>(false);
  const [pubErrorTipVisible, setPubErrorTipVisible] = useState<boolean>(false);
  const [radioPlaying, setRadioPlaying] = useState<boolean>(false);
  const [audioPlaying, setAudioPlaying] = useState<boolean>(false);
  const audioPlayerRef = useRef<AudioPlayer>();
  const boardcastSid = useRef<string>("");

  useEffect(() => {
    listenRadioTimerEvent();
    listenInteractionEvent();
    initAudioPlayer();

    return () => {
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
    if (subscribeStatus === SubscribeStatus.fail) {
      setSubErrorTipVisible(true);
    } else if (
      subscribeStatus === SubscribeStatus.success ||
      subscribeStatus === SubscribeStatus.disconnect
    ) {
      setSubErrorTipVisible(false);
    }
  }, [subscribeStatus]);

  useEffect(()=> {
    if (audioPlaying === false) {
      onPlayEnd();
    }
  }, [audioPlaying])

  useEffect(() => {
    if (radioPlaying === false) {
      onPlayEnd();
    }
  }, [radioPlaying])

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
    radioTimer.on('stream', (stream: MediaStream) => {
      console.log('receive stream from radioTimer(定时广播)', stream);
      onRemoteStream(stream);
    })
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
            playAudio(data);
          }
        },
        { noLeading: true }
      )
    );
    interaction.on(InteractionEvents.StopBroadcastAudio, stopPlayAudio);
    // 收到状态重置消息时，停止系统广播
    interaction.on(InteractionEvents.Reset, stopPlayAudio);
  }, []);

  const playAudio = useCallback((item: any) => {
    if (!item?.url) return;

    audioPlayerRef.current?.load({
      type: "URL",
      value: item.url,
      secondUrl: item.ossUrl,
    });
  }, []);

  const stopPlayAudio = useCallback(
    throttle(
      500,
      () => {
        interaction.feedbackStopBroadcastAudio();
        setAudioPlaying(false);
        boardcastSid.current = "";

        audioPlayerRef.current?.stop();
        audioPlayerRef.current?.clear();
      },
      { noLeading: true }
    ),
    []
  );

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

    audioPlayerRef.current.on(AudioPlayerEvents.Stream, (stream: MediaStream) => {
      onRemoteStream(stream);

      // FIXME: mock audio tag
      // const audioEl = document.createElement("audio");
      // audioEl.srcObject = stream;
      // audioEl.controls = true;
      // audioEl.style.position = "absolute";
      // audioEl.style.top = '50px';
      // audioEl.style.left = '0';
      // audioEl.style.zIndex = '9999';
      // audioEl.srcObject = stream;
      // audioEl.play();
      // console.log(audioEl, 'added.');
      // document.body.appendChild(audioEl);
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
