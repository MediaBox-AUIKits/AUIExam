import { getSystemType } from "@/utils/common";
import { Fragment, useEffect, useRef } from "react";

interface IProps {
  onPlaySettled: () => void;
}

const AUDIO_URL = `${PUBLIC_PATH}silence.mp3`;
const isAndroid = getSystemType() === "Android";

const SilenceAudio = (props: IProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timer | null>(null);

  useEffect(() => {
    if (!isAndroid) {
      props.onPlaySettled();
      clearTimer();
      return;
    }

    if (audioRef.current) {
      const audio = audioRef.current;
      if (!audio) return;

      audio.volume = 0;
      audio.src = AUDIO_URL;
      audio.load();
      audio
        .play()
        .then(() => {
          console.log("Silence Audio Playing");
          clearTimer();
          props.onPlaySettled();
        })
        .catch(() => {
          console.log("Silence Audio Play Failed");
          clearTimer();
          props.onPlaySettled();
        });
    }
  }, []);

  useEffect(() => {
    if (!isAndroid) {
      return;
    }

    timerRef.current = setTimeout(() => {
      console.log("Silence Audio Fallback Settled");
      props.onPlaySettled();
    }, 3000);

    return () => {
      clearTimer();
    };
  }, []);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <Fragment>
      {isAndroid ? (
        <audio
          loop
          ref={audioRef}
          style={{
            visibility: "hidden",
            zIndex: -100,
            pointerEvents: "none",
          }}
        />
      ) : null}
    </Fragment>
  );
};

export default SilenceAudio;
