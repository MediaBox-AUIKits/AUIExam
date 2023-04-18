import QuitButton from "@/components/QuitButton";
import { ExamContext } from "@/context/exam";
import { getParamFromSearch } from "@/utils/common";
import { reporter } from "@/utils/Reporter";
import services from "@/utils/services";
import { ProgressBar } from "antd-mobile";
import classNames from "classnames";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "../index.less";
import endedStyles from "./index.less";

enum UploadStatus {
  uploading = "uploading",
  finish = "finish",
  error = "error",
}

const UploadTextMap: {
  [x in UploadStatus]: string;
} = {
  uploading: "考试数据上传中，请勿关闭页面",
  finish: "考试数据上传成功！",
  error: "数据未能全部上传完成",
};

function EndedPage() {
  const { state, recorder, dispatch } = useContext(ExamContext);
  const { roomInfo } = state;
  const [inited, setInited] = useState(false);
  const [initFailTip, setInitFailTip] = useState<string>("");
  const [uploadBlockVisible, setUploadBlockVisible] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(
    UploadStatus.uploading
  );
  const [uploadPercent, setUploadPercent] = useState(0);
  const finishedKeys: Set<string> = useMemo(() => new Set(), []);
  const cacheKeys = useRef<string[]>([]);

  useEffect(() => {
    checkInitStatus().then((bool) => {
      setInited(true);
      if (bool && CONFIG.localRecorder.enable) {
        // 若开启了本地录制，需要检查是否有未上传的本地文件
        getCacheKeysLength().then((len) => {
          if (len) {
            setUploadBlockVisible(true);
            uploadCache();
          }
        });
      }
    });

    recorder.on("success", (key: string) => {
      finishedKeys.add(key);
      if (cacheKeys.current.length) {
        setUploadPercent(
          Math.round((finishedKeys.size / cacheKeys.current.length) * 100)
        );
      } else {
        setUploadPercent(100);
      }
    });
  }, []);

  const checkInitStatus = useCallback(async () => {
    // 无需初始化
    if (roomInfo) {
      return true;
    }

    const mock = getParamFromSearch("mock");
    let roomId = getParamFromSearch("roomId");
    let userId = getParamFromSearch("userId");
    let token = getParamFromSearch("token");
    if (mock === "1") {
      // 测试用的
      roomId = roomId || "806562658353643520";
      userId = userId || "810920072202354689";
      token = token || "1fTyFwuS3P8EqU04sP8Lru9LeayXxBYb";
    }
    if (!roomId || !userId || !token) {
      setInitFailTip("初始化参数异常，请退出再重试！");
      reporter.illegalInitialParams({ roomId, userId, token });
      return false;
    }
    services.setHeaderAuthorization(token);

    try {
      // 获取考场信息
      const roomInfoRes: any = await services.getRoomInfo(roomId);
      if (!roomInfoRes || !roomInfoRes.examId) {
        throw { code: -1, msg: "The result has no examId" };
      }
      reporter.updateCommonParams({
        examid: roomInfoRes.examId,
        roomname: roomInfoRes.name,
      });
      // 保存
      dispatch({
        type: "update",
        payload: { roomInfo: roomInfoRes },
      });

      // 初始化本地录制
      if (CONFIG.localRecorder.enable) {
        recorder
          .init({
            examId: roomInfoRes.id,
            roomId,
            userId,
            fetchSTSData: services.getSTSData.bind(services),
          })
          .catch(() => {});
      }

      return true;
    } catch (error) {
      setInitFailTip("结束页初始化失败，请退出再重试！");
      reporter.initError(error);
    }
  }, []);

  const updateCacheUploading = (bool: boolean) => {
    dispatch({
      type: "update",
      payload: { cacheUploading: bool },
    });
  };

  const getCacheKeysLength = async () => {
    try {
      let keys = await recorder.getCacheKeys();
      cacheKeys.current = keys;
      return keys.length;
    } catch (error) {
      //
    }
    return 0;
  };

  const uploadCache = async () => {
    try {
      finishedKeys.clear(); // 清空已上传完成列表
      updateCacheUploading(true);
      setUploadPercent(0);
      setUploadStatus(UploadStatus.uploading);
      // 上传
      await recorder.uploadLocalCache();
      // 完成后再检查
      const len = await getCacheKeysLength();
      if (len) {
        console.log("有文件未能正常上传");
        // 说明有异常没有上传完成
        setUploadStatus(UploadStatus.error);
      } else {
        console.log("本地录制文件已上传完成");
        setUploadPercent(100);
        setUploadStatus(UploadStatus.finish);
      }
      updateCacheUploading(false);
    } catch (error) {
      console.log("上传缓存异常", error);
    }
  };

  return (
    <section className={`${styles.page} ${endedStyles.ended}`}>
      <QuitButton />
      {initFailTip ? (
        <div className={styles["fail-tip"]}>{initFailTip}</div>
      ) : inited ? (
        <div className={endedStyles.inner}>
          <div className={endedStyles.title}>{roomInfo?.name || ""}</div>
          <div className={endedStyles.endedText}>考试已结束</div>
          <div className={endedStyles.tip}>音视频已断开连接</div>

          {uploadBlockVisible ? (
            <div
              className={classNames(
                endedStyles["upload-block"],
                endedStyles[uploadStatus]
              )}
            >
              <div className={endedStyles["upload-tip"]}>
                <span>{UploadTextMap[uploadStatus]}</span>
                {uploadStatus === UploadStatus.error ? (
                  <span className={endedStyles.retry} onClick={uploadCache}>
                    重新上传
                  </span>
                ) : null}
              </div>
              <ProgressBar
                percent={
                  uploadStatus === UploadStatus.uploading ? uploadPercent : 100
                }
                text={uploadStatus === UploadStatus.uploading}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div>页面初始化中..</div>
      )}
    </section>
  );
}

export default EndedPage;
