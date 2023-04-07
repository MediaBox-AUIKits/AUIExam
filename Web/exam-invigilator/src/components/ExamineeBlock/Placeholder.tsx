import { ResetSvg } from "@/assets/CustomIcon";
import { SubscribeStatusEnum } from "@/types";
import { Spin } from "antd";
import { CSSProperties } from "react";
import styles from "./index.less";

interface IPlaceholderProps {
  wrapStyle?: CSSProperties;
  name?: string;
  status: string;
  onRetry: () => void;
}

function Placeholder(props: IPlaceholderProps) {
  const { wrapStyle, name, status, onRetry } = props;

  if (status === SubscribeStatusEnum.canplay) {
    return null;
  }

  return (
    <div className={styles["placeholder-wrap"]} style={wrapStyle}>
      <div className={styles["placeholder-name"]}>{name || ""}</div>

      {status === SubscribeStatusEnum.loading ? (
        <div className={styles["placeholder-loading"]}>
          <Spin size="small" />
          <br />
          <span>加载中</span>
        </div>
      ) : null}

      {status === SubscribeStatusEnum.fail ? (
        <div className={styles["placeholder-fail"]} onClick={onRetry}>
          <ResetSvg />
          <span>重新加载</span>
        </div>
      ) : null}
    </div>
  );
}

export default Placeholder;
