import { PaintedNode } from "parsegraph-artist";
import Direction, { SHRINK_SCALE } from "parsegraph-direction";
import { DefaultBlockPalette, BlockPalette } from "parsegraph-block";
import TreeNode from "./TreeNode";
import AbstractTreeList from "./AbstractTreeList";

export class NewlineTreeNode extends TreeNode {
  render(): PaintedNode {
    return null;
  }
}

export const NEWLINE = new NewlineTreeNode();

export default class WrappingTreeList extends AbstractTreeList {
  _palette: BlockPalette;
  _putInside: boolean;
  _putFirstInside: boolean;
  _lastRow: PaintedNode;
  _shrinkNext: boolean;

  constructor(
    title: TreeNode,
    children: TreeNode[],
    palette: BlockPalette = new DefaultBlockPalette(),
    putInside: boolean = true
  ) {
    super(title, children);
    if (!palette) {
      throw new Error("Palette must be given");
    }
    this._palette = palette;
    this._putFirstInside = this._putInside = putInside;
  }

  getNewline(): TreeNode {
    return new NewlineTreeNode();
  }

  isNewline(node: TreeNode) {
    return node instanceof NewlineTreeNode;
  }

  palette(): BlockPalette {
    return this._palette;
  }

  checkChild(child: TreeNode) {
    if (this.isNewline(child)) {
      return;
    }
    super.checkChild(child);
  }

  connectSpecial(child: TreeNode): PaintedNode {
    if (!this.isNewline(child)) {
      return super.connectSpecial(child);
    }
    const bud = this._palette.spawn("u") as PaintedNode;
    this._lastRow.connectNode(Direction.DOWNWARD, bud);
    this.nodeConnected(child, bud);
    this._lastRow = bud;
    this._shrinkNext = true;
    return bud;
  }

  nodeConnected(child: TreeNode, childRoot: PaintedNode): void {
    console.log("node connected", child, childRoot);
  }

  connectInitialChild(
    root: PaintedNode,
    child: PaintedNode,
    childValue: TreeNode
  ): PaintedNode {
    this._lastRow = child;
    this._putInside = this._putFirstInside;
    this._shrinkNext = false;
    this.connectChild(root, child, childValue);
    this.nodeConnected(childValue, child);
    return child;
  }

  connectChild(
    lastChild: PaintedNode,
    child: PaintedNode,
    childValue: TreeNode
  ): PaintedNode {
    const dir = this._putInside ? Direction.INWARD : Direction.FORWARD;
    lastChild.connectNode(dir, child);
    this.nodeConnected(childValue, child);
    if (this._putInside) {
      child.crease();
    }
    if (this._shrinkNext) {
      this._lastRow.nodeAt(dir).state().setScale(SHRINK_SCALE);
      this._shrinkNext = false;
    }
    this._putInside = false;
    child.disconnectNode(Direction.FORWARD);
    return child;
  }
}
