const {webpackConfig, relDir} = require("./webpack.common");

module.exports = {
  entry: {
    index: relDir("src/room.ts"),
  },
  ...webpackConfig(true),
};
