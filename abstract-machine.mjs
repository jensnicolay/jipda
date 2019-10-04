import {ArraySet, HashMap, HashCode, Sets, Formatter, assert, assertDefinedNotNull, assertFalse} from './common.mjs';
import {FileResource} from "./ast.mjs";
import {initialStatesToDot, statesToDot} from "./export/dot-graph.mjs";
import Store from "./counting-store.mjs";
import {BOT} from './lattice.mjs';

export function initializeMachine(semantics, alloc, kalloc, ...resources)
{
  const machineConfig = createMachine(semantics, Store.empty(), undefined, alloc, kalloc, {errors:true, hardAsserts:true});
  semantics.initialize(machineConfig.machine);
  // const s0 = machineConfig.machine.states.pop();
  for (const resource of resources)
  {
    //console.info("enqueing %s", resource);
    semantics.enqueueScriptEvaluation(resource, machineConfig.machine);
  }
  // console.debug("running %i init resources", resources.length);
  // const startTime = Date.now();
  // machineConfig.machine.nextJob(s0.store, [], s0.kont);
  const system0 = machineConfig.run();
  // const duration = Date.now() - startTime;
  // console.debug("initialization took %i ms", duration);

  // UGLY!
  

  return system0;
}

function createInternalMachine(semantics, store, kont, alloc, kalloc)
{
  assertDefinedNotNull(store);
  assertDefinedNotNull(kont);
  assertDefinedNotNull(kalloc);

  function explore(resource, cc)
  {
    const machineConfig = createMachine(semantics, store, kont, alloc, kalloc, Object.assign((cc || {}), {errors: true, hardAsserts: true}));
    semantics.enqueueScriptEvaluation(resource, machineConfig.machine);
    const system = machineConfig.explore(machineConfig.machine.nextJob(store, [], kont));
    return system;
  }

  // function run(resource, cc)
  // {
  //   const machineConfig = createMachine(semantics, store, kont, alloc, kalloc, Object.assign((cc || {}), {errors: true, hardAsserts: true}));
  //   semantics.enqueueScriptEvaluation(resource, machineConfig.machine);
  //   const system = machineConfig.run(machineConfig.machine.nextJob([], kont));
  //   return system;
  // }

  function switchConfiguration(semantics, alloc, kalloc, cc)
  {
    return createInternalMachine(semantics, store, kont, alloc, kalloc, cc);
  }

  return {explore, switchConfiguration, semantics};
}

export function createEvalMachine(system)
{
  return createInternalMachine(system.semantics, system.endState.store, system.kont0, system.alloc, system.kalloc);
}

