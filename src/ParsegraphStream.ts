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
import { PaintedNode, DOMContent } from "parsegraph-artist";
import { showInCamera } from "parsegraph-showincamera";
import parseRain from "./parseRain";

export class ParsegraphInclude {
  _parent: ParsegraphStream;
  _nodeId: number;
  _dir: Direction;
  _child: ParsegraphStream;

  constructor(parent: ParsegraphStream, nodeId: number, dir: Direction) {
    this._parent = parent;
    this._nodeId = nodeId;
    this._dir = dir;
    this._child = new ParsegraphStream(
      this.parent().viewport(),
      this.parent().palette(),
      this.parent().fallbackArtist()
    );
    this._child.setParent(this);
  }

  child() {
    return this._child;
  }

  parent() {
    return this._parent;
  }

  prefix(): string {
    return this.parent()?.prefix();
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
  _nodes: Map<number, PaintedNode>;
  _blocks: Map<number, Block>;
  _embeds: Map<number, DOMContent>;
  _artists: Map<string, BlockArtist>;
  _palette: BlockPalette;
  _include: ParsegraphInclude;
  _prefix: string;

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
    this._embeds = new Map();
    this._artists = new Map();
    this._fallbackArtist = fallbackArtist;
    this._include = null;
    this._prefix = "";
  }

  setParent(include: ParsegraphInclude) {
    this._include = include;
  }

  setPrefix(prefix: string) {
    this._prefix = prefix;
  }

  prefix(): string {
    return this._prefix
      ? this._prefix
      : this.isIncluded()
      ? this.getInclude().prefix()
      : "";
  }

  populate(url: string, options?: any) {
    if (this._es) {
      this.stop();
    }
    if (url.startsWith("/")) {
      url = this.prefix() + "/graph/" + url;
    }
    fetch(url, options)
      .then((resp) => resp.text())
      .then((data) => {
        parseRain(data, this.event, this);
      });
  }

  start(url: string) {
    if (this._es) {
      this.stop();
    }
    if (url.startsWith("/")) {
      url = this.prefix() + "/parsegraph/" + url;
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

  parseStyle(initialStyle: any) {
    if (initialStyle) {
      initialStyle = { ...initialStyle };
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
    return initialStyle;
  }

  setScale(nodeId: number, scale: number) {
    this.getNode(nodeId).state().setScale(scale);
  }

  setBlockStyle(blockId: number, initialStyle: any) {
    this.getBlock(blockId).setBlockStyle(this.parseStyle(initialStyle));
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
    // this.getNode(nodeId).crease();
  }

  getInclude() {
    return this._include;
  }

  link(nodeId: number, url: string, options?: any) {
    this.getNode(nodeId)
      .value()
      .interact()
      .setClickListener(() => {
        let par: ParsegraphStream = this;
        while (par.isIncluded()) {
          par = par.getInclude().parent() || par;
        }
        history.pushState({}, "", url);
        par.populate(url, options);
        return false;
      });
  }

  action(nodeId: number, url: string, payload?: any) {
    const n = this.getNode(nodeId);
    n.value()
      .interact()
      .setClickListener(() => {
        fetch(url, payload);
        return true;
      });
  }

  setCallbackUrl(path: string) {
    this._callbackUrl = path;
  }

  _callbackUrl: string;

  callback(nodeId: number, callbackId: number) {
    const n = this.getNode(nodeId);
    n.value()
      .interact()
      .setClickListener(() => {
        if (this._callbackUrl) {
          fetch(this._callbackUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: "" + callbackId,
          });
        }
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

  setHtml(embedId: number, html: string) {
    if (html.startsWith("/")) {
      html = this.prefix() + "/raw/" + html;
    }
    this._embeds.get(embedId)?.setCreator(() => {
      const cont = document.createElement("img");
      cont.src = html;
      return cont;
    });
  }

  newEmbed(embedId: number, nodeId: number, html: string) {
    if (html.startsWith("/")) {
      html = this.prefix() + "/raw/" + html;
    }
    const embed = new DOMContent(() => {
      const cont = document.createElement("img");
      cont.src = html;
      return cont;
    });
    const n = this.getNode(nodeId);
    if (n) {
      embed.setNode(n);
      n.setValue(embed);
    }
    this._embeds.set(embedId, embed);
    return embed;
  }

  newBlock(
    blockId: number,
    nodeId: number,
    initialStyle: any,
    artistId: string
  ) {
    const block = new Block(
      this.getNode(nodeId),
      this.parseStyle(initialStyle),
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

  setBackgroundColor(r: number, g: number, b: number, a: number) {
    this.viewport().setBackgroundColor(new Color(r, g, b, a));
  }

  isIncluded() {
    return !!this._include;
  }

  setRoot(nodeId: number) {
    if (this.isIncluded()) {
      this._include.setRoot(this.getNode(nodeId));
      return;
    }
    const root = this.getNode(nodeId);
    this.viewport().setRoot(root);
    this.viewport().showInCamera(root);
    showInCamera(root, this.viewport().camera(), false);
  }

  fallbackArtist() {
    return this._fallbackArtist;
  }

  include(nodeId: number, dir: string, url: string, options?: any) {
    const n = this.getNode(nodeId);
    if (!n) {
      throw new Error("No node found");
    }
    const include = new ParsegraphInclude(this, nodeId, readDirection(dir));
    include.child().populate(url, options);
    return include;
  }

  stream(nodeId: number, dir: string, url: string) {
    const n = this.getNode(nodeId);
    if (!n) {
      throw new Error("No node found");
    }
    const include = new ParsegraphInclude(this, nodeId, readDirection(dir));
    include.child().start(url);
    return include;
  }
}
