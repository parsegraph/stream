import Navport, { render } from "parsegraph-viewport";
import ParsegraphStream from "./ParsegraphStream";

document.addEventListener("DOMContentLoaded", () => {
  const topElem = document.getElementById("parsegraph");
  topElem.style.position = "relative";
  const viewport = new Navport();
  const stream = new ParsegraphStream(viewport);
  stream.setPrefix("10.11.0.1:3000");
  stream.populate(window.location.pathname);
  window.addEventListener("popstate", (event) => {
    stream.populate(window.location.pathname);
  });

  render(topElem, viewport);
});
