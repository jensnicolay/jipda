import fs from 'fs';

import {assertEquals} from '../common';
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {Browser} from '../browser';
import {JsContext} from '../js-context';
import {explore, computeInitialCeskState} from "../abstract-machine.mjs";
import {StateRegistry} from "../abstract-machine";

const read = name => fs.readFileSync(name).toString();
const ast0src = read("../prelude.js");
const ast1src = read("../web-prelude.js");
const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
const {store:store0, kont:kont0} = computeInitialCeskState(jsSemantics, ast0src, ast1src);

function Explorer()
{
  this.stateRegistry = new StateRegistry();
}

Explorer.prototype.explore =
    function (initialStates, onEndState)
    {
      return explore(initialStates, onEndState, undefined, undefined, this.stateRegistry);
    }

let c = 0;

function run(html, expected)
{
  console.log(++c + "\t" + html.substring(0, 80).replace(/(\r\n\t|\n|\r\t)/gm, ' '));
  const jsContext = new JsContext(jsSemantics, new Explorer(), store0, kont0);
  const browser = new Browser(jsContext);
  const actual = browser.parse(html);
  assertEquals(concLattice.abst1(expected), actual);
}


run("<script></script>", undefined);
run("<script>123</script>", undefined);
run("<script>$result$=123</script>", 123);
run("<script>$result$ = this === window</script>", true);
run("<script>$result$ = this === this['window']</script>", true);
run("<script>$result$ = !!document</script>", true);
run("<script>$result$ = document instanceof Node && document instanceof Document && document instanceof HTMLDocument</script>", true);
run("<script>$result$ = !!document.children</script>", true); //TODO see https://stackoverflow.com/questions/7935689/what-is-the-difference-between-children-and-childnodes-in-javascript
run("<script>$result$ = document.children.length</script>", 1);
run("<script>$result$ = document.children[0].tagName</script>", "HTML");
run("<script>$result$ = document.children[0].children.length</script>", 1);
run("<script>$result$ = document.children[0].children[0].tagName</script>", "HEAD");
run("<script>var div=document.createElement('div'); $result$=div instanceof Node && div instanceof Element && div instanceof HTMLElement && div instanceof HTMLDivElement</script>", true);
run("<script>var txt=document.createTextNode('hello'); $result$=txt instanceof CharacterData && txt instanceof Text && txt instanceof Node</script>", true);
run("<script>$result$ = !!document.head", true);
run("<script>$result$ = document.body", undefined);
run("<html><body><script>$result$ = !!document.body</script></body></html>", true);
run("<body><script>document.body.onload = function () {$result$ = true}</script></body>", true);
run("<body><div id='hopla'></div><script>$result$ = document.body.children[0].id</script></body>", "hopla");
run("<body><div id='hopla'></div><script>$result$ = document.getElementById('hopla').id</script></body>", "hopla");