import Navport, { render } from "parsegraph-viewport";
import ParsegraphStream from "./ParsegraphStream";

document.addEventListener("DOMContentLoaded", () => {
  const topElem = document.getElementById("room");
  topElem.style.position = "relative";
  const viewport = new Navport();
  const stream = new ParsegraphStream(
    viewport,
    "http://fritolaptop.aaronfaanes:14536/events"
  );
  render(topElem, viewport);
});
