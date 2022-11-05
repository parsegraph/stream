const { ParsegraphServer } = require("./ParsegraphServer");
const { LispGraph } = require("./lisp");
const { XMLGraph } = require("./xml");
const { JSONGraph } = require("./json");
const { YAMLGraph } = require("./yaml");
const { ECMAScriptGraph } = require("./ecmascript");

module.exports = { ParsegraphServer,
LispGraph, XMLGraph, JSONGraph, YAMLGraph, ECMAScriptGraph };

/*DirectionNode
PaintedNode:
- Artist

Block:
- BlockStyle
 28   bud: boolean;
 29   mathMode: boolean;
 30   minWidth: number;
 31   minHeight: number;
 32   horizontalPadding: number;
 33   verticalPadding: number;
 34   borderColor: Color;
 35   backgroundColor: Color;
 36   selectedBorderColor: Color;
 37   selectedBackgroundColor: Color;
 38   brightness: number;
 39   borderRoundness: number;
 40   borderThickness: number;
 41   fontColor: Color;
 42   selectedFontColor: Color;
 43   fontSize: number;
 44   letterWidth: number;
 45   verticalSeparation: number;
 46   horizontalSeparation: number;
 47   lineColor: Color;
 48   selectedLineColor: Color;

- Label text

Focused*/
