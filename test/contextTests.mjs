import {assert} from '../common.mjs';
import concLattice from '../conc-lattice.mjs';
import concAlloc from '../conc-alloc.mjs';
import concKalloc from '../conc-kalloc.mjs';
import createSemantics from '../js-semantics.mjs';
import {FileResource, StringResource} from '../ast.mjs';
import {JsContext} from '../js-context.mjs';
import {isSuccessState, StateRegistry} from "../abstract-machine.mjs";

const ast0resource = new FileResource("../prelude.js");
const jsSemantics = createSemantics(concLattice, {errors: true});

let c = 0;

// nothing yet