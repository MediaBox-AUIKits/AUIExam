import EndButton from "@/components/EndButton";
import Publish from "@/components/rts/Publish";
import Subscribe from "@/components/rts/Subscribe";
import SilenceAudio from "@/components/SilenceAudio";
import StatusDisplayer from "@/components/StatusDisplayer";
import { ExamContext } from "@/context/exam";
import { InteractionEvents } from "@/core";
import {
  PublishStatus,
  RoomStatusEnum,
  SubscribeStatus,
} from "@/types";
import { checkH264, getParamFromSearch, getSystemType } from "@/utils/common";
import { formatMilliDuration } from "@/utils/format";
import JsApi from "@/utils/JsApi";
import { MockRoomId, MockCurrentUserId } from "@/utils/LocalMock";
import { reporter } from "@/utils/Reporter";
import { EPublisherStatus } from "@/core";
import services from "@/utils/services";
import "allsettled-polyfill";
import { NoticeBar } from "antd-mobile";
import { compare } from "compare-versions";
import { ready as ddReady } from "dingtalk-jsapi";
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
import { history } from "umi";
import styles from "./index.less";

type ConnectType = "" | "single" | "broadcast" | "init_broadcast";

function ExamPage() {
  const { state, recorder, interaction, radioTimer, dispatch } =
    useContext(ExamContext);
  const { roomInfo, userInfo } = state;
  const [initFailTip, setInitFailTip] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [enableSubscribe, setEnableSubscribe] = useState(false);
  const [subscribeUrl, setSubscribeUrl] = useState<string>("");
  const [subscribeStatus, setSubscribeStatus] = useState<SubscribeStatus>(
    SubscribeStatus.disconnect
  );
  const [connectType, setConnectType] = useState<ConnectType>(""); // 用于区分一对一通话、全员口播、初始化时同步口播
  const [publishStatus, setPublishStatus] = useState<PublishStatus>(
    PublishStatus.init
  );
  const [silencePlaySettled, setSilencePlaySettled] = useState(false);
  const [showNoDataWarning, setShowNoDataWarning] = useState(false);
  const [showUdpConnectionWarning, setShowUdpConnectionWarning] =
    useState(false);
  const [inBackground, setInBackground] = useState(false);
  const [publishVideoElement, setPublishVideoElement] =
    useState<HTMLVideoElement>();

  const debugInfoRef = useRef<Record<string, any>>();
  const playAfterCaptureRef = useRef<boolean>(false);

  const invigilator = useRef<any>();
  const timer = useRef<number>();
  const callSid = useRef<string>(""); // 一对一
  const liveSid = useRef<string>(""); // 全员口播消息中的sid

  const startTime = useMemo(() => Date.now(), []);

  const durationText = useMemo(() => {
    return formatMilliDuration(duration, false);
  }, [duration]);

  useEffect(() => {
    try {
      checkUWS();
      setScreenKeepOn();
      // enableTraceIdSender();
      handleWebviewResume();
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
      setInitFailTip("初始化参数异常，请退出再重试！");
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
      // 获取考生列表
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
      if (CONFIG.localRecoder.enable) {
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

      joinGroup(roomInfoRes.imGroupId, roomInfoRes.id, userInfoRes.id).then(
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
      setInitFailTip("初始化失败，请退出再重试！");
      reporter.initError(error);
    }
  };

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

  const gotoEnded = () => {
    recorder.stop(true);
    history.push("/ended");
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

  const handleSubscribeFail = () => {
    setEnableSubscribe(false);
    setSubscribeStatus(SubscribeStatus.fail);
    setSubscribeUrl("");
    callSid.current = "";
    liveSid.current = "";
  };

  const setScreenKeepOn = () => {
    JsApi.setScreenKeepOn();
  };

  const checkUWS = () => {
    setTimeout(() => {
      const ua = navigator.userAgent.toLowerCase();

      if (getSystemType() !== "Android") return;

      if (!ua.includes("dingtalk")) return;

      // 先检查钉钉版本 7.x

      // Aliding
      // Mozilla/5.0 (Linux; U; Android 12; zh-CN; KB2000 Build/RKQ1.211119.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/69.0.3497.100 UWS/3.22.1.233 Mobile Safari/537.36 AliApp(DingTalk/6.5.55.4) com.alibaba.android.rimet.aliding/PIS383631991338719232 Channel/exclusive_dingtalk_21001 language/zh-CN 2ndType/exclusive abi/64 UT4Aplus/0.2.25 colorScheme/light

      // Dingtalk
      // Mozilla/5.0 (Linux; U; Android 12; zh-CN; KB2000 Build/RKQ1.211119.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/69.0.3497.100 UWS/3.22.1.249 Mobile Safari/537.36 AliApp(DingTalk/7.0.0.11) com.alibaba.android.rimet/27811579 Channel/263200 language/zh-CN abi/64 UT4Aplus/0.2.25 colorScheme/light

      // KAOSHIDING
      // Mozilla/5.0 (Linux; U; Android 12; zh-CN; KB2000 Build/RKQ1.211119.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/69.0.3497.100 UWS/3.22.1.233 Mobile Safari/537.36 AliApp(DingTalk/7.0.0.1) com.alibaba.android.rimet.ysyk/PIS396356995210580992 Channel/exclusive_dingtalk_216475793 language/zh-CN 2ndType/exclusive abi/32 UT4Aplus/0.2.25 colorScheme/light

      // DingTalk/6.5.55.4 DingTalk/7.0.0.11
      const dingtalkVersion = (ua.match(/DingTalk\/([\d\.]+)/i) || [])[1];
      const minDingtalkVersion = "7.0.0.0";

      if (compare(dingtalkVersion, minDingtalkVersion, "<")) {
        history.push("/ddupgrade"); // 提示升级钉钉版本
        return;
      }

      if (ua.includes("uws")) {
        const currentVersion = (ua.match(/uws\/([\d\.]+)/) || [])[1];
        if (!currentVersion) return;

        const targetVersion = "3.22.1.249"; // 7.0 之后正式修复的内核
        if (!compare(currentVersion, targetVersion, ">=") /* 7.0正式版内核 */) {
          history.push("/upgrade");
        }
      }
    }, 1500);
  };

  const handleWebviewResume = () => {
    if (navigator.userAgent.indexOf("DingTalk") === -1) {
      return;
    }
    // 页面被打断后恢复（从后台切回、电话挂断等），主动刷新页面，重新采集
    ddReady(function () {
      // 页面被唤醒的事件监听(webview)
      document.addEventListener(
        "resume",
        function (e) {
          e.preventDefault();
          setInBackground(false);
          if (getSystemType() !== "Android") return;
          if (!window.location.hash.replace("#", "").replace("/", "")) {
            window.location.reload();
          }
        },
        false
      );

      // 退到后台的事件监听(webview)
      document.addEventListener("pause", function (e) {
        e.preventDefault();
        setInBackground(true);
      });
    });
  };

  const checkSdp = () => {
    checkH264((res: any) => {
      reporter.sdpSupportH264({ res });
    });
  };

  return (
    <section className={styles.page}>
      <EndButton onEnd={gotoEnded} />
      <div className={styles.header}>
        <div className={styles.title}>{roomInfo ? roomInfo.name : ""}</div>
        {duration ? (
          <span className={styles.duration}>{durationText}</span>
        ) : null}
      </div>

      <main className={styles.content}>
        {showNoDataWarning ? (
          <NoticeBar
            style={{
              position: "absolute",
              width: "100%",
              zIndex: 100,
            }}
            content="音视频发送异常，监考员可能接收不到你的画面。"
            wrap
            color="alert"
          />
        ) : null}
        {/* DISCONNECTED -> Publish -> Publish OK -> 15s -> DISCONNECTED -> Publish -> Publish OK */}
        {showUdpConnectionWarning ? (
          <NoticeBar
            style={{
              position: "absolute",
              width: "100%",
              zIndex: 100,
            }}
            content="网络异常，请尝试切换当前网络"
            wrap
            color="alert"
          />
        ) : null}
        {userInfo && silencePlaySettled ? (
          <Fragment>
            <Publish
              className={styles.previewer}
              publishUrl={userInfo.rtcPushUrl}
              controls={false}
              onCreateStream={() => {
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
              onVideoElementReady={(el) => {
                setPublishVideoElement(el);
              }}
              onUnderFlow={() => {
                if (!inBackground) {
                  setShowNoDataWarning(true);
                  setPublishStatus(PublishStatus.nodata);
                } else {
                  setPublishStatus(PublishStatus.fail);
                }
              }}
              onResume={() => {
                setShowNoDataWarning(false);
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
            />
          </Fragment>
        ) : null}

        {initFailTip ? (
          <div className={styles["fail-tip"]}>{initFailTip}</div>
        ) : null}
      </main>

      <StatusDisplayer
        publishStatus={publishStatus}
        subscribeStatus={subscribeStatus}
        connectType={connectType}
        publishVideoElement={publishVideoElement}
      />

      <div className={styles.invigilator}>
        <div className={styles["invigilator-content"]}>
          <div>{state.invigilator ? state.invigilator.name : "监考员"}</div>
        </div>
      </div>

      {enableSubscribe && (
        <Subscribe
          subscribeUrl={subscribeUrl}
          onSubscribeLoading={() => {
            console.log("正在订阅中...");
            setSubscribeStatus(SubscribeStatus.connecting);
          }}
          onCanplay={() => {
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
          }}
          onSubscribeRetryFailed={(type) => {
            // if (type === 'signal') {
            //   exceptionNotice('连接重试多次仍无法成功，请尝试切换WIFI/蜂窝网络；如果仍无法解决问题，请联系管理员。');
            // }
            handleSubscribeFail();
          }}
          onUdpFailed={() => {
            // exceptionNotice();
            handleSubscribeFail();
          }}
        />
      )}
      <SilenceAudio
        onPlaySettled={() => {
          setSilencePlaySettled(true);
        }}
      />
    </section>
  );
}

export default ExamPage;
