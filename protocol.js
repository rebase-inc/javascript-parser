const esprima = require('esprima');
const types = require('ast-types');

const TechProfile = require('./tech_profile.js').TechProfile;

const LANGUAGE_PREFIX = 'Javascript.';
const LANGUAGE_TECH = LANGUAGE_PREFIX+'__language__.';


function grammar_use(code, date) {
    /*
       Returns a TechProfile of abstract grammar elements in 'code'
       by walking through the abstract syntax tree of the code.

       See https://docs.python.org/3.5/library/ast.html#abstract-grammar
       for details.

       Raises SyntaxError if parsing fails.
       */
    let tree = esprima.parse(code);
    let grammar_profile = new TechProfile();
    types.visit(tree, {
        visitNode: function(node) {
            grammar_profile.add(LANGUAGE_TECH+node.value.type, date, 1);
            this.traverse(node);
        }
    });
    return grammar_profile
}

function* concat(...iterators) {
    for ( var i=0; i<iterators.length; i++) {
        yield* iterators[i];
    }
}

function language_profile(new_code, old_code, date) {
    let new_grammar_use = grammar_use(new_code, date);
    if (!old_code) {
        return new_grammar_use;
    }
    let old_grammar_use = grammar_use(old_code, date);
    let abs_diff = new TechProfile();
    let all_keys = new Set(concat(Object.keys(new_grammar_use), Object.keys(old_grammar_use)));
    all_keys.forEach( (technology) => {
        // not the best option, but until we can diff 2 abstract syntax trees,
        // we can only look at the aggregate change
        let use_count = Math.abs(new_grammar_use.get(technology).total_reps - old_grammar_use.get(technology).total_reps);
        if (use_count > 0) {
            abs_diff.add(technology, date, use_count);
        }
    });
    return abs_diff;
}


function scan_contents(filename, code, date) {
    return language_profile(code, '', date);
}

function scan_patch(filename, code, previous_code, date) {
    return language_profile(code, previous_code, date);
}

var _language = Object.keys(esprima.Syntax).map((node) => { return LANGUAGE_TECH+node; });

function language() {
    return _language;
}

var methods = [ scan_contents, scan_patch, language ];


function run(call) {
    let method = methods[call[0]];
    let args = call.slice(1);
    result =  method.apply(this, args);
    return result;
}


exports.run = run;
exports.grammar_use = grammar_use;
exports.language_profile = language_profile;
