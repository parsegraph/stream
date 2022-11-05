const glob = require("glob");
const express = require("express");
const app = express();
const { writeFileSync, readFileSync, statSync } = require("fs");
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

app.use(root, express.static("../dist"));
app.use(root, express.static("../www"));

app.get(/(.*)$/, async (req, res) => {
  res.sendFile(path.resolve(process.cwd() + "/../www/demo.html"));
});

console.log("PORT: " + port);
app.listen(port, () => {
  if (typeof port === "number") {
    console.log(
      `See ${DIST_NAME} build information at http://localhost:${port}${root}`
    );
  } else {
    console.log(`See ${DIST_NAME} server at ${port}`);
  }
});
