class ParsegraphClient {
  constructor(server, writer) {
    this._server = server;
    this._writer = writer;
  }

  send(...args) {
    this._writer(...args);
  }
}

module.exports = { ParsegraphClient };