export function createMachine(semantics, store0, kont0, alloc, kalloc, cc)
{
  cc = cc || {};
  // const rootSet = cc.rootSet || ArraySet.empty();
  const pruneGraphOption = cc.pruneGraph === undefined ? true : cc.pruneGraph;

  if (kont0)
  {
    assert(kont0._id === 0);
    assert(kont0._stacks.size === 0);
  }

  const contexts = kont0 ? [kont0] : [];
  const stacks = [];
  const jobs = [];
  
  let sstorei = 0;
  const states = [];

  const machine =
      {
        evaluate: (exp, benv, store, lkont, kont) => states.push(new EvalState(exp, benv, store, lkont, kont)),
        continue: (value, store, lkont, kont) => states.push(new KontState(value, store, lkont, kont)),
        return: (value, store, lkont, kont) => states.push(new ReturnState(value, store, lkont, kont)),
        throw: (value, store, lkont, kont) => states.push(new ThrowState(value, store, lkont, kont)),
        break: (store, lkont, kont) => states.push(new BreakState(store, lkont, kont)),
        alloc,
        kalloc,
        // getSstorei: () => sstorei,
        increaseSstorei: () => ++sstorei,

        // not for semantics? (but are used!)
        contexts,
        stacks,
        enqueueJob,
        nextJob,

        states
      }

  function enqueueJob(job)
  {
    jobs.push(job);
  }

  function nextJob(store, lkont, kont)
  {
    const job = jobs.shift();
    if (job)
    {
      // console.debug("popped %o", job);
      job.execute(store, lkont, kont, machine);
    }
    else
    {
      // console.debug("no more jobs, done");
    }
  }

  function run()
  {
    const startTime = performance.now();
    const todo = [...machine.states];
    machine.states.length = 0;
    const endStates = new Set();
    while (todo.length > 0)
    {
      const s = todo.pop();
      s.next(semantics, machine);
      let length = 0;
      while (machine.states.length > 0)
      {
        const s2 = machine.states.pop();
        todo.push(s2);
        length++;
      }
      if (length === 0)
      {
        endStates.add(s);
      }
      if (length > 1)
      {
        throw new Error("Nondeterministic prelude at " + s);
      }
    }
    // if (endStates.size !== 1) // maybe check this in a dedicated concExplore? Also: if no preludes, then this fails!!!!
    // {
    //   throw new Error("wrong number of prelude results: " + endStates.size);
    // }

    const system = {time: performance.now() - startTime, 
      endState: [...endStates][0], 
      semantics, alloc, kalloc,
      kont0: contexts[0]};
    return system;
  }

  function explore(exploreCc)
  {
    exploreCc = exploreCc || {};

    const startTime = performance.now();
    const stateRegistry = exploreCc.stateRegistry || new StateRegistry();
    const endStates = new Set();
    const initialStatesInterned = machine.states.map(function (s)   // invariant: all to-do states are interned
    {
      const s2 = stateRegistry.getState(s);
      return s2;
    });

    // const stores = [];

    const todo = [...initialStatesInterned]; // additional copy to be able to return initialStatesInterned
    machine.states.length = 0;
    while (todo.length > 0)
    {
      const s = todo.pop();
      // assert(typeof s._id === "number");
      // console.log("popped " + s._id + " s._sstorei " + s._sstorei + " (" + sstorei + ")" + " ctx id " + s.kont._id);
      // if (s.isEvalState) {console.log("EVAL " + s.node)}
      // else if (s.isKontState) {console.log("KONT " + s.value + " " + s.toString())}
      // else if (s.isReturnState) {console.log("RET " + s.value)}
      // else if (s.isThrowState) {console.log("THROW " + s.msg)}

      // let found = false;
      // for (const st of stores)
      // {
      //   if (s.store.equals(st))
      //   {
      //     found = true;
      //     break;
      //   }
      // }
      // if (found)
      // {
      //   // console.log(s._id + ": existing store");
      //   1+1;
      // }
      // else
      // {
      //   console.log(s._id + ": new store " + stores.length);
      //   stores.push(s.store);
      // }

      // if (s.kont._sstorei > sstorei)
      // {
      //   sstorei = s.kont._sstorei;
      // }

      if (s._sstorei === sstorei)
      {
        continue;
      }
      s._sstorei = sstorei;

      // if (s._id === 587)
      // {
      //   break;
      // }

      s.next(semantics, machine); // `states` gets pushed

      s._successors = [];
      if (machine.states.length === 0)
      {
        endStates.add(s);
        // console.log("end state", s._id);
        continue;
      }
      while (machine.states.length > 0)
      {
        const successor = machine.states.pop();
        const successorGc = successor.gc(semantics);
        const successorInterned = stateRegistry.getState(successorGc);
        s._successors.push(successorInterned);
        todo.push(successorInterned);
        
        // successorInterned.store.diff(s.store);
        
        if (successor === successorInterned) // new state 
        {
          if (stateRegistry.states.length % 10000 === 0)
          {
            console.log(Formatter.displayTime(performance.now() - startTime), "states", stateRegistry.states.length, "todo", todo.length, "contexts", contexts.length);
          }
        }
      }
      // console.log(s._id + " -> " + s._successors.map(ss => ss._id).join(","));
      if (stateRegistry.states.length > 100_000)
      {
        console.log("STATE SIZE LIMIT", stateRegistry.states.length);
        break;
      }
    }

    const statistics = {};
    statistics.numStatesVisited = stateRegistry.states.length;
    let initialStatesResult;
    const reachable = reachableStates(initialStatesInterned);
    statistics.numStatesReachable = reachable.length;
    markResources(reachable);
    if (pruneGraphOption)
    {
      const initialStatesPruned = pruneMarkedGraph(initialStatesInterned);
      const reachablePruned = reachableStates(initialStatesPruned); // fold count into pruneMarkedGraph
      statistics.pruned = true;
      statistics.numStatesReachablePruned = reachablePruned.length;
      initialStatesResult = initialStatesPruned;
    }
    else
    {
      statistics.pruned = false;
      console.warn("not pruning graph");
      initialStatesResult = initialStatesInterned;
    }
    const system = {time: performance.now() - startTime, 
      states:stateRegistry.states, initialStates: initialStatesResult, endStates,
      kont0: contexts[0], statistics};
    return system;
  }

  return {machine, run, explore};
}


