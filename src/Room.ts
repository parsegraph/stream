import { BlockCaret, BlockNode, DefaultBlockPalette } from "parsegraph-block";
import Direction from "parsegraph-direction";
import { elapsed } from "parsegraph-timing";
import Method from "parsegraph-method";
import Carousel from "parsegraph-carousel";
import RoomRegistry from "./RoomRegistry";

const START_TIME = new Date();

export type ListId = string | number;

export interface ListType {
  spawnItem(room: Room, value: any, children: any[], id: ListId): any;
}

export interface ListItem {}

export function getRoomName() {
  const atSymbol = document.URL.lastIndexOf("/@");
  if (atSymbol < 0) {
    return "default";
  }
  let ROOM_ID = document.URL.substring(atSymbol + 2);
  if (ROOM_ID.indexOf("?") >= 0) {
    ROOM_ID = ROOM_ID.substring(0, ROOM_ID.indexOf("?"));
  }
  return ROOM_ID;
}

export default class Room {
  _roomId: string;
  _eventSource: EventSource;
  _root: BlockNode;
  _actions: any[];
  _firedActions: any;
  _username: string;
  _sessionId: string;
  _update: Method;
  _listClasses: Map<string, ListType>;
  _carousel: Carousel;

  _registry: RoomRegistry<ListId, any>;

  constructor(carousel: Carousel, roomId: string) {
    this._registry = new RoomRegistry();
    this._carousel = carousel;
    this._root = new DefaultBlockPalette().spawn();
    this._listClasses = new Map();

    if (roomId) {
      this._roomId = roomId;
      this._eventSource = new EventSource("/@" + this._roomId + "/live");
      this._eventSource.onmessage = (e) => {
        try {
          const obj = JSON.parse(e.data);
          // console.log("Found message!", obj);
          this.processMessage(obj);
        } catch (ex) {
          console.log(
            "Failed to read message. Error: ",
            ex,
            "Message:",
            e.data
          );
        }
      };
      this._root.value().setLabel(roomId);
    }

    this._actions = [];
    this._firedActions = 0;

    const bg = document.createElement("div");
    bg.className = "bg";

    const container = document.createElement("div");
    container.className = "popup";
    bg.appendChild(container);

    /* addEventListener(container, "submit", function(e) {
        e.preventDefault();
        return false;
    }, this);

    addEventListener(bg, "click", function() {
        if(bg.parentNode) {
            bg.parentNode.removeChild(bg);
        }
    });
    addEventListener(container, "click", function(e) {
        e.stopImmediatePropagation();
    });

    var permissionForm = new parsegraph_PermissionsForm(this);
    container.appendChild(permissionForm.container());

    var shownPermissionId = null;
    this.togglePermissions = function(plotId) {
        if(!plotId) {
            throw new Error("Plot ID must be provided when showing permissions");
        }
        this.scheduleRepaint();
        if(shownPermissionId == plotId && bg.parentNode) {
            bg.parentNode.removeChild(bg);
            shownPermissionId = null;
            return;
        }
        document.body.appendChild(bg);
        permissionForm.refresh(plotId);
        shownPermissionId = plotId;
    };*/

    this._username = null;
  }

  carousel() {
    return this._carousel;
  }

  node() {
    return this._root;
  }

  setOnScheduleUpdate(func: Function, obj?: object) {
    this._update.set(func, obj);
  }

  scheduleUpdate() {
    this._update.call();
  }

  load(items: any) {
    this._root.disconnectNode(Direction.DOWNWARD);
    const car = new BlockCaret(this._root);
    car.spawnMove("d", "u", "c");

    if (items.length === 0) {
      car.disconnect("d");
      car.align("d", "c");
      const node = car.spawnMove("d", "bu");
      car.onClick(() => {
        console.log("Creating carousel", node);
        /* var carousel = viewport.carousel();
              carousel.clearCarousel();
              carousel.moveCarousel(
                  node.absoluteX(),
                  node.absoluteY()
              );
              carousel.showCarousel();

              // Action actionNode, infoDescription, actionFunc, actionFuncThisArg
              var actionNode = new parsegraph_Node(parsegraph_BLOCK);
              actionNode.setLabel("Prepopulate", this.font());
              carousel.addToCarousel(actionNode, function() {
                  this.prepopulate(this, function(success, resp) {
                      //console.log(success, resp);
                  }, this);
              }, this);
              viewport.carousel().scheduleCarouselRepaint();*/
        return false;
      });
      car.move("u");
      car.pull("d");
    }

    for (let i = 0; i < items.length; ++i) {
      if (i > 0) {
        car.spawnMove("f", "u");
      }
      car.push();
      car.pull("d");
      const item = items[i];
      const widget = this.spawnItem(item.id, item.type, item.value, item.items);
      car.connect("d", widget.node());
      car.pop();
    }
    this.scheduleUpdate();
  }

  username() {
    return this._username;
  }

  setUsername(username: string) {
    this._username = username;
  }

