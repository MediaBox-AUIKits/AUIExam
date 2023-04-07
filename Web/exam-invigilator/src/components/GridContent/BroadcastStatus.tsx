import { BroadcastSvg } from "@/assets/CustomIcon";
import { IAudioFile } from "@/types";
import { Tag } from "antd";
import { useEffect, useRef } from "react";
import styles from "./index.less";

type AudioStopType = "auto" | "handle";

interface IProps {
  living: boolean;
  audioData?: IAudioFile;
  onResetAudioData: (type: AudioStopType) => void;
}

function BroadcastStatus(props: IProps) {
  const { living, audioData, onResetAudioData } = props;
  const audioRef = useRef<HTMLAudioElement>(document.createElement("audio"));

  useEffect(() => {
    const handleEnded = () => {
      onResetAudioData("auto");
    };

    audioRef.current.addEventListener("ended", handleEnded);

    return () => {
      audioRef.current.pause();
      audioRef.current.removeEventListener("ended", handleEnded);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audioData?.url) {
      audio.pause();
      return;
    }
    audio.pause();
    audio.src = audioData?.url;
    audio.currentTime = 0;
    audio.play();
  }, [audioData]);

  if (!living && !audioData) {
    return null;
  }

  return (
    <div className={styles.broadcast}>
      <span className={styles["broadcast-icon"]}>
        <BroadcastSvg />
      </span>
      {living ? "全员口播中" : ""}
      {audioData ? (
        <span>
          系统广播中
          <Tag closable onClose={() => onResetAudioData("handle")}>
            {audioData.name}
          </Tag>
        </span>
      ) : null}
    </div>
  );
}

export default BroadcastStatus;
