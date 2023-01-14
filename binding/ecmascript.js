const { BlockTreeNode } = require("./treenode/BlockTreeNode");
const { BasicTreeList } = require("./treenode/BasicTreeList");
const { parseScript } = require("esprima");
const { Direction } = require("./direction");
const { TreeNode } = require("./treenode/TreeNode");
const { ParsegraphCaret } = require("./ParsegraphCaret");
const { ConstantTreeNode } = require("./treenode/ConstantTreeNode");

class ECMAList extends BasicTreeList {
  constructor(server, children) {
    super(server, new BlockTreeNode(server, "u"), children, true);
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
    const list = new ECMAList(this.server());
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

class ECMACellNode extends TreeNode {
  constructor(server, val) {
    super(server);
    this._value = val;
  }

  setHandler(handler) {
    this._handler = handler;
  }

  createNewCell() {
    const n = new ECMACellNode(this.server(), "");
    n.setHandler(this._handler);
    return n;
  }

  insertECMACell() {
    this._handler && this._handler.insertBefore(this.createNewCell(), this);
  }

  appendECMACell() {
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

  renderAssignmentExpression(val) {
    const car = new ParsegraphCaret(this.server(), "s", this.palette());
    car.connect("i", this.renderNode(val.left));
    car.spawnMove("f", "u");
    car.label(val.operator);
    car.connect("f", this.renderNode(val.right));
    return car.root();
  }

  renderExpressionStatement(val) {
    return this.renderNode(val.expression);
  }

  renderFunctionDeclaration(val) {
    const car = new ParsegraphCaret(this.server(), "u", this.palette());
    car.label("function");
    car.push();
    car.spawnMove("f", "s");
    car.label(val.id?.name);
    val.params.forEach((param, i) => {
      car.spawnMove(i === 0 ? "i" : "f", "b");
      car.label(param?.name);
    });
    car.pop();
    val?.body?.body?.forEach((stmt, i) => {
      car.spawnMove("d", "u");
      const c = new ECMACellNode(this.server(), stmt);
      car.connect("f", c.root());
    });
    return car.root();
  }

  renderMemberExpression(val) {
    const car = new ParsegraphCaret(this.server(), "s", this.palette());
    car.connect("i", this.renderNode(val.object));
    car.connect("d", this.renderNode(val.property));
    return car.root();
  }

  renderNode(val) {
    const func = this["render" + val.type];
    if (func) {
      return func.call(this, val);
    }
    const n = this.palette().spawn("b");
    n.value().setLabel(JSON.stringify(val));
    return n;
  }

  renderThisExpression(val) {
    const n = this.palette().spawn("u");
    n.value().setLabel("this");
    return n;
  }

  renderCallExpression(val) {
    const car = new ParsegraphCaret(this.server(), "s", this.palette());
    car.connect("i", this.renderNode(val.callee));
    car.spawnMove("d", "s");
    val.arguments.forEach((arg, i) => {
      car.spawnMove(i === 0 ? "i" : "f", "s");
      car.connect("i", this.renderNode(arg));
    });
    return car.root();
  }

  renderLiteral(val) {
    const car = new ParsegraphCaret(this.server(), "b", this.palette());
    car.label(val.value.toString());
    return car.root();
  }

  renderBinaryExpression(val) {
    const car = new ParsegraphCaret(this.server(), "s", this.palette());
    car.connect("i", this.renderNode(val.left));
    car.spawnMove("f", "u");
    car.label(val.operator);
    car.connect("f", this.renderNode(val.right));
    return car.root();
  }

  renderVariableDeclaration(val) {
    const list = new BasicTreeList(
      this.server(),
      new BlockTreeNode(this.server(), "b"),
      val.declarations.map((decl) => {
        return new ConstantTreeNode(this.server(), () => this.renderNode(decl));
      })
    );
    return list.root();
  }

  renderFunctionExpression(val) {
    const car = new ParsegraphCaret(this.server(), "u", this.palette());
    car.label("function");
    car.spawnMove("f", "s");
    val.params.forEach((param, i) => {
      car.spawnMove(i === 0 ? "i" : "f", this.renderNode(param));
    });
    return car.root();
  }

  renderVariableDeclarator(val) {
    const car = new ParsegraphCaret(this.server(), "u", this.palette());
    car.label("function");
    car.spawnMove("f", "s");
    car.connect("i", this.renderNode(val.id));
    car.spawnMove("f", this.renderNode(val.init));
    return car.root();
  }

  renderEmptyStatement(val) {
    return this.palette().spawn("u");
  }

  renderUnaryExpression(val) {
    const car = new ParsegraphCaret(this.server(), "u", this.palette());
    car.label(val.operator);
    car.connect("f", this.renderNode(val.argument));
    return car.root();
  }

  renderNewExpression(val) {
    const car = new ParsegraphCaret(this.server(), "s", this.palette());
    car.label("new");
    car.connect("i", this.renderNode(val.callee));
    car.spawnMove("d", "s");
    val.arguments.forEach((arg, i) => {
      car.spawnMove(i === 0 ? "i" : "f", "s");
      car.connect("i", this.renderNode(arg));
    });
    return car.root();
  }

  renderIdentifier(val) {
    const n = this.palette().spawn("b");
    n.value().setLabel(val.name);
    return n;
  }

  render() {
    return this.renderNode(this._value);
  }
}

class ECMAScriptGraph extends TreeNode {
  constructor(server) {
    super(server);
    this._title = new BlockTreeNode(server);
    this._title.setLabel("ECMA");

    this._tree = new ECMAList(server);
  }

  graph(root, val) {
    if (!val) {
      return;
    }
    val.body.forEach((child) => {
      root.appendChild(new ECMACellNode(this.server(), child));
    });
  }

  parse(text) {
    this._oldText = this._text;
    this._text = text;
    this.invalidate();
  }

  render() {
    if (this._oldText !== this._text) {
      this._tree.clear();
      const value = parseScript(this._text);
      this.graph(this._tree, value);
      this._oldText = this._text;
    }
    const treeRoot = this._tree.root();
    const root = this._title.root();
    root.connectNode(Direction.FORWARD, treeRoot);
    return root;
  }
}

module.exports = { ECMAScriptGraph };