// function retrieveEndStates(initial) // not used for the moment
// {
//   var todo = [initial];
//   var result = ArraySet.empty();
//   while (todo.length > 0)
//   {
//     var s = todo.pop();
//     if (s._result)
//     {
//       continue;
//     }
//     s._result = true;
//     var successors = s._successors;
//     if (successors.length === 0)
//     {
//       result = result.add(s);
//     }
//     else
//     {
//       todo = todo.concat(successors.map(function (t) {return t.state}));
//     }
//   }
//   return result;
// }

export function isSuccessState(s)
{
  return s.isKontState && s.value && s.lkont.length === 0 && s.kont._stacks.size === 0;
}

export function StateRegistry()
{
  this.kont2states = new Array(2048);
  this.states = []; // do not pre-alloc
}

StateRegistry.prototype.getState =
    function (s)
    {
      let statesReg = this.kont2states[s.kont._id];
      if (!statesReg)
      {
        statesReg = new Array(7);
        this.kont2states[s.kont._id] = statesReg;
      }
      let stateReg = null;
      if (s.isEvalState)
      {
        stateReg = statesReg[0];
        if (!stateReg)
        {
          stateReg = [];
          statesReg[0] = stateReg;
        }
      }
      else if (s.isKontState)
      {
        stateReg = statesReg[1];
        if (!stateReg)
        {
          stateReg = [];
          statesReg[1] = stateReg;
        }
      }
      else if (s.isReturnState)
      {
        stateReg = statesReg[2];
        if (!stateReg)
        {
          stateReg = [];
          statesReg[2] = stateReg;
        }
      }
      else if (s.isThrowState)
      {
        stateReg = statesReg[3];
        if (!stateReg)
        {
          stateReg = [];
          statesReg[3] = stateReg;
        }
      }
      else if (s.isBreakState)
      {
        stateReg = statesReg[4];
        if (!stateReg)
        {
          stateReg = [];
          statesReg[4] = stateReg;
        }
      }
      else if (s.isErrorState)
      {
        stateReg = statesReg[5];
        if (!stateReg)
        {
          stateReg = [];
          statesReg[5] = stateReg;
        }
      }
      for (let i = 0; i < stateReg.length; i++)
      {
        if (stateReg[i].equals(s))
        {
          return stateReg[i];
        }
      }
      s._id = this.states.push(s) - 1;
      stateReg.push(s);
      return s;
    }

function reachableStates(initialStates)
{
  const result = [];
  const V = [];
  const W = [...initialStates];
  while (W.length > 0)
  {
    const s = W.pop();
    assert(typeof s._id === "number");
    if (V[s._id])
    {
      continue;
    }
    V[s._id] = true;
    result.push(s);
    s._successors && s._successors.forEach(s2 => W.push(s2));
  }
  return result;
}


function getResource(s)
{
  let resource;
  if (s.isEvalState)
  {
    resource = s.node.root.resource;
    if (resource.parentResource)
    {
      resource = resource.parentResource;
    }
    if (!s.kont.resource)
    {
      s.kont.resource = resource;
    }
  }
  else
  {
    resource = s.kont.resource;
  }

  if (!resource)
  {
    resource = "???";
  }
  return resource;
}

function markResources(states)
{
  states.forEach(s => s.resource = getResource(s));
}

function pruneMarkedGraph(initialStates)
{
  function isPreludeState(s)
  {
    const resource = s.resource;
    return resource && resource instanceof FileResource && resource.path.includes("prelude");
  }

  function scanForNonPreludeStates(W)
  {
    // const W = [...W2];
    const S = [];
    const nonPreludeStates = [];
    while (W.length > 0)
    {
      const s = W.pop();
      assert(typeof s._id === "number");
      if (S[s._id])
      {
        continue;
      }
      S[s._id] = true;
      if (isPreludeState(s))
      {
        s._successors.forEach(s2 => W.push(s2));
      }
      else
      {
        nonPreludeStates.push(s);
      }
    }
    return nonPreludeStates;
  }

  const W = [...initialStates].filter(s => !isPreludeState(s));
  const W2 = [...W];
  const S = [];
  while (W.length > 0)
  {
    const s = W.pop();
    assert(typeof s._id === "number");
    if (S[s._id])
    {
      continue;
    }
    S[s._id] = true;
    s._successors = scanForNonPreludeStates(s._successors || []);
    s._successors.forEach(s2 => W.push(s2));
  }
  return W2;
}

