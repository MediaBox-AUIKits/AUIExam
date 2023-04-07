import { defaultState, ExamContext, examReducer } from "@/context/exam";
import { useContext, useReducer } from "react";
import { Outlet } from "umi";
import styles from "./index.less";

export default function Layout() {
  const [state, dispatch] = useReducer(examReducer, defaultState);
  const { interaction, radioTimer } = useContext(ExamContext);

  return (
    <div className={styles.navs}>
      <ExamContext.Provider
        value={{
          state,
          interaction,
          radioTimer,
          dispatch,
        }}
      >
        <Outlet />
      </ExamContext.Provider>
    </div>
  );
}
