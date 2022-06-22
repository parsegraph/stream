const { ParsegraphServer } = require("./parsegraph");
const { readdirSync } = require("fs");
const { spawnSync } = require("child_process");

const makeTimer = (server) => {
  const car = server.state().newCaret("u");
  car.spawn("f", "u");
  car.spawn("b", "u");
  car.spawnMove("d", "b");
  server.state().setRoot(car.root());
};

const { statSync, readFileSync, watch } = require("fs");
const { join } = require("path");

const makeFile = (server, mainPath, subPath) => {
  const car = server.state().newCaret("u");
  const fullPath = join(mainPath, subPath);
  if (!subPath.endsWith("/")) {
    subPath += "/";
  }
  car.link(subPath + "..");
  car.spawnMove('d', 'b');

  const stats = statSync(fullPath, { throwIfNoEntry: false });
  if (!stats) {
    return;
  }
  car.label(subPath);

  car.spawnMove('d', 'b');
  const fileType = spawnSync("/usr/bin/file", ["-b", fullPath]).stdout.toString();
  car.label(fileType);
  return car.root();
}

const makeTree = (server, mainPath, subPath) => {
  const car = server.state().newCaret("u");
  const fullPath = join(mainPath, subPath);
  if (!subPath.endsWith("/")) {
    subPath += "/";
  }
  car.link(subPath + "..");
  car.spawnMove('d', 'b');
  car.label(subPath);
  const paths = [];
  readdirSync(fullPath, {
    withFileTypes: true,
  }).forEach((e) => {
    paths.push(e.name);
  });

  let len = 0;
  car.spawnMove('d', 'u');
  car.push();
  paths.forEach(path=>{
    if (++len > Math.sqrt(paths.length)) {
      len = 0;
      car.pop();
      car.spawnMove('d', 'u');
      car.push();
      car.crease();
    }
    car.spawnMove("f", "u");
    car.push();
    car.spawnMove("d", "b");
    car.pull("d");
    car.label(path);
    car.link(join(subPath, path))
    car.pop();
  });
  return car.root();
};

const servePath = (mainPath, subPath)=>{
  const server = new ParsegraphServer();

  while (subPath.endsWith('/')) {
    subPath = subPath.substring(0, subPath.length - 1);
  }

  const fullPath = join(mainPath, subPath);
  const refresh = () => {
    const stats = statSync(fullPath, { throwIfNoEntry: false });
    if (!stats) {
      return;
    }
    if (stats.isDirectory()) {
      server.state().setRoot(makeTree(server, mainPath, subPath));
    } else {
      server.state().setRoot(makeFile(server, mainPath, subPath));
      //watch(fullPath, null, refresh);
    }
  };

  refresh();
  return server;
}

const buildGraph = (server) => {
  const car = server.state().newCaret("u");

  const root = car.root();

  const dirs = [
    Direction.FORWARD,
    Direction.DOWNWARD,
    Direction.INWARD,
    Direction.UPWARD,
    Direction.BACKWARD,
  ];
  for (let i = 0; i < 20; ++i) {
    let dir = null;
    while (dir === null || car.has(dir)) {
      dir = dirs[Math.floor(Math.random() * dirs.length)];
    }
    car.spawn(dir, "b");
    car.label("No time");
    car.carousel(["Edit", `/edit/${i}`]);

    const editLabel = car.palette().spawn("b");
    editLabel.value().setLabel("Edit");

    const bStyle = copyStyle("b");
    bStyle.backgroundColor = "rgba(1, 1, 1, 1)";
    editLabel.value().setBlockStyle(bStyle);

    ac.addAction(editLabel, () => {
      alert("Showing editor");
      carousel.hideCarousel();
      carousel.scheduleCarouselRepaint();
    });
    ac.install(car.node());
    car.pull(dir);
    car.move(dir);
  }
  return root;
};

module.exports = {
  servePath
}
