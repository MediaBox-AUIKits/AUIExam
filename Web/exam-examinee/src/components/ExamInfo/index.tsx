import React, { useState, useEffect } from 'react';
import { Button, Modal } from 'antd';
import { ErrorModalSvg } from "@/assets/CustomIcon";
import services from "@/utils/services";
import { AliRTS } from "aliyun-rts-sdk";
import { RoomStatusEnum } from "@/types";
import Card from '@/components/Card'
import { MockRoomId, MockCurrentUserId } from "@/utils/LocalMock";
import { getParamFromSearch } from "@/utils/common";
import { history } from "umi";
import classNames from 'classnames';
import styles from './index.less';

interface IProps {
  setEnterStatus: React.Dispatch<React.SetStateAction<boolean>>;
}

const ExamInfo: React.FC<IProps> = (props: IProps) => {
  const { setEnterStatus } = props;
  let roomId = getParamFromSearch("roomId");

  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const examInfos = [
    {label: '考场ID', content: roomId},
    {label: '考场名称', content: roomName},
    {label: '考场有效期', content: "30分钟"},
  ];

  useEffect(() => {
    getExamInfo();
  }, []);

  const getExamInfo = async() => {
    const mock = getParamFromSearch("mock");
    let userId = getParamFromSearch("userId");
    let token = getParamFromSearch("token");
    if (mock === "1") {
      roomId = roomId || MockRoomId;
      userId = userId || MockCurrentUserId;
      token = token || "1fTyFwuS3P8EqU04sP8Lru9LeayXxBYb";
    }
    if (!roomId || !userId || !token) {
      history.push("/pc");
      return;
    }
    services.setHeaderAuthorization(token);

    try {
      // 获取考场信息
      const roomInfoRes: any = await services.getRoomInfo(roomId);
      // 如果考场结束直接跳转
      if (roomInfoRes.status === RoomStatusEnum.end) {
        history.push("/ended");
        return;
      }
      setRoomName(roomInfoRes.name);
    } catch (error) {
      console.log("页面初始失败！", error);
    }
  };

  const onEnterBtnClick = () => {
    setLoading(true);
    checkH264andWebRTC().finally(() => {
      setLoading(false);
    });
  }

  const checkH264andWebRTC = () => {
    return AliRTS.createClient().checkPublishSupport()
      .then((res) => {
        if (res?.isH264EncodeSupported && res?.isWebRTCSupported) {
          setEnterStatus(true);
        } else {
          setIsModalOpen(true);
        }
      })
      .catch((err) => {
        console.log("checkPublishSupport错误", err);
      });
  }

  const handleModalCancel = () => {
    setIsModalOpen(false);
  }

  const onBackBtnClick = () => {
    handleModalCancel();
  }

  const onRetryBtnClick = () => {
    handleModalCancel();
    checkH264andWebRTC();
  }

  return (
    <section className={styles.sec}>
      <header className={styles.header}>远程监考考试Demo</header>
      <main className={styles.main}>
        <Card
          title='考场信息'
        >
          {
            examInfos.map(item => (
              <div key={item.label} className={styles.info}>
                <div className={styles.label}>{item.label}</div>
                <div className={styles.content}>{item.content}</div>
              </div>
            ))
          }
        </Card>
        <Button
          type="primary"
          className={styles['enter-btn']}
          loading={loading}
          onClick={onEnterBtnClick}
        >
          进入考场
        </Button>

        <Modal
          title="兼容性检测"
          open={isModalOpen}
          onCancel={handleModalCancel}
          footer={null}
        >
          <div className={styles['modal-content']}>
            <ErrorModalSvg />
            <div className={styles['modal-content-title']}>当前浏览器不支持WebRTC或H.264</div>
            <div className={styles['modal-content-detail']}>
              远程监考Demo依赖浏览器对WebRTC技术的支持，请检查当前浏览器环境是否满足要求。支持情况详见&nbsp;
              <a 
                href='https://help.aliyun.com/zh/live/user-guide/web-rts-sdk-overview-1#section-8z0-9r1-5oe'
                target='_blank'
              >
                浏览器要求
              </a>
            </div>
            <Button
              className={classNames(styles['btn-common'] ,styles['modal-back-btn'])}
              onClick={onBackBtnClick}
            >
              返回考场入口
            </Button>
            <Button
              type="primary"
              className={classNames(styles['btn-common'] ,styles['modal-retry-btn'])}
              onClick={onRetryBtnClick}
            >
              重试
            </Button>
          </div>
        </Modal>
      </main>
    </section>
  );
}

export default ExamInfo;
