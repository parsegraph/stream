const { id } = require("./id");

class ParsegraphEmbed {
  constructor(server, node, html) {
    this._server = server;
    this._id = id();
    this._node = node;
    this._html = html;
    this.server().send("newEmbed", this.id(), this._node?.id(), html);
  }

  id() {
    return this._id;
  }

  html() {
    return this._html;
  }

  node() {
    return this._node;
  }

  assignNode(node) {
    this._node = node;
  }

  server() {
    return this._server;
  }

  setHtml(html) {
    this._html = html;
    this.server().send("setHtml", this.id(), html);
  }
}

module.exports = { ParsegraphEmbed };
