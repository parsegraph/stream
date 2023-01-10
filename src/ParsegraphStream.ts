import Color from "parsegraph-color";
import Block, {
  BlockPalette,
  BlockArtist,
  BlockCaret,
  BlockNode,
  DefaultBlockPalette,
  DefaultBlockScene,
} from "parsegraph-block";
import { BlockType } from "parsegraph-blockpainter";
import Navport, { ActionCarousel } from "parsegraph-viewport";
import Direction, {
  readAlignment,
  readDirection,
  readPreferredAxis,
  readFit,
} from "parsegraph-direction";
import { PaintedNode, DOMContent } from "parsegraph-artist";
import { DOMContentArtist } from "parsegraph-artist";
import parseRain from "./parseRain";

const MAX_DEPTH = 1;

const domArtist = new DOMContentArtist();

type Splicer = (
  val: string,
  offset: number,
  len: number,
  subPath: string
) => Promise<any>;
type CallbackHandler = (
  callbackUrl: string,
  callbackId: number,
  val?: any
) => Promise<any>;

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
    this.parent().viewport().scheduleRepaint();
  }
}

export default class ParsegraphStream {
  _viewport: Navport;
  _fallbackArtist: BlockArtist;

  _carets: Map<number, BlockCaret>;
  _nodes: Map<number, PaintedNode>;
  _blocks: Map<number, Block>;
  _domContents: Map<number, DOMContent>;
  _embeds: Map<number, DOMContent>;
  _artists: Map<string, BlockArtist>;
  _palette: BlockPalette;
  _include: ParsegraphInclude;
  _prefix: string;
  _onLink: (url: string, options?: any) => void;
  _onStream: (stream: ParsegraphStream, url: string, options?: any) => void;
  _onPopulate: (stream: ParsegraphStream, url: string, options?: any) => void;

  onPopulate(
    populator: (stream: ParsegraphStream, url: string, options?: any) => void
  ) {
    this._onPopulate = populator;
  }

  _es: EventSource;
  _depth: number;

  setDepth(depth: number) {
    this._depth = depth;
  }

