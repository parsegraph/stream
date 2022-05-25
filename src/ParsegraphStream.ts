import Block, {
  BlockPalette,
  BlockArtist,
  BlockStyle,
  BlockCaret,
  BlockNode,
  DefaultBlockPalette,
} from "parsegraph-block";
import Navport from "parsegraph-viewport";
import { readFit } from "parsegraph-direction";

export default class ParsegraphStream {
  _viewport: Navport;

  _carets: Map<number, BlockCaret>;
  _nodes: Map<number, BlockNode>;
  _blocks: Map<number, Block>;
  _styles: Map<number, BlockStyle>;
  _artists: Map<number, BlockArtist>;
  _palette: BlockPalette;

  constructor(viewport: Navport, url: string) {
    this._palette = new DefaultBlockPalette();
    this._carets = new Map();
    this._nodes = new Map();
    this._blocks = new Map();
    this._styles = new Map();
    const es = new EventSource(url);
    es.onmessage = (event) => {
      const args = JSON.parse(event.data);
      console.log(args);
      this.event(args.shift(), ...args);
    };
    console.log("Created", this);
  }

  event(command: string, ...args: any[]) {
    console.log(command);
    const runner = (ParsegraphStream.prototype as any)[command];
    if (!runner) {
      throw new Error("Unknown command: " + command);
    }
    runner.call(this, ...args);
  }

  viewport() {
    return this._viewport;
  }

  hasNode(nodeId: number) {
    return this._nodes.has(nodeId);
  }

  getNode(nodeId: number) {
    if (!this.hasNode(nodeId)) {
      throw new Error("No node for ID");
    }
    return this._nodes.get(nodeId);
  }

  newCaret(caretId: number, nodeId: number) {
    const node = this.getNode(nodeId);
    const car = new BlockCaret(node);
    this._carets.set(caretId, car);
    return car;
  }

  palette() {
    return this._palette;
  }

  newNode(nodeId: number) {
    const node = this.palette().spawn();
    this._nodes.set(nodeId, node);
    return node;
  }

  getBlockStyle(styleId: number) {
    return this._styles.get(styleId);
  }

  getArtist(artistId: number) {
    return this._artists.get(artistId);
  }

  newBlock(blockId: number, nodeId: number, styleId: number, artistId: number) {
    const block = new Block(
      this.getNode(nodeId),
      this.getBlockStyle(styleId),
      this.getArtist(artistId)
    );
    this._blocks.set(blockId, block);
    return block;
  }

  setNodeFit(blockId: number, fit: string) {
    this.getNode(blockId).state().setNodeFit(readFit(fit));
  }

  connectNode(blockId: number, fit: string) {}
}