function EvalState(node, benv, store, lkont, kont)
{
  assertDefinedNotNull(node);
  assertDefinedNotNull(kont);
  this.node = node;
  this.benv = benv;
  this.store = store;
  this.lkont = lkont;
  this.kont = kont;
  this._successors = null;
  this._sstorei = -1;
  this._id = -1;
}

EvalState.prototype.isEvalState = true;

EvalState.prototype.toString =
    function ()
    {
      return "#eval " + this.node + this.kont;
    }
EvalState.prototype.nice =
    function ()
    {
      return "#eval " + this.node + " " + this.benv + " " + this.kont;
    }
EvalState.prototype.equals =
    function (x)
    {
      return (x instanceof EvalState)
          && this.node === x.node
          && (this.benv === x.benv || this.benv.equals(x.benv))
          && (this.store === x.store || this.store.equals(x.store))
          && (this.lkont === x.lkont || this.lkont.equals(x.lkont))
          && this.kont === x.kont
    }
EvalState.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      result = prime * result + this.lkont.hashCode();
      result = prime * result + this.kont.hashCode();
      return result;
    }
EvalState.prototype.next =
    function (semantics, machine)
    {
      return semantics.evaluate(this.node, this.benv, this.store, this.lkont, this.kont, machine);
    }
EvalState.prototype.gc =
    function (semantics)
    {
      const store = semantics.gc(this.store, this.addresses());
      return new EvalState(this.node, this.benv, store, this.lkont, this.kont)
    }
EvalState.prototype.addresses =
    function ()
    {
      var as = this.benv.addresses().join(this.kont.stackAddresses(this.lkont));
      return as;
    }

function KontState(value, store, lkont, kont)
{
  assertDefinedNotNull(value);
  assertDefinedNotNull(kont);
  this.value = value;
  this.store = store;
  this.lkont = lkont;
  this.kont = kont;
  this._successors = null;
  this._sstorei = -1;
  this._id = -1;
}

KontState.prototype.isKontState = true;

KontState.prototype.equals =
    function (x)
    {
      return (x instanceof KontState)
          && (this.value === x.value || this.value.equals(x.value))
          && (this.store === x.store || this.store.equals(x.store))
          && (this.lkont === x.lkont || this.lkont.equals(x.lkont))
          && this.kont === x.kont
    }
KontState.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.value.hashCode();
      result = prime * result + this.lkont.hashCode();
      result = prime * result + this.kont.hashCode();
      return result;
    }
KontState.prototype.toString =
    function ()
    {
      return "#kont-" + this.lkont[0];
    }
KontState.prototype.nice =
    function ()
    {
      return "(kont value:" + this.value + " lkont[0]:" + (this.lkont[0] ? this.lkont[0].nice() : "") + ")";
    }
KontState.prototype.next =
    function (semantics, machine)
    {
      return semantics.continue(this.value, this.store, this.lkont, this.kont, machine);
    }
KontState.prototype.gc =
    function ()
    {
      return this;
    }
KontState.prototype.addresses =
function ()
{
  return this.kont.stackAddresses(this.lkont).join(this.value.addresses());
}

KontState.prototype.callStacks =
function ()
{
  return callStacks(this.lkont, this.kont);
}

function ReturnState(value, store, lkont, kont)
{
  assertDefinedNotNull(kont);
  this.value = value;
  this.store = store;
  this.lkont = lkont;
  this.kont = kont;
  this._successors = null;
  this._sstorei = -1;
  this._id = -1;
}

ReturnState.prototype.isReturnState = true;

ReturnState.prototype.equals =
    function (x)
    {
      return x.isReturnState
          && (this.value === x.value || this.value.equals(x.value))
          && (this.store === x.store || this.store.equals(x.store))
          && (this.lkont === x.lkont || this.lkont.equals(x.lkont))
          && this.kont === x.kont
    }
ReturnState.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.value.hashCode();
      result = prime * result + this.lkont.hashCode();
      result = prime * result + this.kont.hashCode();
      return result;
    }
