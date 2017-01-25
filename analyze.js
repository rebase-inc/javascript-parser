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
  traverse(ast, {
    ImportDeclaration: (path) => { parseImportDeclaration(path).forEach((real, local) => profile.addBinding(local, ...real)) },
    VariableDeclarator: (path) => { parseVariableDeclarator(path).forEach((real, local) => profile.addBinding(local, ...real)) },
    Expression: (path) => { parseExpression(path.node).forEach(name => profile.addUse(...name)); path.shouldSkip = true;},
    ClassDeclaration: (path) => { parseClassDeclaration(path).map(name => profile.addUse(...name)) },
  });
  return profile.asObject();
}

function parseClassDeclaration(path) {
  let declaration = path.node;
  if (declaration.superClass) {
    return declaration.body.body.filter(el => el.type == 'ClassMethod').map(method => [declaration.superClass.name, method.key.name]);
  } else {
    return [];
  }
}

function parseExpression(expression) {
  let names = [];
  let currentName = [];
  let encountered = [];
  while (expression) {
    encountered.push(expression.type);
    switch (expression.type) {
      case 'MemberExpression':
        currentName.unshift(expression.property.name);
        expression = expression.object;
        break;
      case 'CallExpression':
        if (expression.callee.name == 'require') {
          let importName = expression.arguments[0].value.split('/')
          currentName.unshift(...importName);
        } else {
          expression.arguments.map(arg => names = names.concat(parseExpression(arg)))
        }
        currentName.unshift(expression.callee.name || expression.callee.property.name);
        expression = expression.callee.object;
        break;
      case 'ArrowFunctionExpression':
        names = names.concat(parseExpression(expression.body));
        expression = null;
        break;
      case 'Identifier':
        currentName.unshift(expression.name);
        expression = null;
        break;
      case 'JSXElement':
        names = names.concat(parseExpression(expression.openingElement));
        names = names.concat(parseExpression(expression.closingElement));
        expression.children.map(child => names = names.concat(parseExpression(child)));
        expression = null; 
        break;
      case 'JSXOpeningElement':
        expression.attributes.map(attr => names = names.concat(parseExpression(attr)));
        expression = null;
        break;
      case 'JSXClosingElement':
        expression = null;
        break;
      case 'JSXText':
        expression = null;
        break;
      case 'JSXAttribute':
        names = names.concat(parseExpression(expression.value));
        expression = null;
        break;
      case 'JSXExpressionContainer':
        names = names.concat(parseExpression(expression.expression));
        expression = null;
        break;
      case 'StringLiteral':
        expression = null;
        break;
      case 'JSXIdentifier':
        expression = null;
        break;
      case 'NullLiteral':
        expression = null;
        break;
      case 'NumericLiteral':
        expression = null;
        break;
      default:
        // This is awful (and hopefully temporary). Sorry.
        console.log("unknown expression type ", expression);
        expression = expression.object;
        break;
    }
  }
  names.unshift(currentName);
  return names.filter(name => name.length);
}

function parseImportDeclaration(path) {
  let node = path.node;
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
    return [ specifier.local.name, realName ];
  }
  return new Map(node.specifiers.map(makeNames));
}

function parseVariableDeclarator(path) {
  let node = path.node;
  let localName = node.id.name;
  let fullName = parseExpression(node.init)[0] || [];
  if (fullName[0] == 'require') {
    fullName = fullName.slice(1, fullName.length);
    if (fullName[0].startsWith('.') || fullName[0].startsWith('/')) {
      fullName.unshift('__private__');
    }
    return new Map([[ localName, fullName ]]);
    path.shouldStop = true;
  }
  return new Map();
}

module.exports = analyzeCode;
