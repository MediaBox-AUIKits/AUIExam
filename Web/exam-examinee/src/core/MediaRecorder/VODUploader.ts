import OSS from "ali-oss";
window.OSS = OSS;
import './aliyun-upload-sdk-1.5.6.min.js';
import { ISTSData } from "../types/index.js";

interface VODUploaderOptions {
  fetchSTSData: () => Promise<any>;
}

class VODUploader {
  uploader?: any;
  private stsData?: ISTSData;
  private fetchSTSData: () => Promise<any>;
  // 存储上传 promise
  private uploadPromiseMap = new Map<string, {
    resolve: (res: any) => void;
    reject: (err: any) => void;
  }>();

  constructor(options: VODUploaderOptions) {
    this.fetchSTSData = options.fetchSTSData;
  }

  public async init() {
    const stsData = await this.fetchSTSData();
    this.stsData = stsData;
    if (!this.stsData) {
      throw { code: -1, message: "no STS data!" };
    }
    if (!CONFIG.localRecorder.vod || !CONFIG.localRecorder.vod.region) {
      throw { code: -1, message: "no vod region" };
    }

    this.uploader = new window.AliyunUpload.Vod({
      timeout: 3 * 60 * 1000,
      partSize: 1048576,
      parallel: 5,
      retryCount: 3,
      retryDuration: 2,
      region: CONFIG.localRecorder.vod.region,
      userId: CONFIG.aliyunUid,
      localCheckpoint: true, //此参数是禁用服务端缓存
      // 添加文件成功
      addFileSuccess: (uploadInfo: any) => {
        console.log("addFileSuccess: " + uploadInfo.file.name)
      },
      // 开始上传
      onUploadstarted: (uploadInfo: any) => {
        this.fetchSTSData().then((res: ISTSData) => {
          this.uploader?.setSTSToken(uploadInfo, res.accessKeyId, res.accessKeySecret, res.stsToken, res.expiration);
        });
      },
      // 文件上传成功
      onUploadSucceed: this.handleUploadSucceed.bind(this),
      // 文件上传失败
      onUploadFailed: this.handleUploadFailedOrCanceled.bind(this),
      // 取消文件上传
      onUploadCanceled: this.handleUploadFailedOrCanceled.bind(this),
      // 文件上传进度，单位：字节, 可以在这个函数中拿到上传进度并显示在页面上
      onUploadProgress: (uploadInfo: any, totalSize: number, progress: number) => {
        // console.log("onUploadProgress:file:" + uploadInfo.file.name + ", fileSize:" + totalSize + ", percent:" + Math.ceil(progress * 100) + "%");
      },
      // 上传凭证超时
      onUploadTokenExpired: () => {
        this.fetchSTSData().then((res: ISTSData) => {
          this.uploader?.resumeUploadWithSTSToken(res.accessKeyId, res.accessKeySecret, res.stsToken, res.expiration);
        });
      },
      // 全部文件上传结束
      onUploadEnd: () => {
        // console.log("onUploadEnd: uploaded all the files")
      },
    });
  }

  private handleUploadSucceed(uploadInfo: any) {
    const fileName = uploadInfo?.file?.name;
    console.log("onUploadSucceed: " + fileName + ", endpoint:" + uploadInfo.endpoint + ", bucket:" + uploadInfo.bucket + ", object:" + uploadInfo.object);
    const item = this.uploadPromiseMap.get(fileName);
    if (item) {
      item.resolve({
        name: fileName,
        url: `//${uploadInfo.bucket}.${uploadInfo.endpoint}/${uploadInfo.object}`,
      });
      this.uploadPromiseMap.delete(fileName);
    }
  }

  private handleUploadFailedOrCanceled(uploadInfo: any, code: string, message: string) {
    const fileName = uploadInfo?.file?.name;
    console.log("onUploadFailedOrCanceled: file:" + fileName + ",code:" + code + ", message:" + message);
    const item = this.uploadPromiseMap.get(fileName);
    if (item) {
      item.reject({ code, message });
      this.uploadPromiseMap.delete(fileName);
    }
  }

  public uploadFile(streamName: string, file: File) {
    if (!this.uploader || !this.stsData) {
      return Promise.reject(new Error("oss not init"));
    }
    if (!file) {
      return Promise.reject(new Error("file error"));
    }

    // VOD 模式目前不支持指定路径
    // const path = `/record/local/${streamName}/${file.name}`;

    // 通过 StorageLocation 设置 bucket，但目前 VOD 不支持设置保存的路径，addFile 方法的 object 参数得传 null
    // 注意：自定义的 自有 OSS bucket 得在 https://vod.console.aliyun.com/#/storage/list 点播控制台 -> 存储管理列表里添加了
    const endpoint = `${this.stsData.region}.aliyuncs.com`;
    const paramData = JSON.stringify({
      Vod: {
        ...(CONFIG.localRecorder.vod?.params || {}),
        Title: file.name,
        StorageLocation: this.stsData?.bucket ? `${this.stsData?.bucket}.${endpoint}` : null,
      },
    });

    return new Promise((resolve, reject) => {
      this.uploader?.addFile(file, endpoint, this.stsData?.bucket, null, paramData);
      this.uploader?.startUpload();
      
      this.uploadPromiseMap.set(file.name, { resolve, reject });
    });
  }
}

export default VODUploader;
