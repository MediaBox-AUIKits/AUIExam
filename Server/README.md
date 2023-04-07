# 一、环境说明
## 1.1、安装编译依赖

- 安装 Go 版本，1.18.x 及以上版本，详见：[https://go.dev/learn/](https://go.dev/learn/)
- 安装swagger工具，请具体参考：[https://github.com/swaggo/swag](https://github.com/swaggo/swag)
```bash
go install github.com/swaggo/swag/cmd/swag@latest
```
## 1.2、运行时相关配置
服务端涉及3类信息的配置，配置完成相关的云服务开通、配置。相应的配置项，需要写入服务端源码，`/conf/config.json`里。具体的开通配置文档：[链接](https://alidocs.dingtalk.com/i/nodes/R1zknDm0WR6XzZ4Ltm0B7bdEWBQEx5rG?iframeQuery=utm_medium%3Dim_card%26utm_source%3Dim&utm_medium=im_single_card&utm_source=im&utm_scene=person_space&dontjump=true&corpId=dingd8e1123006514592&cid=6703172:13201965)
### 1.2.1、推拉流配置
```bash
    "live_stream": {
        "scheme": "http",
        "push_url": "****.example.vip", // 推流域名
        "pull_url": "****.example.vip", // 拉流域名
        "push_auth_key": "********",    // 推流域名的鉴权key，具体在直播控制台->加速服务->域名管理->直播管理->访问控制->URL鉴权->主key，见图1
        "pull_auth_key": "********",    // 拉流域名的鉴权key，具体在直播控制台->加速服务->域名管理->直播管理->访问控制->URL鉴权->主key，见图1
        "app_name": "exam",             // 用户可随意自定义
        "auth_expires": 604800
    },
```
![image.png](https://intranetproxy.alipay.com/skylark/lark/0/2023/png/14667/1680253998266-bdb509b8-0830-4d16-955b-491701c7e446.png#clientId=u17b6661a-ecfd-4&from=paste&height=414&id=u707178a2&name=image.png&originHeight=414&originWidth=1096&originalType=binary&ratio=1&rotation=0&showTitle=false&size=77539&status=done&style=none&taskId=u61887a82-1d40-4e22-b704-f2cc9925c7d&title=&width=1096)<br />图1，推拉流域名鉴权key
### 1.2.2、IM配置
```bash
"live_im": {
        "app_id": "****" //IM的app ID，见图2
    }
```
![image.png](https://intranetproxy.alipay.com/skylark/lark/0/2023/png/14667/1680254232816-8c13c0de-cb30-438b-8f87-951b84bd1465.png#clientId=u17b6661a-ecfd-4&from=paste&height=441&id=ub3fada5d&name=image.png&originHeight=1252&originWidth=1016&originalType=binary&ratio=1&rotation=0&showTitle=false&size=91551&status=done&style=none&taskId=u15b363f1-f2b2-4832-b72c-e9ffd5197ee&title=&width=358)<br />图2，IM配置的app ID
### 1.2.3、openapi配置
```bash
    "openapi": {
        "endpoint": "live.aliyuncs.com",
        "region": "cn-shanghai",
        "version": "2016-11-01",
        "access_key_id": "********", //阿里云服务的ak，见图3，https://ram.console.aliyun.com/manage/ak获取
        "access_key_secret": "****", //阿里云服务的sk，见图3，https://ram.console.aliyun.com/manage/ak获取
        "sts_token": ""
    },
```
![image.png](https://intranetproxy.alipay.com/skylark/lark/0/2023/png/14667/1680254982829-2922833c-fe2c-4185-b821-08cc7aa93588.png#clientId=u17b6661a-ecfd-4&from=paste&height=302&id=ueff4ba97&name=image.png&originHeight=302&originWidth=2129&originalType=binary&ratio=1&rotation=0&showTitle=false&size=316402&status=done&style=none&taskId=u14a8bd7a-a2d6-451a-b7ec-d18a3b4a3b0&title=&width=2129)<br />图3，配置AK SK

# 二、编译运行

## 构建执行文件

```bash
go build -o main ./cmd/main.go
```

## 本地运行

```bash
export ADMIN_PASSWORD=your-secret
./main
```

所有 API 及对应文档:
浏览器打开：http://localhost:7001/swagger/index.html
用户名为 admin，密码为您自行设置

## 生成`swagger`文档

```bash
# 安装swagger工具 请具体参考：https://github.com/swaggo/swag
go install github.com/swaggo/swag/cmd/swag@latest

# 动态生成文档
swag init -g pkg/handler/*.go
```

# 三、接口
## 通用请求头参数
用于请求 header 上

| name | type | required | desc |
| --- | --- | --- | --- |
| authorization | string | YES | 身份认证token，通过页面url参数传入 |

## 创建考场
**Path:** /exam/createRoom<br />**Method:** POST

> REQUEST

<br />**Query:**

| param | type | required | desc |
| --- | --- | --- | --- |
| name | string | YES | 考场名称 |

> RESPONSE

<br />**Body:**

| name | type | desc |
| --- | --- | --- |
| success | boolean | 是否成功 |
| errorCode | string | 异常码 |
| errorMsg | string | 异常信息 |
| data | object | 数据 |
|   &#124;─id | string | 考场id |
|   &#124;─name | string | 考场名称 |
|   &#124;─examId | string | 考试id |
|   &#124;─status | integer | 考场状态<br />0：进行中<br />1：已结束 |
|   &#124;─audioStatus | integer | 考场口播状态，<br />0：未口播<br />1：正在口播 |
|   &#124;─imGroupId | string | 消息组id |
|   &#124;─createTeacher | string | 考场创建者id |

<br />**Response Demo:**

```json
{
  "success": false,
  "errorCode": "",
  "errorMsg": "",
  "data": {
    "id": "roomId",
    "name": "模拟考场",
    "examId": "examId",
    "status": 0,
    "audioStatus": 0,
    "imGroupId": "xxx",
    "createTeacher": "teacherId"
  }
}
```
<br />**addRoom 时序图**
![](https://intranetproxy.alipay.com/skylark/lark/__puml/c11b4fa0a71a5d8bbd5e5789b913bada.svg#lake_card_v2=eyJ0eXBlIjoicHVtbCIsImNvZGUiOiJAc3RhcnR1bWxcblxuYXV0b251bWJlclxuXG5hY3RvciBcIueUqOaIt1wiIGFzIFVzZXJcbnBhcnRpY2lwYW50IFwi5rWP6KeI5ZmoXCIgYXMgQnJvd3NlclxucGFydGljaXBhbnQgXCLmnI3liqHnq69cIiBhcyBTZXJ2ZXIgI29yYW5nZVxucGFydGljaXBhbnQgXCLmlbDmja7lupNcIiBhcyBEYXRhYmFzZSAjMzRkZmRmXG5wYXJ0aWNpcGFudCBcIklN5pyN5YqhXCIgYXMgSU0gI2FhYjQ0NFxuXG5hY3RpdmF0ZSBVc2VyXG5cblVzZXIgLT4gQnJvd3Nlcjog6L6T5YWl5ZCN56ew77yM5Yib5bu66ICD5Zy6XG5hY3RpdmF0ZSBCcm93c2VyXG5cbkJyb3dzZXIgLT4gU2VydmVyOiDosIPnlKggL2V4YW0vYWRkUm9vbVxubm90ZSByaWdodCBvZiBCcm93c2VyOiDkvKDlhaXlj4LmlbAgbmFtZVxuYWN0aXZhdGUgU2VydmVyXG5cblNlcnZlciAtPiBEYXRhYmFzZTog5b6A6ICD6K-V6KGo5Lit5paw5bu65LiA5p2h6ICD6K-V6K6w5b2VXG5hY3RpdmF0ZSBEYXRhYmFzZVxuRGF0YWJhc2UgLT4gU2VydmVyOiDov5Tlm57ogIPor5Xkv6Hmga9cbmRlYWN0aXZhdGUgRGF0YWJhc2VcblxuU2VydmVyIC0-IElNOiDliJvlu7rmtojmga_nu4RcbmFjdGl2YXRlIElNXG5JTSAtPiBTZXJ2ZXI6IOi_lOWbniBpbUdyb3VwSWRcbmRlYWN0aXZhdGUgSU1cblxuXG5TZXJ2ZXIgLT4gRGF0YWJhc2U6IOW-gOiAg-WcuuihqOS4reaWsOW7uuS4gOadoeiAg-WcuuiusOW9lVxuYWN0aXZhdGUgRGF0YWJhc2Vcbm5vdGUgcmlnaHQgb2YgU2VydmVyOiDkvb_nlKjogIPlnLrkv6Hmga_kuK3nmoQgZXhhbUlkIOWSjCBpbUdyb3VwSWRcblxuRGF0YWJhc2UgLT4gU2VydmVyOiDov5Tlm57ogIPlnLrkv6Hmga9cbmRlYWN0aXZhdGUgRGF0YWJhc2VcblxuU2VydmVyIC0-IEJyb3dzZXI6IOi_lOWbnuWIm-W7uue7k-aenFxuZGVhY3RpdmF0ZSBTZXJ2ZXJcblxuQnJvd3NlciAtLT4gVXNlcjog5riy5p-T57uT5p6c5qih5Z2XXG5cbkBlbmR1bWwiLCJ1cmwiOiJodHRwczovL2ludHJhbmV0cHJveHkuYWxpcGF5LmNvbS9za3lsYXJrL2xhcmsvX19wdW1sL2MxMWI0ZmEwYTcxYTVkOGJiZDVlNTc4OWI5MTNiYWRhLnN2ZyIsImlkIjoicmJ2clIiLCJtYXJnaW4iOnsidG9wIjp0cnVlLCJib3R0b20iOnRydWV9LCJjYXJkIjoiZGlhZ3JhbSJ9)

## 获取考场信息
**Path:** /exam/roomInfo<br />**Method:** GET

> REQUEST


**Query:**

| name | type | required | desc |
| --- | --- | --- | --- |
| roomId | string | YES | 考场id，通过页面url参数传入 |


> RESPONSE


**Body:**

| name | type | desc |
| --- | --- | --- |
| success | boolean | 是否成功 |
| errorCode | string | 异常码 |
| errorMsg | string | 异常信息 |
| data | object | 数据 |
|   &#124;─id | string | 考场id |
|   &#124;─name | string | 考场名称 |
|   &#124;─examId | string | 考试id |
|   &#124;─status | integer | 考场状态<br />0：进行中<br />1：已结束 |
|   &#124;─audioStatus | integer | 考场口播状态，<br />0：未口播<br />1：正在口播 |
|   &#124;─imGroupId | string | 消息组id |
|   &#124;─createTeacher | string | 考场创建者id |


**Response Demo:**

```json
{
  "success": true,
  "errorCode": "",
  "errorMsg": "",
  "data": {
    "id": "roomId",
    "name": "模拟考场",
    "examId": "examId",
    "status": 0,
    "audioStatus": 0,
    "imGroupId": "xxx",
    "createTeacher": "teacherId"
  }
}
```
## 获取考试信息
**Path:** /exam/examInfo<br />**Method:** GET

> REQUEST


**Query:**

| name | type | required | desc |
| --- | --- | --- | --- |
| examId | string | YES | 考试id，来源是考场信息返回 |


> RESPONSE


**Body:**

| name | type | desc |
| --- | --- | --- |
| success | boolean | 是否成功 |
| errorCode | string | 异常码 |
| errorMsg | string | 异常信息 |
| data | object | 数据 |
|   &#124;─id | string | 考试id |
|   &#124;─name | string | 考试名称 |
|   &#124;─startTime | string | 开始时间，使用 YYYY/MM/DD HH:mm:ss 格式化 |
|   &#124;─endTime | string | 结束时间 |
|   &#124;─radioInfo | array | 定时播放的音频 |
|     &#124;─ | object |  |
|       &#124;─id | string | id |
|       &#124;─classify | integer | 分类 |
|       &#124;─name | string | 名字 |
|       &#124;─startTime | string | 触发播放时间 |
|       &#124;─url | string | cdn地址 |
|       &#124;─ossUrl | string | oss地址（非必需） |
|   &#124;─audioInfo | array | 需要老师手动播放的音频 |
|     &#124;─ | object |  |
|       &#124;─id | string |  |
|       &#124;─classify | integer | 分类字典 |
|       &#124;─name | string | 音频名字 |
|       &#124;─url | string | 音频地址 |
|       &#124;─ossUrl | string | oss地址（非必需） |


**Response Demo:**

```json
{
  "success": true,
  "errorCode": "",
  "errorMsg": "",
  "data": {
    "id": "123456",
    "name": "exam",
    "startTime": "2023/03/30 14:00:00",
    "endTime": "2023/03/30 17:00:00",
    "radioInfo": [
      {
        "id": "",
        "classify": 0,
        "name": "",
        "startTime": "2023/03/30 14:30:00",
        "url": ""
      }
    ],
    "audioInfo": [
      {
        "id": "",
        "classify": 0,
        "name": "",
        "url": ""
      }
    ]
  }
}
```
## 获取用户信息
**Path:** /exam/userInfo<br />**Method:** GET

> REQUEST


**Query:**

| name | type | required | desc |
| --- | --- | --- | --- |
| userId | 用户id | YES | 用户id，通过页面url参数传入 |
| roomId | 考场id | YES | 考场id，通过页面url参数传入 |


> RESPONSE


**Body:**

| name | type | desc |
| --- | --- | --- |
| success | boolean | 是否成功 |
| errorCode | string | 异常码 |
| errorMsg | string | 异常信息 |
| data | object | 数据 |
|   &#124;─id | string | 用户id |
|   &#124;─name | string | 昵称 |
|   &#124;─userStatus | int | 状态（目前没用上）<br />0: 有进行中的考场<br />1: 无进行中的考场 |
|   &#124;─rtcPushUrl | string | 推流地址 |
|   &#124;─rtcPullUrl | string | 大流地址 |
|   &#124;─rtsPullUrl | string | 小流地址（转码低清晰度的流） |


**Response Demo:**

```json
{
  "success": true,
  "errorCode": "",
  "errorMsg": "",
  "data": {
    "id": "userid",
    "name": "username",
    "userStatus": 0,
    "rtcPushUrl": "artc://{yourPushDomain}/exam/xxx-xxx-xxx?grtn_twin_rtmp=on",
    "rtcPullUrl": "artc://{yourBigPullDomain}/exam/xxx-xxx-xxx",
    "rtsPullUrl": "artc://{yourSmallPullDomain}/exam/xxx-xxx-xxx_240p"
  }
}
```
## 获取考场的学生列表
**Path:** /exam/userList<br />**Method:** GET

> REQUEST


**Query:**

| name | type | required | desc |
| --- | --- | --- | --- |
| roomId | 考场id | YES | 考场id，通过页面url参数传入 |


> RESPONSE


**Body:**

| name | type | desc |
| --- | --- | --- |
| success | boolean | 是否成功 |
| errorCode | string | 异常码 |
| errorMsg | string | 异常信息 |
| data | array | 数据 |
|   &#124;─ | object |  |
|     &#124;─id | string | 用户id |
|     &#124;─name | string | 昵称 |
|     &#124;─userStatus | int | 状态（目前没有用上） |
|     &#124;─rtcPushUrl | string | 推流地址 |
|     &#124;─rtcPullUrl | string | 大流地址 |
|     &#124;─rtsPullUrl | string | 小流地址 |


**Response Demo:**

```json
{
  "success": true,
  "errorCode": "",
  "errorMsg": "",
  "data": [
    {
      "id": "userid",
      "name": "username",
      "userStatus": 0,
      "rtcPushUrl": "artc://{yourPushDomain}/exam/xxx-xxx-xxx?grtn_twin_rtmp=on",
      "rtcPullUrl": "artc://{yourBigPullDomain}/exam/xxx-xxx-xxx",
      "rtsPullUrl": "artc://{yourSmallPullDomain}/exam/xxx-xxx-xxx_240p"
    }
  ]
}
```
## 获取考场IM token接口
请参考[阿里云直播互动消息文档](https://help.aliyun.com/document_detail/462740.html)接入。<br />**Path:** /exam/getIMToken<br />**Method:** POST

> REQUEST


**Request Body:**

| name | type | desc |
| --- | --- | --- |
| deviceId | string | 设备id，唯一串即可 |
| deviceType | string | 设备类型，这里目前填  'web' |
| userId | string | 用户id，通过页面url参数传入 |


> RESPONSE


**Body:**

| name | type | desc |
| --- | --- | --- |
| success | boolean | 是否成功 |
| errorCode | string | 异常码 |
| errorMsg | string | 异常信息 |
| data | object | 数据 |
|   &#124;─accessToken | string | 阿里云互动消息的 accessToken |
|   &#124;─rongToken | string | 融云IMSDK所需的 token，非必要，如果没有就不初始化融云服务 |


**Response Demo:**

```json
{
  "success": true,
  "errorCode": "",
  "errorMsg": "",
  "data": {
    "accessToken": "",
    "rongToken": "",
  }
}
```
## 获取oss配置
请参考[阿里云 STS 文档](https://help.aliyun.com/document_detail/100624.html)实现，目前开源的 Appserver 源码中暂未实现，请自行实现。<br />**Path:** /exam/getOssConfig<br />**Method:** GET

> REQUEST

**Query:**

| name | type | required | desc |
| --- | --- | --- | --- |
| examId | 考试id | YES | 考试id |


> RESPONSE

**Body:**

| name | type | desc |
| --- | --- | --- |
| success | boolean | 是否成功 |
| errorCode | string | 异常码 |
| errorMsg | string | 异常信息 |
| data | object | 数据 |
|   &#124;─region | string | 以华东1（杭州）为例，yourRegion填写为oss-cn-hangzhou |
|   &#124;─accessKeyId | string | 从STS服务获取的临时访问密钥（AccessKey ID和AccessKey Secret） |
|   &#124;─accessKeySecret | string | Secret |
|   &#124;─stsToken | string | 从STS服务获取的安全令牌（SecurityToken） |
|   &#124;─bucket | string | 填写Bucket名称 |


**Response Demo:**

```json
{
  "success": true,
  "errorCode": "",
  "errorMsg": "",
  "data": {
    "region": "",
    "accessKeyId": "",
    "accessKeySecret": "",
    "stsToken": "",
    "bucket": ""
  }
}
```
## 查询系统音频列表
**Path:** /exam/selectAudio<br />**Method:** POST

> REQUEST

**Request Body:**

| name | type | desc |
| --- | --- | --- |
| pageSize | integer | 页面大小 |
| pageNum | integer | 页数 |
| name | string | 筛选音频名称（非必填） |
| classify | integer | 分类 |


**Request Demo:**

```json
{
  "pageSize": 0,
  "pageNum": 0,
  "name": "",
  "classify": 0
}
```

> RESPONSE

**Body:**

| name | type | desc |
| --- | --- | --- |
| success | boolean | 是否成功 |
| errorCode | string | 异常码 |
| errorMsg | string | 异常信息 |
| data | object | 数据 |
|   &#124;─pageNum | integer | 分页 |
|   &#124;─pageSize | integer | 一页条数 |
|   &#124;─total | integer | 总数 |
|   &#124;─list | array |  |
|     &#124;─ | object |  |
|       &#124;─id | string |  |
|       &#124;─classify | integer | 分类字典 |
|       &#124;─name | string | 音频名字 |
|       &#124;─url | string | 音频地址 |
|       &#124;─ossUrl | string | oss地址（非必需） |


**Response Demo:**

```json
{
  "success": true,
  "errorCode": "",
  "errorMsg": "",
  "data": {
    "pageNum": 1,
    "pageSize": 10,
    "total": 14,
    "list": [
      {
        "id": "11111",
        "classify": 0,
        "name": "audio",
        "url": "",
        "ossUrl": "",
      }
    ]
  }
}
```
## 更新考场口播状态
**Path:** /exam/updateRoomAudioStatus<br />**Method:** POST

> REQUEST

**Query:**

| name | value | required | desc |
| --- | --- | --- | --- |
| id |  | YES | 考场id |
| audioStatus |  | YES | 考场口播状态<br />0：未口播<br />1：正在口播 |


> RESPONSE

**Body:**

| name | type | desc |
| --- | --- | --- |
| success | boolean | 是否成功 |
| errorCode | string | 异常码 |
| errorMsg | string | 异常信息 |
| data | boolean | 数据 |


**Response Demo:**

```json
{
  "success": true,
  "errorCode": "",
  "errorMsg": "",
  "data": true
}
```
## 结束考场
**Path:** /exam/endRoom<br />**Method:** GET

> REQUEST

**Query:**

| name | type | required | desc |
| --- | --- | --- | --- |
| roomId | string | YES | 考场id，通过页面url参数传入 |


> RESPONSE

**Body:**

| name | type | desc |
| --- | --- | --- |
| success | boolean | 是否成功 |
| errorCode | string | 异常码 |
| errorMsg | string | 异常信息 |
| data | boolean | 数据 |


**Response Demo:**

```json
{
  "success": true,
  "errorCode": "",
  "errorMsg": "",
  "data": true
}
```
## 用户行为回调
非前端使用，用于服务端监听流的推断的回调<br />**Path:** /exam/userAct<br />**Method:** GET

> REQUEST


**Query:**

| name | type | required | desc |
| --- | --- | --- | --- |
| time |  | NO | Unix时间戳。单位：秒 |
| usrargs |  | NO | 用户推流的参数 |
| action |  | NO | publish表示推流，publish_done表示断流 |
| app |  | NO | 默认为自定义的推流域名，如果未绑定推流域名即为播流域名 |
| appname |  | NO | 应用名称 |
| id |  | NO | 流名称 |
| ip |  | NO | 推流的客户端IP |
| node |  | NO | CDN接受流的节点或者机器名 |
| height |  | NO | 分辨率的高。单位：像素。<br />    说明 分辨率信息（height和width）仅在首次回调时产生 |
| width |  | NO | 分辨率的宽。单位：像素 |


> RESPONSE


**Body:**

| name | type | desc |
| --- | --- | --- |
| success | boolean | 是否成功 |
| errorCode | string | 异常码 |
| errorMsg | string | 异常信息 |
| data | boolean | 数据 |


**Response Demo:**

```json
{
  "success": false,
  "errorCode": "",
  "errorMsg": "",
  "data": false
}
```
