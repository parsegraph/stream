const { id } = require("./id");

class ParsegraphBlockStyle {
  constructor(server, initialStyle) {
    this._server = server;
    this._id = id();
    this._style = initialStyle;
    this.server().send("newBlockStyle", this._id, this._style);
  }

  server() {
    return this._server;
  }

  value() {
    return this._style;
  }

  setValue(newStyle) {
    this._style = newStyle;
    this.server().send("setStyleValue", this._id, this._style);
  }

  id() {
    return this._id;
  }
}

module.exports = { ParsegraphBlockStyle };
