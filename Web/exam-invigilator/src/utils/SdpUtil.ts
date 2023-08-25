class SdpUtil {
  private sdpLines: Array<string> = [];

  constructor(sdp: string) {
    this.init(sdp);
  }

  /**
   * 返回sdp内容
   */
  get sdp (): string {
    return this.sdpLines.join('\r\n')
  }

  /**
   * 初始化sdp内容
   * @param sdp
   */
  public init (sdp: string) {
    this.sdpLines = sdp.split('\r\n');
  }

  /**
   * opus 增加立体声拉流
   */
  public addStereo () {
    const opusPtList = this.getPayloadType('opus');
    const fmtpIndexList = opusPtList.map(this.getFmtpIndex.bind(this)).filter(v => v !== undefined) as number[];
    fmtpIndexList.forEach(index => {
      this.sdpLines[index] = this.sdpLines[index] + ';stereo=1';
    });
  }

  /**
   * 找到指定 codec 的 payloadType
   */
  private getPayloadType(codecName: string) {
    let ptList = [];
    const ptReg = new RegExp(`a\\=rtpmap\\:(\\d+) ${codecName}.*`, 'i');
    for (let i=0; i<this.sdpLines.length; i++) {
      const line = this.sdpLines[i];
      // a=rtpmap:111 opus/48000/2
      let result = ptReg.exec(line);
      if (result?.length) {
        ptList.push(result[1]);
      }
    }

    return ptList;
  }

  /**
   * 找到指定 payloadType 的 fmtp line 索引
   */
  private getFmtpIndex(payloadType: string) {
    const fmtpReg = new RegExp(`a\\=fmtp\\:${payloadType} .*`, 'i');
    for (let i=0; i<this.sdpLines.length; i++) {
      const line = this.sdpLines[i];
      let match = fmtpReg.test(line);
      if (match) return i;
    }
  }

}

export default SdpUtil;