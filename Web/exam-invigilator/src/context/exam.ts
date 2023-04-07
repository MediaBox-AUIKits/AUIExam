import {
  BasicMap,
  IExam,
  IRoom,
  IUser,
  UserInteractiveStatus,
  UserPublishStatus,
  UserRoleEnum,
} from "@/types";
import { Interaction, RadioTimer } from "@/core";
import React from "react";

interface IExamState {
  examInfo?: IExam;
  roomInfo?: IRoom;
  userInfo?: IUser;
  userList: IUser[];

  // 选中看大流的用户
  activeUser?: IUser;
  // 有可能多于 25 个考生，但一页只展示 25 个，支持翻页
  pageNum: number;
  // 老师类型
  role: UserRoleEnum;
  // 是否已成功加入im聊天组
  groupJoined: boolean;
}

interface IExamReducerAction {
  type: string;
  payload?: BasicMap<any>;
}

export const defaultState: IExamState = {
  userList: [],
  pageNum: 0,
  role: UserRoleEnum.invigilator, // 默认监考员
  groupJoined: false,
};

// 更新用户列表中某个用户的推流状态
function updateUserPublishStatus(
  list: IUser[],
  userId: string,
  publishStatus: UserPublishStatus
): IUser[] {
  if (typeof publishStatus !== "number") {
    return list;
  }
  const index = list.findIndex((item) => item.id === userId);
  if (index === -1) {
    return list;
  }
  const newItem = {
    ...list[index],
    publishStatus,
  };
  list.splice(index, 1, newItem);
  return [...list];
}

// 更新用户列表中多个用户的推流状态
function updateUserInteractiveStatus(
  list: IUser[],
  params: { status: UserInteractiveStatus; userId: string }[]
) {
  if (!params.length) {
    return list;
  }
  params.forEach((item) => {
    const { status, userId } = item;
    const index = list.findIndex((item) => item.id === userId);
    if (index === -1) {
      return;
    }
    const newItem = {
      ...list[index],
      interactiveStatus: status,
    };
    list.splice(index, 1, newItem);
  });
  return [...list];
}

export function examReducer(
  state: IExamState,
  action: IExamReducerAction
): IExamState {
  switch (action.type) {
    case "update":
      if (!action.payload) {
        return state;
      }
      return { ...state, ...action.payload };
    case "setActiveUser":
      if (!action.payload) {
        return state;
      }
      return {
        ...state,
        activeUser: action.payload as IUser,
      };
    case "resetActiveUser":
      return {
        ...state,
        activeUser: undefined,
      };
    case "updateRoomInfo":
      if (!action.payload) {
        return state;
      }
      return {
        ...state,
        roomInfo: action.payload as IRoom,
      };
    case "updateExamInfo":
      if (!action.payload) {
        return state;
      }
      return {
        ...state,
        examInfo: action.payload as IExam,
      };
    case "updateUserInfo":
      if (!action.payload) {
        return state;
      }
      return {
        ...state,
        userInfo: action.payload as IUser,
      };
    case "updateUserList":
      if (!action.payload) {
        return state;
      }
      return {
        ...state,
        userList: action.payload as IUser[],
      };
    case "updateUserListItem":
      const payload = action.payload;
      if (!payload) {
        return state;
      }
      const list = state.userList.slice(0);
      const index = list.findIndex((item) => item.id === payload.id);
      if (index !== -1) {
        list.splice(index, 1, payload as IUser);
      }
      return {
        ...state,
        userList: list,
      };
    case "nextPage":
      return {
        ...state,
        pageNum: state.pageNum + 1,
      };
    case "prevPage":
      return {
        ...state,
        pageNum: state.pageNum - 1,
      };
    case "setRole":
      if (
        action.payload &&
        typeof action.payload.role === "number" &&
        !isNaN(action.payload.role)
      ) {
        return {
          ...state,
          role: action.payload.role,
        };
      }
      return state;
    // 更新用户的推流状态
    case "updateUserPublishStatus":
      if (action.payload) {
        const { userId, publishStatus } = action.payload as any;
        const userList = updateUserPublishStatus(
          state.userList,
          userId,
          publishStatus
        );
        if (userList !== state.userList) {
          return { ...state, userList };
        }
      }
      return state;
    case "updateUserInteractiveStatus":
      const userList = updateUserInteractiveStatus(
        state.userList,
        action.payload as any[]
      );
      if (userList !== state.userList) {
        return { ...state, userList };
      }
      return state;
    case "reset":
      return { ...defaultState };
    default:
      throw new Error();
  }
}

type ExamContextType = {
  state: IExamState;
  interaction: Interaction;
  radioTimer: RadioTimer;
  dispatch: React.Dispatch<IExamReducerAction>;
};

export const ExamContext = React.createContext<ExamContextType>({
  state: { ...defaultState },
  interaction: new Interaction({
    rongCloudIm: CONFIG.rongCloudIm.enable ?{
      appkey: CONFIG.rongCloudIm.appkey,
    } : undefined
  }),
  radioTimer: new RadioTimer(),
  dispatch: () => {},
});
