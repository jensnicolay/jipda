function lcCesk(cc)
{
  // address generator
  var a = cc.a;
  // benv creator
//  var b = cc.b || new DefaultBenv();
  // lattice
  var l = cc.l;
  
  var gcFlag = cc.gc === undefined ? true : cc.gc;
  var memoFlag = cc.memo === undefined ? false : cc.memo;
  var memoTable = HashMap.empty();
  
  assertDefinedNotNull(a);
  assertDefinedNotNull(l);

  // lattice (primitives + procs)
//  var l = new JipdaLattice(p); // in this CESK, prims and procs don't match!
  
  print("allocator", a);
  print("lattice", l);
  print("gc", gcFlag);
  print("memoization", memoFlag);
  
  // install constants
  var L_UNDEFINED = SetValue.from1(l.abst1(undefined));
//  var L_NULL = SetValue.from1(l.abst1(null));
//  var L_0 = SetValue.from1(l.abst1(0));
//  var L_1 = SetValue.from1(l.abst1(1));
  var L_TRUE = SetValue.from1(l.abst1(true));
  var L_FALSE = SetValue.from1(l.abst1(false));
  var L_NUMBER = SetValue.from1(l.NUMBER);
//  var L_STRING = SetValue.from1(l.STRING);
  var L_BOOLEAN = L_TRUE.join(L_FALSE);
  

  function Closure(node, statc, params, body)
  {
    assertFalse(node == null);
    this.node = node;
    this.statc = statc;
    this.params = params;
    this.body = body;
  }

  Closure.prototype.toString =
    function ()
    {
      return "<Closure " + this.node.tag + ">";
    }
  Closure.prototype.nice =
    function ()
    {
      return "<Closure " + this.node.tag + ">";
    }

  Closure.prototype.equals =
    function (other)
    {
      if (this === other)
      {
        return true;
      }
      if (!(this instanceof Closure))
      {
        return false;
      }
      return this.node === other.node
        && this.statc.equals(other.statc);
    }
  
  Closure.prototype.hashCode =
    function (x)
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.statc.hashCode();
      return result;      
    }
  
  Closure.prototype.apply_ =
    function (application, operandValues, benv, callStore, kont)
    {
//      print("apply", application, operandValues);
      var fun = this.node;
      var extendedBenv = this.statc.copy();
      var extendedStore = callStore;
      var params = this.params;
      var i = 0;
      while (!(params instanceof Null))
      {
        if (operandValues[i] == null)
        {
//          return kont.unch(new ErrorState("too few arguments", application, benv, callStore));
          return [];
        }
        var param = params.car;
        var name = param.name;
        var addr = a.variable(param, application.tag);
        extendedBenv = extendedBenv.add(name, addr);
        extendedStore = extendedStore.allocAval(addr, operandValues[i]);
        params = params.cdr;
        i++;
      }
      
      if (memoFlag)
      {
        var memoClosures = memoTable.get(fun.tag, ArraySet.empty()).values();
//        print(this.node, "memoClosures", memoClosures);
        var memoValue = BOT;
        var memoStore = BOT;
        for (var j = 0; j < memoClosures.length; j++)
        {
          var memoClosure = memoClosures[j];
          var meStore = memoClosure[0];
//            if (meStore.subsumes(extendedStore))
          if (meStore.equals(extendedStore))
          {
              var mrStore = memoClosure[1];
              var mrValue = memoClosure[2];
            return kont.pop(function (frame) {return new KontState(frame, mrValue, mrStore)}, "MEMO");
          }
//        if (memoStore !== BOT)
//        {
//          if (hits > 1)
//            {
//            print ("HITS ", hits);
//            }
////          print("MEMO!");
////          var rootSet = benv.addresses().concat(kont.addresses()).concat(memoValue.addresses());
////          var store2 = Agc.collect(memoStore, rootSet);
        }
      }
      
//      if (!(this.body.cdr instanceof Null))
//      {
//        throw new Error("expected single body expression, got " + this.body);
//      }
      var exp = this.body.car;      
      var atomicValue = evalAtomic(exp, extendedBenv, extendedStore);
      if (atomicValue)
      {
        return handleReturnValue(atomicValue, fun, extendedStore, extendedStore, kont);
      }
      extendedBenv.application = application;
      var frame = new ReturnKont(application, fun, extendedBenv, extendedStore);
      return kont.push(frame, new EvalState(exp, extendedBenv, extendedStore));
    }

  Closure.prototype.addresses =
    function ()
    {
      return this.statc.addresses();
    }
  
  Closure.prototype.ToBoolean =
    function ()
    {
      return l.Tru;
    }
  
  function Primitive(name, apply_)
  {
    this.name = name;
    this.apply_ = apply_;
  }
  
  Primitive.prototype.equals =
    function (x)
    {
      if (this === x)
      {
        return true;
      }
      return x instanceof Primitive
        && this.name === x.name 
    }
  
  Primitive.prototype.hashCode =
    function ()
    {
      return this.name.hashCode();
    }
  
  Primitive.prototype.addresses =
    function ()
    {
      return [];
    }
  
  Primitive.prototype.toString =
    function ()
    {
      return this.name;
    }
   
  
  // install global environment
  var global = Benv.empty();
  var store = new Store();
  
  function installPrimitive(name, apply_)
  {
    var proca = new ContextAddr(name, 0);
    var proc = SetValue.from1(new Primitive(name, apply_));
    global = global.add(name, proca);
    store = store.allocAval(proca, proc);    
  }
  
  function installVariable(name, value)
  {
    var vara = new ContextAddr(name, 0);
    global = global.add(name, vara);
    store = store.allocAval(vara, value);    
  }
  
  function processErrors(values, node, benv, store, kont)
  {
//    var okValues = values.filter(function (v) {return !(v instanceof Error)});
//    if (okValues.length === values.length)
//    {
//      return kont.pop(function (frame) {return new KontState(frame, SetValue.from(okValues), store)});
//    }
//    var errors = values.filter(function (v) {return v instanceof Error});
//    var result = okValues.length > 0 ? kont.pop(function (frame) {return new KontState(frame, SetValue.from(okValues), store)}) : [];
//    result = errors.reduce(
//      function (result, error)
//      {
//        return result.concat(kont.unch(new ErrorState(error.toString(), node, benv, store)))
//      }, result);
//    return result;
    return kont.pop(function (frame) {return new KontState(frame, SetValue.from(values), store)});
  }
  
  installVariable("#t", L_TRUE);
  installVariable("#f", L_FALSE);
  
  installPrimitive("+", 
    function(application, operandValues, benv, store, kont)
    {
      var values = operandValues[0].values()
        .flatMap(
          function (v1)
          {
            return operandValues[1].values().flatMap(
              function (v2)
              {
                return l.add(v1, v2);
              });
          });
      return processErrors(values, application, benv, store, kont);
    });
  installPrimitive("-", 
    function(application, operandValues, benv, store, kont)
    {
      var values = operandValues[0].values()
        .flatMap(
          function (v1)
          {
            return operandValues[1].values().flatMap(
              function (v2)
              {
                return l.sub(v1, v2);
              });
          });
      return processErrors(values, application, benv, store, kont);
    });
  installPrimitive("*", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values()
          .flatMap(
            function (v1)
            {
              return operandValues[1].values().flatMap(
                function (v2)
                {
                  return l.mul(v1, v2);
                });
            });
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("/", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values()
          .flatMap(
            function (v1)
            {
              return operandValues[1].values().flatMap(
                function (v2)
                {
                  return l.div(v1, v2);
                });
            });
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("=", 
    function(application, operandValues, benv, store, kont)
    {
      var values = operandValues[0].values()
        .flatMap(
          function (v1)
          {
            return operandValues[1].values().flatMap(
              function (v2)
              {
                return l.equals(v1, v2);
              });
          });
      return processErrors(values, application, benv, store, kont);
    });
  installPrimitive("<", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values()
          .flatMap(
            function (v1)
            {
              return operandValues[1].values().flatMap(
                function (v2)
                {
                  return l.lt(v1, v2);
                });
            });
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive(">", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values()
          .flatMap(
            function (v1)
            {
              return operandValues[1].values().flatMap(
                function (v2)
                {
                  return l.gt(v1, v2);
                });
            });
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("<=", 
    function(application, operandValues, benv, store, kont)
    {
      var values = operandValues[0].values()
        .flatMap(
          function (v1)
          {
            return operandValues[1].values().flatMap(
              function (v2)
              {
                return l.lte(v1, v2);
              });
          });
      return processErrors(values, application, benv, store, kont);
    });
  installPrimitive("not", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values().flatMap(function (value)
            {
              return l.not(value);
            })
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("null?", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values().flatMap(function (value)
            {
              return l.isNull(value);
            })
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("pair?", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values().flatMap(function (value)
            {
              return l.isPair(value);
            })
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("car", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values().flatMap(function (value)
            {
              return l.car(value);
            })
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("cdr", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values().flatMap(function (value)
            {
              return l.cdr(value); 
            })
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("cons", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values()
          .flatMap(
            function (v1)
            {
              return operandValues[1].values().flatMap(
                function (v2)
                {
                  return l.cons(v1, v2);
                });
            });
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("eq?", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values()
          .flatMap(
            function (v1)
            {
              return operandValues[1].values().flatMap(
                function (v2)
                {
                  return l.isEq(v1, v2);
                });
            });
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("equal?", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values()
          .flatMap(
            function (v1)
            {
              return operandValues[1].values().flatMap(
                function (v2)
                {
                  return l.isEq(v1, v2);
                });
            });
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("char?", 
      function(application, operandValues, benv, store, kont)
      {
        return kont.pop(function (frame) {return new KontState(frame, L_BOOLEAN, store)});
      });
  installPrimitive("symbol?", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values().flatMap(function (value)
            {
              return l.isSymbol(value);
            })
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("random", 
      function(application, operandValues, benv, store, kont)
      {
        return kont.pop(function (frame) {return new KontState(frame, L_NUMBER, store)});
      });
  installPrimitive("modulo", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values().flatMap(function (value)
            {
              return l.mod(value);
            })
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("remainder", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values().flatMap(function (value)
            {
              return l.mod(value);
            })
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("quotient", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values().flatMap(function (value)
            {
              return l.quot(value);
            })
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("ceiling", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values().flatMap(function (value)
            {
              return l.ceil(value);
            })
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("log", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values().flatMap(function (value)
            {
              return l.log(value);
            })
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("gcd", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values().flatMap(function (value)
            {
              return l.gcd(value);
            })
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("even?", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values().flatMap(function (value)
            {
              return l.isEven(value);
            })
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("odd?", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values().flatMap(function (value)
            {
              return l.isOdd(value);
            })
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("reverse", 
      function(application, operandValues, benv, store, kont)
      {
        var values = operandValues[0].values().flatMap(function (value)
            {
              return l.reverse(value);
            })
        return processErrors(values, application, benv, store, kont);
      });
  installPrimitive("error", 
      function(application, operandValues, benv, store, kont)
      {
        return [];
      });
   
  
  function InitState(node, benv, store, haltFrame)
  {
    this.type = "init";
    this.node = node;
    this.benv = benv;
    this.store = store;
    this.haltFrame = haltFrame;
  }
  InitState.prototype.toString =
    function ()
    {
      return "#init " + this.node.tag; 
    }
  InitState.prototype.nice =
    function ()
    {
      return "#init " + this.node.tag;
    }
  InitState.prototype.equals =
    function (x)
    {
      return this.type === x.type
        && this.node === x.node 
        && Eq.equals(this.benv, x.benv)
        && Eq.equals(this.store, x.store)
        && Eq.equals(this.haltFrame, x.haltFrame);
    }
  InitState.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      result = prime * result + this.haltFrame.hashCode();
      return result;
    }
  InitState.prototype.next =
    function (kont)
    {
      return kont.push(this.haltFrame, new EvalState(this.node, this.benv, this.store));
    }
  InitState.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  
  function gc(q, kont)
  {
    var store = q.store;
    if (gcFlag)
    {
//      var stackAddresses = kont.stack.flatMap(function (frame) {return frame.addresses()}).toSet();
      var stackAddresses = kont.addresses();
      var rootSet = q.addresses().concat(stackAddresses);
      var gcStore = Agc.collect(store, rootSet);
      return gcStore;
    }
    else
    {
      return store;
    }
  }  

  function EvalState(node, benv, store)
  {
    this.type = "eval";
    assertDefinedNotNull(node);
    this.node = node;
    this.benv = benv;
    this.store = store;
  }
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
        && Eq.equals(this.benv, x.benv)
        && Eq.equals(this.store, x.store);
    }
  EvalState.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  EvalState.prototype.next =
    function (kont)
    {
      return evalNode(this.node, this.benv, gc(this, kont), kont);
    }
  EvalState.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  
  function KontState(frame, value, store)
  {
    this.type = "kont";
    this.frame = frame;
    this.value = value;
    this.store = store;
  }
  KontState.prototype.equals =
    function (x)
    {
      return (x instanceof KontState)
        && Eq.equals(this.frame, x.frame) 
        && Eq.equals(this.value, x.value) 
        && Eq.equals(this.store, x.store)
    }
  KontState.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.frame.hashCode();
      result = prime * result + this.value.hashCode();
      return result;
    }
  KontState.prototype.toString =
    function ()
    {
      return "#kont-" + this.frame;
    }
  KontState.prototype.nice =
    function ()
    {
      return "#kont-" + this.frame.toString();
    }
  KontState.prototype.next =
    function (kont)
    {
      return applyKont(this.frame, this.value, gc(this, kont), kont)
    }
  KontState.prototype.addresses =
    function ()
    {
      return this.frame.addresses().concat(this.value.addresses());
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
        && Eq.equals(this.benv, x.benv);
    }
  OperatorKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
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
    function (operatorValue, store, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var operands = node.cdr;
      return evalOperands(node, operands, operatorValue, [], benv, store, kont);
    }
  
  function OperandsKont(node, operands, operatorValue, operandValues, benv)
  {
    this.node = node;
    this.operands = operands;
    this.operatorValue = operatorValue; 
    this.operandValues = operandValues; 
    this.benv = benv;
  }
  OperandsKont.prototype.equals =
    function (x)
    {
      return x instanceof OperandsKont
        && this.node === x.node 
        && this.operands === x.operands 
        && Eq.equals(this.operatorValue, x.operatorValue) 
        && Eq.equals(this.operandValues, x.operandValues) 
        && Eq.equals(this.benv, x.benv) 
    }
  OperandsKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.operands.hashCode();
      result = prime * result + this.operatorValue.hashCode();
      result = prime * result + this.operandValues.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  OperandsKont.prototype.toString =
    function ()
    {
      return "rand-" + this.node.tag + "-" + this.operands.tag;
    }
  OperandsKont.prototype.nice =
    function ()
    {
      return "rand-" + this.node.tag + "-" + this.operands.tag;
    }
  OperandsKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses()
        .concat(this.operatorValue.addresses())
        .concat(this.operandValues.flatMap(function (value) {return value.addresses()}));
    }
  OperandsKont.prototype.apply =
    function (operandValue, store, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var operatorValue = this.operatorValue;
      var operandValues = this.operandValues.addLast(operandValue);
      var operands = this.operands.cdr;
      return evalOperands(node, operands, operatorValue, operandValues, benv, store, kont);
    }
  
  function LetrecKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  LetrecKont.prototype.equals =
    function (x)
    {
      return x instanceof LetrecKont
        && this.node === x.node 
        && Eq.equals(this.benv, x.benv) 
    }
  LetrecKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  LetrecKont.prototype.toString =
    function ()
    {
      return "letrec-" + this.node.tag;
    }
  LetrecKont.prototype.nice =
    function ()
    {
      return "letrec-" + this.node.tag;
    }
  LetrecKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  LetrecKont.prototype.apply =
    function (bindingValue, store, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var bindings = node.cdr.car;
      var binding = bindings.car;
      var name = binding.car.name;      
      var addr = benv.lookup(name);
      store = store.updateAval(addr, bindingValue);
      var body = node.cdr.cdr;
      return evalBody(body, benv, store, kont);
    }
    
  function evalBody(exps, benv, store, kont)
  {
    if (exps.cdr instanceof Null)
    {
      var exp = exps.car;
      var atomicValue = evalAtomic(exp, benv, store);
      if (atomicValue)
      {
        return kont.pop(function (frame) {return new KontState(frame, atomicValue, store)});
      }
      return kont.unch(new EvalState(exp, benv, store));          
    }
    throw new Error("begin");    
  }
  
  function LetKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  LetKont.prototype.equals =
    function (x)
    {
      return x instanceof LetKont
        && this.node === x.node 
        && Eq.equals(this.benv, x.benv) 
    }
  LetKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  LetKont.prototype.toString =
    function ()
    {
      return "let-" + this.node.tag;
    }
  LetKont.prototype.nice =
    function ()
    {
      return "let-" + this.node.tag;
    }
  LetKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  LetKont.prototype.apply =
    function (bindingValue, store, kont)
    {
      var node = this.node;
      var benv = this.benv;
      return bindLetVar(node, bindingValue, benv, store, kont);
    }
  
  function bindLetVar(node, bindingValue, benv, store, kont)
  {
    var bindings = node.cdr.car;
    var binding = bindings.car;
    var name = binding.car.name;      
    var addr = a.variable(binding, benv.application ? benv.application.tag : null);
    benv = benv.add(name, addr);
    store = store.allocAval(addr, bindingValue);      
    var body = node.cdr.cdr;
    return evalBody(body, benv, store, kont);
//    var frame = new BeginKont(node, body, benv);
//    return kont.push(frame, new EvalState(body.car, benv, store));
  }
    
  function SetKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  SetKont.prototype.equals =
    function (x)
    {
      return x instanceof SetKont
        && this.node === x.node 
        && Eq.equals(this.benv, x.benv) 
    }
  SetKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  SetKont.prototype.toString =
    function ()
    {
      return "set!-" + this.node.tag;
    }
  SetKont.prototype.nice =
    function ()
    {
      return "set!-" + this.node.tag;
    }
  SetKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  SetKont.prototype.apply =
    function (setValue, store, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var name = node.cdr.car.name;      
      var addr = benv.lookup(name);
      store = store.updateAval(addr, setValue);      
      return kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
    }
    
//  function BeginKont(node, exps, benv)
//  {
//    this.node = node;
//    this.exps = exps;
//    this.benv = benv;
//  }
//  BeginKont.prototype.equals =
//    function (x)
//    {
//      return (x instanceof BeginKont)
//        && this.node === x.node
//        && this.exps === x.exps
//        && Eq.equals(this.benv, x.benv);
//    }
//  BeginKont.prototype.hashCode =
//    function ()
//    {
//      var prime = 7;
//      var result = 1;
//      result = prime * result + this.node.hashCode();
//      result = prime * result + this.exps.hashCode();
//      result = prime * result + this.benv.hashCode();
//      return result;
//    }
//  BeginKont.prototype.toString =
//    function ()
//    {
//      return "begin-" + this.node.tag + "-" + this.exps.tag;
//    }
//  BeginKont.prototype.nice =
//    function ()
//    {
//      return "begin-" + this.node.tag + "-" + this.exps.tag;
//    }
//  BeginKont.prototype.addresses =
//    function ()
//    {
//      return this.benv.addresses();
//    }
//  BeginKont.prototype.apply =
//    function (value, store, kont)
//    {
//      var node = this.node;
//      var benv = this.benv;
//      var exps = this.exps.cdr;
//      
//      if (exps.cdr instanceof Null)
//      {
//        return kont.unch(new EvalState(exps.car, benv, store));
//      }
//      var frame = new BeginKont(node, exps, benv);
//      return kont.push(frame, new EvalState(exps.car, benv, store));
//    }
  
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
        && Eq.equals(this.benv, x.benv);
    }
  IfKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
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
    function (conditionValue, store, kont)
    {
      var node = this.node;
      var benv = this.benv;
      return dispatchConditional(node, conditionValue, benv, store, kont); 
    }
  
  function dispatchConditional(node, conditionValue, benv, store, kont)
  {
    var consequent = node.cdr.cdr.car;
    var alternate = node.cdr.cdr.cdr.car;
    var tfb = trueFalse(conditionValue);
    if (tfb.equals(L_BOOLEAN))
    {
      var consequentState = kont.unch(new EvalState(consequent, benv, store));
      var alternateState = kont.unch(new EvalState(alternate, benv, store));
      return consequentState.concat(alternateState);
    }
    else if (tfb.equals(L_TRUE))
    {
      return kont.unch(new EvalState(consequent, benv, store));
    }
    else
    {
      return kont.unch(new EvalState(alternate, benv, store));
    }    
  }
  
  function OrKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  OrKont.prototype.equals =
    function (x)
    {
      return x instanceof OrKont
        && this.node === x.node 
        && Eq.equals(this.benv, x.benv);
    }
  OrKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  OrKont.prototype.toString =
    function ()
    {
      return "or-" + this.node.tag;
    }
  OrKont.prototype.nice =
    function ()
    {
      return "or-" + this.node.tag;
    }
  OrKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  OrKont.prototype.apply =
    function (conditionValue, store, kont)
    {
      var node = this.node;
      var benv = this.benv;    
      var alternate = node.cdr.cdr.car;
      var tfb = trueFalse(conditionValue);
      if (tfb.equals(L_BOOLEAN))
      {
        var consequentState = kont.pop(function (frame) {return new KontState(frame, conditionValue, store)});
        var alternateState = kont.unch(new EvalState(alternate, benv, store));
        return consequentState.concat(alternateState);
      }
      else if (tfb.equals(L_TRUE))
      {
        return kont.pop(function (frame) {return new KontState(frame, conditionValue, store)});
      }
      else
      {
        return kont.unch(new EvalState(alternate, benv, store));
      }
    }
  
  function AndKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  AndKont.prototype.equals =
    function (x)
    {
      return x instanceof AndKont
        && this.node === x.node 
        && Eq.equals(this.benv, x.benv);
    }
  AndKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  AndKont.prototype.toString =
    function ()
    {
      return "and-" + this.node.tag;
    }
  AndKont.prototype.nice =
    function ()
    {
      return "and-" + this.node.tag;
    }
  AndKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  AndKont.prototype.apply =
    function (conditionValue, store, kont)
    {
      var node = this.node;
      var benv = this.benv;    
      var alternate = node.cdr.cdr.car;
      var tfb = trueFalse(conditionValue);
      if (tfb.equals(L_BOOLEAN))
      {
        var consequentState = kont.unch(new EvalState(alternate, benv, store));
        var alternateState = kont.pop(function (frame) {return new KontState(frame, conditionValue, store)});
        return consequentState.concat(alternateState);
      }
      else if (tfb.equals(L_TRUE))
      {
        return kont.unch(new EvalState(alternate, benv, store));
      }
      else
      {
        return kont.pop(function (frame) {return new KontState(frame, conditionValue, store)});
      }
    }
  
//  function trueFalse(conditionValue)
//  {
//    var falseProj = conditionValue.meet(L_FALSE);
//    if (falseProj === BOT) // no false in value
//    {
//      return L_TRUE;
//    }
//    else if (conditionValue.equals(falseProj))
//    {
//      return L_FALSE;
//    }
//    else // value > false
//    {
//      return L_BOOLEAN;
//    }
//  }
  
  function trueFalse(conditionValue)
  {
    return SetValue.from(conditionValue._set._arr.map(
      function (av)
      {
        return av.ToBoolean()
      }));
  }
  
  function ReturnKont(node, lam, extendedBenv, extendedStore)
  {
    this.node = node;
    this.lam = lam;
    this.extendedBenv = extendedBenv;
    this.extendedStore = extendedStore;
  }
  ReturnKont.prototype.equals =
    function (x)
    {
      return x instanceof ReturnKont
        && Eq.equals(this.node, x.node)
        && Eq.equals(this.lam, x.lam)
        && Eq.equals(this.extendedBenv, x.extendedBenv)
        && Eq.equals(this.extendedStore, x.extendedStore)
    }
  ReturnKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.lam.hashCode();
      result = prime * result + this.extendedBenv.hashCode();
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
      return this.extendedBenv.addresses();
//      return [];
    }
  ReturnKont.prototype.apply =
    function (returnValue, returnStore, kont)
    {
      var lam = this.lam;
      var extendedStore = this.extendedStore; 
      return handleReturnValue(returnValue, lam, extendedStore, returnStore, kont);
    }
  
  function handleReturnValue(returnValue, lam, extendedStore, returnStore, kont)
  {
    if (memoFlag)
    {
      var memoKey = lam.tag;
      memoTable = memoTable.put(memoKey, memoTable.get(memoKey, ArraySet.empty()).add([extendedStore, returnStore, returnValue]));
//      print(this.closure.node, "memoized", returnValue);
    }
    return kont.pop(function (frame) {return new KontState(frame, returnValue, returnStore)});

  }
  
  function evalLiteral(node, benv, store, kont)
  {
    var value = SetValue.from1(l.abst1(node));
    return kont.pop(function (frame) {return new KontState(frame, value, store)});
  }

  function evalQuote(node, benv, store, kont)
  {
    var quoted = node.cdr.car;
    var value = SetValue.from1(l.abst1(quoted));
    return kont.pop(function (frame) {return new KontState(frame, value, store)});
//    if (quoted instanceof Number || quoted instanceof String || quoted instanceof Boolean)
//    {
//      return evalLiteral(quoted, benv, store, kont);
//    }
//    if (quoted instanceof Sym)
//    {
//      var value = SetValue.from1(new ASym(quoted.name));
//      return kont.pop(function (frame) {return new KontState(frame, value, store)});
//    }
//    if (quoted instanceof Pair)
//    {
//      var value = SetValue.from1(new APair(quoted.name))
//      return kont.pop(function (frame) {return new KontState(frame, SetValue.from1(new ASym(quoted.name)), store)});
//    }
  }

  function evalLambda(node, benv, store, kont)
  {
    var closure = new Closure(node, benv, node.cdr.car, node.cdr.cdr);
    var proc = SetValue.from1(closure);
    return kont.pop(function (frame) {return new KontState(frame, proc, store)});
  }

  function evalIdentifier(node, benv, store, kont)
  {
    var name = node.name;
    var addr = benv.lookup(name);
    if (addr === BOT)
    {
      throw new Error("undefined: " + node);
    }
    var value = store.lookupAval(addr);
    return kont.pop(function (frame) {return new KontState(frame, value, store)});
  }
  
//  function evalBegin(node, benv, store, kont)
//  {
//    var exps = node.cdr;
//    if (exps instanceof Null)
//    {
//      return kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
//    }
//    return evalBody(exps);
//    if (exps.cdr instanceof Null)
//    {
//      return kont.unch(new EvalState(exps.car, benv, store));
//    }
//    var frame = new BeginKont(node, exps, benv);
//    return kont.push(frame, new EvalState(exps.car, benv, store));
//  }
  
  function evalLet(node, benv, store, kont)
  {
    var bindings = node.cdr.car;
    var binding = bindings.car;
    var exp = binding.cdr.car;
    var atomicValue = evalAtomic(exp, benv, store);
    if (atomicValue)
    {
       return bindLetVar(node, atomicValue, benv, store, kont);
    }
    var frame = new LetKont(node, benv);
    return kont.push(frame, new EvalState(exp, benv, store));
  }
  
  function evalSet(node, benv, store, kont)
  {
    var exp = node.cdr.cdr.car;
    var frame = new SetKont(node, benv);
    return kont.push(frame, new EvalState(exp, benv, store));
  }
  
  function evalLetrec(node, benv, store, kont)
  {
    var bindings = node.cdr.car;
    var binding = bindings.car;
    var name = binding.car.name;
    var exp = binding.cdr.car;
    var addr = a.variable(binding, benv.application ? benv.application.tag : null);
    benv = benv.add(name, addr);
    var atomicValue = evalAtomic(exp, benv, store);
    if (atomicValue)
    {
      store = store.allocAval(addr, atomicValue);
      return evalBody(node.cdr.cdr, benv, store, kont);
    }
    store = store.allocAval(addr, BOT);
    var frame = new LetrecKont(node, benv);
    return kont.push(frame, new EvalState(exp, benv, store));
  }
  
  function isApplication(node)
  {
    return node instanceof Pair
      && !SchemeParser.isSyntacticKeyword(node.car.name)
  }
  
  function evalAtomic(node, benv, store)
  {
    if (node instanceof Number || node instanceof Boolean || node instanceof String)
    {
      var value = SetValue.from1(l.abst1(node));
      return value;        
    }
    if (node instanceof Sym)
    {
      var name = node.name;
      var addr = benv.lookup(name);
      if (addr === BOT)
      {
        throw new Error("undefined: " + node);
      }
      var value = store.lookupAval(addr);
      return value;
    }
    if (node instanceof Pair)
    {
      var car = node.car;
      if (car instanceof Sym)
      {
        var name = car.name;
        if (name === "lambda")
        {
          var closure = new Closure(node, benv, node.cdr.car, node.cdr.cdr);
          var proc = SetValue.from1(closure);
          return proc;
        }
      }
    }
    return false;
  }
  
  function applyKont(frame, value, store, kont)
  {
    return frame.apply(value, store, kont);
  }
  
  function applyProc(node, operatorValue, operandValues, benv, store, kont)
  {
    return operatorValue.values().flatMap(
      function (operatorValue)
      {
        if (!(operatorValue.apply_))
        {
//          return kont.unch(new ErrorState("not an operator: " + operatorValue, node, benv, store));
          return [];
        }        
        return operatorValue.apply_(node, operandValues, benv, store, kont);
      });
  }
  
  function evalIf(node, benv, store, kont)
  {
    var condition = node.cdr.car;
    var atomicValue = evalAtomic(condition, benv, store);
    if (atomicValue)
    {
      return dispatchConditional(node, atomicValue, benv, store, kont);
    }
    var frame = new IfKont(node, benv);
    return kont.push(frame, new EvalState(condition, benv, store));
  }
  
  function evalAnd(node, benv, store, kont)
  {
    var condition = node.cdr.car;
    var frame = new AndKont(node, benv);
    return kont.push(frame, new EvalState(condition, benv, store));
  }
  
  function evalOr(node, benv, store, kont)
  {
    var condition = node.cdr.car;
    var frame = new OrKont(node, benv);
    return kont.push(frame, new EvalState(condition, benv, store));
  }
  
  function evalApplication(node, benv, store, kont)
  {
    var operator = node.car;
    var atomicOperator = evalAtomic(operator, benv, store);
    if (atomicOperator)
    {
      var operands = node.cdr;
      return evalOperands(node, operands, atomicOperator, [], benv, store, kont);
    }
    var frame = new OperatorKont(node, benv);
    return kont.push(frame, new EvalState(operator, benv, store));          
  }
  
  function evalOperands(node, operands, operatorValue, operandValues, benv, store, kont)
  {
    while (!(operands instanceof Null))
    {
      var operand = operands.car;
      var atomicOperand = evalAtomic(operand, benv, store)
      if (atomicOperand)
      {
        operandValues = operandValues.addLast(atomicOperand);
        operands = operands.cdr;
      }
      else
      {
        var frame = new OperandsKont(node, operands, operatorValue, operandValues, benv);
        return kont.push(frame, new EvalState(operand, benv, store));      
      }
    }
    return applyProc(node, operatorValue, operandValues, benv, store, kont);    
  }

  function evalNode(node, benv, store, kont)
  {    
    if (node instanceof Number || node instanceof Boolean || node instanceof String)
    {
      return evalLiteral(node, benv, store, kont);        
    }
    if (node instanceof Sym)
    {
      return evalIdentifier(node, benv, store, kont);
    }
    if (node instanceof Pair)
    {
      var car = node.car;
      if (car instanceof Sym)
      {
        var name = car.name;
        if (name === "lambda")
        {
          return evalLambda(node, benv, store, kont);
        }
        if (name === "let")
        {
          return evalLet(node, benv, store, kont);
        }
        if (name === "letrec")
        {
          return evalLetrec(node, benv, store, kont);
        }
        if (name === "if")
        {
          return evalIf(node, benv, store, kont);
        }
//        if (name === "begin")
//        {
//          return evalBegin(node, benv, store, kont);
//        }
        if (name === "set!")
        {
          return evalSet(node, benv, store, kont);
        }
        if (name === "quote")
        {
          return evalQuote(node, benv, store, kont);
        }
        if (name === "and")
        {
          return evalAnd(node, benv, store, kont);
        }
        if (name === "or")
        {
          return evalOr(node, benv, store, kont);
        }
      }
      return evalApplication(node, benv, store, kont);
    }
    throw new Error("cannot handle node " + node); 
  }

  var module = {};
  module.l = l;
  module.store = store;
  module.global = global;
  
  module.inject = 
    function (node, override)
    {
      override = override || {};
      var benv = override.benv || global;
      var haltFrame = new HaltKont(benv.addresses());
      return new InitState(node, benv, override.store || store, haltFrame);    
    }
  
  return module; 
}

function ErrorState(msg, node, benv, store)
{
  this.type = "error";
  this.msg = msg;
  this.node = node;
  this.benv = benv;
  this.store = store;
}
ErrorState.prototype.toString =
  function ()
  {
    return "#error " + this.msg;
  }
ErrorState.prototype.nice =
  function ()
  {
    return "#error " + this.msg;
  }
ErrorState.prototype.equals =
  function (x)
  {
    return (x instanceof ErrorState)
      && Eq.equals(this.msg, x.msg)
      && this.node === x.node
      && this.benv.equals(x.benv)
      && this.store.equals(x.store)
  }
ErrorState.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + this.msg.hashCode();
    result = prime * result + this.node.hashCode();
    result = prime * result + this.benv.hashCode();
    return result;
  }
ErrorState.prototype.next =
  function (kont)
  {
    return [];
  }
ErrorState.prototype.addresses =
  function ()
  {
    return [];
  }

function SetValue(set)
{
  //if (set.size() > 3) {print(set)};
  this._set = set;
}

SetValue.from1 =
  function (x)
  {
    return new SetValue(ArraySet.from1(x));
  }

SetValue.from =
  function (arr)
  {
    return new SetValue(ArraySet.from(arr));
  }

SetValue.prototype.equals =
  function (x)
  {
    if (x === BOT)
    {
      return false;
    }
    return this._set.equals(x._set);
  }

SetValue.prototype.subsumes =
  function (x)
  {
    if (!(x instanceof SetValue))
    {
      return false;
    }
    return this._set.subsumes(x._set);
  }

SetValue.prototype.hashCode =
  function ()
  {
    return this._set.hashCode();
  }
  
SetValue.prototype.addresses =
  function ()
  {
    return this._set.values().flatMap(function (x) {return x.addresses()});
  }

SetValue.prototype.join =
  function (x)
  {
    if (x === BOT)
    {
      return this;
    }
    return new SetValue(this._set.join(x._set));
  }

SetValue.prototype.meet =
  function (x)
  {
    if (x === BOT)
    {
      return BOT;
    }
    var setMeet = this._set.meet(x._set);
    if (setMeet.size() === 0)
    {
      return BOT;
    }
    return new SetValue(setMeet);
  }

SetValue.prototype.values =
  function ()
  {
    return this._set.values();
  }

SetValue.prototype.toString =
  function ()
  {
    return this._set.toString();
  }