import Navport, { render } from "parsegraph-viewport";
import Room, { getRoomName } from "./index";
import {MultislotType} from "./Multislot";

document.addEventListener("DOMContentLoaded", () => {
  const topElem = document.getElementById("room");
  topElem.style.position = "relative";

  const viewport = new Navport();
  const room = new Room(viewport.carousel(), getRoomName());
  room.addLoader("multislot", new MultislotType());
  viewport.setRoot(room.node());
  render(topElem, viewport);
});
