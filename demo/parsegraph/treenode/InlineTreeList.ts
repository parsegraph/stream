import { PaintedNode } from "parsegraph-artist";
import Direction, { SHRINK_SCALE } from "parsegraph-direction";
import TreeNode from "./TreeNode";
import AbstractTreeList from "./AbstractTreeList";

export default class InlineTreeList extends AbstractTreeList {
  constructor(title: TreeNode, children: TreeNode[]) {
    super(title, children);
  }

  connectInitialChild(root: PaintedNode, child: PaintedNode): PaintedNode {
    child.crease();
    root.connectNode(Direction.INWARD, child);
    child.state().setScale(SHRINK_SCALE);
    return child;
  }

  connectChild(lastChild: PaintedNode, child: PaintedNode): PaintedNode {
    lastChild.connectNode(Direction.FORWARD, child);
    child.crease();
    return child;
  }
}
