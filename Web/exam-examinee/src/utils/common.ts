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

export function getSystemType() {
  if (/(iPhone|iPad|iPod|iOS)/i.test(navigator.userAgent)) {
    return "iOS";
  } else if (/(Android)/i.test(navigator.userAgent)) {
    return "Android";
  } else {
    return "Other";
  }
}

export function getIOSVersion() {
  // supports iOS 2.0 and later: <http://bit.ly/TJjs1V>
  const v = (navigator.userAgent).match(/OS (\d+)_(\d+)_?(\d+)?/);
  if (!v) return [];
  return [parseInt(v[1], 10), parseInt(v[2], 10), parseInt(v[3] || '0', 10)];
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

export function checkH264(fn: any) {
  function checkSDPSupportH264(sdp: string) {
    if (
      sdp.indexOf("H264") > 0 ||
      sdp.indexOf("h264") > 0 ||
      sdp.indexOf("H.264") > 0 ||
      sdp.indexOf("h.264") > 0
    ) {
      return true;
    }
    return false;
  }

  let pc = new RTCPeerConnection({
    // @ts-ignore-next-line
    sdpSemantics: "unified-plan",
  });

  pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true })
    .then((offer: any) => {
      if (checkSDPSupportH264(offer.sdp)) {
        // ok
        fn(true);
      } else {
        // no
        fn(false);
      }
    })
    .catch((err) => {
      // no
      fn("error");
    });
}

/**
 * 深克隆
 * @template T
 * @param {T} obj
 * @return {T}
 */
export function deepClone<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof RegExp) {
    // See https://github.com/Microsoft/TypeScript/issues/10990
    return obj as any;
  }
  const result: any = Array.isArray(obj) ? [] : {};
  Object.keys(<any>obj).forEach((key: string) => {
    if ((<any>obj)[key] && typeof (<any>obj)[key] === 'object') {
      result[key] = deepClone((<any>obj)[key]);
    } else {
      result[key] = (<any>obj)[key];
    }
  });
  return result;
}

/**
 * 判断是否是合法的数字
 * @param {number} num
 * @return {boolean} 
 */
export function isValidNumber(num: number): boolean {
  return typeof num === 'number' && !isNaN(num) && isFinite(num);
}

/**
 * 判断是否是合法的正数
 * @param {number} num
 * @return {boolean} 
 */
export function isValidPositiveNumber(num: number): boolean {
  return isValidNumber(num) && num > 0;
}

/**
 * 异步睡眠
 * @param {number} time
 * @return {*}  {Promise<void>}
 */
export function sleep(time: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}
