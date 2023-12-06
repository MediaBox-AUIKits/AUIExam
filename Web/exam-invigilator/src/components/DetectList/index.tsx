import { ExamContext } from "@/context/exam";
import { InteractionEvents } from "@/core";
import { useCallback, useContext, useEffect, useState, useMemo, useRef } from "react";
import dayjs from "dayjs";
import { throttle } from "throttle-debounce";
import { Button } from "antd";
import { FixedSizeList } from 'react-window';
import ResizeObserver from 'resize-observer-polyfill';
import services from "@/utils/services";
import styles from "./index.less";

interface DetectListProps {
  setShowDetectModal: Function,
}

const pageSize = 20;
const itemSize = 109;
  
function DetectList(props: DetectListProps) {
  const { setShowDetectModal } = props;
  const { state, interaction, dispatch } = useContext(ExamContext);
  const { roomInfo } = state;
  const [scrollToken, setScrollToken] = useState<string|undefined>();
  const [detectMessages, setDetectMessages] = useState<any[]>([]); // 作弊检测消息
  const [wrapHeight, setWrapHeight] = useState(400);
  const wrapEl = useRef<HTMLDivElement | null>(null);

  const roomId = useMemo(() => roomInfo?.id, [roomInfo]);

  const resizeObserver = useMemo(() => {
    return new ResizeObserver(entries => {
      for (let entry of entries) {
        const cr = entry.contentRect;
        setWrapHeight(cr.height);
      }
    });
  }, []);

  useEffect(() => {
    if (wrapEl.current) {
      resizeObserver.observe(wrapEl.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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
    if (roomId) {
      const detectListRes: any = await services.getDetectList(roomId, pageSize, scrollToken);
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

      setScrollToken(detectListRes?.scrollToken)
    }
  };

  useEffect(() => {
    loadMoreMessages();
  }, [roomId])

  const handleScroll = useCallback(
    throttle(
      500,
      (e: any) => {
        const scrollTop = e.scrollOffset;
        const scrollHeight = itemSize * detectMessages.length;
        if (scrollHeight - scrollTop < wrapHeight + 20 && scrollToken) {
          loadMoreMessages();
        }
      },
      { noLeading: true }
    ),
    [loadMoreMessages, wrapHeight, scrollToken, detectMessages]
  );

  return (
    <div className={styles['detect-block']}>
      <div className={styles.title}>智能防作弊</div>
      <div ref={wrapEl} className={styles.sec}>
        {
          detectMessages.length > 0 ? (
            <div className={styles.list}>
              <FixedSizeList
                height={wrapHeight}
                width="100%"
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
