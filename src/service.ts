import Navport, { render } from "parsegraph-viewport";
import ParsegraphStream from "./ParsegraphStream";

document.addEventListener("DOMContentLoaded", () => {
  const topElem = document.getElementById("parsegraph");
  topElem.style.position = "relative";
  const viewport = new Navport(null);
  const stream = new ParsegraphStream(viewport);
  const refresh = () => stream.populate("./service" + window.location.search);
  window.addEventListener("popstate", refresh);
  refresh();
  render(topElem, viewport);
});
