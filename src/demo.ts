import Navport, { render } from "parsegraph-viewport";
import ParsegraphStream from ".";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Running demo");
  const topElem = document.getElementById("parsegraph");
  topElem.style.position = "relative";
  const viewport = new Navport(null);
  const stream = new ParsegraphStream(viewport);
  const refresh = () => stream.populate(window.location.pathname);
  window.addEventListener("popstate", refresh);
  refresh();
  render(topElem, viewport);
});
