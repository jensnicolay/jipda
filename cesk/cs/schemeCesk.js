function schemeCesk(cc)
{
  // address generator
  var a = cc.a;
  // benv creator
//  var b = cc.b || new DefaultBenv();
  // primitive lattice
  var p = cc.p;
  
  var gcFlag = cc.gc === undefined ? true : cc.gc;
  var memoFlag = cc.memo === undefined ? false : cc.memo;
  var memoTable = [];
  
  assertDefinedNotNull(a);
//  assertDefinedNotNull(b);
  assertDefinedNotNull(p);

  // lattice (primitives + addresses)
  var l = new JipdaLattice(p); // TODO this will become param
  
  print("allocator", a);
  print("lattice", p);
  print("gc", gcFlag);
  print("memoization", memoFlag);
  
  // install constants
  var L_UNDEFINED = l.abst1(undefined);
  var L_NULL = l.abst1(null);
  var L_0 = l.abst1(0);
  var L_1 = l.abst1(1);
  var L_TRUE = l.abst1(true);
  var L_FALSE = l.abst1(false);
  var P_0 = p.abst1(0);
  var P_1 = p.abst1(1);
  var P_TRUE = p.abst1(true);
  var P_FALSE = p.abst1(false);
  var P_NUMBER = p.NUMBER;
  var P_STRING = p.STRING;
  var P_DEFINED = P_TRUE.join(P_FALSE).join(P_NUMBER).join(P_STRING);
  

  function Closure(node, statica, params, body)
  {
    this.node = node;
    this.statica = statica;
    this.params = params;
    this.body = body;
  }

  Closure.prototype.toString =
    function ()
    {
      return "(" + this.node.tag + " " + this.statica + ")";
    }
  Closure.prototype.nice =
    function ()
    {
      return "<Closure " + this.node.tag + ">"
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
        && this.statica.equals(other.statica);
    }
  
  Closure.prototype.hashCode =
    function (x)
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.statica.hashCode();
      return result;      
    }
  
