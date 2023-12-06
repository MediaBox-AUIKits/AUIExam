import { ExamContext } from "@/context/exam";
import { getSystemType } from "@/utils/common";
import JsApi from "@/utils/JsApi";
import { ERtsExceptionType, reporter } from "@/utils/Reporter";
import { EPublisherStatus, RtsPublisher, AudioMixer } from "@/core";
import { Dialog, Modal } from "antd-mobile";
import { compare } from "compare-versions";
import React, {
  CSSProperties,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { debounce } from "throttle-debounce";
import styles from "./index.less";
import type { LocalStream, RemoteStream } from "aliyun-rts-sdk";

const SYS_TYPE = getSystemType();
const RETRY_TIMEOUT = 60 * 1000;

// 钉钉版本大于 7.0.30 可以直接打通权限
const checkUWS = () => {
  let pass = true;
  const ua = navigator.userAgent.toLowerCase();

  if (SYS_TYPE !== "Android") return pass;

  if (!ua.includes("dingtalk")) return pass;

  // Dingtalk UWS/249
  // Mozilla/5.0 (Linux; U; Android 13; zh-CN; KB2000 Build/RKQ1.211119.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/69.0.3497.100 UWS/3.22.1.249 Mobile Safari/537.36 AliApp(DingTalk/7.0.20) com.alibaba.android.rimet/29094991 Channel/36180121811227 language/zh-CN abi/64 UT4Aplus/0.2.25 colorScheme/light

  // Dingtalk/7.0.30 UWS/255 打通权限后的第一个全量版本
  // Mozilla/5.0 (Linux; U; Android 13; zh-CN; KB2000 Build/RKQ1.211119.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/69.0.3497.100 UWS/3.22.1.255 Mobile Safari/537.36 AliApp(DingTalk/7.0.30) com.alibaba.android.rimet/29879169 Channel/36180121811227 language/zh-CN abi/64 UT4Aplus/0.2.25 colorScheme/light

  if (ua.includes("uws")) {
    const currentVersion = (ua.match(/dingtalk\/([\d\.]+)/) || [])[1];
    if (!currentVersion) return pass;

    const targetVersion = "7.0.30"; // 打通权限后的第一个版本（内核版本为 UWS/3.22.1.255）
    if (!compare(currentVersion, targetVersion, ">=")) {
      Modal.show({
        content: `当前版本过低，请升级钉钉至最新版。`
      });
      pass = false;
    }
  }
  return pass;
};

interface IProps {
  className?: string;
  /**
   * 推流地址
   */
  publishUrl: string;
  /**
   * 推流成功回调
   */
  onPublishOk: () => any;

  /**
   * 推流不可用，如推流一直失败、推流暂时中断、推流结束
   * 此时应该开启录制
   */
  onPublishUnavailable?: () => any;

  /**
   * 推流可用，如推流成功、重试成功
   * 此时应该暂停录制
   */
  onPublishAvailable?: () => any;

  /**
   * 重试超过指定次数，不再重试
   */
  onPublishRetryFailed?: () => any;

  /**
   *
   * 重试超过指定次数，只是通知，不影响继续重试
   * 这个回调只是为了通知用户当前推流没成功，组件自身还是会按照 maxRetry 自动重试
   */
  onPublishRetryFailedNotice?: () => any;

  /**
   * UDP 失败，提示用户
   */
  onUdpFailed?: () => any;

  /**
   * 获取 traceId 的回调
   */
  onTraceId?: (traceId: string, url: string) => any;

  onUnderFlow?: () => any;
  onResume?: () => any;

  onStatusChange?: (EPublisherStatus: EPublisherStatus) => any;

  /**
   * 创建本地流成功
   */
  onCreateStream?: () => any;

  controls?: boolean;

  remoteStream?: RemoteStream;

  /**
   * 指定视频音频设备
   */
  deviceInfo?: {video: string | undefined, audio: string | undefined};

  needSwitcher?: boolean;
}

export default function Publish(props: IProps) {
  const {
    className,
    publishUrl,
    controls,
    onPublishOk,
    onPublishRetryFailed,
    onPublishRetryFailedNotice,
    onUdpFailed,
    onTraceId,
    onUnderFlow,
    onResume,
    onCreateStream,
    onStatusChange,
    remoteStream,
    deviceInfo,
    needSwitcher = true,
  } = props;
  const { recorder, state } = useContext(ExamContext);
  const videoProfile = state.examInfo?.videoProfile;
  const [publisher, setPublisher] = useState<RtsPublisher>();
  const [activePublishUrl, setActivePublishUrl] = useState<string>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoWidth, setVideoWidth] = useState<number>(0);
  const [videoHeight, setVideoHeight] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [traceId, setTraceId] = useState<string>();
  const [switching, setSwitching]= useState(false);
  const [facingMode, setFacingMode] = useState<'user'|'environment'>('user');
  const [localStream, setLocalStream] = useState<LocalStream>();
  const videoSizeTimerRef = useRef<{ timer?: NodeJS.Timer }>({
    timer: undefined,
  });
  const retryPubTimer = useRef<number>();
  const sizeRef = useRef<React.CSSProperties>();
  const publishFailedCountRef = useRef<number>(0);
  const audioMixerRef = useRef<AudioMixer>();

  const wrapStyle: CSSProperties = useMemo(() => {
    const styles: CSSProperties = {};
    if (!videoWidth || !videoHeight || !containerHeight || !containerWidth) {
      styles.display = "none";
      return styles;
    }
    // 只展示 80% 画面，左右两边 10% 隐藏
    const contentWidth = videoWidth * 0.8;
    // console.log(contentWidth, videoHeight, containerWidth, containerHeight);
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

  useEffect(() => {
    const _publisher = new RtsPublisher({
      maxRetry: Infinity,
      onCreateStream: (stream) => {
        setLocalStream(stream);
        onCreateStream && onCreateStream();
        // 钉钉环境尝试旋转横屏
        JsApi.rotateView();
      },
      onUnderFlow: () => {
        onUnderFlow && onUnderFlow();
        startRecorder(_publisher);
      },
      onResume: () => {
        onResume && onResume();
        recorder.stop();
      },
      onPublishOk: () => {
        publishFailedCountRef.current = 0;
        onPublishOk && onPublishOk();
      },
      onPublishFailed: () => {
        publishFailedCountRef.current++;
        if (publishFailedCountRef.current === 3) {
          startRecorder(_publisher);
          onPublishRetryFailedNotice && onPublishRetryFailedNotice();
          reporter.publishException({
            url: props.publishUrl || "",
            errorCode: ERtsExceptionType.RetryReachLimit,
            retryCount: RtsPublisher.MAX_RETRY,
            traceId: traceId,
          });
        }
      },
      onStatusChange: (status) => {
        if (status === EPublisherStatus.Available) {
          console.log("推流正常，停止录制");
          onStatusChange && onStatusChange(status);
          recorder.stop();
        } else if (status === EPublisherStatus.Unavailable) {
          console.log("推流异常，开始本地录制");
          startRecorder(_publisher);
          onStatusChange && onStatusChange(status);
        }
      },
      onRetryReachLimit: () => {
        onPublishRetryFailed && onPublishRetryFailed();
        retryPubTimer.current = window.setTimeout(() => {
          console.log("重新尝试推流");
          _publisher.publish(props.publishUrl);
        }, RETRY_TIMEOUT);
      },
      onUdpFailed: () => {
        onUdpFailed && onUdpFailed();
      },
      onTraceId: (...args) => {
        setTraceId(args[0]);
        onTraceId && onTraceId(...args);
      },
    });
    setPublisher(_publisher);

    return () => {
      publishFailedCountRef.current = 0;
      _publisher?.dispose();
      if (videoSizeTimerRef.current.timer) {
        clearInterval(videoSizeTimerRef.current.timer);
      }
      if (retryPubTimer.current) {
        window.clearInterval(retryPubTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (publisher) {
      startPublish();
    }
  }, [publisher]);

  useEffect(() => {
    if (publishUrl && activePublishUrl) {
      if (publishUrl !== activePublishUrl) {
        console.log(
          `Pub URL changed from ${activePublishUrl} to ${publishUrl}`
        );
        publishFailedCountRef.current = 0;
        startPublish();
      }
    }
  }, [publishUrl]);

  // 如果传入了远端流，则和本地音频轨道混合再推出去
  useEffect(() => {
    if (!publisher || !localStream) return;

    if (!publisher.supportReplaceTrack()) return;

    // 和本地音频混流
    if (remoteStream) {
      if (!audioMixerRef.current) {
        const audioMixer = new AudioMixer();
        audioMixerRef.current = audioMixer;

        audioMixer.mix(remoteStream.mediaStream!, localStream.mediaStream);
        const mixedAudioTrack = audioMixer.audioTrack;
        publisher.replaceAudioTrack(mixedAudioTrack);
        // console.warn('~~~~~~~~~~~~~~~~ 开始音频混流 ~~~~~~~~~~~~~~~~');
      }
    } else {
      if (audioMixerRef.current) {
        audioMixerRef.current.dispose();
        audioMixerRef.current = undefined;

        // @ts-ignore
        publisher.replaceAudioTrack(localStream.audioTrack);
        // console.warn('~~~~~~~~~~~~~~~~ 结束音频混流 ~~~~~~~~~~~~~~~~');
      }
    }

  }, [localStream, remoteStream, publisher])

  const checkDingTalkStream = useMemo(() => {
    return debounce(2000, () => {
      // 有些钉钉机器横屏后画面依然有问题，经测试页面点击事件后再转成横屏才正常
      // 因此检测是否需要重试转屏
      // 先重置旋转，再横屏
      if (
        JsApi.isDingtalk() &&
        videoRef.current &&
        videoRef.current.videoWidth < videoRef.current.videoHeight
      ) {
        Dialog.alert({
          content: '画面似乎有异常，请重试',
          confirmText: '确定',
          onConfirm: () => {
            JsApi.resetView(
              JsApi.rotateView.bind(JsApi),
              JsApi.rotateView.bind(JsApi),
            );
          },
        });
      }
    });
  }, []);

  const startRecorder = (_publisher: RtsPublisher) => {
    const stream = _publisher.getMediaStream();
    if (!stream) {
      console.log("异常！无MediaStream");
      return;
    }
    // 运行本地录制才调用
    if (CONFIG.localRecorder.enable) {
      recorder.start(stream);
    }
  };

  const deviceTips = (error: any) => {
    if (!error.deviceType) {
      Dialog.alert({
        content: "创建本地流失败，请检查环境是否支持",
      });
      return;
    }

    if (!checkUWS()) return;

    Dialog.show({
      title: "请打开摄像头/麦克风权限",
      content: 
      SYS_TYPE === "iOS" ?
        (
          <>
            <div>1.点击下方【去设置】-打开【相机】和【麦克风】权限。</div>
            <div>2.在页面的授权弹窗选择【允许】</div>
        </>
        ) :
        (
          <>
            <div>1.请先点击【重新验证】再次授权。</div>
            <div>2.或点击下方【去设置】-权限管理-【摄像头】和【麦克风】权限设为：使用时允许。</div>
            <div>
              <span style={{ color: "var(--adm-color-warning)" }}>
                设置完成后请清掉应用后台并重新进入。
              </span>
            </div>
          </>
        ),
      actions: [
        [
          {
            key: "setting",
            text: "去设置",
            onClick: () => {
              JsApi.openSystemSetting();
            },
          },
          {
            key: "reload",
            text: "重新验证",
            onClick: () => {
              window.location.reload();
            },
          },
        ],
      ],
    });
  };

  const startPublish = async () => {
    if (!videoRef.current) return;
    console.log("start push");

    setActivePublishUrl(publishUrl);

    let publishOk = true;

    try {
      await publisher?.createStream(videoRef.current, {
        audio: deviceInfo?.audio ? {deviceId: deviceInfo?.audio} : true,
        video: {
          facingMode: facingMode,
          ...(deviceInfo?.video ? {deviceId: deviceInfo?.video} : null)
        },
      }, videoProfile);
    } catch (error: any) {
      console.log("提示用户给予摄像头麦克风权限", error);
      deviceTips(error);
      if (error) {
        publishOk = false;
      }
    }

    if (!publishOk) return;

    // 解决安卓微信中无法自动播放音频的问题，需要用户点击过页面后才能自动播
    // 所以初始化后弹窗展示下，让用户点击操作
    // 若后续发现其他环境也有这个问题，也可以增加对应的判断
    if (SYS_TYPE === 'Android' && /(MicroMessenger)/i.test(navigator.userAgent)) {
      Dialog.alert({
        content: '您已进入考场',
      });
    }

    try {
      await publisher?.publish(publishUrl);
    } catch (error) {
      console.log("信令失败或其他兼容错误", error);
    }
  };

  const switchCamera = () => {
    if (!videoRef.current || switching) return;

    // 需要立即停止录制，因为切换摄像头后需要将之前的 MediaStream 停掉，若不先停止录制会导致生成视频失败
    recorder.stop(true);

    setSwitching(true);
    const mode = facingMode === 'user' ? 'environment' : 'user';
    publisher?.createStream(videoRef.current, {
      audio: deviceInfo?.audio ? {deviceId: deviceInfo?.audio} : true,
      video: {
        facingMode: mode,
        ...(deviceInfo?.video ? {deviceId: deviceInfo?.video} : null)
      },
    }, videoProfile).then(() => {
      publisher?.replaceVideoTrack();
      publisher?.replaceAudioTrack();
      setFacingMode(mode);
    }).catch((error: any) => {
      deviceTips(error);
    }).finally(() => {
      setSwitching(false);
    });
  };

  sizeRef.current = wrapStyle;

  return (
    <div ref={containerRef} className={className}>
      <div className={styles.wrap} style={wrapStyle}>
        <video
          id="local-previewer"
          muted
          controls={controls ?? true}
          autoPlay
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          ref={videoRef}
          onResize={() => {
            if (videoRef.current) {
              console.log('video size ->', videoRef.current.videoWidth, videoRef.current.videoHeight);
              setVideoWidth(videoRef.current.videoWidth);
              setVideoHeight(videoRef.current.videoHeight);
              checkDingTalkStream();
            }
          }}
          onCanPlay={() => {
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
        />
      </div>

      {
        needSwitcher ? <div className={styles['switch-camera-btn']} onClick={switchCamera}>切换摄像头</div> : false
      }
    </div>
  );
}
