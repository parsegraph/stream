import Direction from "parsegraph-direction";
import { Pizza } from "parsegraph-artist";
import { WorldTransform } from "parsegraph-scene";
import { DirectionCaret } from "parsegraph-direction";
import { BasicProjector } from "parsegraph-projector";
import TimingBelt from "parsegraph-timingbelt";
import Camera from "parsegraph-camera";
import { showInCamera } from "parsegraph-showincamera";
import Block, { DefaultBlockPalette } from "parsegraph-block";
import Room, { getRoomName } from "./index";
// import World from "parsegraph-world";

const palette = new DefaultBlockPalette();

const makeRoom = (root: HTMLElement) => {
  // const window = new GraphicsWindow();
  // const world = new World();
  // root.appendChild(window.container());
  const belt = new TimingBelt();
  // belt.addRenderable(window);
  // addEventMethod(top.window, "resize", belt.scheduleUpdate, belt);
  // const viewport = new Viewport(window, world);
  // window.addComponent(viewport.component());

  // world.plot(room.node());
  // viewport.showInCamera(room.node());
};

const buildGraph = () => {
  const room = new Room(getRoomName());
  return room.node();
};

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("room");
  root.style.position = "relative";

  const proj = new BasicProjector();
  const belt = new TimingBelt();
  root.appendChild(proj.container());

  setTimeout(() => {
    proj.glProvider().canvas();
    proj.overlay();
    proj.render();
    proj.glProvider().gl().viewport(0, 0, proj.width(), proj.height());
    proj.overlay().resetTransform();
    proj.overlay().translate(proj.width() / 2, proj.height() / 2);
    belt.addRenderable(pizza);
    cam.setSize(proj.width(), proj.height());
    showInCamera(pizza.root(), cam, false);
    const wt = WorldTransform.fromCamera(pizza.root(), cam);
    pizza.setWorldTransform(wt);
  }, 0);

  const pizza = new Pizza(proj);

  const cam = new Camera();
  const n = palette.spawn();
  n.value().setLabel("No time");
  pizza.populate(n);

  const refresh = () => {
    const n = buildGraph();
    pizza.populate(n);
    proj.glProvider().render();
    cam.setSize(proj.width(), proj.height());
    showInCamera(pizza.root(), cam, false);
    proj.overlay().resetTransform();
    proj.overlay().clearRect(0, 0, proj.width(), proj.height());
    proj.overlay().scale(cam.scale(), cam.scale());
    proj.overlay().translate(cam.x(), cam.y());
    const wt = WorldTransform.fromCamera(pizza.root(), cam);
    pizza.setWorldTransform(wt);
    belt.scheduleUpdate();
    const rand = () => Math.floor(Math.random() * 255);
    document.body.style.backgroundColor = `rgb(${rand()}, ${rand()}, ${rand()})`;
  };

  const dot = document.createElement("div");
  dot.style.position = "absolute";
  dot.style.right = "8px";
  dot.style.top = "8px";
  dot.style.width = "16px";
  dot.style.height = "16px";
  dot.style.borderRadius = "8px";
  dot.style.transition = "background-color 400ms";
  dot.style.backgroundColor = "#222";
  root.appendChild(dot);

  document.body.style.transition = "background-color 2s";
  let timer: any = null;
  let dotTimer: any = null;
  let dotIndex = 0;
  const dotState = ["#f00", "#c00"];
  const refreshDot = () => {
    dotIndex = (dotIndex + 1) % dotState.length;
    dot.style.backgroundColor = dotState[dotIndex];
  };
  const interval = 3000;
  const dotInterval = 500;
  root.addEventListener("click", () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
      clearInterval(dotTimer);
      dotTimer = null;
      dot.style.transition = "background-color 3s";
      dot.style.backgroundColor = "#222";
    } else {
      refresh();
      dot.style.transition = "background-color 400ms";
      refreshDot();
      timer = setInterval(refresh, interval);
      dotTimer = setInterval(refreshDot, dotInterval);
    }
  });
});
