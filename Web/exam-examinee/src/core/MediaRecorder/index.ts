import dayjs from "dayjs";
import ysFixWebmDuration from "fix-webm-duration";
import localforage from "localforage";
import { RecordRTCPromisesHandler } from "recordrtc";
import Emitter from "../Emitter";
import { ISTSData } from "../types";
import { reporter } from "@/utils/Reporter";
import OSSUploader from "./OSSUploader";
import VODUploader from "./VODUploader";

const DBName = "AUIExam";
const RetryMaxNum = 2;
const ChunkMinDuration = 2000; // 小于最小时长不要
const ChunkMaxDuration = 5 * 60 * 1000; // 分片最大时长
enum RecorderKeys {
  first = "first",
  second = "second",
}
// format
const FormatMap: any = {
  mp4: "mp4",
  webm: "webm",
  "x-matroska": "mkv",
};

function getDateString(datetime: number) {
  return dayjs(datetime).format("YYYY-MM-DD HH:mm:ss");
}

export interface MediaRecorderInitOptions {
  examId: string;
  userId: string;
  roomId: string;
  fetchSTSData: (id: string) => Promise<any>;
}

class MediaRecorder extends Emitter {
  private recorderMap: Map<string, RecordRTCPromisesHandler> = new Map();
  private recordTimeMap: Map<string, number> = new Map();
  private currentRecorderKey: string = RecorderKeys.first;
  private chunkTimer?: number; // 分片定时器
  private stopTimer?: number; // 停止录制定时器
  private started: boolean = false;
  private forage?: LocalForage;
  private uploader?: OSSUploader | VODUploader;
  // private oss?: OSS;
  private examOptions?: MediaRecorderInitOptions;
  private stsData?: ISTSData;
  private mimeType: string = "video/mp4";
  // 获取 STS 数据函数
  private fetchSTSData: (id: string, mode: string) => Promise<any> = () => {
    return Promise.reject({
      message: "not init fetchSTSData",
    });
  };

  constructor() {
    super();
  }

  public async init(options: MediaRecorderInitOptions) {
    this.examOptions = options;
    if (options && options.fetchSTSData) {
      this.fetchSTSData = options.fetchSTSData;
    }

    this.forage = localforage.createInstance({
      driver: localforage.INDEXEDDB,
      name: DBName, // 数据名称
      storeName: `${options.examId}`, // 数据仓库的名称，如 考试id
    });

    await this.initUploader();
  }

  private getStsData(): Promise<any> {
    const examId = this.examOptions?.examId;
    if (!examId) {
      reporter.getSTSError({ code: -1, message: "no examId!" });
      return Promise.reject({ code: -1, message: "no examId!" });
    }
    return new Promise((resolve, reject) => {
      let num = 0;
      const run = async () => {
        num += 1;
        try {
          const res = await this.fetchSTSData(examId, CONFIG.localRecorder.mode);
          this.stsData = res as any;
          reporter.getSTSSuccess();
          resolve(res);
        } catch (error) {
          // 3秒后重试，3次仍失败上报异常
          if (num < 3) {
            setTimeout(() => {
              run();
            }, 3000);
          } else {
            reporter.getSTSError(error);
            reject(error);
          }
        }
      };
      run();
    });
  }

  private initUploader() {
    try {
      const options = {
        fetchSTSData: this.getStsData.bind(this),
      };
      this.uploader = CONFIG.localRecorder.mode === "VOD" ? new VODUploader(options) : new OSSUploader(options);
      return this.uploader.init();
    } catch (error: any) {
      console.log("uploader 初始化异常！", this.stsData, error);
      reporter.ossInitError(error);
      return Promise.reject(error);
    }
  }

  /**
   * 开始录制
   */
  public start(stream: MediaStream) {
    if (this.stopTimer) {
      window.clearTimeout(this.stopTimer);
      this.stopTimer = undefined;
    }
    if (this.started) {
      return;
    }
    reporter.startRecord();
    this.started = true;
    this.createRecorder(stream);
  }

  private createRecorder(stream: MediaStream) {
    const key = this.currentRecorderKey;
    const instance = new RecordRTCPromisesHandler(stream, {
      type: "video",
      mimeType: this.mimeType as any,
      videoBitsPerSecond: 500000,
      audioBitsPerSecond: 50000,
    });
    instance
      .startRecording()
      .then(() => {
        this.recordTimeMap.set(key, Date.now());
        this.recorderMap.set(key, instance);

        if (key === RecorderKeys.first) {
          this.currentRecorderKey = RecorderKeys.second;
        } else {
          this.currentRecorderKey = RecorderKeys.first;
        }

        this.chunkTimer = window.setTimeout(() => {
          // 创建新对象，停止老的
          this.createRecorder(stream);
          this.stopRecorder(key);
        }, ChunkMaxDuration);
      })
      .catch((err) => {
        console.log("开启录制失败", err);
        if (typeof err === "string") {
          err = { message: err };
        }
        reporter.startRecordError(err);
      });
  }

  /**
   * 停止录制
   */
  public stop(immediate?: boolean) {
    if (!this.started) {
      return;
    }
    if (this.stopTimer) {
      window.clearTimeout(this.stopTimer);
    }
    const timeout = immediate ? 0 : 10000;
    // 定时器作用是防止频繁停止、开启
    this.stopTimer = window.setTimeout(() => {
      if (this.chunkTimer) {
        window.clearTimeout(this.chunkTimer);
        this.chunkTimer = undefined;
      }
      this.stopRecorder(RecorderKeys.first);
      this.stopRecorder(RecorderKeys.second);

      this.stopTimer = undefined;
      this.started = false;
    }, timeout);
  }

