import {ArraySet, HashMap, HashCode, Sets, Formatter, assert, assertDefinedNotNull, assertFalse} from './common.mjs';

export function createMachine(semantics, cc)
{
  const gcFlag = cc.gc === undefined ? true : cc.gc;
  const initializers = Array.isArray(cc.initializers) ? cc.initializers : [];
  const hardSemanticAsserts = cc.hardAsserts === undefined ? false : cc.hardAsserts;
  
  const machine =
      {
        evaluate: (exp, benv, store, lkont, kont) => new EvalState(exp, benv, store, lkont, kont),
        continue: (value, store, lkont, kont) => new KontState(value, store, lkont, kont),
        return: (value, store, lkont, kont) => new ReturnState(value, store, lkont, kont),
        throw: (value, store, lkont, kont) => new ThrowState(value, store, lkont, kont),
        break: (store, lkont, kont) => new BreakState(store, lkont, kont)
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
          const as = this.addresses();
          store = semantics.gc(this.store, as);
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
        return kont.stackAddresses(lkont).join(this.value.addresses());
      }
  KontState.prototype.enqueueScriptEvaluation =
      function (src)
      {
        let store = this.store;
        store = semantics.enqueueScriptEvaluation(src, store);
        return new KontState(this.value, store, this.lkont, this.kont);
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
        return kont.addresses().join(this.value.addresses());
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
        return kont.stackAddresses(lkont).join(this.value.addresses());
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
        return kont.stackAddresses(lkont);
      }
  
  function ErrorState(node, msg, kont)
  {
    this.node = node;
    this.msg = msg;
    this.kont = kont;
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
  
  return semantics.initialize(cc.initialState, machine);
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

export function computeResultValue(endStates, bot)
{
  var result = bot;
  var msgs = [];
  endStates.forEach(
    function (s)
    {
      if (s.value && s.lkont.length === 0 && s.kont._stacks.size === 0)
      {
        result = result.join(s.value);
      }
      else if (s.constructor.name  === "ThrowState") // TODO coupling to impl
      {
        msgs.push("Unhandled exception " + s.value);
      }
      else if (s.constructor.name  === "ErrorState") // TODO coupling to impl
      {
        msgs.push("line " + s.node.loc.start.line + ": " + s.msg);
      }
      else
      {
        msgs.push("WARNING: no successors for " + s + " (" + (s.node) + ")");
      }
    });
  return {value:result, msgs:msgs};
}

export function explore(initialStates)
{
  
  function stateGet(s)
  {
    let statesReg = kont2states[s.kont._id];
    if (!statesReg)
    {
      statesReg = new Array(7);
      kont2states[s.kont._id] = statesReg;
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
    s._id = states.push(s) - 1;
    stateReg.push(s);
    return s;
  }
  
  const kont2states = new Array(2048);
  const states = []; // do not pre-alloc
  var startTime = performance.now();
  var id = 0;
  const todo = initialStates.map(stateGet);
  var result = new Set();
  let sstorei = -1;
  while (todo.length > 0)
  {
    if (states.length > 100000)
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
    var next = s._successors;
    if (next && s.isEvalState)
    {
      for (const s2 of next)
      {
        todo.push(s2);
      }
      continue;
    }
    next = s.next();
    s._successors = next;
    if (next.length === 0)
    {
      result.add(s);
      continue;
    }
    // if (next.length > 1)
    // {
    //   print("branch", next.length, s.nice());
    //   //printCallStacks(Stackget(new Stack(s.lkont, s.kont)).unroll());
    // }
    for (var i = 0; i < next.length; i++)
    {
      var s2 = next[i];
      var ss2 = stateGet(s2);
      if (ss2 !== s2)
      {
        next[i] = ss2;
        todo.push(ss2);
        continue;
      }
      todo.push(ss2);
      if (states.length % 10000 === 0)
      {
        console.log(Formatter.displayTime(performance.now() - startTime), "states", states.length, "todo", todo.length, "ctxs", "contexts.length", "sstorei", sstorei);
      }
    }
  }
  return {result, states, time: performance.now() - startTime};
}

export function run(initialStates)
{
  const startTime = performance.now();
  const todo = initialStates;
  const result = new Set();
  while (todo.length > 0)
  {
    const s = todo.pop();
    const next = s.next();
    if (next.length === 0)
    {
      result.add(s);
      continue;
    }
    for (const s2 of next)
    {
      todo.push(s2);
    }
  }
  return {result, time: performance.now() - startTime};
}

export function computeInitialCeskState(semantics, ...srcs)
{
  let s0 = createMachine(semantics, {errors:true, hardAsserts:true});
  let s1 = srcs.reduce((state, src) => state.enqueueScriptEvaluation(src), s0);
  const prelSystem = run([s1]);
  console.log("prelude time: " + prelSystem.time);
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
