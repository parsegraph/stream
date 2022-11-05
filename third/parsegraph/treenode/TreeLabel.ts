import { PaintedNode } from "parsegraph-artist";
import { BlockCaret, DefaultBlockPalette } from "parsegraph-block";

import TreeNode from "./TreeNode";

export default class TreeLabel extends TreeNode {
  _label: string;
  _type: any;
  _palette: DefaultBlockPalette;

  constructor(type?: any, label?: string) {
    super();
    this._palette = new DefaultBlockPalette();
    this._type = type || "b";
    this._label = label || "";
  }
  getValue(): any {
    return this._label;
  }
  render(): PaintedNode {
    const car = new BlockCaret(this._type);
    car.label(this.getValue());
    return car.root() as PaintedNode;
  }
}
