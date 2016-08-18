# Javascript Profiler
Docker service to extract a TechProfile from Javascript source code, using an Abstract Syntax Tree

# Rebase Language Parsing TCP Protocol

All data shall be JSON encoded

## Request:
[ <method_number>, *<args> ]

### scan_contents
method_number = 0
args = [ <filename>, <code>, <date>] 
filename: a string containing the path to the file analyzed
code: a string containing the code to be parsed
date: a number containing the UTC Epoch date when the file was committed

Example:

request = '[0, "/foo.js", "function foo(bar)\n{ console.log(\"boo\");\n}", 1340648513 ]'

### scan_patch

method_number = 1
args = [ <filename>, <code>, <previous_code>, <date>] 
filename: a string containing the path to the file analyzed
code: a string containing the code to be parsed
previous_code: a string containing the previous version of the code to be parsed
date: a number containing the UTC Epoch date when the file was committed

Example:

request = '[0, "/foo.js", "function foo(bar)\n{ var a=1;\nconsole.log(\"boo\");\n}", "function foo(bar)\n{ console.log(\"boo\");\n}", 1340648513 ]'

## Response
{
    'Javascript.__language__.ArrayPattern': [ 1340648513, 1340748280, 41 ],
    'Javascript.__language__.Function': [ 1340648513, 1340748280, 29 ],
}
