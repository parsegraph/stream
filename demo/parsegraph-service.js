const bodyParser = require("body-parser");
const { ParsegraphServer } = require("../binding");
const needle = require("needle");

const makeGraph = (server, body) => {
  const car = server.state().newCaret("u");
  car.label("localhost:15557");
  if (body.name !== "service") {
    car.label("XML Document is not a Atom Service Document");
    return car.root();
  }
  car.push();
  body.children
    .filter((child) => child.name === "workspace")
    .forEach((workspace, i) => {
      car.spawnMove(i == 0 ? "d" : "f", "u");
      car.spawnMove("d", "b");
      let title = "Workspace " + (i + 1);
      workspace.children
        .filter((child) => child.name === "atom:title")
        .forEach((child) => (title = child.value));
      car.label(title);
      car.push();
      workspace.children
        .filter((child) => child.name === "collection")
        .forEach((col, j) => {
          car.spawnMove(j == 0 ? "d" : "f", "u");
          car.include("d", col.attributes.href);
          car.move("u");
        });

      car.pop();
      car.move("u");
    });
  car.pop();
  return car.root();
};

module.exports = (app) => {
  app.get(/\/service\/?$/, (req, resp) => {
    const server = new ParsegraphServer();
    server.state().setBackgroundColor(64 / 255, 64 / 255, 109 / 255, 1);

    needle.get(
      req.query.q || "http://localhost:15557/parsegraph.xml",
      { follow_max: 5 },
      function (error, response) {
        if (!error && response.statusCode == 200) {
          resp.writeHead(200, {
            "Content-Type": "text/plain",
          });
          server.state().setRoot(makeGraph(server, response.body));
          server.forEach((...args) => {
            const line = JSON.stringify(args);
            resp.write("" + line.length);
            resp.write("\n");
            resp.write("" + line);
            resp.write("\n");
          });
          resp.end();
        } else {
          console.log("Failed to get service: " + error + response?.statusCode);
          resp.status(503);
          resp.end();
        }
      }
    );
  });
};
