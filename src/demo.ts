import { renderFullscreen } from "parsegraph-viewport";
import Color from "parsegraph-color";

import Room, { getRoomName } from "./index";

const buildGraph = () => {
  console.log("Building graph");
  const room = new Room(getRoomName());
  return room.node();
};

document.addEventListener("DOMContentLoaded", () => {
  console.log("Started");
  const topElem = document.getElementById("room");
  topElem.style.position = "relative";
  renderFullscreen(topElem, buildGraph(), new Color(0, 0, 0, 1));
});
