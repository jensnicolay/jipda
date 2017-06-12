"use strict";

const EMPTY_LKONT = [];
const EMPTY_ADDRESS_SET = ArraySet.empty();

function jsCesk(cc)
{
  // address allocator
  if (!cc.a)
  {
    throw new Error("no a specified"); // TODO names
  }
  var a = cc.a;
  
  // stack allocator
  if (!cc.kalloc)
  {
    throw new Error("no kalloc specified");
  }
  const kalloc = cc.kalloc;
  
  // // native allocator
  // if (!cc.nalloc)
  // {
  //   throw new Error("no nalloc specified");
  // }
  // const nalloc = cc.nalloc;
  
  // lattice
  const l = cc.l || new TypeLattice();
  // gc
  const gcFlag = cc.gc === undefined ? true : cc.gc;
  //
  const errors = cc.errors === undefined ? false : cc.errors;
  //
  const lenient = cc.lenient === undefined ? false : cc.lenient;
  
  const initializers = Array.isArray(cc.initializers) ? cc.initializers : [];
  
  //const helpers = cc.helpers;
  
  assert(a);
  assert(l);
  
  //print("alloc", a, "lat", l, "gc", gcFlag);
  
  // user lattice constants
  const L_UNDEFINED = l.abst1(undefined);
  const L_NULL = l.abst1(null);
  const L_0 = l.abst1(+0);
  const L_MIN0 = l.abst1(-0);
  const L_1 = l.abst1(1);
  const L_NAN = l.abst1(NaN);
  const L_TRUE = l.abst1(true);
  const L_FALSE = l.abst1(false);
  const L_MININFINITY = l.abst1(-Infinity);
  const L_EMPTY_STRING = l.abst1("");
  const P_PROTOTYPE = l.abst1("prototype");
  const P_CONSTRUCTOR = l.abst1("constructor");
  const P_LENGTH = l.abst1("length");
  const P_MESSAGE = l.abst1("message");
  
  function SetValue(set)
  {
    this.set = set || new Set();
  }

  SetValue.from1 =
      function (x)
      {
        return new SetValue(new Set([x]));
      }

  SetValue.prototype.add =
      function (x)
      {
        return new SetValue(Sets.add(this.set, x));
      }

  SetValue.prototype.join =
      function (x)
      {
        if (x === BOT)
        {
          return this;
        }
        return new SetValue(Sets.union(this.set, x.set));
      }

  SetValue.prototype.addresses =
      function ()
      {
        let as = ArraySet.empty();
        for (const x of this.set)
        {
          as = as.join(x.addresses());
        }
        return as;
      }
  
  SetValue.prototype[Symbol.iterator] =
      function*()
      {
        yield* this.set;
      }
  
  function SetValueNoAddresses(set)
  {
    this.set = set || new Set();
  }
  
  SetValueNoAddresses.from1 =
      function (x)
      {
        return new SetValueNoAddresses(new Set([x]));
      }
  
  SetValueNoAddresses.prototype[Symbol.iterator] =
      function* ()
      {
        yield* this.set;
      }
      
  SetValueNoAddresses.prototype.add =
      function (x)
      {
        return new SetValueNoAddresses(Sets.add(this.set, x));
      }
  
  SetValueNoAddresses.prototype.join =
      function (x)
      {
        if (x === BOT)
        {
          return this;
        }
        return new SetValueNoAddresses(Sets.union(this.set, x.set));
      }
  
  SetValueNoAddresses.prototype.addresses =
      function ()
      {
        const as = ArraySet.empty();
        return as;
      }
  
  SetValue.prototype[Symbol.iterator] =
      function*()
      {
        yield* this.set;
      }
  
  function Intrinsics()
  {
    this.map = new Map();
  }
  
  Intrinsics.prototype.get =
      function (name)
      {
        if (!this.map.has(name))
        {
          throw new Error("unknown intrinsic: " + name);
        }
        return this.map.get(name);
      }
  
  Intrinsics.prototype.add =
      function (name, value)
      {
        if (this.map.has(name))
        {
          throw new Error("duplicate intrinsic: " + name);
        }
        this.map.set(name, value);
      }
  
  Intrinsics.prototype.has =
      function (name)
      {
        return this.map.has(name);
      }
  
  
  function JipdaContext(ex, thisValue, userContext, as)
  {
    assert(thisValue);
    assert(thisValue.addresses);
    assert(as instanceof ArraySet);
    this.ex = ex;
    this.thisValue = thisValue;
    this.userContext = userContext;
    this.as = as;
    this._stacks = null;
    this._id = -1;
  }
  
  JipdaContext.prototype.equals = // reminder: instances should be compared using === (after interning)
      function (ctx)
      {
        if (this === ctx)
        {
          return true;
        }
        return this.ex === ctx.ex
            && this.thisValue.equals(ctx.thisValue)
            && this.userContext.equals(ctx.userContext)
            && this.as.equals(ctx.as)
      }
  
  JipdaContext.prototype.intern =
      function (contexts)
      {
        for (let i = 0; i < contexts.length; i++)
        {
          if (this.equals(contexts[i]))
          {
            assertDefinedNotNull(contexts[i]._id);
            return contexts[i];
          }
        }
        this._id = contexts.push(this) - 1;
        return this;
      }
  
  JipdaContext.prototype.addresses =
      function ()
      {
        return this.as.join(this.thisValue.addresses());
      }
  
  JipdaContext.prototype.getReachableContexts =
      function ()
      {
        const reachable = new Set();
        const todo = [this];
        while (todo.length > 0)
        {
          const ctx = todo.pop();
          ctx._stacks.forEach((stack) =>
          {
            if (!reachable.has(stack.kont))
            {
              reachable.add(stack.kont);
              todo.push(stack.kont)
            }
          });
        }
        return reachable;
      }
  
  // JipdaContext.prototype.topmostApplicationReachable = // is context.ex reachable?
  //     function ()
  //     {
  //       return ([...this.getReachableContexts()].map((ctx) => ctx.ex).includes(this.ex));
  //     }
  
  JipdaContext.prototype.toString =
      function ()
      {
        return "[ctx#" + this._id + " app: " + (this.ex ? this.ex.tag : this.ex) + "]";
      }
  
  function createEnvironment(parents)
  {
    var benv = Benv.empty(parents);
    return benv;
  }
  
  function explore(ast, ceskState)
  {
    let sstorei = 0;
    let kcount = 0;
  
    const contexts = []; // do not pre-alloc
    const stacks = []; // do not pre-alloc
  
    let realm; // TODO thread through states
  
    function inject(node, ceskState)
    {
      if (!ceskState)
      {
        ceskState = initialize(Store.empty());
      }
      ceskState = initializeTraits(ceskState);
      const store = ceskState.store;
      realm = ceskState.realm; // TODO setting global realm
    
      assert(store);
      assert(realm);
    
      const kont = createContext(node, realm.GlobalObject, "globalctx", ArraySet.empty(), null);
      return new EvalState(node, Benv.empty(), store, [], kont);
    }
  
    function performExplore(initialStates)
    {
      const kont2states = new Array(2048);
      const states = []; // do not pre-alloc
      var startTime = performance.now();
      var id = 0;
      const todo = initialStates.map(stateGet);
      var result = new Set();
      while (todo.length > 0)
      {
        if (states.length > 20000)
        {
          print("STATE SIZE LIMIT", states.length);
          break;
        }
        var s = todo.pop();
        if (s._sstorei === sstorei)
        {
          continue;
        }
        s._sstorei = sstorei;
        var next = s._successors;
        if (next && s.isEvalState)
        {
          for (var i = 0; i < next.length; i++)
          {
            var t2 = next[i];
            var s2 = t2.state;
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
        for (var i = 0; i < next.length; i++)
        {
          var t2 = next[i];
          var s2 = t2.state;
          var ss2 = stateGet(s2);
          if (ss2 !== s2)
          {
            t2.state = ss2;
            todo.push(ss2);
            continue;
          }
          todo.push(ss2);
          if (states.length % 10000 === 0)
          {
            print(Formatter.displayTime(performance.now() - startTime), "states", states.length, "todo", todo.length, "ctxs", contexts.length, "sstorei", sstorei);
          }
        }
      }
      return {initial, result, states, contexts, realm, time: performance.now() - startTime};
    
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
    }
  
  
    ////////////////////////////////
  
  
    function Stack(lkont, kont)
    {
      return {lkont, kont, _id: -1}
    }
  
    function Stack_equals(st1, st2)
    {
      if (st1 === st2)
      {
        return true;
      }
      return st1.lkont.equals(st2.lkont)
          && st1.kont === st2.kont;
    }
  
    function Stackget(st)
    {
      for (let i = 0; i < stacks.length; i++)
      {
        if (Stack_equals(stacks[i], st))
        {
          return stacks[i];
        }
      }
      st._id = stacks.push(st) - 1;
      return st;
    }
  
    function stackAddresses(lkont, kont) // TODO put onto Context proto with sig `lkont`
    {
      var addresses = kont.addresses();
      for (var i = 0; i < lkont.length; i++)
      {
        var frame = lkont[i];
        addresses = addresses.join(frame.addresses());
      }
      return addresses;
    }
    
    function storeAlloc(store, addr, value)
    {
      //assert(addr>>>0===addr);
      assert(value);
      assert(value.toString);
      assert(value.addresses);
      return store.allocAval(addr, value);
    }
  
    function storeUpdate(store, addr, value)
    {
      //assert(addr>>>0===addr);
      assert(value);
      assert(value.toString);
      assert(value.addresses);
      return store.updateAval(addr, value);
    }
  
    function storeLookup(store, addr)
    {
      //assert(addr>>>0===addr);
      return store.lookupAval(addr);
    }
    
    function hasInternalProperty(obj, name)
    {
      let result = BOT;
      const prop = obj.getInternal(name);
      if (prop === BOT)
      {
        result = result.join(L_FALSE);
      }
      else
      {
        result = result.join(L_TRUE);
        if (!prop.must)
        {
          result = result.join(L_FALSE);
        }
      }
      return result;
    }
  
  
    //   function invokeMeta(name, operands, store, lkont, kont, as)
    // {
    //   const globala = realm.GlobalObject;
    //   const global = storeLookup(store, globala);
    //   const metaOperator = global.getInternal(name).value;
    //   if (!metaOperator)
    //   {
    //     throw new Error("meta operator not found: " + name);
    //   }
    //   //console.debug("invokeMeta", name);
    //   const addresses = stackAddresses(lkont, kont).join(as || ArraySet.empty());
    //   const kont2 = createContext(null, globala, name + kcount++/*userCtx*/, addresses, null);
    //   const result = runMeta(applyProc(null, metaOperator, operands, globala, null, store, [], kont2, []));
    //   return result;
    //
    //   function runMeta(initialTansitions)
    //   {
    //     const initialStates = initialTansitions.map((transition) => transition.state);
    //     const system = performExplore(initialStates);
    //     const resultStates = system.result;
    //     let value = BOT;
    //     let store = BOT;
    //     for (const resultState of resultStates)
    //     {
    //       if (resultState.isKontState)
    //       {
    //         value = value.join(resultState.value);
    //         store = store.join(resultState.store);
    //       }
    //       else
    //       {
    //         throw new Error("(TODO) meta call generated non-kont state: " + resultState);
    //       }
    //     }
    //     return {value, store};
    //   }
    // }
  
    function createArray()
    {
      var obj = new Obj();
      obj = obj.setInternal("[[Prototype]]", realm.Intrinsics.get("%ArrayPrototype%"));
  
      // 9.4.5.4 TODO: exotic [[Get]] for Integer Indexed Exotic Objects
      obj = obj.setInternal("[[Get]]", SetValueNoAddresses.from1(OrdinaryGet));
      
      // TODO temp
      obj = obj.setInternal("isArray", L_TRUE);
      return obj;
    }
    
    
    /// semantic helpers
    function assertIsObject(O)
    {
      assert(O.isRef());
    }
    
    function assertIsPropertyKey(P)
    {
      const result = IsPropertyKey(P);
      assert(result.isTrue());
    }
    
    function throwTypeError(msg, store, lkont, kont)
    {
      return {state: new ThrowState(l.abst1(msg), store, lkont, kont)};
    }
    ///
    
  
    // 6
    function Type(x)
    {
      let result = new Set();
      if (x.projectUndefined() !== BOT)
      {
        result.add(Types.Undefined);
      }
      if (x.projectNull() !== BOT)
      {
        result.add(Types.Null);
      }
      if (x.projectBoolean() !== BOT)
      {
        result.add(Types.Boolean);
      }
      if (x.projectString() !== BOT)
      {
        result.add(Types.String);
      }
      // if (x.projectSymbol() !== BOT)
      // {
      //   result = result.joinValue(Types.Symbol);
      // } TODO
      if (x.projectNumber() !== BOT)
      {
        result.add(Types.Number);
      }
      if (x.projectObject() !== BOT)
      {
        result.add(Types.Object);
      }
      return result;
    }
  
    // 6.1
    const Types = {};
    // 6.1.1
    Types.Undefined = new String("undefined");
    // 6.1.2
    Types.Null = new String("null");
    // 6.1.3
    Types.Boolean = new String("boolean");
    // 6.1.4
    Types.String = new String("string");
    // 6.1.5
    Types.Symbol = new String("symbol");
    // 6.1.6
    Types.Number = new String("number");
    // 6.1.7
    Types.Object = new String("object");
  
  
    // helper
    function projectNonNumber(value)
    {
      let result = BOT;
      result = result.join(value.projectUndefined());
      result = result.join(value.projectNull());
      result = result.join(value.projectBoolean());
      result = result.join(value.projectString());
      //result = result.join(value.projectSymbol()) TODO;
      result = result.join(value.projectObject());
      return result;
    }
  
    // 6.1.7.1
    function Property(Value, Get, Set, Writable, Enumerable, Configurable)
    {
      this.Value = Value;
      this.Get = Get;
      this.Set = Set;
      this.Writable = Writable;
      this.Enumerable = Enumerable;
      this.Configurable = Configurable;
    }
  
    Property.empty =
        function ()
        {
          return new Property(BOT, BOT, BOT, BOT, BOT, BOT);
        }
  
    Property.fromValue =
        function (value)
        {
          return new Property(value, BOT, BOT, BOT, BOT, BOT);
        }
  
    Property.prototype.equals =
        function (x)
        {
          return (x instanceof Property)
              && this.Value.equals(x.Value)
              && this.Get.equals(x.Get)
              && this.Set.equals(x.Set)
              && this.Writable.equals(x.Writable)
              && this.Enumerable.equals(x.Enumerable)
              && this.Configurable.equals(x.Configurable)
        }
    Property.prototype.hashCode =
        function ()
        {
          var prime = 31;
          var result = 1;
          result = prime * result + this.Value.hashCode();
          result = prime * result + this.Get.hashCode();
          result = prime * result + this.Set.hashCode();
          result = prime * result + this.Writable.hashCode();
          result = prime * result + this.Enumerable.hashCode();
          result = prime * result + this.Configurable.hashCode();
          return result;
        }
  
    Property.prototype.join =
        function (other)
        {
          if (this === other || other === BOT)
          {
            return this;
          }
          return new Property(
              this.Value.join(other.Value),
              this.Get.join(other.Get),
              this.Set.join(other.Set),
              this.Writable.join(other.Writable),
              this.Enumerable.join(other.Enumerable),
              this.Configurable.join(other.Configurable)
          );
        }
  
    Property.prototype.addresses =
        function ()
        {
          return this.Value.addresses().join(this.Get.addresses()).join(this.Set.addresses());
        }
  
    Property.prototype.toString =
        function ()
        {
          return "{[[Value]]:" + this.Value + " [[Get]]:" + this.Get + " [[Set]]:" + this.Set
              + " [[Writable]]:" + this.Writable + " [[Enumerable]]:" + this.Enumerable + " [[Configurable]]:" + this.Configurable
              + "}";
        }
  
    // 6.2.2
    function Completion(Type, Value, Target)
    {
      this.Type = Type;
      this.Value = Value;
      this.Target = Target;
    }
  
    Completion.normal = new String("normal");
    Completion.break = new String("break");
    Completion.continue = new String("continue");
    Completion.return = new String("return");
    Completion.throw = new String("throw");
    Completion.empty = new String("empty");
  
    // 6.2.2.1
    function NormalCompletion(argument)
    {
      return Completion(Completion.normal, value, Completion.empty);
    }
    
    // 6.2.5.1
    function IsAccessorDescriptor(Desc)
    {
      if (Desc === undefined)
      {
        return false;
      }
      if ((Desc.Get === BOT) && (Desc.Set === BOT))
      {
        return false;
      }
      return true;
    }
    
    // 6.2.5.2
    function IsDataDescriptor(Desc)
    {
      if (Desc === undefined)
      {
        return false;
      }
      if ((Desc.Value === BOT) && (Desc.Writable === BOT))
      {
        return false;
      }
      return true;
    }
    
    // 6.2.5.3
    function IsGenericDescriptor(Desc)
    {
      if (Desc === undefined)
      {
        return false;
      }
      if (!IsAccessorDescriptor(Desc) && !IsDataDescriptor(Desc))
      {
        return true;
      }
      return false;
    }
    
    // 6.2.5.4
    // moving this kind of function to prelude requires turning Property into (regular?) obj with internal props
    function FromPropertyDescriptor(Desc, node, store, lkont, kont, cont)
    {
      let result = [];
      if (Desc === undefined)
      {
        result = result.concat(cont(L_UNDEFINED, store));
      }
      else
      {
        const obj = ObjectCreate(realm.Intrinsics.get("%ObjectPrototype%"));
        const objAddr = a.object(node);
        const objRef = l.abstRef(objAddr);
        store = storeAlloc(store, objAddr, obj);
        if (Desc.Value !== BOT)
        {
          CreateDataProperty(objRef, l.abst1("value"), Desc.Value, store, lkont, kont,
              function (success, updatedStore)
              {
                store = updatedStore;
                assert(!success.isFalse());
              })
        }
        if (Desc.Writable !== BOT)
        {
          CreateDataProperty(objRef, l.abst1("writable"), Desc.Writable, store, lkont, kont,
              function (success, updatedStore)
              {
                store = updatedStore;
                assert(!success.isFalse());
              })
        }
        if (Desc.Get !== BOT)
        {
          CreateDataProperty(objRef, l.abst1("get"), Desc.Get, store, lkont, kont,
              function (success, updatedStore)
              {
                store = updatedStore;
                assert(!success.isFalse());
              })
        }
        if (Desc.Set !== BOT)
        {
          CreateDataProperty(objRef, l.abst1("set"), Desc.Set, store, lkont, kont,
              function (success, updatedStore)
              {
                store = updatedStore;
                assert(!success.isFalse());
              })
        }
        if (Desc.Enumerable !== BOT)
        {
          CreateDataProperty(objRef, l.abst1("enumerable"), Desc.Enumerable, store, lkont, kont,
              function (success, updatedStore)
              {
                store = updatedStore;
                assert(!success.isFalse());
              })
        }
        if (Desc.Configurable !== BOT)
        {
          CreateDataProperty(objRef, l.abst1("configurable"), Desc.Configurable, store, lkont, kont,
              function (success, updatedStore)
              {
                store = updatedStore;
                assert(!success.isFalse());
              })
        }
        result = result.concat(cont(objRef, store));
      }
      return result;
    }
  
    // 6.2.5.5
    function ToPropertyDescriptor(Obj, store, lkont, kont, cont)
    {
      let result = [];
      if (Obj.isNonRef())
      {
        result.push(throwTypeError("6.2.5.5"));
      }
      if (Obj.isRef())
      {
        let desc = new Property(BOT, BOT, BOT, BOT, BOT, BOT);
        result = result.concat(HasProperty(Obj, l.abst1("enumerable"), store, lkont, kont,
            function (hasValue, updatedStore)
            {
              store = updatedStore;
              if (hasValue.isTrue())
              {
                return Get(Obj, l.abst1("enumerable"), store, lkont, kont, // TODO ToBoolean
                    function (value)
                    {
                      desc.Enumerable = desc.Enumerable.join(value);
                      return [];
                    });
              }
              return [];
            }));
        result = result.concat(HasProperty(Obj, l.abst1("configurable"), store, lkont, kont,
            function (hasValue, updatedStore)
            {
              store = updatedStore;
              if (hasValue.isTrue())
              {
                return Get(Obj, l.abst1("configurable"), store, lkont, kont, // TODO ToBoolean
                    function (value)
                    {
                      desc.Configurable = desc.Configurable.join(value);
                      return [];
                    });
              }
              return [];
            }));
        result = result.concat(HasProperty(Obj, l.abst1("value"), store, lkont, kont,
            function (hasValue, updatedStore)
            {
              store = updatedStore;
              if (hasValue.isTrue())
              {
                return Get(Obj, l.abst1("value"), store, lkont, kont,
                    function (value)
                    {
                      desc.Value = desc.Value.join(value);
                      return [];
                    });
              }
              return [];
            }));
        result = result.concat(HasProperty(Obj, l.abst1("writable"), store, lkont, kont,
            function (hasValue, updatedStore)
            {
              store = updatedStore;
              if (hasValue.isTrue())
              {
                return Get(Obj, l.abst1("writable"), store, lkont, kont, // TODO ToBoolean
                    function (value)
                    {
                      desc.Writable = desc.Writable.join(value);
                      return [];
                    });
              }
              return [];
            }));
        result = result.concat(HasProperty(Obj, l.abst1("get"), store, lkont, kont,
            function (hasValue, updatedStore)
            {
              store = updatedStore;
              if (hasValue.isTrue())
              {
                return Get(Obj, l.abst1("get"), store, lkont, kont,
                    function (value)
                    {
                      desc.Get = desc.Get.join(value); // TODO IsCallable, not undefined
                      return [];
                    });
              }
              return [];
            }));
        result = result.concat(HasProperty(Obj, l.abst1("set"), store, lkont, kont,
            function (hasValue, updatedStore)
            {
              store = updatedStore;
              if (hasValue.isTrue())
              {
                return Get(Obj, l.abst1("set"), store, lkont, kont,
                    function (value)
                    {
                      desc.Set = desc.Set.join(value); // TODO IsCallable, not undefined
                      return [];
                    });
              }
              return [];
            }));
        // TODO final checks on presence of Get/Set and Value/Writable
        result = result.concat(cont(desc, store));
      }
      return result;
    }
  
    // 7.1.13
    function ToObject(argument, node, store, lkont, kont, cont)
    {
      // fast path
      if (!argument.isNonRef())
      {
        return cont(argument, store);
      }
  
      // slow path
      let result = [];
      if (argument.isUndefined())
      {
        result.push({state: new ThrowState(l.abst1("7.1.13 - Undefined"), store, lkont, kont)});
      }
      if (argument.isNull())
      {
        result.push({state: new ThrowState(l.abst1("7.1.13 - Null"), store, lkont, kont)});
      }
      const barg = argument.projectBoolean();
      if (barg !== BOT)
      {
        throw new Error("TODO");
      }
      const narg = argument.projectNumber();
      if (narg !== BOT)
      {
        throw new Error("TODO");
      }
      const sarg = argument.projectString();
      if (sarg !== BOT)
      {
        let obj = ObjectCreate(realm.Intrinsics.get("%StringPrototype%"));
        obj = obj.setInternal("[[StringData]]", sarg);
        const addr = a.string(node);
        store = storeAlloc(store, addr, obj);
        const ref = l.abstRef(addr);
        result = result.concat(cont(ref, store));
      }
      // TODO symbols
      if (argument.isRef())
      {
        result = result.concat(cont(argument, store));
      }
      return result;
    }
  
    // 7.1.14
    function ToPropertyKey(argument, store, lkont, kont, cont)
    {
      // TODO
      return cont(argument, store);
    }
    
    // 7.1.15
    function ToLength(argument, store, lkont, kont, cont)
    {
      // TODO
      return cont(argument, store);
    }
  
    // 7.2.3
    function IsCallable(argument, store)
    {
      let result = BOT;
      if (argument.isNonRef())
      {
        result = result.join(L_FALSE);
      }
      if (argument.isRef())
      {
        result = result.join(hasInternal(argument, '[[Call]]', store));
      }
      return result;
    }
  
    // 7.2.7
    function IsPropertyKey(argument)
    {
      let result = BOT;
      const projString = argument.projectString();
      //const projSymbol = argument.projectSymbol(); TODO
      if (projString !== BOT)
      {
        result = result.join(L_TRUE);
      }
      // if (projSymb...
      if (!projString.equals(argument)) // .join(projSymbol).equals(... TODO
      {
        result = result.join(L_FALSE);
      }
      return result;
    }
    
  
    // 7.2.9
    function SameValue(x, y)
    {
      let result = BOT;
      const tx = Type(x);
      const ty = Type(y);
      if (!Sets.equals(tx, ty))
      {
        result = result.join(L_FALSE);
      }
      else
      {
        const nx = x.projectNumber();
        if (nx !== BOT)
        {
          const ny = y.projectNumber();
          if (nx.equals(L_NAN) && ny.equals(L_NAN))
          {
            result = result.join(L_TRUE);
          }
          if (nx.equals(L_0) && ny.equals(L_MIN0))
          {
            result = result.join(L_FALSE);
          }
          if (nx.equals(L_MIN0) && ny.equals(L_0))
          {
            result = result.join(L_FALSE);
          }
          const snv = l.hasSameNumberValue(nx, ny);
          if (snv)
          {
            result = result.join(L_TRUE);
          }
          else
          {
            result = result.join(L_FALSE);
          }
        }
        if (nx === BOT)
        {
          result = result.join(SameValueNonNumber(x, y));
        }
      }
      return result;
    }
  
    // 7.2.11
    function SameValueNonNumber(x, y)
    {
      const tx = Type(x);
      const ty = Type(y);
      assert(!tx.has(Types.Number));
      assert(Sets.equals(tx, ty));
      let result = BOT;
      if (tx.has(Types.Undefined))
      {
        result = result.join(L_TRUE);
      }
      if (tx.has(Types.Null))
      {
        result = result.join(L_TRUE);
      }
      if (tx.has(Types.String))
      {
        result = result.join(l.abst1(l.hasSameStringValue(x, y)));
      }
      if (tx.has(Types.Boolean))
      {
        const bx = x.projectBoolean();
        const by = y.projectBoolean();
        result = result.join(l.abst1(bx.equals(by)));
      }
      // TODO: symbol
      if (x.isRef())
      {
        result = result.join(l.abst1(x.addresses().equals(y.addresses())));
      }
      return result;
    }
  
    // 7.3.1
    function Get(O, P, store, lkont, kont, cont)
    {
      return callInternal(O, "[[Get]]", [P, O], store, lkont, kont, cont);
    }
    
    // 7.3.4
    function CreateDataProperty(O, P, V, store, lkont, kont, cont)
    {
      assertIsObject(O);
      assertIsPropertyKey(P);
      const newDesc = new Property(V, BOT, BOT, L_TRUE, L_TRUE, L_TRUE);
      return callInternal(O, "[[DefineOwnProperty]]", [P, newDesc], store, lkont, kont, cont);
    }
    
    // 7.3.6
    function CreateDataPropertyOrThrow(O, P, V, store, lkont, kont, cont)
    {
      assertIsObject(O);
      assertIsPropertyKey(P);
      return CreateDataProperty(O, P, V, store, lkont, kont,
          function (success, store)
          {
            let result = [];
            if (success.isFalse())
            {
              result.push(throwTypeError("7.3.6"));
            }
            if (success.isTrue())
            {
              result = result.concat(cont(success, store));
            }
            return result;
          })
    }
  
    // 7.3.7
    function DefinePropertyOrThrow(O, P, desc, store, lkont, kont, cont)
    {
      return callInternal(O, "[[DefineOwnProperty]]", [P, desc], store, lkont, kont,
          function (success, store)
          {
            let result = [];
            if (success.isTrue())
            {
              result = result.concat(cont(success, store));
            }
            if (success.isFalse())
            {
              throw new Error("TODO");
            }
            return result;
          });
    }
  
    // 7.3.10
    function HasProperty(O, P, store, lkont, kont, cont)
    {
      return callInternal(O, "[[HasProperty]]", [P], store, lkont, kont, cont);
    }
    
    // 7.3.17
    function CreateListFromArrayLike(obj, elementTypes, store, lkont, kont, cont)
    {
      if (elementTypes === undefined)
      {
        elementTypes = Sets.from([Types.Undefined, Types.Null, Types.Boolean, Types.String, Types.Symbol, Types.Number, Types.Object]);
      }
      assert(elementTypes instanceof Set);
      let result = [];
      if (obj.isNonRef())
      {
        result.push(throwTypeError("7.3.17"));
      }
      if (obj.isRef())
      {
        const r1 = Get(obj, P_LENGTH, store, lkont, kont,
            function (lenVal, store)
            {
              return ToLength(lenVal, store, lkont, kont,
                  function (len, store)
                  {
                    const list = [];
                    let index = L_0;
                    var seen = ArraySet.empty();
                    while ((!seen.contains(index)) && l.lt(index, len).isTrue())
                    {
                      seen = seen.add(index);
                      const indexName = index.ToString(); // TODO actual ToString call
                      const next = doProtoLookup(indexName, obj.addresses(), store); // TODO Get call
                      const typeNext = Type(next);
                      if (Sets.subsumes(elementTypes, typeNext))
                      {
                        list.push(next);
                      }
                      index = l.add(index, L_1);
                    }
                    return cont(list, store);
                  });
            });
        result = result.concat(r1);
      }
      return result;
    }
  
    // 7.3.19
    function OrdinaryHasInstance(C, O, store, lkont, kont, cont)
    {
      let result = [];
      const ic = IsCallable(C, store);
      if (ic.isFalse())
      {
        result = result.concat(cont(L_FALSE, store), store);
      }
      if (ic.isTrue())
      {
        // [[BoundTargetFunction]] // TODO
        if (O.isNonRef())
        {
          result = result.concat(cont(L_FALSE, store));
        }
        if (O.isRef())
        {
          result = result.concat(Get(C, P_PROTOTYPE, store, lkont, kont,
              function (P)
              {
                let result = [];
                if (P.isNonRef())
                {
                  throw new Error("TODO");
                }
                if (P.isRef())
                {
                 result = result.concat(callInternal(O, "[[GetPrototypeOf]]", [], store, lkont, kont,
                     function repeat(O, store)
                     {
                       let result = [];
                       if (O.isNull())
                       {
                         result = result.concat(cont(L_FALSE, store));
                       }
                       if (O.isNonNull())
                       {
                         const sv = SameValue(P, O);
                         if (sv.isTrue())
                         {
                           result = result.concat(cont(L_TRUE, store));
                         }
                         if (sv.isFalse())
                         {
                           result = result.concat(callInternal(O, "[[GetPrototypeOf]]", [], store, lkont, kont, repeat));
                         }
                       }
                       return result;
                     }));
                }
                return result;
              }));
        }
      }
      return result;
    }
  
    // 8.2
    function Realm()
    {
      this.Intrinsics = undefined;
      this.GlobalObject = undefined;
    }
  
    // // 8.2.1
    // function CreateRealm()
    // {
    //   let realmRec = new Realm();
    //   CreateIntrinsics(realmRec);
    //   realmRec.GlobalObject = L_UNDEFINED;
    //   return realmRec;
    // }
    //
    // // 8.2.2
    // function CreateIntrinsics(realmRec, store)
    // {
    //   const intrinsics = new Intrinsics();
    //   realmRec.Intrinsics = intrinsics;
    //   const objProto = ObjectCreate(L_NULL);
    //   const objProtoa = a.object();
    //   intrinsics.add("%ObjectPrototype%", )
    // }
  
    // 9.1.1.1
    function OrdinaryGetPrototypeOf(O, store, lkont, kont, cont)
    {
      const P = getInternal(O, "[[Prototype]]", store);
      return cont(P, store);
    }
  
    // 9.1.5.1
    function OrdinaryGetOwnProperty(O, P, store, lkont, kont, cont)
    {
      assertIsPropertyKey(P);
      let result = [];
      const as = O.addresses().values();
      for (const a of as)
      {
        const obj = storeLookup(store, a);
        const X = obj.lookup(P);
        if (X === BOT || !X.must)
        {
          result = result.concat(cont(undefined, store));
        }
        if (X !== BOT && X.must)
        {
          const D = Property.empty();
          D.Value = X.value.Value;
          D.Writable = X.value.Writable;
          D.Get = X.value.Get;
          D.Set = X.value.Set;
          D.Enumerable = X.value.Enumerable;
          D.Configurable = X.value.Configurable;
          result = result.concat(cont(D, store));
        }
      }
      return result;
    }
  
    // 9.1.6.1
    function OrdinaryDefineOwnProperty(O, P, Desc, store, lkont, kont, cont)
    {
      return callInternal(O, "[[GetOwnProperty]]", [P], store, lkont, kont,
          function (current, store)
          {
            const extensible = lookupInternal(O, "[[Extensible]]", store);
            return ValidateAndApplyPropertyDescriptor(O, P, extensible, Desc, current, store, lkont, kont, cont);
          });
    }
    
    // 9.1.6.3
    function ValidateAndApplyPropertyDescriptor(O, P, extensible, Desc, current, store, lkont, kont, cont)
    {
      // step 1
      if (O.isNonUndefined())
      {
        assertIsPropertyKey(P);
      }
      let result = BOT;
      // step 2
      if (current === undefined)
      {
        if (extensible.isFalse())
        {
          result = result.join(L_FALSE);
        }
        if (extensible.isTrue())
        {
          if (IsGenericDescriptor(Desc) || IsDataDescriptor(Desc))
          {
            if (O.isNonUndefined())
            {
              const D = new Property(Desc.Value === BOT ? L_UNDEFINED : Desc.Value, BOT, BOT, Desc.Writable === BOT ? L_FALSE : Desc.Writable, Desc.Enumerable === BOT ? L_FALSE : Desc.Enumerable, Desc.Configurable === BOT ? L_FALSE : Desc.Configurable);
              const as = O.addresses().values();
              for (const a of as)
              {
                let obj = storeLookup(store, a);
                obj = obj.add(P, D);
                store = storeUpdate(store, a, obj);
              }
            }
          }
          if (IsAccessorDescriptor(Desc))
          {
            if (O.isNonUndefined())
            {
              const D = new Property(BOT, Desc.Get === BOT ? L_UNDEFINED : Desc.Get, Desc.Set === BOT ? L_UNDEFINED : Desc.Set, Desc.Writable === BOT ? L_FALSE : Desc.Writable, Desc.Enumerable === BOT ? L_FALSE : Desc.Enumerable, Desc.Configurable === BOT ? L_FALSE : Desc.Configurable);
              const as = O.addresses().values();
              for (const a of as)
              {
                let obj = storeLookup(store, a);
                obj = obj.add(P, D);
                store = storeUpdate(store, a, obj);
              }
            }
          }
          result = result.join(L_TRUE);
        }
      }
      else
      {
        // step 3
        if (Desc.Value === Desc.Get === Desc.Set === Desc.Writable === Desc.Enumerable === Desc.Configurable === BOT)
        {
          result = result.join(L_TRUE);
        }
        else
        {
          // step 4
          if (current.Configurable.isFalse())
          {
            if (Desc.Configurable !== BOT && Desc.Configurable.isTrue())
            {
              result = result.join(L_FALSE);
            }
            if (Desc.Enumerable !== BOT && l.neqq(current.Enumerable, Desc.Enumerable).isTrue())
            {
              result = result.join(L_FALSE);
            }
          }
          // step 5
          if (IsGenericDescriptor(Desc))
          {
            result = result.join(L_TRUE);
          }
          // step 6
          else if (IsDataDescriptor(current) !== IsDataDescriptor(Desc))
          {
            if (current.Configurable.isFalse())
            {
              result = result.join(L_FALSE);
            }
            if (current.Configurable.isTrue())
            {
              if (IsDataDescriptor(current))
              {
                if (O.isNonUndefined())
                {
                  const D = new Property(L_UNDEFINED, current.Get, current.Set, L_FALSE, current.Enumerable, current.Configurable);
                  const as = O.addresses().values();
                  for (const a of as)
                  {
                    let obj = storeLookup(store, a);
                    obj = obj.add(P, D);
                    store = storeUpdate(store, a, obj);
                  }
                }
              }
              else
              {
                if (O.isNonUndefined())
                {
                  const D = new Property(current.Value, L_UNDEFINED, L_UNDEFINED, L_FALSE, current.Enumerable, current.Configurable);
                  const as = O.addresses().values();
                  for (const a of as)
                  {
                    let obj = storeLookup(store, a);
                    obj = obj.add(P, D);
                    store = storeUpdate(store, a, obj);
                  }
                }
              }
              result = result.join(L_TRUE);
            }
          }
          // step 7
          else if (IsDataDescriptor(current) && IsDataDescriptor(Desc))
          {
            if (current.Configurable.isFalse())
            {
              if (current.Writable.isFalse())
              {
                if (Desc.Writable !== BOT && Desc.Writable.isTrue())
                {
                  result = result.join(L_FALSE);
                }
                if (Desc.Writable === BOT || Desc.Writable.isFalse())
                {
                  if (Desc.Value !== BOT && SameValue(Desc.Value, current.Value).isFalse())
                  {
                    result = result.join(L_FALSE);
                  }
                  if (Desc.Value === BOT || SameValue(Desc.Value, current.Value).isTrue())
                  {
                    result = result.join(L_TRUE);
                  }
                }
              }
            }
          }
          // step 8
          else if (IsAccessorDescriptor(current) && IsAccessorDescriptor(Desc))
          {
            if (current.Configurable.isFalse())
            {
              if (Desc.Set !== BOT && SameValue(Desc.Set, current.Set).isFalse())
              {
                result = result.join(L_FALSE);
              }
              if (Desc.Get !== BOT && SameValue(Desc.Get, current.Get).isFalse())
              {
                result = result.join(L_FALSE);
              }
              if (Desc.Set === BOT || Desc.Get === BOT || SameValue(Desc.Set, current.Set).isTrue() || SameValue(Desc.Get, current.Get).isTrue())
              {
                result = result.join(L_TRUE);
              }
            }
          }
          else
          {
            // step 9
            if (O.isNonUndefined())
            {
              const D = new Property(Desc.Value === BOT ? L_UNDEFINED : Desc.Value, Desc.Get === BOT ? L_UNDEFINED : Desc.Get, Desc.Set === BOT ? L_UNDEFINED : Desc.Set,
                  Desc.Writable === BOT ? L_FALSE : Desc.Writable, Desc.Enumerable === BOT ? L_FALSE : Desc.Enumerable, Desc.Configurable === BOT ? L_FALSE : Desc.Configurable);
              const as = O.addresses().values();
              for (const a of as)
              {
                let obj = storeLookup(store, a);
                obj = obj.add(P, D);
                store = storeUpdate(store, a, obj);
              }
            }
            result = result.join(L_TRUE);
          }
        }
      }
      return cont(result, store);
    }
    
  
    // 9.1.7.1
    function OrdinaryHasProperty(O, P, store, lkont, kont, cont)
    {
      assertIsPropertyKey(P);
      return callInternal(O, "[[GetOwnProperty]]", [P], store, lkont, kont,
          function (hasOwn, store)
          {
            if (hasOwn !== undefined)
            {
              return cont(L_TRUE, store);
            }
            else
            {
              return callInternal(O, "[[GetPrototypeOf]]", [], store, lkont, kont,
                  function (parent, store)
                  {
                    let result = [];
                    if (parent.isNonNull())
                    {
                      result = result.concat(callInternal(parent, "[[HasProperty]]", [P], store, lkont, kont, cont));
                    }
                    if (parent.isNull())
                    {
                      result = result.concat(cont(L_FALSE, store));
                    }
                    return result;
                  });
            }
          });
    }
  
    // 9.1.8.1
    function OrdinaryGet(O, P, Receiver, store, lkont, kont, cont)
    {
      //return invokeMeta("OrdinaryGet", [O, P, Receiver], store, lkont, kont, as);
      const value = doProtoLookup(P, O.addresses(), store, []);
      return cont(value, store);
    }
    
    // 9.1.9.1
    function OrdinarySet(O, P, V, Receiver)
    {
      assertIsPropertyKey(P);
      // TODO
    }
    
    // 9.1.11.1
    function OrdinaryOwnPropertyKeys(O, store, lkont, kont, cont)
    {
      let keys = ArraySet.empty();
      const as = O.addresses().values();
      for (const a of as)
      {
        const obj = storeLookup(store, a);
        // TODO: symbols, ascending numeric, chronological order, etc.
        // TODO: subsumption checking
        keys = keys.addAll(obj.names());
      }
      return cont(keys.values(), store);
    }
  
    // 9.1.12
    function ObjectCreate(proto, internalSlotsList)
    {
      if (internalSlotsList === undefined)
      {
        internalSlotsList = [];
      }
      //let obj = newObject; // cannot use template because of old-style internals
      let obj = new Obj();
      internalSlotsList.forEach((slot) => obj = obj.setInternal(slot, BOT));
      // step 3
      // 9.1.1
      obj = obj.setInternal("[[GetPrototypeOf]]", SetValueNoAddresses.from1(OrdinaryGetPrototypeOf));
      // 9.1.5
      obj = obj.setInternal("[[GetOwnProperty]]", SetValueNoAddresses.from1(OrdinaryGetOwnProperty));
      // 9.1.6
      obj = obj.setInternal("[[DefineOwnProperty]]", SetValueNoAddresses.from1(OrdinaryDefineOwnProperty));
      // 9.1.7
      obj = obj.setInternal("[[HasProperty]]", SetValueNoAddresses.from1(OrdinaryHasProperty));
      // 9.1.8
      obj = obj.setInternal("[[Get]]", SetValueNoAddresses.from1(OrdinaryGet));
      // 9.1.11
      obj = obj.setInternal("[[OwnPropertyKeys]]", SetValueNoAddresses.from1(OrdinaryOwnPropertyKeys));
      // TODO: more step 3
      // step 4
      obj = obj.setInternal("[[Prototype]]", proto);
      obj = obj.setInternal("[[Extensible]]", L_TRUE);
      return obj;
    }
  
    // 9.1.13
    function OrdinaryCreateFromConstructor(constructor, intrinsicDefaultProto, internalSlotsList, store)
    {
      assert(realm.Intrinsics.has(intrinsicDefaultProto)); // TODO 'intension' part
      const proto = GetPrototypeFromConstructor(constructor, intrinsicDefaultProto, store);
      return ObjectCreate(proto, internalSlotsList);
    }
  
    // 9.1.14
    function GetPrototypeFromConstructor(constructor, intrinsicDefaultProto, store, lkont, kont)
    {
      assert(realm.Intrinsics.has(intrinsicDefaultProto)); // TODO 'intension' part
      assert(IsCallable(constructor, store));
      let proto = Get(constructor, P_PROTOTYPE, store, lkont, kont);
      if (proto.isNonRef())
      {
        // TODO realms
        proto = proto.join(realm.Intrinsics.get(intrinsicDefaultProto));
      }
      return proto;
    }
  
    // 9.4.3.3
    function StringCreate(lprim)
    {
      let obj = new Obj();
      obj = obj.setInternal("[[Prototype]]", realm.Intrinsics.get("%StringPrototype%"));
      obj = obj.setInternal("[[StringData]]", lprim);
      obj = obj.add(P_LENGTH, Property.fromValue(lprim.stringLength()));
      return obj;
    }
  
    // 12.10.4
    function InstanceofOperator(O, C, store, lkont, kont, cont)
    {
      let result = [];
      if (O.isNonRef())
      {
        throw new Error("TODO");
      }
      // TODO instHandler
      const c = IsCallable(C, store);
      if (c.isFalse())
      {
        throw new Error("TODO");
      }
      if (c.isTrue())
      {
        result = result.concat(OrdinaryHasInstance(C, O, store, lkont, kont, cont));
      }
      return result;
    }
    
    // 13.7.5.12
    // function ForInOfHeadEvaluation(TDZnames, expr, iterationKind, store, lkont, kont, cont)
    
    // 19.1.2.3.1
    function ObjectDefineProperties(O, Properties, node, store, lkont, kont, cont)
    {
      if (O.isNonRef())
      {
        throw new Error("TODO");
      }
      return ToObject(Properties, node, store, lkont, kont,
          function (props, store)
          {
            return callInternal(props, "[[OwnPropertyKeys]]", [], store, lkont, kont,
                function (keys)
                {
                  const descriptors = [];
                  let result = [];
                  let loopStore = store;
                  for (const nextKey of keys)
                  {
                    const r = callInternal(props, "[[GetOwnProperty]]", [nextKey], loopStore, lkont, kont,
                        function (propDesc, store)
                        {
                          if (propDesc !== undefined && propDesc.Enumerable.isTrue())
                          {
                            return Get(props, nextKey, store, lkont, kont,
                                function (descObj)
                                {
                                  return ToPropertyDescriptor(descObj, store, lkont, kont,
                                      function (desc)
                                      {
                                        descriptors.push([nextKey, desc]);
                                        loopStore = store;
                                        return [];
                                      });
                                });
                          }
                          loopStore = store;
                          return [];
                        });
                    result = result.concat(r);
                  }
                  for (const pair of descriptors)
                  {
                    const [P, desc] = pair;
                    const r = DefinePropertyOrThrow(O, P, desc, loopStore, lkont, kont,
                        function (success, store)
                        {
                          assertDefinedNotNull(store);
                          loopStore = store;
                        })
                  }
                  assertDefinedNotNull(loopStore);
                  return cont(O, loopStore);
                });
          });
    }
  
    // 19.2.3.1
    function functionApply(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      let result = [];
      const ic = IsCallable(thisValue, store);
      if (ic.isFalse())
      {
        result.push(throwTypeError("19.2.3.1", store, lkont, kont));
      }
      if (ic.isTrue())
      {
        const thisArg = operandValues[0];
        const argArray = operandValues[1];
        // TODO: PrepareForTailCall()
        if (!argArray)
        {
          const r1 = applyProc(application, thisValue, [], thisArg, null, store, lkont, kont);
          result = result.concat(r1);
        }
        else
        {
          const r1 = CreateListFromArrayLike(argArray, undefined, store, lkont, kont,
              function (argList, store)
              {
                // TODO: PrepareForTailCall()
                return applyProc(application, thisValue, argList, thisArg, null, store, lkont, kont);
              });
          result = result.concat(r1);
        }
      }
      return result;
    }
    
    // 19.2.3.3
    function functionCall(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      let result = [];
      const ic = IsCallable(thisValue, store);
      if (ic.isFalse())
      {
        result.push(throwTypeError("19.2.3.3", store, lkont, kont));
      }
      if (ic.isTrue())
      {
        const thisArg = operandValues[0];
        const argList = operandValues.slice(1);
        // TODO: PrepareForTailCall()
        const r1 = applyProc(application, thisValue, argList, thisArg, null, store, lkont, kont);
        result = result.concat(r1);
      }
      return result;
    }
  
  
  
    function createClosure(node, scope)
  {
    var obj = createFunction(new ObjClosureCall(node, scope));
    return obj;
  }
  
  function createPrimitive(applyFunction, applyConstructor)
  {
    var obj = createFunction(new ObjPrimitiveCall(applyFunction, applyConstructor));
    return obj;
  }
  
  function createFunction(Call)
  {
    var obj = ObjectCreate(realm.Intrinsics.get("%FunctionPrototype%"));
    obj = obj.setInternal("[[Call]]", SetValue.from1(Call));
    return obj;
  }
  
  function functionScopeDeclarations(node)
  {
    var funScopeDecls = node.funScopeDecls;
    if (!funScopeDecls)
    {
      funScopeDecls = Ast.functionScopeDeclarations(node);
      node.funScopeDecls = funScopeDecls;
    }
    return funScopeDecls;
  }
  
  function ObjPrimitiveCall(applyFunction, applyConstructor)
  {
    this.applyFunction = applyFunction;
    this.applyConstructor = applyConstructor;
    this._hashCode = HashCode.bump();
  }
  
  ObjPrimitiveCall.prototype.toString =
      function ()
      {
        return "ObjPrimitiveCall";
      }
  
  ObjPrimitiveCall.prototype.equals =
      function (other)
      {
        if (this === other)
        {
          return true;
        }
        if (!(this instanceof ObjPrimitiveCall))
        {
          return false;
        }
        return this._hashCode === other._hashCode;
      }
  
  ObjPrimitiveCall.prototype.hashCode =
      function ()
      {
        return this._hashCode;
      }
  
  ObjPrimitiveCall.prototype.addresses =
      function ()
      {
        return EMPTY_ADDRESS_SET;
      }
  
  function ObjClosureCall(node, scope)
  {
    assertDefinedNotNull(node);
    this.node = node;
    this.scope = scope;
  }
  
  ObjClosureCall.prototype.toString =
      function ()
      {
        return "(" + this.node.tag + " " + this.scope + ")";
      }
  ObjClosureCall.prototype.nice =
      function ()
      {
        return "closure-" + this.node.tag;
      }
  
  ObjClosureCall.prototype.equals =
      function (other)
      {
        if (this === other)
        {
          return true;
        }
        if (!(other instanceof ObjClosureCall))
        {
          return false;
        }
        return this.node === other.node
            && this.scope.equals(other.scope);
      }
  ObjClosureCall.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + HashCode.hashCode(this.node);
        result = prime * result + this.scope.hashCode();
        return result;
      }
  
  function createContext(application, thisValue, userContext, stackAs, previousStack)
  {
    var ctx0 = new JipdaContext(application, thisValue, userContext, stackAs);
    var ctx = ctx0.intern(contexts);
    if (ctx === ctx0)
    {
      ctx._stacks = new Set();
      if (previousStack)
      {
        ctx._stacks.add(previousStack);
      }
    }
    else if (previousStack)
    {
      if (ctx._stacks.has(previousStack))
      {
      }
      else
      {
        ctx._stacks.add(previousStack);
        sstorei++;
      }
    }
    return ctx;
  }
  
  function performApply(operandValues, funNode, scope, store, lkont, kont, ctx)
  {
    var bodyNode = funNode.body;
    var nodes = bodyNode.body;
    if (nodes.length === 0)
    {
      return [{state: new KontState(L_UNDEFINED, store, [], ctx)}];
    }
    
    var extendedBenv = scope.extend();
    
    var funScopeDecls = functionScopeDeclarations(funNode);
    var names = Object.keys(funScopeDecls);
    if (names.length > 0)
    {
      var nodeAddr = names.map(function (name)
      {
        var node = funScopeDecls[name];
        var addr = a.vr(node.id || node, kont);
        extendedBenv = extendedBenv.add(name, addr);
        return [node, addr];
      });
      nodeAddr.forEach(
          function (na)
          {
            var node = na[0];
            var addr = na[1];
            if (Ast.isIdentifier(node)) // param
            {
              store = storeAlloc(store, addr, node.i < operandValues.length ? operandValues[node.i] : L_UNDEFINED);
            }
            else if (Ast.isFunctionDeclaration(node))
            {
              var allocateResult = allocateClosure(node, extendedBenv, store, lkont, kont);
              var closureRef = allocateResult.ref;
              store = allocateResult.store;
              store = storeAlloc(store, addr, closureRef);
            }
            else if (Ast.isVariableDeclarator(node))
            {
              store = storeAlloc(store, addr, L_UNDEFINED);
            }
            else
            {
              throw new Error("cannot handle declaration " + node);
            }
          });
    }
    return [{state: new EvalState(bodyNode, extendedBenv, store, [], ctx)}];
  }
  
  
  ObjClosureCall.prototype.applyFunction =
      function (application, operandValues, thisValue, TODO_REMOVE, store, lkont, kont)
      {
        const userContext = kalloc(this, operandValues, store);
        var previousStack = Stackget(Stack(lkont, kont));
        var stackAs = stackAddresses(lkont, kont).join(this.addresses());
        var ctx = createContext(application, thisValue, userContext, stackAs, previousStack);
        return performApply(operandValues, this.node, this.scope, store, lkont, kont, ctx)
      }
  
  ObjClosureCall.prototype.applyConstructor =
      function (application, operandValues, protoRef, TODO_REMOVE, store, lkont, kont)
      {
        // call store should not contain freshly allocated `this`
        const userContext = kalloc(this, operandValues, store);
        const funNode = this.node;
        const obj = ObjectCreate(protoRef);
        const thisa = a.constructor(funNode, application);
        store = store.allocAval(thisa, obj);
        const thisValue = l.abstRef(thisa);
        const stackAs = stackAddresses(lkont, kont).join(this.addresses());
        const previousStack = Stackget(Stack(lkont, kont));
        const ctx = createContext(application, thisValue, userContext, stackAs, previousStack);
        return performApply(operandValues, this.node, this.scope, store, lkont, kont, ctx);
      }
  
  ObjClosureCall.prototype.addresses =
      function ()
      {
        return this.scope.addresses();
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
        return "#eval " + this.node.tag;
      }
  EvalState.prototype.nice =
      function ()
      {
        return "#eval " + this.node.tag;
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
        var store;
        if (gcFlag)
        {
          const as = this.addresses();
          store = Agc.collect(this.store, as);
        }
        else
        {
          store = this.store;
        }
        return evalNode(this.node, this.benv, store, this.lkont, this.kont, []);
      }
  EvalState.prototype.gc =
      function ()
      {
        return new EvalState(this.node, this.benv, Agc.collect(this.store, this.addresses()), this.lkont, this.kont);
      }
  EvalState.prototype.addresses =
      function ()
      {
        var as = this.benv.addresses().join(stackAddresses(this.lkont, this.kont));
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
        return "#kont-" + this.lkont[0];
      }
  KontState.prototype.next =
      function ()
      {
        var value = this.value;
        if (value === BOT)
        {
          return [];
        }
        const lkont = this.lkont;
        const kont = this.kont;
        const store = this.store;
        
        // if (kont.topmostApplicationReachable())
        // {
        //   value = value.abst();
        // }
        
        if (lkont.length === 0)
        {
          if (kont._stacks.size === 0)
          {
            return [];
          }
          
          if (kont.ex && Ast.isNewExpression(kont.ex))
          {
            value = kont.thisValue;
          }
          else
          {
            value = L_UNDEFINED;
          }
          
          let result = [];
          for (let stack of kont._stacks)
          {
            result.push({state: new KontState(value, store, stack.lkont, stack.kont)});
          }
          return result;
        }
        
        return lkont[0].apply(value, store, lkont.slice(1), kont);
      }
  KontState.prototype.gc =
      function ()
      {
        return this;
      }
  KontState.prototype.addresses =
      function ()
      {
        return stackAddresses(lkont, kont).join(this.value.addresses());
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
        var kont = this.kont;
        if (kont._stacks.size === 0)
        {
          throw new Error("return outside function");
        }
        
        var value = this.value;
        if (value === BOT)
        {
          return [];
        }
        
        if (kont.ex && Ast.isNewExpression(kont.ex))
        {
          var returnValue = BOT;
          if (value.isRef())
          {
            returnValue = returnValue.join(value.projectObject());
          }
          if (value.isNonRef())
          {
            returnValue = returnValue.join(kont.thisValue);
          }
          value = returnValue;
        }
        
        var store = this.store;
        
        var result = [];
        for (let stack of kont._stacks)
        {
          result.push({state: new KontState(value, store, stack.lkont, stack.kont)});
        }
        
        return result;
      }
  
  ReturnState.prototype.gc =
      function ()
      {
        return this;
      }
  ReturnState.prototype.addresses =
      function ()
      {
        return stackAddresses([], kont).join(this.value.addresses());
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
        var value = this.value;
        if (value === BOT)
        {
          return [];
        }
        var lkont = this.lkont;
        var kont = this.kont;
        var store = this.store;
        
        var stacks = this.stackPop(lkont, kont);
        let result = [];
        stacks.forEach(
            function (stack)
            {
              var lkont = stack.lkont;
              var kont = stack.kont;
              var frame = lkont[0];
              var lkont2 = lkont.slice(1);
              if (!frame.applyThrow)
              {
                print("!!", frame);
              }
              result = result.concat(frame.applyThrow(value, store, lkont2, kont));
            });
        return result;
      }
  
  ThrowState.prototype.stackPop = function (lkont, kont)
  {
    var todo = [Stack(lkont, kont)];
    var result = [];
    var G = ArraySet.empty();
    todo: while (todo.length > 0)
    {
      var stack = todo.pop();
      var lkont = stack.lkont;
      var kont = stack.kont;
      
      for (var i = 0; i < lkont.length; i++)
      {
        if (lkont[i].applyThrow)
        {
          result.push(Stack(lkont.slice(i), kont));
          continue todo;
        }
      }
      if (kont._stacks.size === 0 || G.contains(kont))
      {
        // TODO  if kont === EMPTY_KONT then unhandled exception
        continue;
      }
      
      kont._stacks.forEach(
          function (st)
          {
            todo.push(Stack(st.lkont, st.kont));
          });
      G = G.add(kont);
    }
    return result;
  }
  ThrowState.prototype.gc =
      function ()
      {
        return this;
      }
  ThrowState.prototype.addresses =
      function ()
      {
        return stackAddresses(lkont, kont).join(this.value.addresses());
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
        var value = this.value;
        if (value === BOT)
        {
          return [];
        }
        var lkont = this.lkont;
        var kont = this.kont;
        var store = this.store;
        
        for (var i = 0; i < lkont.length; i++)
        {
          if (lkont[i].applyBreak)
          {
            return lkont[i].applyBreak(store, lkont.slice(i), kont);
          }
        }
        throw new Error("no break target\nlocal stack: " + lkont);
      }
  BreakState.prototype.gc =
      function ()
      {
        return this;
      }
  BreakState.prototype.addresses =
      function ()
      {
        return stackAddresses(lkont, kont);
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
  
  // function HaltKont()
  // {
  // }
  // HaltKont.prototype.toString =
  //   function ()
  //   {
  //     return "halt";
  //   }
  // HaltKont.prototype.apply =
  //   function (value, store, lkont, kont)
  //   {
  //     return [{state:new ResultState(value, store, lkont, kont)}];
  //   }
  // HaltKont.prototype.hashCode =
  //   function ()
  //   {
  //     return 0;
  //   }
  // HaltKont.prototype.equals =
  //   function (x)
  //   {
  //     return x instanceof HaltKont;
  //   }
  // HaltKont.prototype.addresses =
  //   function ()
  //   {
  //     return EMPTY_ADDRESS_SET;
  //   }
  
  function VariableDeclarationKont(node, i, benv)
  {
    this.node = node;
    this.i = i;
    this.benv = benv;
  }
  
  VariableDeclarationKont.prototype.equals =
      function (x)
      {
        return x instanceof VariableDeclarationKont
            && this.node === x.node
            && this.i === x.i
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  VariableDeclarationKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.i;
        result = prime * result + this.benv.hashCode();
        return result;
      }
  VariableDeclarationKont.prototype.toString =
      function ()
      {
        return "vdecl-" + this.node.tag + "-" + this.i;
      }
  VariableDeclarationKont.prototype.nice =
      function ()
      {
        return "vdecl-" + this.node.tag + "-" + this.i;
      }
  VariableDeclarationKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  VariableDeclarationKont.prototype.apply =
      function (value, store, lkont, kont)
      {
        var node = this.node;
        var benv = this.benv;
        var i = this.i;
        
        var nodes = node.declarations;
        if (i === nodes.length)
        {
          return [{state: new KontState(value, store, lkont, kont)}];
        }
        var frame = new VariableDeclarationKont(node, i + 1, benv);
        return [{state: new EvalState(nodes[i], benv, store, [frame].concat(lkont), kont)}];
      }
  
  function VariableDeclaratorKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  VariableDeclaratorKont.prototype.equals =
      function (x)
      {
        return x instanceof VariableDeclaratorKont
            && this.node === x.node
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  VariableDeclaratorKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.benv.hashCode();
        return result;
      }
  VariableDeclaratorKont.prototype.toString =
      function ()
      {
        return "vrator " + this.node.tag;
      }
  VariableDeclaratorKont.prototype.nice =
      function ()
      {
        return "vrator " + this.node.tag;
      }
  VariableDeclaratorKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  VariableDeclaratorKont.prototype.apply =
      function (value, store, lkont, kont)
      {
        var id = this.node.id;
        var benv = this.benv;
        store = doScopeSet(id, value, benv, store);
        return [{state: new KontState(L_UNDEFINED, store, lkont, kont)}];
      }
  
  function LeftKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  LeftKont.prototype.equals =
      function (x)
      {
        return x instanceof LeftKont
            && this.node === x.node
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  LeftKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.benv.hashCode();
        return result;
      }
  LeftKont.prototype.toString =
      function ()
      {
        return "left-" + this.node.tag;
      }
  LeftKont.prototype.nice =
      function ()
      {
        return "left-" + this.node.tag;
      }
  LeftKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  LeftKont.prototype.apply =
      function (leftValue, store, lkont, kont)
      {
        var node = this.node;
        var benv = this.benv;
        var frame = new RightKont(node, leftValue);
        return [{state: new EvalState(node.right, benv, store, [frame].concat(lkont), kont)}];
      }
  
  function LogicalLeftKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  LogicalLeftKont.prototype.equals =
      function (x)
      {
        return x instanceof LogicalLeftKont
            && this.node === x.node
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  LogicalLeftKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.benv.hashCode();
        return result;
      }
  LogicalLeftKont.prototype.toString =
      function ()
      {
        return "logleft-" + this.node.tag;
      }
  LogicalLeftKont.prototype.nice =
      function ()
      {
        return "logleft-" + this.node.tag;
      }
  LogicalLeftKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  LogicalLeftKont.prototype.apply =
      function (leftValue, store, lkont, kont)
      {
        var node = this.node;
        var benv = this.benv;
        var operator = node.operator;
        var result = [];
        switch (operator)
        {
          case "&&":
          {
            
            if (leftValue.isTruthy())
            {
              result = result.concat([{state: new EvalState(node.right, benv, store, lkont, kont)}]);
            }
            if (leftValue.isFalsy())
            {
              result = result.concat([{state: new KontState(leftValue, store, lkont, kont)}]);
            }
            break;
          }
          case "||":
          {
            if (leftValue.isTruthy())
            {
              result = result.concat([{state: new KontState(leftValue, store, lkont, kont)}]);
            }
            if (leftValue.isFalsy())
            {
              result = result.concat([{state: new EvalState(node.right, benv, store, lkont, kont)}]);
            }
            break;
          }
          default:
            throw new Error("cannot handle logical operator " + operator);
        }
        return result;
      }
  
  
  function UnaryKont(node)
  {
    this.node = node;
  }
  
  UnaryKont.prototype.equals =
      function (x)
      {
        return x instanceof UnaryKont
            && this.node === x.node
      }
  UnaryKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        return result;
      }
  UnaryKont.prototype.toString =
      function ()
      {
        return "unary-" + this.node.tag;
      }
  UnaryKont.prototype.nice =
      function ()
      {
        return "unary-" + this.node.tag;
      }
  UnaryKont.prototype.addresses =
      function ()
      {
        return EMPTY_ADDRESS_SET;
      }
  UnaryKont.prototype.apply =
      function (value, store, lkont, kont)
      {
        const node = this.node;
        const leftValue = this.leftValue;
        const operator = node.operator;
        let resultValue;
        switch (node.operator)
        {
          case "!":
          {
            resultValue = l.not(value);
            break;
          }
          case "+":
          {
            resultValue = l.pos(value);
            break;
          }
          case "-":
          {
            resultValue = l.neg(value);
            break;
          }
          case "~":
          {
            resultValue = l.binnot(value);
            break;
          }
          case "typeof":
          {
            resultValue = BOT;
            if (value.projectUndefined() !== BOT)
            {
              resultValue = resultValue.join(l.abst1("undefined"));
            }
            if (value.projectNull() !== BOT)
            {
              resultValue = resultValue.join(l.abst1("object"));
            }
            if (value.projectString() !== BOT)
            {
              resultValue = resultValue.join(l.abst1("string"));
            }
            if (value.projectNumber() !== BOT)
            {
              resultValue = resultValue.join(l.abst1("number"));
            }
            if (value.projectBoolean() !== BOT)
            {
              resultValue = resultValue.join(l.abst1("boolean"));
            }
            if (value.isRef())
            {
              resultValue = resultValue.join(l.abst1("object"));
            }
            break;
          }
          default:
            throw new Error("cannot handle unary operator " + node.operator);
        }
        return [{state: new KontState(resultValue, store, lkont, kont)}];
      }
  
  function RightKont(node, leftValue)
  {
    this.node = node;
    this.leftValue = leftValue;
  }
  
  RightKont.prototype.equals =
      function (x)
      {
        return x instanceof RightKont
            && this.node === x.node
            && (this.leftValue === x.leftValue || this.leftValue.equals(x.leftValue))
      }
  RightKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.leftValue.hashCode();
        return result;
      }
  RightKont.prototype.toString =
      function ()
      {
        return "right-" + this.node.tag;
      }
  RightKont.prototype.nice =
      function ()
      {
        return "right-" + this.node.tag;
      }
  RightKont.prototype.addresses =
      function ()
      {
        return this.leftValue.addresses();
      }
  RightKont.prototype.apply =
      function (rightValue, store, lkont, kont)
      {
        var node = this.node;
        var leftValue = this.leftValue;
        var operator = node.operator;
        return applyBinaryOperator(operator, leftValue, rightValue, store, lkont, kont);
      }
  
  function applyBinaryOperator(operator, leftValue, rightValue, store, lkont, kont)
  {
    switch (operator)
    {
      case "+":
      {
        return [{state: new KontState(l.add(leftValue, rightValue), store, lkont, kont)}];
      }
      case "*":
      {
        return [{state: new KontState(l.mul(leftValue, rightValue), store, lkont, kont)}];
      }
      case "-":
      {
        return [{state: new KontState(l.sub(leftValue, rightValue), store, lkont, kont)}];
      }
      case "/":
      {
        return [{state: new KontState(l.div(leftValue, rightValue), store, lkont, kont)}];
      }
      case "%":
      {
        return [{state: new KontState(l.rem(leftValue, rightValue), store, lkont, kont)}];
      }
      case "===":
      {
        return [{state: new KontState(l.eqq(leftValue, rightValue), store, lkont, kont)}];
      }
      case "!==":
      {
        return [{state: new KontState(l.neqq(leftValue, rightValue), store, lkont, kont)}];
      }
      case "==":
      {
        return [{state: new KontState(l.eq(leftValue, rightValue), store, lkont, kont)}];
      }
      case "!=":
      {
        return [{state: new KontState(l.neq(leftValue, rightValue), store, lkont, kont)}];
      }
      case "<":
      {
        return [{state: new KontState(l.lt(leftValue, rightValue), store, lkont, kont)}];
      }
      case "<=":
      {
        return [{state: new KontState(l.lte(leftValue, rightValue), store, lkont, kont)}];
      }
      case ">":
      {
        return [{state: new KontState(l.gt(leftValue, rightValue), store, lkont, kont)}];
      }
      case ">=":
      {
        return [{state: new KontState(l.gte(leftValue, rightValue), store, lkont, kont)}];
      }
      case "&":
      {
        return [{state: new KontState(l.binand(leftValue, rightValue), store, lkont, kont)}];
      }
      case "|":
      {
        return [{state: new KontState(l.binor(leftValue, rightValue), store, lkont, kont)}];
      }
      case "^":
      {
        return [{state: new KontState(l.binxor(leftValue, rightValue), store, lkont, kont)}];
      }
      case "<<":
      {
        return [{state: new KontState(l.shl(leftValue, rightValue), store, lkont, kont)}];
      }
      case ">>":
      {
        return [{state: new KontState(l.shr(leftValue, rightValue), store, lkont, kont)}];
      }
      case ">>>":
      {
        return [{state: new KontState(l.shrr(leftValue, rightValue), store, lkont, kont)}];
      }
      case "instanceof":
      {
        return InstanceofOperator(leftValue, rightValue, store, lkont, kont,
            function (value)
            {
              return [{state: new KontState(value, store, lkont, kont)}];
            });
      }
      default:
        throw new Error("cannot handle binary operator " + operator);
    }
  }
  
  function AssignIdentifierKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  AssignIdentifierKont.prototype.equals =
      function (x)
      {
        return x instanceof AssignIdentifierKont
            && this.node === x.node
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  AssignIdentifierKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.benv.hashCode();
        return result;
      }
  AssignIdentifierKont.prototype.toString =
      function ()
      {
        return "asid-" + this.node.tag;
      }
  AssignIdentifierKont.prototype.nice =
      function ()
      {
        return "asid-" + this.node.tag;
      }
  AssignIdentifierKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  AssignIdentifierKont.prototype.apply =
      function (value, store, lkont, kont)
      {
        var node = this.node;
        var benv = this.benv;
        var name = node.left.name;
        var newValue;
        switch (node.operator)
        {
          case "=":
          {
            newValue = value;
            break;
          }
          case "+=":
          {
            var existingValue = doScopeLookup(node.left, benv, store);
            newValue = l.add(existingValue, value);
            break;
          }
          case "-=":
          {
            var existingValue = doScopeLookup(node.left, benv, store);
            newValue = l.sub(existingValue, value);
            break;
          }
          case "*=":
          {
            var existingValue = doScopeLookup(node.left, benv, store);
            newValue = l.mul(existingValue, value);
            break;
          }
          case "|=":
          {
            var existingValue = doScopeLookup(node.left, benv, store);
            newValue = l.binor(existingValue, value);
            break;
          }
          default:
            throw new Error("cannot handle assignment operator " + node.operator);
        }
        if (newValue === BOT)
        {
          return [];
        }
        // if (kont.topmostApplicationReachable())
        // {
        //   newValue = newValue.abst();
        // }
        store = doScopeSet(node.left, newValue, benv, store);
        return [{state: new KontState(newValue, store, lkont, kont)}];
      }
  
  function OperatorKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  OperatorKont.prototype.equals =
      function (x)
      {
        return x instanceof OperatorKont
            && this.node === x.node
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  OperatorKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.benv.hashCode();
        return result;
      }
  OperatorKont.prototype.toString =
      function ()
      {
        return "rator-" + this.node.tag;
      }
  OperatorKont.prototype.nice =
      function ()
      {
        return "rator-" + this.node.tag;
      }
  OperatorKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  OperatorKont.prototype.apply =
      function (operatorValue, store, lkont, kont)
      {
        var node = this.node;
        var benv = this.benv;
        var operands = node.arguments;
        
        if (operands.length === 0)
        {
          if (Ast.isNewExpression(node))
          {
            return applyCons(node, operatorValue, [], benv, store, lkont, kont, []);
          }
          return applyProc(node, operatorValue, [], realm.GlobalObject, null, store, lkont, kont, []);
        }
        var frame = new OperandsKont(node, 1, benv, operatorValue, [], realm.GlobalObject);
        return [{state: new EvalState(operands[0], benv, store, [frame].concat(lkont), kont)}];
      }
  
  function OperandsKont(node, i, benv, operatorValue, operandValues, thisValue)
  {
    assertDefinedNotNull(operatorValue);
    this.node = node;
    this.i = i;
    this.benv = benv;
    this.operatorValue = operatorValue;
    this.operandValues = operandValues;
    this.thisValue = thisValue;
  }
  
  OperandsKont.prototype.equals =
      function (x)
      {
        return x instanceof OperandsKont
            && this.node === x.node
            && this.i === x.i
            && (this.benv === x.benv || this.benv.equals(x.benv))
            && (this.thisValue === x.thisValue || this.thisValue.equals(x.thisValue))
            && (this.operatorValue === x.operatorValue || this.operatorValue.equals(x.operatorValue))
            && (this.operandValues === x.operandValues || this.operandValues.equals(x.operandValues))
      }
  OperandsKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.i;
        result = prime * result + this.benv.hashCode();
        result = prime * result + this.operatorValue.hashCode();
        result = prime * result + this.operandValues.hashCode();
        result = prime * result + this.thisValue.hashCode();
        return result;
      }
  OperandsKont.prototype.toString =
      function ()
      {
        return "rand-" + this.node.tag + "-" + this.i;
      }
  OperandsKont.prototype.nice =
      function ()
      {
        return "rand-" + this.node.tag + "-" + this.i;
      }
  OperandsKont.prototype.addresses =
      function ()
      {
        const operatorAs = this.operatorValue.addresses();
        const benvAs = this.benv.addresses();
        var addresses = operatorAs.join(this.thisValue.addresses()).join(benvAs);
        this.operandValues.forEach(function (value)
        {
          addresses = addresses.join(value.addresses())
        });
        return addresses;
      }
  OperandsKont.prototype.apply =
      function (operandValue, store, lkont, kont)
      {
        var node = this.node;
        var benv = this.benv;
        var i = this.i;
        var operatorValue = this.operatorValue;
        var operandValues = this.operandValues;
        var thisValue = this.thisValue;
        var operands = node.arguments;
        
        if (i === operands.length)
        {
          if (Ast.isNewExpression(node))
          {
            return applyCons(node, operatorValue, operandValues.addLast(operandValue), benv, store, lkont, kont, []);
          }
          return applyProc(node, operatorValue, operandValues.addLast(operandValue), thisValue, null, store, lkont, kont, []);
        }
        var frame = new OperandsKont(node, i + 1, benv, operatorValue, operandValues.addLast(operandValue), thisValue);
        return [{state: new EvalState(operands[i], benv, store, [frame].concat(lkont), kont)}];
      }
  
  function BodyKont(node, i, benv)
  {
    this.node = node;
    this.i = i;
    this.benv = benv;
  }
  
  BodyKont.prototype.equals =
      function (x)
      {
        return x instanceof BodyKont
            && this.node === x.node
            && this.i === x.i
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  BodyKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.i;
        result = prime * result + this.benv.hashCode();
        return result;
      }
  BodyKont.prototype.toString =
      function ()
      {
        return "body-" + this.node.tag + "-" + this.i;
      }
  BodyKont.prototype.nice =
      function ()
      {
        return "body-" + this.node.tag + "-" + this.i;
      }
  BodyKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  BodyKont.prototype.apply =
      function (value, store, lkont, kont)
      {
        var node = this.node;
        var benv = this.benv;
        var i = this.i;
        
        var nodes = node.body;
        if (i === nodes.length - 1)
        {
          return [{state: new EvalState(nodes[i], benv, store, lkont, kont)}];
        }
        var frame = new BodyKont(node, i + 1, benv);
        return [{state: new EvalState(nodes[i], benv, store, [frame].concat(lkont), kont)}];
      }
  
  function ReturnKont(node)
  {
    this.node = node;
  }
  
  ReturnKont.prototype.equals =
      function (x)
      {
        return x instanceof ReturnKont
            && this.node === x.node
      }
  ReturnKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        return result;
      }
  ReturnKont.prototype.toString =
      function ()
      {
        return "ret-" + this.node.tag;
      }
  ReturnKont.prototype.nice =
      function ()
      {
        return "ret-" + this.node.tag;
      }
  ReturnKont.prototype.addresses =
      function ()
      {
        return EMPTY_ADDRESS_SET;
      }
  ReturnKont.prototype.apply =
      function (value, store, lkont, kont)
      {
        var node = this.node;
        return [{state: new ReturnState(value, store, lkont, kont)}];
      }
  
  function TryKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  TryKont.prototype.equals =
      function (x)
      {
        return x instanceof TryKont
            && this.node === x.node
      }
  TryKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        return result;
      }
  TryKont.prototype.toString =
      function ()
      {
        return "try-" + this.node.tag;
      }
  TryKont.prototype.nice =
      function ()
      {
        return "try-" + this.node.tag;
      }
  TryKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  TryKont.prototype.apply =
      function (tryValue, store, lkont, kont)
      {
        var node = this.node;
        return [{state: new KontState(tryValue, store, lkont, kont)}];
      }
  TryKont.prototype.applyThrow =
      function (throwValue, store, lkont, kont)
      {
        var node = this.node;
        var handler = node.handler;
        var body = handler.body;
        var nodes = body.body;
        if (nodes.length === 0)
        {
          return [{state: new KontState(L_UNDEFINED, store, lkont, kont)}];
        }
        
        var extendedBenv = this.benv.extend();
        var param = handler.param;
        var name = param.name;
        var addr = a.vr(param);
        extendedBenv = extendedBenv.add(name, addr);
        store = storeAlloc(store, addr, throwValue);
        return evalStatementList(body, extendedBenv, store, lkont, kont, []);
      }
  
  function ThrowKont(node)
  {
    this.node = node;
  }
  
  ThrowKont.prototype.equals =
      function (x)
      {
        return x instanceof ThrowKont
            && this.node === x.node
      }
  ThrowKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        return result;
      }
  ThrowKont.prototype.toString =
      function ()
      {
        return "throw-" + this.node.tag;
      }
  ThrowKont.prototype.nice =
      function ()
      {
        return "throw-" + this.node.tag;
      }
  ThrowKont.prototype.addresses =
      function ()
      {
        return EMPTY_ADDRESS_SET;
      }
  ThrowKont.prototype.apply =
      function (throwValue, store, lkont, kont)
      {
        var node = this.node;
        return [{state: new ThrowState(throwValue, store, lkont, kont)}];
      }
  
  function IfKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  IfKont.prototype.equals =
      function (x)
      {
        return x instanceof IfKont
            && this.node === x.node
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  IfKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.benv.hashCode();
        return result;
      }
  IfKont.prototype.toString =
      function ()
      {
        return "if-" + this.node.tag;
      }
  IfKont.prototype.nice =
      function ()
      {
        return "if-" + this.node.tag;
      }
  IfKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  IfKont.prototype.apply =
      function (conditionValue, store, lkont, kont)
      {
        var node = this.node;
        var benv = this.benv;
        var consequent = node.consequent;
        var alternate = node.alternate;
        var result = [];
        if (conditionValue.isTruthy())
        {
          result = result.concat([{state: new EvalState(consequent, benv, store, lkont, kont)}]);
        }
        if (conditionValue.isFalsy())
        {
          if (alternate === null)
          {
            result = result.concat([{state: new KontState(L_UNDEFINED, store, lkont, kont)}]);
          }
          else
          {
            result = result.concat([{state: new EvalState(alternate, benv, store, lkont, kont)}]);
          }
        }
        return result;
      }
  
  function ForInitKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  ForInitKont.prototype.equals =
      function (x)
      {
        return x instanceof ForInitKont
            && this.node === x.node
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  ForInitKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.benv.hashCode();
        return result;
      }
  ForInitKont.prototype.toString =
      function ()
      {
        return "forinit-" + this.node.tag;
      }
  ForInitKont.prototype.nice =
      function ()
      {
        return "forinit-" + this.node.tag;
      }
  ForInitKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  ForInitKont.prototype.apply =
      function (value, store, lkont, kont)
      {
        var node = this.node;
        var benv = this.benv;
        var test = node.test;
        var frame = new ForTestKont(node, L_UNDEFINED, benv);
        return [{state: new EvalState(test, benv, store, [frame].concat(lkont), kont)}];
      }
  
  function ForTestKont(node, bodyValue, benv)
  {
    this.node = node;
    this.bodyValue = bodyValue;
    this.benv = benv;
  }
  
  ForTestKont.prototype.equals =
      function (x)
      {
        return x instanceof ForTestKont
            && this.node === x.node
            && this.bodyValue.equals(x.bodyValue)
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  ForTestKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.bodyValue.hashCode();
        result = prime * result + this.benv.hashCode();
        return result;
      }
  ForTestKont.prototype.toString =
      function ()
      {
        return "fortest-" + this.node.tag;
      }
  ForTestKont.prototype.nice =
      function ()
      {
        return "fortest-" + this.node.tag;
      }
  ForTestKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  ForTestKont.prototype.apply =
      function (testValue, store, lkont, kont)
      {
        var node = this.node;
        var benv = this.benv;
        var result = [];
        if (testValue.isTruthy())
        {
          var body = node.body;
          var frame = new ForBodyKont(node, benv);
          result = result.concat([{state: new EvalState(body, benv, store, [frame].concat(lkont), kont)}]);
        }
        if (testValue.isFalsy())
        {
          result = result.concat([{state: new KontState(this.bodyValue, store, lkont, kont)}]);
        }
        return result;
      }
  
  function ForBodyKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  ForBodyKont.prototype.equals =
      function (x)
      {
        return x instanceof ForBodyKont
            && this.node === x.node
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  ForBodyKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.benv.hashCode();
        return result;
      }
  ForBodyKont.prototype.toString =
      function ()
      {
        return "forbody-" + this.node.tag;
      }
  ForBodyKont.prototype.nice =
      function ()
      {
        return "forbody-" + this.node.tag;
      }
  ForBodyKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  ForBodyKont.prototype.apply =
      function (bodyValue, store, lkont, kont)
      {
        var node = this.node;
        var benv = this.benv;
        var update = node.update;
        var frame = new ForUpdateKont(node, bodyValue, benv);
        return [{state: new EvalState(update, benv, store, [frame].concat(lkont), kont)}];
      }
  ForBodyKont.prototype.applyBreak =
      function (store, lkont, kont)
      {
        return [{state: new KontState(L_UNDEFINED, store, lkont.slice(1), kont)}];
      }
  
  function ForUpdateKont(node, bodyValue, benv)
  {
    this.node = node;
    assert(bodyValue);
    this.bodyValue = bodyValue;
    this.benv = benv;
  }
  
  ForUpdateKont.prototype.equals =
      function (x)
      {
        return x instanceof ForUpdateKont
            && this.node === x.node
            && this.bodyValue.equals(x.bodyValue)
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  ForUpdateKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.bodyValue.hashCode();
        result = prime * result + this.benv.hashCode();
        return result;
      }
  ForUpdateKont.prototype.toString =
      function ()
      {
        return "forupd-" + this.node.tag;
      }
  ForUpdateKont.prototype.nice =
      function ()
      {
        return "forupd-" + this.node.tag;
      }
  ForUpdateKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  ForUpdateKont.prototype.apply =
      function (updateValue, store, lkont, kont)
      {
        var node = this.node;
        var benv = this.benv;
        var test = node.test;
        var frame = new ForTestKont(node, this.bodyValue, benv);
        return [{state: new EvalState(test, benv, store, [frame].concat(lkont), kont)}];
      }
  
    function ForInRightKont(node, benv)
    {
      this.node = node;
      this.benv = benv;
    }
  
    ForInRightKont.prototype.equals =
        function (x)
        {
          return x instanceof ForInRightKont
              && this.node === x.node
              && (this.benv === x.benv || this.benv.equals(x.benv))
        }
    ForInRightKont.prototype.hashCode =
        function ()
        {
          var prime = 31;
          var result = 1;
          result = prime * result + this.node.hashCode();
          result = prime * result + this.benv.hashCode();
          return result;
        }
    ForInRightKont.prototype.toString =
        function ()
        {
          return "forinright-" + this.node.tag;
        }
    ForInRightKont.prototype.nice =
        function ()
        {
          return "forinright-" + this.node.tag;
        }
    ForInRightKont.prototype.addresses =
        function ()
        {
          return this.benv.addresses();
        }
    ForInRightKont.prototype.apply =
        function (ref, store, lkont, kont)
        {
          const node = this.node;
          const benv = this.benv;
          const left = node.left;
          let nameNode;
          switch (left.type)
          {
            case "VariableDeclaration":
              nameNode = left.declarations[0].id;
              break;
            default: throw new Error("cannot handle left expression " + left);
          }
          return callInternal(ref, "[[OwnPropertyKeys]]", [], store, lkont, kont,
              function (ownKeys, store)
              {
                return forInHelper(node, nameNode, ref, ownKeys, 0, benv, store, lkont, kont);
              });
        }
        
    function forInHelper(node, nameNode, ref, ownKeys, i, benv, store, lkont, kont)
    {
      if (i === ownKeys.length)
      {
        return [{state: new KontState(L_UNDEFINED, store, lkont, kont)}]; // TODO: lvps
      }
      const ownKey = ownKeys[i];
      return callInternal(ref, "[[GetOwnProperty]]", [ownKey], store, lkont, kont,
          function (desc, store)
          {
            if (desc !== undefined && desc.Enumerable.isTrue())
            {
              store = doScopeSet(nameNode, ownKey, benv, store);
              const frame = new ForInBodyKont(node, nameNode, ref, ownKeys, i, benv);
              return [{state: new EvalState(node.body, benv, store, [frame].concat(lkont), kont)}];
            }
            else
            {
              return forInHelper(node, nameNode, ref, ownKeys, i + 1, benv, store, lkont, kont);
            }
          });
    }
  
    function ForInBodyKont(node, nameNode, ref, ownKeys, i, benv)
    {
      this.node = node;
      this.nameNode = nameNode;
      this.ref = ref;
      this.ownKeys = ownKeys;
      this.i = i;
      this.benv = benv;
    }
  
    ForInBodyKont.prototype.equals =
        function (x)
        {
          return x instanceof ForInBodyKont
              && this.node === x.node
                  && this.nameNode === x.nameNode
                  && this.ref.equals(x.ref)
                  && (this.ownKeys === x.ownKeys || this.ownKeys.equals(x.ownKeys))
                  && this.i === x.i
                  && (this.benv === x.benv || this.benv.equals(x.benv))
        }
    ForInBodyKont.prototype.hashCode =
        function ()
        {
          var prime = 31;
          var result = 1;
          result = prime * result + this.node.hashCode();
          result = prime * result + this.benv.hashCode();
          result = prime * result + this.ref.hashCode();
          result = prime * result + this.ownKeys.hashCode();
          result = prime * result + i;
          return result;
        }
    ForInBodyKont.prototype.toString =
        function ()
        {
          return "forinbody-" + this.node.tag;
        }
    ForInBodyKont.prototype.nice =
        function ()
        {
          return "forinbody-" + this.node.tag;
        }
    ForInBodyKont.prototype.addresses =
        function ()
        {
          return this.benv.addresses().join(this.ref.addresses());
        }
    ForInBodyKont.prototype.apply =
        function (unusedValue, store, lkont, kont)
        {
          const node = this.node;
          const nameNode = this.nameNode;
          const ref = this.ref;
          const ownKeys = this.ownKeys;
          const i = this.i;
          const benv = this.benv;
          return forInHelper(node, nameNode, ref, ownKeys, i + 1, benv, store, lkont, kont);
        }
  
  
  
    function WhileTestKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  WhileTestKont.prototype.equals =
      function (x)
      {
        return x instanceof WhileTestKont
            && this.node === x.node
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  WhileTestKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.benv.hashCode();
        return result;
      }
  WhileTestKont.prototype.toString =
      function ()
      {
        return "whiletest-" + this.node.tag;
      }
  WhileTestKont.prototype.nice =
      function ()
      {
        return "whiletest-" + this.node.tag;
      }
  WhileTestKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  WhileTestKont.prototype.apply =
      function (testValue, store, lkont, kont)
      {
        var node = this.node;
        var benv = this.benv;
        var body = node.body;
        var result = [];
        if (testValue.isTruthy())
        {
          var frame = new WhileBodyKont(node, benv);
          result = result.concat([{state: new EvalState(body, benv, store, [frame].concat(lkont), kont)}]);
        }
        if (testValue.isFalsy())
        {
          result = result.concat([{state: new KontState(L_UNDEFINED, store, lkont, kont)}]);
        }
        return result;
      }
  
  function WhileBodyKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  WhileBodyKont.prototype.equals =
      function (x)
      {
        return x instanceof WhileBodyKont
            && this.node === x.node
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  WhileBodyKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.benv.hashCode();
        return result;
      }
  WhileBodyKont.prototype.toString =
      function ()
      {
        return "whilebody-" + this.node.tag;
      }
  WhileBodyKont.prototype.nice =
      function ()
      {
        return "whilebody-" + this.node.tag;
      }
  WhileBodyKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  WhileBodyKont.prototype.apply =
      function (bodyValue, store, lkont, kont)
      {
        var node = this.node;
        var benv = this.benv;
        var test = node.test;
        var frame = new WhileTestKont(node, benv);
        return [{state: new EvalState(test, benv, store, [frame].concat(lkont), kont)}];
      }
  WhileBodyKont.prototype.applyBreak =
      function (store, lkont, kont)
      {
        return [{state: new KontState(L_UNDEFINED, store, lkont.slice(1), kont)}];
      }
  
  function ObjectKont(node, i, benv, initValues)
  {
    this.node = node;
    this.i = i;
    this.benv = benv;
    this.initValues = initValues;
  }
  
  ObjectKont.prototype.equals =
      function (x)
      {
        return x instanceof ObjectKont
            && this.node === x.node
            && this.i === x.i
            && (this.benv === x.benv || this.benv.equals(x.benv))
            && (this.initValues === x.initValues || this.initValues.equals(x.initValues))
      }
  ObjectKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.i;
        result = prime * result + this.benv.hashCode();
        result = prime * result + this.initValues.hashCode();
        return result;
      }
  ObjectKont.prototype.toString =
      function ()
      {
        return "obj-" + this.node.tag + "-" + this.i;
      }
  ObjectKont.prototype.nice =
      function ()
      {
        return "obj-" + this.node.tag + "-" + this.i;
      }
  ObjectKont.prototype.addresses =
      function ()
      {
        var addresses = this.benv.addresses();
        this.initValues.forEach(function (value)
        {
          addresses = addresses.join(value.addresses())
        });
        return addresses;
      }
  ObjectKont.prototype.apply =
      function (initValue, store, lkont, kont)
      {
        var node = this.node;
        var properties = node.properties;
        var benv = this.benv;
        var i = this.i;
        var initValues = this.initValues.addLast(initValue);
        
        if (properties.length === i)
        {
          const obj = ObjectCreate(realm.Intrinsics.get("%ObjectPrototype%"));
          const objectAddress = a.object(node, benv, store, lkont, kont);
          store = storeAlloc(store, objectAddress, obj);
          const object = l.abstRef(objectAddress);
          let result = [];
          let overallSuccess = true;
          for (var j = 0; j < i; j++)
          {
            const propName = l.abst1(properties[j].key.name);
            const propValue = initValues[j];
            result = result.concat(CreateDataPropertyOrThrow(object, propName, propValue, store, lkont, kont,
                function (success, updatedStore)
                {
                  store = updatedStore;
                  overallSuccess = overallSuccess && success.isTrue();
                  return [];
                }));
            //obj = obj.add(propertyName, Property.fromValue(initValues[j]));
          }
          if (overallSuccess)
          {
            result.push({state: new KontState(object, store, lkont, kont)});
          }
          return result;
        }
        var frame = new ObjectKont(node, i + 1, benv, initValues);
        return [{state: new EvalState(properties[i].value, benv, store, [frame].concat(lkont), kont)}];
      }
  
  function ArrayKont(node, i, benv, initValues)
  {
    this.node = node;
    this.i = i;
    this.benv = benv;
    this.initValues = initValues;
  }
  
  ArrayKont.prototype.equals =
      function (x)
      {
        return x instanceof ArrayKont
            && this.node === x.node
            && this.i === x.i
            && (this.benv === x.benv || this.benv.equals(x.benv))
            && (this.initValues === x.initValues || this.initValues.equals(x.initValues))
      }
  ArrayKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.i;
        result = prime * result + this.benv.hashCode();
        result = prime * result + this.initValues.hashCode();
        return result;
      }
  ArrayKont.prototype.toString =
      function ()
      {
        return "arr-" + this.node.tag + "-" + this.i;
      }
  ArrayKont.prototype.nice =
      function ()
      {
        return "arr-" + this.node.tag + "-" + this.i;
      }
  ArrayKont.prototype.addresses =
      function ()
      {
        var addresses = this.benv.addresses();
        this.initValues.forEach(function (value)
        {
          addresses = addresses.join(value.addresses())
        });
        return addresses;
      }
  ArrayKont.prototype.apply =
      function (initValue, store, lkont, kont)
      {
        var node = this.node;
        var elements = node.elements;
        var benv = this.benv;
        var i = this.i;
        var initValues = this.initValues.addLast(initValue);
        
        if (elements.length === i)
        {
          var arr = createArray();
          var arrAddress = a.array(node, benv, store, lkont, kont);
          for (var j = 0; j < i; j++)
          {
            var indexName = l.abst1(String(j));
            arr = arr.add(indexName, Property.fromValue(initValues[j]));
          }
          arr = arr.add(P_LENGTH, Property.fromValue(l.abst1(i)));
          store = storeAlloc(store, arrAddress, arr);
          return [{state: new KontState(l.abstRef(arrAddress), store, lkont, kont)}];
        }
        var frame = new ArrayKont(node, i + 1, benv, initValues);
        return [{state: new EvalState(elements[i], benv, store, [frame].concat(lkont), kont)}];
      }
  
  function MemberKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  MemberKont.prototype.equals =
      function (x)
      {
        return x instanceof MemberKont
            && this.node === x.node
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  MemberKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.benv.hashCode();
        return result;
      }
  MemberKont.prototype.toString =
      function ()
      {
        return "mem-" + this.node.tag;
      }
  MemberKont.prototype.nice =
      function ()
      {
        return "mem-" + this.node.tag;
      }
  MemberKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  MemberKont.prototype.apply =
      function (objectValue, store, lkont, kont)
      {
        var node = this.node;
        var benv = this.benv;
        var property = node.property;
        let objectRef;
        return ToObject(objectValue, node, store, lkont, kont,
            function (objectRef, store)
            {
              if (node.computed)
              {
                var frame = new MemberPropertyKont(node, benv, objectRef);
                return [{state: new EvalState(property, benv, store, [frame].concat(lkont), kont)}];
              }
              var value = doProtoLookup(l.abst1(property.name), objectRef.addresses(), store);
              return [{state: new KontState(value, store, lkont, kont)}];
            });
      }
  
  function MemberPropertyKont(node, benv, objectRef)
  {
    this.node = node;
    this.benv = benv;
    this.objectRef = objectRef;
  }
  
  MemberPropertyKont.prototype.equals =
      function (x)
      {
        return x instanceof MemberPropertyKont
            && this.node === x.node
            && (this.benv === x.benv || this.benv.equals(x.benv))
            && (this.objectRef === x.objectRef || this.objectRef.equals(x.objectRef))
      }
  MemberPropertyKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.benv.hashCode();
        result = prime * result + this.objectRef.hashCode();
        return result;
      }
  MemberPropertyKont.prototype.toString =
      function ()
      {
        return "mem-" + this.node.tag;
      }
  MemberPropertyKont.prototype.nice =
      function ()
      {
        return "mem-" + this.node.tag;
      }
  MemberPropertyKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses().join(this.objectRef.addresses());
      }
  
  MemberPropertyKont.prototype.apply =
      function (propertyValue, store, lkont, kont)
      {
        if (propertyValue === BOT)
        {
          return [];
        }
        var objectRef = this.objectRef;
        var nameValue = propertyValue.ToString();
        var value = doProtoLookup(nameValue, objectRef.addresses(), store);
        return [{state: new KontState(value, store, lkont, kont)}];
      }
  
  
  function CallMemberKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  CallMemberKont.prototype.equals =
      function (x)
      {
        return x instanceof CallMemberKont
            && this.node === x.node
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  CallMemberKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.benv.hashCode();
        return result;
      }
  CallMemberKont.prototype.toString =
      function ()
      {
        return "memcall-" + this.node.tag;
      }
  CallMemberKont.prototype.nice =
      function ()
      {
        return "memcall-" + this.node.tag;
      }
  CallMemberKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  CallMemberKont.prototype.apply =
      function (objectValue, store, lkont, kont)
      {
        var node = this.node;
        var benv = this.benv;
        var property = node.callee.property;
        if (node.computed)
        {
          throw new Error("TODO");
        }
        var nameValue = l.abst1(property.name);
        return ToObject(objectValue, node, store, lkont, kont,
            function (objectRef, store)
            {
              var operands = node.arguments;
              return invoke(node, objectRef, nameValue, operands, benv, store, lkont, kont);
            });
      }
  
  
  function invoke(application, thisValue, nameValue, operands, benv, store, lkont, kont)
  {
    var operatorValue = doProtoLookup(nameValue, thisValue.addresses(), store);
    if (operands.length === 0)
    {
      if (Ast.isNewExpression(application))
      {
        return applyCons(application, operatorValue, [], benv, store, lkont, kont);
      }
      return applyProc(application, operatorValue, [], thisValue, null, store, lkont, kont);
    }
    var frame = new OperandsKont(application, 1, benv, operatorValue, [], thisValue);
    return [{state: new EvalState(operands[0], benv, store, [frame].concat(lkont), kont)}];
  }
  
  function AssignMemberKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  AssignMemberKont.prototype.equals =
      function (x)
      {
        return x instanceof AssignMemberKont
            && this.node === x.node
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  AssignMemberKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.benv.hashCode();
        return result;
      }
  AssignMemberKont.prototype.toString =
      function ()
      {
        return "memas-" + this.node.tag;
      }
  AssignMemberKont.prototype.nice =
      function ()
      {
        return "memas-" + this.node.tag;
      }
  AssignMemberKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  AssignMemberKont.prototype.apply =
      function (objectRef, store, lkont, kont)
      {
        var node = this.node;
        var benv = this.benv;
        var left = node.left;
        var property = left.property;
        if (left.computed)
        {
          var frame = new AssignMemberPropertyKont(node, benv, objectRef);
          return [{state: new EvalState(property, benv, store, [frame].concat(lkont), kont)}];
        }
        var right = node.right;
        var nameValue = l.abst1(property.name);
        var frame = new MemberAssignmentValueKont(node, benv, objectRef, nameValue);
        return [{state: new EvalState(right, benv, store, [frame].concat(lkont), kont)}];
      }
  
  function UpdateMemberKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  UpdateMemberKont.prototype.equals =
      function (x)
      {
        return x instanceof UpdateMemberKont
            && this.node === x.node
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  UpdateMemberKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.benv.hashCode();
        return result;
      }
  UpdateMemberKont.prototype.toString =
      function ()
      {
        return "upmem-" + this.node.tag;
      }
  UpdateMemberKont.prototype.nice =
      function ()
      {
        return "upmem-" + this.node.tag;
      }
  UpdateMemberKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  UpdateMemberKont.prototype.apply =
      function (objectRef, store, lkont, kont)
      {
        var node = this.node;
        var benv = this.benv;
        var argument = node.argument;
        var property = argument.property;
        if (argument.computed)
        {
          var frame = new UpdateMemberPropertyKont(node, benv, objectRef); // TODO
          return [{state: new EvalState(property, benv, store, [frame].concat(lkont), kont)}];
        }
        var name = l.abst1(property.name);
        var value = doProtoLookup(name, objectRef.addresses(), store);
        if (value === BOT)
        {
          return [];
        }
        var updatedValue;
        switch (node.operator)
        {
          case "++":
          {
            updatedValue = l.add(value, L_1);
            break;
          }
          case "--":
          {
            updatedValue = l.sub(value, L_1);
            break;
          }
          default:
            throw new Error("cannot handle update operator " + node.operator);
        }
        if (updatedValue === BOT)
        {
          return [];
        }
        store = doProtoSet(name, updatedValue, objectRef, store);
        var resultingValue = node.prefix ? updatedValue : value;
        return [{state: new KontState(resultingValue, store, lkont, kont)}];
      }
  
  function AssignMemberPropertyKont(node, benv, objectRef)
  {
    this.node = node;
    this.benv = benv;
    this.objectRef = objectRef;
  }
  
  AssignMemberPropertyKont.prototype.equals =
      function (x)
      {
        return x instanceof AssignMemberPropertyKont
            && this.node === x.node
            && (this.benv === x.benv || this.benv.equals(x.benv))
            && (this.objectRef === x.objectRef || this.objectRef.equals(x.objectRef))
      }
  AssignMemberPropertyKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.benv.hashCode();
        result = prime * result + this.objectRef.hashCode();
        return result;
      }
  AssignMemberPropertyKont.prototype.toString =
      function ()
      {
        return "asmemp-" + this.node.tag;
      }
  AssignMemberPropertyKont.prototype.nice =
      function ()
      {
        return "asmemp-" + this.node.tag;
      }
  AssignMemberPropertyKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses().join(this.objectRef.addresses());
      }
  AssignMemberPropertyKont.prototype.apply =
      function (propertyValue, store, lkont, kont)
      {
        if (propertyValue === BOT)
        {
          return [];
        }
        var node = this.node;
        var benv = this.benv;
        var right = node.right;
        var objectRef = this.objectRef;
        var nameValue = propertyValue.ToString();
        var frame = new MemberAssignmentValueKont(node, benv, objectRef, nameValue);
        return [{state: new EvalState(right, benv, store, [frame].concat(lkont), kont)}];
      }
  
  function MemberAssignmentValueKont(node, benv, objectRef, nameValue)
  {
    this.node = node;
    this.benv = benv;
    this.objectRef = objectRef;
    this.nameValue = nameValue;
  }
  
  MemberAssignmentValueKont.prototype.equals =
      function (x)
      {
        return x instanceof MemberAssignmentValueKont
            && this.node === x.node
            && (this.benv === x.benv || this.benv.equals(x.benv))
            && (this.objectRef === x.objectRef || this.objectRef.equals(x.objectRef))
            && (this.nameValue === x.nameValue || this.nameValue.equals(x.nameValue))
      }
  MemberAssignmentValueKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.benv.hashCode();
        result = prime * result + this.objectRef.hashCode();
        result = prime * result + this.nameValue.hashCode();
        return result;
      }
  MemberAssignmentValueKont.prototype.toString =
      function ()
      {
        return "memasv-" + this.node.tag;
      }
  MemberAssignmentValueKont.prototype.nice =
      function ()
      {
        return "memasv-" + this.node.tag;
      }
  MemberAssignmentValueKont.prototype.addresses =
      function ()
      {
        // no addresses from nameValue: required to be `ToString`ed! (see assert in constr)
        return this.benv.addresses().join(this.objectRef.addresses());
      }
  MemberAssignmentValueKont.prototype.apply =
      function (value, store, lkont, kont)
      {
        var node = this.node;
        var objectRef = this.objectRef;
        var nameValue = this.nameValue;
        var newValue;
        switch (node.operator)
        {
          case "=":
          {
            newValue = value;
            break;
          }
          case "+=":
          {
            var existingValue = doProtoLookup(nameValue, objectRef.addresses(), store);
            var newValue = l.add(existingValue, value);
            break;
          }
          case "-=":
          {
            var existingValue = doProtoLookup(nameValue, objectRef.addresses(), store);
            var newValue = l.sub(existingValue, value);
            break;
          }
          case "|=":
          {
            var existingValue = doProtoLookup(nameValue, objectRef.addresses(), store);
            newValue = l.binor(existingValue, value);
            break;
          }
          default:
            throw new Error("cannot handle assignment operator " + node.operator);
        }
        if (newValue === BOT)
        {
          return [];
        }
        store = doProtoSet(nameValue, newValue, objectRef, store);
        return [{state: new KontState(newValue, store, lkont, kont)}];
      }
  
  
  function doScopeLookup(nameNode, benv, store)
  {
    var name = nameNode.name;
    var a = benv.lookup(name);
    if (a === BOT)
    {
      var aname = l.abst1(name);
      const value = doProtoLookup(aname, realm.GlobalObject.addresses(), store);
      if (value === BOT)
      {
        throw new Error("not found in scope: " + nameNode);
      }
      return value;
    }
    return storeLookup(store, a);
  }
  
  function doProtoLookup(name, as, store)
  {
    var result = BOT;
    as = as.values();
    while (as.length !== 0)
    {
      var a = as.pop();
      var obj = storeLookup(store, a);
      const prop = obj.lookup(name);
      let found = false;
      if (prop !== BOT)
      {
        found = prop.must;
        const property = prop.value;
        const value = property.Value;
        result = result.join(value);
      }
      if (!found)
      {
        const proto = obj.getInternal("[[Prototype]]").value;
        if (proto.subsumes(L_NULL))
        {
          result = result.join(L_UNDEFINED);
        }
        const cprotoAddresses = proto.addresses();
        as = as.concat(cprotoAddresses.values());
      }
    }
    return result;
  }
  
  // TODO temp until properties refactoring
  function hasProtoLookup(name, as, store)
  {
    var result = BOT;
    as = as.values();
    while (as.length !== 0)
    {
      var a = as.pop();
      var obj = storeLookup(store, a);
      var prop = obj.lookup(name);
      if (prop !== BOT)
      {
        result = result.join(L_TRUE);
        const present = prop.must; // TODO getter/setter
        if (!present)
        {
          result = result.join(L_FALSE);
        }
      }
      else
      {
        result = result.join(L_FALSE);
      }
    }
    return result;
  }
  
  function lookupInternal(O, name, store)
  {
    assertDefinedNotNull(store);
    let result = BOT;
    const as = O.addresses().values();
    while (as.length > 0)
    {
      const a = as.pop();
      const obj = storeLookup(store, a);
      const value = obj.getInternal(name).value;
      result = result.join(value);
    }
    return result;
  }
  
  function callInternal(O, name, args, store, lkont, kont, cont)
  {
    assertDefinedNotNull(store);
    let result = [];
    const as = O.addresses().values();
    let resultValue = BOT;
    for (const a of as)
    {
      const obj = storeLookup(store, a);
      const fs = obj.getInternal(name).value;
      if (!fs)
      {
        throw new Error("no internal slot: " + name);
      }
      for (const f of fs)
      {
        result = result.concat(f.apply(null, [O].concat(args).concat([store, lkont, kont, cont])));
      }
    }
    return result;
  }
  
  function assignInternal(O, name, value, store)
  {
    const as = O.addresses().values();
    while (as.length > 0)
    {
      const a = as.pop();
      let obj = storeLookup(store, a);
      obj = obj.setInternal(name, value);
      store = storeUpdate(store, a, obj);
    }
    return store;
  }
  
    function hasInternal(O, name, store)
    {
      assert(typeof name === "string");
      assertDefinedNotNull(store);
      let result = BOT;
      const as = O.addresses().values();
      while (as.length > 0)
      {
        const a = as.pop();
        const obj = storeLookup(store, a);
        result = result.join(hasInternalProperty(obj, name));
      }
      return result;
    }
  
    function getInternal(O, name, store)
    {
      assert(typeof name === "string");
      assertDefinedNotNull(store);
      let result = BOT;
      const as = O.addresses().values();
      while (as.length > 0)
      {
        const a = as.pop();
        const obj = storeLookup(store, a);
        result = result.join(obj.getInternal(name).value);
      }
      return result;
    }
    
    function doScopeSet(nameNode, value, benv, store)
  {
    var name = nameNode.name;
    var a = benv.lookup(name);
    if (a === BOT)
    {
      var aname = l.abst1(name);
      store = doProtoSet(aname, value, realm.GlobalObject, store);
    }
    else
    {
      store = storeUpdate(store, a, value);
    }
    return store;
  }
  
  function doProtoSet(name, value, objectRef, store)
  {
    var as = objectRef.addresses().values();
    while (as.length !== 0)
    {
      var a = as.pop();
      var obj = storeLookup(store, a);
      obj = obj.add(name, Property.fromValue(value));
      if (hasInternalProperty(obj, "isArray").isTrue()) // TODO temp
      {
        // ES5.1 15.4.5.1
        var n = name.ToNumber();
        var i = name.ToUint32();
        if (n.equals(i))
        {
          var len = obj.lookup(P_LENGTH).value.Value;
          if (l.gte(i, len).isTrue())
          {
            obj = obj.add(P_LENGTH, Property.fromValue(l.add(i, L_1)));
          }
        }
      }
      store = storeUpdate(store, a, obj);
    }
    return store;
  }
  
  function evalEmptyStatement(node, benv, store, lkont, kont)
  {
    return [{state: new KontState(L_UNDEFINED, store, lkont, kont)}];
  }
  
  function evalLiteral(node, benv, store, lkont, kont)
  {
    var value = l.abst1(node.value);
    return [{state: new KontState(value, store, lkont, kont)}];
  }
  
  function evalIdentifier(node, benv, store, lkont, kont)
  {
    var value = doScopeLookup(node, benv, store);
    return [{state: new KontState(value, store, lkont, kont)}];
  }
  
  function evalThisExpression(node, benv, store, lkont, kont)
  {
    const value = kont.thisValue;
    return [{state: new KontState(value, store, lkont, kont)}];
  }
  
  function evalProgram(node, benv, store, lkont, kont)
  {
    var funScopeDecls = functionScopeDeclarations(node);
    var names = Object.keys(funScopeDecls);
    names.forEach(
          function (name)
          {
            var node = funScopeDecls[name];
            var aname = l.abst1(name);
            if (Ast.isFunctionDeclaration(node))
            {
              var allocateResult = allocateClosure(node, benv, store, lkont, kont);
              var closureRef = allocateResult.ref;
              store = doProtoSet(aname, closureRef, realm.GlobalObject, allocateResult.store);
            }
            else if (Ast.isVariableDeclarator(node))
            {
              store = doProtoSet(aname, L_UNDEFINED, realm.GlobalObject, store);
            }
            else
            {
              throw new Error("cannot handle declaration " + node);
            }
          });
    return evalStatementList(node, benv, store, lkont, kont);
  }
  
  function evalStatementList(node, benv, store, lkont, kont)
  {
    var nodes = node.body;
    if (nodes.length === 0)
    {
      return [{state: new KontState(L_UNDEFINED, store, lkont, kont)}];
    }
    if (nodes.length === 1)
    {
//      return kont.unch(new EvalState(nodes[0], benv, store));
      return evalNode(nodes[0], benv, store, lkont, kont);
    }
    var frame = new BodyKont(node, 1, benv);
    return [{state: new EvalState(nodes[0], benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalVariableDeclaration(node, benv, store, lkont, kont)
  {
    var nodes = node.declarations;
    if (nodes.length === 0)
    {
      throw new Error("no declarations in " + node);
    }
    if (nodes.length === 1)
    {
      return evalVariableDeclarator(nodes[0], benv, store, lkont, kont);
    }
    var frame = new VariableDeclarationKont(node, 1, benv);
    return [{state: new EvalState(nodes[0], benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalVariableDeclarator(node, benv, store, lkont, kont)
  {
    var init = node.init;
    if (init === null)
    {
      return [{state: new KontState(L_UNDEFINED, store, lkont, kont)}];
    }
    var frame = new VariableDeclaratorKont(node, benv);
    return [{state: new EvalState(init, benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalUnaryExpression(node, benv, store, lkont, kont)
  {
    var frame = new UnaryKont(node);
    return [{state: new EvalState(node.argument, benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalBinaryExpression(node, benv, store, lkont, kont)
  {
    var frame = new LeftKont(node, benv);
    return [{state: new EvalState(node.left, benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalLogicalExpression(node, benv, store, lkont, kont)
  {
    var frame = new LogicalLeftKont(node, benv);
    return [{state: new EvalState(node.left, benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalAssignmentExpression(node, benv, store, lkont, kont)
  {
    var left = node.left;
    switch (left.type)
    {
      case "Identifier":
      {
        var right = node.right;
        var frame = new AssignIdentifierKont(node, benv);
        return [{state: new EvalState(right, benv, store, [frame].concat(lkont), kont)}];
      }
      case "MemberExpression":
      {
        var object = left.object;
        var frame = new AssignMemberKont(node, benv);
        return [{state: new EvalState(object, benv, store, [frame].concat(lkont), kont)}];
      }
      default:
      {
        throw new Error("cannot handle left hand side " + left);
      }
    }
  }
  
  function evalUpdateExpression(node, benv, store, lkont, kont)
  {
    var argument = node.argument;
    switch (argument.type)
    {
      case "Identifier":
      {
        var value = doScopeLookup(argument, benv, store);
        var updatedValue;
        switch (node.operator)
        {
          case "++":
          {
            updatedValue = l.add(value, L_1);
            break;
          }
          case "--":
          {
            updatedValue = l.sub(value, L_1);
            break;
          }
          default:
            throw new Error("cannot handle update operator " + node.operator);
        }
        if (updatedValue === BOT)
        {
          return [];
        }
        store = doScopeSet(argument, updatedValue, benv, store);
        var resultingValue = node.prefix ? updatedValue : value;
        return [{state: new KontState(resultingValue, store, lkont, kont)}];
      }
      case "MemberExpression":
      {
        var object = argument.object;
        var frame = new UpdateMemberKont(node, benv);
        return [{state: new EvalState(object, benv, store, [frame].concat(lkont), kont)}];
      }
      default:
      {
        throw new Error("cannot handle argument " + argument);
      }
    }
  }
  
  
  function allocateClosure(node, benv, store, lkont, kont)
  {
    var closure = createClosure(node, benv);
    var closurea = a.closure(node, benv, store, lkont, kont);
    
    var prototype = ObjectCreate(realm.Intrinsics.get("%ObjectPrototype%"));
    var prototypea = a.closureProtoObject(node, benv, store, lkont, kont);
    var closureRef = l.abstRef(closurea);
    prototype = prototype.add(P_CONSTRUCTOR, Property.fromValue(closureRef));
    store = storeAlloc(store, prototypea, prototype);
    
    closure = closure.add(P_PROTOTYPE, Property.fromValue(l.abstRef(prototypea)));
    store = storeAlloc(store, closurea, closure);
    return {store: store, ref: closureRef}
  }
  
  function evalFunctionExpression(node, benv, store, lkont, kont)
  {
    var allocateResult = allocateClosure(node, benv, store, lkont, kont);
    var closureRef = allocateResult.ref;
    store = allocateResult.store;
    return [{state: new KontState(closureRef, store, lkont, kont)}];
  }
  
  function evalFunctionDeclaration(node, benv, store, lkont, kont)
  {
    return [{state: new KontState(L_UNDEFINED, store, lkont, kont)}];
  }
  
  function evalCallExpression(node, benv, store, lkont, kont)
  {
    var calleeNode = node.callee;
    
    if (Ast.isMemberExpression(calleeNode))
    {
      var object = calleeNode.object;
      var frame = new CallMemberKont(node, benv);
      return [{state: new EvalState(object, benv, store, [frame].concat(lkont), kont)}];
    }
    
    var frame = new OperatorKont(node, benv);
    return [{state: new EvalState(calleeNode, benv, store, [frame].concat(lkont), kont)}];
  }
  
  
  function applyProc(application, operatorValue, operandValues, thisValue, benv, store, lkont, kont)
  {
    var operatorAs = operatorValue.addresses();
    if (errors)
    {
      if (operatorAs.count() === 0)
      {
        let throwValue = createError(l.abst1(application.callee + " is not a function"));
        return new ThrowKont(application.callee).apply(throwValue, store, lkont, kont);
      }
    }
    return operatorAs.flatMap(
        function (operatora)
        {
          var operatorObj = storeLookup(store, operatora);
          const Call = operatorObj.getInternal("[[Call]]").value;
          var callables = [...Call];
          return callables.flatMap(
              function (callable)
              {
                //if (!callable.applyFunction) {print(application, callable, Object.keys(callable))};
                return callable.applyFunction(application, operandValues, thisValue, operatorObj, store, lkont, kont);
              })
        })
  }
  
  // cloned from 'applyProc', invokes 'applyConstructor' iso. 'applyFunction' on callables
  function applyCons(application, operatorValue, operandValues, benv, store, lkont, kont)
  {
    var operatorAs = operatorValue.addresses();
    return operatorAs.flatMap(
        function (operatora)
        {
          var obj = storeLookup(store, operatora);
          var protoRef = obj.lookup(P_PROTOTYPE).value.Value;
          const Call = obj.getInternal("[[Call]]").value;
          var callables = [...Call];
          return callables.flatMap(
              function (callable)
              {
                return callable.applyConstructor(application, operandValues, protoRef, benv, store, lkont, kont);
              })
        })
  }
  
  function evalReturnStatement(node, benv, store, lkont, kont)
  {
    var argumentNode = node.argument;
    if (argumentNode === null)
    {
      return [{state: new ReturnState(L_UNDEFINED, store, lkont, kont)}];
    }
    
    var frame = new ReturnKont(node);
    return [{state: new EvalState(argumentNode, benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalBreakStatement(node, benv, store, lkont, kont)
  {
    return [{state: new BreakState(store, lkont, kont)}];
  }
  
  function evalTryStatement(node, benv, store, lkont, kont)
  {
    var block = node.block;
    var frame = new TryKont(node, benv);
    return [{state: new EvalState(block, benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalThrowStatement(node, benv, store, lkont, kont)
  {
    var argumentNode = node.argument;
    
    var frame = new ThrowKont(node);
    return [{state: new EvalState(argumentNode, benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalIfStatement(node, benv, store, lkont, kont)
  {
    var testNode = node.test;
    var frame = new IfKont(node, benv);
    return [{state: new EvalState(testNode, benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalConditionalExpression(node, benv, store, lkont, kont)
  {
    var testNode = node.test;
    var frame = new IfKont(node, benv);
    return [{state: new EvalState(testNode, benv, store, [frame].concat(lkont), kont)}];
  }
  
    function evalForStatement(node, benv, store, lkont, kont)
    {
      var init = node.init;
      if (init)
      {
        var frame = new ForInitKont(node, benv);
        return [{state: new EvalState(init, benv, store, [frame].concat(lkont), kont)}];
      }
      var test = node.test;
      var frame = new ForTestKont(node, L_UNDEFINED, benv);
      return [{state: new EvalState(test, benv, store, [frame].concat(lkont), kont)}];
    }
  
    function evalForInStatement(node, benv, store, lkont, kont)
    {
      var right = node.right;
      var frame = new ForInRightKont(node, benv);
      return [{state: new EvalState(right, benv, store, [frame].concat(lkont), kont)}];
    }
  
    function evalWhileStatement(node, benv, store, lkont, kont)
  {
    var test = node.test;
    var frame = new WhileTestKont(node, benv);
    return [{state: new EvalState(test, benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalDoWhileStatement(node, benv, store, lkont, kont)
  {
    var body = node.body;
    var frame = new WhileBodyKont(node, benv);
    return [{state: new EvalState(body, benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalObjectExpression(node, benv, store, lkont, kont)
  {
    var properties = node.properties;
    if (properties.length === 0)
    {
      var obj = ObjectCreate(realm.Intrinsics.get("%ObjectPrototype%"));
      var objectAddress = a.object(node, benv, store, lkont, kont);
      store = storeAlloc(store, objectAddress, obj);
      var objectRef = l.abstRef(objectAddress);
      return [{state: new KontState(objectRef, store, lkont, kont)}];
    }
    var frame = new ObjectKont(node, 1, benv, []);
    return [{state: new EvalState(properties[0].value, benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalArrayExpression(node, benv, store, lkont, kont)
  {
    var elements = node.elements;
    if (elements.length === 0)
    {
      var arr = createArray();
      arr = arr.add(P_LENGTH, Property.fromValue(L_0));
      var arrAddress = a.array(node, benv, store, lkont, kont);
      store = storeAlloc(store, arrAddress, arr);
      var arrRef = l.abstRef(arrAddress);
      return [{state: new KontState(arrRef, store, lkont, kont)}];
    }
    var frame = new ArrayKont(node, 1, benv, []);
    return [{state: new EvalState(elements[0], benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalMemberExpression(node, benv, store, lkont, kont)
  {
    var object = node.object;
    var frame = new MemberKont(node, benv);
    return [{state: new EvalState(object, benv, store, [frame].concat(lkont), kont)}];
  }
  
  
  function evalNode(node, benv, store, lkont, kont)
  {
    switch (node.type)
    {
      case "Literal":
        return evalLiteral(node, benv, store, lkont, kont);
      case "Identifier":
        return evalIdentifier(node, benv, store, lkont, kont);
      case "BinaryExpression":
        return evalBinaryExpression(node, benv, store, lkont, kont);
      case "LogicalExpression":
        return evalLogicalExpression(node, benv, store, lkont, kont);
      case "CallExpression":
        return evalCallExpression(node, benv, store, lkont, kont);
      case "FunctionExpression":
        return evalFunctionExpression(node, benv, store, lkont, kont);
      case "AssignmentExpression":
        return evalAssignmentExpression(node, benv, store, lkont, kont);
      case "ArrayExpression":
        return evalArrayExpression(node, benv, store, lkont, kont);
      case "MemberExpression":
        return evalMemberExpression(node, benv, store, lkont, kont);
      case "ObjectExpression":
        return evalObjectExpression(node, benv, store, lkont, kont);
      case "ThisExpression":
        return evalThisExpression(node, benv, store, lkont, kont);
      case "NewExpression":
        return evalCallExpression(node, benv, store, lkont, kont);
      case "UpdateExpression":
        return evalUpdateExpression(node, benv, store, lkont, kont);
      case "UnaryExpression":
        return evalUnaryExpression(node, benv, store, lkont, kont);
      case "ExpressionStatement":
        return evalNode(node.expression, benv, store, lkont, kont);
      case "ReturnStatement":
        return evalReturnStatement(node, benv, store, lkont, kont);
      case "BreakStatement":
        return evalBreakStatement(node, benv, store, lkont, kont);
      case "LabeledStatement":
        return evalLabeledStatement(node, benv, store, lkont, kont);
      case "IfStatement":
        return evalIfStatement(node, benv, store, lkont, kont);
      case "ConditionalExpression":
        return evalConditionalExpression(node, benv, store, lkont, kont);
      case "SwitchStatement":
        return evalSwitchStatement(node, benv, store, lkont, kont);
      case "ForStatement":
        return evalForStatement(node, benv, store, lkont, kont);
      case "ForInStatement":
        return evalForInStatement(node, benv, store, lkont, kont);
      case "ForOfStatement":
        return evalForOfStatement(node, benv, store, lkont, kont);
      case "WhileStatement":
        return evalWhileStatement(node, benv, store, lkont, kont);
      case "DoWhileStatement":
        return evalDoWhileStatement(node, benv, store, lkont, kont);
      case "FunctionDeclaration":
        return evalFunctionDeclaration(node, benv, store, lkont, kont);
      case "VariableDeclaration":
        return evalVariableDeclaration(node, benv, store, lkont, kont);
      case "VariableDeclarator":
        return evalVariableDeclarator(node, benv, store, lkont, kont);
      case "BlockStatement":
        return evalStatementList(node, benv, store, lkont, kont);
      case "EmptyStatement":
        return evalEmptyStatement(node, benv, store, lkont, kont);
      case "TryStatement":
        return evalTryStatement(node, benv, store, lkont, kont);
      case "ThrowStatement":
        return evalThrowStatement(node, benv, store, lkont, kont);
      case "Program":
        return evalProgram(node, benv, store, lkont, kont);
      default:
        throw new Error("cannot handle node " + node.type);
    }
  }
  
  function createError(message)
  {
    //const O = OrdinaryCreateFromConstructor();
    let obj = new Obj();
    obj = obj.setInternal("[[Prototype]]", realm.Intrinsics.get("%ErrorPrototype%"));
    obj = obj.setInternal("[[ErrorData]]", L_UNDEFINED);
    obj = obj.add(P_MESSAGE, Property.fromValue(message));
    return obj;
  }
  
  
  
  
  
  function initialize(store)
  {
    
    function allocNative()
    {
      return a.object();
    }
    
    
    realm = new Realm(); // TODO setting global realm
    const intrinsics = new Intrinsics();
    realm.Intrinsics = intrinsics;
  
    const globala = allocNative();
    const globalRef = l.abstRef(globala);
    realm.GlobalObject = globalRef;
    
    //var globalenva = "globalenv@0";
    const objectPa = allocNative();
    const objectProtoRef = l.abstRef(objectPa);
    intrinsics.add("%ObjectPrototype%", objectProtoRef);
    const functionPa = allocNative();
    const functionProtoRef = l.abstRef(functionPa);
    intrinsics.add("%FunctionPrototype%", functionProtoRef);
  
    function registerPrimitiveFunction(object, propertyName, applyFunction, applyConstructor)
    {
      var primFunObject = createPrimitive(applyFunction, applyConstructor);
      var primFunObjectAddress = allocNative();
      store = storeAlloc(store, primFunObjectAddress, primFunObject);
      return registerProperty(object, propertyName, l.abstRef(primFunObjectAddress));
    }
    
    function registerProperty(object, propertyName, value)
    {
      object = object.add(l.abst1(propertyName), Property.fromValue(value));
      return object;
    }

// BEGIN GLOBAL
    var global = ObjectCreate(objectProtoRef);
    
    // ECMA 15.1.1 value properties of the global object (no "null", ...)
    global = registerProperty(global, "undefined", L_UNDEFINED);
    global = registerProperty(global, "NaN", l.abst1(NaN));
    global = registerProperty(global, "Infinity", l.abst1(Infinity));
    
    // specific interpreter functions
//  global = registerPrimitiveFunction(global, globala, "$meta", $meta);
    global = registerPrimitiveFunction(global, "$join", $join);
    global = registerPrimitiveFunction(global, "print", _print);
    // end specific interpreter functions
    
    // BEGIN OBJECT
    var objectP = ObjectCreate(L_NULL);
//  objectP.toString = function () { return "~Object.prototype"; }; // debug
    var objecta = allocNative();
    objectP = registerProperty(objectP, "constructor", l.abstRef(objecta));
    
    var object = createPrimitive(null, objectConstructor);
    object = object.add(P_PROTOTYPE, Property.fromValue(objectProtoRef));//was objectProtoRef
    global = global.add(l.abst1("Object"), Property.fromValue(l.abstRef(objecta)));
    
    //object = registerPrimitiveFunction(object, "create", objectCreate);
    //object = registerPrimitiveFunction(object, objecta, "getPrototypeOf", objectGetPrototypeOf);
    //object = registerPrimitiveFunction(object, objecta, "defineProperty", objectDefineProperty);
    store = storeAlloc(store, objecta, object);
    
    objectP = registerPrimitiveFunction(objectP, "hasOwnProperty", objectHasOwnProperty);
    store = storeAlloc(store, objectPa, objectP);
    
    
    function objectConstructor(application, operandValues, protoRef, benv, store, lkont, kont)
    {
      var obj = ObjectCreate(protoRef);
      var objectAddress = a.object(application, benv, store, kont);
      store = storeAlloc(store, objectAddress, obj);
      var objRef = l.abstRef(objectAddress);
      return [{state: new KontState(objRef, store, lkont, kont)}];
    }
    
    // // 19.1.2.2
    // function objectCreate(application, operandValues, thisValue, benv, store, lkont, kont)
    // {
    //   const [O, Properties] = operandValues;
    //   var obj = ObjectCreate(O);
    //
    //   // step 3
    //   if (Properties !== undefined)
    //   {
    //     return ObjectDefineProperties(obj, Properties, application, store, lkont, kont, objectCreateCont);
    //   }
    //   return objectCreateCont(obj, store);
    //
    //   // step 4
    //   function objectCreateCont(obj, store)
    //   {
    //     const objectAddress = a.object(application, benv, store, kont);
    //     store = storeAlloc(store, objectAddress, obj);
    //     const objRef = l.abstRef(objectAddress);
    //     return [{state: new KontState(objRef, store, lkont, kont)}];
    //   }
    // }
    
    // // 19.1.2.4
    // function objectDefineProperty(application, operandValues, thisa, benv, store, lkont, kont)
    // {
    //   const [O, P, Attributes] = operandValues;
    //   // const result = [];
    //   // if (O.isNonRef())
    //   // {
    //   //   return [{state:new ThrowState()}];
    //   // }
    //   // var objectAddresses = operandValues[0].addresses();
    //   // var result = BOT;
    //   // objectAddresses.forEach(
    //   //     function (objectAddress)
    //   //     {
    //   //       var obj = storeLookup(store, objectAddress);
    //   //       result = result.join(obj.Prototype);
    //   //     });
    //   // return [{state:new KontState(result, store, lkont, kont)];
    // }
    
    
    
    function objectHasOwnProperty(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      if (operandValues.length !== 1)
      {
        return [];
      }
      const result = hasProtoLookup(operandValues[0], thisValue.addresses(), store);
      return [{state: new KontState(result, store, lkont, kont)}];
    }
    
    // END OBJECT
    
    
    // BEGIN FUNCTION
    var functionP = ObjectCreate(objectProtoRef);
//  functionP.toString = function () { return "~Function.prototype"; }; // debug
    var functiona = allocNative();
    var functionP = registerProperty(functionP, "constructor", l.abstRef(functiona));
    
    
    
    var fun = createPrimitive(function ()
    {
    }); // TODO
    fun = fun.add(P_PROTOTYPE, Property.fromValue(functionProtoRef));
    global = global.add(l.abst1("Function"), Property.fromValue(l.abstRef(functiona)));
    store = storeAlloc(store, functiona, fun);
  
    functionP = registerPrimitiveFunction(functionP, "call", functionCall);
    functionP = registerPrimitiveFunction(functionP, "apply", functionApply);
  
    store = storeAlloc(store, functionPa, functionP);
    // END FUNCTION
    
    
    // BEGIN ERROR
    const errorPa = allocNative();
    const errorProtoRef = l.abstRef(errorPa);
    intrinsics.add("%ErrorPrototype%", errorProtoRef);
    
    var errorP = ObjectCreate(intrinsics.get("%ObjectPrototype%"));
    var errora = allocNative();
    var errorP = registerProperty(errorP, "constructor", l.abstRef(errora));
    var error = createPrimitive(errorFunction, errorConstructor);
    error = error.add(P_PROTOTYPE, Property.fromValue(errorProtoRef));
    global = global.add(l.abst1("Error"), Property.fromValue(l.abstRef(errora)));
    store = storeAlloc(store, errora, error);
    store = storeAlloc(store, errorPa, errorP);
    
    function errorFunction(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      return errorInitializer(application, operandValues, benv, store, lkont, kont);
    }
    
    function errorConstructor(application, operandValues, protoRef, benv, store, lkont, kont)
    {
      return errorInitializer(application, operandValues, benv, store, lkont, kont);
    }
    
    
    function errorInitializer(application, operandValues, benv, store, lkont, kont)
    {
      const message = operandValues.length === 1 && operandValues[0] !== BOT ? operandValues[0].ToString() : L_EMPTY_STRING;
      const obj = createError(message);
      var errAddress = a.error(application, benv, store, kont);
      store = storeAlloc(store, errAddress, obj);
      var errRef = l.abstRef(errAddress);
      return [{state: new KontState(errRef, store, lkont, kont)}];
    }
    
    // END ERROR
    
    
    // BEGIN STRING
    const stringPa = allocNative();
    const stringProtoRef = l.abstRef(stringPa);
    intrinsics.add("%StringPrototype%", stringProtoRef);
    var stringP = ObjectCreate(intrinsics.get("%ObjectPrototype%"));
    //  stringP.toString = function () { return "~String.prototype"; }; // debug
    var stringa = allocNative();
    var stringP = registerProperty(stringP, "constructor", l.abstRef(stringa));
    var string = createPrimitive(stringFunction, null);
    string = string.add(P_PROTOTYPE, Property.fromValue(intrinsics.get("%StringPrototype%")));
    global = global.add(l.abst1("String"), Property.fromValue(l.abstRef(stringa)));
    store = storeAlloc(store, stringa, string);
    
    stringP = registerPrimitiveFunction(stringP, "charAt", stringCharAt);
    stringP = registerPrimitiveFunction(stringP, "charCodeAt", stringCharCodeAt);
    stringP = registerPrimitiveFunction(stringP, "startsWith", stringStartsWith);
    
    store = storeAlloc(store, stringPa, stringP);
    
    function stringFunction(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      if (operandValues.length === 0)
      {
        return [{state: new KontState(L_EMPTY_STRING, store, lkont, kont)}];
      }
      return [{state: new KontState(operandValues[0].ToString(), store, lkont, kont)}];
    }
    
    function stringCharAt(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      var lprim = getInternal(thisValue, "[[StringData]]", store);
      var value = lprim.charAt(operandValues[0]);
      return [{state: new KontState(value, store, lkont, kont)}];
    }
    
    function stringCharCodeAt(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      var lprim = getInternal(thisValue, "[[StringData]]", store);
      var value = lprim.charCodeAt(operandValues[0]);
      return [{state: new KontState(value, store, lkont, kont)}];
    }
    
    function stringStartsWith(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      var lprim = getInternal(thisValue, "[[StringData]]", store);
      var value = lprim.startsWith(operandValues[0]);
      return [{state: new KontState(value, store, lkont, kont)}];
    }
    
    // END STRING
    
    
    // BEGIN ARRAY
    const arrayPa = allocNative();
    const arrayProtoRef = l.abstRef(arrayPa);
    intrinsics.add("%ArrayPrototype%", arrayProtoRef);
    
    var arrayP = ObjectCreate(intrinsics.get("%ObjectPrototype%"));
    var arraya = allocNative();
    var arrayP = registerProperty(arrayP, "constructor", l.abstRef(arraya));
    var array = createPrimitive(arrayFunction, arrayConstructor);
    array = array.add(P_PROTOTYPE, Property.fromValue(arrayProtoRef));
    global = global.add(l.abst1("Array"), Property.fromValue(l.abstRef(arraya)));
    store = storeAlloc(store, arraya, array);
    
    arrayP = registerPrimitiveFunction(arrayP, "toString", arrayToString);
    arrayP = registerPrimitiveFunction(arrayP, "concat", arrayConcat);
    arrayP = registerPrimitiveFunction(arrayP, "push", arrayPush);
//  arrayP = registerPrimitiveFunction(arrayP, arrayPa, "map", arrayMap);
//  arrayP = registerPrimitiveFunction(arrayP, arrayPa, "reduce", arrayReduce);
    store = storeAlloc(store, arrayPa, arrayP);
    
    function arrayConstructor(application, operandValues, protoRef, benv, store, lkont, kont)
    {
      var arr = createArray();
      var length;
      if (operandValues.length === 0)
      {
        length = L_0;
      }
      else if (operandValues.length === 1)
      {
        length = operandValues[0];
      }
      else
      {
        throw new Error("TODO: " + operandValues.length);
      }
      arr = arr.add(P_LENGTH, Property.fromValue(length));
      
      var arrAddress = a.array(application, benv, store, kont);
      store = storeAlloc(store, arrAddress, arr);
      var arrRef = l.abstRef(arrAddress);
      return [{state: new KontState(arrRef, store, lkont, kont)}];
    }
    
    function arrayFunction(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      var arr = createArray();
      for (var i = 0; i < operandValues.length; i++)
      {
        arr = arr.add(l.abst1(String(i)), Property.fromValue(operandValues[i]));
      }
      arr = arr.add(P_LENGTH, Property.fromValue(l.abst1(operandValues.length)));
      
      var arrAddress = a.array(application, benv, store, kont);
      store = storeAlloc(store, arrAddress, arr);
      var arrRef = l.abstRef(arrAddress);
      return [{state: new KontState(arrRef, store, lkont, kont)}];
    }
    
    function arrayToString(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      return CreateListFromArrayLike(thisValue, undefined, store, lkont, kont,
          function (list, store)
          {
            return {state: new KontState(l.abst1(list.join()), store, lkont, kont)};
          });
    }
    
    function arrayConcat(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      if (operandValues.length !== 1)
      {
        print("warning: array.concat");
        return [];
      }
      return thisValue.addresses().values().map(
          function (thisa)
          {
            var thisArr = storeLookup(store, thisa);
            var thisLen = thisArr.lookup(P_LENGTH).value.Value;
            var argAddrs = operandValues[0].addresses();
            var resultArr = createArray();
            var i = L_0;
            var seen = ArraySet.empty();
            while ((!seen.contains(i)) && l.lt(i, thisLen).isTrue())
            {
              seen = seen.add(i);
              var iname = i.ToString();
              var v = doProtoLookup(iname, ArraySet.from1(thisa), store);
              resultArr = resultArr.add(iname, Property.fromValue(v));
              i = l.add(i, L_1);
            }
            argAddrs.forEach(
                function (argAddr)
                {
                  var argArr = storeLookup(store, argAddr);
                  var argLen = argArr.lookup(P_LENGTH).value.Value;
                  var i = L_0;
                  var seen = ArraySet.empty();
                  while ((!seen.contains(i)) && l.lt(i, argLen).isTrue())
                  {
                    seen = seen.add(i);
                    var iname = i.ToString();
                    var v = doProtoLookup(iname, ArraySet.from1(argAddr), store);
                    resultArr = resultArr.add(l.add(thisLen, i).ToString(), Property.fromValue(argArr.lookup(iname).value.Value, BOT));
                    i = l.add(i, L_1);
                  }
                  resultArr = resultArr.add(P_LENGTH, Property.fromValue(l.add(thisLen, i)));
                });
            var arrAddress = a.array(application, benv, store, lkont, kont);
            store = storeAlloc(store, arrAddress, resultArr);
            return {state: new KontState(l.abstRef(arrAddress), store, lkont, kont)};
          });
    }
    
    function arrayPush(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      return thisValue.addresses().values().map(
          function (thisa)
          {
  
            var arr = storeLookup(store, thisa);
            var len = arr.lookup(P_LENGTH).value.Value;
            var lenStr = len.ToString();
            arr = arr.add(lenStr, Property.fromValue(operandValues[0]))
            var len1 = l.add(len, L_1);
            arr = arr.add(P_LENGTH, Property.fromValue(len1));
            store = storeUpdate(store, thisa, arr);
            return {state: new KontState(len1, store, lkont, kont)};
          });
    }
    
    // END ARRAY
    
    
    // BEGIN MATH
    var math = ObjectCreate(intrinsics.get("%ObjectPrototype%"));
    var matha = allocNative();
    math = registerPrimitiveFunction(math, "abs", mathAbs);
    math = registerPrimitiveFunction(math, "round", mathRound);
    math = registerPrimitiveFunction(math, "floor", mathFloor);
    math = registerPrimitiveFunction(math, "sin", mathSin);
    math = registerPrimitiveFunction(math, "cos", mathCos);
    math = registerPrimitiveFunction(math, "sqrt", mathSqrt);
    math = registerPrimitiveFunction(math, "random", mathRandom);
//  math = registerPrimitiveFunction(math, matha, "max", mathMax);
//  math = registerProperty(math, "PI", l.abst1(Math.PI));
    store = storeAlloc(store, matha, math);
    global = global.add(l.abst1("Math"), Property.fromValue(l.abstRef(matha)));
    
    
    function mathSqrt(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      var value = l.sqrt(operandValues[0]);
      return [{state: new KontState(value, store, lkont, kont)}];
    }
    
    function mathAbs(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      var value = l.abs(operandValues[0]);
      return [{state: new KontState(value, store, lkont, kont)}];
    }
    
    function mathRound(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      var value = l.round(operandValues[0]);
      return [{state: new KontState(value, store, lkont, kont)}];
    }
    
    function mathFloor(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      var value = l.floor(operandValues[0]);
      return [{state: new KontState(value, store, lkont, kont)}];
    }
    
    function mathCos(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      var value = l.cos(operandValues[0]);
      return [{state: new KontState(value, store, lkont, kont)}];
    }
    
    function mathSin(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      var value = l.sin(operandValues[0]);
      return [{state: new KontState(value, store, lkont, kont)}];
    }
    
    var random = (function ()
    {
      var seed = 0x2F6E2B1;
      return function ()
      {
        // Robert Jenkins’ 32 bit integer hash function
        seed = ((seed + 0x7ED55D16) + (seed << 12)) & 0xFFFFFFFF;
        seed = ((seed ^ 0xC761C23C) ^ (seed >>> 19)) & 0xFFFFFFFF;
        seed = ((seed + 0x165667B1) + (seed << 5)) & 0xFFFFFFFF;
        seed = ((seed + 0xD3A2646C) ^ (seed << 9)) & 0xFFFFFFFF;
        seed = ((seed + 0xFD7046C5) + (seed << 3)) & 0xFFFFFFFF;
        seed = ((seed ^ 0xB55A4F09) ^ (seed >>> 16)) & 0xFFFFFFFF;
        return (seed & 0xFFFFFFF) / 0x10000000;
      };
    }());
    
    function mathRandom(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      var value = l.abst1(random());
      return [{state: new KontState(value, store, lkont, kont)}];
    }
    
    // END MATH
    
    
    // BEGIN BASE
    var base = ObjectCreate(l.abst1(null));
    var basea = allocNative();
    base = registerPrimitiveFunction(base, "addIntrinsic", baseAddIntrinsic);
    base = registerPrimitiveFunction(base, "assignInternal", baseAssignInternal);
    base = registerPrimitiveFunction(base, "callInternal", baseCallInternal);
    base = registerPrimitiveFunction(base, "DefinePropertyOrThrow", baseDefinePropertyOrThrow);
    base = registerPrimitiveFunction(base, "hasInternal", baseHasInternal);
    base = registerPrimitiveFunction(base, "lookupInternal", baseLookupInternal);
    base = registerPrimitiveFunction(base, "newPropertyDescriptor", baseNewPropertyDescriptor);
    base = registerPrimitiveFunction(base, "sameBooleanValue", baseSameBooleanValue);
    base = registerPrimitiveFunction(base, "sameNumberValue", baseSameNumberValue);
    base = registerPrimitiveFunction(base, "sameObjectValue", baseSameObjectValue);
    base = registerPrimitiveFunction(base, "sameStringValue", baseSameStringValue);
    base = registerPrimitiveFunction(base, "StringCreate", baseStringCreate);
    base = registerPrimitiveFunction(base, "ObjectCreate", baseObjectCreate);
    base = registerPrimitiveFunction(base, "ToObject", baseToObject);
    base = registerPrimitiveFunction(base, "ToPropertyDescriptor", baseToPropertyDescriptor);
    base = registerPrimitiveFunction(base, "FromPropertyDescriptor", baseFromPropertyDescriptor);
    base = registerPrimitiveFunction(base, "ToPropertyKey", baseToPropertyKey);
    base = registerPrimitiveFunction(base, "ObjectDefineProperties", baseObjectDefineProperties);
    
    store = storeAlloc(store, basea, base);
    global = global.add(l.abst1("$BASE$"), Property.fromValue(l.abstRef(basea)));
  
  
    function baseDefinePropertyOrThrow(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      const [O, key, desc] = operandValues;
      return DefinePropertyOrThrow(O, key, desc, store, lkont, kont,
          function (success, store)
          {
            return [{state: new KontState(O, store, lkont, kont)}];
          });
    }
  
    function baseObjectDefineProperties(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      const [O, Properties] = operandValues;
      return ObjectDefineProperties(O, Properties, application, store, lkont, kont,
          function (O, store)
          {
            return [{state: new KontState(O, store, lkont, kont)}];
          });
    }
  
    function baseNewPropertyDescriptor(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      const property = Property.fromValue(BOT);
      return [{state: new KontState(property, store, lkont, kont)}];
    }
  
    function baseToPropertyKey(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      const [argument] = operandValues;
      return ToPropertyKey(argument, store, lkont, kont,
          function (value, store)
          {
            return [{state: new KontState(value, store, lkont, kont)}];
          });
    }
  
    function baseToPropertyDescriptor(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      const [Attributes] = operandValues;
      return ToPropertyDescriptor(Attributes, store, lkont, kont,
          function (desc, store)
          {
            return [{state: new KontState(desc, store, lkont, kont)}];
          });
    }
  
    function baseFromPropertyDescriptor(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      const [Desc] = operandValues;
      return FromPropertyDescriptor(Desc, application, store, lkont, kont,
          function (ref, store)
          {
            return [{state: new KontState(ref, store, lkont, kont)}];
          });
    }
  
    function baseStringCreate(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      const [value] = operandValues; // TODO pass prototype as second param
      const obj = StringCreate(value);
      const obja = a.string(application);
      store = storeAlloc(store, obja, obj);
      const ref = l.abstRef(obja);
      return [{state: new KontState(ref, store, lkont, kont)}];
    }
  
    function baseObjectCreate(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      const [proto, internalSlotsList] = operandValues;
      const obj = ObjectCreate(proto, internalSlotsList);
      const objAddr = a.object(application);
      store = storeAlloc(store, objAddr, obj);
      const ref = l.abstRef(objAddr);
      return [{state: new KontState(ref, store, lkont, kont)}];
    }
  
    function baseToObject(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      const [O] = operandValues;
      return ToObject(O, application, store, lkont, kont,
        function (objectRef, store)
        {
          return [{state: new KontState(objectRef, store, lkont, kont)}];
        });
    }
  
    function baseSameNumberValue(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      const [x, y] = operandValues;
      return [{state: new KontState(x.hasSameNumberValue(y), store, lkont, kont)}];
    }
  
    function baseSameBooleanValue(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      const [x, y] = operandValues;
      let result = BOT;
      if (x.subsumes(L_TRUE))
      {
        if (y.subsumes(L_TRUE))
        {
          result = result.join(L_TRUE);
        }
        else
        {
          result = result.join(L_FALSE);
        }
      }
      else if (y.subsumes(L_TRUE))
      {
        result = result.join(L_FALSE);
      }
      return [{state: new KontState(result, store, lkont, kont)}];
    }
    
    function baseSameStringValue(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      const [x, y] = operandValues;
      return [{state: new KontState(x.hasSameStringValue(y), store, lkont, kont)}];
    }
    
    function baseSameObjectValue(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      const [x, y] = operandValues;
      let result = BOT;
      const refx = x.projectObject();
      const refy = y.projectObject();
      if (refx.subsumes(refy))
      {
        if (refy.subsumes(refx))
        {
          result = result.join(L_TRUE);
        }
        else
        {
          result = result.join(L_TRUE).join(L_FALSE);
        }
      }
      else if (refy.subsumes(refx))
      {
        result = result.join(L_TRUE).join(L_FALSE);
      }
      else
      {
        result = result.join(L_FALSE);
      }
      return [{state: new KontState(result, store, lkont, kont)}];
    }
    
    function baseAddIntrinsic(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      const [Name, Value] = operandValues;
      realm.Intrinsics.add(Name.conc1(), Value);
      return [{state: new KontState(l.abst1(undefined), store, lkont, kont)}];
    }
    
    function baseHasInternal(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      const [O, Name] = operandValues;
      const result = hasInternal(O, Name.conc1(), store);
      return [{state: new KontState(result, store, lkont, kont)}];
    }
    
    function baseLookupInternal(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      const [O, Name] = operandValues;
      const result = lookupInternal(O, Name.conc1(), store);
      return [{state: new KontState(result, store, lkont, kont)}];
    }
    
    function baseCallInternal(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      const [O, Name, ...args] = operandValues;
      return callInternal(O, Name.conc1(), args, store, lkont, kont,
          function (value, store)
          {
            assertDefinedNotNull(store);
            return [{state: new KontState(value, store, lkont, kont)}];
          });
    }
    
    function baseAssignInternal(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      const [O, Name, Value] = operandValues;
      store = assignInternal(O, Name.conc1(), Value, store);
      return [{state: new KontState(l.abst1(undefined), store, lkont, kont)}];
    }
    
    // BEGIN PERFORMANCE
    let perf = ObjectCreate(realm.Intrinsics.get("%ObjectPrototype%"));
    const perfa = allocNative();
    perf = registerPrimitiveFunction(perf, "now", performanceNow, null);
    store = storeAlloc(store, perfa, perf);
    global = registerProperty(global, "performance", l.abstRef(perfa));
    
    function performanceNow(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      var value = l.abst1(performance.now());
      return [{state: new KontState(value, store, lkont, kont)}];
    }
    
    // END PERFORMANCE
    
    
    function $join(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      var value = operandValues.reduce(Lattice.join, BOT);
      return [{state: new KontState(value, store, lkont, kont)}];
    }
    
    function _print(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      print(operandValues);
      return [{state: new KontState(L_UNDEFINED, store, lkont, kont)}];
    }
    
    function globalParseInt(application, operandValues, thisValue, benv, store, lkont, kont)
    {
      var value = operandValues[0].parseInt(); // TODO: 2nd (base) arg
      return [{state: new KontState(value, store, lkont, kont)}];
    }
    
    global = registerPrimitiveFunction(global, "parseInt", globalParseInt);
    
    store = storeAlloc(store, globala, global);
    // END GLOBAL
    
    return {store, realm};
  } // end initialize
  
  function initializeTraits(ceskState)
  {
    let store = ceskState.store;
    return {store, realm:ceskState.realm};
  }
  
  const initial = inject(ast, ceskState);
  const system = performExplore([initial]);
  return system;
  } // end `explore`
  
  
  const module = {};
  
  module.explore = explore;
      
  return module;
}

  
  
function concExplore(ast)
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
      print(Formatter.displayTime(performance.now()-startTime), "states", id, "ctxs", sstore.count(), "sstorei", sstorei);
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
  
  // function preludeExplore(ast, state)
  // {
  //   var startTime = performance.now();
  //   var initial = module.inject(ast, state.benv, state.);
  //   var s = initial;
  //   var id = 0;
  //   while (true)
  //   {
  //     var next = s.next();
  //     id++;
  //     if (id % 10000 === 0)
  //     {
  //       print(Formatter.displayTime(performance.now()-startTime), "states", id, "ctxs", sstore.count(), "sstorei", sstorei);
  //     }
  //     var l = next.length;
  //     if (l === 1)
  //     {
  //       s = next[0].state;
  //     }
  //     else if (l === 0)
  //     {
  //       //print("loaded prelude", Formatter.displayTime(performance.now()-startTime), "states", id);
  //       a = oldA;
  //       store = s.store;
  //       return store;
  //     }
  //     else
  //     {
  //       a = oldA;
  //       throw new Error("more than one next state");
  //     }
  //   }
  // }


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

function computeResultValue(endStates)
{
  var result = BOT;
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