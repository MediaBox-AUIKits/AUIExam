import * as dd from "dingtalk-jsapi";
import { getPackageName, getSystemType } from "./common";

class JsApi {
  private isInDingtalk = false;

  constructor() {
    this.isInDingtalk = navigator.userAgent.indexOf("DingTalk") > -1;
  }

  isDingtalk() {
    return this.isInDingtalk;
  }

  // 弹出确认弹窗
  showConfirm(message: string) {
    if (this.isInDingtalk) {
      return dd.device.notification
        .confirm({
          message,
          buttonLabels: ["是", "否"],
        })
        .then((res) => {
          return res.buttonIndex === 0;
        });
    } else {
      return new Promise<boolean>((resolve) => {
        return resolve(window.confirm(message));
      });
    }
  }

  // 关闭当前页面
  closePage() {
    if (this.isInDingtalk) {
      dd.biz.navigation
        .close({
          onSuccess: () => {
            console.log("关闭成功");
          },
          onFail: (err: any) => {
            console.log("关闭页面失败", err);
          },
        })
        .catch((e) => {
          // not in Dingtalk Environment
          console.log("DDAPI", e);
        });
    } else {
      window.close();
    }
  }

  // 打开系统设置，仅钉钉客户端内支持
  openSystemSetting() {
    if (this.isInDingtalk) {
      const systemType = getSystemType();
      if (systemType === "iOS") {
        dd.device.base.openSystemSetting({});
      } else if (systemType === "Android") {
        dd.device.base.openSystemSetting({
          action: "android.settings.APPLICATION_DETAILS_SETTINGS",
          data: `package:${getPackageName()}`,
          // @ts-ignore-next-line
          onSuccess: function () {},
          onFail: function () {},
        });
      }
    }
  }

  // 设置屏幕常量，仅钉钉客户端内支持
  setScreenKeepOn() {
    if (this.isInDingtalk) {
      dd.biz.util
        .setScreenKeepOn({
          isKeep: true,
          // @ts-ignore-next-line
          onSuccess: function () {
            console.log("设置屏幕常亮成功");
          },
          onFail: function (e: any) {
            console.log("设置屏幕常亮失败", e);
          },
        })
        .catch((e) => {});
    }
  }

  rotateView() {
    if (!this.isInDingtalk) {
      return;
    }
    dd.device.screen.rotateView({
      showStatusBar : true, // 否显示statusbar
      clockwise : true, // 是否顺时针方向
      onSuccess : function() {
        //
      },
      onFail : function(err: any) {
        console.log('rotateView error ->', err);
      },
    });
  }

  resetView(onSuccess: () => void, onFail: () => void) {
    if (!this.isInDingtalk) {
      return;
    }
    dd.device.screen.resetView({
      onSuccess,
      onFail,
    });
  }
}

export default new JsApi();
