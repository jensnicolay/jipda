import {ArraySet, HashMap, HashCode, Sets, Formatter, assert, assertDefinedNotNull, assertFalse} from './common.mjs';
import {FileResource} from "./ast";

export function createMachine(semantics, alloc, kalloc, cc)
{
  const gcFlag = cc.gc === undefined ? true : cc.gc;
  //const initializers = Array.isArray(cc.initializers) ? cc.initializers : [];
  //const hardSemanticAsserts = cc.hardAsserts === undefined ? false : cc.hardAsserts;

  const rootSet = cc.rootSet || ArraySet.empty();
  const machine =
      {
        evaluate: (exp, benv, store, lkont, kont) => new EvalState(exp, benv, store, lkont, kont),
        continue: (value, store, lkont, kont) => new KontState(value, store, lkont, kont),
        return: (value, store, lkont, kont) => new ReturnState(value, store, lkont, kont),
        throw: (value, store, lkont, kont) => new ThrowState(value, store, lkont, kont),
        break: (store, lkont, kont) => new BreakState(store, lkont, kont),
        alloc,
        kalloc
        //initialize: initialState => semantics.initialize(initialState, this)
      }
  
  function EvalState(node, benv, store, lkont, kont)
  {
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
            && (this.lkont === x.lkont || this.lkont.equals(x.lkont))
            && (this.kont === x.kont || this.kont.equals(x.kont))
            && (this.store === x.store || this.store.equals(x.store))
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
      function ()
      {
        let store;
        if (gcFlag)
        {
          const as = this.addresses().join(rootSet);
          store = semantics.gc(this.store, as);
          // console.log("gc " + rootSet);
          // console.log(store.diff(this.store));
        }
        else
        {
          store = this.store;
        }
        return semantics.evaluate(this.node, this.benv, store, this.lkont, this.kont, machine);
      }
  EvalState.prototype.gc =
      function ()
      {
        return new EvalState(this.node, this.benv, Agc.collect(this.store, this.addresses()), this.lkont, this.kont);
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
    assertDefinedNotNull(store);
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
            && (this.lkont === x.lkont || this.lkont.equals(x.lkont))
            && (this.kont === x.kont)
            && (this.store === x.store || this.store.equals(x.store))
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
      function ()
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
  KontState.prototype.enqueueScriptEvaluation =
      function (resource)
      {
        let store = this.store;
        store = semantics.enqueueScriptEvaluation(resource, store);
        return new KontState(this.value, store, this.lkont, this.kont);
      }
    KontState.prototype.enqueueJob =
      function (job)
      {
        let store = this.store;
        store = semantics.enqueueJob("ScriptJobs", job, store);
        return new KontState(this.value, store, this.lkont, this.kont);
      }

  KontState.prototype.switchMachine =
      function (semantics, alloc, kalloc, cc)
      {
        const machine = createMachine(semantics, alloc, kalloc, cc);
        return machine.continue(this.value, this.store, this.lkont, this.kont);
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
        return (x instanceof ReturnState)
            && (this.value === x.value || this.value.equals(x.value))
            && (this.lkont === x.lkont || this.lkont.equals(x.lkont))
            && (this.kont === x.kont)
            && (this.store === x.store || this.store.equals(x.store))
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
      function ()
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
    this.value = value;
    this.store = store;
    this.lkont = lkont;
    this.kont = kont;
    this._successors = null;
    this._sstorei = -1;
    this._id = -1;
  }
  
  ThrowState.prototype.isThrowState = true;
  
  ThrowState.prototype.equals =
      function (x)
      {
        return (x instanceof ThrowState)
            && (this.value === x.value || this.value.equals(x.value))
            && (this.lkont === x.lkont || this.lkont.equals(x.lkont))
            && (this.kont === x.kont)
            && (this.store === x.store || this.store.equals(x.store))
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
      function ()
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
        walkStack(this.kont, buf);
        return buf.join("\n");
      }

function walkStack(kont, buf, S = new Set())
{
  if (S.has(kont))
  {
    buf.push("(already visited)");
  }
  S.add(kont);

  if (kont.ex)
  {
    buf.push(kont.ex.toString());
  }
  else
  {
    buf.push("(bottom)");
  }

  for (const stack of kont._stacks)
  {
    walkStack(stack.kont, buf, S);
  }
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
        return (x instanceof BreakState)
            && (this.lkont === x.lkont || this.lkont.equals(x.lkont))
            && (this.kont === x.kont)
            && (this.store === x.store || this.store.equals(x.store))
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
      function ()
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
  
  function ErrorState(node, msg, kont)
  {
    this.node = node;
    this.msg = msg;
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
        return (x instanceof ErrorState)
            && this.node === x.node
            && this.msg === x.msg
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
      function ()
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
  
  //return semantics.initialize(cc.initialState, machine);
  return machine;
}

function retrieveEndStates(initial) // not used for the moment
{
  var todo = [initial];
  var result = ArraySet.empty();
  while (todo.length > 0)
  {
    var s = todo.pop();
    if (s._result)
    {
      continue;
    }
    s._result = true;
    var successors = s._successors; 
    if (successors.length === 0)
    {
      result = result.add(s);
    }
    else
    {
      todo = todo.concat(successors.map(function (t) {return t.state}));      
    }
  }
  return result;
}

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

export function explore(initialStates,
                        onEndState = s => undefined,
                        onNewState = s => undefined,
                        onNewTransition = (s0, s1) => undefined,
                        stateReg) // optional
{
  const stateRegistry = stateReg || new StateRegistry();
  var startTime = performance.now();
  const initialStatesInterned = initialStates.map(function (s)   // invariant: all to-do states are interned
  {
    const s2 = stateRegistry.getState(s);
    if (s2 === s) // new state
    {
      onNewState(s2);
    }
    return s2;
  });
  const todo = [...initialStatesInterned]; // additional copy to be able to return initialStatesInterned
  var result = new Set();
  let sstorei = -1;
  while (todo.length > 0)
  {
    if (stateRegistry.states.length > 100000)
    {
      console.log("STATE SIZE LIMIT", states.length);
      break;
    }
    var s = todo.pop();
    if (s.kont._sstorei > sstorei)
    {
      sstorei = s.kont._sstorei;
    }
    if (s._sstorei === sstorei)
    {
      continue;
    }
    s._sstorei = sstorei;
    const knownSuccessors = s._successors;
    if (knownSuccessors && s.isEvalState)
    {
      for (const knownSuccessor of knownSuccessors)
      {
        todo.push(knownSuccessor);
      }
      continue;
    }
    const next = [...s.next()];
    s._successors = next;
    if (next.length === 0)
    {
      onEndState(s);
      continue;
    }
    for (let i = 0; i < next.length; i++)
    {
      const successor = next[i];
      const successorInterned = stateRegistry.getState(successor);
      if (successor !== successorInterned) // existing state
      {
        if (!knownSuccessors || !knownSuccessors.includes(successorInterned)) // new transition
        {
          onNewTransition(s, successorInterned);
        }
        next[i] = successorInterned;
        todo.push(successorInterned);
        continue;
      }
      else // new state, so new transition
      {
        onNewState(successorInterned);
        onNewTransition(s, successorInterned);
      }
      todo.push(successorInterned);
      if (stateRegistry.states.length % 10000 === 0)
      {
        console.log(Formatter.displayTime(performance.now() - startTime), "states", stateRegistry.states.length, "todo", todo.length, "ctxs", "contexts.length", "sstorei", sstorei);
      }
    }
  }
  markResources(initialStatesInterned);
  const initialStatesPruned = pruneGraph(initialStatesInterned);
  return {time: performance.now() - startTime, states:stateRegistry.states, initialStates: initialStatesPruned};
}

export function run(initialStates,
                    endState = s => undefined)
{
  const startTime = performance.now();
  const todo = initialStates;
  while (todo.length > 0)
  {
    const s = todo.pop();
    const next = s.next();
    let length = 0;
    for (const s2 of next)
    {
      length++;
      todo.push(s2);
    }
    if (length === 0)
    {
      endState(s);
    }
  }
  return {time: performance.now() - startTime};
}

export function computeInitialCeskState(semantics, alloc, kalloc, ...resources)
{
  const machine = createMachine(semantics, alloc, kalloc, {errors:true, hardAsserts:true});
  const s0 = semantics.initialize(machine);
  const s1 = resources.reduce((state, resource) => state.enqueueScriptEvaluation(resource), s0);
  const resultStates = new Set();
  const prelSystem = run([s1], s => resultStates.add(s));
  //console.log("prelude time: " + prelSystem.time);
  if (resultStates.size !== 1) // maybe check this in a dedicated concExplore?
  {
    throw new Error("wrong number of prelude results: " + resultStates.size);
  }
  const prelState = [...resultStates][0];
  return prelState;
}

function markResources(initialStates)
{
  const W = [...initialStates];
  const S = [];
  const resources = [];
  let currentCtx = null;
  while (W.length > 0)
  {
    const s = W.pop();
    if (S[s._id])
    {
      continue;
    }
    S[s._id] = true;
    const ctx = s.kont;
    let resource = resources[ctx._id];
    if (ctx !== currentCtx)
    {
      if (!resource)
      {
        //assert(s.isEvalState);
        if (s.isEvalState)
        {
          resource = s.node.root.resource;
          if (resource.parentResource)
          {
            resource = resource.parentResource;
          }
          resources[ctx._id] = resource;
        }
      }
    }
    s.resource = resource;
    s._successors.forEach(s2 => W.push(s2));
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
