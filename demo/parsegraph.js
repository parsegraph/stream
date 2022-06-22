let nextId = 0;
const id = () => {
  return ++nextId;
};

const BUD_RADIUS = 2;

const MIN_BLOCK_HEIGHT = BUD_RADIUS * 12;
const MIN_BLOCK_WIDTH = BUD_RADIUS * 15;

// Inter-node spacing
const HORIZONTAL_SEPARATION_PADDING = 7 * BUD_RADIUS;
const VERTICAL_SEPARATION_PADDING = 3 * BUD_RADIUS;

// Configures graphs to appear grid-like; I call it 'math-mode'.
const MIN_BLOCK_WIDTH_MATH = BUD_RADIUS * 40;
const MIN_BLOCK_HEIGHT_MATH = MIN_BLOCK_WIDTH_MATH;
const HORIZONTAL_SEPARATION_PADDING_MATH = 2;
const VERTICAL_SEPARATION_PADDING_MATH = 2;

const FONT_SIZE = 18;

const LINE_COLOR = "rgba(0.4, 0.4, 0.4, 0.6)";
const SELECTED_LINE_COLOR = "rgba(0.8, 0.8, 0.8, 1)";
const LINE_THICKNESS = (12 * BUD_RADIUS) / 8;

const lineColor = LINE_COLOR;
const selectedLineColor = lineColor;
const borderColor = lineColor;
const selectedBorderColor = lineColor;

const Direction = {
  FORWARD: "f",
  BACKWARD: "b",
  DOWNWARD: "d",
  UPWARD: "u",
  INWARD: "i",
  OUTWARD: "o",
};

const Axis = {
  VERTICAL: "VERTICAL",
  HORIZONTAL: "HORIZONTAL",
  Z: "Z",
};

const Fit = {
  EXACT: "EXACT",
  LOOSE: "LOOSE",
  NAIVE: "NAIVE",
};

const PreferredAxis = {
  PERPENDICULAR: "PERPENDICULAR",
  PARENT: "PARENT",
};

const readDirection = (dir) => {
  return dir.toLowerCase().substring(0, 1);
};

const reverseDirection = (dir) => {
  switch (dir) {
    case "d":
      return "u";
    case "u":
      return "d";
    case "f":
      return "b";
    case "b":
      return "f";
    case "i":
      return "o";
    case "o":
      return "i";
  }
};

const getDirectionAxis = (given) => {
  switch (given) {
    case Direction.FORWARD:
    case Direction.BACKWARD:
      return Axis.HORIZONTAL;
    case Direction.DOWNWARD:
    case Direction.UPWARD:
      return Axis.VERTICAL;
    case Direction.INWARD:
    case Direction.OUTWARD:
      return Axis.Z;
    case Direction.NULL:
      return Axis.NULL;
  }
};

const isVerticalDirection = (dir) => {
  switch (dir) {
    case "d":
    case "u":
      return true;
    default:
      return false;
  }
};

const isHorizontalDirection = (dir) => {
  switch (dir) {
    case "d":
    case "u":
      return true;
    default:
      return false;
  }
};

class ParsegraphNode {
  constructor(server, value) {
    this._server = server;
    this._id = id();
    this._value = value;
    this.server().send("newNode", this.id());
    this._neighbors = {};
    this._parentNeighbor = null;
    this._nodeFit = Fit.LOOSE;
  }

  ensureNeighbor(dir) {
    if (!this._neighbors[dir]) {
      this._neighbors[dir] = {};
    }
    return this._neighbors[dir];
  }

  assignParent(fromNode, parentDirection) {
    if (arguments.length === 0 || !fromNode) {
      // Clearing the parent.
      this._parentNeighbor = null;
      return;
    }
    this._parentNeighbor = fromNode.neighborAt(parentDirection);
    if (!this._parentNeighbor) {
      throw new Error("Parent neighbor is undefined");
    }
  }

  server() {
    return this._server;
  }

