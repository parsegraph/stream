const glob = require("glob");
const express = require("express");
const app = express();
const { writeFileSync, readFileSync, statSync } = require("fs");
const process = require("process");
const path = require("path");

const { DIST_NAME } = require("../webpack.common");

const getPort = (port) => {
  try {
    if (statSync("../demo.port")) {
      port = parseInt(readFileSync("../demo.port"));
    }
  } catch (ex) {
    console.log(ex);
  }
  if (process.env.SITE_PORT) {
    try {
      port = parseInt(process.env.SITE_PORT);
      if (isNaN(port)) {
        port = process.env.SITE_PORT;
      }
    } catch (ex) {
      // Suppress exception
      console.log("Exception parsing SITE_PORT: ", ex);
      port = process.env.SITE_PORT;
      return port;
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

require("./parsegraph-service")(app, getContentRoot());
require("./parsegraph-feed")(app, getContentRoot());
require("./parsegraph")(app, getContentRoot());

const { gzip } = require("node-gzip");

app.get(/^\/parsegraph\-([a-z]+)\.js$/, async (req, res) => {
  const parsegraphPath = /^\/parsegraph\-([a-z]+)\.js$/.exec(req.url);
  const moduleName = parsegraphPath[1];
  if (!moduleName) {
    res.status(404).end();
    return;
  }
  const data = await gzip(
    readFileSync(
      path.resolve(
        process.cwd() +
          `/../node_modules/parsegraph-${moduleName}/dist/src/index.js`
      )
    )
  );
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Content-Encoding", "gzip");
  res.end(data);
});

app.get(/^\/login\/?$/, async (req, res) => {
  console.log("Getting login");
  res.setHeader("Content-Type", "text/html");
  res.end(
    "<html><head></head><body style='margin: 0; padding: 0; display: flex; align-items: center; flex-direction: column; height: 100%; justify-content: center'><main id='main' style='display: inline-block;'><input type='text'></input><input type='button' value='Log in'></input></main><script>document.addEventListener('DOMContentLoaded', () => { const elem = document.getElementById('main'); new ResizeObserver(()=>{window.parsegraphResize(elem.clientWidth, elem.clientHeight)}).observe(elem) })</script></body></html>"
  );
});

app.get(/^\/demo\.js$/, async (req, res) => {
  const data = await gzip(
    readFileSync(path.resolve(process.cwd() + `/../dist/src/demo.js`))
  );
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Content-Encoding", "gzip");
  res.end(data);
});

app.use(root, express.static("../www"));
app.use(root, express.static("../dist/src"));
app.use(root, express.static("../dist"));

app.get(/(.*)$/, async (req, res) => {
  res.sendFile(path.resolve(process.cwd() + "/../www/demo.html"));
});

const host = process.env.SITE_HOST || "localhost";
app.listen(port, host, 0, () => {
  if (typeof port === "number") {
    console.log(
      `See ${DIST_NAME} build information at http://${host}:${port}${root}`
    );
  } else {
    console.log(`See ${DIST_NAME} server at ${port}`);
  }
});
