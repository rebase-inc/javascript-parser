const traverse = require('babel-traverse').default;
const NodePath = require('babel-traverse').NodePath;
const Hub = require('babel-traverse').Hub
const logger = require('winston');

const types = require('babel-types');
const { Profile } = require('./profile.js');

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

function analyze(ast) {
  var profile = new Profile();
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

function parseExpression(expression, baseName = []) {
  let names = [];
  let currentName = baseName;
  let encountered = [];
  while (expression) {
    encountered.push(expression.type);
    switch (expression.type) {
      case 'MemberExpression':
        currentName.unshift(expression.property.name);
        expression = expression.object;
        break;
      case 'CallExpression':
        // This is a bit of a hack. We should probably find a better way to define this
        if (expression.callee.name == 'require' && !!expression.arguments.length == 1 && expression.arguments[0].type == 'StringLiteral') {
          let importName = expression.arguments[0].value.split('/')
          currentName.unshift(...importName);
          expression = expression.callee;
        } else {
          expression.arguments.map(arg => names = names.concat(parseExpression(arg)));
          names = names.concat(parseExpression(expression.callee));
          expression = null;
        }
        break;
      case 'NewExpression':
        expression.arguments.map(arg => names = names.concat(parseExpression(arg)));
        names = names.concat(parseExpression(expression.callee));
        expression = null;
        break;
      case 'FunctionExpression':
        names = names.concat(parseExpression(expression.params));
        names = names.concat(parseExpression(expression.body));
        expression = null;
        break;
      case 'ArrowFunctionExpression':
        names = names.concat(parseExpression(expression.body));
        expression = null;
        break;
      case 'YieldExpression':
        names = names.concat(parseExpression(expression.argument));
        expression = null;
        break;
      case 'AwaitExpression':
        names = names.concat(parseExpression(expression.argument));
        expression = null;
        break;
      case 'ArrayExpression':
        expression.elements.map(el => names = names.concat(parseExpression(el)));
        expression = null;
        break;
      case 'BlockStatement':
        expression.body.map(statement => names = names.concat(parseExpression(statement)));
        expression = null;
        break;
      case 'WithStatement':
        names = names.concat(parseExpression(expression.object));
        names = names.concat(parseExpression(expression.body));
        expression = null;
        break;
      case 'ReturnStatement':
        names = names.concat(parseExpression(expression.argument));
        expression = null;
        break;
      case 'LabeledStatement':
        names = names.concat(parseExpression(expression.body));
        expression = null;
        break;
      case 'IfStatement':
        names = names.concat(parseExpression(expression.test));
        names = names.concat(parseExpression(expression.alternate));
        names = names.concat(parseExpression(expression.consequent));
        expression = null;
        break;
      case 'SwitchStatement':
        names = names.concat(parseExpression(expression.discriminant));
        expression.cases.map(c => names = names.concat(parseExpression(c)));
        expression = null;
        break;
      case 'SwitchCase':
        names = names.concat(parseExpression(expression.test));
        expression.consequent.map(cons => names = names.concat(parseExpression(cons)));
        expression = null;
        break;
      case 'ThrowStatement':
        names = names.concat(parseExpression(expression.argument));
        expression = null;
        break;
      case 'TryStatement':
        names = names.concat(parseExpression(expression.block));
        names = names.concat(parseExpression(expression.handler));
        names = names.concat(parseExpression(expression.finalizer));
        expression = null;
        break;
      case 'CatchClause':
        names = names.concat(parseExpression(expression.body));
        expression = null;
        break;
      case 'WhileStatement':
        names = names.concat(parseExpression(expression.test));
        names = names.concat(parseExpression(expression.body));
        expression = null;
        break;
      case 'DoWhileStatement':
        names = names.concat(parseExpression(expression.test));
        names = names.concat(parseExpression(expression.body));
        expression = null;
        break;
      case 'ForStatement':
        names = names.concat(parseExpression(expression.test));
        names = names.concat(parseExpression(expression.body));
        names = names.concat(parseExpression(expression.update));
        names = names.concat(parseExpression(expression.init));
        expression = null;
        break;
      case 'ForInStatement':
        names = names.concat(parseExpression(expression.left));
        names = names.concat(parseExpression(expression.right));
        names = names.concat(parseExpression(expression.body));
        expression = null;
        break;
      case 'ForOfStatement':
        names = names.concat(parseExpression(expression.left));
        names = names.concat(parseExpression(expression.right));
        names = names.concat(parseExpression(expression.body));
        expression = null;
        break;
      case 'ForAwaitStatement':
        names = names.concat(parseExpression(expression.left));
        names = names.concat(parseExpression(expression.right));
        names = names.concat(parseExpression(expression.body));
        expression = null;
        break;
      case 'FunctionDeclaration':
        names = names.concat(parseExpression(expression.id));
        names = names.concat(parseExpression(expression.body));
        expression.params.map(param => names = names.concat(parseExpression(param)));
        expression = null;
        break;
      case 'Identifier':
        currentName.unshift(expression.name);
        expression = null;
        break;
      case 'ExpressionStatement':
        names = names.concat(parseExpression(expression.expression));
        expression = null;
        break;
      case 'ObjectExpression':
        expression.properties.map(prop => names = names.concat(parseExpression(prop)));
        expression = null;
        break;
      case 'ObjectProperty':
        names = names.concat(parseExpression(expression.value));
        expression = null;
        break;
      case 'ObjectMethod':
        names = names.concat(parseExpression(expression.value));
        expression = null;
        break;
      case 'SpreadProperty':
        names = names.concat(parseExpression(expression.argument));
        expression = null;
        break;
      case 'ConditionalExpression':
        names = names.concat(parseExpression(expression.test));
        names = names.concat(parseExpression(expression.alternate));
        names = names.concat(parseExpression(expression.consequent));
        expression = null;
        break;
      case 'SequenceExpression':
        expression.expressions.map(expr => names = names.concat(parseExpression(expr)));
        expression = null;
        break;
      case 'TemplateLiteral':
        expression.expressions.map(expr => names = names.concat(parseExpression(expr)));
        expression = null;
        break;
      case 'TaggedTemplateExpression':
        names = names.concat(parseExpression(expression.tag));
        names = names.concat(parseExpression(expression.quasi));
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
      case 'JSXAttribute':
        names = names.concat(parseExpression(expression.value));
        expression = null;
        break;
      case 'JSXExpressionContainer':
        names = names.concat(parseExpression(expression.expression));
        expression = null;
        break;
      case 'BinaryExpression':
        names = names.concat(parseExpression(expression.left));
        names = names.concat(parseExpression(expression.right));
        expression = null;
        break;
      case 'AssignmentExpression':
        names = names.concat(parseExpression(expression.left));
        names = names.concat(parseExpression(expression.right));
        expression = null;
        break;
      case 'LogicalExpression':
        names = names.concat(parseExpression(expression.left));
        names = names.concat(parseExpression(expression.right));
        expression = null;
        break;
      case 'ReturnStatement':
        names = names.concat(parseExpression(expression.argument));
        expression = null;
        break;
      case 'VariableDeclaration':
        expression.declarations.map(declaration => names = names.concat(parseExpression(declaration)));
        expression = null;
        break;
      case 'VariableDeclarator':
        expression = expression.init;
        break;
      case 'Decorator':
        names = names.concat(parseExpression(expression.expression));
        expression = null;
        break;
      case 'RestProperty':
        names = names.concat(parseExpression(expression.argument));
        expression = null;
        break;
      case 'SpreadProperty':
        names = names.concat(parseExpression(expression.argument));
        expression = null;
        break;
      case 'SpreadElement':
        names = names.concat(parseExpression(expression.argument));
        expression = null;
        break;
      case 'UnaryExpression':
        names = names.concat(parseExpression(expression.argument));
        expression = null;
        break;
      case 'UpdateExpression':
        names = names.concat(parseExpression(expression.argument));
        expression = null;
        break;
      case 'ObjectPattern':
        expression.properties.map(prop => names = names.concat(parseExpression(prop)));
        expression = null;
        break;
      case 'ArrayPattern':
        expression.elements.map(elem => names = names.concat(parseExpression(elem)));
        expression = null;
        break;
      case 'RestElement':
        names = names.concat(parseExpression(expression.argument));
        expression = null;
        break;
      case 'AssignmentPattern':
        names = names.concat(parseExpression(expression.left));
        names = names.concat(parseExpression(expression.right));
        expression = null;
        break;
      case 'ClassBody':
        expression.body.map(method_or_property => names = names.concat(parseExpression(method_or_property, currentName)));
        expression = null;
        break;
      case 'ClassMethod':
        names = names.concat(parseExpression(expression.key));
        names = names.concat(parseExpression(expression.body));
        if (!!expression.decorators) {
          expression.decorators.map(dec => name = names.concat(parseExpression(dec)));
        }
        expression = null;
        break;
      case 'MethodDefinition':
        names = names.concat(parseExpression(expression.key));
        names = names.concat(parseExpression(expression.body));
        expression = null;
        break;
      case 'ClassProperty':
        names = names.concat(parseExpression(expression.key));
        names = names.concat(parseExpression(expression.value));
        expression = null;
        break;
      case 'ClassDeclaration':
        let classDeclarationName = expression.superClass ? parseExpression(expression.superClass)[0] : expression.id;
        names = names.concat(parseExpression(expression.body, classDeclarationName));
        expression = null;
        break;
      case 'ClassExpression':
        let classExpressionName = expression.superClass ? parseExpression(expression.superClass)[0] : expression.id || [];
        names = names.concat(parseExpression(expression.body, classExpressionName));
        expression = null;
        break;
      case 'ExportNamedDeclaration':
        names = names.concat(parseExpression(expression.declaration));
        names = names.concat(parseExpression(expression.source));
        expression.specifiers.map(spec => name = names.concat(parseExpression(spec)));
        expression = null;
        break;
      case 'ExportSpecifier':
        names = names.concat(parseExpression(expression.exported));
        expression = null;
        break;
      case 'ExportDefaultDeclaration':
        names = names.concat(parseExpression(expression.declaration));
        expression = null;
        break;
      case 'ExportAllDeclaration':
        names = names.concat(parseExpression(expression.source));
        expression = null;
        break;
      default:
        expression = null;
        break;
    }
  }
  names.unshift(currentName);
  //console.log('encountered ', encountered);
  return names.filter(name => name.length);
}

function _pathToContext(name) {
  name = name.replace(/\./g, '').replace(/\//g,'.');
  if (name.charAt(0) == '.') {
    name = name.substr(1);
  }
  return name;
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
      realName = _pathToContext(realName.join('.')).split('.');
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
      fullName = _pathToContext(fullName.join('.')).split('.');
      fullName.unshift('__private__');
    }
    return new Map([[ localName, fullName ]]);
    path.shouldStop = true;
  }
  return new Map();
}

module.exports = analyze;
