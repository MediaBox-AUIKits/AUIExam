import { AudioContext } from "standardized-audio-context";

const CHANNEL_INDEX_L = 0;
const CHANNEL_INDEX_R = 1;

class AudioMixer {

  private _context = new AudioContext();
  private _destination = this._context.createMediaStreamDestination();

  constructor() {
  }

  get audioTrack() {
    return this._destination.stream.getAudioTracks()[0];
  }

  mix(streamForLeftChannel: MediaStream, streamForRightChannel: MediaStream) {
    /**
     * sourceNode
     */
    const sourceNodeL = this._context.createMediaStreamSource(streamForLeftChannel);
    const sourceNodeR = this._context.createMediaStreamSource(streamForRightChannel);
    /**
     * gainNode
     */
    const gainNodeL = this._context.createGain();
    const gainNodeR = this._context.createGain();
    /**
     * splitterNode
     */
    const splitterNodeL = this._context.createChannelSplitter(2);
    const splitterNodeR = this._context.createChannelSplitter(2);
    /**
     * mergerNode
     */
    const mergerNode = this._context.createChannelMerger(2);

    /**
     * sourceNode -> splitterNode -> gainNode -> mergerNode -> destination
     */

    sourceNodeL.connect(splitterNodeL);
    sourceNodeR.connect(splitterNodeR);

    splitterNodeL.connect(gainNodeL, 0);
    splitterNodeR.connect(gainNodeR, 0);

    gainNodeL.connect(mergerNode, 0, CHANNEL_INDEX_L);
    gainNodeR.connect(mergerNode, 0, CHANNEL_INDEX_R);

    /**
     * output merger to destination
     */
    mergerNode.connect(this._destination);
  }

  play() {
    return this._context.resume();
  }

  pause() {
    return this._context.suspend();
  }

  dispose() {
    this._destination.disconnect();
    this._context.close();
  }

}

export default AudioMixer;