  id() {
    return this._id;
  }

  setValue(value) {
    this._value = value;
    value?.assignNode(this);
    this.server().send("setValue", this.id(), value?.id());
  }

  connectNode(inDirection, node) {
    if (this.hasNode(inDirection) || this.hasInclude(inDirection)) {
      this.disconnectNode(inDirection);
    }
    if (!node.isRoot()) {
      node.disconnectNode();
    }
    if (node.hasNode(reverseDirection(inDirection))) {
      node.disconnectNode(reverseDirection(inDirection));
    }

    // Connect the node.
    const neighbor = this.ensureNeighbor(inDirection);
    neighbor.node = node;
    node.assignParent(this, inDirection);

    this.server().send("connectNode", this.id(), inDirection, node.id());

    return node;
  }

  disconnectNode(inDirection) {
    if (arguments.length === 0) {
      if (this.isRoot()) {
        return this;
      }
      return this.parentNode().disconnectNode(
        reverseDirection(this.parentDirection())
      );
    }
    if (!this.hasNode(inDirection)) {
      return;
    }
    if (!this.isRoot() && this.parentDirection() === inDirection) {
      return this.parentNode().disconnectNode(
        reverseDirection(this.parentDirection())
      );
    }
    // Disconnect the node.
    // console.log("Disconnecting ", disconnected.id(), " from ", this.id());
    const neighbor = this.neighborAt(inDirection);
    const disconnected = neighbor.node;

    neighbor.node = null;
    neighbor.url = null;
    if (disconnected) {
      disconnected.assignParent(null);
    }

    if (disconnected.getLayoutPreference() === PreferredAxis.PARENT) {
      if (Axis.VERTICAL === getDirectionAxis(inDirection)) {
        disconnected.setLayoutPreference(PreferredAxis.VERTICAL);
      } else {
        disconnected.setLayoutPreference(PreferredAxis.HORIZONTAL);
      }
    } else if (
      disconnected.getLayoutPreference() === PreferredAxis.PERPENDICULAR
    ) {
      if (Axis.VERTICAL === getDirectionAxis(inDirection)) {
        disconnected.setLayoutPreference(PreferredAxis.HORIZONTAL);
      } else {
        disconnected.setLayoutPreference(PreferredAxis.VERTICAL);
      }
    }

    return disconnected;
  }

  isRoot() {
    return !this._parentNeighbor;
  }

  neighborAt(dir) {
    return this._neighbors[dir];
  }

  hasInclude(atDirection) {
    return !!(this.neighborAt(atDirection) && this.neighborAt(atDirection).url);
  }

  hasNode(atDirection) {
    if (this.neighborAt(atDirection) && this.neighborAt(atDirection).node) {
      return true;
    }
    return !this.isRoot() && this.parentDirection() === atDirection;
  }

  getLayoutPreference() {
    return this._layoutPreference;
  }

  canonicalLayoutPreference() {
    // Root nodes do not have a canonical layout preference.
    if (this.isRoot()) {
      throw new Error("Node is root");
    }

    // Convert the layout preference to either preferring the parent or
    // the perpendicular axis.
    let canonicalPref = this.getLayoutPreference();
    switch (this.getLayoutPreference()) {
      case PreferredAxis.HORIZONTAL: {
        if (getDirectionAxis(this.parentDirection()) === Axis.HORIZONTAL) {
          canonicalPref = PreferredAxis.PARENT;
        } else {
          canonicalPref = PreferredAxis.PERPENDICULAR;
        }
        break;
      }
      case PreferredAxis.VERTICAL: {
        if (getDirectionAxis(this.parentDirection()) === Axis.VERTICAL) {
          canonicalPref = PreferredAxis.PARENT;
        } else {
          canonicalPref = PreferredAxis.PERPENDICULAR;
        }
        break;
      }
      case PreferredAxis.PERPENDICULAR:
      case PreferredAxis.PARENT:
        canonicalPref = this.getLayoutPreference();
        break;
      case PreferredAxis.NULL:
        throw new Error("Bad layout preference");
    }
    return canonicalPref;
  }

