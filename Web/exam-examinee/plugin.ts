import { IApi } from "umi";

// 自定义的图标文件 URL
const iconUrl =
  "https://img.alicdn.com/tfs/TB1_ZXuNcfpK1RjSZFOXXa6nFXa-32-32.ico";

export default (api: IApi) => {
  api.modifyHTML(($) => {
    $("head").append([
      "<title>考试场景学生端</title>",
      `<link rel="shortcut icon" href="${iconUrl}" type="image/x-icon" />`, // href 里填上自定义的图标文件 URL
      // 如果需要在手机端调试，可以加上以下内容
      `<script src='https://player.alicdn.com/lib/eruda-3.0.0-min.js'></script>`,
      `<script>
      if(/(iPhone|Android)/i.test(navigator.userAgent) && location.hostname.indexOf('pre-')!==-1) {
        eruda.init();
      }
      </script>`,
      `<script src="https://g.alicdn.com/apsara-media-box/imp-cheat-detection-wasm/1.0.1/aliyun-detect-engine.js"></script>`,
    ]);
    $("#root").after([
      `<script src='https://g.alicdn.com/video-cloud-fe/aliyun-interaction-sdk/1.0.2/aliyun-interaction-sdk.web.min.js'></script>`,
    ]);
    return $;
  });
};
