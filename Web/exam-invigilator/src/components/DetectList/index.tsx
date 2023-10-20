import { ExamContext } from "@/context/exam";
import { InteractionEvents } from "@/core";
import { useCallback, useContext, useEffect, useState } from "react";
import dayjs from "dayjs";
import { throttle } from "throttle-debounce";
import { Button } from "antd";
import { FixedSizeList } from 'react-window';
import services from "@/utils/services";
import styles from "./index.less";

interface DetectListProps {
  setShowDetectModal: Function,
}

let pageSize = 10;
const clientHeight = 820;
const itemSize = 109;
  
function DetectList(props: DetectListProps) {
  const { setShowDetectModal } = props;
  const { state, interaction, dispatch } = useContext(ExamContext);
  const {
    roomInfo,
    detectList = [],
    scrollToken
  } = state;
  const [detectMessages, setDetectMessages] = useState<any[]>(detectList); // 作弊检测消息

  useEffect(() => {
    if (detectList.length > 0) {
      setDetectMessages(detectList);
    }
  }, [detectList]);

  useEffect(() => {
    const handleDetectMessage = ({ data }: any) => {
      const newDetectMessages = data.concat(detectMessages);
      setDetectMessages(newDetectMessages);
    }

    // 监考端接收考生发送的作弊检测消息
    interaction.on(InteractionEvents.SendDetectMessage, handleDetectMessage);

    return () => {
      interaction.remove(InteractionEvents.SendDetectMessage, handleDetectMessage);
    };
  }, [detectMessages]);
  
  const showExamineeVideo = (userId: string, message: string) => {
    dispatch({
      type: "update",
      payload: {
        viewExamineeId: userId,
        viewExamineeDetectMsg: message,
      },
    });
    setShowDetectModal(true);
  }

  const rowRenderer = ({ index, style }: any) => {
    const msg = detectMessages[index];

    return (
      <div
        className={styles.msg}
        style={style}
        key={msg.detectTime + msg?.extraInfo?.message}
      >
        <div className={styles['msg-title']}>
          {dayjs(msg.detectTime).format('YYYY-MM-DD HH:mm:ss')}
          <span className={styles.monitor}>{msg.isMainMonitor ? '主机位' : '侧机位'}</span>
        </div>
        <div className={styles['msg-text']}>{msg?.extraInfo?.message}</div>
        <Button
          size="small"
          type="primary"
          onClick={() => showExamineeVideo(msg?.userId, msg?.extraInfo?.message)}
          className={styles.btn}
        >
          查看
        </Button>
      </div>
    );
  };

  const loadMoreMessages = async () => {
    if (roomInfo) {
      const detectListRes: any = await services.getDetectList(roomInfo?.examId, pageSize, scrollToken);
      setDetectMessages((
        detectMessages.concat(
          detectListRes?.cheatRecordEntitys?.map(
            (item: any) => ({
              ...item,
              extraInfo: {message: JSON.parse(item.extraInfo).message},
              isMainMonitor: JSON.parse(item.isMainMonitor)
            })
          )
        )
      ));

      dispatch({
        type: "update",
        payload: {
          scrollToken: detectListRes?.scrollToken
        },
      });
    }
  };

  const handleScroll = useCallback(
    throttle(
      500,
      (e: any) => {
        const scrollTop = e.scrollOffset;
        const scrollHeight = itemSize * detectMessages.length;
        if (scrollHeight - scrollTop < clientHeight + 20 && scrollToken) {
          loadMoreMessages();
        }
      }, 
      { noLeading: true }
    ),
    [loadMoreMessages]
  );

  return (
    <div className={styles['detect-block']}>
      <div className={styles.title}>智能防作弊</div>
      <div className={styles.sec}>
        {
          detectMessages.length > 0 ? (
            <div className={styles.list}>
              <FixedSizeList
                height={clientHeight}
                width={269}
                itemSize={itemSize}
                itemCount={detectMessages.length}
                onScroll={handleScroll}
              >
                {rowRenderer}
              </FixedSizeList>
            </div>
          ) : (
            <span className={styles.empty}>
              当前没有疑似作弊信息
            </span>
          )
        }
      </div>
    </div>
  )
}

export default DetectList;
