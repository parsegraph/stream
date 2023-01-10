const Reconciler = require("react-reconciler");
const NO_CONTEXT = {};
const {
  Direction,
  reverseDirection,
  Alignment,
  nameDirection,
  readDirection,
  readAlignment,
} = require("../binding/direction");

let lastFocusedNode = [];

class RenderNode {
  constructor(node) {
    this.node = node;
    this.nodeChildren = [];
  }

  getChildDirection(child) {
    let dir = child.dir;
    if (dir === Direction.NULL) {
      dir = this.connect;
    }
    if (dir === Direction.NULL) {
      dir = Direction.FORWARD;
    }
    return dir;
  }

  getLastChild() {
    for (let i = this.nodeChildren.length - 1; i >= 0; --i) {
      if (this.nodeChildren[i] && this.nodeChildren[i].node) {
        return this.nodeChildren[i];
      }
    }
    return null;
  }

  appendChild(child) {
    let dir = this.getChildDirection(child);

    let connectingSite = this;
    if (child.node && connectingSite.node) {
      connectingSite.node.connectNode(dir, child.node);
      connectingSite.node.setNodeAlignmentMode(dir, child.align);
      if (connectingSite.pull) {
        connectingSite.node.pull(connectingSite.pull);
      }
    }

    this.nodeChildren.push(child);
  }

  getChildIndex(child) {
    for (let i = 0; i < this.nodeChildren.length; ++i) {
      if (this.nodeChildren[i] === child) {
        return i;
      }
    }
    return -1;
  }

  insertBefore(child, refChild) {
    const refIndex = this.getChildIndex(refChild);
    if (refIndex == 0) {
      // Adding to front
      refChild.node.disconnectNode();

      let dir = this.getChildDirection(child);
      this.node.connectNode(dir, child.node);
      this.node.setNodeAlignmentMode(dir, child.align);
      if (this.pull) {
        new Caret(this.node).pull(this.pull);
      }

      dir = this.getChildDirection(refChild);
      child.node.connectNode(dir, refChild.node);
      child.node.setNodeAlignmentMode(dir, refChild.align);
      if (child.pull) {
        child.node.pull(child.pull);
      }

      this.nodeChildren.unshift(child);
      return;
    }

    const origParent = this.nodeChildren[refIndex - 1];
    refChild.node.disconnectNode();

    let dir = this.getChildDirection(child);
    origParent.node.connectNode(dir, child.node);
    origParent.node.setNodeAlignmentMode(dir, child.align);
    if (origParent.pull) {
      new Caret(origParent.node).pull(origParent.pull);
    }

    dir = this.getChildDirection(refChild);
    child.node.connectNode(dir, refChild.node);
    child.node.setNodeAlignmentMode(dir, refChild.align);
    if (child.pull) {
      new Caret(child.node).pull(child.pull);
    }

    this.nodeChildren.splice(refIndex, 0, child);
  }

  removeChild(child) {
    let childIndex = this.getChildIndex(child);
    if (childIndex < this.nodeChildren.length - 1) {
      let nextChild = this.nodeChildren[childIndex + 1];
      let origParent = child.node.parentNode();
      child.node.disconnectNode();
      nextChild.node.disconnectNode();
      let dir = this.getChildDirection(nextChild);
      origParent.connectNode(dir, nextChild.node);
      origParent.setNodeAlignmentMode(dir, nextChild.align);
      // Get pull right here
    } else {
      child.node.disconnectNode();
    }

    this.nodeChildren.splice(childIndex, 1);
  }
}

function isParsegraphType(type) {
  return type === "element" || type === "block" || type === "bud";
}

