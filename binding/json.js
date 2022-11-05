const { BlockTreeNode } = require("./treenode/BlockTreeNode");
const { WrappingTreeList } = require("./treenode/WrappingTreeList");
const { Direction } = require("./direction");
const { TreeNode } = require("./treenode/TreeNode");
const { ParsegraphCaret } = require("./ParsegraphCaret");

const graphWithNewlines = (server, root, list) => {
  if (!Array.isArray(list)) {
    list = [list];
  }
  list.forEach((child, i) => {
    if (Array.isArray(child)) {
      const list = new JSONList(server);
      graphWithNewlines(server, list, child);
      root.appendChild(list);
    } else {
      console.log("Render JSON cell", child);
      const cell = new JSONCell(server, child);
      root.appendChild(cell);
    }
    if (i < list.length - 1) {
      root.appendNewline();
    }
  });
};

class JSONList extends WrappingTreeList {
  constructor(server, children) {
    super(server, new BlockTreeNode(server, "s"), children, true);
  }

  setHandler(handler) {
    this._handler = handler;
  }

  nest(node) {
    const idx = this.indexOf(node);
    if (idx < 0) {
      return;
    }
    // alert("NESTING" + idx);
    const list = new JSONList(this.server());
    this.insertBefore(list, node);
    this.removeChild(node);
    list.appendChild(node);
    list.setHandler(this);
    node.setHandler(list);
  }

  removeMe() {
    this._handler && this._handler.removeChild(this);
  }

  render() {
    const root = super.render();

    /*const ac = new ActionCarousel();
    ac.addAction("Delete", () => {
      this.removeMe();
    });
    ac.install(root);*/

    return root;
  }
}

class JSONCell extends TreeNode {
  constructor(server, val) {
    super(server);
    this._value = val;
  }

  setHandler(handler) {
    this._handler = handler;
  }

  createNewCell() {
    const n = new JSONCell(this.server(), "");
    n.setHandler(this._handler);
    return n;
  }

  insertJSONCell() {
    this._handler && this._handler.insertBefore(this.createNewCell(), this);
  }

  appendJSONCell() {
    this._handler && this._handler.insertAfter(this.createNewCell(), this);
  }

  removeMe() {
    this._handler && this._handler.removeChild(this);
  }

  editCell() {
    alert("Edit");
  }

  palette() {
    return this.server().state().palette();
  }

  createNode(val) {
    if (val === undefined) {
      const n = this.palette().spawn("u");
      n.value().setLabel("undefined");
      return n;
    }
    if (val === null) {
      const n = this.palette().spawn("u");
      n.value().setLabel("null");
      return n;
    }
    if (typeof val === "number" && isNaN(val)) {
      const n = this.palette().spawn("u");
      n.value().setLabel("NaN");
      return n;
    }
    if (typeof val === "string") {
      const n = this.palette().spawn("b");
      n.value().setLabel(val);
      return n;
    }
    if (typeof val === "number") {
      const n = this.palette().spawn("s");
      n.value().setLabel(val);
      return n;
    }
    if (typeof val === "boolean") {
      const n = this.palette().spawn("u");
      n.value().setLabel(val);
      return n;
    }
    if (typeof val === "function") {
      const n = this.palette().spawn("u");
      n.value().setLabel("Function");
      return n;
    }
    if (typeof val === "object") {
      const car = new ParsegraphCaret(this.server(), "s", this.palette());

      const childNames = Object.keys(val).filter(
        (key) => !key.startsWith("@_")
      );
      childNames.forEach((key, i) => {
        car.spawnMove(i == 0 ? "i" : "d", "b");
        car.push();
        car.label(key.toString());

        const childVal = val[key];
        if (Array.isArray(childVal)) {
          const list = new JSONList(this.server());
          graphWithNewlines(this.server(), list, childVal);
          car.connect("f", list.root());
        } else if (typeof childVal === "object") {
          const attrKeys = Object.keys(childVal).filter((key) =>
            key.startsWith("@_")
          );
          if (attrKeys.length > 0) {
            car.push();
            attrKeys.forEach((key, i) => {
              car.spawnMove(i == 0 ? "i" : "d", "b");
              car.label(key.substring(1));
              car.connect(
                "f",
                new JSONCell(this.server(), childVal[key]).root()
              );
            });
            car.pop();
          }
          car.connect("f", new JSONCell(this.server(), childVal).root());
        } else {
          car.connect("f", new JSONCell(this.server(), childVal).root());
        }
        car.pop();
      });

      return car.root();
    }
  }

  render() {
    return this.createNode(this._value);
  }
}

class JSONGraph extends TreeNode {
  constructor(server) {
    super(server);
    this._title = new BlockTreeNode(server, "b");
    this._title.setLabel("JSON");

    this._tree = new JSONList(server);
  }

  clear() {
    this._tree.clear();
  }

  parse(text) {
    if (this._oldText === text) {
      return;
    }
    console.log("PArsing JSON ", text);
    this._text = text;
    this.setValue(JSON.parse(this._text));
    this._oldText = this._text;
  }

  setValue(val) {
    if (this._value === val) {
      return;
    }
    this._value = val;
    console.log("SEtting JSON value", val);
    this.invalidate();
  }

  render() {
    this._tree.clear();
    graphWithNewlines(this.server(), this._tree, this._value);
    const treeRoot = this._tree.root();
    const root = this._title.root();
    root.connectNode(Direction.FORWARD, treeRoot);
    return root;
  }
}

module.exports = { JSONGraph };
