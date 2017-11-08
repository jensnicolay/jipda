import createSemantics from './js-semantics';
import createMachine from './machine';
import esprima from 'esprima';

const jsSemantics = createSemantics();

const lat = {abst1:function (x) {return x}};
const prelMach = createMachine(jsSemantics, {}, {lat});
const benv = null;
const store = null;
const lkont = [];
const kont = null;
const kstore = null;
const prel0 = prelMach.initialize(benv, store, lkont, kont, kstore);
const prel1 = prel0.enqueue("ScriptJobs", null /*the job*/, prel0.store, prel0.lkont, prel0.kont, prel0.kstore, prelMach);
const prel2 = runConc(prelMach, prel1.states[0]);

const exp = esprima.parse("123");
const lkont2 = [];
const kont2 = null;
const kstore2 = null;
const mach = createMachine(jsSemantics, {}, {lat});
const s0 = mach.evaluate(exp, prel2.benv, prel2.store, lkont2, kont2, kstore2);

const result = runConc(mach, s0.states[0]);

console.log(result)


function runConc(machine, state)
{
  while (true)
  {
    const successors = state.next(machine);

    if (successors.length === 0)
    {
      return state;
    }
  
    if (successors.length === 1)
    {
      state = successors[0];
    }
  }
}

