const bodyParser = require("body-parser");
const { ParsegraphServer } = require("../binding");
const needle = require("needle");

const makeGraph = (server, body) => {
  const car = server.state().newCaret("b");
  if (body.name !== "feed") {
    car.label("Body has no feed");
    return car.root();
  }
  let title = "Untitled Atom Feed";
  let subtitle = null;
  let entries = [];
  body.children.forEach((child) => {
    if (child.name === "title") {
      title = child.value;
    }
    if (child.name === "subtitle") {
      subtitle = child.value;
    }
    if (child.name === "entry") {
      entries.push(child);
    }
  });
  car.label(title);
  if (subtitle) {
    car.spawnMove("d", "b");
    car.label(subtitle);
  }
  car.spawnMove("d", "u");
  entries.forEach((entry) => {
    car.spawnMove("f", "u");
    car.push();
    let content = "";
    let entryTitle = "Untitled";
    entry.children.forEach((data) => {
      if (data.name === "title") {
        entryTitle = data.value;
      }
      if (data.name === "summary") {
        content = data.value;
      }
      if (data.name === "content" && !content) {
        content = data.value;
      }
    });
    if (entryTitle) {
      car.spawnMove("d", "b");
      car.label(entryTitle);
    }
    if (content) {
      car.spawnMove("d", "b");
      car.embed("<iframe>" + content + "</iframe>");
    }
    car.pop();
  });

  return car.root();
};

module.exports = (app) => {
  app.get(/\/feed\/?$/, (req, resp) => {
    const server = new ParsegraphServer();
    server.state().setBackgroundColor(64 / 255, 64 / 255, 109 / 255, 1);

    needle.get(
      req.query.q || "https://dafrito.wordpress.com/atom.xml",
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
          console.log("Failed to get feed: " + response.statusCode);
          resp.status(503);
          resp.end();
        }
      }
    );
  });
};
