import { ExamContext } from "@/context/exam";
import { InteractionEvents } from "@/core";
import {
  IAudioFile,
  IUser,
  UserInteractiveStatus,
  UserRoleEnum,
} from "@/types";
import { reporter } from "@/utils/Reporter";
import services from "@/utils/services";
import { Button, Divider, message } from "antd";
import {
  Fragment,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { throttle } from "throttle-debounce";
import { v4 as uuidv4 } from "uuid";
import ExamineeBlock from "../ExamineeBlock";
import Publish from "../rts/Publish";
import SystemBroadcast from "../SystemBroadcast";
import BroadcastStatus from "./BroadcastStatus";
import styles from "./index.less";

interface IProps {
  mainClassName: string;
  footerClassName: string;
}

const PageSize = 25;
const ConnectTipMap = {
  loading: <span>连接中</span>,
  success: <span className={styles["connect-success"]}>连接成功</span>,
  fail: <span className={styles["connect-fail"]}>连接异常</span>,
};
const InteractiveStatusTipMap: {
  [x in UserInteractiveStatus]: ReactNode;
} = {
  EnterRoom: <span className={styles["connect-success"]}>进入考场</span>,
  PubSuccess: <span className={styles["connect-success"]}>推流成功</span>,
  PubFail: <span className={styles["connect-fail"]}>推流失败</span>,
};

function GridContent(props: IProps) {
  const { mainClassName, footerClassName } = props;
  const { state, interaction, dispatch } = useContext(ExamContext);
  const {
    userInfo: selfInfo,
    userList,
    pageNum,
    role,
    activeUser,
    groupJoined,
    roomInfo,
  } = state;
  const [broadcasting, setBroadcasting] = useState<boolean>(false);
  const [showSystemBroadcast, setShowSystemBroadcast] =
    useState<boolean>(false);
  const [broadcastAudioData, setBroadcastAudioData] = useState<IAudioFile>();
  const [connectSuccessIds, setConnectSuccessIds] = useState<string[]>([]); // 连接成功的用户id数组
  const [connectFailIds, setConnectFailIds] = useState<string[]>([]); // 连接失败的用户id数组

  const connectSuccessIdSet: Set<string> = useMemo(() => new Set(), []);
  const interactivePayloadSet: Set<{
    status: UserInteractiveStatus;
    userId: string;
  }> = useMemo(() => new Set(), []); // 缓存用户主动状态
  const streamStopTimerMap: Map<string, number> = useMemo(() => new Map(), []); // 用于长时间断流后，更新 interactiveStatus
  const connectUpdateTimer = useRef<number>();

  const gridList = useMemo(() => {
    const start = pageNum * PageSize;
    return userList.slice(start, start + PageSize);
  }, [userList, pageNum]);

  const nextBtnVisible = useMemo(() => {
    return (pageNum + 1) * PageSize < userList.length;
  }, [userList, pageNum]);

  const prevBtnVisible = useMemo(() => {
    return pageNum > 0;
  }, [pageNum]);

  const examineeIds = useMemo(() => {
    return userList.map((item) => item.id);
  }, [userList]);

  const wrapStyle = useMemo(
    () => (activeUser ? { display: "none" } : undefined),
    [activeUser]
  );

  useEffect(() => {
    const handleConnectFeedback = (senderId: string) => {
      connectSuccessIdSet.add(senderId);
      // 节流
      if (!connectUpdateTimer.current) {
        connectUpdateTimer.current ===
          window.setTimeout(() => {
            setConnectSuccessIds([...connectSuccessIdSet]);
            connectUpdateTimer.current = undefined;
          }, 1000);
      }
    };

    const handleStreamStop = (data: any) => {
      if (data && data.userId) {
        clearStreamStopTimer(data.userId);
        // 收到断流消息后 1 分钟收不到服务端推流、用户主动发的入会、推流失败、推流成功
        // 将直接更新 InteractiveStatus 为 推流失败，解决用户退出后，状态不再更新的问题
        const timer = window.setTimeout(() => {
          interactivePayloadSet.add({
            userId: data.userId,
            status: UserInteractiveStatus.PubFail,
          });
          dispatchInteractiveStatus();
        }, 60000);
        streamStopTimerMap.set(data.userId, timer);
      }
    };

    const handleStreamPublish = (data: any) => {
      if (data && data.userId) {
        clearStreamStopTimer(data.userId);
      }
    };

    const handleEnterRoom = (userId: string) => {
      clearStreamStopTimer(userId);
      interactivePayloadSet.add({
        userId,
        status: UserInteractiveStatus.EnterRoom,
      });
      dispatchInteractiveStatus();
    };
    const handlePubFail = (userId: string) => {
      clearStreamStopTimer(userId);
      interactivePayloadSet.add({
        userId,
        status: UserInteractiveStatus.PubFail,
      });
      dispatchInteractiveStatus();
    };
    const handlePubSuccess = (userId: string) => {
      clearStreamStopTimer(userId);
      interactivePayloadSet.add({
        userId,
        status: UserInteractiveStatus.PubSuccess,
      });
      dispatchInteractiveStatus();
    };

    interaction.on(
      InteractionEvents.BroadcastLiveFeedback,
      handleConnectFeedback
    );
    interaction.on(
      InteractionEvents.BroadcastAudioFeedback,
      handleConnectFeedback
    );
    // 之所以在这里使用，是为了收到断流消息长时间未推流，而 InteractiveStatus 不能更新的问题
    interaction.on(InteractionEvents.StreamStop, handleStreamStop);
    interaction.on(InteractionEvents.StreamPublish, handleStreamPublish);
    // 考生主动通知状态事件
    interaction.on(InteractionEvents.EnterRoom, handleEnterRoom);
    interaction.on(InteractionEvents.PubFail, handlePubFail);
    interaction.on(InteractionEvents.PubSuccess, handlePubSuccess);

    return () => {
      interaction.remove(
        InteractionEvents.BroadcastLiveFeedback,
        handleConnectFeedback
      );
      interaction.remove(
        InteractionEvents.BroadcastAudioFeedback,
        handleConnectFeedback
      );
      interaction.remove(InteractionEvents.StreamStop, handleStreamStop);
      interaction.remove(InteractionEvents.StreamPublish, handleStreamPublish);
      interaction.remove(InteractionEvents.EnterRoom, handleEnterRoom);
      interaction.remove(InteractionEvents.PubFail, handlePubFail);
      interaction.remove(InteractionEvents.PubSuccess, handlePubSuccess);
    };
  }, []);

  const clearStreamStopTimer = useCallback((userId: string) => {
    const item = streamStopTimerMap.get(userId);
    if (item) {
      window.clearTimeout(item);
      streamStopTimerMap.delete(userId);
    }
  }, []);

  // 节流
  const dispatchInteractiveStatus = useCallback(
    throttle(
      1000,
      () => {
        const arr = [...interactivePayloadSet];
        interactivePayloadSet.clear();
        dispatch({
          type: "updateUserInteractiveStatus",
          payload: arr,
        });
      },
      { noLeading: true }
    ),
    []
  );

  const showDetail = (info: IUser) => {
    if (role !== UserRoleEnum.invigilator || broadcasting) {
      return;
    }
    dispatch({
      type: "setActiveUser",
      payload: info,
    });
  };

  const muteAll = () => {
    const list = userList.map((item) => ({
      ...item,
      muted: true,
    }));
    dispatch({ type: "updateUserList", payload: list });
  };

  const resetConnectdata = () => {
    setConnectFailIds([]);
    setConnectSuccessIds([]);
    connectSuccessIdSet.clear();
  };

  const toggleBroadcastLive = (bool?: boolean) => {
    if (bool === false || broadcasting) {
      // 重置
      resetConnectdata();
      updateBoardcastLiveStatus(0);
      interaction.stopBroadcastLive(examineeIds).catch((err) => {
        console.log("停止口播信令失败", err);
      });
      setBroadcasting(false);
    } else {
      setBroadcasting(true);
    }
  };

  const toggleShowBroadcast = () => {
    setShowSystemBroadcast(!showSystemBroadcast);
  };

  const handleFailIds = (ids: string[]) => {
    // 因有无sid的反馈消息，所以有可能存在返回失败id数组中有成功的了，所以要处理
    const arr: string[] = [];
    ids.forEach((id) => {
      if (!connectSuccessIdSet.has(id)) {
        arr.push(id);
      }
    });
    return arr;
  };

  // 更新服务端口播状态
  const updateBoardcastLiveStatus = (status: number) => {
    if (roomInfo) {
      services
        .updateRoomAudioStatus(roomInfo.id, status)
        .then(() => {
          //
        })
        .catch((err) => {
          reporter.updateBoardcastLiveStatusError(err);
        });
    }
  };

  const sendBroadcastLive = () => {
    updateBoardcastLiveStatus(1);

    const sid = uuidv4();
    interaction
      .broadcastLive(examineeIds, sid)
      .then((res) => {
        // 返回的是一个id数组，是没有收到反馈的用户
        console.log("broadcastLive", res);
        const arr = handleFailIds(res);
        setConnectFailIds(arr);
        reporter.broadcastLiveResult(arr, sid);
      })
      .catch((err) => {
        message.error("全员口播失败，请关闭后再重试");
        console.log("开始口播信令失败", err);
      });
  };

  const onAudioPlay = (data: any) => {
    setBroadcastAudioData(data);
    setShowSystemBroadcast(false);
    const sid = uuidv4();
    return interaction
      .broadcastAudio(examineeIds, data, sid)
      .then((res) => {
        // 返回的是一个id数组，是没有收到反馈的用户
        const arr = handleFailIds(res);
        setConnectFailIds(arr);
        reporter.broadcastAudioResult(arr, data, sid);
      })
      .catch((err) => {
        console.log("系统广播错误", err);
        message.error("系统广播错误，请重试");
      });
  };

  const stopBroadcastAudio = (type: string) => {
    resetConnectdata();
    setBroadcastAudioData(undefined);
    // 自动停止的需要通知学生
    if (type === "handle") {
      interaction.stopBroadcastAudio(examineeIds).catch((err) => {
        console.log("取消系统广播错误", err);
      });
    }
  };

  const handlePublishFail = () => {
    message.error(
      "推流失败，请先结束口播，切换 WIFI/蜂窝网络，或切换设备后再重试！"
    );
  };

  const getConnectTip = (
    userId: string,
    interactiveStatus?: UserInteractiveStatus
  ) => {
    if (!broadcasting && !broadcastAudioData) {
      // 未口播、系统广播时展示考生主动上报的状态
      if (interactiveStatus) {
        return InteractiveStatusTipMap[interactiveStatus];
      }
      return undefined;
    }
    // 注意：要先判断成功中是否有
    if (connectSuccessIds.includes(userId)) {
      return ConnectTipMap.success;
    }
    if (connectFailIds.includes(userId)) {
      return ConnectTipMap.fail;
    }
    return ConnectTipMap.loading;
  };

  return (
    <Fragment>
      <main className={mainClassName} style={wrapStyle}>
        <div className={styles.container}>
          {gridList.map((item) => {
            return (
              <ExamineeBlock
                key={item.id}
                info={item}
                connectTip={getConnectTip(item.id, item.interactiveStatus)}
                onShow={showDetail}
              />
            );
          })}
        </div>
        <SystemBroadcast
          show={showSystemBroadcast}
          onCancel={toggleShowBroadcast}
          onAudioPlay={onAudioPlay}
        />
      </main>

      <footer className={footerClassName} style={wrapStyle}>
        <BroadcastStatus
          living={broadcasting}
          audioData={broadcastAudioData}
          onResetAudioData={stopBroadcastAudio}
        />

        <div className={styles.actions}>
          <Button size="small" onClick={muteAll}>
            全员静音
          </Button>
          {role === UserRoleEnum.invigilator ? (
            <Fragment>
              <Button
                size="small"
                disabled={!groupJoined || !!broadcastAudioData}
                className={
                  broadcasting ? styles["broadcasting-btn"] : undefined
                }
                onClick={() => toggleBroadcastLive()}
              >
                {broadcasting ? "停止口播" : "全员口播"}
              </Button>
              <Button
                size="small"
                onClick={toggleShowBroadcast}
                disabled={!groupJoined || broadcasting}
                className={
                  !!broadcastAudioData ? styles["broadcasting-btn"] : undefined
                }
              >
                系统广播
              </Button>
            </Fragment>
          ) : null}
          {prevBtnVisible || nextBtnVisible ? (
            <Divider type="vertical" className={styles["divider"]} />
          ) : null}
          {prevBtnVisible ? (
            <Button
              size="small"
              type="primary"
              onClick={() => dispatch({ type: "prevPage" })}
            >
              上一页
            </Button>
          ) : null}
          {nextBtnVisible ? (
            <Button
              size="small"
              type="primary"
              onClick={() => dispatch({ type: "nextPage" })}
            >
              下一页
            </Button>
          ) : null}
        </div>
      </footer>

      {broadcasting ? (
        <Publish
          publishUrl={selfInfo ? selfInfo.rtcPushUrl : ""}
          onDeviceFailed={() => {
            message.error(
              "因无法启动麦克风自动结束口播，请检查设备或浏览器中的权限"
            );
            toggleBroadcastLive(false);
          }}
          onPublishOk={() => {
            console.log("发布成功");
            sendBroadcastLive(); // 向考生发送口播事件
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
    </Fragment>
  );
}

export default GridContent;
