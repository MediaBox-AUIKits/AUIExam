export enum RoomStatusEnum {
  examing = 0, // 进行中
  end = 1, // 已结束
}

// 服务端记录的考场口播状态
export enum RoomAudioStatusEnum {
  no = 0, // 未口播
  yes = 1, // 口播中
}

export interface IRoom {
  id: string; // 考场ID
  name: string; // 考场名称
  examId: string; // 考试ID
  status: RoomStatusEnum;
  imGroupId: string;
  createTeacher: string; // 创建老师ID
  audioStatus: RoomAudioStatusEnum; // 服务端口播状态，其字段命名和前端不一致
}
