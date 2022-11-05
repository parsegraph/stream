const { TreeNode } = require("./TreeNode");

class AbstractTreeList extends TreeNode {
  constructor(server, title, children) {
    super(server);
    if (children) {
      this._children = [...children];
    } else {
      this._children = [];
    }
    this._title = title;
    this.invalidate();
  }

  connectInitialChild(root, child, childValue) {
    throw new Error("Abstract");
  }

  connectChild(lastChild, child, childValue) {
    throw new Error("Abstract");
  }

  length() {
    return this._children.length;
  }

  checkChild(child) {
    if (child === this) {
      throw new Error("Refusing to add list to itself");
    }
    if (this.indexOf(child) >= 0) {
      throw new Error("Child already contained in this list");
    }
  }

  appendChild(child) {
    this.checkChild(child);
    this._children.push(child);
    this.invalidate();
  }

  indexOf(child) {
    for (let i = 0; i < this._children.length; ++i) {
      if (this._children[i] === child) {
        return i;
      }
    }
    return -1;
  }

  insertBefore(child, ref) {
    if (ref == null) {
      if (this.length() > 0) {
        return this.insertBefore(child, this.childAt(0));
      }
      this.appendChild(child);
      return true;
    }
    this.checkChild(child);
    const idx = this.indexOf(ref);
    if (idx >= 0) {
      this._children.splice(idx, 0, child);
      this.invalidate();
    }
    return idx >= 0;
  }

  insertAfter(child, ref) {
    if (ref == null) {
      this.appendChild(child);
      return true;
    }
    this.checkChild(child);
    const idx = this.indexOf(ref);
    if (idx === this.length() - 1) {
      this.appendChild(child);
      return true;
    }
    return this.insertBefore(child, this.childAt(idx + 1));
  }

  removeChild(child) {
    const idx = this.indexOf(child);
    if (idx >= 0) {
      this._children.splice(idx, 1);
      this.invalidate();
    }
    return idx >= 0;
  }

  childAt(index) {
    return this._children[index];
  }

  clear() {
    while (this.length() > 0) {
      this.removeChild(this.childAt(0));
    }
  }

  connectSpecial(childValue) {
    console.log(`${childValue}, child of ${this}, did not render a value`);
    return null;
  }

  render() {
    let lastChild = null;
    this._children.forEach((child, i) => {
      const childRoot = child.root();
      if (!childRoot) {
        lastChild = this.connectSpecial(child) || lastChild;
      } else if (i == 0) {
        lastChild = this.connectInitialChild(
          this._title.root(),
          childRoot,
          child
        );
      } else {
        lastChild = this.connectChild(lastChild, childRoot, child);
      }
    });
    return this._title.root();
  }
}

module.exports = { AbstractTreeList };
