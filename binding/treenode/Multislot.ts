import { Keystroke } from "parsegraph-input";
import { Alignment, Direction, PreferredAxis } from "parsegraph-direction";
import { BlockPalette, DefaultBlockPalette } from "parsegraph-block";
import { PaintedNode } from "parsegraph-artist";
import TreeNode from "./TreeNode";
import AbstractTreeList from "./AbstractTreeList";
import BlockTreeNode from "./BlockTreeNode";

// import ActionCarousel from "../ActionCarousel";

export default class Multislot extends AbstractTreeList {
  _lastRow: PaintedNode;
  _palette: DefaultBlockPalette;
  _callback: () => void;

  constructor(
    title: TreeNode,
    children: TreeNode[],
    palette: BlockPalette = new DefaultBlockPalette(),
    callback: () => void = () => {}
  ) {
    super(title, children);
    if (!palette) {
      throw new Error("Palette must be given");
    }
    this._palette = palette;
    this._callback = callback;
  }

  invalidate(): void {
    super.invalidate();
    console.log("Calling invalidate callback");
    this._callback && this._callback();
  }

  connectSpecial(): PaintedNode {
    return this._lastRow;
  }

  makeBud(value: TreeNode): PaintedNode {
    const bud = this._palette.spawn("u") as PaintedNode;
    bud
      .value()
      .interact()
      .setKeyListener((key: Keystroke) => {
        console.log(key);
        return true;
      });
    bud.setLayoutPreference(PreferredAxis.VERTICAL);
    /* const carousel = new ActionCarousel();
    carousel.addAction("Delete", () => {
      console.log("Deleting this node");
      this.removeChild(value);
    });
    carousel.addAction("Append", () => {
      console.log("Adding node");
      this.insertAfter(this.createNew(), value);
    });
    carousel.addAction("Insert", () => {
      console.log("Insert node");
      this.insertBefore(this.createNew(), value);
    });
    carousel.install(bud);*/
    return bud;
  }

  createNew(): TreeNode {
    return new BlockTreeNode("b", "Added");
  }

  makeFirstBud(value: TreeNode): PaintedNode {
    const bud = this.makeSmallBud();
    bud
      .value()
      .interact()
      .setClickListener(() => {
        this.insertBefore(this.createNew(), value);
      });
    return bud;
  }

  makeSmallBud(): PaintedNode {
    const bud = this._palette.spawn("u");
    /* bud.setBlockStyle({
      ...bud.blockStyle(),
      minWidth: BUD_RADIUS * 2,
      minHeight: BUD_RADIUS * 2,
      borderRoundness: BUD_RADIUS * 4,
      borderThickness: BUD_RADIUS * 2 * (2 / 3),
      horizontalPadding: 0,
      verticalPadding: 0,
    });*/
    return bud;
  }

  makeNextBud(value: TreeNode): PaintedNode {
    const bud = this.makeSmallBud();
    bud
      .value()
      .interact()
      .setClickListener(() => {
        this.insertAfter(this.createNew(), value);
      });
    return bud;
  }

  connectInitialChild(
    root: PaintedNode,
    child: PaintedNode,
    childValue: TreeNode
  ): PaintedNode {
    const bud = this.makeBud(childValue);
    root.connectNode(Direction.DOWNWARD, bud);
    root.setNodeAlignmentMode(Direction.DOWNWARD, Alignment.CENTER);
    bud.connectNode(Direction.DOWNWARD, child);
    const firstBud = this.makeFirstBud(childValue);
    bud.connectNode(Direction.BACKWARD, firstBud);
    const nextBud = this.makeNextBud(childValue);
    bud.connectNode(Direction.FORWARD, nextBud);
    this._lastRow = nextBud;
    return this._lastRow;
  }

  connectChild(
    lastChild: PaintedNode,
    child: PaintedNode,
    childValue: TreeNode
  ): PaintedNode {
    const bud = this.makeBud(childValue);
    lastChild.connectNode(Direction.FORWARD, bud);
    bud.connectNode(Direction.DOWNWARD, child);
    const nextBud = this.makeNextBud(childValue);
    bud.connectNode(Direction.FORWARD, nextBud);
    this._lastRow = nextBud;
    return this._lastRow;
  }
}
