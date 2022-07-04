const {TreeNode} = require ('./TreeNode')

class ConstantTreeNode extends TreeNode {
constructor(server, node) {
  super(server);
  this._node = node;
}

render() {
  return typeof this._node === "function" ? this._node() : this._node;
}
}

module.exports = {ConstantTreeNode}
