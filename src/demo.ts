import Room, { getRoomName } from "./index";
import { renderFullscreen } from "parsegraph-viewport";
// import World from "parsegraph-world";
//
import Color from "parsegraph-color";

const buildGraph = () => {
  const room = new Room(getRoomName());
  return room.node();
};

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("room");
  root.style.position = "relative";

  renderFullscreen(root, buildGraph(), new Color(0, 0, 0, 1));
});
