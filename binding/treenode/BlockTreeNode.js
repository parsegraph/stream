const { TreeNode } = require("./TreeNode");

class BlockTreeNode extends TreeNode {
  constructor(server, nodeType, label, style) {
    super(server);
    this.palette();
    this._nodeType = nodeType;
    this._label = label;
    this._style = style;
    this.invalidate();
  }

  getType() {
    return this._nodeType;
  }

  setType(nodeType) {
    this._nodeType = nodeType;
    this.invalidate();
  }

  getLabel() {
    return this._label;
  }

  setLabel(label) {
    this._label = label;
    this.invalidate();
  }

  palette() {
    return this.server().state().palette();
  }

  render() {
    const root = this.palette().spawn(this.getType());
    if (this._label != null) {
      root.value().setLabel(this._label);
    }
    if (this._style) {
      root.value().setBlockStyle(this._style);
    }
    return root;
  }
}

module.exports = { BlockTreeNode };
