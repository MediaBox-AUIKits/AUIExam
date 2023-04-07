import { ExamContext } from "@/context/exam";
import { useContext } from "react";

import styles from "../index.less";
import endedStyles from "./index.less";

function EndedPage() {
  const { state } = useContext(ExamContext);
  const { roomInfo } = state;

  return (
    <div className={styles.home}>
      <div className={styles.header}>
        <span>{roomInfo ? roomInfo.name : ""}</span>
      </div>
      <main className={`${styles.main} ${endedStyles.body}`}>
        <div className={endedStyles.inner}>
          <div className={endedStyles.title}>
            {roomInfo ? roomInfo.name : ""}
          </div>
          <div className={endedStyles.endedText}>考试已结束</div>
          <div className={endedStyles.tip}>音视频已断开连接</div>
        </div>
      </main>
      <div className={styles.footer} />
    </div>
  );
}

export default EndedPage;
