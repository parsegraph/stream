const {
  Direction,
  PreferredAxis,
  turnPositive,
  getDirectionAxis,
  Axis,
  Alignment,
  SHRINK_SCALE,
} = require("../direction");
const { AbstractTreeList } = require("./AbstractTreeList");

class BasicTreeList extends AbstractTreeList {
  /**
   * Creates a new BasicTreeList in the forward direction with no alignment.
   *
   * @param {TreeNode} title The root node of this tree list.
   * @param {TreeNode[]} children The initial children of this tree list.
   * @param {BlockPalette} palette The palette to use to construct joining buds.
   */
  constructor(server, title, children) {
    super(server, title, children);
    if (!this.palette()) {
      throw new Error("Palette must be defined");
    }
    this._direction = Direction.FORWARD;
    this._align = Alignment.NONE;
  }

  setAlignment(align) {
    this._align = align;
    this.invalidate();
  }

  setDirection(dir) {
    this._direction = dir;
    this.invalidate();
  }

  connectSpecial() {
    return this._lastRow;
  }

  connectInitialChild(root, child) {
    root.connectNode(this._direction, child);
    //root.setNodeAlignmentMode(this._direction, this._align);
    root.setLayoutPreference(
      getDirectionAxis(this._direction) === Axis.VERTICAL
        ? PreferredAxis.VERTICAL
        : PreferredAxis.HORIZONTAL
    );
    child.setScale(SHRINK_SCALE);
    this._lastRow = root;
    return root;
  }

  palette() {
    return this.server().state().palette();
  }

  connectChild(lastChild, child) {
    const bud = this.palette().spawn("u");
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

module.exports = { BasicTreeList };
