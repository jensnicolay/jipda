import {ArraySet, HashMap, HashCode, Sets, Formatter, assert, assertDefinedNotNull, assertFalse} from './common.mjs';
import {FileResource} from "./ast.mjs";
import {initialStatesToDot, statesToDot} from "./export/dot-graph.mjs";
import Store from "./store.mjs";

export function initializeMachine(semantics, alloc, kalloc, ...resources)
{
  const machineConfig = createMachine(semantics, Store.empty(), undefined, alloc, kalloc, {errors:true, hardAsserts:true});
  const kont0 = semantics.initialize(machineConfig.machine);
  for (const resource of resources)
  {
    //console.info("enqueing %s", resource);
    semantics.enqueueScriptEvaluation(resource, machineConfig.machine);
  }
  // console.debug("running %i init resources", resources.length);
  const startTime = Date.now();
  machineConfig.machine.nextJob([], kont0);
  const system0 = machineConfig.run();
  const duration = Date.now() - startTime;
  // console.debug("initialization took %i ms", duration);
  return system0;
}

function createInternalMachine(semantics, store, kont, alloc, kalloc)
{
  assertDefinedNotNull(kont);

  function explore(resource, cc)
  {
    const machineConfig = createMachine(semantics, store, kont, alloc, kalloc, Object.assign((cc || {}), {errors: true, hardAsserts: true}));
    semantics.enqueueScriptEvaluation(resource, machineConfig.machine);
    const system = machineConfig.explore(machineConfig.machine.nextJob([], kont));
    return system;
  }

  function switchConfiguration(semantics, alloc, kalloc, cc)
  {
    return createInternalMachine(semantics, store, kont, alloc, kalloc, cc);
  }

  return {explore, switchConfiguration, semantics};
}

export function createEvalMachine(system)
{
  return createInternalMachine(system.semantics, system.store, system.kont0, system.alloc, system.kalloc);
}

