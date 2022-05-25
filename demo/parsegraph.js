let nextId = 0;
const id = () => {
  return ++nextId;
};

const Fit = {
  EXACT: "EXACT",
  LOOSE: "LOOSE",
  NAIVE: "NAIVE",
};

const Axis = {
  VERTICAL: "VERTICAL",
  HORIZONTAL: "HORIZONTAL",
  Z: "Z",
};

const getDirectionAxis = (dir) => {
  switch (dir) {
    case "f":
    case "b":
      return Axis.HORIZONTAL;
    case "d":
    case "u":
      return Axis.VERTICAL;
    case "i":
    case "o":
      return Axis.Z;
  }
};

const PreferredAxis = {
  PERPENDICULAR: "PERPENDICULAR",
  PARENT: "PARENT",
};

const readDirection = (dir) => {
  return dir;
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
  }

  connectNode(inDirection, node) {
    if (this.hasNode(inDirection)) {
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

  isRoot() {
    return !this._parentNeighbor;
  }

  neighborAt(dir) {
    return this._neighbors[dir];
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
        throw createException(BAD_LAYOUT_PREFERENCE);
      }
      if (this.getLayoutPreference() === given) {
        return;
      }
      if (given === PreferredAxis.VERTICAL) {
        // PREFER_HORIZONTAL_AXIS -> PREFER_VERTICAL_AXIS
        this.siblings().horzToVert();
      } else {
        // PREFER_VERTICAL_AXIS -> PREFER_HORIZONTAL_AXIS
        this.siblings().vertToHorz();
      }
      this._layoutPreference = given;
      return;
    }

    given = this.sanitizeLayoutPreference(given);

    const curCanon = this.canonicalLayoutPreference();
    this._layoutPreference = given;
    const newCanon = this.canonicalLayoutPreference();
    if (curCanon === newCanon) {
      return;
    }

    const paxis = getDirectionAxis(this.parentDirection());
    if (curCanon === PreferredAxis.PARENT) {
      if (paxis === Axis.HORIZONTAL) {
        this.siblings().horzToVert();
      } else {
        this.siblings().vertToHorz();
      }
    } else {
      if (paxis === Axis.VERTICAL) {
        this.siblings().vertToHorz();
      } else {
        this.siblings().horzToVert();
      }
    }

    this.layoutChanged(Direction.INWARD);
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
    return n.node;
  }

  value() {
    return this._value;
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
    created.setLayoutPreference("PERPENDICULAR");
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
}

class ParsegraphBlockStyle {
  constructor(server, initialStyle) {
    this._server = server;
    this._id = id();
    this._style = initialStyle;
    this.server().send("newBlockStyle", this.id(), this._style);
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

  server() {
    return this._server;
  }

  setLabel(text) {
    this._text = text;
  }
}

class ParsegraphServerState {
  constructor(server) {
    this._server = server;
    this._carets = {};
    this._palette = new ParsegraphPalette(server, (given) => {
      switch (given) {
        case "u":
          return new ParsegraphBlock(server);
        case "b":
          return new ParsegraphBlock(server);
        case "s":
          return new ParsegraphBlock(server);
        default:
          console.log("Palette default", given);
          return given;
      }
    });
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
}

class ParsegraphServer {
  constructor() {
    this._clients = [];
    this._messages = [];
    this._state = new ParsegraphServerState(this);
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

  send(...args) {
    this._clients.forEach((client) => client.send(...args));
    console.log(args);
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
