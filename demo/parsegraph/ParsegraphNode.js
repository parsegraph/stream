const {
  Direction,
  Axis,
  reverseDirection,
  getDirectionAxis,
  isVerticalDirection,
  PreferredAxis,
} = require("./direction");
const { id } = require("./id");

const Fit = {
  EXACT: "EXACT",
  LOOSE: "LOOSE",
  NAIVE: "NAIVE",
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

  setScale(scale) {
    this.server().send("setScale", this.id(), scale);
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
    console.log(node)
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
    n.url = { url: url };
    this.server().send("include", this.id(), dir, url);
  }

  stream(dir, url) {
    const n = this.ensureNeighbor(dir);
    if (n.node) {
      this.disconnectNode(dir);
    }
    n.url = { url: url };
    this.server().send("stream", this.id(), dir, url);
  }
}

module.exports = { ParsegraphNode, Fit };
