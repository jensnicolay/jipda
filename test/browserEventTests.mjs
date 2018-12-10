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
import {StringResource, FileResource} from "../ast";

const read = name => fs.readFileSync(name).toString();
const ast0resource = new FileResource("../prelude.js");
const ast1resource = new FileResource("../web-prelude.js");
const ast2resource = new FileResource("../web-test-prelude.js");
const jsSemantics = createSemantics(concLattice, {errors: true});
const {store:store0, kont:kont0} = computeInitialCeskState(jsSemantics, concAlloc, concKalloc, ast0resource, ast1resource, ast2resource);

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

function run(htmlFile, expected)
{
  const html = read("resources/html/browser-event-tests/" + htmlFile);
  console.log(++c + "\t" + html.substring(0, 80).replace(/(\r\n\t|\n|\r\t)/gm, ' '));
  const jsContext = new JsContext(jsSemantics, new Explorer(), concAlloc, concKalloc, store0, kont0);
  const browser = new Browser(jsContext);
  browser.parse(new StringResource(html));
  jsContext.evaluateScript("triggerEvents(document)");
  const result = jsContext.globalObject().getProperty("$result$");
  const actual = result.d;
  assertEquals(concLattice.abst1(expected), actual);
}

run("1.html", "someValue");