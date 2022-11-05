import { DefaultBlockPalette } from "parsegraph-block";
import { PaintedNode } from "parsegraph-artist";
import TreeNode from "./TreeNode";

export default class BlockTreeNode extends TreeNode {
  _label: string;
  _nodeType: any;
  _palette: DefaultBlockPalette;
  _style: any;

  constructor(nodeType?: any, label?: string, style?: any) {
    super();
    this._palette = new DefaultBlockPalette();
    this._nodeType = nodeType;
    this._label = label;
    this._style = style;
    this.invalidate();
  }

  getType(): any {
    return this._nodeType;
  }
  setType(nodeType: any) {
    this._nodeType = nodeType;
    this.invalidate();
  }
  getLabel(): any {
    return this._label;
  }
  setLabel(label: string) {
    this._label = label;
    this.invalidate();
  }

  render(): PaintedNode {
    const root = this._palette.spawn(this.getType());
    if (this._label != null) {
      root.value().setLabel(this._label);
    }
    if (this._style) {
      root.value().setBlockStyle(this._style);
    }
    return root;
  }
}
