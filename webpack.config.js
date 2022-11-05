const {webpackConfig, relDir} = require("./webpack.common");

module.exports = {
  entry: {
    index: relDir("src/index.ts"),
    demo: relDir("src/demo.ts"),
    feed: relDir("src/feed.ts"),
    service: relDir("src/service.ts"),
    app: relDir("src/app.ts"),
  },
  ...webpackConfig(false),
};
