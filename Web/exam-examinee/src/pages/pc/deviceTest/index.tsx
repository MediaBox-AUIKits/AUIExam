import DeviceTestBox from '@/components/DeviceTestBox';
import ExamInfo from '@/components/ExamInfo';
import { useState } from "react";
import styles from "./index.less";

const DeviceTest: React.FC = () => {
  const [enterStatus, setEnterStatus] = useState(false);

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <img src="https://img.alicdn.com/tfs/TB13DzOjXP7gK0jSZFjXXc5aXXa-212-48.png" />
      </header>
      <main className={styles.main}>
        {
          enterStatus ? (
            <DeviceTestBox
              setEnterStatus={setEnterStatus}
            />
          ) : (
            <ExamInfo
              setEnterStatus={setEnterStatus}
            />
          )
        }
      </main>
    </section>
  );
}

export default DeviceTest