ReturnState.prototype.toString =
    function ()
    {
      return "#ret-" + this.lkont[0];
    }
ReturnState.prototype.nice =
    function ()
    {
      return "#ret-" + this.lkont[0];
    }
ReturnState.prototype.next =
    function (semantics, machine)
    {
      return semantics.return(this.value, this.store, this.lkont, this.kont, machine);
    }
ReturnState.prototype.gc =
    function ()
    {
      return this;
    }
ReturnState.prototype.addresses =
    function ()
    {
      return this.kont.addresses().join(this.value.addresses());
    }

function ThrowState(value, store, lkont, kont)
{
  assertDefinedNotNull(kont);
  this.value = value;
  this.store = store;
  this.lkont = lkont;
  this.kont = kont;
  this._sstorei = -1;
  this._successors = null;
  this._id = -1;
}

ThrowState.prototype.isThrowState = true;

ThrowState.prototype.equals =
    function (x)
    {
      return x.isThrowState
          && (this.value === x.value || this.value.equals(x.value))
          && (this.store === x.store || this.store.equals(x.store))
          && (this.lkont === x.lkont || this.lkont.equals(x.lkont))
          && this.kont === x.kont
    }
ThrowState.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.value.hashCode();
      result = prime * result + this.lkont.hashCode();
      result = prime * result + this.kont.hashCode();
      return result;
    }
ThrowState.prototype.toString =
    function ()
    {
      return "#throw-" + this.lkont[0];
    }
ThrowState.prototype.nice =
    function ()
    {
      return "#throw-" + this.lkont[0];
    }
ThrowState.prototype.next =
    function (semantics, machine)
    {
      return semantics.throw(this.value, this.store, this.lkont, this.kont, machine);
    }
ThrowState.prototype.gc =
    function ()
    {
      return this;
    }
ThrowState.prototype.addresses =
    function ()
    {
      return this.kont.stackAddresses(this.lkont).join(this.value.addresses());
    }
ThrowState.prototype.stackTrace =
    function ()
    {
      const buf = [];
      //walkStack(this.kont, buf);
      return buf.join("\n");
    }

function BreakState(store, lkont, kont)
{
  assertDefinedNotNull(kont);
  this.store = store;
  this.lkont = lkont;
  this.kont = kont;
  this._successors = null;
  this._sstorei = -1;
  this._id = -1;
}

BreakState.prototype.isBreakState = true;

BreakState.prototype.equals =
    function (x)
    {
      return x.isBreakState
          && (this.store === x.store || this.store.equals(x.store))
          && (this.lkont === x.lkont || this.lkont.equals(x.lkont))
          && this.kont === x.kont
    }
BreakState.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.lkont.hashCode();
      result = prime * result + this.kont.hashCode();
      return result;
    }
BreakState.prototype.toString =
    function ()
    {
      return "#break-" + this.lkont[0];
    }
BreakState.prototype.nice =
    function ()
    {
      return "#break-" + this.lkont[0];
    }
BreakState.prototype.next =
    function (semantics, machine)
    {
      return semantics.break(this.store, this.lkont, this.kont, machine);
    }
BreakState.prototype.gc =
    function ()
    {
      return this;
    }
BreakState.prototype.addresses =
    function ()
    {
      return this.kont.stackAddresses(this.lkont);
    }

function ErrorState(node, msg, store, kont)
{
  assertDefinedNotNull(kont);
  this.node = node;
  this.msg = msg;
  this.store = store;
  this.kont = kont;
  this._successors = null;
  this._sstorei = -1;
  this._id = -1;
}

ErrorState.prototype.isErrorState = true;

ErrorState.prototype.toString =
    function ()
    {
      return this.msg;
    }
ErrorState.prototype.nice =
    function ()
    {
      return this.msg;
    }
ErrorState.prototype.equals =
    function (x)
    {
      return x.isErrorState
          && this.node === x.node
          && this.msg === x.msg
          && (this.store === x.store || this.store.equals(x.store))
          && this.kont == kont
    }
ErrorState.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.msg.hashCode();
      result = prime * result + this.kont.hashCode();
      return result;
    }
ErrorState.prototype.next =
    function (semantics, machine)
    {
      return [];
    }
ErrorState.prototype.gc =
    function ()
    {
      return this;
    }
ErrorState.prototype.addresses =
    function ()
    {
      return EMPTY_ADDRESS_SET;
    }

