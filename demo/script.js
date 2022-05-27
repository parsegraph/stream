const { ParsegraphServer } = require("./parsegraph");
const server = new ParsegraphServer();
const car = server.state().newCaret("u");
car.spawnMove("d", "b");
car.label("Hello, world");
module.exports = server;
