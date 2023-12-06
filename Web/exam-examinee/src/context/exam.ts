import { BasicMap, IExam, IRoom, IUser } from "@/types";
import { Interaction, MediaRecorder, RadioTimer } from "@/core";
import React from "react";

interface IExamState {
  examInfo?: IExam;
  roomInfo?: IRoom;
  userInfo?: IUser;
  invigilator?: IUser;
  cacheUploading: boolean;
  // 是否已成功加入im聊天组
  groupJoined: boolean;
  deviceInfo?: DeviceInfo;
}

interface DeviceInfo {
  audio: string,
  video: string,
}

interface IExamReducerAction {
  type: string;
  payload?: BasicMap<any>;
}

export const defaultState: IExamState = {
  cacheUploading: false,
  groupJoined: false,
};

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
    case "updateInvigilator":
      if (!action.payload) {
        return state;
      }
      return {
        ...state,
        invigilator: action.payload as IUser,
      };
    case "reset":
      return { ...defaultState };
    case "updateDeviceInfo":
      if (!action.payload) {
        return state;
      }
      return {
        ...state,
        deviceInfo: action.payload as DeviceInfo,
      };
    default:
      throw new Error();
  }
}

type ExamContextType = {
  state: IExamState;
  interaction: Interaction;
  radioTimer: RadioTimer;
  recorder: MediaRecorder;
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
  recorder: new MediaRecorder(),
  dispatch: () => {},
});
