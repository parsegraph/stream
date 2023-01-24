const { readdir, readFile } = require("fs/promises");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  ParsegraphServer,
  LispGraph,
  XMLGraph,
  JSONGraph,
  YAMLGraph,
  ECMAScriptGraph,
} = require("../binding");
const vm = require("node:vm");
const Reconciler = require("./reconciler");
const {
  parseTokens,
  tokenize,
  LispCell,
  LispType,
} = require("parsegraph-anthonylisp");

const makeTimer = (server) => {
  const car = server.state().newCaret("u");
  car.spawn("f", "u");
  car.spawn("b", "u");
  car.spawnMove("d", "b");
  server.state().setRoot(car.root());
};

const { lstatSync, statSync, watch } = require("fs");
const { join } = require("path");
const ts = require("typescript");

const serveFile = (server, mainPath, subPath) => {
  const car = server.state().newCaret("u");
  const fullPath = join(mainPath, subPath);
  car.link(join(subPath, ".."));
  car.spawnMove("d", "b");

  const stats = statSync(fullPath, { throwIfNoEntry: false });
  if (!stats) {
    return;
  }
  car.label(subPath);

  car.spawnMove("d", "b");
  const fileType = spawnSync("/usr/bin/file", [
    "-b",
    fullPath,
  ]).stdout.toString();
  car.label(fileType);

  car.stream("d", subPath);

  return car.root();
};

const makeTree = async (server, mainPath, subPath) => {
  const car = server.state().newCaret("u");
  const fullPath = join(mainPath, subPath);
  if (!subPath.endsWith("/")) {
    subPath += "/";
  }
  car.link(subPath + "..");
  car.spawnMove("d", "b");
  car.label(subPath);
  const paths = [];
  try {
    (
      await readdir(fullPath, {
        withFileTypes: true,
      })
    ).forEach((e) => {
      paths.push(e.name);
    });
  } catch (ex) {
    paths.push(ex ? ex.toString() : "");
  }

  let len = 0;
  car.spawnMove("d", "u");
  car.push();
  paths.forEach((path) => {
    if (++len > 2 * Math.sqrt(paths.length)) {
      len = 0;
      car.pop();
      car.spawnMove("d", "u");
      car.push();
      car.crease();
    }
    car.spawnMove("f", "u");
    car.push();
    car.spawnMove("d", "b");

    const s = server.state().copyStyle("b");
    try {
      const stats = lstatSync(join(fullPath, path), { throwIfNoEntry: false });
      if (!stats) {
        s.borderColor = "rgba(0.4, 0.4, 0.4, 0.6)";
        s.backgroundColor = `rgba(${255 / 255}, ${128 / 255}, ${128 / 255})`;
      } else if (stats.isSymbolicLink()) {
        s.borderColor = "rgba(0.4, 0.4, 0.4, 0.6)";
        s.backgroundColor = `rgba(${198 / 255}, ${255 / 255}, ${255 / 255})`;
      } else if (stats.isDirectory()) {
        s.borderColor = "rgba(0.4, 0.4, 0.4, 0.6)";
        s.backgroundColor = `rgba(${232 / 255}, ${232 / 255}, ${255 / 255})`;
      } else {
        s.borderColor = "rgba(0.4, 0.4, 0.4, 0.6)";
        s.backgroundColor = `rgba(${234 / 255}, ${221 / 255}, ${202 / 255})`;
      }
    } catch (ex) {
      s.borderColor = "rgba(0.4, 0.4, 0.4, 0.6)";
      s.backgroundColor = `rgba(${255 / 255}, ${128 / 255}, ${128 / 255})`;
    }

    car.node().value().setBlockStyle(s);
    car.pull("d");
    car.label(path);
    car.link(join(subPath, path));
    car.include("d", join(subPath, path));
    car.pop();
  });
  return car.root();
};

const reactParsegraph = async (server, content, fullPath, props) => {
  const options = {
    filename: fullPath,
    presets: [
      ["@babel/env", { modules: "auto" }],
      "@babel/typescript",
      "@babel/react",
    ],
  };
  const result = require("@babel/core").transformSync(content, options);
  const func = vm.runInThisContext(
    [
      "(function (exports, require, module, __filename, __dirname) { ",
      result.code,
      "});",
    ].join("\n"),
    {
      filename: fullPath,
      liveOffset: 1,
    }
  );
  const mod = { exports: {} };
  func(
    mod.exports,
    (name) => {
      if (name.startsWith(".")) {
        return require(fullPath + name);
      } else {
        return require(name);
      }
    },
    mod,
    fullPath,
    fullPath
  );
  const out =
    typeof mod.exports === "function" ? mod.exports : mod.exports.default;

  if (!out) {
    return;
  }

  await renderReactParsegraph(server, out, props);
};

const renderReactParsegraph = (server, out, props) => {
  return new Promise((resolve) => {
    //const container = Reconciler.createContainer(server, 0, false, null);
    const view = out(props);
    resolve();
    /*Reconciler.updateContainer(view, container, null, () => {
      resolve();
    });*/
  });
};

