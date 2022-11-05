const path = require("path");
const { streamPath, servePath } = require("./script");
const bodyParser = require("body-parser");
const { readFileSync, writeFileSync } = require("fs");
const { URL } = require("node:url");

module.exports = (app, contentRoot) => {
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
    const mainPath = contentRoot;
    const subPath = req.url
      .substring("/parsegraph".length)
      .replaceAll(/\/+$/g, "");
    const stream = streams[subPath] ?? servers[subPath] ?? streamPath(mainPath, subPath);
    stream.setCallbackUrl(path.join("/callback", subPath));
    const remover = stream.connect((...args) => {
      resp.write(`data: ${JSON.stringify(args)}\n\n`);
    });
    req.on("close", remover);
  });

  app.get(/\/raw\/?(.*)$/, (req, resp) => {
    const mainPath = contentRoot;
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
    const mainPath = contentRoot;
    const subPath = req.url.substring("/events/".length);
    if (!servers[subPath]) {
      servers[subPath] = servePath(mainPath, subPath);
      servers[subPath].setCallbackUrl("/callback/" + subPath);
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
    const mainPath = contentRoot;
    const subPath = req.url.substring("/graph/".length);
    if (!servers[subPath]) {
      servers[subPath] = servePath(mainPath, subPath);
      servers[subPath].setCallbackUrl("/callback/" + subPath);
    }
    const server = servers[subPath];
    const remover = server.forEach((...args) => {
      const line = JSON.stringify(args);
      resp.write("" + line.length);
      resp.write("\n");
      resp.write("" + line);
      resp.write("\n");
    });
    resp.end();
  });

  app.get(/\/feed\/?$/, (req, resp) => {
    resp.writeHead(200, {
      "Content-Type": "text/plain",
    });
    const server = new ParsegraphServer();
    server.state().setBackgroundColor(64 / 255, 130 / 255, 109 / 255, 1);

    const car = server.state().newCaret("b");
    car.label("Hey its feed");
    server.state().setRoot(car.root());
    server.forEach((...args) => {
      const line = JSON.stringify(args);
      resp.write("" + line.length);
      resp.write("\n");
      resp.write("" + line);
      console.log("Feed", line);
      resp.write("\n");
    });
    resp.end();
  });

  app.get(/\/service\/?$/, (req, resp) => {
    resp.writeHead(200, {
      "Content-Type": "text/plain",
    });
    const server = new ParsegraphServer();
    server.state().setBackgroundColor(64 / 255, 130 / 255, 109 / 255, 1);

    const car = server.state().newCaret("b");
    car.label("Hey its service");
    server.state().setRoot(car.root());
    server.forEach((...args) => {
      const line = JSON.stringify(args);
      resp.write("" + line.length);
      resp.write("\n");
      resp.write("" + line);
      console.log("Feed", line);
      resp.write("\n");
    });
    resp.end();
  });

  app.post(/\/splice\/?(.*)$/, bodyParser.json(), (req, resp) => {
    const subPath = req.url.substring("/splice/".length);
    try {
      const filePath = path.join(contentRoot, subPath);
      const str = readFileSync(filePath).toString();
      const index = req.body.offset;
      const count = req.body.len;
      if (isNaN(index) || isNaN(count)) {
        resp.status(400).end();
        return;
      }
      writeFileSync(
        filePath,
        str.slice(0, index) + (req.body.val || "") + str.slice(index + count)
      );
      if (streams[subPath]) {
        const mainPath = contentRoot;
        streams[subPath] = streamPath(mainPath, subPath);
        streams[subPath].setCallbackUrl("/callback/" + subPath);
      }
      resp.end();
    } catch (ex) {
      console.log(ex);
      resp.status(500).end();
    }
  });

  app.post(
    /\/callback(\/.*)$/,
    bodyParser.json({ strict: false }),
    (req, resp) => {
      console.log("Callback", req.url);
      console.log(
        "Callback",
        req.url,
        new URL(req.url, "http://localhost:15557").pathname
      );
      const subPath = new URL(
        req.url,
        "http://localhost:15557"
      ).pathname.substring("/callback".length);
      let stream = streams[subPath] ?? servers[subPath];
      if (!stream) {
        stream = streamPath(contentRoot, subPath)
        streams[subPath] = stream
        servers[subPath] = stream
      }
      try {
        stream.callback(parseInt(req.query.cb));
        resp.end();
      } catch (ex) {
        console.log(ex);
        resp.status(500).end();
      }
    }
  );
};
