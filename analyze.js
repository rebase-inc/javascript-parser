const traverse = require('babel-traverse').default;
const NodePath = require('babel-traverse').NodePath;
const Hub = require('babel-traverse').Hub
const logger = require('winston');

const babylon = require('babylon');

const { STANDARD_LIBRARY } = require('./constants.js');

// This is to get around https://github.com/babel/babel/issues/4413
// TL;DR: Duplicate declarations crash the babel ast traverser
const hub = new Hub({
  buildCodeFrameError: (node, message, error) => {
    var loc = node && (node.loc || node._loc);
    var err = new error(message);
    if (loc) {
      err.loc = loc.start;
    }
    return err;
  }
});

function analyzeCode(code) {
  var profile = new Profile();
  try {
    var ast = babylon.parse(code, { sourceType: 'module', plugins: '*' });
    var path = NodePath.get({ hub: hub, parentPath: null, parent: ast, container: ast, key: 'program' }).setContext();
    var nodeCount = 0;
    traverse(ast, {
      enter: (path) => {
        nodeCount += 1;
        if (nodeCount % 10000 == 0) { logger.debug('Parsed ' + nodeCount + ' nodes...'); }

        var node = path.node;
        if (node.type == 'ImportDeclaration') {
          _parseImportDeclaration(node, profile);
        } else if (node.type == 'VariableDeclarator') {
          _parseVariableDeclarator(node, profile);
        } else if (node.type == 'Identifier') {
          profile.addModuleByBoundName(node.name);
        }
      }
    }, path.scope);
    logger.debug('Analyzing code took ' + (process.hrtime(start)[1] / 1000000000).toFixed(2) + ' seconds');
    return profile.asObject();
  } catch (e) {
    logger.error('Error encountered while parsing code: ' + e.message);
    return profile.asObject();
  }
}

class Profile {
  constructor() {
    this.useCount = new Map();
    this.bindings = new Map();
    for (var globalName of Object.keys(global)) {
      this.bindings.set(globalName, globalName);
    }
    this.bindings.set('require', 'require');
    for (var name of STANDARD_LIBRARY) {
      this.bindings.set(name, name);
    }
  }
  addModuleByName(moduleName) {
    this.useCount.set(moduleName, (this.useCount.get(moduleName) || 0) + 1);
  }
  addBoundName(boundName, moduleName) {
    this.bindings.set(boundName, moduleName);
  }
  addModuleByBoundName(boundName) {
    if (this.bindings.has(boundName)) {
      this.addModuleByName(this.bindings.get(boundName));
    }
  }
  asObject() {
    let obj = Object.create(null);
    for (let [k,v] of this.useCount) {
      obj[k] = v;
    }
    return obj;
  }
}

function _isRequireImportNode(node) {
  let isRequire = (node.type == 'CallExpression' && node.callee.name == 'require');
  isRequire = isRequire && !(node.arguments[0].value.startsWith('.') || node.arguments[0].value.startsWith('/'));
  return isRequire;
}

function _parseVariableDeclarator(node, profile) {
  let boundName = node.id.name;
  let field = '';
  node = node.init;
  if (!node) { return; }
  while (node.type == 'MemberExpression') {
    field = node.property.name + '.' + field;
    node = node.object;
  }
  if (_isRequireImportNode(node)) {
    let moduleName = node.arguments[0].value + (!!field ? '.' + field : '')
    profile.addModuleByName(moduleName);
    profile.addBoundName(boundName, moduleName);
  }
}

function _parseImportDeclaration(node, profile) {
  var moduleName = node.source.value;
  if (moduleName.startsWith('.') || moduleName.startsWith('/')) {
    return;
  }
  node.specifiers.forEach((specifier) => {
    switch (specifier.type) {
      case 'ImportSpecifier':
        profile.addBoundName(specifier.local.name, moduleName + '.' + specifier.imported.name);
        profile.addModuleByBoundName(specifier.local.name);
        break;
      case 'ImportDefaultSpecifier':
        profile.addBoundName(specifier.local.name, moduleName);
        profile.addModuleByName(moduleName);
        break;
      case 'ImportNamespaceSpecifier':
        profile.addBoundName(specifier.local.name, moduleName);
        profile.addModuleByName(moduleName);
        break;
    }
  });
}

module.exports = analyzeCode;
