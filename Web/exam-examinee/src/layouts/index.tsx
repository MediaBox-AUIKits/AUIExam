import { defaultState, ExamContext, examReducer } from "@/context/exam";
import { AudioPlayer } from "@/core";
import { getParamFromSearch } from "@/utils/common";
import { useContext, useReducer, useEffect } from "react";
import { Outlet } from "umi";
import { StyleProvider, legacyLogicalPropertiesTransformer } from '@ant-design/cssinjs';
import styles from "./index.less";

export default function Layout() {
  const [state, dispatch] = useReducer(examReducer, defaultState);
  const { interaction, radioTimer, recorder } = useContext(ExamContext);

  useEffect(() => {
    // 可以从URL中设置音量
    const volume = getParamFromSearch("volume");
    if (volume && /\d+/.test(volume)) {
      AudioPlayer.updateVolume(Number(volume));
    }
  }, []);

  return (
    <StyleProvider hashPriority="high" transformers={[legacyLogicalPropertiesTransformer]}>
      <div className={styles.navs}>
        <ExamContext.Provider
          value={{
            state,
            interaction,
            radioTimer,
            recorder,
            dispatch,
          }}
        >
          <Outlet />
        </ExamContext.Provider>
      </div>
    </StyleProvider>
  );
}
