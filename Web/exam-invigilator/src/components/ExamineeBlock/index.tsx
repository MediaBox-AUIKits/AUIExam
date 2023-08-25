import { VolumeOffSvg, VolumeSvg } from "@/assets/CustomIcon";
import { ExamContext } from "@/context/exam";
import { InteractionEvents } from "@/core";
import { IUser, SubscribeStatusEnum } from "@/types";
import {
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Subscribe from "../rts/Subscribe";
import styles from "./index.less";
import Placeholder from "./Placeholder";

interface ExamineeBlockProps {
  info: IUser;
  connectTip?: React.ReactNode;
  onShow: (info: IUser) => void;
}

function ExamineeBlock(props: ExamineeBlockProps) {
  const { info, connectTip, onShow } = props;
  const { interaction, state, dispatch } = useContext(ExamContext);
  const { activeUser } = state;
  const [subscribeUrl, setSubscribeUrl] = useState<string>("");
  const [subscribeStatus, setSubscribeStatus] = useState<string>(
    SubscribeStatusEnum.init
  );
  const retryTimer = useRef<number>();
  const streamPublishTimer = useRef<number>();
  const canplay = useMemo(
    () => subscribeStatus === SubscribeStatusEnum.canplay,
    [subscribeStatus]
  );
  const muted = useMemo(() => {
    if (activeUser) {
      return true;
    }
    return info.muted;
  }, [activeUser, info]);

  useEffect(() => {
    // 初始化时设置拉流地址
    startPull();

    function handleStreamStop(data: any) {
      if (data && data.userId === info.id) {
        console.log(`${info.name} 断流了`);
        if (streamPublishTimer.current) {
          window.clearInterval(streamPublishTimer.current);
          streamPublishTimer.current = undefined;
        }
        stopPull();
      }
    }

    function handleStreamPublish(data: any) {
      if (data && data.userId === info.id) {
        if (streamPublishTimer.current) {
          window.clearInterval(streamPublishTimer.current);
        }
        // 推流成功无法立即拉到流，延迟一下
        streamPublishTimer.current = window.setTimeout(() => {
          console.log(`${info.name} 推流了`);
          startPull();
          streamPublishTimer.current = undefined;
        }, 2000);
      }
    }

    interaction.on(InteractionEvents.StreamStop, handleStreamStop);
    interaction.on(InteractionEvents.StreamPublish, handleStreamPublish);

    return () => {
      interaction.remove(InteractionEvents.StreamStop, handleStreamStop);
      interaction.remove(InteractionEvents.StreamPublish, handleStreamPublish);
    };
  }, []);

  const clearRetryTimer = () => {
    if (retryTimer.current) {
      window.clearInterval(retryTimer.current);
      retryTimer.current = undefined;
    }
  };

  const updateSubscribeUrl = (url: string) => {
    // 通过加上 t 参数触发更新
    if (url) {
      const index = url.indexOf("?");
      const t = `t=${Date.now()}`;
      if (index === -1) {
        url += `?${t}`;
      } else if (index !== url.length - 1) {
        url += `&${t}`;
      } else {
        url += t;
      }
    }
    setSubscribeUrl(url);
  };

  const startPull = () => {
    clearRetryTimer();
    const pullUrl = info.isMainMonitor ? info.pcRtsPullUrl : info.rtsPullUrl;
    updateSubscribeUrl(pullUrl);
    setSubscribeStatus(SubscribeStatusEnum.init);
  };

  useEffect(() => {
    startPull();
  }, [info.isMainMonitor])

  const stopPull = () => {
    // 重置订阅url，开启定时 30S 后重试
    updateSubscribeUrl("");
    setSubscribeStatus(SubscribeStatusEnum.fail);
    clearRetryTimer();
    retryTimer.current = window.setTimeout(() => {
      startPull();
    }, 30000);
  };

  const toggleMuted = () => {
    const userInfo = {
      ...info,
      muted: !info.muted,
    };
    dispatch({ type: "updateUserListItem", payload: userInfo });
  };

  const handleCanplay = () => {
    if (!canplay) {
      console.log(`考生 ${info.id} 已经开始播放`);
      setSubscribeStatus(SubscribeStatusEnum.canplay);
    }
  };

  const toggleMonitor = () => {
    const userInfo = {
      ...info,
      isMainMonitor: !info.isMainMonitor,
    };
    dispatch({ type: "updateUserListItem", payload: userInfo });
  }

  return (
    <div className={styles.examinee} onDoubleClick={() => onShow(info)}>
      {subscribeUrl ? (
        <Subscribe
          className={styles.video}
          subscribeUrl={subscribeUrl}
          controls={false}
          muted={muted}
          streamPublishStatus={info.publishStatus}
          videoStyle={canplay ? undefined : { display: "none" }}
          onSubscribeLoading={() => {
            console.log(`考生 ${info.id} 正在拉流中`);
            setSubscribeStatus(SubscribeStatusEnum.loading);
          }}
          onSubscribeRetryFailed={(type) => {
            console.log(
              `考生 ${info.id} 停止尝试拉流`,
              type === "signal"
                ? "提示用户: 多次信令失败，请尝试更换设备、切换网络；如果仍无法解决问题，请联系管理员。"
                : ""
            );
            stopPull();
          }}
          onCanplay={handleCanplay}
          onUdpFailed={() => {
            console.log(
              "UDP不通，提示用户：切换 WIFI/蜂窝网络，或切换设备；如果仍无法解决问题，请联系管理员。"
            );
          }}
        />
      ) : null}

      <div className={styles["toggle-monitor"]} onClick={toggleMonitor}>
        切换{info.isMainMonitor ? '副' : '主'}监控画面
      </div>

      {connectTip ? (
        <div className={styles["connect-tip"]}>{connectTip}</div>
      ) : null}

      {canplay ? (
        <Fragment>
          <span className={styles.volume} onClick={toggleMuted}>
            {info.muted ? <VolumeOffSvg /> : <VolumeSvg />}
            <span>静音{info.muted ? "中" : ""}</span>
          </span>

          <span className={styles.name}>{info.name}</span>
        </Fragment>
      ) : null}

      <Placeholder
        status={subscribeStatus}
        name={info.name}
        onRetry={startPull}
      />
    </div>
  );
}

export default ExamineeBlock;
