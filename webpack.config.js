const {webpackConfig, relDir} = require("./webpack.common");

module.exports = {
  entry: {
    index: relDir("src/index.ts"),
    room: relDir("src/room.ts"),
    demo: relDir("src/demo.ts"),
  },
  ...webpackConfig(false),
};
