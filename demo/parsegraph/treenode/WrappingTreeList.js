const { Direction, SHRINK_SCALE } = require("../direction");
const { TreeNode } = require("./TreeNode");
const { AbstractTreeList } = require("./AbstractTreeList");

class NewlineTreeNode extends TreeNode {
  render() {
    return null;
  }
}

const NEWLINE = new NewlineTreeNode();

class WrappingTreeList extends AbstractTreeList {
  constructor(server, title, children, putInside = true) {
    super(server, title, children);
    this._putFirstInside = this._putInside = putInside;
  }

  getNewline() {
    return new NewlineTreeNode();
  }

  appendNewline() {
    return this.appendChild(this.getNewline());
  }

  isNewline(node) {
    return node instanceof NewlineTreeNode;
  }

  palette() {
    return this.server().state().palette();
  }

  checkChild(child) {
    if (this.isNewline(child)) {
      return;
    }
    super.checkChild(child);
  }

  connectSpecial(child) {
    if (!this.isNewline(child)) {
      return super.connectSpecial(child);
    }
    const bud = this.palette().spawn("u");
    if (this._lastRow) {
      this._lastRow.connectNode(Direction.DOWNWARD, bud);
    } else {
      this._title.root().connectNode(Direction.DOWNWARD, bud);
    }
    this.nodeConnected(child, bud);
    this._lastRow = bud;
    this._shrinkNext = true;
    return bud;
  }

  nodeConnected(child, childRoot) {
    //console.log("node connected", child, childRoot);
  }

  connectInitialChild(root, child, childValue) {
    this._lastRow = child;
    this._putInside = this._putFirstInside;
    this._shrinkNext = false;
    this.connectChild(root, child, childValue);
    this.nodeConnected(childValue, child);
    return child;
  }

  connectChild(lastChild, child, childValue) {
    const dir = this._putInside ? Direction.INWARD : Direction.FORWARD;
    lastChild.connectNode(dir, child);
    this.nodeConnected(childValue, child);
    if (this._putInside) {
      //child.crease();
    }
    if (this._shrinkNext) {
      this._lastRow.nodeAt(dir).setScale(SHRINK_SCALE);
      this._shrinkNext = false;
    }
    this._putInside = false;
    child.disconnectNode(Direction.FORWARD);
    return child;
  }
}

module.exports = { WrappingTreeList, NewlineTreeNode };
