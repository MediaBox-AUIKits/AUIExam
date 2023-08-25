import React, { useState } from 'react';
import { Steps, Button } from 'antd';
import DeviceTestStepContent from '@/components/DeviceTestStepContent';
import { CameraSvg, MicrophoneSvg, SpeakerSvg, ScreenSvg } from "@/assets/CustomIcon";
import styles from './index.less';

interface IProps {
  setEnterStatus: React.Dispatch<React.SetStateAction<boolean>>;
}

const DeviceTestBox: React.FC<IProps> = (props: IProps) => {
  const { setEnterStatus } = props;
  const [current, setCurrent] = useState(0);

  const stepIconItems = [
    {
      title: '摄像头',
      icon: <CameraSvg />,
    },
    {
      title: '麦克风',
      icon: <MicrophoneSvg />,
    },
    {
      title: '扬声器',
      icon: <SpeakerSvg />,
    },
    {
      title: '屏幕共享',
      icon: <ScreenSvg />,
    },
  ];

  return (
    <section className={styles.sec}>
      <header className={styles.header}>设备检测</header>
      <main className={styles.main}>
        <Steps
          current={current}
          items={stepIconItems}
          className={styles.step}
        />

        <DeviceTestStepContent
          current={current}
          setCurrent={setCurrent}
          setEnterStatus={setEnterStatus}
          totalStepsNumber={stepIconItems.length-1}
        />
      </main>
    </section>
  );
}

export default DeviceTestBox;
