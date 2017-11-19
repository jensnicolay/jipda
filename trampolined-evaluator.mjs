import {ArraySet, HashMap, HashCode, Sets, Formatter, assert, assertDefinedNotNull, assertFalse} from './common.mjs';

export function createEvaluator(semantics)
{
  const machine =
      {
        evaluate: (exp, benv, store, lkont, kont) => () => semantics.evaluate(exp, benv, store, lkont, kont, machine),
        continue: (value, store, lkont, kont) => () => semantics.continue(value, store, lkont, kont, machine),
        return: (value, store, lkont, kont) => () => semantics.return(value, store, lkont, kont, machine),
        throw: (value, store, lkont, kont) => () => semantics.throw(value, store, lkont, kont, machine),
        break: (store, lkont, kont) => () => semantics.break(store, lkont, kont, machine)
      }
  
  function evaluate_(exp, benv, store, lkont, kont)
  {
    let next = semantics.evaluate(exp, benv, store, lkont, kont, machine);
    while (next.length > 0)
    {
      next = next.flatMap(f => f());
    }
    return result;
  }
  
  function continue_(value, store, lkont, kont)
  {
    let next = semantics.continue(value, store, lkont, kont, machine);
    while (next.length > 0)
    {
      next = next.flatMap(f => f());
    }
    return result;
  }
  
  return {evaluate: evaluate_, continue: continue_};
}


export function computeInitialCeskState(semantics, ...srcs)
{
  const result = semantics.initialize(null,
      {
        continue: function (value, store, lkont, kont)
        {
          store = srcs.reduce((store, src) => semantics.enqueueScriptEvaluation(src, store), store);
          const evaluator = createEvaluator(semantics, {errors:true, hardAsserts:true});
          evaluator.continue(value, store, lkont, kont);
          return {};
        }
      });
  
  return new KontState(this.value, store, this.lkont, this.kont);
  
  let s1 = srcs.reduce((state, src) => state.enqueueScriptEvaluation(src), s0);
  const prelSystem = performExplore([s1]);
  console.log("prelude time: " + prelSystem.time + " states " + prelSystem.states.length);
  const prelResult = prelSystem.result;
  if (prelResult.size !== 1) // maybe check this in a dedicated concExplore?
  {
    throw new Error("wrong number of prelude results: " + prelResult.size);
  }
  const prelState = [...prelResult][0];
  const store = [...prelResult][0].store;
  const realm = [...prelResult][0].kont.realm;
  
  const ceskState = {store, realm};
  return ceskState;
}

