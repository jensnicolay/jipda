import {ArraySet, HashMap, HashCode, Sets, Formatter, assert, assertDefinedNotNull, assertFalse} from './common.mjs';

export function createEvaluator(semantics, cc)
{
  const gcFlag = cc.gc === undefined ? true : cc.gc;
  const initializers = Array.isArray(cc.initializers) ? cc.initializers : [];
  const hardSemanticAsserts = cc.hardAsserts === undefined ? false : cc.hardAsserts;
  
  const machine =
      {
        evaluate: (exp, benv, store, lkont, kont) => semantics.evaluate(exp, benv, store, lkont, kont, machine),
        continue: (value, store, lkont, kont) => semantics.continue(value, store, lkont, kont, machine),
        return: (value, store, lkont, kont) => semantics(value, store, lkont, kont, machine),
        throw: (value, store, lkont, kont) => semantics.throw(value, store, lkont, kont, machine),
        break: (store, lkont, kont) => semantics.break(store, lkont, kont, machine)
      }
  
function explore(ast)
{
  var startTime = performance.now();
  var initial = this.inject(ast);
  var s = initial;
  var id = 0;
  while (true)
  {
    var next = s.next();
    id++;
    if (id % 10000 === 0)
    {
      console.log(Formatter.displayTime(performance.now()-startTime), "states", id, "ctxs", sstore.count(), "sstorei", sstorei);
    }
    var l = next.length;
    if (l === 1)
    {
      s = next[0].state;
    }
    else if (l === 0)
    {
      return {initial:initial, result: ArraySet.from1(s), sstore:sstore, numStates:id, time:performance.now()-startTime};
    }
    else
    {
      throw new Error("more than one next state");
    }
  }
}