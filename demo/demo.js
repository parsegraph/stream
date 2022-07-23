const glob = require("glob");
const express = require("express");
const app = express();
const { readFileSync, statSync } = require("fs");
const process = require("process");
const path = require("path");

const { DIST_NAME } = require("../webpack.common");

const getPort = (port) => {
  if (statSync("../demo.port")) {
    try {
      port = parseInt(readFileSync("../demo.port"));
    } catch (ex) {
      console.log(ex);
    }
  }
  if (process.env.SITE_PORT) {
    try {
      port = parseInt(process.env.SITE_PORT);
    } catch (ex) {
      // Suppress exception
      console.log("Exception parsing SITE_PORT: ", ex);
    }
  }
  const args = process.argv.slice(2);
  if (args.length > 0) {
    try {
      port = parseInt(args[0]);
    } catch (ex) {
      // Suppress exception
      console.log("Exception parsing site port from first argument: ", ex);
    }
  }
  return port;
};
const port = getPort(3000);

const getRootPath = () => {
  if (process.env.SITE_ROOT) {
    return process.env.SITE_ROOT;
  }
  return "";
};
const root = getRootPath();

const getContentRoot = () => {
  if (process.env.CONTENT_ROOT) {
    return process.env.CONTENT_ROOT;
  }
  return "/";
};

const { streamPath, servePath } = require("./script");
const bodyParser = require("body-parser");

app.post("/testroute", bodyParser.json(), (req, resp) => {
  console.log("Test route", req.body.path);
  resp.status(200).end("testroute from server");
});

const servers = {};
const streams = {};

app.get(/^\/parsegraph\/(.*)$/, (req, resp) => {
  resp.writeHead(200, {
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
  });
  const mainPath = getContentRoot();
  const subPath = req.url.substring("/parsegraph/".length).replaceAll(/\/+$/g, '')
  console.log("EventSource", req.url, subPath);
  if (!streams[subPath]) {
    streams[subPath] = streamPath(mainPath, subPath);
  }
  const stream = streams[subPath];
  const remover = stream.connect((...args) => {
    resp.write(`data: ${JSON.stringify(args)}\n\n`);
  });
  req.on("close", remover);
});

app.get(/\/raw\/?(.*)$/, (req, resp) => {
  const mainPath = getContentRoot();
  const subPath = req.url.substring("/raw/".length);
  resp.sendFile(path.join(mainPath, subPath), {
    root: mainPath,
  });
});

app.get(/\/events\/?(.*)$/, (req, resp) => {
  resp.writeHead(200, {
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
  });
  const mainPath = getContentRoot();
  const subPath = req.url.substring("/events/".length);
  console.log(subPath);
  if (!servers[subPath]) {
    servers[subPath] = servePath(mainPath, subPath);
  }
  const server = servers[subPath];
  const remover = server.connect((...args) => {
    resp.write(`data: ${JSON.stringify(args)}\n\n`);
  });
  req.on("close", remover);
});

app.get(/\/graph\/?(.*)$/, (req, resp) => {
  resp.writeHead(200, {
    "Content-Type": "text/plain",
  });
  const mainPath = getContentRoot();
  const subPath = req.url.substring("/graph/".length);
  if (!servers[subPath]) {
    servers[subPath] = servePath(mainPath, subPath);
  }
  const server = servers[subPath];
  console.log("Serving", subPath);
  const remover = server.forEach((...args) => {
    const line = JSON.stringify(args);
    resp.write("" + line.length);
    resp.write("\n");
    resp.write("" + line);
    resp.write("\n");
  });
  resp.end();
});

app.use(root, express.static("../dist"));
app.use(root, express.static("../www"));

app.get(/(.*)$/, async (req, res) => {
  res.sendFile(path.resolve(process.cwd() + "/../www/demo.html"));
});

app.listen(port, () => {
  console.log(
    `See ${DIST_NAME} build information at http://localhost:${port}${root}`
  );
});
