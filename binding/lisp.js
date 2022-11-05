const { BlockTreeNode } = require("./treenode/BlockTreeNode");
const { WrappingTreeList } = require("./treenode/WrappingTreeList");
const {
  parseTokens,
  tokenize,
  LispCell,
  LispType,
} = require("parsegraph-anthonylisp");
const { Direction } = require("./direction");
const { TreeNode } = require("./treenode/TreeNode");

class LispList extends WrappingTreeList {
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
    const list = new LispList(this.server());
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

class LispCellNode extends TreeNode {
  constructor(server, val, offset, len, subPath) {
    super(server);
    this._value = val;
    this._offset = offset;
    this._len = len;
    this._subPath = subPath;
  }

  setHandler(handler) {
    this._handler = handler;
  }

  createNewCell() {
    const n = new LispCellNode(this.server(), "");
    n.setHandler(this._handler);
    return n;
  }

  insertLispCell() {
    this._handler && this._handler.insertBefore(this.createNewCell(), this);
  }

  appendLispCell() {
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

  render() {
    const n = this.palette().spawn("b");
    n.textEdit(this._value, (newVal)=>{
      console.log("TEXT EDITED", newVal)
      this._value = newVal;
      this.invalidate()
    })

    /*const ac = new ActionCarousel();
    ac.addAction("Insert", () => {
      this.insertLispCell();
    });
    ac.addAction("Append", () => {
      this.appendLispCell();
    });
    ac.addAction("Edit", () => {
      ac.uninstall();
      n.realLabel().setEditable(true);
    });
    ac.addAction("Delete", () => {
      this.removeMe();
    });
    ac.install(n);

    n.setKeyListener((event: Keystroke) => {
      const key = event.key();
      if (key === "(") {
        this._handler && this._handler.nest(this);
        return;
      }
      if (key === " ") {
        this.insertLispCell();
        return;
      }
      if (key === "Shift") {
        return false;
      }
      if (key === "Backspace") {
        this._value = this._value.substring(0, this._value.length - 1);
        this.invalidate();
        return;
      }
      this._value += key;
      this.invalidate();
      return true;
    });
  */
    return n;
  }
}

class LispGraph extends TreeNode {
  constructor(server) {
    super(server);
    this._title = new BlockTreeNode(server, "b");
    this._title.setLabel("Lisp");

    this._tree = new LispList(server);
    this._tree.setParent(this);
  }

  graphWithNewlines(root, list) {
    list.forEach((child) => {
      if (child.newLined) {
        root.appendChild(root.getNewline());
      }
      if (child.type === LispType.List) {
        const list = new LispList(this.server());
        this.graphWithNewlines(list, child.list);
        root.appendChild(list);
      } else {
        const cell = new LispCellNode(
          this.server(),
          child.val,
          child.offset() - 1,
          child.len(),
          this._subPath
        );
        root.appendChild(cell);
        cell.setHandler(root);
      }
    });
  }

  parse(text, subPath) {
    if (!text.match(/^\(/)) {
      text = "(" + text + ")";
    }
    this._oldText = this._text;
    this._text = text;
    this._subPath = subPath;
    this.invalidate();
  }

  render() {
    if (this._oldText !== this._text) {
      this._tree.clear();
      const children = parseTokens(tokenize(this._text));
      this.graphWithNewlines(this._tree, children.list);
      this._oldText = this._text;
    }
    const treeRoot = this._tree.root();
    const root = this._title.root();
    root.connectNode(Direction.FORWARD, treeRoot);
    return root;
  }
}

module.exports = { LispGraph };
