import { ExamContext } from "@/context/exam";
import { getSystemType } from "@/utils/common";
import JsApi from "@/utils/JsApi";
import { ERtsExceptionType, reporter } from "@/utils/Reporter";
import { EPublisherStatus, RtsPublisher } from "@/core";
import { Dialog } from "antd-mobile";
import React, {
  CSSProperties,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./index.less";
const DEVICE_MESSAGE_IOS = `1.点击下方【去设置】-打开【相机】和【麦克风】权限。`;
const DEVICE_MESSAGE_ANDROID = `1.点击下方【去设置】-权限管理-【摄像头】和【麦克风】权限设为：使用时允许。`;

const SYS_TYPE = getSystemType();
const RETRY_TIMEOUT = 60 * 1000;

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

  /**
   * 获取渲染元素
   */
  onVideoElementReady?: (el: HTMLVideoElement) => any;

  onUnderFlow?: () => any;
  onResume?: () => any;

  onStatusChange?: (EPublisherStatus: EPublisherStatus) => any;

  /**
   * 创建本地流成功
   */
  onCreateStream?: () => any;

  controls?: boolean;
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
  } = props;
  const { recorder } = useContext(ExamContext);
  const [publisher, setPublisher] = useState<RtsPublisher>();
  const [activePublishUrl, setActivePublishUrl] = useState<string>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoWidth, setVideoWidth] = useState<number>(0);
  const [videoHeight, setVideoHeight] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [traceId, setTraceId] = useState<string>();
  const videoSizeTimerRef = useRef<{ timer?: NodeJS.Timer }>({
    timer: undefined,
  });
  const retryPubTimer = useRef<number>();
  const sizeRef = useRef<React.CSSProperties>();
  const publishFailedCountRef = useRef<number>(0);

  const wrapStyle: CSSProperties = useMemo(() => {
    const styles: CSSProperties = {};
    if (!videoWidth || !videoHeight || !containerHeight || !containerWidth) {
      styles.display = "none";
      console.log("Wrap Styles1", styles);
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
    console.log("Wrap Styles", styles);

    return styles;
  }, [videoHeight, videoWidth, containerHeight, containerWidth]);

  useEffect(() => {
    if (videoRef.current) {
      props.onVideoElementReady && props.onVideoElementReady(videoRef.current);
    }
  }, []);

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
      onCreateStream: () => {
        onCreateStream && onCreateStream();
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

  const startRecorder = (publisher: RtsPublisher) => {
    const stream = publisher.getMediaStream();
    if (!stream) {
      console.log("异常！无MediaStream");
      return;
    }
    // 运行本地录制才调用
    if (CONFIG.localRecoder.enable) {
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

    Dialog.show({
      title: "请打开摄像头/麦克风权限",
      content: (
        <>
          <div>
            {SYS_TYPE === "iOS" ? DEVICE_MESSAGE_IOS : DEVICE_MESSAGE_ANDROID}
          </div>
          <div>
            <span style={{ color: "var(--adm-color-warning)" }}>
              设置完成后请彻底关闭考试钉并重新进入。
            </span>
          </div>
          <div>2.在页面的授权弹窗选择【允许】</div>
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
        audio: true,
        video: {
          facingMode: "user",
        },
      });
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

  sizeRef.current = wrapStyle;

  return (
    <div ref={containerRef} className={className}>
      <div className={styles.wrap} style={wrapStyle}>
        <video
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
              setVideoWidth(videoRef.current.videoWidth);
              setVideoHeight(videoRef.current.videoHeight);
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
    </div>
  );
}