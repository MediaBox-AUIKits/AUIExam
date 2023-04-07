import {
  CloseSvg,
  LeftOutlineSvg,
  RightOutlineSvg,
  VoiceSvg,
} from "@/assets/CustomIcon";
import { ExamContext } from "@/context/exam";
import { InteractionEvents } from "@/core";
import {
  SubscribeStatusEnum,
  UserPublishStatus,
} from "@/types";
import { reporter } from "@/utils/Reporter";
import { Button, message } from "antd";
import { Fragment, useContext, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import Placeholder from "../ExamineeBlock/Placeholder";
import Publish from "../rts/Publish";
import Subscribe from "../rts/Subscribe";
import styles from "./index.less";

const ConnectStatusMap: any = {
  not: "not",
  connecting: "发起连麦...",
  connected: "连麦成功！",
  failed: "连麦异常",
};

interface IProps {
  mainClassName: string;
  footerClassName: string;
}

function PersonContent(props: IProps) {
  const { mainClassName, footerClassName } = props;
  const { state, interaction, dispatch } = useContext(ExamContext);
  const { userInfo: selfInfo, userList, activeUser, groupJoined } = state;
  const [connecting, setConnecting] = useState<boolean>(false);
  const [connectInfoVisible, setConnectInfoVisible] = useState<boolean>(false);
  const [connectStatus, setConnectStatus] = useState<string>("not");
  const [subscribeUrl, setSubscribeUrl] = useState<string>("");
  const [subscribeStatus, setSubscribeStatus] = useState<string>(
    SubscribeStatusEnum.init
  );
  const [streamPublishStatus, setStreamPublishStatus] =
    useState<UserPublishStatus>(); // 订阅的流地址当前的推流状态

  const userIndex = useMemo(() => {
    if (!activeUser) {
      return -1;
    }
    return userList.indexOf(activeUser);
  }, [userList, activeUser]);

  const nextBtnVisible = useMemo(() => {
    return !connecting && userIndex !== -1 && userIndex < userList.length - 1;
  }, [connecting, userList, userIndex]);

  const prevBtnVisible = useMemo(() => {
    return !connecting && userIndex > 0;
  }, [connecting, userIndex]);

  useEffect(() => {
    setSubscribeUrl(activeUser ? activeUser.rtcPullUrl : "");
    setSubscribeStatus(SubscribeStatusEnum.init);
    setStreamPublishStatus(activeUser?.publishStatus);
  }, [activeUser]);

  useEffect(() => {
    const handleStreamStop = (data: any) => {
      if (data && activeUser && data.userId === activeUser.id) {
        setStreamPublishStatus(UserPublishStatus.stop);
      }
    };

    const handleStreamPublish = (data: any) => {
      if (data && activeUser && data.userId === activeUser.id) {
        setStreamPublishStatus(UserPublishStatus.start);
      }
    };

    // 这里要监听推断流消息的原因是，ExamState 里这个用户的推流状态改了，也不会触发当前 activeUser 的更新了
    interaction.on(InteractionEvents.StreamStop, handleStreamStop);
    interaction.on(InteractionEvents.StreamPublish, handleStreamPublish);

    return () => {
      interaction.remove(InteractionEvents.StreamStop, handleStreamStop);
      interaction.remove(InteractionEvents.StreamPublish, handleStreamPublish);
    };
  }, []);

  const toggleConnecting = (bool?: boolean) => {
    if (activeUser) {
      if (bool === false || connecting) {
        interaction.hangUpSingle(activeUser.id);
      }
    }
    setConnecting(!connecting);
    setConnectInfoVisible(!connecting);
    setConnectStatus("connecting");
  };

  const startCall = () => {
    if (activeUser) {
      const sid = uuidv4();
      interaction
        .callSingle(activeUser.id, sid)
        .then((res) => {
          const bool = !res || !res.length;
          reporter.callSingleResult(bool, sid);
          if (bool) {
            setConnectStatus("connected");
          } else {
            setConnectStatus("failed");
          }
        })
        .catch((err) => {
          console.log("连麦信令接口调用失败！", err);
          setConnectStatus("failed");
        });
    }
  };

  const handlePublishFail = () => {
    message.error(
      "推流失败，请先结束连麦，切换 WIFI/蜂窝网络，或切换设备后再重试！"
    );
    setConnectStatus("failed");
  };

  const gotoGrid = () => {
    // 若当前在连麦中，要先取消连麦
    if (connecting) {
      toggleConnecting();
    }
    dispatch({ type: "resetActiveUser" });
  };

  const gotoNext = () => {
    const info = userList[userIndex + 1];
    if (info) {
      dispatch({
        type: "setActiveUser",
        payload: info,
      });
    }
  };

  const gotoPrev = () => {
    const info = userList[userIndex - 1];
    if (info) {
      dispatch({
        type: "setActiveUser",
        payload: info,
      });
    }
  };

  const startPull = () => {
    if (activeUser) {
      setSubscribeUrl(activeUser.rtsPullUrl);
      setSubscribeStatus(SubscribeStatusEnum.init);
    }
  };

  return (
    <Fragment>
      <main className={mainClassName}>
        {subscribeUrl ? (
          <Subscribe
            videoStyle={{
              display:
                subscribeStatus === SubscribeStatusEnum.canplay
                  ? "block"
                  : "none",
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
            subscribeUrl={subscribeUrl}
            streamPublishStatus={streamPublishStatus}
            muted={false}
            controls={false}
            onSubscribeLoading={() => {
              console.log("大流正在拉流中");
              setSubscribeStatus(SubscribeStatusEnum.loading);
            }}
            onSubscribeRetryFailed={(type) => {
              console.log(
                `大流停止重试`,
                type === "signal"
                  ? "提示用户: 多次信令失败，请尝试更换设备、切换网络；如果仍无法解决问题，请联系管理员。"
                  : ""
              );
              setSubscribeUrl("");
              setSubscribeStatus(SubscribeStatusEnum.fail);
            }}
            onUdpFailed={() => {
              console.log(
                "UDP不通，提示用户：切换 WIFI/蜂窝网络，或切换设备；如果仍无法解决问题，请联系管理员。"
              );
            }}
            onCanplay={() => {
              console.log("大流播放成功");
              if (subscribeStatus !== SubscribeStatusEnum.canplay) {
                setSubscribeStatus(SubscribeStatusEnum.canplay);
              }
            }}
          />
        ) : null}

        <Placeholder
          status={subscribeStatus}
          name={activeUser?.name}
          wrapStyle={{ backgroundColor: "#000" }}
          onRetry={startPull}
        />

        {subscribeStatus === SubscribeStatusEnum.canplay && activeUser?.name ? (
          <div className={styles["examinee-name"]}>{activeUser.name}</div>
        ) : null}

        {prevBtnVisible ? (
          <div className={styles["prev-btn"]} onClick={gotoPrev}>
            <LeftOutlineSvg />
          </div>
        ) : null}

        {nextBtnVisible ? (
          <div className={styles["next-btn"]} onClick={gotoNext}>
            <RightOutlineSvg />
          </div>
        ) : null}

        {connecting ? (
          <Publish
            publishUrl={selfInfo ? selfInfo.rtcPushUrl : ""}
            onDeviceFailed={() => {
              message.error(
                "因无法启动麦克风自动结束连麦，请检查设备或浏览器中的权限"
              );
              toggleConnecting(false);
            }}
            onPublishOk={() => {
              console.log("发布成功");
              startCall();
            }}
            onPublishRetryFailed={() => {
              console.log(
                "提示用户：推流重试超过指定次数仍无法成功，请尝试更换网络或者设备；或联系管理员"
              );
              handlePublishFail();
            }}
            onUdpFailed={() => {
              console.log(
                "UDP不通，提示用户：切换 WIFI/蜂窝网络，或切换设备；如果仍无法解决问题，请联系管理员。"
              );
              handlePublishFail();
            }}
            videoStyle={{ display: "none" }}
          />
        ) : null}

        {connectInfoVisible ? (
          <div className={styles["connect-info-block"]}>
            <div
              className={styles["connect-info-close"]}
              onClick={() => {
                setConnectInfoVisible(false);
              }}
            >
              <CloseSvg />
            </div>
            <div className={styles["connect-info-content"]}>
              <VoiceSvg />
              {ConnectStatusMap[connectStatus]}
            </div>
          </div>
        ) : null}
      </main>

      <footer
        className={footerClassName}
        style={{ justifyContent: "flex-end" }}
      >
        <Button size="small" onClick={gotoGrid}>
          返回25宫格
        </Button>
        <Button
          size="small"
          type="primary"
          disabled={!groupJoined}
          onClick={() => toggleConnecting()}
        >
          {connecting ? "结束连麦" : "连麦"}
        </Button>
      </footer>
    </Fragment>
  );
}

export default PersonContent;
