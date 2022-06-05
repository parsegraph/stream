import Color from 'parsegraph-color';
import Block, {
  BlockPalette,
  BlockArtist,
  BlockStyle,
  BlockCaret,
  BlockNode,
  DefaultBlockPalette,
  DefaultBlockScene
} from "parsegraph-block";
import {BlockType} from 'parsegraph-blockpainter';
import Navport from "parsegraph-viewport";
import { readDirection, readPreferredAxis, readFit } from "parsegraph-direction";

export default class ParsegraphStream {
  _viewport: Navport;
  _fallbackArtist: BlockArtist;

  _carets: Map<number, BlockCaret>;
  _nodes: Map<number, BlockNode>;
  _blocks: Map<number, Block>;
  _styles: Map<number, BlockStyle>;
  _artists: Map<string, BlockArtist>;
  _palette: BlockPalette;

  constructor(
    viewport: Navport,
    url: string,
    palette: BlockPalette = new DefaultBlockPalette()
  ) {
    this._viewport = viewport;
    this._palette = palette;
    this._carets = new Map();
    this._nodes = new Map();
    this._blocks = new Map();
    this._styles = new Map();
    this._artists = new Map();
    this._fallbackArtist = new BlockArtist((projector) => {
      return new DefaultBlockScene(projector, BlockType.ROUNDED);
    });
    const es = new EventSource(url);
    es.onmessage = (event) => {
      const args = JSON.parse(event.data);
      console.log(args);
      this.event(args.shift(), ...args);
    };
    console.log("Created", this);
  }

  event(command: string, ...args: any[]) {
    console.log("ParsegraphStream event", command);
    const runner = (ParsegraphStream.prototype as any)[command];
    if (!runner) {
      throw new Error("Unknown command: " + command);
    }
    runner.call(this, ...args);
  }

  setValue(nodeId: number, blockId: number) {
    this.getNode(nodeId).setValue(this.getBlock(blockId));
    this.getBlock(blockId).setNode(this.getNode(nodeId));
  }

  viewport() {
    return this._viewport;
  }

  hasNode(nodeId: number) {
    return this._nodes.has(nodeId);
  }

  hasBlock(id: number) {
    return this._blocks.has(id);
  }

  getNode(nodeId: number) {
    if (!nodeId) {
      return null;
    }
    if (!this.hasNode(nodeId)) {
      throw new Error("No node for ID");
    }
    return this._nodes.get(nodeId);
  }

  getBlock(blockId: number) {
    if (!blockId) {
      return null;
    }
    if (!this.hasBlock(blockId)) {
      throw new Error("No block for ID");
    }
    return this._blocks.get(blockId);
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

  getArtist(artistId: string) {
    let artist = this._artists.get(artistId);
    if (!artist) {
      artist = this._fallbackArtist;
    }
    return artist;
  }

  setLayoutPreference(id: number, preferredAxis: any) {
    this.getNode(id).setLayoutPreference(readPreferredAxis(preferredAxis));
  }

  act(nodeId: number, url: string, payload: any) {
    const n = this.getNode(nodeId)
    n.value().interact().setClickListener(()=>{
      fetch(url, payload);
    });
  }

  parseColor(val: string) {
    if(val.startsWith("rgba(")) {
      val = val.substring("rgba".length);
      val = val.substring(1, val.length - 1);
      const parts = val.split(",").map(c=>parseFloat(c.trim()));
      return new Color(parts[0], parts[1], parts[2], parts[3]);
    }
    return new Color(1, 1, 1, 1);
  }

  newBlockStyle(styleId: number, initialStyle: any) {
    if (initialStyle) {
      initialStyle.borderColor = this.parseColor(initialStyle.borderColor);
      initialStyle.backgroundColor = this.parseColor(initialStyle.backgroundColor);
      initialStyle.selectedBackgroundColor = this.parseColor(initialStyle.selectedBackgroundColor);
      initialStyle.selectedBorderColor = this.parseColor(initialStyle.selectedBorderColor);
      initialStyle.fontColor = this.parseColor(initialStyle.fontColor);
      initialStyle.selectedFontColor = this.parseColor(initialStyle.selectedFontColor);
      initialStyle.lineColor = this.parseColor(initialStyle.lineColor);
      initialStyle.selectedLineColor = this.parseColor(initialStyle.selectedLineColor);
    }
    this._styles.set(styleId, initialStyle);
  }

  newBlock(blockId: number, nodeId: number, styleId: number, artistId: string) {
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

  connectNode(nodeId: number, dir: string, childId: number) {
    this.getNode(nodeId)?.connectNode(readDirection(dir), this.getNode(childId));
  }

  setLabel(blockId: number, text: string | number) {
    this.getBlock(blockId).setLabel("" + text);
  }

  setRoot(nodeId: number) {
    console.log(this.getNode(nodeId));
    this._viewport.setRoot(this.getNode(nodeId));
  }
}
