const {
  Alignment,
  PreferredAxis,
  readDirection,
  reverseDirection,
} = require("./direction");
const { ParsegraphNode, Fit } = require("./ParsegraphNode");
const { ParsegraphEmbed} = require("./ParsegraphEmbed");

const { id } = require("./id");

class ParsegraphCaret {
  constructor(server, given, palette) {
    this._server = server;
    this._id = id();
    this.setPalette(palette);
    this._nodeRoot = this.doSpawn(given);
    this._nodes = [this._nodeRoot];
    this.server().send("newCaret", this.id(), this.node().id());
  }

  action(path, data) {
    this.server().send("action", this.node().id(), path, data);
  }

  push() {
    this._nodes.push(this.node());
  }

  pop() {
    if (this._nodes.length <= 1) {
      throw new Error("No node found");
    }
    this._nodes.pop();
  }

  pull(given) {
    given = readDirection(given);
    this.node().pull(given);
  }

  root() {
    return this._nodeRoot;
  }

  id() {
    return this._id;
  }

  setPalette(palette) {
    this._palette = palette;
  }

  palette() {
    return this._palette;
  }

  doSpawn(given) {
    if (this.palette()) {
      return this.palette().spawn(given);
    }
    return given instanceof ParsegraphNode
      ? given
      : new ParsegraphNode(this.server(), given);
  }

  doReplace(node, given) {
    if (this.palette()) {
      this.palette().replace(node, given);
    }
    node.setValue(given instanceof ParsegraphNode ? given.value() : given);
  }

  clone() {
    return new ParsegraphCaret(this.server(), this.node(), this.palette());
  }

  server() {
    return this._server;
  }

  node() {
    return this._nodes[this._nodes.length - 1];
  }

  has(inDir) {
    return this.node().hasNode(readDirection(inDir));
  }

  connect(inDir, node) {
    this.node().connectNode(readDirection(inDir), node);
    return node;
  }

  connectMove(inDir, node) {
    inDir = readDirection(inDir);
    this.connect(inDir, node);
    this.move(inDir);
  }

  disconnect(inDir) {
    if (arguments.length > 0) {
      // Interpret the given direction for ease-of-use.
      inDir = readDirection(inDir);
      return this.node().disconnectNode(inDir);
    }

    if (this.node().isRoot()) {
      return this.node();
    }

    return this.node()
      .parentNode()
      .disconnectNode(reverseDirection(this.node().parentDirection()));
  }

  spawnMove(inDir, newType, newAlignmentMode) {
    const created = this.spawn(inDir, newType, newAlignmentMode);
    this.move(inDir);
    return created;
  }

  move(toDirection) {
    toDirection = readDirection(toDirection);
    const dest = this.node().nodeAt(toDirection);
    if (!dest) {
      throw new Error("No node found");
    }
    this._nodes[this._nodes.length - 1] = dest;
  }

  spawn(inDirection, newType, newAlignmentMode) {
    // Interpret the given direction and type for ease-of-use.
    inDirection = readDirection(inDirection);

    // Spawn a node in the given direction.
    const created = this.doSpawn(newType);
    this.node().connectNode(inDirection, created);
    created.setLayoutPreference(PreferredAxis.PERPENDICULAR);
    created.setNodeFit(this.node().nodeFit());

    // Use the given alignment mode.
    if (newAlignmentMode !== undefined) {
      newAlignmentMode = readAlignment(newAlignmentMode);
      this.align(inDirection, newAlignmentMode);
      if (newAlignmentMode !== Alignment.NONE) {
        this.node().setNodeFit(Fit.EXACT);
      }
    }

    return created;
  }

  label(text) {
    if (arguments.length === 0) {
      return this.node().value().label();
    }
    this.node().value().setLabel(text);
  }

  link(url) {
    this.server().send("link", this.node().id(), url);
  }

  replace(...args) {
    // Retrieve the arguments.
    let node = this.node();
    let withType;
    if (args.length > 1) {
      node = node.nodeAt(readDirection(args[0]));
      withType = args[1];
    } else {
      withType = args[0];
    }
    this.doReplace(node, withType);
  }

  doReplace(node, given) {
    if (this.palette()) {
      this.palette().replace(node, given);
      return;
    }
    node.setValue(given ? given.value() : given);
  }

  include(dir, url) {
    const node = this.node();
    node.include(readDirection(dir), url);
  }

  embed(...args) {
    let node = this.node();
    let val;
    if (args.length > 1) {
      node = node.nodeAt(readDirection(args[0]));
      val = args[1];
    } else {
      val = args[0];
    }

    return new ParsegraphEmbed(this.server(), node, val);
  }

  stream(dir, url) {
    const node = this.node();
    node.stream(readDirection(dir), url);
  }

  crease() {
    this.server().send("crease", this.node().id());
  }
}

module.exports = { ParsegraphCaret };