//  Closure.prototype.compareTo =
//    function (x)
//    {
//      return this.equals(x) ? 0 : undefined; 
//    }

  Closure.prototype.apply_ =
    function (application, operandValues, benva, store, kont)
    {
//      print("apply", application, operandValues);
      var fun = this.node;
      var statica = this.statica;
      var extendedBenva = a.benv(fun, application);
      var extendedBenv = store.lookupAval(statica);
      var params = this.params;
      var i = 0;
      while (!(params instanceof Null))
      {
        var param = params.car;
        extendedBenv = extendedBenv.add(param.name, operandValues[i]);
        params = params.cdr;
        i++;
      }
      store = store.allocAval(extendedBenva, extendedBenv);
      if (this.body.cdr instanceof Null)
      {
        return kont.unch(new EvalState(this.body.car, extendedBenva, store));
      }
      var frame = new BeginKont(application, this.body, extendedBenva); // TODO 'application' or 'fun'?
      return kont.push(frame, new EvalState(this.body.car, extendedBenva, store));
    }

  Closure.prototype.addresses =
    function ()
    {
      return [this.statica];
    }
  
  function Primitive(name, apply_)
  {
    this.name = name;
    this.apply_ = apply_;
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
    function (application, operandValues, benva, store, kont)
    {
      return this.procs.flatMap(function (proc) {return proc.apply_(application, operandValues, benva, store, kont)});
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
    var procRef = l.abst1(proca);
    var proc = Procedure.from([new Primitive(name, apply_)]);
    global = global.add(name, procRef);
    store = store.allocAval(proca, proc);    
  }
  
  global = global.add("#t", L_TRUE);
  global = global.add("#f", L_FALSE);
  
  installPrimitive("+", 
      function(application, operandValues, benva, store, kont)
      {
        var primValue = operandValues.reduce(function (acc, x) {return p.add(acc, x.prim)}, P_0);
        var value = l.product(primValue, []);
        return kont.pop(function (frame) {return new KontState(frame, value, store)});
      });
  installPrimitive("-", 
      function(application, operandValues, benva, store, kont)
      {
        var primValue = operandValues.slice(1).reduce(function (acc, x) {return p.sub(acc, x.prim)}, operandValues[0].prim);
        var value = l.product(primValue, []);
        return kont.pop(function (frame) {return new KontState(frame, value, store)});
      });
  installPrimitive("*", 
      function(application, operandValues, benva, store, kont)
      {
        var primValue = operandValues.reduce(function (acc, x) {return p.mul(acc, x.prim)}, P_1);
        var value = l.product(primValue, []);
        return kont.pop(function (frame) {return new KontState(frame, value, store)});
      });
  installPrimitive("=", 
      function(application, operandValues, benva, store, kont)
      {
        var primValue = p.eq(operandValues[0].prim, operandValues[1].prim);
        var value = l.product(primValue, []);
        return kont.pop(function (frame) {return new KontState(frame, value, store)});
      });
  installPrimitive("<", 
      function(application, operandValues, benva, store, kont)
      {
        var primValue = p.lt(operandValues[0].prim, operandValues[1].prim)
        var value = l.product(primValue, []);
        return kont.pop(function (frame) {return new KontState(frame, value, store)});
      });
  installPrimitive("<=", 
      function(application, operandValues, benva, store, kont)
      {
        var primValue = p.lte(operandValues[0].prim, operandValues[1].prim)
        var value = l.product(primValue, []);
        return kont.pop(function (frame) {return new KontState(frame, value, store)});
      });
   
  
  var globala = new ContextAddr("global", 0);
  store = store.allocAval(globala, global);
  
  function InitState(node, benva, store, haltFrame)
  {
    this.type = "init";
    this.node = node;
    this.benva = benva;
    this.store = store;
    this.haltFrame = haltFrame;
  }
  InitState.prototype.toString =
    function ()
    {
      return "(init " + this.node + " " + this.benva + ")";
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
        && Eq.equals(this.benva, x.benva)
        && Eq.equals(this.store, x.store)
        && Eq.equals(this.haltFrame, x.haltFrame);
    }
  InitState.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benva.hashCode();
      result = prime * result + this.haltFrame.hashCode();
      return result;
    }
  InitState.prototype.next =
    function (kont)
    {
      return kont.push(this.haltFrame, new EvalState(this.node, this.benva, this.store));
    }
  InitState.prototype.addresses =
    function ()
    {
      return [this.benva];
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

  function EvalState(node, benva, store)
  {
    this.type = "eval";
    assertDefinedNotNull(node);
    this.node = node;
    this.benva = benva;
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
        && Eq.equals(this.benva, x.benva)
        && Eq.equals(this.store, x.store);
    }
  EvalState.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benva.hashCode();
      return result;
    }
  EvalState.prototype.next =
    function (kont)
    {
      return evalNode(this.node, this.benva, gc(this, kont), kont);
    }
  EvalState.prototype.addresses =
    function ()
    {
      return [this.benva];
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
  
  function DefineKont(node, benva)
  {
    this.node = node;
    this.benva = benva;
  }
  DefineKont.prototype.equals =
    function (x)
    {
      return x instanceof DefineKont
        && this.node === x.node 
        && Eq.equals(this.benva, x.benva);
    }
  DefineKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benva.hashCode();
      return result;
    }
  DefineKont.prototype.toString =
    function ()
    {
      return "def-" + this.node.tag;
    }
  DefineKont.prototype.nice =
    function ()
    {
      return "def-" + this.node.tag;
    }
  DefineKont.prototype.addresses =
    function ()
    {
      return [this.benva];
    }
  DefineKont.prototype.apply =
    function (value, store, kont)
    {
      var node = this.node;
      var benva = this.benva;
      var id = node.cdr.car.name;
      var benv = store.lookupAval(benva);
      benv = benv.add(id, value);
      store = store.updateAval(benva, benv); // side-effect
      return kont.pop(function (frame) {return new KontState(frame, value, store)});
    }
  
  function OperatorKont(node, benva)
  {
    this.node = node;
    this.benva = benva;
  }
  OperatorKont.prototype.equals =
    function (x)
    {
      return x instanceof OperatorKont
        && this.node === x.node
        && Eq.equals(this.benva, x.benva);
    }
  OperatorKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benva.hashCode();
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
      return [this.benva];
    }
  OperatorKont.prototype.apply =
    function (operatorValue, store, kont)
    {
      var node = this.node;
      var benva = this.benva;
      var operands = node.cdr;
  
      if (operands instanceof Null)
      {
        return applyProc(node, operatorValue, [], benva, store, kont);
      }
      var frame = new OperandsKont(node, operands, operatorValue, [], benva);
      return kont.push(frame, new EvalState(operands.car, benva, store));
    }
  
  function OperandsKont(node, operands, operatorValue, operandValues, benva)
  {
    this.node = node;
    this.operands = operands;
    this.operatorValue = operatorValue; 
    this.operandValues = operandValues; 
    this.benva = benva;
  }
  OperandsKont.prototype.equals =
    function (x)
    {
      return x instanceof OperandsKont
        && this.node === x.node 
        && this.operands === x.operands 
        && Eq.equals(this.operatorValue, x.operatorValue) 
        && Eq.equals(this.operandValues, x.operandValues) 
        && Eq.equals(this.benva, x.benva) 
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
      result = prime * result + this.benva.hashCode();
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
      return [this.benva]
        .concat(this.operatorValue.addresses())
        .concat(this.operandValues.flatMap(function (value) {return value.addresses()}));
    }
  OperandsKont.prototype.apply =
    function (operandValue, store, kont)
    {
      var node = this.node;
      var benva = this.benva;
      var operatorValue = this.operatorValue;
      var operandValues = this.operandValues.addLast(operandValue);
      var operands = this.operands.cdr;
      
      if (operands instanceof Null)
      {
        return applyProc(node, operatorValue, operandValues, benva, store, kont);
      }
      var frame = new OperandsKont(node, operands, operatorValue, operandValues, benva);
      return kont.push(frame, new EvalState(operands.car, benva, store));
    }
  
  function BeginKont(node, exps, benva)
  {
    this.node = node;
    this.exps = exps;
    this.benva = benva;
  }
  BeginKont.prototype.equals =
    function (x)
    {
      return (x instanceof BeginKont)
        && this.node === x.node
        && this.exps === x.exps
        && Eq.equals(this.benva, x.benva);
    }
  BeginKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.exps.hashCode();
      result = prime * result + this.benva.hashCode();
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
      return [this.benva];
    }
  BeginKont.prototype.apply =
    function (value, store, kont)
    {
      var node = this.node;
      var benva = this.benva;
      var exps = this.exps.cdr;
      
      if (exps.cdr instanceof Null)
      {
        return kont.unch(new EvalState(exps.car, benva, store));
      }
      var frame = new BeginKont(node, exps, benva);
      return kont.push(frame, new EvalState(exps.car, benva, store));
    }
  
  function IfKont(node, benva)
  {
    this.node = node;
    this.benva = benva;
  }
  IfKont.prototype.equals =
    function (x)
    {
      return x instanceof IfKont
        && this.node === x.node 
        && Eq.equals(this.benva, x.benva);
    }
  IfKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benva.hashCode();
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
      return [this.benva];
    }
  IfKont.prototype.apply =
    function (conditionValue, store, kont)
    {
      var node = this.node;
      var benva = this.benva;    
      var consequent = node.cdr.cdr.car;
      var alternate = node.cdr.cdr.cdr.car;
      var falseProj = conditionValue.meet(L_FALSE);
      if (falseProj === BOT) // no false in value
      {
        return kont.unch(new EvalState(consequent, benva, store));
      }
      else if (conditionValue.equals(falseProj)) // value is false
      {
//        if (alternate === null)
//        {
//          return kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
//        }
        return kont.unch(new EvalState(alternate, benva, store));
      }
      else // value > false
      {
        var consequentState = kont.unch(new EvalState(consequent, benva, store));
        var alternateState;
//        if (alternate === null)
//        {
//          alternateState = kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
//        }
//        else
//        {
          alternateState = kont.unch(new EvalState(alternate, benva, store));
//        }
        return consequentState.concat(alternateState);
      }
    }
  
  function evalLiteral(node, benva, store, kont)
  {
    var value = l.abst1(node.valueOf());
    return kont.pop(function (frame) {return new KontState(frame, value, store)});
  }

  function evalLambda(node, benva, store, kont)
  {
    var closure = new Closure(node, benva, node.cdr.car, node.cdr.cdr);
    var closurea = a.closure(node, benva); // benva here is transitive application
    var closureRef = l.abst1(closurea);
    store = store.allocAval(closurea, Procedure.from([closure]));
    return kont.pop(function (frame) {return new KontState(frame, closureRef, store)});
  }

  function evalQuote(node, benva, store, kont)
  {
    var value = l.abst1(node.cdr.car);
    return kont.pop(function (frame) {return new KontState(frame, value, store)});
  }
  
  function evalDefine(node, benva, store, kont)
  {
    var lval = node.cdr.car;
    if (lval instanceof Pair)
    {
      throw new Error("TODO");
    }
    var exp = node.cdr.cdr.car;
    var frame = new DefineKont(node, benva);
    return kont.push(frame, new EvalState(exp, benva, store));
  }

  function evalIdentifier(node, benva, store, kont)
  {
    var name = node.name;
    var benv = store.lookupAval(benva);
    var value = benv.lookup(name);
    if (value === BOT)
    {
      throw new Error("undefined: " + node);
    }
    return kont.pop(function (frame) {return new KontState(frame, value, store)});
  }
  
  function evalBegin(node, benva, store, kont)
  {
    var exps = node.cdr;
    if (exps instanceof Null)
    {
      return kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
    }
    if (exps.cdr instanceof Null)
    {
      return kont.unch(new EvalState(exps.car, benva, store));
    }
    var frame = new BeginKont(node, exps, benva);
    return kont.push(frame, new EvalState(exps.car, benva, store));
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
  
  function Memo(ratorRands, store)
  {
    assertTrue(ratorRands != null);
    assertTrue(store != null);
    this.ratorRands = ratorRands;
    this.store = store;
  }
  
  Memo.updateTable =
    function (memo, value, table)
    {
//      for (var i = 0; i < table.length; i++)
//      {
//        var entry = table[i];
//        if (entry.memo.subsumes(memo))
//        {
//          throw new Error("memo " + entry.memo + "->" + entry.value + " already subsumes " + memo + "->" + value);
//        }
//      }
      var table2 = table.filter(function (entry) {return !memo.subsumes(entry.memo)});
      print("removed from memo table", table.length - table2.length, table2.length + 1);
      return table2.addLast({memo:memo, value:value});
    }
  
  Memo.prototype.toString =
    function ()
    {
      return "<ratorRands " + this.ratorRands + ">"; 
    }
  
  Memo.prototype.subsumes =
    function (x)
    {
      if (this.ratorRands.length !== x.ratorRands.length)
      {
        return false;
      }
      for (var i = 0; i < this.ratorRands.length; i++)
      {
        if (!this.ratorRands[i].subsumes(x.ratorRands[i]))
        {
          return false;
        }
      }
      return this.store.subsumes(x.store);
    }

  Memo.prototype.subsumesButStore = //DEBUG
    function (x)
    {
      if (this.ratorRands.length !== x.ratorRands.length)
      {
        return false;
      }
      for (var i = 0; i < this.ratorRands.length; i++)
      {
        if (!this.ratorRands[i].subsumes(x.ratorRands[i]))
        {
          return false;
        }
      }
      return !this.store.subsumes(x.store);
    }

  function applyKont(frame, value, store, kont)
  {
    if (memoFlag)
    {
      var valueForStates = kont.valueFor();
      var evalStates = valueForStates.filter(function (q) {return q.node && isApplication(q.node)});
      var operStates = evalStates.flatMap(function (q) {return scanOpers(q, kont)});
      memoTable = operStates.reduce(
        function (memoTable, operState)
        {
//          var store = operState[operState.length - 1].store;
          var ratorRands = operState.slice(1).map(function (q) {return q.value});
          var memo = new Memo(ratorRands, store);
          print("memoizing", operState[0].node, memo, value);
          return Memo.updateTable(memo, value, memoTable);
        }, memoTable);      
    }
    return frame.apply(value, store, kont);
  }
  
  function applyProc(node, operatorValue, operandValues, benva, store, kont)
  {
    if (memoFlag)
    {
      var memo = new Memo([operatorValue].concat(operandValues), store);
      var matchingEntries = memoTable.flatMap(
        function (entry)
        {
          var entryMemo = entry.memo;
          if (entryMemo.subsumesButStore(memo))
          {
            print("==", entryMemo, entryMemo.store.diff(store));
          }
          return entryMemo.subsumes(memo) ? [entry] : [];
        });
      var memoValue = matchingEntries.map(function (entry) {return entry.value}).reduce(Lattice.join, BOT);
      var memoStore = matchingEntries.map(function (entry) {return entry.memo.store}).reduce(Lattice.join, BOT);
      if (matchingEntries.length > 0)
      {
        print("using", kont.source, "#", matchingEntries.length, "value", memoValue);
        return kont.pop(function (frame) {return new KontState(frame, memoValue, memoStore)}, "MEMO");
      }      
    }
    var operatorAs = operatorValue.addresses();
    if (operatorAs.length === 0)
    {
      throw new Error("not an operator: " + node.car);
    }
    return operatorAs.flatMap(
      function (operatora)
      {
        var proc = store.lookupAval(operatora);
        return proc.apply_(node, operandValues, benva, store, kont);
      })
  }
  
  function evalIf(node, benva, store, kont)
  {
    var condition = node.cdr.car;
    var frame = new IfKont(node, benva);
    return kont.push(frame, new EvalState(condition, benva, store));
  }
  
  function evalApplication(node, benva, store, kont)
  {
    var operator = node.car;
    var frame = new OperatorKont(node, benva);
    return kont.push(frame, new EvalState(operator, benva, store));      
  }

  function evalNode(node, benva, store, kont)
  {    
    if (node instanceof Number || node instanceof Boolean || node instanceof String || node instanceof Null)
    {
      return evalLiteral(node, benva, store, kont);        
    }
    if (node instanceof Sym)
    {
      return evalIdentifier(node, benva, store, kont);
    }
    if (node instanceof Pair)
    {
      var car = node.car;
      if (car instanceof Sym)
      {
        var name = car.name;
        if (name === "lambda")
        {
          return evalLambda(node, benva, store, kont);
        }
        if (name === "define")
        {
          return evalDefine(node, benva, store, kont);
        }
        if (name === "if")
        {
          return evalIf(node, benva, store, kont);
        }
        if (name === "quote")
        {
          return evalQuote(node, benva, store, kont);
        }
        if (name === "begin")
        {
          return evalBegin(node, benva, store, kont);
        }
      }
      return evalApplication(node, benva, store, kont);
    }
    throw new Error("cannot handle node " + node); 
  }

  var module = {};
  module.p = p;
  module.l = l;
  module.store = store;
  module.globala = globala;
  
  module.inject = 
    function (node, override)
    {
      override = override || {};
      var benva = override.benva || globala;
      var haltFrame = new HaltKont([benva]);
      return new InitState(node, benva, override.store || store, haltFrame);    
    }
  
  return module; 
}

