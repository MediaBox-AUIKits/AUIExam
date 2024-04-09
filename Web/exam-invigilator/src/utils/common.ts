/**
 * 从当前 location.search 中获取某个参数值
 * @param {string} key
 * @return {*}
 */
export function getParamFromSearch(key: string) {
  const url = window.location.search;
  const reg = new RegExp(`(^|&)${key}=([^&]*)(&|$)`);
  const result = url.substring(1).match(reg);
  return result ? decodeURIComponent(result[2]) : null;
}

/**
 * 更新URL中某个参数的值
 * @param {string} urlString 地址
 * @param {string} param 需要更新的参数 key
 * @param {string} paramValue 需要更新的参数 value
 * @return {string} 更新后的 URL
 */
export function updateUrlParameter(urlString: string, param: string, paramValue: string): string {
  if (!urlString) {
    return '';
  }
  const url = new URL(urlString);
  url.searchParams.set(param, paramValue);
  return url.toString();
}

export function getSystemType() {
  if (/(iPhone|iPad|iPod|iOS)/i.test(navigator.userAgent)) {
    return "iOS";
  } else if (/(Android)/i.test(navigator.userAgent)) {
    return "Android";
  } else {
    return "Other";
  }
}

export function getPackageName() {
  const reg = /(com\..*?)\//;
  return (reg.exec(navigator.userAgent) || [])[1];
  // /(com\..*?)\//.exec('Mozilla/5.0 (Linux; U; Android 12; zh-CN; KB2000 Build/RKQ1.211119.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/69.0.3497.100 UWS/3.22.1.233 Mobile Safari/537.36 AliApp(DingTalk/6.5.55.4) com.alibaba.android.rimet.aliding/PIS383631991338719232 Channel/exclusive_dingtalk_21001 language/zh-CN 2ndType/exclusive abi/64 UT4Aplus/0.2.25 colorScheme/light');
}

export function uuid() {
  const STORE_KEY = "_art_exam_uuid_";
  let uuid = localStorage.getItem(STORE_KEY);
  if (!uuid) {
    uuid = createGuid();
    localStorage.setItem(STORE_KEY, uuid);
  }
  return uuid;
}

export function createGuid(len?: number, radix?: number) {
  var chars =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");
  var uuid = [],
    i;
  radix = radix || chars.length;

  if (len) {
    for (i = 0; i < len; i++) uuid[i] = chars[0 | (Math.random() * radix)];
  } else {
    var r;
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = "-";
    uuid[14] = "4";
    for (i = 0; i < 36; i++) {
      if (!uuid[i]) {
        r = 0 | (Math.random() * 16);
        uuid[i] = chars[i == 19 ? (r & 0x3) | 0x8 : r];
      }
    }
  }

  return uuid.join("");
}

export function sendTraceIdToRobot(url: string, traceId: string) {
  const DINGTALK_URL = "https://robot-h5player.fc.alibaba-inc.com/ding";
  fetch(`${DINGTALK_URL}?id=${traceId}&url=${url}`).then(() => {
    console.log("TraceId sent to Dingtalk");
  });
}

export function runGC() {
  if (window.AliyunGcTask) {
    clearTimeout(window.AliyunGcTask);
  }
  window.AliyunGcTask = setTimeout(() => {
    let img: HTMLImageElement | null = document.createElement("img");
    img.src = window.URL.createObjectURL(new Blob([new ArrayBuffer(5e+7)])); // 50Mb or less or more depending as you wish to force/invoke GC cycle run
    img.onerror = function() {
      window.URL.revokeObjectURL(this.src);
      img = null
    }
    window.AliyunGcTask = null;
  }, 500)
}