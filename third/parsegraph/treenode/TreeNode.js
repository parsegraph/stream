const { PaintedNode } = require("parsegraph-artist");

class TreeNode {
  constructor(server) {
    this._server = server;
    this._needsUpdate = true;
    this._root = null;
  }

  server() {
    return this._server;
  }

  render() {
    return null;
  }

  root() {
    if (this.needsUpdate()) {
      this._root = this.render();
      this._needsUpdate = false;
    }
    return this._root;
  }

  invalidate() {
    if (this.needsUpdate()) {
      return;
    }
    this._needsUpdate = true;
  }

  needsUpdate() {
    return this._needsUpdate;
  }
}

module.exports = { TreeNode };