  /**
   * stopRecorder
   */
  public async stopRecorder(key: string) {
    const recorder = this.recorderMap.get(key);
    if (!recorder) {
      return;
    }

    reporter.stopRecord();
    try {
      await recorder.stopRecording();
      let dur: number = 0;
      const startTime = this.recordTimeMap.get(key);
      const now = Date.now();
      if (startTime) {
        dur = now - startTime;
      }
      // 小于最小时长不要
      if (dur < ChunkMinDuration) {
        return;
      }
      let blob = await recorder.getBlob();
      blob = await this.fixWebmDuration(blob, dur);
      console.log("录制文件", dur, blob);

      const chunkKey = `${getDateString(startTime!)}_${getDateString(now)}`;
      // 生成 File 对象
      const file = this.blobToFile(chunkKey, blob);
      // 保存至 indexDB
      await this.saveToDB(chunkKey, file);

      await recorder.destroy();
      this.recordTimeMap.delete(key);
      this.recorderMap.delete(key);

      // 上传至服务端
      this.uploadFile(chunkKey, file).catch((error) => {
        console.log(error);
        reporter.chunkUploadFail({
          message: error ? error.message : undefined,
          chunkKey,
        });
      });
    } catch (err) {
      console.log("停止录制、保存数据失败", err);
      if (typeof err === "string") {
        err = { message: err };
        if (err === "Empty blob.") {
          this.mimeType = "video/webm;codecs=vp8"; // 尝试改用vp8
        }
      }
      reporter.stopRecordError(err);
    }
  }

  private saveToDB(chunkKey: string, file: File) {
    if (!this.forage) {
      return Promise.reject(new Error("未初始化"));
    }
    return this.forage.setItem(chunkKey, file);
  }

  // 若是 webm 存在时长异常，需要修正
  private fixWebmDuration(blob: Blob, duration: number) {
    if (blob.type.indexOf("webm")) {
      return ysFixWebmDuration(blob, duration, { logger: false });
    }
    return Promise.resolve(blob);
  }

  /**
   * Blob 转成 File 对象
   * @param {string} chunkKey
   * @param {Blob} blob
   * @return {*}  {File}
   */
  private blobToFile(chunkKey: string, blob: Blob): File {
    const marr = blob.type.match(/^video\/([a-z0-9-]+)/) || [];
    let format = marr[1] || "";
    format = FormatMap[format] || format;
    const fileName = `${chunkKey}.${format}`;
    return new File([blob], fileName, { type: blob.type });
  }

  private uploadFile(chunkKey: string, file: File) {
    if (!this.uploader) {
      return Promise.reject(new Error("uploader not init"));
    }
    if (!file) {
      return Promise.reject(new Error("file error"));
    }
    const streamName = `${this.examOptions?.examId}-${this.examOptions?.roomId}-${this.examOptions?.userId}`;

    return this.uploader.uploadFile(streamName, file).then((res: any) => {
      console.log("上传成功", res);
      reporter.chunkUploadSuccess({ name: res.name, url: res.url });
      // 上传成功后，删除分片
      this.forage
        ?.removeItem(chunkKey)
        .then(() => {
          // 当值被移除后，此处代码运行
          console.log(chunkKey + " is cleared!");
        })
        .catch((err: any) => {
          // 当出错时，此处代码运行
          console.log("移除失败", err);
        });
    });
  }

  private async recursiveUploadChunk(keyList: string[], resolve: Function) {
    const chunkKey = keyList[0];
    if (!chunkKey) {
      resolve();
      return;
    }

    const next = () => {
      keyList.shift();
      this.recursiveUploadChunk(keyList, resolve);
    };

    let num = 0;
    const upload = (blob: File) => {
      num += 1;
      this.uploadFile(chunkKey, blob)
        .then(() => {
          this.emit("success", chunkKey);
          next();
        })
        .catch((err) => {
          console.log("上传失败", err);
          if (num > RetryMaxNum) {
            reporter.chunkUploadFail({
              message: err ? err.message : undefined,
              chunkKey,
            });
            this.emit("fail", chunkKey);
            next(); // 多次失败就下一个
          } else {
            upload(blob);
          }
        });
    };

    try {
      const blob: any = await this.forage!.getItem(chunkKey);
      upload(blob);
    } catch (err) {
      console.log(`${chunkKey}获取失败！`, err);
      this.emit("fail", chunkKey);
      next();
    }
  }

  /**
   * 获取缓存文件的keys
   */
  public async getCacheKeys() {
    if (!this.forage) {
      return [];
    }
    return this.forage.keys();
  }

  /**
   * 上传本地缓存文件列表
   */
  public uploadLocalCache() {
    return new Promise((resolve, reject) => {
      this.getCacheKeys()
        .then((keys) => {
          if (!keys.length) {
            resolve("");
            return;
          }
          this.recursiveUploadChunk(keys, resolve);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  /**
   * 清空缓存
   */
  public clearCache() {
    if (this.forage) {
      this.forage
        .clear()
        .then(() => {
          console.log("清空缓存文件成功");
        })
        .catch(() => {
          console.log("清空缓存文件失败");
        });
    }
  }
}

export default MediaRecorder;
