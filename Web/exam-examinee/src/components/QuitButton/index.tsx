import { LeftOutlineSvg } from "@/assets/CustomIcon";
import { ExamContext } from "@/context/exam";
import JsApi from "@/utils/JsApi";
import { useContext } from "react";
import styles from "./index.less";

function QuitButton() {
  const { state } = useContext(ExamContext);
  const { cacheUploading } = state;

  const showConfirm = () => {
    JsApi.showConfirm(
      `${cacheUploading ? "考试数据正在上传中，" : ""}确认退出吗？`
    ).then((res) => {
      if (res) {
        closePage();
      }
    });
  };

  const closePage = () => {
    JsApi.closePage();
  };

  return (
    <div className={styles.close} onClick={showConfirm}>
      <LeftOutlineSvg />
      <span>退出</span>
    </div>
  );
}

export default QuitButton;