  depth() {
    return this._depth;
  }

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
    this._domContents = new Map();
    this._embeds = new Map();
    this._artists = new Map();
    this._fallbackArtist = fallbackArtist;
    this._include = null;
    this._prefix = "";
    this._onLink = null;
    this._onStream = null;
    this._onPopulate = null;
    this._depth = 0;
  }

  setParent(include: ParsegraphInclude) {
    this._include = include;
    this._depth = include.parent().depth() + 1;
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

  getOnPopulate(): (
    stream: ParsegraphStream,
    url: string,
    options?: any
  ) => void {
    let stream: ParsegraphStream = this;
    while (stream) {
      if (stream._onPopulate) {
        return stream._onPopulate;
      }
      stream = stream._include?.parent();
    }
    return null;
  }

  _populated:{url: string, options: any};

  repopulate() {
    if (!this._populated) {
      return;
    }
    this.populate(this._populated.url, this._populated.options);
  }

  populate(url: string, options?: any) {
    this._populated = {url, options};
    if (this.getOnPopulate()) {
      this.getOnPopulate()(this, url, options);
      return;
    }
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

  hasDomContent(id: number) {
    return this._domContents.has(id);
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

  getDomContent(domId: number) {
    if (!domId) {
      return null;
    }
    if (!this.hasDomContent(domId)) {
      throw new Error("No DOM content for ID: " + domId);
    }
    return this._domContents.get(domId);
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

  onLink(callback: (url: string, options?: any) => void) {
    this._onLink = callback;
  }

  linkNode(node: BlockNode, url: string, options?: any) {
    node
      .value()
      .interact()
      .setClickListener(() => {
        let par: ParsegraphStream = this;
        while (par.isIncluded()) {
          par = par.getInclude().parent() || par;
        }
        history.pushState({}, "", url);
        if (this._onLink) {
          this._onLink(url, options);
        } else {
          par.populate(url, options);
        }
        return false;
      });
  }

  link(nodeId: number, url: string, options?: any) {
    this.linkNode(this.getNode(nodeId), url, options);
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

  setNodeAlignmentMode(
    nodeId: number,
    inDirection: string,
    newAlignmentMode: string
  ) {
    this.getNode(nodeId)?.setNodeAlignmentMode(
      readDirection(inDirection),
      readAlignment(newAlignmentMode)
    );
  }

  setCallbackUrl(path: string) {
    this._callbackUrl = path;
  }

  _callbackUrl: string;

  _callbackHandler: CallbackHandler;

  setCallbackHandler(cb: CallbackHandler) {
    this._callbackHandler = cb;
  }

  getCallbackHandler(): CallbackHandler {
    if (!this._callbackHandler) {
      if (this.isIncluded()) {
        return this._include.parent().getCallbackHandler();
      }
    }
    if (this._callbackHandler) {
      return this._callbackHandler;
    }
    if (this._callbackUrl) {
      return (callbackUrl: string, callbackId: number, val?: any) => {
        return fetch(callbackUrl + "?cb=" + callbackId, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(val),
        });
      };
    }
    return async (callbackUrl: string, callbackId: number, val?: any) => {
      console.log("Unhandled callback", callbackUrl, callbackId, val);
    };
  }

  makeCallback(callbackId: number, val?: any) {
    const callbackHandler = this.getCallbackHandler();
    return callbackHandler(this._callbackUrl, callbackId, val);
  }

  disconnectNode(nodeId: number, inDirection: string) {
    this.getNode(nodeId)?.disconnectNode(readDirection(inDirection));
  }

  setClickListener(nodeId: number, callbackId: number, val?: any) {
    const n = this.getNode(nodeId);
    n.value()
      .interact()
      .setClickListener(() => {
        this.makeCallback(callbackId, val);
        return true;
      });
  }

  getCarousel() {
    return this.viewport().carousel();
  }

  overlay(nodeId: number, url: string) {
    this.getNode(nodeId)
      .value()
      .interact()
      .setClickListener(() => {
        this.viewport().web().show(url);
      });
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

  spliceComplete(): void {}

  onSplice(cb: Splicer): void {
    this._splicer = cb;
  }

  getSplicer(): Splicer {
    if (this._splicer) {
      return this._splicer;
    }
    if (this.isIncluded()) {
      return this._include.parent().getSplicer();
    }
    return (val, offset, len, subPath) => {
      return fetch(`/splice/${subPath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          val: val,
          offset,
          len,
        }),
      });
    };
  }

  _splicer: Splicer;

  private makeTextEdit(nodeId: number, val: string, callback: (newVal:string)=>Promise<any>) {
    const n = this.getNode(nodeId);
    const block = n.value();
    block.setLabel(val);
    const div = document.createElement("div");
    const c = document.createElement("input");
    c.style.pointerEvents = "all";
    c.value = val;

    const returnToView = ()=>{
      n.setValue(block);
      block.setNode(n);
      this.viewport().scheduleRepaint();
    }

    const commit = ()=>{
      origValue = c.value;
      returnToView();
      this.repopulate();
    };

    let origValue = val;
    c.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        // Commit
        e.preventDefault();
        callback(c.value).then(()=>{
          commit();
        }).catch(()=>{
        });
      } else if (e.key === "Escape") {
        // Cancel
        e.preventDefault();
        c.value = origValue;
        returnToView();
      }
    });
    div.appendChild(c);
    const edit = new DOMContent(() => div);
    edit.setOnScheduleUpdate(()=>this.viewport().scheduleRepaint());
    edit.setArtist(domArtist);

    const install = () => {
      n.value()
        .interact()
        .setClickListener(() => {
          edit.setNode(n);
          n.setValue(edit);
        });
    };
    install();
    return val;
  }

  textEdit(nodeId: number, val: string, callbackId: number) {

    return this.makeTextEdit(nodeId, val, (newVal)=>this.makeCallback(callbackId, newVal));
  }

  textSplice(
    nodeId: number,
    val: string,
    offset: number,
    len: number,
    subPath: string
  ) {
    return this.makeTextEdit(nodeId, val, (newVal)=>this.getSplicer()(newVal, offset, len, subPath));
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
    // <parsegraph dir="downward" embed="<body style='margin: 0; padding: 0'><iframe style='border: 0' src='/login'></iframe></body>"/>
    const embed = new DOMContent(() => {
      const cont = document.createElement("iframe");
      cont.style.pointerEvents = "all";
      cont.style.border = "0";
      cont.width = "0";
      cont.height = "0";
      cont.style.width = "0px";
      cont.style.height = "0px";
      if (html.startsWith("/")) {
        cont.src = html;
        setTimeout(() => {
          (cont.contentWindow as any).parsegraphResize = (
            w: number,
            h: number
          ) => {
            console.log("Reported size", w, h);
            embed.reportSize(w, h);
            cont.width = `${w}`;
            cont.height = `${h}`;
            cont.style.width = `${w}px`;
            cont.style.height = `${h}px`;
            this.scheduleUpdate();
          };
        }, 0);
      } else {
        cont.src = "about:blank";
        setTimeout(() => {
          const doc = cont.contentDocument;
          doc.open();
          doc.write(html);
          doc.close();
          return cont;
        }, 0);
      }
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

  newDomContent(domId: number, nodeId: number, initialContent: string) {
    const val = new DOMContent(() => {
      const c = document.createElement("div");
      c.innerHTML = initialContent;
      return c;
    });
    val.setArtist(domArtist);
    if (this.getNode(nodeId)) {
      this.getNode(nodeId).setValue(val);
    }
    this._domContents.set(domId, val);
    return val;
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
  }

  fallbackArtist() {
    return this._fallbackArtist;
  }

  depthLink(nodeId: number, dir: string, url: string, options?: any) {
    const node = this.palette().spawn("u");
    this.linkNode(node, url, options);
    this.getNode(nodeId).connectNode(readDirection(dir), node);
  }

  include(nodeId: number, dir: string, url: string, options?: any) {
    const n = this.getNode(nodeId);
    if (!n) {
      throw new Error("No node found");
    }
    if (this.depth() > MAX_DEPTH) {
      this.depthLink(nodeId, dir, url, options);
      return null;
    }
    const include = new ParsegraphInclude(this, nodeId, readDirection(dir));
    include.child().populate(url, options);
    return include;
  }

  startStream(stream: ParsegraphStream, url: string, options?: any) {
    if (this._onStream) {
      this._onStream(stream, url, options);
      return;
    }
    if (this.isIncluded()) {
      this._include.parent().startStream(stream, url, options);
      return;
    }
    if (stream._es) {
      stream.stop();
    }
    if (url.startsWith("/")) {
      url = this.prefix() + "/parsegraph" + url;
    }
    stream._es = new EventSource(url, options);
    stream._es.onmessage = (event) => {
      const args = JSON.parse(event.data);
      stream.event(args.shift(), ...args);
    };
  }

  onStream(cb: (stream: ParsegraphStream, url: string, options?: any) => void) {
    this._onStream = cb;
  }

  stream(nodeId: number, dir: string, url: string, options?: any) {
    const n = this.getNode(nodeId);
    if (!n) {
      throw new Error("No node found");
    }
    if (this.depth() > MAX_DEPTH) {
      this.depthLink(nodeId, dir, url, options);
      return null;
    }
    const include = new ParsegraphInclude(this, nodeId, readDirection(dir));
    this.startStream(include.child(), url, options);
    return include;
  }

  scheduleUpdate() {
    if (this.isIncluded()) {
      this._include.parent().scheduleUpdate();
      return;
    }
    this.viewport().scheduleRepaint();
  }
}
