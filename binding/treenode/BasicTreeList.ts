import { PaintedNode } from "parsegraph-artist";
import { BlockPalette, DefaultBlockPalette } from "parsegraph-block";
import Direction, {
  PreferredAxis,
  turnPositive,
  getDirectionAxis,
  Axis,
  Alignment,
  SHRINK_SCALE,
} from "parsegraph-direction";
import TreeNode from "./TreeNode";
import AbstractTreeList from "./AbstractTreeList";

export default class BasicTreeList extends AbstractTreeList {
  _lastRow: PaintedNode;
  _palette: BlockPalette;

  _direction: Direction;
  _align: Alignment;

  /**
   * Creates a new BasicTreeList in the forward direction with no alignment.
   *
   * @param {TreeNode} title The root node of this tree list.
   * @param {TreeNode[]} children The initial children of this tree list.
   * @param {BlockPalette} palette The palette to use to construct joining buds.
   */
  constructor(
    title: TreeNode,
    children: TreeNode[],
    palette: BlockPalette = new DefaultBlockPalette()
  ) {
    super(title, children);
    if (!palette) {
      throw new Error("Palette must be given");
    }
    this._palette = palette;
    this._direction = Direction.FORWARD;
    this._align = Alignment.NONE;
  }

  setAlignment(align: Alignment) {
    this._align = align;
    this.invalidate();
  }

  setDirection(dir: Direction) {
    this._direction = dir;
    this.invalidate();
  }

  connectSpecial(): PaintedNode {
    return this._lastRow;
  }

  connectInitialChild(root: PaintedNode, child: PaintedNode): PaintedNode {
    root.connectNode(this._direction, child);
    root.setNodeAlignmentMode(this._direction, this._align);
    root.setLayoutPreference(
      getDirectionAxis(this._direction) === Axis.VERTICAL
        ? PreferredAxis.VERTICAL
        : PreferredAxis.HORIZONTAL
    );
    child.state().setScale(SHRINK_SCALE);
    this._lastRow = root;
    return root;
  }

  connectChild(lastChild: PaintedNode, child: PaintedNode): PaintedNode {
    const bud = this._palette.spawn("u") as PaintedNode;
    lastChild.connectNode(turnPositive(this._direction), bud);
    bud.connectNode(this._direction, child);
    bud.setLayoutPreference(
      getDirectionAxis(this._direction) === Axis.VERTICAL
        ? PreferredAxis.VERTICAL
        : PreferredAxis.HORIZONTAL
    );
    this._lastRow = bud;
    return bud;
  }
}
