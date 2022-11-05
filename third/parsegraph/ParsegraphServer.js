const { ParsegraphServerState } = require("./ParsegraphServerState");
const { ParsegraphClient } = require("./ParsegraphClient");

class ParsegraphServer {
  constructor(artist) {
    this._clients = [];
    this._messages = [];
    this._callbacks = [];
    this._state = new ParsegraphServerState(this, artist);
  }

  setCallbackUrl(url) {
    this.send("setCallbackUrl", url)
  }

  addCallback(cb) {
    console.log(new Error("Adding callback third"))
    this._callbacks.push(cb);
    return this._callbacks.length - 1;
  }

  scheduleUpdate() {
    this.send("scheduleUpdate")
  }

  callback(callbackId) {
    console.log("Making callback third", callbackId, this._callbacks)
    this._callbacks[callbackId]();
  }

  connect(writer) {
    const client = new ParsegraphClient(this, writer);
    this._clients.push(client);
    console.log("Client connected", this._messages.length);
    this._messages.forEach((msg) => client.send(...msg));
    return () => {
      for (let i = 0; i < this._clients.length; ++i) {
        if (this._clients[i] === client) {
          this._clients.splice(i--, 1);
          break;
        }
      }
    };
  }

  forEach(cb) {
    this._messages.forEach((msg) => cb(...msg));
  }

  send(...args) {
    this._clients.forEach((client) => client.send(...args));
    this._messages.push(args);
  }

  state() {
    return this._state;
  }
}

module.exports = { ParsegraphServer };
