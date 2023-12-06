import { ExamContext } from "@/context/exam";
import { UserRoleEnum } from "@/types";
import { Button, Modal } from "antd";
import { useContext, useMemo, useState } from "react";
import Subscribe from "../rts/Subscribe";
import styles from "./index.less";

type DetectVideoModalProp = {
  showDetectModal: boolean;
  onCancel: () => void;
};

function DetectVideoModal({ showDetectModal, onCancel }: DetectVideoModalProp) {
  const { state } = useContext(ExamContext);
  const { userList, viewExamineeId, viewExamineeDetectMsg, role } = state;
  const [pcCanplay, setPcCanplay] = useState<boolean>(true);
  const [mobileCanplay, setMobileCanplay] = useState<boolean>(true);

  const user = useMemo(() => {
    return userList.find((item) => item.id === viewExamineeId);
  }, [userList, viewExamineeId]);

  const isInvigilator = useMemo(
    () => UserRoleEnum.invigilator === role,
    [role]
  );

  const subscribeConfig = [
    {
      key: "pc",
      subscribeUrl: user?.pcRtsPullUrl,
      canplay: pcCanplay,
    },
    {
      key: "mobile",
      subscribeUrl: user?.rtsPullUrl,
      canplay: mobileCanplay,
    },
  ];

  const handleCanplay = (index: number) => {
    if (index === 0) setPcCanplay(true);
    if (index === 1) setMobileCanplay(true);
  };

  return (
    <Modal
      open={showDetectModal}
      width={640}
      onCancel={onCancel}
      title={viewExamineeDetectMsg}
      footer={[
        <Button key="cancel" onClick={onCancel} className={styles.btn}>
          关闭
        </Button>,
      ]}
      destroyOnClose
    >
      <div className={styles.subscribe}>
        {subscribeConfig.map((item, index) =>
          item.subscribeUrl ? (
            <div className={styles.video} key={item.key}>
              <Subscribe
                subscribeUrl={item.subscribeUrl}
                controls={false}
                muted={false}
                videoStyle={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
                onSubscribeLoading={() => {
                  console.log(`考生 ${user?.id} 正在拉流中`);
                }}
                onSubscribeRetryFailed={(type) => {
                  if (index === 0) setPcCanplay(false);
                  if (index === 1) setMobileCanplay(false);
                  console.log(
                    `考生 ${user?.id} 停止尝试拉流`,
                    type === "signal"
                      ? "提示用户: 多次信令失败，请尝试更换设备、切换网络；如果仍无法解决问题，请联系管理员。"
                      : ""
                  );
                }}
                onCanplay={() => handleCanplay(index)}
                onUdpFailed={() => {
                  console.log(
                    "UDP不通，提示用户：切换 WIFI/蜂窝网络，或切换设备；如果仍无法解决问题，请联系管理员。"
                  );
                }}
                // 监考员角色单声道，巡考员听混音
                playSingleChannel={isInvigilator}
              />
              <div className={styles.info}>
                {index === 0 ? "主机位视角" : "侧机位视角"}
              </div>
              {!item.canplay && (
                <div className={styles.empty}>该机位当前没有视频流</div>
              )}
            </div>
          ) : null
        )}
      </div>
    </Modal>
  );
}

export default DetectVideoModal;