export function createMachine(semantics, store, kont0, alloc, kalloc, cc)
{
  cc = cc || {};
  // const rootSet = cc.rootSet || ArraySet.empty();
  const pruneGraphOption = cc.pruneGraph === undefined ? true : cc.pruneGraph;

  // `store` (param) is shortcut to stores[stores.length - 1]
  const stores = [store];

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
        evaluate: (exp, benv, lkont, kont) => states.push(new EvalState(exp, benv, store, lkont, kont)),
        continue: (value, lkont, kont) => states.push(new KontState(value, store, lkont, kont)),
        return: (value, lkont, kont) => states.push(new ReturnState(value, store, lkont, kont)),
        throw: (value, lkont, kont) => states.push(new ThrowState(value, store, lkont, kont)),
        break: (lkont, kont) => states.push(new BreakState(store, lkont, kont)),
        alloc,
        kalloc,
        // getSstorei: () => sstorei,
        increaseSstorei: () => ++sstorei,
        storeAlloc, storeUpdate, storeLookup,
        //initialize: initialState => semantics.initialize(initialState, this)

        // not for semantics? (but are used!)
        contexts,
        stacks,
        enqueueJob,
        nextJob,

        states
      }

  function storeLookup(addr)
  {
    // if (addr === 155)
    // {
    //   console.log("!! lookup")
    // }

    const value = store.get(addr);
    if (value)
    {
      return value;
    }
    throw new Error("no value at address " + addr);
  }

  function storeAlloc(addr, value)
  {

    // if (addr === 81)
    // {
    //   console.log("!! alloc 81")
    // }

    //assert(addr>>>0===addr);
    assert(value);
    assert(value.toString);
    assert(value.addresses);
    if (store.has(addr))
    {
      const current = store.get(addr);
      const updated = semantics.lat.update(current, value);
      if (!current.equals(updated))
      {
        store = store.set(addr, updated);
        stores.push(store);
        // console.log("alloc fresh " + addr);
      }
    }
    else
    {
      store = store.set(addr, value);
      stores.push(store);
      // console.log("alloc update " + addr);
    }
  }

  function storeUpdate(addr, value)
  {
    // if (addr === 81)
    // {
    //   console.log("!! update 81")
    // }
    //
    // if (addr === 155)
    // {
    //   console.log("!! update 155")
    // }

    //assert(addr>>>0===addr);
    assert(value);
    assert(value.toString);
    assert(value.addresses);
    const current = store.get(addr);
    const updated = semantics.lat.update(current, value);
    if (!current.equals(updated))
    {
      store = store.set(addr, updated);
      stores.push(store);
      // console.log("update " + addr);
    }
  }

  function enqueueJob(job)
  {
    jobs.push(job);
  }

  function nextJob(lkont, kont)
  {
    const job = jobs.shift();
    if (job)
    {
      // console.debug("popped %o", job);
      job.execute(lkont, kont, machine);
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
    //console.log("prelude time: " + prelSystem.time);
    if (endStates.size !== 1) // maybe check this in a dedicated concExplore?
    {
      throw new Error("wrong number of prelude results: " + endStates.size);
    }

    const system = {time: performance.now() - startTime, 
      endState: [...endStates][0], 
      semantics, alloc, kalloc,
      store, kont0: contexts[0]};
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
    const todo = [...initialStatesInterned]; // additional copy to be able to return initialStatesInterned
    machine.states.length = 0;
    while (todo.length > 0)
    {
      const s = todo.pop();
      // console.log("popped " + s._id + " storei " + stores.indexOf(s.store) + " (" + (stores.length-1) + ") sstorei " + s._sstorei + " (" + sstorei + ")" + " ctx id " + s.kont._id);
      // if (s.isEvalState) {console.log("EVAL " + s.node)}
      // else if (s.isKontState) {console.log("KONT " + s.value)}
      // else if (s.isReturnState) {console.log("RET " + s.value)}
      // else if (s.isThrowState) {console.log("THROW " + s.msg)}

      // if (s.kont._sstorei > sstorei)
      // {
      //   sstorei = s.kont._sstorei;
      // }

      if (s._sstorei === sstorei)
      {
        continue;
      }
      s._sstorei = sstorei;

      s.next(semantics, machine); // `states` gets pushed

      s._successors = [];
      if (machine.states.length === 0)
      {
        endStates.add(s);
        // console.log("end state", s._id);
        continue;
      }
      // console.log(s._id + " -> " + machine.states.map(s => s._id).join());
      while (machine.states.length > 0)
      {
        const successor = machine.states.pop();
        const successorInterned = stateRegistry.getState(successor);
        s._successors.push(successorInterned);
        todo.push(successorInterned);
        if (successor === successorInterned) // new state 
        {
          if (stateRegistry.states.length % 10000 === 0)
          {
            console.log(Formatter.displayTime(performance.now() - startTime), "states", stateRegistry.states.length, "todo", todo.length, "stores", stores.length, "contexts", contexts.length);
          }
        }
      }
      if (stateRegistry.states.length > 10000)
      {
        // do this after treating successors so they are present on state and interned
        console.log("STATE SIZE LIMIT", stateRegistry.states.length);
        break;
      }
    }
    let initialStatesResult;
    if (false)//pruneGraphOption)
    {
      markResources(initialStatesInterned);
      const initialStatesPruned = pruneGraph(initialStatesInterned);
      initialStatesResult = initialStatesPruned;
    }
    else
    {
      // console.warn("not pruning graph");
      initialStatesResult = initialStatesInterned;
    }
    const system = {time: performance.now() - startTime, 
      states:stateRegistry.states, initialStates: initialStatesResult, endStates,
      store, kont0: contexts[0]};
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


function markResources(initialStates)
{

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


  const W = [...initialStates];
  while (W.length > 0)
  {
    const s = W.pop();
    if (s.resource)
    {
      continue;
    }
    let resource = getResource(s);
    s.resource = resource;
    s._successors && s._successors.forEach(s2 => W.push(s2));
  }
}

function pruneGraph(initialStates)
{
  function preludeState(s)
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
      if (S[s._id])
      {
        continue;
      }
      S[s._id] = true;
      if (preludeState(s))
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

  const W = [...initialStates].filter(s => !preludeState(s));
  const W2 = [...W];
  const S = [];
  while (W.length > 0)
  {
    const s = W.pop();
    if (S[s._id])
    {
      continue;
    }
    S[s._id] = true;
    s._successors = scanForNonPreludeStates(s._successors);
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
          && this.store === x.store
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
      return semantics.evaluate(this.node, this.benv, this.lkont, this.kont, machine);
    }
// EvalState.prototype.gc =
//     function ()
//     {
//       return new EvalState(this.node, this.benv, Agc.collect(this.store, this.addresses()), this.lkont, this.kont);
//     }
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
          && this.store === x.store
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
      return semantics.continue(this.value, this.lkont, this.kont, machine);
    }

// KontState.prototype.gc =
//     function ()
//     {
//       return this;
//     }

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
          && this.store === x.store
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
      return semantics.return(this.value, this.lkont, this.kont, machine);
    }

// ReturnState.prototype.gc =
//     function ()
//     {
//       return this;
//     }
ReturnState.prototype.addresses =
    function ()
    {
      return this.kont.addresses().join(this.value.addresses());
    }

function ThrowState(value, store, lkont, kont)
{
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
          && this.store === x.store
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
      return semantics.throw(this.value, this.lkont, this.kont, machine);
    }

// ThrowState.prototype.gc =
//     function ()
//     {
//       return this;
//     }
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
          && this.store === x.store
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
      return semantics.break(this.lkont, this.kont, machine);
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
          && this.store === x.store
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

