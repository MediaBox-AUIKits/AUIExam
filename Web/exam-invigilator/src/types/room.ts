export enum RoomStatusEnum {
  examing = 0, // 进行中
  end = 1, // 已结束
}

export interface IRoom {
  id: string; // 考场ID
  name: string; // 考场名称
  examId: string; // 考试ID
  status: RoomStatusEnum;
  imGroupId: string;
  createTeacher: string; // 创建老师ID
}
