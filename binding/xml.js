const { BlockTreeNode } = require("./treenode/BlockTreeNode");
const { WrappingTreeList } = require("./treenode/WrappingTreeList");
const { XMLParser } = require("fast-xml-parser");
const { Direction } = require("./direction");
const { TreeNode } = require("./treenode/TreeNode");
const { JSONGraph } = require("./json");

class XMLGraph extends TreeNode {
  constructor(server) {
    super(server);

    this._tree = new JSONGraph(server);
  }

  parse(text) {
    this._oldText = this._text;
    this._text = text;
    this.invalidate();
  }

  render() {
    if (this._oldText !== this._text) {
      this._tree.clear();

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
      });
      const children = parser.parse(this._text);
      this._tree.setValue(children);
      this._oldText = this._text;
    }
    return this._tree.root();
  }
}

module.exports = { XMLGraph };