function JipdaLattice(primLattice)
{
  assertDefinedNotNull(primLattice);
  this.primLattice = primLattice;
}
JipdaLattice.prototype = new Lattice();

JipdaLattice.prototype.toString =
  function ()
  {
    return "<JipdaLattice " + this.primLattice + ">";
  }

JipdaLattice.prototype.abst =
  function (cvalues)
  {
    return cvalues.map(JipdaLattice.prototype.abst1, this).reduce(Lattice.join);
  }

JipdaLattice.prototype.abst1 =
  function (cvalue)
  {
    if (cvalue instanceof Addr)
    {
      return new JipdaValue(BOT, [cvalue]);
    }
    return new JipdaValue(this.primLattice.abst1(cvalue), []);
  }

JipdaLattice.prototype.product =
  function (prim, as)
  {
    return new JipdaValue(prim, as);
  }

function JipdaValue(prim, as)
{
  this.prim = prim;
  this.as = as;
}
JipdaValue.prototype = new LatticeValue();
JipdaValue.prototype.equals =
  function (x)
  {
    if (x === BOT)
    {
      // !! JipdaValue(BOT, []) is NOT valid value, should be encoded as BOT
      return false;
    }
    return this.prim.equals(x.prim)
      && this.as.setEquals(x.as);
  }
