/**
 * 格式化时长
 * @param {number} dur 时长
 * @param {boolean} [needMs=true] 是否展示毫秒
 * @param {string} [hourMode='possible'] 小时部分如何显示，possible：如果大于1小时就显示，must：必须显示，onlyMinute：只显示分钟
 * @return {string}
 */
export function formatMilliDuration(
  dur: number,
  needMs = true,
  hourMode = "possible"
) {
  if (isNaN(dur) || !isFinite(dur) || dur < 0) {
    return "NaN";
  }
  let time = dur;
  if (typeof dur === "string") {
    time = parseInt(dur, 10);
  }
  let str = "";
  const seconds = Math.floor(time / 1000);

  let hh = 0;
  if (hourMode !== "onlyMinute") {
    hh = Math.floor(seconds / 3600);
    if (hh > 0 || hourMode === "must") {
      str += `${hh < 10 ? "0" : ""}${hh}:`;
    }
  }

  const mm = Math.floor((seconds - hh * 3600) / 60);
  str += `${mm < 10 ? "0" : ""}${mm}:`;

  const ss = Math.floor((seconds - hh * 3600) % 60);
  str += `${ss < 10 ? "0" : ""}${ss}`;

  if (needMs) {
    const ms = time % 1000;
    if (ms < 10) {
      str += `.00${ms}`;
    } else if (ms < 100) {
      str += `.0${ms}`;
    } else {
      str += `.${ms}`;
    }
  }
  return str;
}
