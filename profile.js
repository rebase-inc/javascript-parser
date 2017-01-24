const { STANDARD_LIBRARY } = require('./constants.js');

class Profile {
  constructor() {
    this.useCount = new Map();
    this.bindings = new Map();
    for (var globalName of Object.keys(global)) {
      this.bindings.set(globalName, '__stdlib__.' + globalName);
    }
    for (var name of STANDARD_LIBRARY) {
      this.bindings.set(name, '__stdlib__.' + name);
    }
    this.addUse = this.addUse.bind(this);
    this.addBinding = this.addBinding.bind(this);
    this.asObject = this.asObject.bind(this);
  }
  addUse(localName) {
    let realName = this.bindings.get(localName);
    if (realName) {
      this.useCount.set(realName, (this.useCount.get(realName) || 0) + 1);
    }
  }
  addBinding(localName, realName) {
    this.bindings.set(localName, realName);
  }
  asObject() {
    let obj = Object.create(null);
    for (let [k,v] of this.useCount) {
      obj[k] = v;
    }
    return obj;
  }
}

exports.Profile = Profile;
