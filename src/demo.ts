import Navport, { render } from "parsegraph-viewport";
import ParsegraphStream from "./ParsegraphStream";

document.addEventListener("DOMContentLoaded", () => {
  const topElem = document.getElementById("parsegraph");
  topElem.style.position = "relative";
  const viewport = new Navport();
  const stream = new ParsegraphStream(
    viewport,
    "http://localhost:15557/events"
  );
  render(topElem, viewport);
});