  parentNeighbor() {
    return this._parentNeighbor;
  }

  parentDirection() {
    if (this.isRoot()) {
      return null;
    }
    return reverseDirection(this.parentNeighbor().direction);
  }

  sanitizeLayoutPreference(given) {
    const paxis = getDirectionAxis(this.parentDirection());
    if (given === PreferredAxis.VERTICAL) {
      given =
        paxis === Axis.VERTICAL
          ? PreferredAxis.PARENT
          : PreferredAxis.PERPENDICULAR;
    } else if (given === PreferredAxis.HORIZONTAL) {
      given =
        paxis === Axis.HORIZONTAL
          ? PreferredAxis.PARENT
          : PreferredAxis.PERPENDICULAR;
    }
    return given;
  }

  setLayoutPreference(given) {
    if (this.isRoot()) {
      if (
        given !== PreferredAxis.VERTICAL &&
        given !== PreferredAxis.HORIZONTAL
      ) {
        throw new Error("Bad layout preference");
      }
      if (this.getLayoutPreference() === given) {
        return;
      }
      this.server().send("setLayoutPreference", this.id(), given);
      this._layoutPreference = given;
      return;
    }

    given = this.sanitizeLayoutPreference(given);

    const curCanon = this.canonicalLayoutPreference();
    this._layoutPreference = given;
    this.server().send("setLayoutPreference", this.id(), given);
    const newCanon = this.canonicalLayoutPreference();
    if (curCanon === newCanon) {
      return;
    }
  }

  nodeFit() {
    return this._nodeFit;
  }

  setNodeFit(fit) {
    this._nodeFit = fit;
    this.server().send("setNodeFit", this.id(), fit);
  }

  nodeAt(atDirection) {
    const n = this.neighborAt(atDirection);
    if (!n) {
      if (this.parentNeighbor() && this.parentDirection() === atDirection) {
        return this.parentNeighbor().owner;
      }
      return null;
    }
    if (n.url) {
      throw new Error("Node in direction is embedded");
    }
    return n.node;
  }

  value() {
    return this._value;
  }

  pull(given) {
    if (this.isRoot() || this.parentDirection() === Direction.OUTWARD) {
      if (isVerticalDirection(given)) {
        this.setLayoutPreference(PreferredAxis.VERTICAL);
      } else {
        this.setLayoutPreference(PreferredAxis.HORIZONTAL);
      }
      return;
    }
    if (getDirectionAxis(given) === getDirectionAxis(this.parentDirection())) {
      // console.log(namePreferredAxis(PreferredAxis.PARENT));
      this.setLayoutPreference(PreferredAxis.PARENT);
    } else {
      // console.log(namePreferredAxis(PreferredAxis.PERPENDICULAR);
      this.setLayoutPreference(PreferredAxis.PERPENDICULAR);
    }
  }

  include(dir, url) {
    const n = this.ensureNeighbor(dir);
    if (n.node) {
      this.disconnectNode(dir);
    }
    n.url = {url:url};
    this.server().send("include", this.id(), dir, url);
  }
}

class ParsegraphPalette {
  constructor(server, builder) {
    this._server = server;
    this._builder = builder;
  }

  server() {
    return this._server;
  }

  spawn(given) {
    const node = new ParsegraphNode(this.server());
    this.replace(node, given);
    return node;
  }

  replace(node, given) {
    node.setValue(this._builder(given));
  }
}

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

  crease() {
    this.server().send("crease", this.node().id());
  }
}

class ParsegraphBlockStyle {
  constructor(server, initialStyle) {
    this._server = server;
    this._id = id();
    this._style = initialStyle;
    this._server.send("newBlockStyle", this._id, this._style);
  }

  value() {
    return this._style;
  }

  setValue(newStyle) {
    this._style = newStyle;
    this._server.send("setStyleValue", this._id, this._style);
  }

