export default class RoomRegistry<Key, Value extends object, Event = any> {
  _ids: WeakMap<Value, Key>;
  _itemListeners: Map<Key, [(e: Event) => void, object][]>;
  _items: Map<Key, Value>;

  constructor() {
    this._ids = new WeakMap();
    this._itemListeners = new Map();
    this._items = new Map();
  }

  has(id: Key): boolean {
    return this._items.has(id);
  }

  getId(item: Value): Key {
    return this._ids.get(item);
  }

  add(item: Value, id: Key): Value {
    if (this._items.has(id)) {
      if (this._items.get(id) !== item) {
        throw new Error("Refusing to overwrite item " + id + " with " + item);
      }
      return item;
    }
    this._items.set(id, item);
    if (this._ids) {
      this._ids.set(item, id);
    }
    return item;
  }

  remove(id: Key): Value {
    if (!this._items.has(id)) {
      return null;
    }
    const item = this._items.get(id);
    this._items.delete(id);
    this._itemListeners.delete(id);
    if (this._ids) {
      this._ids.delete(item);
    }
    return item;
  }

  dispatch(id: Key, event: any) {
    const listeners = this._itemListeners.get(id);
    if (listeners) {
      // console.log("Listeners for item: " + id);
      listeners.forEach((cb: any) => {
        cb[0].call(cb[1], event);
      });
    } else {
      // console.log("No listeners for item: " + id);
    }
  }

  listen(id: Key, listener: (e: Event) => void, listenerThisArg?: object) {
    // console.log("Listening for " + id);
    if (!this._itemListeners.has(id)) {
      this._itemListeners.set(id, []);
    }
    this._itemListeners.get(id).push([listener, listenerThisArg]);
  }
}
