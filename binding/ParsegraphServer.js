const { ParsegraphServerState } = require("./ParsegraphServerState");
const { ParsegraphClient } = require("./ParsegraphClient");

class ParsegraphServer {
  constructor(artist) {
    this._clients = [];
    this._messages = [];
    this._callbacks = [];
    this._state = new ParsegraphServerState(this, artist);
  }

  scheduleUpdate() {
    this.send("scheduleUpdate");
  }

  setCallbackUrl(url) {
    this.send("setCallbackUrl", url);
  }

  addCallback(cb) {
    this._callbacks.push(cb);
    const callbackId = this._callbacks.length - 1;
    return callbackId;
  }

  callback(callbackId, val) {
    if (!this._callbacks[callbackId]) {
      console.log(`No callback with id ${callbackId}`)
      return;
    }
    this._callbacks[callbackId](val);
  }

  connect(writer) {
    const client = new ParsegraphClient(this, writer);
    this._clients.push(client);
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
