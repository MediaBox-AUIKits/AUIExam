/**
 * @file 静态资源获取类
 * 先从 IndexDB 中判断是否有相同url的资源，若有直接使用
 * 若没有，通过 URL 获取，并保存至 IndexDB
 */
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import localforage from "localforage";

function blobToArrayBuffer(blob: Blob | File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    // FileReader 方案兼容性好
    const reader = new FileReader();
  
    reader.onload = (event) => {
      const arrayBuffer = event.target?.result;
      if (arrayBuffer) {
        resolve(arrayBuffer as ArrayBuffer);
      } else {
        reject(new Error('FileReader Load Empty!'));
      }
    };
    
    reader.onerror = (event) => {
      reject(event.target?.error || new Error('FileReader Error!'));
    };

    reader.onabort = () => {
      reject(new Error('FileReader Abort!'));
    };
    
    reader.readAsArrayBuffer(blob);
  });
}

interface IResourceManagerProps {
  axiosRequestConfig?: AxiosRequestConfig;
  dbOptions: {
    name?: string;
    storeName?: string;
    driver?: string | string[];
    size?: number;
    version?: number;
    description?: string;
  };
}

class ResourceManager {
  private _request: AxiosInstance;
  private _forage: LocalForage;

  constructor(props: IResourceManagerProps) {
    const { axiosRequestConfig, dbOptions } = props;
    this._request = axios.create({
      timeout: 10 * 1000,
      ...(axiosRequestConfig || {}),
      responseType: "blob", // responseType 必需为 blob
    });

    this._forage = localforage.createInstance(dbOptions);
  }

  async get(url: string): Promise<ArrayBuffer> {
    const blob = await this.fetch(url);
    return blobToArrayBuffer(blob);
  }

  private async fetch(url: string): Promise<Blob> {
    // console.log(url);
    // 判断 indexDB 中是否有缓存，直接返回
    try {
      const data: Blob | null = await this._forage.getItem(url);
      if (data) {
        // console.log('db', data);
        return data;
      }
    } catch (error) {
      //
    }

    const res = await this._request.get(url);
    // console.log('fetch ->', res);
    const blob: Blob = res.data;
    if (blob) {
      try {
        this._forage.setItem(url, blob);
      } catch (error) {
        // 缓存失败不处理
      }
    }
    return blob;
  }

  remove(url: string) {
    return this._forage.removeItem(url);
  }

  clear() {
    return this._forage.clear();
  }
}

export default ResourceManager;

// 音频缓存管理
export const audioManager = new ResourceManager({
  dbOptions: {
    name: 'AUIExam',
    storeName: 'audio',
  },
});
