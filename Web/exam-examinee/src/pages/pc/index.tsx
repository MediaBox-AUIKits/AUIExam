import {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { InteractionEvents } from "@/core";
import Publish from "@/components/rts/Publish";
import Subscribe from "@/components/rts/Subscribe";
import SubscribeVideo from "@/components/rts/SubscribeVideo";
import StatusDisplayer from "@/components/StatusDisplayer";
import CheatDetection from "@/components/CheatDetection";
import {
  SubscribeVideoStatusEnum,
  PublishStatus,
  RoomStatusEnum,
  SubscribeStatus
} from "@/types";
import { RefreshSvg } from '@/assets/CustomIcon';
import { checkH264, getParamFromSearch, getSystemType } from "@/utils/common";
import { MockRoomId, MockCurrentUserId } from "@/utils/LocalMock";
import services from "@/utils/services";
import { reporter } from "@/utils/Reporter";
import { formatMilliDuration } from "@/utils/format";
import { EPublisherStatus } from "@/core";
import { Modal, QRCode } from 'antd';
import { throttle } from "throttle-debounce";
import { ExamContext } from "@/context/exam";
import { history } from "umi";
import styles from "./index.less";

type ConnectType = "" | "single" | "broadcast" | "init_broadcast";

const PCExamPage: React.FC = () => {
  const [duration, setDuration] = useState(0);
  const { state, recorder, interaction, radioTimer, dispatch } =
    useContext(ExamContext);
  const { roomInfo, userInfo, deviceInfo } = state;
  // 用于区分一对一通话、全员口播、初始化时同步口播
  const [connectType, setConnectType] = useState<ConnectType>("");
  const [enableSubscribe, setEnableSubscribe] = useState(false);
  // 拉自己的移动端视频流
  const [subscribeVideoUrl, setSubscribeVideoUrl] = useState<string>("");
  // 连麦、口播拉监考端音频流
  const [subscribeUrl, setSubscribeUrl] = useState<string>("");
  // 拉考生移动端的视频流状态
  const [subscribeVideoStatus, setSubscribeVideoStatus] = useState<SubscribeVideoStatusEnum>(
    SubscribeVideoStatusEnum.init
  );
  // 考生pc连麦状态
  const [subscribeStatus, setSubscribeStatus] = useState<SubscribeStatus>(
    SubscribeStatus.disconnect
  );
  const [publishStatus, setPublishStatus] = useState<PublishStatus>(
    PublishStatus.init
  );
  const [showUdpConnectionWarning, setShowUdpConnectionWarning] =  // 后续todo showUdpConnectionWarning交互
    useState(false);
  const [isPullMobileVideoSuccess, setIsPullMobileVideoSuccess] = useState(true);

  const [detectResult, setDetectResult] = useState<any>();
  const [pcDetectConfig, setPcDetectConfig] = useState<any>();

  const debugInfoRef = useRef<Record<string, any>>();
  const playAfterCaptureRef = useRef<boolean>(false);
  const activeAutoReloadRef = useRef<boolean>(false);
  const streamPublishTimer = useRef<number>();
  const invigilator = useRef<any>();
  const timer = useRef<number>();
  const callSid = useRef<string>(""); // 一对一
  const liveSid = useRef<string>(""); // 全员口播消息中的sid
  const retryTimer = useRef<number>();

  const startTime = useMemo(() => Date.now(), []);

  const canplay = useMemo(
    () => subscribeVideoStatus === SubscribeVideoStatusEnum.canplay,
    [subscribeVideoStatus]
  );

  const durationText = useMemo(() => {
    return formatMilliDuration(duration, false);
  }, [duration]);

  useEffect(() => {
    try {
      checkSecure();
      checkSdp();
    } catch (error) {
      //
    }

    listenInteractionEvent();
    initPage();

    return () => {
      window.clearInterval(timer.current);
      interaction.logout();
      radioTimer.destroy();
    };
  }, []);

  useEffect(() => {
    startPull();
  }, [userInfo])

  const initPage = async () => {
    const mock = getParamFromSearch("mock");
    let roomId = getParamFromSearch("roomId");
    let userId = getParamFromSearch("userId");
    let token = getParamFromSearch("token");
    if (mock === "1") {
      roomId = roomId || MockRoomId;
      userId = userId || MockCurrentUserId;
      token = token || "1fTyFwuS3P8EqU04sP8Lru9LeayXxBYb";
    }
    if (!roomId || !userId || !token) {
      reporter.illegalInitialParams({ roomId, userId, token });
      return;
    }
    services.setHeaderAuthorization(token);

    try {
      // 获取考场信息
      const roomInfoRes: any = await services.getRoomInfo(roomId);
      // 获取考试信息
      const examInfoRes: any = await services.getExamInfo(roomInfoRes.examId);
      // 获取个人信息
      const userInfoRes: any = await services.getUserInfo(userId, roomId);
      // 获取教师列表
      const teacherRes: any = await services.getUserInfo(
        roomInfoRes.createTeacher,
        roomId
      );

      reporter.updateCommonParams({
        examid: roomInfoRes.examId,
        roomname: roomInfoRes.name,
        username: userInfoRes.name,
      });

      // 保存
      dispatch({
        type: "update",
        payload: {
          roomInfo: roomInfoRes,
          examInfo: examInfoRes,
          userInfo: userInfoRes,
          invigilator: teacherRes,
        },
      });

      invigilator.current = teacherRes;
      console.log(roomId, userInfoRes, roomInfoRes, examInfoRes);
      // 如果考场结束直接跳转
      if (roomInfoRes.status === RoomStatusEnum.end) {
        gotoEnded();
        return;
      }

      // 初始化定时音频
      radioTimer.init(examInfoRes.radioInfo);
      // 初始化本地录制
      if (CONFIG.localRecorder.enable) {
        recorder
          .init({
            examId: examInfoRes.id,
            roomId: roomInfoRes.id,
            userId: userInfoRes.id,
            fetchSTSData: services.getSTSData.bind(services),
          })
          .catch(() => {});
      }
      // 设置反馈接收的userId，即监考老师
      interaction.setAnswerUserId(teacherRes.id);

      joinGroup(roomInfoRes.imGroupId, roomInfoRes.id, 'pc_' + userInfoRes.id).then(
        () => {
          // 加入阿里云IM组成功后，开始同步检查状态
          checkAllStatus(roomInfoRes.audioStatus);
        }
      );

      // 初始化成功后再计时
      timer.current = window.setInterval(() => {
        setDuration(Date.now() - startTime);
      }, 500);
    } catch (error) {
      console.log("页面初始失败！", error);
      reporter.initError(error);
    }
  };

  const checkSecure = () => {
    if (!window.isSecureContext) {
      Modal.error({
        content: '当前环境非安全环境将无法获取媒体设备，线上环境请使用 https 协议，本地开发请使用 localhost！',
      });
    }
  };

  const checkSdp = () => {
    checkH264((res: any) => {
      reporter.sdpSupportH264({ res });
    });
  };

  useEffect(() => {
    function handleStreamStop(data: any) {
      if (data && data.userId === userInfo?.id) {
        console.log(`${userInfo?.name} 断流了`);
        if (streamPublishTimer.current) {
          window.clearInterval(streamPublishTimer.current);
          streamPublishTimer.current = undefined;
        }
        stopPull();
      }
    }

    function handleStreamPublish(data: any) {
      if (data && data.userId === userInfo?.id) {
        if (streamPublishTimer.current) {
          window.clearInterval(streamPublishTimer.current);
        }
        // 推流成功无法立即拉到流，延迟一下
        streamPublishTimer.current = window.setTimeout(() => {
          console.log(`${userInfo?.name} 推流了`);
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

  const gotoEnded = () => {
    recorder.stop(true);
    history.push("/ended");
  };

  const checkAllStatus = (broadcastStatus: number) => {
    // 若当前考场正在口播中，需要开启拉流
    if (broadcastStatus === 1 && invigilator.current) {
      if (getSystemType() === "iOS") {
        playAfterCaptureRef.current = true;
      } else {
        doPlayBroacast();
      }
    }
  };

  const doPlayBroacast = () => {
    if (invigilator.current && invigilator.current.rtcPullUrl) {
      setConnectType("init_broadcast");
      setSubscribeUrl(invigilator.current.rtcPullUrl);
      setEnableSubscribe(true);
    }
  };

  const listenInteractionEvent = useCallback(() => {
    interaction.on(
      InteractionEvents.StartCalling,
      throttle(
        500,
        (eventData: any) => {
          if (eventData.sid === callSid.current) {
            return;
          }
          setConnectType("single");
          callSid.current = eventData.sid;
          if (invigilator.current) {
            // 通话事件
            setSubscribeUrl(invigilator.current.rtcPullUrl);
            setEnableSubscribe(true);
          }
        },
        { noLeading: true }
      )
    );
    interaction.on(
      InteractionEvents.EndCalling,
      throttle(
        500,
        () => {
          callSid.current = "";
          // 结束通话
          setEnableSubscribe(false);
          setSubscribeStatus(SubscribeStatus.disconnect);
          // 回复
          interaction.answerCallDisconnected();
        },
        { noLeading: true }
      )
    );
    // 全员口播开始
    interaction.on(
      InteractionEvents.StartBroadcastLive,
      throttle(
        500,
        (eventData: any) => {
          if (eventData.sid === liveSid.current) {
            return;
          }
          liveSid.current = eventData.sid;
          setConnectType("broadcast");
          if (invigilator.current) {
            // 通话事件
            setSubscribeUrl(invigilator.current.rtcPullUrl);
            setEnableSubscribe(true);
          }
        },
        { noLeading: true }
      )
    );
    // 全员口播结束
    interaction.on(
      InteractionEvents.StopBroadcastLive,
      throttle(
        500,
        () => {
          // 结束通话
          liveSid.current = "";
          setEnableSubscribe(false);
          setSubscribeStatus(SubscribeStatus.disconnect);
          interaction.feedbackStopBroadcastLive();
          playAfterCaptureRef.current = false;
        },
        { noLeading: true }
      )
    );

    // 考试结束，停止本地录制，跳转结束页
    interaction.on(InteractionEvents.EndRoom, gotoEnded);

    // 重置连麦、口播状态
    interaction.on(
      InteractionEvents.Reset,
      throttle(
        500,
        () => {
          callSid.current = "";
          liveSid.current = "";
          setEnableSubscribe(false);
          setSubscribeStatus(SubscribeStatus.disconnect);
        },
        { noLeading: true }
      )
    );
  }, []);

  const joinGroup = async (groupId: string, roomId: string, userId: string) => {
    function join(token: string) {
      return new Promise(async(resove, reject) => {
        try {
          await interaction.auth(token);
          await interaction.joinGroup(groupId, userId);
          reporter.joinGroupSuccess(groupId);
          resove('');
        } catch (error: any) {
          reporter.joinGroupError({
            groupId,
            ...(error ? (error.body || error) : {}),
          });
          reject();
        }
      });
    }
    try {
      const res: any = await services.getInteractionToken(roomId, userId);
      const promises: Promise<any>[] = [];
      if (CONFIG.rongCloudIm.enable) {
        if (res.rongToken) {
          promises.push(interaction.connectRC(res.rongToken, groupId));
        } else {
          reporter.rongIMError({ code: -1, message: '接口未返回融云token' });
        }
      }
      const token = res.access_token || res.accessToken;
      if (!token) {
        reporter.joinGroupError({
          groupId,
          code: -1,
          message: '互动消息token字符串异常',
        });
      } else {
        promises.push(join(token));
      }
      if (!promises.length) {
        throw {code: -1, message: '接口数据异常，无阿里云、融云 IM Token'};
      }

      Promise.allSettled(promises).then((results) => {
        // 有一个连接成功都算成功
        const bool = results.some((result) => result.status === 'fulfilled');
        // 更新是否已加入聊天组
        dispatch({ type: 'update', payload: { groupJoined: bool }});
      });
      
    } catch (error: any) {
      console.log('加入消息组错误', error);
      reporter.joinGroupError({
        groupId,
        ...(error ? (error.body || error) : {}),
      });
    }
  };

  const handleCanplay = () => {
    if (!canplay) {
      console.log(`考生 ${userInfo?.id} 已经开始播放`);
      setSubscribeVideoStatus(SubscribeVideoStatusEnum.canplay);
    }
  };

  const stopPull = () => {
    setIsPullMobileVideoSuccess(false);
    // 重置订阅url，开启定时 30S 后重试
    updateSubscribeVideoUrl("");
    setSubscribeVideoStatus(SubscribeVideoStatusEnum.fail);
    clearRetryTimer();
    retryTimer.current = window.setTimeout(() => {
      startPull();
    }, 30000);
  };

  const startPull = () => {
    setIsPullMobileVideoSuccess(true);
    clearRetryTimer();
    const pullUrl = userInfo?.rtsPullUrl;
    updateSubscribeVideoUrl(pullUrl as string);
    setSubscribeVideoStatus(SubscribeVideoStatusEnum.init);
  };

  const clearRetryTimer = () => {
    if (retryTimer.current) {
      window.clearInterval(retryTimer.current);
      retryTimer.current = undefined;
    }
  };

  const handleSubscribeFail = () => {
    setEnableSubscribe(false);
    setSubscribeStatus(SubscribeStatus.fail);
    setSubscribeUrl("");
    callSid.current = "";
    liveSid.current = "";
  };

  const updateSubscribeVideoUrl = (url: string) => {
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
    setSubscribeVideoUrl(url);
  };

  const getQrCodeUrl = () => (
    // 本地开发调试时，采用umirc配置的pagePath；其他情况采用当前url的origin+pathname
    `
      ${
        (location.href.includes('localhost') || location.href.includes('127.0.0.1')) ? CONFIG.pagePath : location.origin + location.pathname
      }?roomId=${getParamFromSearch("roomId")}&userId=${getParamFromSearch("userId")}&token=xxxx&dd_full_screen=true&dd_orientation=landscape
    `
  )

  // 处理老师多媒体流可以播放的事件，需要做节流，防止未知原因的大量触发
  const handleTeacherStreamCanplay = throttle(10000, () => {
    setSubscribeStatus(SubscribeStatus.success);
    console.log("通知业务系统学生已经拉到老师的流，可以开始通话");
    // 回复老师端已联通
    if (connectType === "single") {
      interaction.answerCallConnected();
    } else if (connectType === "broadcast") {
      interaction.feedbackBroadcastLive();
    } else if (connectType === "init_broadcast") {
      interaction.feedbackBroadcastLive(true);
    }
  });
  
  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>{roomInfo ? roomInfo.name : ""}</div>
        {duration ? (
          <span className={styles.duration}>{durationText}</span>
        ) : null}
        <div className={styles.username}>{userInfo?.name}</div>
      </div>

      <main className={styles.content}>
        <div className={styles['left-sec']}>
          {userInfo ? (
            <div className={styles['left-publish']}>
              {/* TODO: 连麦混流，同步移动端的实现 */}
              <Publish
                className={styles.previewer}
                publishUrl={userInfo.pcRtcPushUrl}
                needSwitcher={false}
                controls={false}
                onCreateStream={() => {
                  activeAutoReloadRef.current = true;
                  if (playAfterCaptureRef.current) {
                    doPlayBroacast();
                  }
                }}
                onPublishOk={() => {
                  console.log("推流成功");
                  setPublishStatus(PublishStatus.success);
                }}
                onPublishRetryFailedNotice={() => {
                  setPublishStatus(PublishStatus.fail);
                }}
                onTraceId={(traceId, url) => {
                  console.log("on traceId", traceId, url);
                  debugInfoRef.current = { pubTraceId: traceId, pubUrl: url };
                }}
                onUnderFlow={() => {
                  setPublishStatus(PublishStatus.fail);
                }}
                onResume={() => {
                  setPublishStatus(PublishStatus.success);
                }}
                onStatusChange={(status: EPublisherStatus) => {
                  if (status === EPublisherStatus.Unavailable) {
                    setShowUdpConnectionWarning(true);
                    setTimeout(() => {
                      setShowUdpConnectionWarning(false);
                    }, 10 * 1000);
                  }
                }}
                deviceInfo={deviceInfo}
              />
              <div className={styles['left-video-info']}>主摄像头画面</div>
            </div>
          ) : null}

          <div className={styles['left-subscribe-video-sec']}>
            {subscribeVideoUrl && isPullMobileVideoSuccess && (
              <div className={styles['left-subscribe-video']}>
                <SubscribeVideo
                  className={styles.video}
                  subscribeUrl={subscribeVideoUrl}
                  controls={false}
                  muted
                  streamPublishStatus={userInfo?.publishStatus}
                  onSubscribeLoading={() => {
                    console.log(`考生 ${userInfo?.id} 正在拉流中`);
                    setSubscribeVideoStatus(SubscribeVideoStatusEnum.loading);
                  }}
                  onSubscribeRetryFailed={(type) => {
                    console.log(
                      `考生 ${userInfo?.id} 停止尝试拉流`,
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
                <div className={styles['left-video-info']}>副摄像头画面</div>
              </div>
            )}
            {
              (subscribeVideoStatus === SubscribeVideoStatusEnum.loading || subscribeVideoStatus === SubscribeVideoStatusEnum.fail) && (
                <div className={styles['subscribe-video-fail']}>
                  <QRCode
                    size={120}
                    bordered={false}
                    className={styles['subscribe-video-fail-qrcode']}
                    value={getQrCodeUrl()}
                  />
                  请扫码开启手机摄像头，并放在考生侧后方要求能看到，全身、双手、电脑屏幕
                  <div onClick={startPull} className={styles['pull-retry']}>
                    <RefreshSvg className={styles['pull-retry-icon']}/>重试
                  </div>
                </div>
              )
            }
          </div>
        </div>
        <div className={styles['right-sec']}>
          <CheatDetection device="pc" resultVisible publishStatus={publishStatus} />
        </div>
      </main>

      <StatusDisplayer
        publishStatus={publishStatus}
        subscribeStatus={subscribeStatus}
        connectType={connectType}
        onRemoteStream={() => {}}
        onPlayEnd={() => {}}
      />

      {enableSubscribe && (
        <Subscribe
          subscribeUrl={subscribeUrl}
          onSubscribeLoading={() => {
            console.log("正在订阅中...");
            setSubscribeStatus(SubscribeStatus.connecting);
          }}
          onCanplay={handleTeacherStreamCanplay}
          onSubscribeRetryFailed={(type) => {
            handleSubscribeFail();
          }}
          onUdpFailed={() => {
            handleSubscribeFail();
          }}
        />
      )}
    </section>
  );
}

export default PCExamPage
