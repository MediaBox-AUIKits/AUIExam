import { LeftOutlineSvg } from "@/assets/CustomIcon";
import { ExamContext } from "@/context/exam";
import JsApi from "@/utils/JsApi";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import styles from "../QuitButton/index.less";

interface EndButtonProps {
  onEnd: () => void;
}

function EndButton(props: EndButtonProps) {
  const { onEnd } = props;
  const timer = useRef<number>();
  const { state } = useContext(ExamContext);
  const { examInfo } = state;
  const [visible, setVisible] = useState(false);

  const checkTime = useCallback((endDateTime: Date) => {
    const now = new Date();
    if (endDateTime > now) {
      // 若未达到结束时间就定时检测
      if (timer.current) {
        window.clearTimeout(timer.current);
      }
      timer.current = window.setTimeout(() => {
        checkTime(endDateTime);
      }, 10000);
    } else {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (examInfo) {
      const endTime = new Date(examInfo.endTime);
      if (!isNaN(endTime.valueOf())) {
        checkTime(endTime);
      }
    }
  }, [examInfo, checkTime]);

  const showConfirm = () => {
    JsApi.showConfirm("是否结束考试？").then((res) => {
      if (res) {
        onEnd();
      }
    });
  };

  if (!visible) {
    return null;
  }

  return (
    <div className={styles.close} onClick={showConfirm}>
      <LeftOutlineSvg />
      <span>结束考试</span>
    </div>
  );
}

export default EndButton;
