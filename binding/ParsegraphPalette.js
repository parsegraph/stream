const { ParsegraphNode } = require("./ParsegraphNode");

class ParsegraphPalette {
  constructor(server, builder) {
    this._server = server;
    this._builder = builder;
  }

  server() {
    return this._server;
  }

  spawn(given) {
    const node = new ParsegraphNode(this.server());
    this.replace(node, given);
    return node;
  }

  replace(node, given) {
    node.setValue(this._builder(given));
  }
}

module.exports = { ParsegraphPalette };
