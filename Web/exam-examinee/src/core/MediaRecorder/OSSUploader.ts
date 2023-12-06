import OSS from "ali-oss";
import { ISTSData } from "../types";

const OSSTimeout = 3 * 60 * 1000; // 上传 timeout 3 分钟
const RefreshSTSTokenInterval = 30 * 60 * 1000; // 30min 重新请求一次
// 临时访问凭证已过期的错误信息
const ExistErrorMessages = [
  "The OSS Access Key Id you provided does not exist in our records.",
  "The security token you provided has expired.",
];

interface OSSUploaderOptions {
  fetchSTSData: () => Promise<any>;
}

class OSSUploader {
  private uploader?: OSS;
  private stsData?: ISTSData;
  private fetchSTSData: () => Promise<any>;

  constructor(options: OSSUploaderOptions) {
    this.fetchSTSData = options.fetchSTSData;
  }

  public async init() {
    const stsData = await this.fetchSTSData();
    this.stsData = stsData;

    if (!this.stsData) {
      throw { code: -1, message: "no STS data!" };
    }

    try {
      this.uploader = new OSS({
        ...this.stsData,
        timeout: OSSTimeout,
        refreshSTSToken: async () => {
          // 向您搭建的STS服务获取临时访问凭证。
          const info = await this.fetchSTSData();
          return {
            accessKeyId: info.accessKeyId,
            accessKeySecret: info.accessKeySecret,
            stsToken: info.stsToken,
          };
        },
        // 刷新临时访问凭证的时间间隔，单位为毫秒。
        refreshSTSTokenInterval: RefreshSTSTokenInterval,
      });
      // console.log(this.uploader);
    } catch (error: any) {
      console.log("oss 初始化异常！", this.stsData, error);
      throw { code: -1, message: "oss init error!" };
    }
  }

  public uploadFile(streamName: string, file: File) {
    if (!this.uploader) {
      return Promise.reject(new Error("oss not init"));
    }
    
    const path = `${CONFIG.localRecorder.basePath}${streamName}/${file.name}`;

    return new Promise((resolve, reject) => {
      this.uploader?.put(path, file).then((res) => {
        resolve(res);
      }).catch((err) => {
        // 第一次失败时先检查下错误类型
        const bool = this.checkUploadErrorMessage(err?.message);
        if (bool) {
          // 再试一次
          this.uploader?.put(path, file).then((res) => {
            resolve(res);
          }).catch((err) => {
            reject(err);
          });
        } else {
          reject(err);
        }
      });
    });
  }

  private checkUploadErrorMessage(message?: string) {
    if (!this.uploader) {
      return false;
    }
    if (message && ExistErrorMessages.includes(message)) {
      // 若临时访问凭证已过期，那么直接修改 stsTokenFreshTime 为刷新时间前
      // 那么就可以下次调用 oss put 上传时，oss sdk 会触发更新 stsToken
      this.setSTSTokenFreshTime(new Date(
        Date.now() - RefreshSTSTokenInterval - 1000
      ));
      return true;
    }
    return false;
  }

  private setSTSTokenFreshTime(date: Date) {
    if (this.uploader) {
      // 修改 OSS 实例 sts 的刷新时间
      (this.uploader as any).stsTokenFreshTime = date;
    }
  }
}

export default OSSUploader;
