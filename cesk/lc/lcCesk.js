function lcCesk(cc)
{
  // address generator
  var a = cc.a;
  // benv creator
//  var b = cc.b || new DefaultBenv();
  // primitive lattice
  var p = cc.p;
  
  var gcFlag = cc.gc === undefined ? true : cc.gc;
  var memoFlag = cc.memo === undefined ? false : cc.memo;
  var memoTable = HashMap.empty();
  
  assertDefinedNotNull(a);
//  assertDefinedNotNull(b);
  assertDefinedNotNull(p);

  // lattice (primitives + procs)
//  var l = new JipdaLattice(p); // in this CESK, prims and procs don't match!
  
  print("allocator", a);
  print("lattice", p);
  print("gc", gcFlag);
  print("memoization", memoFlag);
  
  // install constants
  var P_UNDEFINED = p.abst1(undefined);
  var P_NULL = p.abst1(null);
  var P_0 = p.abst1(0);
  var P_1 = p.abst1(1);
  var P_TRUE = p.abst1(true);
  var P_FALSE = p.abst1(false);
  var P_NUMBER = p.NUMBER;
  var P_STRING = p.STRING;
  var P_DEFINED = P_TRUE.join(P_FALSE).join(P_NUMBER).join(P_STRING);
  

  function Closure(node, statc, params, body)
  {
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
  
//  Closure.prototype.compareTo =
//    function (x)
//    {
//      return this.equals(x) ? 0 : undefined; 
//    }

  Closure.prototype.apply_ =
    function (application, operandValues, benv, store, kont)
    {
//      print("apply", application, operandValues);
      var fun = this.node;
      var exp = this.body.car;
      var extendedBenv = this.statc;
      var params = this.params;
      var i = 0;
      while (!(params instanceof Null))
      {
        var param = params.car;
        var name = param.name;
        var addr = a.variable(param);
        extendedBenv = extendedBenv.add(name, addr);
        store = store.allocAval(addr, operandValues[i]);
        params = params.cdr;
        i++;
      }
      
      if (memoFlag)
      {
        var memoResult = memoTable.get([exp, extendedBenv, store]);
        if (memoResult)
        {
          var memoValue = memoResult[0];
          var memoStore = memoResult[1];
          return kont.pop(function (frame) {return new KontState(frame, memoValue, memoStore)}, "MEMO");
        }        
      }
      
      if (!(this.body.cdr instanceof Null))
      {
        throw new Error("expected single body expression, got " + this.body);
      }
      var frame = new ReturnKont(exp, extendedBenv, store);
      return kont.push(frame, new EvalState(exp, extendedBenv, store));
    }

  Closure.prototype.addresses =
    function ()
    {
      return this.statc.addresses();
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
  
  function Procedure(procs)
  {
    this.procs = procs;
  }
  
  Procedure.empty =
    function ()
    {
      return new Procedure([]);
    }
  
  Procedure.from =
    function (procs)
    {
      return new Procedure(procs.slice(0));
    }
  
  Procedure.prototype.equals =
    function (x)
    {
      if (this === x)
      {
        return true;
      }
      return this.procs.setEquals(x.procs);
    }
  
  Procedure.prototype.hashCode =
    function ()
    {
      return this.procs.hashCode();
    }
  
  Procedure.prototype.subsumes =
    function (x)
    {
      if (this === x)
      {
        return true;
      }
      return this.procs.subsumes(x.procs);
    }
  
  Procedure.prototype.compareTo =
    function (x)
    {
      return Lattice.subsumeComparison(this, x);
    }
  
  Procedure.prototype.join =
    function (x)
    {
      if (x === BOT)
      {
        return this;
      }
      return new Procedure(Arrays.deleteDuplicates(this.procs.concat(x.procs), Eq.equals));
    }
  
  Procedure.prototype.addresses =
    function ()
    {
      return this.procs.flatMap(function (proc) {return proc.addresses()});
    }
  
  Procedure.prototype.apply_ =
    function (application, operandValues, benv, store, kont)
    {
      return this.procs.flatMap(function (proc) {return proc.apply_(application, operandValues, benv, store, kont)});
    }
  
  Procedure.prototype.toString =
    function ()
    {
      return "<procedure " + this.procs + ">";
    }

  // install global environment
  var global = Benv.empty();
  var store = new Store();
  
  function installPrimitive(name, apply_)
  {
    var proca = new ContextAddr(name, 0);
    var proc = Procedure.from([new Primitive(name, apply_)]);
    global = global.add(name, proca);
    store = store.allocAval(proca, proc);    
  }
  
  function installVariable(name, value)
  {
    var vara = new ContextAddr(name, 0);
    global = global.add(name, vara);
    store = store.allocAval(vara, value);    
  }
  
  installVariable("#t", P_TRUE);
  installVariable("#f", P_FALSE);
  
  installPrimitive("+", 
      function(application, operandValues, benv, store, kont)
      {
        var value = operandValues.reduce(function (acc, x) {return p.add(acc, x)}, P_0);
        return kont.pop(function (frame) {return new KontState(frame, value, store)});
      });
  installPrimitive("-", 
      function(application, operandValues, benv, store, kont)
      {
        var value = operandValues.slice(1).reduce(function (acc, x) {return p.sub(acc, x)}, operandValues[0]);
        return kont.pop(function (frame) {return new KontState(frame, value, store)});
      });
  installPrimitive("*", 
      function(application, operandValues, benv, store, kont)
      {
        var value = operandValues.reduce(function (acc, x) {return p.mul(acc, x)}, P_1);
        return kont.pop(function (frame) {return new KontState(frame, value, store)});
      });
  installPrimitive("=", 
      function(application, operandValues, benv, store, kont)
      {
        var value = p.eq(operandValues[0], operandValues[1]);
        return kont.pop(function (frame) {return new KontState(frame, value, store)});
      });
  installPrimitive("<", 
      function(application, operandValues, benv, store, kont)
      {
        var value = p.lt(operandValues[0], operandValues[1])
        return kont.pop(function (frame) {return new KontState(frame, value, store)});
      });
  installPrimitive("<=", 
      function(application, operandValues, benv, store, kont)
      {
        var value = p.lte(operandValues[0], operandValues[1])
        return kont.pop(function (frame) {return new KontState(frame, value, store)});
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
      return "(init " + this.node + " " + this.benv + ")";
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
    if (gcFlag)
    {
      var stackAddresses = kont.stack.flatMap(function (frame) {return frame.addresses()}).toSet();
      var rootSet = q.addresses().concat(stackAddresses);
      return Agc.collect(q.store, rootSet);        
    }
    else
    {
      return q.store;
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
  
      if (operands instanceof Null)
      {
        return applyProc(node, operatorValue, [], benv, store, kont);
      }
      var frame = new OperandsKont(node, operands, operatorValue, [], benv);
      return kont.push(frame, new EvalState(operands.car, benv, store));
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
      
      if (operands instanceof Null)
      {
        return applyProc(node, operatorValue, operandValues, benv, store, kont);
      }
      var frame = new OperandsKont(node, operands, operatorValue, operandValues, benv);
      return kont.push(frame, new EvalState(operands.car, benv, store));
    }
  
  function LetrecKont(node, bindings, benv)
  {
    this.node = node;
    this.bindings = bindings; 
    this.benv = benv;
  }
  LetrecKont.prototype.equals =
    function (x)
    {
      return x instanceof LetrecKont
        && this.node === x.node 
        && this.bindings === x.bindings 
        && Eq.equals(this.benv, x.benv) 
    }
  LetrecKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.bindings.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  LetrecKont.prototype.toString =
    function ()
    {
      return "letrec-" + this.node.tag + "-" + this.bindings.tag;
    }
  LetrecKont.prototype.nice =
    function ()
    {
      return "letrec-" + this.node.tag + "-" + this.bindings.tag;
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
      var name = this.bindings.car.car;
      var bindings = this.bindings.cdr;
      
      var addr = benv.lookup(name);
      store = store.updateAval(addr, bindingValue);
      
      if (bindings instanceof Null)
      {
        var body = node.cdr.cdr;
        if (body.cdr instanceof Null)
        {
          return kont.unch(new EvalState(body.car, benv, store));          
        }
        var frame = new BeginKont(node, body, benv);
        return kont.push(frame, new EvalState(body.car, benv, store));
      }
      return evalLetrecBinding(node, bindings, benv, store, kont);
    }
  
  function BeginKont(node, exps, benv)
  {
    this.node = node;
    this.exps = exps;
    this.benv = benv;
  }
  BeginKont.prototype.equals =
    function (x)
    {
      return (x instanceof BeginKont)
        && this.node === x.node
        && this.exps === x.exps
        && Eq.equals(this.benv, x.benv);
    }
  BeginKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.exps.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  BeginKont.prototype.toString =
    function ()
    {
      return "begin-" + this.node.tag + "-" + this.exps.tag;
    }
  BeginKont.prototype.nice =
    function ()
    {
      return "begin-" + this.node.tag + "-" + this.exps.tag;
    }
  BeginKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  BeginKont.prototype.apply =
    function (value, store, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var exps = this.exps.cdr;
      
      if (exps.cdr instanceof Null)
      {
        return kont.unch(new EvalState(exps.car, benv, store));
      }
      var frame = new BeginKont(node, exps, benv);
      return kont.push(frame, new EvalState(exps.car, benv, store));
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
      var consequent = node.cdr.cdr.car;
      var alternate = node.cdr.cdr.cdr.car;
      if (conditionValue instanceof Procedure)
      {
        return kont.unch(new EvalState(consequent, benv, store));
      }
      var falseProj = conditionValue.meet(P_FALSE);
      if (falseProj === BOT) // no false in value
      {
        return kont.unch(new EvalState(consequent, benv, store));
      }
      else if (conditionValue.equals(falseProj)) // value is false
      {
        return kont.unch(new EvalState(alternate, benv, store));
      }
      else // value > false
      {
        var consequentState = kont.unch(new EvalState(consequent, benv, store));
        var alternateState = kont.unch(new EvalState(alternate, benv, store));
        return consequentState.concat(alternateState);
      }
    }
  
  function ReturnKont(node, extendedBenv, extendedStore)
  {
    this.node = node;
    this.extendedBenv = extendedBenv;
    this.extendedStore = extendedStore;
  }
  ReturnKont.prototype.equals =
    function (x)
    {
      return x instanceof ReturnKont
        && this.node === x.node 
        && Eq.equals(this.extendedBenv, x.extendedBenv)
        && Eq.equals(this.extendedStore, x.extendedStore)
    }
  ReturnKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.extendedBenv.hashCode();
      result = prime * result + this.extendedStore.hashCode();
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
      return this.extendedBenv.addresses().concat(this.extendedStore.map.keys());
    }
  ReturnKont.prototype.apply =
    function (returnValue, store, kont)
    {
      var node = this.node;
      var extendedBenv = this.extendedBenv;
      var extendedStore = this.extendedStore;
      if (memoFlag)
      {
        memoTable = memoTable.put([node, extendedBenv, extendedStore], [returnValue, store]);
      }
      return kont.pop(function (frame) {return new KontState(frame, returnValue, store)});
    }
  
  function evalLiteral(node, benv, store, kont)
  {
    var value = p.abst1(node.valueOf());
    return kont.pop(function (frame) {return new KontState(frame, value, store)});
  }

  function evalLambda(node, benv, store, kont)
  {
    var closure = new Closure(node, benv, node.cdr.car, node.cdr.cdr);
    var proc = Procedure.from([closure]);
    return kont.pop(function (frame) {return new KontState(frame, proc, store)});
  }

  function evalQuote(node, benv, store, kont)
  {
    var value = p.abst1(node.cdr.car);
    return kont.pop(function (frame) {return new KontState(frame, value, store)});
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
  
  function evalBegin(node, benv, store, kont)
  {
    var exps = node.cdr;
    if (exps instanceof Null)
    {
      return kont.pop(function (frame) {return new KontState(frame, P_UNDEFINED, store)});
    }
    if (exps.cdr instanceof Null)
    {
      return kont.unch(new EvalState(exps.car, benv, store));
    }
    var frame = new BeginKont(node, exps, benv);
    return kont.push(frame, new EvalState(exps.car, benv, store));
  }
  
  function evalLetrec(node, benv, store, kont)
  {
    var bindings = node.cdr.car;
    return evalLetrecBinding(node, bindings, benv, store, kont);
  }
  
  function evalLetrecBinding(node, bindings, benv, store, kont)
  {
    var binding = bindings.car;
    var name = binding.car;
    var exp = binding.cdr.car;
    var addr = a.variable(node);
    benv = benv.add(name, addr);
    store = store.allocAval(addr, P_UNDEFINED);
    var frame = new LetrecKont(node, bindings, benv);
    return kont.push(frame, new EvalState(exp, benv, store));
  }
    
  function isApplication(node)
  {
    return node instanceof Pair
      && !SchemeParser.isSyntacticKeyword(node.car.name)
  }
  
  function scanOpers(s, kont)
  {
    var visited = HashSet.empty();
    
    function helper(q)
    {
      if (visited.contains(q))
      {
        return [];
      }
      visited = visited.add(q);
      var epsOperFrameSuccs = kont.ecg.outgoing(q).flatMap(
        function (h)
        {
          return h.g && (h.g.frame instanceof OperatorKont || h.g.frame instanceof OperandsKont) ? [h.target] : [];
        });
      if (epsOperFrameSuccs.length === 0)
      {
        return [[q]];
      }
      var rs = epsOperFrameSuccs.flatMap(helper);
      var rs2 = rs.map(function (r) {return r.addFirst(q)});
      return rs2;
    }
    return helper(s);
  }
  
  function applyKont(frame, value, store, kont)
  {
    return frame.apply(value, store, kont);
  }
  
  function applyProc(node, operatorValue, operandValues, benv, store, kont)
  {
    if (!(operatorValue instanceof Procedure))
    {
      throw new Error("not an operator: " + node.car);
    }
    return operatorValue.apply_(node, operandValues, benv, store, kont);
  }
  
  function evalIf(node, benv, store, kont)
  {
    var condition = node.cdr.car;
    var frame = new IfKont(node, benv);
    return kont.push(frame, new EvalState(condition, benv, store));
  }
  
  function evalApplication(node, benv, store, kont)
  {
    var operator = node.car;
    var frame = new OperatorKont(node, benv);
    return kont.push(frame, new EvalState(operator, benv, store));      
  }

  function evalNode(node, benv, store, kont)
  {    
    if (node instanceof Number || node instanceof Boolean || node instanceof String || node instanceof Null)
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
        if (name === "letrec")
        {
          return evalLetrec(node, benv, store, kont);
        }
        if (name === "if")
        {
          return evalIf(node, benv, store, kont);
        }
        if (name === "quote")
        {
          return evalQuote(node, benv, store, kont);
        }
        if (name === "begin")
        {
          return evalBegin(node, benv, store, kont);
        }
      }
      return evalApplication(node, benv, store, kont);
    }
    throw new Error("cannot handle node " + node); 
  }

  var module = {};
  module.p = p;
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