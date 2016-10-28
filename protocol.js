const babylon = require('babylon');
const traverse = require('babel-traverse');
const types = require('babel-types');

const TechProfile = require('./tech_profile.js').TechProfile;

const {
    JS_LANGUAGE,
    BABYLON_OPTIONS,
    STANDARD_LIBRARY
} = require('./constants.js');


function parse(code) {
    return babylon.parse(code, BABYLON_OPTIONS);
}

function Profile() {
    var profile = new Object();
    profile.addGrammar = add.bind(profile, '0.');
    profile.addStdLib = add.bind(profile, '1.');
    profile.add3rdParty = add.bind(profile, '2.');
    return profile;
}


function add(level, tech, count) {
    let key = level+tech;
    if (this.hasOwnProperty(key)) {
        this[key] = count + this[key];
    } else {
        this[key] = count;
    }
}


function scan_contents(language_index, filename, code, context) {
    /*
       Returns a Map of technology elements to their use count in 'code'
       by walking through the abstract syntax tree of the code.

       See https://docs.python.org/3.5/library/ast.html#abstract-grammar
       for details.

       Raises SyntaxError if parsing fails.

        Note:
        'language_index' is unused because we only support javascript in this implementation but that could change in the future.
        'filename' is unused.
        'context' is unused.

       */
    let profile = Profile();
    try {
        let bindings = new Map(STANDARD_LIBRARY.map( lib => [ lib, profile.addStdLib.bind(null, lib, 1) ] ));
        traverse.default(parse(code), {
            enter(path) {
                let node = path.node;
                profile.addGrammar(node.type, 1);
                if (node.type == 'ImportDeclaration') {
                    let importDeclaration = node;
                    let source = node.source;
                    if (source.value.startsWith('.') || source.value.startsWith('/')) {
                        //console.log('Local import, ignoring: import "%s"', source.value);
                        // TODO use rsyslog instead...
                    } else {
                        importDeclaration.specifiers.forEach( specifier => {
                            switch (specifier.type) {
                                case "ImportSpecifier": {
                                    bindings.set(
                                        specifier.local.name,
                                        profile.add3rdParty.bind(
                                            null,
                                            source.value+'.'+specifier.imported.name,
                                            1
                                        )
                                    );
                                } break;

                                case "ImportDefaultSpecifier": {
                                    bindings.set(
                                        specifier.local.name,
                                        profile.add3rdParty.bind(
                                            null,
                                            source.value+'.'+specifier.local.name,
                                            1
                                        )
                                    );
                                } break;

                                case "ImportNamespaceSpecifier": {
                                    bindings.set(
                                        specifier.local.name,
                                        profile.add3rdParty.bind(
                                            null,
                                            source.value+'.'+specifier.local.name,
                                            1
                                        )
                                    );
                                } break;
                            }
                        });
                    }
                } else if (node.type == 'Identifier') {
                    if (bindings.has(node.name)) {
                        bindings.get(node.name)();
                    }
                }
            }
        });
    } catch (e) {
        console.log('Caught exception while parsing ', filename, ' with commit: ', context);
        console.log(e);
    }

    return profile;
}

function* toGrammarIndexes(keys) {
    let rules = types.TYPES;
    for (let grammarRule of keys) {
        yield rules.indexOf(grammarRule);
    }
}

function languages() {
    return [ JS_LANGUAGE ];
}


function grammar() {
    return types.TYPES;
}


const methods = [ languages, grammar, scan_contents ];


function run(call) {
    let index = call[0];
    if (index >= methods.length) { return "invalid method index"; }
    let method = methods[index];
    let args = call.slice(1);
    return method.apply(this, args);
}


exports.run = run;