const buildStreamPath = async (server, mainPath, subPath) => {
  const fullPath = path.join(mainPath, subPath);
  const fileType = spawnSync("/usr/bin/file", ["-b", fullPath])
    .stdout.toString()
    .trim();
  if (fileType === "directory") {
    return servePath(mainPath, subPath);
  }

  if (fileType.startsWith("PNG image data")) {
    const car = server.state().newCaret("b");
    car.label("PNG");
    car.spawnMove("d", "b");
    car.embed(`${fullPath}`);
    server.state().setRoot(car.root());
    return;
  }

  const TS_EXTENSIONS = [".tsx", ".ts"];
  const JS_EXTENSIONS = [".js", ".jsx"];

  if (
    fullPath.endsWith(".parsegraph") ||
    JS_EXTENSIONS.some((ext) => fullPath.endsWith(".parsegraph" + ext)) ||
    TS_EXTENSIONS.some((ext) => fullPath.endsWith(".parsegraph" + ext))
  ) {
    const refresh = async () => {
      try {
        const fileContents = await readFile(fullPath);
        await reactParsegraph(server, fileContents, fullPath);
      } catch (ex) {
        console.log(ex);
      }
    };
    try {
      watch(fullPath, null, refresh);
      await refresh();
    } catch (ex) {
      console.log(ex);
    }
    return;
  }

  if (fullPath.endsWith(".yml") || fileType.includes("YAML")) {
    const graph = new YAMLGraph(server);
    const fileContents = await readFile(fullPath);
    graph.parse(fileContents.toString(), subPath);
    server.state().setRoot(graph.root());
    return;
  }

  if (
    fullPath.endsWith(".xml") ||
    fullPath.endsWith(".html") ||
    fileType.includes("XML 1.0 document")
  ) {
    const graph = new XMLGraph(server);
    const fileContents = await readFile(fullPath);
    graph.parse(fileContents.toString(), subPath);
    server.state().setRoot(graph.root());
    return;
  }

  if (TS_EXTENSIONS.some((ext) => fullPath.endsWith(ext))) {
    const car = server.state().newCaret("b");

    const program = require("typescript").createProgram([fullPath], {
      allowJs: true,
      jsx: "preserve",
    });
    const ast = program.getSourceFile(fullPath);

    car.label("TypeScript");
    car.spawnMove("d", "b");
    server.state().setRoot(car.root());
    return;
  }

  if (JS_EXTENSIONS.some((ext) => fullPath.endsWith(ext))) {
    const car = server.state().newCaret("b");
    const fileContents = await readFile(fullPath);
    const ast = require("espree").parse(fileContents, {
      ecmaVersion: "latest",
      sourceType: "module",
      ecmaFeatures: {
        jsx: true,
      },
    });

    car.label("Babel");
    car.spawnMove("d", "b");
    server.state().setRoot(car.root());
    return;
  }

  const parseType = async (parseType) => {
    const parser = __dirname + `/../parser/${parseType}.jsx`;
    const refresh = async () => {
      try {
        const parserSource = await readFile(parser);
        const fileContents = await readFile(fullPath);
        await reactParsegraph(server, parserSource, fullPath, {
          content: fileContents,
          name: subPath,
        });
      } catch (ex) {
        console.log("Exception during parse", ex);
      }
    };
    //watch(parser, null, refresh);
    //watch(fullPath, null, refresh);
    await refresh();
    return;
  };

  if (JS_EXTENSIONS.some((ext) => fullPath.endsWith(ext))) {
    await parseType("js");
    return;
  }

  if (fullPath.endsWith(".lisp")) {
    await parseType("lisp");
    return;
  }

  if (fileType.includes("ASCII text")) {
    await parseType("ascii-text");
    return;
  }

  if (fullPath.endsWith(".json") || fileType.includes("JSON")) {
    await parseType("json");
    return;
  }

  // Fallback
  const car = server.state().newCaret("b");
  car.label(fileType);
  car.spawnMove("d", "b");
  server.state().setRoot(car.root());
};

const streamPath = async (mainPath, subPath) => {
  const fullPath = subPath ? join(mainPath, subPath) : mainPath;
  const server = new ParsegraphServer();
  await buildStreamPath(server, mainPath, subPath);
  return server;
};

const servePath = async (mainPath, subPath) => {
  const server = new ParsegraphServer();
  server.state().setBackgroundColor(149 / 255, 149 / 255, 149 / 255, 1);

  while (subPath.endsWith("/")) {
    subPath = subPath.substring(0, subPath.length - 1);
  }

  const fullPath = join(mainPath, subPath);
  const refresh = async () => {
    let stats;
    try {
      stats = statSync(fullPath, { throwIfNoEntry: false });
    } catch (ex) {
      console.log("Exception during statSync", fullPath, ex);
      return;
    }
    if (!stats) {
      return;
    }
    if (stats.isDirectory()) {
      server.state().setRoot(await makeTree(server, mainPath, subPath));
    } else {
      //server.state().setRoot(serveFile(server, mainPath, subPath));
      await buildStreamPath(server, mainPath, subPath);
      //watch(fullPath, null, refresh);
    }
  };

  await refresh();
  return server;
};

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

    const bStyle = server.state().copyStyle("b");
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
  servePath,
  streamPath,
};
