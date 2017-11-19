import Ast from '../ast';
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {createEvaluator} from '../evaluator';

const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});

const exp = Ast.createAst("123");

const result = jsSemantics.initialize(null,
    {
      continue: function (value, store, lkont, kont)
      {
        const evaluator = createEvaluator(jsSemantics);
        return evaluator.evaluate(exp, kont.realm.GlobalEnv, store, lkont, kont);
      }
    });

console.log(result);