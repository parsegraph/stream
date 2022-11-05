const { ParsegraphPalette } = require("./ParsegraphPalette");
const { ParsegraphCaret } = require("./ParsegraphCaret");
const { ParsegraphBlock } = require("./ParsegraphBlock");

const BUD_RADIUS = 2;

const MIN_BLOCK_HEIGHT = BUD_RADIUS * 12;
const MIN_BLOCK_WIDTH = BUD_RADIUS * 15;

// Inter-node spacing
const HORIZONTAL_SEPARATION_PADDING = 7 * BUD_RADIUS;
const VERTICAL_SEPARATION_PADDING = 3 * BUD_RADIUS;

// Configures graphs to appear grid-like; I call it 'math-mode'.
const MIN_BLOCK_WIDTH_MATH = BUD_RADIUS * 40;
const MIN_BLOCK_HEIGHT_MATH = MIN_BLOCK_WIDTH_MATH;
const HORIZONTAL_SEPARATION_PADDING_MATH = 2;
const VERTICAL_SEPARATION_PADDING_MATH = 2;

const FONT_SIZE = 18;

const LINE_COLOR = "rgba(0.4, 0.4, 0.4, 0.6)";
const SELECTED_LINE_COLOR = "rgba(0.8, 0.8, 0.8, 1)";
const LINE_THICKNESS = (12 * BUD_RADIUS) / 8;

const lineColor = LINE_COLOR;
const selectedLineColor = lineColor;
const borderColor = lineColor;
const selectedBorderColor = lineColor;

class ParsegraphServerState {
  constructor(server, artist) {
    this._server = server;
    this._carets = {};
    this._mathMode = false;
    this._artist = artist;
    this._palette = new ParsegraphPalette(server, (given) => {
      return new ParsegraphBlock(
        server,
        null,
        this.style(given, this.mathMode()),
        this.artist()
      );
    });
  }

  setBackgroundColor(r, g, b, a) {
    this.server().send("setBackgroundColor", r, g, b, a);
  }

  style(given, mathMode) {
    switch (given) {
      case "u":
        return this.budStyle();
      case "s":
        return mathMode ? this.slotMathStyle() : this.slotStyle();
      case "b":
        return mathMode ? this.blockMathStyle() : this.blockStyle();
    }
  }

  slotStyle() {
    if (!this._slotStyle) {
      this._slotStyle = {
        bud: false,
        mathMode: false,
        minWidth: MIN_BLOCK_WIDTH,
        minHeight: MIN_BLOCK_HEIGHT,
        horizontalPadding: 3 * BUD_RADIUS,
        verticalPadding: 0.5 * BUD_RADIUS,
        borderColor: borderColor,
        backgroundColor: "rgba(0.75, 0.75, 1, 0.5)",
        selectedBorderColor: selectedBorderColor,
        selectedBackgroundColor: "rgba(0.9, 1, 0.9, 1)",
        brightness: 0.75,
        borderRoundness: BUD_RADIUS * 3,
        borderThickness: BUD_RADIUS * 2,
        fontColor: "rgba(0, 0, 0, 1)",
        selectedFontColor: "rgba(0, 0, 0, 1)",
        fontSize: FONT_SIZE,
        letterWidth: 0.61,
        verticalSeparation: 6 * VERTICAL_SEPARATION_PADDING,
        horizontalSeparation: 7 * HORIZONTAL_SEPARATION_PADDING,
        lineColor: lineColor,
        selectedLineColor: selectedLineColor,
      };
    }
    return this._slotStyle;
  }

  blockStyle() {
    if (!this._blockStyle) {
      this._blockStyle = {
        bud: false,
        mathMode: false,
        minWidth: MIN_BLOCK_WIDTH,
        minHeight: MIN_BLOCK_HEIGHT,
        horizontalPadding: 3 * BUD_RADIUS,
        verticalPadding: 0.5 * BUD_RADIUS,
        borderColor: borderColor,
        backgroundColor: "rgba(1, 1, 1, 0.25)",
        selectedBorderColor: selectedBorderColor,
        selectedBackgroundColor: "rgba(0.75, 0.75, 1, 1)",
        brightness: 0.75,
        borderRoundness: BUD_RADIUS * 3,
        borderThickness: BUD_RADIUS * 2,
        fontColor: "rgba(0, 0, 0, 1)",
        selectedFontColor: "rgba(0, 0, 0, 1)",
        fontSize: FONT_SIZE,
        letterWidth: 0.61,
        lineColor: lineColor,
        selectedLineColor: selectedLineColor,
        verticalSeparation: 6 * VERTICAL_SEPARATION_PADDING,
        horizontalSeparation: 1 * HORIZONTAL_SEPARATION_PADDING,
      };
    }
    return this._blockStyle;
  }

  copyStyle(given, mathMode) {
    return { ...this.style(given, mathMode) };
  }

  budStyle() {
    if (!this._budStyle) {
      this._budStyle = {
        bud: true,
        minWidth: BUD_RADIUS * 3,
        minHeight: BUD_RADIUS * 3,
        horizontalPadding: BUD_RADIUS / 2,
        verticalPadding: BUD_RADIUS / 2,
        borderColor: borderColor,
        backgroundColor: "rgba(0.9, 0.9, 0.9, 0.2)",
        selectedBorderColor: selectedBorderColor,
        selectedBackgroundColor: "rgba(1, 1, 0.7, 1)",
        brightness: 1.5,
        borderRoundness: BUD_RADIUS * 8,
        borderThickness: BUD_RADIUS * 2,
        fontColor: "rgba(0, 0, 0, 1)",
        selectedFontColor: "rgba(0, 0, 0, 1)",
        fontSize: FONT_SIZE,
        letterWidth: 0.61,
        verticalSeparation: 10 * VERTICAL_SEPARATION_PADDING,
        horizontalSeparation: 7 * HORIZONTAL_SEPARATION_PADDING,
        lineColor: lineColor,
        selectedLineColor: selectedLineColor,
      };
    }
    return this._budStyle;
  }

  mathMode() {
    return this._mathMode;
  }

  artist() {
    return this._artist;
  }

  server() {
    return this._server;
  }

  newCaret(given, palette) {
    if (!palette) {
      palette = this.palette();
    }
    const car = new ParsegraphCaret(this.server(), given, palette);
    this._carets[car.id()] = car;
    return car;
  }

  palette() {
    return this._palette;
  }

  setRoot(root) {
    this._root = root;
    this.server().send("setRoot", root?.id());
  }

  root() {
    return this._root;
  }
}

module.exports = { ParsegraphServerState };
