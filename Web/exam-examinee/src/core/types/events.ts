export enum InteractionTypes {
  StreamStop = 20000, // 断流事件，服务端下发
  StreamPublish = 20001, // 推流事件，服务端下发
  StartCalling = 20002, // 发起单人连麦通话
  EndCalling = 20003, // 结束单人连麦通话
  CallConnected = 20004, // 学生端拉到老师流后返回的通知
  CallDisconnected = 20005, // 学生端停止拉流后返回的通知
  StartBroadcastLive = 20006, // 开始全员口播
  BroadcastLiveFeedback = 20007, // 全员口播学生端返回的反馈
  StopBroadcastLive = 20008, // 结束全员口播
  StopBroadcastLiveFeedback = 20009, // 结束全员口播学生端返回的反馈
  EndRoom = 20010, // 结束考试
  BroadcastAudio = 20011, // 播放系统广播
  BroadcastAudioFeedback = 20012, // 播放系统广播学生端返回的反馈
  StopBroadcastAudio = 20013, // 结束系统广播
  StopBroadcastAudioFeedback = 20014, // 结束系统广播学生端返回的反馈
  Reset = 20015, // 用于教师端进入考场后通知所有考生重置连麦等状态
  EnterRoom = 20016, // 考生进入考场，发给老师
  PubSuccess = 20017, // 考生推流成功，发给老师，区分服务端的 StreamPublish
  PubFail = 20018, // 考生推流失败，发给老师，区分服务端的 StreamStop
}

export enum InteractionEvents {
  StreamStop = "StreamStop",
  StreamPublish = "StreamPublish",
  StartCalling = "StartCalling",
  EndCalling = "EndCalling",
  StartBroadcastLive = "StartBroadcastLive",
  StopBroadcastLive = "StopBroadcastLive",
  EndRoom = "EndRoom",
  BroadcastAudio = "BroadcastAudio",
  StopBroadcastAudio = "StopBroadcastAudio",
  Reset = "reset",
}

export enum AudioPlayerEvents {
  Playing = "Playing",
  Ended = "Ended",
}
