import { ErrorBlock } from "antd-mobile";
import cls from "classnames";
import styles from "../index.less";
import upgradeStyles from "../upgrade/index.less";
import thisStyles from "./index.less";

export default function DingtalkUpgrade() {
  return (
    <section className={`${styles.page} ${upgradeStyles.page}`}>
      <ErrorBlock
        fullPage
        status="empty"
        title="请更新钉钉版本至 7.0 及以上"
        description={
          <div className={cls(upgradeStyles.countDown, thisStyles.content)}>
            <div>
              <strong>方式一：</strong>
              钉钉首页右下角点击【我的】-【设置】-【关于钉钉】-【检查新版本】
            </div>
            <div>
              <strong>方式二：</strong>打开应用商店，搜索【钉钉】，点击【更新】
            </div>
          </div>
        }
      />
    </section>
  );
}
