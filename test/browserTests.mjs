import fs from 'fs';

import {assertEquals} from '../common';
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {Browser} from '../browser';
import {JsContext} from '../js-context';
import {computeInitialCeskState} from "../abstract-machine.mjs";

const read = name => fs.readFileSync(name).toString();
const ast0src = read("../prelude.js");
const ast1src = read("../web-prelude.js");
const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
const {store:store0, kont:kont0} = computeInitialCeskState(jsSemantics, ast0src, ast1src);

let c = 0;

function run(html, expected)
{
  console.log(++c + "\t" + html.substring(0, 80).replace(/(\r\n\t|\n|\r\t)/gm, ' '));
  const jsContext = new JsContext(jsSemantics, store0, kont0);
  const browser = new Browser(jsContext);
  const actual = browser.parse(html);
  assertEquals(concLattice.abst1(expected), actual);
}

//
// run("<script></script>", undefined);
// run("<script>123</script>", undefined);
// run("<script>$result$=123</script>", 123);
// run("<script>$result$ = this === window</script>", true);
// run("<script>$result$ = this === this['window']</script>", true);
// run("<script>$result$ = !!document</script>", true);
run("<script>$result$ = !!document.children</script>", true);



//run("<script>$result$ = document.children[0].constructor.name === 'HTMLHtmlElement'</script>", true);