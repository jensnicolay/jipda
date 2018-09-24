JIPDA: static analysis for JavaScript
=====================================
JIPDA is a static analyzer for JavaScript, written in JavaScript and organized into ES modules.
It is a research prototype that has been (and still is being) used in a number of projects.

JIPDA is very much a work in progress, but you may already find it usable and useful in some scenarios.


Getting started
---------------
Up until now, JIPDA has been mostly used or integrated in a programmatic way (see below), but this low-level programmatic interface of JIPDA is also one of its more difficult and volatile parts.

Therefore, a minimalistic Node.js command line UI exists to perform some basic tasks.

### Basic concrete evaluation
```node --use-strict --experimental-modules jipda test/resources/fib.js```
```
3
```

This evaluates file ```test/resources/fib.js``` using a concrete lattice and concrete allocators.
The example file is part of JIPDA's test suite.

The result of evaluation (the number 3) is displayed, together with some additional information (omitted here and below).

JIPDA relies on strict-mode and ES modules, so the corresponding node params have to be specified as shown.

### Basic abstract evaluation
```node --use-strict --experimental-modules jipda test/resources/fib.js --lattice=type```
```
{Num}
```

This evaluates the specified program using the type lattice.
Therefore, the result printed is ```{Num}```, i.e., the singleton set of type "number".
The type lattice is currently the only (abstract) lattice that JIPDA implements.

Indirectly, the choice of lattice also controls store and stack allocations.
In case of the type lattice, abstract store and stack allocators will be used.

### Generating an output graph
```node --use-strict --experimental-modules jipda test/resources/fib.js --lattice=type -g```
```
{Num}
wrote test/resources/fib.js.dot
```


