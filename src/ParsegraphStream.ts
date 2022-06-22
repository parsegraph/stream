import Color from "parsegraph-color";
import Block, {
  BlockPalette,
  BlockArtist,
  BlockStyle,
  BlockCaret,
  BlockNode,
  DefaultBlockPalette,
  DefaultBlockScene,
} from "parsegraph-block";
import { BlockType } from "parsegraph-blockpainter";
import Navport from "parsegraph-viewport";
import Direction, {
  readDirection,
  readPreferredAxis,
  readFit,
} from "parsegraph-direction";
import { ActionCarousel } from "parsegraph-carousel";

class ParsegraphInclude {
  _parent: ParsegraphStream;
  _nodeId: number;
  _dir: Direction;
  _child: ParsegraphStream;

  constructor(parent: ParsegraphStream, nodeId: number, dir: Direction) {
    this._parent = parent;
    this._nodeId = nodeId;
    this._dir = dir;
    this._child = new ParsegraphStream(
      this.parent().viewport(), this.parent().palette(), this.parent().fallbackArtist());
    this._child.setParent(this);

  }

  child() {
    return this._child;
  }

  parent() {
    return this._parent;
  }

  parentNode() {
    const p = this.parent().getNode(this._nodeId);
    if (!p) {
      throw new Error("Parent not found");
    }
    return p;
  }

  setRoot(node: BlockNode) {
    const p = this.parentNode();
    p.connectNode(this._dir, node);
    this.scheduleUpdate();
  }

  scheduleUpdate() {
    this.parent().viewport().scheduleUpdate();
  }
}

export default class ParsegraphStream {
  _viewport: Navport;
  _fallbackArtist: BlockArtist;

  _carets: Map<number, BlockCaret>;
  _nodes: Map<number, BlockNode>;
  _blocks: Map<number, Block>;
  _styles: Map<number, BlockStyle>;
  _artists: Map<string, BlockArtist>;
  _palette: BlockPalette;
  _parent: ParsegraphInclude;

  _es: EventSource;

  constructor(
    viewport: Navport,
    palette: BlockPalette = new DefaultBlockPalette(),
    fallbackArtist: BlockArtist = new BlockArtist((projector) => {
      return new DefaultBlockScene(projector, BlockType.ROUNDED);
    })
  ) {
    this._viewport = viewport;
    this._palette = palette;
    this._carets = new Map();
    this._nodes = new Map();
    this._blocks = new Map();
    this._styles = new Map();
    this._artists = new Map();
    this._fallbackArtist = fallbackArtist;
    this._parent = null;
  }

  setParent(parent: ParsegraphInclude) {
    this._parent = parent;
  }

  populate(url: string, options?: any) {
    if (this._es) {
      this.stop();
    }
    if (url.startsWith("/")) {
      url = "/graph/" + url;
    }
    fetch(url, options)
      .then(resp=>resp.text())
      .then(data=>{
        let index = 0;
        while(index < data.length) {
          const nextLine = data.indexOf("\n", index);
          const lineLenStr = data.substring(index, index + nextLine);
          const lineLen = parseInt(lineLenStr);
          index = nextLine;
          const line = data.substring(index + 1, index + lineLen + 1);
          const args = JSON.parse(line);
          this.event(args.shift(), ...args);
          index += lineLen + 2;
        }
      })
  }

  start(url: string) {
    if (this._es) {
      this.stop();
    }
    this._es = new EventSource(url);
    this._es.onmessage = (event) => {
      const args = JSON.parse(event.data);
      this.event(args.shift(), ...args);
    };
  }

  stop() {
    if (this._es) {
      this._es.close();
      this._es = null;
    }
  }

  event(command: string, ...args: any[]) {
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

  crease(nodeId: number) {
    //this.getNode(nodeId).crease();
  }

  link(nodeId: number, url: string) {
    this.getNode(nodeId).value().interact().setClickListener(()=>{
      let par:ParsegraphStream = this;
      while (par.isIncluded()) {
        par = par._parent._parent || par;
      }
      history.pushState({}, "", url);
      par.populate(url);
      return false;
    });
  }

  action(nodeId: number, url: string, payload: any) {
    const n = this.getNode(nodeId);
    n.value()
      .interact()
      .setClickListener(() => {
        fetch(url, payload);
        return true;
      });
  }

  getCarousel() {
    return this.viewport().carousel();
  }

  carousel(nodeId: number, actions: [string, string, string][]) {
    const ac = new ActionCarousel(this.getCarousel(), this.palette());
    actions.forEach((action) => {
      const [name, url] = action;
      ac.addAction(action[0], () => {
        this.viewport().web().show(action[1]);
      });
    });
    const n = this.getNode(nodeId);
    ac.install(n);
  }

  parseColor(val: string) {
    if (val.startsWith("rgba(")) {
      val = val.substring("rgba".length);
      val = val.substring(1, val.length - 1);
      const parts = val.split(",").map((c) => parseFloat(c.trim()));
      return new Color(parts[0], parts[1], parts[2], parts[3]);
    }
    return new Color(1, 1, 1, 1);
  }

  newBlockStyle(styleId: number, initialStyle: any) {
    if (initialStyle) {
      initialStyle.borderColor = this.parseColor(initialStyle.borderColor);
      initialStyle.backgroundColor = this.parseColor(
        initialStyle.backgroundColor
      );
      initialStyle.selectedBackgroundColor = this.parseColor(
        initialStyle.selectedBackgroundColor
      );
      initialStyle.selectedBorderColor = this.parseColor(
        initialStyle.selectedBorderColor
      );
      initialStyle.fontColor = this.parseColor(initialStyle.fontColor);
      initialStyle.selectedFontColor = this.parseColor(
        initialStyle.selectedFontColor
      );
      initialStyle.lineColor = this.parseColor(initialStyle.lineColor);
      initialStyle.selectedLineColor = this.parseColor(
        initialStyle.selectedLineColor
      );
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
    this.getNode(nodeId)?.connectNode(
      readDirection(dir),
      this.getNode(childId)
    );
  }

  setLabel(blockId: number, text: string | number) {
    this.getBlock(blockId).setLabel("" + text);
  }

  isIncluded() {
    return !!this._parent;
  }

  setRoot(nodeId: number) {
    if (this.isIncluded()) {
      this._parent.setRoot(this.getNode(nodeId));
      return;
    }
    const root = this.getNode(nodeId);
    this.viewport().setRoot(root);
    this.viewport().showInCamera(root);
  }

  fallbackArtist() {
    return this._fallbackArtist;
  }

  include(nodeId: number, dir: string, url: string) {
    const n = this.getNode(nodeId);
    if (!n) {
      throw new Error("No node found");
    }
    const include = new ParsegraphInclude(this, nodeId, readDirection(dir));
    include.child().populate(url);
    return include;
  }
}