const { BlockTreeNode } = require("./BlockTreeNode");
const {AbstractTreeList} = require("./AbstractTreeList")
const { Direction, SHRINK_SCALE } = require("../direction");
const { TreeNode } = require("./TreeNode");

class InlineTreeList extends AbstractTreeList {
  constructor(title, children) {
    super(title, children);
  }

  connectInitialChild(root, child) {
    //child.crease();
    root.connectNode(Direction.INWARD, child);
    child.setScale(SHRINK_SCALE);
    return child;
  }

  connectChild(lastChild, child) {
    lastChild.connectNode(Direction.FORWARD, child);
    //child.crease();
    return child;
  }
}

module.exports = {InlineTreeList}
