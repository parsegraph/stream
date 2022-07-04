const { id } = require("./id");

class ParsegraphBlock {
  constructor(server, node, style, artist) {
    this._server = server;
    this._id = id();
    this._node = node;
    this._style = style;
    this._artist = artist;
    this._text = "";
    this.server().send(
      "newBlock",
      this.id(),
      this._node?.id(),
      style,
      artist?.id()
    );
  }

  artist() {
    return this._artist;
  }

  id() {
    return this._id;
  }

  blockStyle() {
    return this._style;
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

  setLabel(text) {
    this._text = text;
    this.server().send("setLabel", this.id(), text);
  }

  setBlockStyle(style) {
    this._style = style;
    this.server().send("setBlockStyle", this.id(), style);
  }
}

module.exports = { ParsegraphBlock };