JipdaValue.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + this.prim.hashCode();
    result = prime * result + this.as.hashCode();
    return result;
  }

JipdaValue.prototype.accept =
  function (visitor)
  {
    return visitor.visitJipdaValue(this);
  }

JipdaValue.prototype.addresses =
  function ()
  {
    return this.as.slice(0);
  }

JipdaValue.prototype.toString =
  function ()
  {
    return "[" + this.prim + ", " + this.as + "]";
  }

JipdaValue.prototype.join =
  function (x)
  {
    if (x === BOT)
    {
      return this;
    }
    return new JipdaValue(this.prim.join(x.prim), this.as.concat(x.as).toSet());
  }

JipdaValue.prototype.meet =
  function (x)
  {
    if (x === BOT)
    {
      return BOT;
    }
    var prim = this.prim.meet(x.prim);
    var as = this.as.removeAll(x.as);
    if (prim === BOT && as.length === 0)
    {
      return BOT;
    }
    return new JipdaValue(prim, as);
  }

JipdaValue.prototype.compareTo =
  function (x)
  {
    if (x === BOT)
    {
      return 1;
    }
    
    if (x === this)
    {
      return 0;
    }

    var c1 = this.prim.compareTo(x.prim);
    if (c1 === undefined)
    {
      return undefined;
    }
    var c2 = Lattice.subsumeComparison(this.as, x.as);
    return Lattice.joinCompareResults(c1, c2);
  }
