import { createErrorBlock, ErrorBlock } from "antd-mobile";
import { CheckCircleFill } from "antd-mobile-icons";
import { useEffect, useRef, useState } from "react";
import styles from "../index.less";
import upgradeStyles from "./index.less";

export default function Capture() {
  const [count, setCount] = useState(5);
  const [showResult, setShowResult] = useState(false);
  const timerRef = useRef<NodeJS.Timer>();

  const CustomErrorBlock = createErrorBlock({
    default: <CheckCircleFill className={upgradeStyles.successIcon} />,
  });

  useEffect(() => {
    countDown();
    return () => {
      clearTimer();
    };
  }, []);

  useEffect(() => {
    countDown();
  }, [count]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  };

  const countDown = () => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      const currentCount = count - 1;
      if (currentCount > 0) {
        setCount(currentCount);
      } else {
        // show ok
        setShowResult(true);
      }
    }, 1000);
  };

  return (
    <section className={`${styles.page} ${upgradeStyles.page}`}>
      {!showResult ? (
        <ErrorBlock
          fullPage
          status="busy"
          title="正在升级环境，请勿关闭页面"
          description={
            <div className={upgradeStyles.countDown}>
              剩余时间：<strong>{count}</strong> 秒
            </div>
          }
        />
      ) : (
        <CustomErrorBlock
          fullPage
          title="升级已完成"
          status="default"
          description={
            <div className={upgradeStyles.countDown}>
              请彻底关闭考试钉后，重新打开
            </div>
          }
        />
      )}
    </section>
  );
}