  processMessage(obj: any) {
    if (obj.event === "sessionStarted") {
      this._sessionId = obj.guid;
      /* if(!this._cameraProtocol) {
              this._cameraProtocol = new parsegraph_InputProtocol(this.roomId(), this.sessionId(), this.graph().input());
          }*/
      console.log("Time till session start: " + elapsed(START_TIME));
    } else if (obj.event === "initialData") {
      this.load(obj.root.items);
    } else if (obj.event === "join") {
      this.setUsername(obj.username);
    } else if (obj.event == "parsegraph_editItem") {
      /* else if(obj.event === "camera_move") {
          if(userLogin.username === obj.username) {
              return;
          }
          var cb = this._graph.cameraBox();
          cb.setCamera(obj.username, {
              "cameraX":obj.x,
              "cameraY":obj.y,
              "height":obj.height,
              "scale":obj.scale,
              "width":obj.width,
          });
      }
      else if(obj.event == "mouse_move") {
          if(userLogin.username === obj.username) {
              return;
          }
          var cb = this._graph.cameraBox();
          cb.setCameraMouse(obj.username, obj.x, obj.y);
      }*/
      this.registry().dispatch(obj.item_id, obj);
    } else if (obj.event == "pushListItem") {
      this.registry().dispatch(obj.list_id, obj);
    } else if (obj.event == "destroyListItem") {
      this.registry().dispatch(obj.item_id, obj);
    } else if (obj.event == "prepopulate") {
      window.location.replace(window.location.href);
    } else {
      console.log("Unknown event: ", obj);
    }
  }

  roomId() {
    return this._roomId;
  }

  sessionId() {
    return this._sessionId;
  }

  addLoader(type: string, klass: any) {
    this._listClasses.set(type, klass);
  }

  getLoader(type: string) {
    return this._listClasses.get(type);
  }

  registry() {
    return this._registry;
  }

  spawnItem(id: ListId, type: string, value: any, items: any[]) {
    const klass = this.getLoader(type);
    if (!klass) {
      throw new Error("Block type not recognized: " + type);
    }
    if (this.registry().has(id)) {
      throw new Error("Item was already spawned:" + id);
    }
    return this.registry().add(
      klass.spawnItem.call(klass, this, value, items, id),
      id
    );
  }

  pushListItem(
    id: ListId,
    type: string,
    value: any,
    cb?: Function,
    cbThisArg?: object
  ) {
    this.request(
      {
        command: "pushListItem",
        list_id: id,
        type: type,
        value: JSON.stringify(value),
      },
      cb,
      cbThisArg
    );
  }

  destroyListItem(id: ListId, cb?: Function, cbThisArg?: object) {
    this.request(
      {
        command: "destroyListItem",
        item_id: id,
      },
      cb,
      cbThisArg
    );
  }

  editListItem(id: ListId, value: any, cb?: Function, cbThisArg?: object) {
    this.request(
      {
        command: "editItem",
        item_id: id,
        value: JSON.stringify(value),
      },
      cb,
      cbThisArg
    );
  }

  submit(action: any) {
    action.setListener(this.process, this);
    this._actions.push(action);
    this.process();
  }

  process() {
    while (this._firedActions < this._actions.length) {
      try {
        const action = this._actions[this._firedActions++];
        if (!action.advance()) {
          --this._firedActions;
          this.scheduleUpdate();
          return;
        }
      } catch (ex) {
        console.log(ex);
      }
    }
    this.scheduleUpdate();
  }

  prepopulate(cb: Function, cbThisArg?: object) {
    if (!cb) {
      throw new Error("Refusing to fire without a non-null listener");
    }
    this.request({ command: "prepopulate" }, cb, cbThisArg);
  }

  request(reqBody: any, cb?: Function, cbThisArg?: object) {
    if (!this.roomId()) {
      throw new Error("Room must have a room ID");
    }
    if (!this.sessionId()) {
      throw new Error("Room must have a session ID");
    }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/@" + this.roomId(), true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");
    let completed = false;
    xhr.onerror = (e: any) => {
      if (cb && !completed) {
        completed = true;
        cb.call(cbThisArg, e);
      } else if (!completed) {
        completed = true;
        console.log(e.error);
      } else {
        console.log("Request was already completed");
        console.log(e.error);
      }
    };
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        return;
      }
      try {
        const resp = JSON.parse(xhr.responseText);
        if (xhr.status === 200) {
          // Success.
          if (cb && !completed) {
            completed = true;
            cb.call(cbThisArg, null, resp);
          } else if (completed) {
            console.log("Request was already completed");
            console.log(resp);
          }
        } else {
          if (cb && !completed) {
            completed = true;
            cb.call(cbThisArg, resp);
          } else if (!completed) {
            completed = true;
            console.log(resp);
          } else {
            console.log("Request was already completed");
            console.log(resp);
          }
        }
      } catch (ex) {
        if (cb && !completed) {
          cb.call(cbThisArg, ex);
        } else if (!completed) {
          completed = true;
          console.log(ex);
        } else {
          console.log("Request was already completed");
          console.log(ex);
        }
      }
    };
    reqBody.guid = this.sessionId();
    xhr.send(JSON.stringify(reqBody));
  }
}
