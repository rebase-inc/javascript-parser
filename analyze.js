const traverse = require('babel-traverse').default;
const NodePath = require('babel-traverse').NodePath;
const Hub = require('babel-traverse').Hub
// const logger = require('winston');

const babylon = require('babylon');
const types = require('babel-types');
const { Profile } = require('./profile.js');

const PLUGINS = [
  'jsx',
  'flow',
  'doExpressions',
  'objectRestSpread',
  'decorators',
  'classProperties',
  'exportExtensions',
  'asyncGenerators',
  'functionBind',
  'functionSent',
  'dynamicImport'
]

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
  var ast = babylon.parse(code, { sourceType: 'module', allowReturnOutsideFunction: true, plugins: PLUGINS });
  var path = NodePath.get({ hub: hub, parentPath: null, parent: ast, container: ast, key: 'program' }).setContext();
  var nodeCount = 0;
  traverse(ast, { enter: (path) => {
      switch (path.node.type) {
        case 'ImportDeclaration':
          parseImportDeclaration(path.node).forEach(profile.addBinding);
          break;
        case 'VariableDeclarator':
          parseVariableDeclarator(path.node).forEach(profile.addBinding);
          break;
        case 'Identifier':
          // TODO: Do a better job of detecting uses. Just checking for any identifier is sloppy
          profile.addUse(path.node.name);
          break;
      }
    }
  });
  return profile.asObject();
}



function parseImportDeclaration(node) {
  let makeNames = (specifier) => {
    let realName = [ node.source.value ];
    switch (specifier.type) {
      case 'ImportSpecifier': // import { foo } from 'bar'
        realName.push(specifier.imported.name);
        break;
      case 'ImportDefaultSpecifier': // import foo from 'bar'
        break;
      case 'ImportNamespaceSpecifier': // import * as foo from 'bar'
        break;
    }
    if (realName[0].startsWith('.') || realName[0].startsWith('/')) {
      realName.unshift('__private__');
    }
    return [ realName.join('.'), specifier.local.name ];
  }
  return new Map(node.specifiers.map(makeNames));
}

function parseVariableDeclarator(node) {
  let localName = node.id.name;
  let fullName = [];
  let expression = node.init;
  while (expression && expression.type == 'MemberExpression') {
    fullName.unshift(expression.property.name);
    expression = expression.object;
  }
  if (expression && expression.type == 'CallExpression' && expression.callee.name == 'require') {
    fullName.unshift(expression.arguments[0].value);
    if (expression.arguments[0].value.startsWith('.') || expression.arguments[0].value.startsWith('/')) {
      fullName.unshift('__private__');
    }
    return new Map([[ fullName.join('.'), localName ]]);
  }
  return new Map();
}

module.exports = analyzeCode;