Option ```-g``` instructs JIPDA to output its computed flow graph as a [dot graph](https://www.graphviz.org/).
This file is written in the same directory as the input program file, with the same name as the input file with ```.dot``` appended.
This graph can be visualized and converted into other formats by multiple tools and editors, for example by the GraphViz command line tool:
```dot -Tpdf test/resources/fib.js.dot -o fib.pdf```

### Dumping the state-space as JSON
```node --use-strict --experimental-modules jipda test/resources/fib.js -j```
```
3
wrote test/resources/fib.js.json
```
Option ```-j``` instructs JIPDA to output the state-space as JSON.
The JSON is structured as an array of states.
The first state, with ```_id``` 0, is the initial state.

TODO: The JSON currently dumps the state-space exactly as it is represented internally. For example, the store is kept in a trie map and is therefore dumped in that representation (which includes bitmap, collision, and leaf nodes), instead of being dumped in a more "natural" map representation, e.g., as key-value pairs.

Also, there currently is no way to read back in the JSON to reconstitute the original, in-memory model of the state-space with function objects (types) intact.
The following program, however, is capable of reading back in the dumped JSON format "as is":
```JavaScript
import fs from 'fs';
import {retrocycle} from './lib/cycle';

const read = name => fs.readFileSync(name).toString();
const inputFileName = process.argv[2];
console.log(retrocycle(JSON.parse(read(inputFileName))));
```
(JIPDA makes use of the [`cycle.js`](https://www.npmjs.com/package/cycle) library to cycle and retrocycle [circular] data).

Applying the above program to the dumped JSON gives an idea of the structure of the state-space:
```
input file: test/resources/fib.js.json
[ { node:                        // an evaluation state evaluates a particular AST node
     { type: 'Program',          
       body: [Array],
       sourceType: 'script',
       loc: [Object],
       resource: [Object],
       tag: 0,
       parent: null,
       root: [Circular],
       funScopeDecls: [Object] },
    benv: { _map: [Object], _global: true }, // the environment (name -> address)
    store: { map: [Object] },    // the heap (address -> value)
    lkont: [],                   // the local or intraprocedural stack
    kont:                        // the interprocedural continuation
     { ex: null,
       thisValue: [Object],
       realm: [Object],
       userContext: 'globalctx',
       as: [Object],
       _stacks: {},
       _id: 0,
       _sstoreid: -1,
       _sstorei: 0 },
    _successors: [ [Object] ],   // array of successor nodes
    _sstorei: 0,
    _id: 0,                      // state id
    resource: { path: '/Users/eljenso/code/jipda/test/resources/fib.js' } },
  { node: 
     { type: 'FunctionDeclaration',
       id: [Object],
       params: [Array],
       body: [Object],
       generator: false,
       expression: false,
       async: false,
       loc: [Object],
       tag: 1,
       parent: [Object],
       root: [Object],
       funScopeDecls: [Object] },
    benv: { _map: [Object], _global: true },
    store: { map: [Object] },
    ...
```


### REPL mode
```node --use-strict --experimental-modules jipda```
```
> 1 + 1
2
```

The above command starts JIPDA in REPL mode, while adding option ```-r``` can be used to drop JIPDA into the REPL after evaluation:

```node --use-strict --experimental-modules jipda test/resources/fib.js -r```
```
3
> fib(10)
55
```

### Node REPL mode
```node --use-strict --experimental-modules jipda test/resoces/fib.js -R```
```
3
node> jsContext.evaluateScript("fib(10)")
JsValue {
  d: ConcValue { value: 55 },
  context: 
   JsContext {
     semantics: ...,
     explorer: ...,
     store: ...,
     kont: ...
     managedValues: ... } }
```

Option ```-R``` lets JIPDA exit into a fresh Node shell in which a high(er)-level programmatic API into JIPDA is available through ```jsContext```.
This feature is currently being developed as a proof of concept, but the idea is to evolve this into a full-fledged API.

### Browser
```node --use-strict --experimental-modules jipda test/resources/secloud/h-dc-1.html -br```
```
undefined
>document.body.children.length
3
```

JIPDA also supports a browser environment (option ```-b```), but again only as a proof of concept (i.e., only as a demonstrator but nothing useful at the moment).

### Programmatic interaction
Programmatic interaction with JIPDA enables one to directly work with the full state-space and supporting functionality, for example to implement a static analysis.

#### Step 1: bootstrap JIPDA
```
const ast0resource = new FileResource("../prelude.js");
const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
const s0 = computeInitialCeskState(jsSemantics, ast0resource);
```

The first step consists of obtaining an initial state that represents an initial JavaScript environment.
In the example code above, we assume that only the standard prelude is required, and we use concrete semantics.

#### Step 2: evaluate input program
```
const s1 = s0.enqueueScriptEvaluation(resource);
let result = jsSemantics.lat.bot();
const system = explore([s1], s => {
if (isSuccessState(s))
{
    result = s.value;
}
else if (s.isThrowState)
{
    // handle throw (e.g., report it, or abort)
}
else if (s.isErrorState)
{
    // handle internal error (should abort)    
}
else
{
    // handle "no progress" (internal error)
    throw new Error("no progress: " + s);
}
});
console.log("The result is", result);
```
Starting from the initial state, script evaluation can be enqueued as a job, resulting in another program state.
Transitively exploring the latter then actually evaluates the program.
The various callbacks passed to `explore` enable monitoring the execution.
(Function `isSuccessState` is declared in module `abstract-machine`.)

#### Abstract semantics
In the abstract case, using the type lattice, a switch of machines is required.
The prelude is explored with concrete allocators (but with the type lattice) to obtain the initial state.
The actual input program then is evaluated using abstract (finite) allocators:
```
const preludeJsSemantics = createSemantics(typeLattice, concAlloc, concKalloc, {errors:true});
const s0 = computeInitialCeskState(preludeJsSemantics, ast0resource);

const typeJsSemantics = createSemantics(typeLattice, tagAlloc, aacKalloc, {errors:true});
const s1 = s0.switchMachine(typeJsSemantics, {gc:true});
const s2 = s1.enqueueScriptEvaluation(resource);
let actual = typeJsSemantics.lat.bot();
const system = explore([s2], s => {
    if (isSuccessState(s))
    {
        actual = actual.join(s.value);
    }
    else if (s.isThrowState)
    {
        ...
```

To see (more) examples of this kind of code in action, see the test programs (`jipdaTests`, `typeTests`, `concreteTests`, ...) in the `test` directory.


JavaScript support
------------------
JIPDA supports limited ES3 (non-strict) JavaScript semantics: primitive types, operations and functions.
Support for the standard built-in objects is patchy, although basic array programming and some type operations (on `Number`, `String`, ...) and conversions are available.

Next steps are to implement strict mode semantics as default (and maybe later support both) and to at least add `let`, `const`, and anonymous functions (```=>```).

JIDPA is not heavily optimized for scalability in the abstract. The plan here is to investigate adaptive precision, starting with full precision and only lowering it when and where required.

To answer the question "Does this work in JIPDA?", the best way to find out is to simply try it, and not set expectations too high (for now).
Looking at the unit tests may also be illustrative.


Some technical background
-------------------------
The heart of JIPDA is an abstract [CESK](http://matt.might.net/articles/cesk-machines/)-style interpreter following the [AAC](https://dl.acm.org/citation.cfm?id=2661098) technique.

This interpreter is essentially split into two files, `js-semantics` and `abstract machine`, which implements the actual semantics and the machine and state-space exploration strategies that drive the interpreter, respectively.

The semantics is parameterized with a value lattice, store (heap) allocator, and a stack allocator. Currently concrete semantics and type (abstract) semantics are supported.

As `js-semantics` only contains the core standard objects, a JIPDA interpreter has to be extended with "prelude" files. 
Many of the built-in JS semantics are (or, rather, will be) implemented in JavaScript itself, in the standard JIPDA prelude (`prelude.js`).
Other preludes can be (programmatically) specified, such as one for the browser environment (`web-prelude.js`).
Preludes enjoy a special status; for example, they are evaluated using concrete allocators for maximal precision.

Because implementing abstract semantics directly in the interpreter is tedious and error-prone, the goal instead is to maintain a small JIPDA core implementation with most built-ins defined in the prelude in regular JavaScript. Similar to the `%`-prefixed functions in V8, JIPDA defines a "base" API that can be called from a prelude for low-level interpreter-only operations.

JIPDA's interpreter also has a meta-interface, exercised by `js-context`. The goal of the `js-context` interface is to allow higher-level and stateful interaction with the interpreter. The browser environment in `browser`, for example, calls the interpreter through this interface.

The structure of the state-space is relatively standard.
The two main types of states are eval states and continuation states.
The semantics are store-based with a store per state (i.e., JIPDA is flow-sensitive), and the stack is split into a local (intraprocedural) and meta (interprocedural) continuation.
JIPDA also provides a garbage collector (a flag can be passed to the semantics to enable/disable) and implements abstract counting.
See for example [this paper](https://doi.org/10.1002/smr.1889) to get a feel of the (basic) structure of the state-space and the operational small-step semantics.