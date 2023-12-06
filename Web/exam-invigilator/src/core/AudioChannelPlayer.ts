import { AudioContext } from 'standardized-audio-context';

// 左声道和考生端约定为监考音频
const CHANNEL_INDEX_L = 0;
// 右声道和考生端约定为考生音频
const CHANNEL_INDEX_R = 1;

class AudioChannelPlayer {
  private _context = new AudioContext();

  constructor(){}

  public load(stream: MediaStream) {
    const sourceNode = this._context.createMediaStreamSource(stream);
    const splitterNode = this._context.createChannelSplitter(2);
    const destNode = this._context.createMediaStreamDestination();

    // sourceNode -> splitterNode
    sourceNode.connect(splitterNode);
    // splitterNode -> destination
    splitterNode.connect(destNode, CHANNEL_INDEX_R);

    this.play();

    return destNode.stream;
  }

  public dispose() {
    this._context.close();
  }

  private play() {
    if (this._context.state === "suspended") {
      this._context.resume();
    }
  }

}

export default AudioChannelPlayer;