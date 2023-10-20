## 考试监考官端

### 技术框架
本项目使用 UmiJS 框架开发，技术栈为 React + TypeScript ，详细请了解 [UmiJS 官方文档](https://umijs.org/docs/introduce/introduce)。

### 使用说明

1. 在您的 html 中引入阿里云互动直播 SDK (aliyun-interaction-sdk)，可以参考 plugin.ts
2. 修改 src/config.ts 里的配置项，各个配置项的具体含义请看下一节
3. 本地运行 `npm start` 或者打包 `npm run build`

### 配置项

#### 1. appServer

您的服务端提供请求的域名和前缀，比如请求 https://example-domain/example/path/，则 origin 填写 https://example-domain，apiPrefixPath 填写 /example/

#### 2. reporter

SLS 日志的配置项，如果希望使用埋点统计，则需要将 enable 设为 true，同时填写 projectName 和 logstore。如何获取 projectName 和 logstore，请参考 [SLS 文档](https://help.aliyun.com/document_detail/54604.html) 。
注意：使用 SLS 日志，将会产生对应的费用

#### 3. localRecoder

为是否开启本地录制功能。该功能为当推流失败（如网络异常）时将会把本地音视频内容录制储存在浏览器中，并择机上传至你配置的 oss bucket 下。

#### 4. pagePath

当前页面的域名+路径，目前用于主机位页面（src->pages->pc）本地开发调试时设置进入考生移动端二维码的url，当是 localhost、127.0.0.1 时将替换为该值，其他情况使用当前的 origin + pathname

#### 5. licenseConfig

智能防作弊检测的配置项。如果希望接入智能防作弊检测，您需要申请防作弊 SDK 的 license 并填入对应的字段中，详情请参考 [官方文档](https://help.aliyun.com/document_detail/2543703.htm) 。

### 服务端 API 列表及说明

请查看服务端 Appserver 文件中接口列表，并实现部署才能正常运行项目。

### 使用到的阿里云服务

本项目使用了多项阿里云服务，请参考《阿里云服务开通与配置》文档。