  id() {
    return this._id;
  }
}

class ParsegraphBlock {
  constructor(server, node, style, artist) {
    this._server = server;
    this._id = id();
    this._node = node;
    this._style = style;
    this._artist = artist;
    this._text = "";
    this.server().send(
      "newBlock",
      this.id(),
      this._node?.id(),
      style?.id(),
      artist?.id()
    );
  }

  artist() {
    return this._artist;
  }

  id() {
    return this._id;
  }

  blockStyle() {
    return this._style;
  }

  node() {
    return this._node;
  }

  assignNode(node) {
    this._node = node;
  }

  server() {
    return this._server;
  }

  setLabel(text) {
    this._text = text;
    this.server().send("setLabel", this.id(), text);
  }

  setBlockStyle(style) {
    this._style = style;
    this.server().send("setBlockStyle", this.id(), this._style?.id());
  }
}

class ParsegraphServerState {
  constructor(server, artist) {
    this._server = server;
    this._carets = {};
    this._mathMode = false;
    this._artist = artist;
    this._palette = new ParsegraphPalette(server, (given) => {
      return new ParsegraphBlock(
        server,
        null,
        this.style(given, this.mathMode()),
        this.artist()
      );
    });
  }

  style(given, mathMode) {
    switch (given) {
      case "u":
        return this.budStyle();
      case "s":
        return mathMode ? this.slotMathStyle() : this.slotStyle();
      case "b":
        return mathMode ? this.blockMathStyle() : this.blockStyle();
    }
  }

  slotStyle() {
    if (!this._slotStyle) {
      this._slotStyle = new ParsegraphBlockStyle(this.server(), {
        bud: false,
        mathMode: false,
        minWidth: MIN_BLOCK_WIDTH,
        minHeight: MIN_BLOCK_HEIGHT,
        horizontalPadding: 3 * BUD_RADIUS,
        verticalPadding: 0.5 * BUD_RADIUS,
        borderColor: borderColor,
        backgroundColor: "rgba(0.75, 0.75, 1, 0.5)",
        selectedBorderColor: selectedBorderColor,
        selectedBackgroundColor: "rgba(0.9, 1, 0.9, 1)",
        brightness: 0.75,
        borderRoundness: BUD_RADIUS * 3,
        borderThickness: BUD_RADIUS * 2,
        fontColor: "rgba(0, 0, 0, 1)",
        selectedFontColor: "rgba(0, 0, 0, 1)",
        fontSize: FONT_SIZE,
        letterWidth: 0.61,
        verticalSeparation: 6 * VERTICAL_SEPARATION_PADDING,
        horizontalSeparation: 7 * HORIZONTAL_SEPARATION_PADDING,
        lineColor: lineColor,
        selectedLineColor: selectedLineColor,
      });
    }
    return this._slotStyle;
  }

  blockStyle() {
    if (!this._blockStyle) {
      this._blockStyle = new ParsegraphBlockStyle(this.server(), {
        bud: false,
        mathMode: false,
        minWidth: MIN_BLOCK_WIDTH,
        minHeight: MIN_BLOCK_HEIGHT,
        horizontalPadding: 3 * BUD_RADIUS,
        verticalPadding: 0.5 * BUD_RADIUS,
        borderColor: borderColor,
        backgroundColor: "rgba(1, 1, 1, 0.25)",
        selectedBorderColor: selectedBorderColor,
        selectedBackgroundColor: "rgba(0.75, 0.75, 1, 1)",
        brightness: 0.75,
        borderRoundness: BUD_RADIUS * 3,
        borderThickness: BUD_RADIUS * 2,
        fontColor: "rgba(0, 0, 0, 1)",
        selectedFontColor: "rgba(0, 0, 0, 1)",
        fontSize: FONT_SIZE,
        letterWidth: 0.61,
        lineColor: lineColor,
        selectedLineColor: selectedLineColor,
        verticalSeparation: 6 * VERTICAL_SEPARATION_PADDING,
        horizontalSeparation: 1 * HORIZONTAL_SEPARATION_PADDING,
      });
    }
    return this._blockStyle;
  }

