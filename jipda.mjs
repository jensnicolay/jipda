import {jsCesk, performExplore} from './jsCesk.mjs';

// https://github.com/tc39/proposal-global
function getGlobal()
{
  // the only reliable means to get the global object is
  // `Function('return this')()`
  // However, this causes CSP violations in Chrome apps.
  if (typeof self !== 'undefined') { return self; }
  if (typeof window !== 'undefined') { return window; }
  if (typeof global !== 'undefined') { return global; }
  throw new Error('unable to locate global object');
}

const glob = getGlobal();

if (!glob['performance'])
{
  glob['performance'] = Date;
}

export function computeInitialCeskState(semantics, ...srcs)
{
  let s0 = jsCesk(semantics, {errors:true, hardAsserts:true});
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
