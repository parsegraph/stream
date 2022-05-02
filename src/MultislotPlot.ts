import {BlockCaret, BlockNode, BlockStyle, copyStyle, DefaultBlockPalette} from 'parsegraph-block';
import {ActionCarousel} from 'parsegraph-carousel';
import Color from 'parsegraph-color';
import Multislot from "./Multislot";
import Direction from 'parsegraph-direction';

export default class MultislotPlot {
  _multislot: Multislot;
  _index: number;
  _version: number;
  _id: number;
  _root: BlockNode;

  _unclaimedStyle: BlockStyle;
  _claimedStyle: BlockStyle;

  _unclaimedActions: ActionCarousel;
  _populatedActions: ActionCarousel;
  _claimedActions: ActionCarousel;

  _actionRemover: any;

  _palette: DefaultBlockPalette;

  constructor(multislot:Multislot, index: number) {
    this._index = index;
    this._multislot = multislot;
    this._version = 0;
    this._id = null;

    this._palette = new DefaultBlockPalette();

    var car = new BlockCaret('s');
    this._root = car.node();
    var bs = copyStyle('s');
    bs.backgroundColor = multislot.color();
    this._unclaimedStyle = bs;
    this._root.value().setBlockStyle(bs);

    this._claimedStyle = copyStyle('s');
    this._claimedStyle.backgroundColor = new Color(1, 1, 1);

    car.spawn('d', 'u');
    car.pull('d');
    car.move('d');

    const carousel = multislot.room().carousel();
    this._unclaimedActions = new ActionCarousel(carousel);
    this._unclaimedActions.addAction("Claim", function() {
        var room = this._multislot.room();
        var username = room.username();
        if(!username) {
            throw new Error("Room must have a valid username");
        }
        this.room().submit(new ClaimPlotAction(this, username));
    }, this);
    this._actionRemover = this._unclaimedActions.install(car.node());
    car.move('u');

    var addDefaultActions = (ac: ActionCarousel)=>{
        ac.addAction("Edit", function() {
            this.room().togglePermissions(this.id());
        }, this);
        ac.addAction("Unclaim", function() {
            this.room().submit(new UnclaimPlotAction(this));
        }, this);
    };
    this._populatedActions = new ActionCarousel(carousel);
    addDefaultActions(this._populatedActions);

    this._claimedActions = new ActionCarousel(carousel);
    this._claimedActions.addAction("Lisp", (plotId:number)=>{
        this.room().pushListItem(plotId, "lisp", "");
    }, this);
    addDefaultActions(this._claimedActions);
}

  setId(id:number) {
      this._id = id;
  };

  id() {
      return this._id;
  };

  claimant() {
      var claimant = this._root.value().label();
      if(claimant === "") {
          return null;
      }
      return claimant;
  };

  claim(name:string) {
      this._root.value().setLabel(name);
      this._root.value().setBlockStyle(this._claimedStyle);
      this.room().scheduleUpdate();
      this._actionRemover();
      this._actionRemover = this._claimedActions.install(this._root.nodeAt(Direction.DOWNWARD));
  };

  populate() {
  };

  depopulate() {
      this._root.disconnectNode(Direction.DOWNWARD);
      this._root.connectNode(Direction.DOWNWARD, this._palette.spawn("u"));
  };

  unclaim() {
      this._actionRemover();
      this._root.disconnectNode(Direction.DOWNWARD);
      this._root.value().setLabel("");
      const node = this._palette.spawn("u");
      this._root.connectNode(Direction.DOWNWARD, node);
      this._actionRemover = this._unclaimedActions.install(node);
      this._root.value().setBlockStyle(this._unclaimedStyle);
      this.room().scheduleUpdate();
  };

  multislot() {
    return this._multislot;
  };

  room() {
      return this._multislot.room();
  };

  version() {
      return this._version;
  }

  nextVersion() {
      return ++this._version;
  };

  index() {
      return this._index;
  };

  node() {
      return this._root;
  };
}

class ClaimPlotAction {
  _plot: any;
  _username: any;
  _originalClaimant: any;
  _listener: any;
  _listenerThisArg: any;
  _version: any;

  constructor(plot:MultislotPlot, username:string) {
    this._plot = plot;
    this._username = username;
    this._originalClaimant = null;
  }

  setListener(cb:()=>void, cbThisArg?:any) {
      if(this._listener) {
          console.log("Refusing to overwrite existing listener");
          console.log("Original listener:");
          console.log(this._listener, this._listenerThisArg);
          console.log("New listener:");
          console.log(cb, cbThisArg);
          throw new Error("Refusing to overwrite existing listener");
      }
      this._listener = cb;
      this._listenerThisArg = cbThisArg;
  };

  room() {
    return this._plot.room();
  };

  multislot() {
      return this._plot.multislot();
  };

  advance() {
      var multislotId = this.room().getId(this.multislot());
      if(multislotId === null) {
          return false;
      }
      this._originalClaimant = this._plot.claimant();
      this._version = this._plot.version();
      this._plot.claim(this._username);
      this.room().pushListItem(multislotId, "multislot::plot", [this._plot.index(), 1], this.receive, this);
      return true;
  };

  reverse() {
      if(this._plot.version() !== this._version) {
          // Preempted.
          return false;
      }
      if(this._originalClaimant) {
          this._plot.claim(this._originalClaimant);
      }
      else {
          this._plot.unclaim();
      }
      return true;
  };

  receive(err:any) {
      if(err) {
          this.reverse();
      }
      else {
          this._plot.nextVersion();
      }
      if(this._listener) {
          this._listener.call(this._listenerThisArg);
      }
  };
}

class UnclaimPlotAction {
  _plot: any;
  _originalClaimant: any;
  _listener: any;
  _listenerThisArg: any;
  _version: any;

  constructor(plot:MultislotPlot) {
    this._plot = plot;
    this._originalClaimant = null;
  }

  setListener(cb:()=>void, cbThisArg?:any) {
    if(this._listener) {
        throw new Error("Refusing to overwrite existing listener");
    }
    this._listener = cb;
    this._listenerThisArg = cbThisArg;
  };

  room() {
    return this._plot.room();
  };

  multislot() {
    return this._plot.multislot();
  };

  advance() {
    var multislotId = this.room().getId(this.multislot());
    if(multislotId === null) {
        return false;
    }
    this._originalClaimant = this._plot.claimant();
    this._version = this._plot.version();
    this._plot.unclaim();
    this.room().destroyListItem(this._plot.id(), this.receive, this);
    return true;
  };

  reverse() {
    if(this._plot.version() !== this._version) {
        // Preempted.
        return false;
    }
    if(this._originalClaimant) {
        this._plot.claim(this._originalClaimant);
    }
    else {
        this._plot.unclaim();
    }
    return true;
  };

  receive(err:any) {
    if(err) {
        this.reverse();
    }
    else {
        this._plot.nextVersion();
    }
    if(this._listener) {
        this._listener.call(this._listenerThisArg);
    }
  };
}