  copyStyle(given, mathMode) {
    return new ParsegraphBlockStyle(
      this.server(),
      this.style(given, mathMode).value()
    );
  }

  budStyle() {
    if (!this._budStyle) {
      this._budStyle = new ParsegraphBlockStyle(this.server(), {
        bud: true,
        minWidth: BUD_RADIUS * 3,
        minHeight: BUD_RADIUS * 3,
        horizontalPadding: BUD_RADIUS / 2,
        verticalPadding: BUD_RADIUS / 2,
        borderColor: borderColor,
        backgroundColor: "rgba(0.9, 0.9, 0.9, 0.2)",
        selectedBorderColor: selectedBorderColor,
        selectedBackgroundColor: "rgba(1, 1, 0.7, 1)",
        brightness: 1.5,
        borderRoundness: BUD_RADIUS * 8,
        borderThickness: BUD_RADIUS * 2,
        fontColor: "rgba(0, 0, 0, 1)",
        selectedFontColor: "rgba(0, 0, 0, 1)",
        fontSize: FONT_SIZE,
        letterWidth: 0.61,
        verticalSeparation: 10 * VERTICAL_SEPARATION_PADDING,
        horizontalSeparation: 7 * HORIZONTAL_SEPARATION_PADDING,
        lineColor: lineColor,
        selectedLineColor: selectedLineColor,
      });
    }
    return this._budStyle;
  }

  mathMode() {
    return this._mathMode;
  }

  artist() {
    return this._artist;
  }

  server() {
    return this._server;
  }

  newCaret(given, palette) {
    if (!palette) {
      palette = this.palette();
    }
    const car = new ParsegraphCaret(this.server(), given, palette);
    this._carets[car.id()] = car;
    return car;
  }

  palette() {
    return this._palette;
  }

  setRoot(root) {
    this._root = root;
    this.server().send("setRoot", root?.id());
  }

  root() {
    return this._root;
  }
}

class ParsegraphServer {
  constructor(artist) {
    this._clients = [];
    this._messages = [];
    this._state = new ParsegraphServerState(this, artist);
  }

  connect(writer) {
    const client = new ParsegraphClient(this, writer);
    this._clients.push(client);
    console.log("Client connected", this._messages.length);
    this._messages.forEach((msg) => client.send(...msg));
    return () => {
      for (let i = 0; i < this._clients.length; ++i) {
        if (this._clients[i] === client) {
          this._clients.splice(i--, 1);
          break;
        }
      }
    };
  }

  forEach(cb) {
    this._messages.forEach((msg) => cb(...msg));
  }

  send(...args) {
    this._clients.forEach((client) => client.send(...args));
    this._messages.push(args);
  }

  state() {
    return this._state;
  }
}

/*DirectionNode
PaintedNode:
- Artist

Block:
- BlockStyle
 28   bud: boolean;
 29   mathMode: boolean;
 30   minWidth: number;
 31   minHeight: number;
 32   horizontalPadding: number;
 33   verticalPadding: number;
 34   borderColor: Color;
 35   backgroundColor: Color;
 36   selectedBorderColor: Color;
 37   selectedBackgroundColor: Color;
 38   brightness: number;
 39   borderRoundness: number;
 40   borderThickness: number;
 41   fontColor: Color;
 42   selectedFontColor: Color;
 43   fontSize: number;
 44   letterWidth: number;
 45   verticalSeparation: number;
 46   horizontalSeparation: number;
 47   lineColor: Color;
 48   selectedLineColor: Color;

- Label text

Focused*/

class ParsegraphClient {
  constructor(server, writer) {
    this._server = server;
    this._writer = writer;
  }

  send(...args) {
    this._writer(...args);
  }
}

module.exports = {
  ParsegraphServer,
};
