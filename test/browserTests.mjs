import fs from 'fs';

import {assertEquals} from '../common.mjs';
import concLattice from '../conc-lattice.mjs';
import concAlloc from '../conc-alloc.mjs';
import concKalloc from '../conc-kalloc.mjs';
import createSemantics from '../js-semantics.mjs';
import {Browser} from '../browser.mjs';
import {JsContext} from '../js-context.mjs';
import {initializeMachine} from "../abstract-machine.mjs";
import {StringResource, FileResource} from "../ast.mjs";

const read = name => fs.readFileSync(name).toString();
const preludeResource = new FileResource("../prelude.js");
const webPreludeResource = new FileResource("../web-prelude.js");
const jsConcSemantics = createSemantics(concLattice, {errors: true});

const system0 = initializeMachine(jsConcSemantics, concAlloc, concKalloc, preludeResource, webPreludeResource);

let c = 0;

function run(html, expected)
{
  console.log(++c + "\t" + html.substring(0, 80).replace(/(\r\n\t|\n|\r\t)/gm, ' '));
  const jsContext = new JsContext(system0.semantics, system0.endState.store, system0.kont0, system0.alloc, system0.kalloc);
  const browser = new Browser(jsContext);
  browser.parse(new StringResource(html));
  const result = jsContext.globalObject().getProperty("$result$");
  const actual = result.d;
  assertEquals(concLattice.abst1(expected), actual);
}

run("<script></script>", undefined);
run("<script>123</script>", undefined);
run("<script>$result$=123</script>", 123);

run("<script>$result$ = typeof window === 'object'</script>", true);
run("<script>$result$ = this === window</script>", true);
run("<script>$result$ = this === this['window']</script>", true);

run("<script>$result$ = typeof Document</script>", "function");
run("<script>$result$ = document instanceof Node && document instanceof Document && document instanceof HTMLDocument</script>", true);
run("<script>$result$ = typeof document === 'object'</script>", true);
run("<script>$result$ = typeof document.location</script>", "object");
run("<script>$result$ = !!document.children</script>", true); //TODO see https://stackoverflow.com/questions/7935689/what-is-the-difference-between-children-and-childnodes-in-javascript
run("<script>$result$ = document.children.length</script>", 1);
run("<script>$result$ = document.children[0].tagName</script>", "HTML");
run("<script>$result$ = document.children[0].children.length</script>", 1);
run("<script>$result$ = document.children[0].children[0].tagName</script>", "HEAD");
run("<script>var div=document.createElement('div'); $result$=div instanceof Node && div instanceof Element && div instanceof HTMLElement && div instanceof HTMLDivElement</script>", true);
run("<script>var txt=document.createTextNode('hello'); $result$=txt instanceof CharacterData && txt instanceof Text && txt instanceof Node</script>", true);
run("<script>$result$ = !!document.head", true);
run("<script>$result$ = document.body", undefined);
run("<script>$result$ = document.cookie</script>", "");
run("<script>$result$ = document.location === window.location</script>", true);
run("<script>$result$ = typeof document.location.assign</script>", "function");

run("<script>$result$ = typeof XMLHttpRequest</script>", "function");

run("<script>var img = document.createElement('img'); $result$ = img.src</script>", "");

run("<html><body><script>$result$ = !!document.body</script></body></html>", true);
run("<body><script>document.body.onload = function () {$result$ = true}</script></body>", true);
run("<body><div id='hopla'></div><script>$result$ = document.body.children[0].id</script></body>", "hopla");
run("<body><div id='hopla'></div><script>$result$ = document.getElementById('hopla').id</script></body>", "hopla");
run("<script>function sq(x) {return x*x}; $result$ = sq(4)</script>", 16);

run("<input/>", undefined);
run("<body><input type='input'><script>$result$ = document.body.children[0].type</script></body>", "input");
run("<body><input type='input' onclick='$result$ = 21 * 2;'><script>document.body.children[0].onclick()</script></body>", 42);

run("<body><p>foo<p><script>$result$ = document.body.children[0].tagName</script></body>", "P");
run("<body><p id='myid'>foo<p><script>$result$ = document.body.children[0].id</script></body>", "myid");
run("<body><p class='myclass class2'>foo<p><script>$result$ = document.body.children[0].className</script></body>", "myclass class2");

run("<body><a href='evil.com'>Heaven</a> <script>$result$ = document.body.children[0].href</script></body>", "evil.com");

run(read("resources/html/test3.html"), "someValue");
run(read("resources/html/test4.html"), 'tbl');
run(read("resources/html/test5.html"), 6);
run(read("resources/html/test6.html"), 4);