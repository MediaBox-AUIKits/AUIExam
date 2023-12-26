import GridContent from "@/components/GridContent";
import SingleContent from "@/components/SingleContent";
import { ExamContext } from "@/context/exam";
import { UserRoleEnum, RoomStatusEnum } from "@/types";
import { getParamFromSearch } from "@/utils/common";
import { MockRoomId, MockTeacherId } from "@/utils/LocalMock";
import { EBizType, reporter } from "@/utils/Reporter";
import services from "@/utils/services";
import { Button, message, Modal, Spin } from "antd";
import { useContext, useEffect, useState } from "react";
import { history } from "umi";
import styles from "./index.less";

export default function HomePage() {
  const { state, interaction, radioTimer, dispatch } = useContext(ExamContext);
  const { roomInfo, activeUser, role } = state;
  const [initing, setIniting] = useState<boolean>(true);
  const [initTip, setInitTip] = useState<string>("考场加载中...");
  const [roomId, setRoomId] = useState<string>("");

  useEffect(() => {
    if (!window.isSecureContext) {
      Modal.info({
        content: '当前环境非安全环境将无法获取媒体设备，线上环境请使用 https 协议，本地开发请使用 localhost！',
        okText: '我知道了',
      });
    }

    initPage();

    return () => {
      radioTimer.destroy();
    };
  }, []);

  const initPage = async () => {
    const role = getParamFromSearch("role");
    let isInspector = false; // 是否是巡考员
    if (role) {
      isInspector = Number(role) === UserRoleEnum.inspector;
      dispatch({ type: "setRole", payload: { role: Number(role) } });
    }
    const mock = getParamFromSearch("mock");
    let roomId = getParamFromSearch("roomId");
    let userId = getParamFromSearch("userId");
    // token 的生成和校验逻辑由客户自定义，用于用户的身份校验
    let token = getParamFromSearch("token");
    if (mock === "1") {
      roomId = roomId || MockRoomId;
      userId = userId || MockTeacherId;
      token = token || "1fTyFwuS3P8EqU04sP8Lru9LeayXxBYb";
    }
    if (!roomId || !userId || !token) {
      message.error({
        content: "初始化参数异常，请关闭再打开重试！",
        duration: 0,
      });
      setInitTip("缺少参数，请检查！");
      reporter.illegalInitialParams({ roomId, userId, token });
      return;
    }
    setRoomId(roomId);
    services.setHeaderAuthorization(token);

    try {
      // 获取考场信息
      const roomInfoRes: any = await services.getRoomInfo(roomId);
      // 获取考试信息
      const examInfoRes: any = await services.getExamInfo(roomInfoRes.examId);
      // 获取个人信息
      const userInfoRes: any = await services.getUserInfo(userId, roomId);
      // 获取考生列表
      const listRes: any = await services.getUserList(roomId);
      // 更新定时音频
      radioTimer.init(examInfoRes.radioInfo);
      // 更新日志基础信息
      reporter.updateCommonParams({
        examid: roomInfoRes.examId,
        roomname: roomInfoRes.name,
        username: userInfoRes.name,
        biz: isInspector ? EBizType.Inspector : EBizType.Invigilator,
      });

      dispatch({
        type: "update",
        payload: {
          roomInfo: roomInfoRes,
          examInfo: examInfoRes,
          userInfo: userInfoRes,
          userList: listRes,
        },
      });

      setIniting(false);

      // 如果考场结束直接跳转
      if (roomInfoRes.status === RoomStatusEnum.end) {
        history.push("/ended");
        return;
      }

      // 巡考员不需要加入消息服务，且不能重置状态
      if (!isInspector) {
        joinGroup(roomInfoRes.imGroupId, roomInfoRes.id, userInfoRes.id);
        updateServerRoomStatus(roomInfoRes.id);
      }
    } catch (error) {
      message.error({
        content: "页面初始化失败，请刷新或重新打开！",
        duration: 0,
      });
      console.log(error);
      reporter.initError(error);
    }
  };

  const updateServerRoomStatus = (roomId: string) => {
    // 初始化完成后需要重置服务端考场状态，当前只重置口播状态
    services
      .updateRoomAudioStatus(roomId, 0)
      .then(() => {
        //
      })
      .catch((err) => {
        reporter.updateBoardcastLiveStatusError(err);
      });
  };

  const joinGroup = async (groupId: string, roomId: string, userId: string) => {
    function join() {
      return new Promise(async (resove, reject) => {
        try {
          await interaction.aliyunIMV2Init();
          await interaction.auth();
          await interaction.joinGroup(groupId);
          reporter.joinGroupSuccess(groupId);
          resove("");
        } catch (error: any) {
          reporter.joinGroupError({
            groupId,
            ...(error ? error.body || error : {}),
          });
          reject(error);
        }
      });
    }
    const fetchIMToken = (imServer: string[]) => {
      return services.getInteractionToken(roomId, userId, "admin", imServer);
    };
    try {
      const imServer = ["aliyun_new"];
      if (CONFIG.rongCloudIm.enable) {
        imServer.push("rong_cloud");
      }
      const res: any = await fetchIMToken(imServer);
      const promises: Promise<any>[] = [];
      if (CONFIG.rongCloudIm.enable) {
        if (res.rongToken) {
          promises.push(interaction.connectRC(res.rongToken, groupId));
        } else {
          reporter.rongIMError({ code: -1, message: "接口未返回融云token" });
        }
      }
      const tokenConfig = res.aliyunNewIm;
      if (!tokenConfig) {
        reporter.joinGroupError({
          groupId,
          code: -1,
          message: "互动消息token字符串异常",
        });
      } else {
        interaction.setTokenConfig(tokenConfig, async () => {
          const tokenRes: any = await fetchIMToken(["aliyun_new"]);
          return tokenRes.aliyunNewIm;
        });
        promises.push(join());
      }
      if (!promises.length) {
        throw { code: -1, message: "接口数据异常，无阿里云、融云 IM Token" };
      }

      Promise.allSettled(promises).then((results) => {
        // 有一个连接成功都算成功
        const bool = results.some((result) => result.status === "fulfilled");
        if (bool) {
          // 加入消息组后通知考生重置状态
          interaction.resetStatus();
          // 更新为已加入聊天组
          dispatch({ type: "update", payload: { groupJoined: true } });
        } else {
          message.error("加入消息组失败，无法使用连麦、口播等功能");
        }
      });
    } catch (error: any) {
      message.error("加入消息组失败，无法使用连麦、口播等功能");
      reporter.joinGroupError({
        groupId,
        ...(error ? error.body || error : {}),
      });
    }
  };

  const endRoom = () => {
    Modal.confirm({
      title: "确认要结束本场考试吗？",
      content:
        "结束考试后，将关闭本考场。所有考生将断开音视频连接。此操作不可逆。",
      okText: "确定",
      okType: "danger",
      cancelText: "取消",
      onOk() {
        return new Promise<any>((resolve, reject) => {
          reporter.endRoom();
          services
            .endRoom(roomId)
            .then(() => {
              // 重定向到考试结束页，并且发送考生结束的消息
              interaction.endRoom();
              history.push("/ended");
              resolve("");
            })
            .catch((err) => {
              console.log("结束考试失败", err);
              message.error("结束考试失败");
              reporter.endRoomError(err);
              reject(err);
            });
        });
      },
      onCancel() {},
    });
  };

  return (
    <Spin
      wrapperClassName={styles.home}
      spinning={initing}
      tip={initTip}
      size="large"
      delay={500}
    >
      <div className={styles.header}>
        <span>{roomInfo ? roomInfo.name : ""}</span>
        {role === UserRoleEnum.invigilator ? (
          <Button
            size="small"
            type="primary"
            danger
            style={{ float: "right" }}
            onClick={endRoom}
          >
            结束考试
          </Button>
        ) : null}
      </div>

      <GridContent
        mainClassName={styles.main}
        footerClassName={styles.footer}
      />
      {activeUser ? (
        <SingleContent
          mainClassName={styles.main}
          footerClassName={styles.footer}
        />
      ) : null}
    </Spin>
  );
}
