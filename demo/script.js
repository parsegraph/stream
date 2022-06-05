const { ParsegraphServer } = require("./parsegraph");
const { readdirSync } = require("fs");
const server = new ParsegraphServer();

const makeTimer = (server)=>{
  const car = server.state().newCaret("u");
  car.spawn("f", "u");
  car.spawn("b", "u");
  car.spawnMove("d", "b");
  server.state().setRoot(car.root());
}

const { statSync, readFileSync, watch} = require("fs");
const { join} = require("path");

const makeTree = (server, rootPath, depth)=>{
  const car = server.state().newCaret("u");
  readdirSync(rootPath, {
    "withFileTypes": true
  }).forEach(e=>{
    car.spawnMove('f', 'u');
    car.push();
    car.pull('d');
    car.spawnMove('d', 'b');
    car.label(e.name);
    const fullPath = join(rootPath, e.name);
    if (e.isDirectory() && depth > 0) {
      car.connect('d', makeTree(server, fullPath, depth - 1).root());
    } else if (e.isFile()) {
      const stats = statSync(fullPath, {throwIfNoEntry:false});
      if (!stats) {
        return;
      }
      car.label(e.name + " " + stats.size);
      car.act("/testroute", {
        method: "POST",
        body: JSON.stringify({
          path:fullPath,
          text:readFileSync(fullPath).toString()
        })
      });
    }
    car.pop();
  });
  return car;
};


const mainPath = "../src";

const refresh = ()=>{
  server.state().setRoot(makeTree(server, mainPath, 2).root());
}

watch(mainPath, null, refresh);
refresh();

module.exports = server;