const hostConfig = {
  supportsMutation: true,
  supportsHydration: false,
  supportsPersistence: false,

  detachDeletedInstance() {},

  createInstance(type, props, server, hostContext) {
    const caret = server.state().newCaret(props.type ?? "b");
    if (props.label != null) {
      caret.label(props.label);
    }
    if (props.embed != null) {
      caret.embed(props.embed);
    }
    if (props.overlay != null) {
      caret.overlay(props.overlay);
    }
    if (props.shrink) {
      caret.shrink();
    }
    if (props.grow) {
      caret.grow();
    }
    if (props.scale != null) {
      caret.node().setScale(props.scale);
    }

    const node = new RenderNode(caret.root());
    node.dir =
      props.dir !== undefined ? readDirection(props.dir) : Direction.NULL;
    node.connect =
      props.connect !== undefined
        ? readDirection(props.connect)
        : Direction.NULL;
    node.align =
      props.align !== undefined ? readAlignment(props.align) : Alignment.NONE;
    hostContext.caret = caret;
    if (props.pull !== undefined) {
      caret.pull(props.pull);
      node.pull = props.pull;
    }
    if (props.onClick !== undefined) {
      caret.onClick(props.onClick);
    }
    if (type === "element") {
      const contentFunc = props.content;
      const node = caret.node();
      caret.node().setElement(() => {
        const container = document.createElement("div");
        ReactDOM.render(contentFunc(), container, () => {
          new ResizeObserver(() => {
            node.layoutHasChanged();
            rootContainer.scheduleRepaint();
          }).observe(container);
        });
        return container;
      });
    }

    return node;
  },

  createTextInstance() {
    console.log("cti");
    //text, rootContainer, hostContext)
    return new RenderNode(null);
  },

  shouldSetTextContent() {
    //type, props)
    return false;
  },

  prepareUpdate(node, type, oldProps, newProps) {
    if (!node.node) {
      return false;
    }
    const diff = [];
    if (oldProps.onClick !== newProps.onClick) {
      diff.push("onClick");
    }
    if (oldProps.label !== newProps.label) {
      diff.push("label");
    }
    if (type === "element" && "content" in newProps) {
      diff.push("content");
    }
    return diff.length > 0 ? diff : undefined;
  },

  commitUpdate(node, updatePayload, type, oldProps, props) {
    if (!node.node || !updatePayload) {
      return;
    }
    const n = node.node;
    updatePayload.forEach((prop) => {
      switch (prop) {
        case "onClick":
          n.setClickListener(props.onClick);
          break;
        case "label":
          n.value().setLabel(props.label);
          break;
        case "content":
          if (type === "element") {
            const contentFunc = props.content;
            const render = (container) => {
              ReactDOM.render(contentFunc(), container, () => {
                new ResizeObserver(() => {
                  node.node.layoutHasChanged();
                }).observe(container);
              });
            };
            if (!node.node._element) {
              node.node.setElement(() => {
                const container = document.createElement("div");
                render(container);
                node.node.layoutHasChanged();
                return container;
              });
            } else {
              node.node._windowElement.forEach((elem, comp) => {
                comp.scheduleUpdate();
                render(elem);
              });
              node.node.layoutHasChanged();
            }
            /*node.node._windowElement.forEach(elem=>{
            elem.remove();
          });
          node.node._windowElement.clear();*/
          }
          break;
      }
    });
  },

  appendChild(parentInstance, child) {
    parentInstance.appendChild(child);
  },

  insertBefore(parentInstance, child, beforeChild) {
    parentInstance.insertBefore(child, beforeChild);
  },

  appendInitialChild(parentInstance, child) {
    parentInstance.appendChild(child);
  },

  getRootHostContext() {
    return { isElement: false };
  },

  finalizeInitialChildren(instance, type, props, rootContainer, hostContext) {
    if (instance.node && instance.pull) {
      instance.node.pull(instance.pull);
    }
    return true;
  },

  getChildHostContext(parentHostContext, type, rootContainer) {
    if (isParsegraphType(type)) {
      return { isElement: type === "element", parent: parentHostContext };
    }
    return parentHostContext;
  },

  getPublicInstance(instance) {
    return instance;
  },

  commitTextUpdate(node, oldLabel, newLabel) {
    node.node && node.node.setLabel(newLabel);
  },

  prepareForCommit(viewport) {
    lastFocusedNode = [];
    if (viewport._nodeShown) {
      let node = viewport._nodeShown;
      while (!node.isRoot()) {
        lastFocusedNode.push(reverseDirection(node.parentDirection()));
        node = node.parentNode();
      }
    }
    return null;
  },

  resetAfterCommit(server) {
    server.scheduleUpdate();

    /*let shownRoot = viewport._nodeShown;
    while(shownRoot && !shownRoot.isRoot()) {
      shownRoot = shownRoot.parentNode();
    }
    if (!shownRoot || shownRoot != viewport.world()._worldRoots[0]) {
      let node = viewport.world()._worldRoots[0];
      for(let i = 0; i < lastFocusedNode.length; ++i) {
        let dir = lastFocusedNode[i];
        if (!node.hasNode(dir)) {
          break;
        }
        node = node.nodeAt(dir);
      }
      viewport.showInCamera(node);
    }
    viewport.scheduleRepaint();
    viewport.world().scheduleRepaint();*/
  },

  preparePortalMount(containerInfo) {},

  now() {
    return Date.now();
  },

  scheduleTimeout(fn) {},

  cancelTimeout(id) {},

  queueMicrotask(fn) {},

  isPrimaryRenderer: false,

  noTimeout: false,

  clearContainer(container) {
    //const roots = container.world()._worldRoots.concat([]);
    //roots.forEach(root=>container.world().removePlot(root));
  },

  removeChild(parentNode, child) {
    parentNode.removeChild(child);
  },

  appendChildToContainer(server, node) {
    if (node.node) {
      server.state().setRoot(node.node);
    }
  },

  removeChildFromContainer(server, node) {
    server.state().setRoot(null);
  },

  commitMount(node) {},
};

module.exports = Reconciler(hostConfig);
