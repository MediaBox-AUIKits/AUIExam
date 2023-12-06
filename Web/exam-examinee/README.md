## 考试学生端

### 技术框架
本项目使用 UmiJS 框架开发，技术栈为 React + TypeScript ，详细请了解 [UmiJS 官方文档](https://umijs.org/docs/introduce/introduce)。

### 使用说明

1. 在您的 html 中引入阿里云互动直播 SDK (aliyun-interaction-sdk)，可以参考 plugin.ts
2. 修改 src/config.ts 里的配置项，各个配置项的具体含义请看下一节
3. 本地运行 `npm start` 或者打包 `npm run build`

### 配置项

#### 1. aliyunUid

请填写您开通直播、点播、OSS 等服务的阿里云userId，注意是主账号的userid 。

#### 2. appServer

您的服务端提供请求的域名和前缀，比如请求 https://example-domain/exam/path/，则 origin 填写 https://example-domain，apiPrefixPath 填写 /exam/

#### 3. reporter

SLS 日志的配置项，如果希望使用埋点统计，则需要将 enable 设为 true，同时填写 projectName 和 logstore。如何获取 projectName 和 logstore，请参考 [SLS 文档](https://help.aliyun.com/zh/sls/getting-started) 。
注意：使用 SLS 日志，将会产生对应的费用

#### 4. localRecorder

配置本地录制，支持配置是否开启（推流异常后自动录制当前考试画面）、以及选择上传至 OSS 或 VOD等。

#### 5. cheatDetect

配置防作弊检测所需要的 license 和 域名

#### 6. mobileCameraSwitcher

配置是否开启切换前后摄像头模块

#### 7. defaultVideoProfile

配置默认摄像头流参数

### 服务端 API 列表及说明

请查看服务端 Appserver 文件中接口列表，并实现部署才能正常运行项目。

### 使用到的阿里云服务

本项目使用了多项阿里云服务（如 Live、VOD、OSS、SLS 等），更多请参考对应产品的《阿里云服务开通与配置》文档。
