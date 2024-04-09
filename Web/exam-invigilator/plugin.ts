import { IApi } from "umi";

// 自定义的图标文件 URL
const iconUrl = "https://img.alicdn.com/tfs/TB1_ZXuNcfpK1RjSZFOXXa6nFXa-32-32.ico";

export default (api: IApi) => {
  api.modifyHTML(($) => {
    $("head").append([
      "<title>考试场景监考端</title>",
      `<link rel="shortcut icon" href="${iconUrl}" type="image/x-icon" />`, // href 里填上自定义的图标文件 URL
      // 如果需要在手机端调试，可以加上以下内容
      // `<script src='https://cdn.jsdelivr.net/npm/eruda@2.5.0/eruda.min.js'></script>`,
      // `<script>
      //   eruda.init();
      // </script>`
    ]);

    const afterArr = [];
    // 新阿里云互动消息 IM SDK
    afterArr.push('<script charset="utf-8" type="text/javascript" src="https://g.alicdn.com/apsara-media-box/imp-interaction/1.2.1/alivc-im.iife.js"></script>');
    $("#root").after(afterArr);

    return $;
  });
};
