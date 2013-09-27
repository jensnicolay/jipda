function schemeCesk(cc)
{
  // address generator
  var a = cc.a;
  // benv creator
//  var b = cc.b || new DefaultBenv();
  // primitive lattice
  var p = cc.p;
  
  assertDefinedNotNull(a);
//  assertDefinedNotNull(b);
  assertDefinedNotNull(p);

  // lattice (primitives + addresses)
  var l = new JipdaLattice(p); // TODO this will become param
  
  // install constants
  var L_UNDEFINED = l.abst1(undefined);
  var L_NULL = l.abst1(null);
  var L_0 = l.abst1(0);
  var L_1 = l.abst1(1);
  var L_FALSE = l.abst1(false);
  var P_0 = p.abst1(0);
  var P_1 = p.abst1(1);
  var P_TRUE = p.abst1(true);
  var P_FALSE = p.abst1(false);
  var P_NUMBER = p.NUMBER;
  var P_STRING = p.STRING;
  var P_DEFINED = P_TRUE.join(P_FALSE).join(P_NUMBER).join(P_STRING);
  
  var P_RETVAL = p.abst1("!retVal!");

  // install global pointers and refs
  var global = Benv.empty();
  var globala = new ContextAddr("global", 0);
  var store = new Store();
  store = store.allocAval(globala, global);

  
  function BenvPrimitiveCall(applyFunction)
  {
    this.applyFunction = applyFunction;
  }

  BenvPrimitiveCall.prototype.toString =
    function ()
    {
      return "<BenvPrimitiveCall>";
    }
  
  BenvPrimitiveCall.prototype.equals =
    function (other)
    {
      if (this === other)
      {
        return true;
      }
      if (!(this instanceof BenvPrimitiveCall))
      {
        return false;
      }
      return this.applyFunction === other.applyFunction; // this case needed? (finite number of fixed prims)
    }
  
  BenvPrimitiveCall.prototype.addresses =
    function ()
    {
      return [];
    } 
  
  function Closure(node, statica, params, body)
  {
    this.node = node;
    this.statica = statica;
    this.params = params;
    this.body = body
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


  Closure.prototype.apply_ =
    function (application, operandValues, benva, store, kont)
    {
      var fun = this.node;
      var statica = this.statica;
      var extendedBenva = a.benv(application, benva, store, kont);
      return kont.push(new ReturnMarker(application, benva, this, extendedBenva), new ApplyState(application, fun, statica, operandValues, thisa, extendedBenva, store));
    }

  Closure.prototype.addresses =
    function ()
    {
      return [this.statica];
    }
  
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
  InitState.prototype.setStore =
    function (store)
    {
      return new InitState(this.node, this.benva, store, this.haltFrame);
    }

  function EvalState(node, benva, store)
  {
    this.type = "eval";
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
      return evalNode(this.node, this.benva, this.store, kont);
    }
  EvalState.prototype.addresses =
    function ()
    {
      return [this.benva];
    }
  EvalState.prototype.setStore =
    function (store)
    {
      return new EvalState(this.node, this.benva, store);
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
      return applyKont(this.frame, this.value, this.store, kont)
    }
  KontState.prototype.addresses =
    function ()
    {
      return this.frame.addresses().concat(this.value.addresses());
    }
  KontState.prototype.setStore =
    function (store)
    {
      return new KontState(this.frame, this.value, store);
    }
  
  function ApplyState(node, fun, staticBenv, operandValues, store)
  {
    this.type = "apply";
    this.node = node;
    this.fun = fun;
    this.staticBenv = staticBenv;
    this.operandValues = operandValues;
    this.store = store;
  }
  ApplyState.prototype.equals =
    function (x)
    {
      return (x instanceof ApplyState)
        && this.node === x.node
        && this.fun === x.fun
        && Eq.equals(this.staticBenv, x.staticBenv)
        && Eq.equals(this.operandValues, x.operandValues)
        && Eq.equals(this.store, x.store)
    }
  ApplyState.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.fun.hashCode();
      result = prime * result + this.staticBenv.hashCode();
      result = prime * result + this.operandValues.hashCode();
      return result;
    }
  ApplyState.prototype.toString =
    function ()
    {
      return "#apply " + this.node.tag;
    }
  ApplyState.prototype.nice =
    function ()
    {
      return "#apply " + this.node.tag;
    }
  ApplyState.prototype.next =
    function (kont)
    {
      return applyClosure(this.node, this.fun, this.staticBenv, this.operandValues, this.store, kont);
    }
  ApplyState.prototype.addresses =
    function ()
    {
      // extendedBenva not part of addresses (optimization): applyClosure will allocate when required
      return this.staticBenv.addresses()
              .concat(this.operandValues.flatMap(function (operandValue) {return operandValue.addresses()}));
    }
  ApplyState.prototype.setStore =
    function (store)
    {
      return new ApplyState(this.node, this.fun, this.staticBenv, this.operandValues, store);
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
      var id = node.cdr.car;
      var addr = a.variable(node, benva, store, kont);
      var benv = store.lookupAval(benva);
      benv = benv.add(id, addr);
      store = store.allocAval(addr, value);
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
      var operands = node.arguments;
  
      if (operands.length === 0)
      {
        return applyProc(node, operatorValue, [], globalRef, benva, store, kont);
      }
      var frame = new OperandsKont(node, 1, benva, operatorValue, [], globalRef);
      return kont.push(frame, new EvalState(operands[0], benva, store));
    }
  
  function OperandsKont(node, i, benva, operatorValue, operandValues, thisValue)
  {
    this.node = node;
    this.i = i;
    this.benva = benva;
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
        && Eq.equals(this.benva, x.benva) 
        && Eq.equals(this.operatorValue, x.operatorValue) 
        && Eq.equals(this.operandValues, x.operandValues) 
        && Eq.equals(this.thisValue, x.thisValue);
    }
  OperandsKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.i;
      result = prime * result + this.benva.hashCode();
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
      return this.operatorValue.addresses()
        .concat(this.operandValues.flatMap(function (value) {return value.addresses()}))
        .concat(this.thisValue.addresses())
        .addLast(this.benva);
    }
  OperandsKont.prototype.apply =
    function (operandValue, store, kont)
    {
      var node = this.node;
      var benva = this.benva;
      var i = this.i;
      var operatorValue = this.operatorValue;
      var operandValues = this.operandValues;
      var thisValue = this.thisValue;
      var operands = node.arguments;
  
      if (i === operands.length)
      {
        return applyProc(node, operatorValue, operandValues.addLast(operandValue), thisValue, benva, store, kont);
      }
      var frame = new OperandsKont(node, i + 1, benva, operatorValue, operandValues.addLast(operandValue), thisValue);
      return kont.push(frame, new EvalState(operands[i], benva, store));
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
      return x instanceof BeginKont
        && this.node === x.node
        && this.exps === x.exps
        && Eq.equals(this.benva, x.benva)
    }
  BeginKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.exps;
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
      
      if (exps instanceof Null)
      {
        return kont.pop(function (frame) {return new KontState(frame, value, store)});
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
      var consequent = node.consequent;
      var alternate = node.alternate;
      // TODO ToBoolean
      var falseProj = conditionValue.meet(L_FALSE);
      if (falseProj === BOT) // no false in value
      {
  //      return [new EvalState(consequent, benva, store, kont)];
        return evalNode(consequent, benva, store, kont);
      }
      else if (conditionValue.equals(falseProj)) // value is false
      {
        if (alternate === null)
        {
          return kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
        }
  //      return [new EvalState(alternate, benva, store, kont)];
        return evalNode(alternate, benva, store, kont);
      }
      else // value > false
      {
        var consequentState = kont.unch(new EvalState(consequent, benva, store));
        var alternateState;
        if (alternate === null)
        {
          alternateState = kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
        }
        else
        {
          alternateState = kont.unch(new EvalState(alternate, benva, store));
        }
        return consequentState.concat(alternateState);
      }
    }
  
  function evalEmptyStatement(node, benva, store, kont)
  {
    return kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
  }

  function evalLiteral(node, benva, store, kont)
  {
    var value = l.abst1(node);
    return kont.pop(function (frame) {return new KontState(frame, value, store)});
  }

  function evalIdentifier(node, benva, store, kont)
  {
    var marks = [];
    var value = doScopeLookup(p.abst1(node.name), benva, store, marks);
    return kont.pop(function (frame) {return new KontState(frame, value, store)}, marks);
  }

  function evalProgram(node, benva, store, kont)
  {
    return evalStatementList(node, benva, store, kont);
  }

  function evalStatementList(node, benva, store, kont)
  {
    var nodes = node.body;
    if (nodes.length === 0)
    {
      return kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
    }
    if (nodes.length === 1)
    {
//      return kont.unch(new EvalState(nodes[0], benva, store));
      return evalNode(nodes[0], benva, store, kont);
    }
    var frame = new BodyKont(node, 1, benva);
    return kont.push(frame, new EvalState(nodes[0], benva, store));
  }

  function evalVariableDeclaration(node, benva, store, kont)
  {
    var nodes = node.declarations;
    if (nodes.length === 0)
    {
      throw new Error("no declarations in " + node);
    }
    if (nodes.length === 1)
    {
      return evalVariableDeclarator(nodes[0], benva, store, kont);
    }
    var frame = new VariableDeclarationKont(node, 1, benva);
    return kont.push(frame, new EvalState(nodes[0], benva, store));
  }

  function evalVariableDeclarator(node, benva, store, kont)
  {
    var init = node.init;
    if (init === null)
    {
      var vr = node.id;    
      var benv = store.lookupAval(benva);      
      benv = benv.add(p.abst1(vr.name), L_UNDEFINED);
      store = store.updateAval(benva, benv); // side-effect
      return kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});      
    }
    var frame = new VariableDeclaratorKont(node, benva);
    return kont.push(frame, new EvalState(init, benva, store));
  }

  function evalBinaryExpression(node, benva, store, kont)
  {
    var frame = new LeftKont(node, benva);
    return kont.push(frame, new EvalState(node.left, benva, store));
  }

  function applyPrimitiveBinaryExpression(node, leftPrim, rightPrim, benva, store, kont)
  {
    var operator = node.operator;
    var prim;
    switch (node.operator)
    {
      case "+":
      {
        prim = p.add(leftPrim, rightPrim);
        break;
      }
      case "*":
      {
        prim = p.mul(leftPrim, rightPrim);
        break;
      }
      case "-":
      {
        prim = p.sub(leftPrim, rightPrim);
        break;
      }
      case "/":
      {
        prim = p.div(leftPrim, rightPrim);
        break;
      }
      case "%":
      {
        prim = p.rem(leftPrim, rightPrim);
        break;
      }
      case "===":
      {
        prim = p.eqq(leftPrim, rightPrim);
        break;
      }
      case "!==":
      {
        prim = p.neqq(leftPrim, rightPrim);
        break;
      }
      case "==":
      {
        prim = p.eq(leftPrim, rightPrim);
        break;
      }
      case "!=":
      {
        prim = p.neq(leftPrim, rightPrim);
        break;
      }
      case "<":
      {
        prim = p.lt(leftPrim, rightPrim);
        break;
      }
      case "<=":
      {
        prim = p.lte(leftPrim, rightPrim);
        break;
      }
      case ">":
      {
        prim = p.gt(leftPrim, rightPrim);
        break;
      }
      case ">=":
      {
        prim = p.gte(leftPrim, rightPrim);
        break;
      }
      case "&":
      {
        prim = p.binand(leftPrim, rightPrim);
        break;
      }
      case "|":
      {
        prim = p.binor(leftPrim, rightPrim);
        break;
      }
      case "<<":
      {
        prim = p.shl(leftPrim, rightPrim);
        break;
      }
      default: throw new Error("cannot handle binary operator " + node.operator);
    }
    return kont.pop(function (frame) {return new KontState(frame, l.product(prim, []), store)});
  }

  function evalAssignmentExpression(node, benva, store, kont)
  { 
    var left = node.left;
    switch (left.type)
    {
      case "Identifier":
      {
        var right = node.right;
        var frame = new AssignIdentifierKont(node, benva);
        return kont.push(frame, new EvalState(right, benva, store));
      }
      case "MemberExpression":
      {
        var object = left.object;
        var frame = new MemberAssignmentKont(node, benva);
        return kont.push(frame, new EvalState(object, benva, store));    
      }
      default:
      {
        throw new Error("evalAssignment: cannot handle left hand side " + left);
      }
    }
  }

  function evalLambda(node, benva, store, kont)
  {
    var closure = new Closure(node, benva, node.cdr.car, node.cdr.cdr);
    var closurea = a.closure(node, benva, store, kont);
    var closureRef = l.abst1(closurea);
    store = store.allocAval(closurea, closure);
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

  function evalBegin(node, benva, store, kont)
  {
    var exps = node.cdr;
    if (exps instanceof Null)
    {
      return kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
    }
    var frame = new BeginKont(node, exps, benva);
    return kont.push(frame, new EvalState(exps.car, benva, store));
  }
  
  function evalCallExpression(node, benva, store, kont)
  {
    var calleeNode = node.callee;
      
    if (Ast.isMemberExpression(calleeNode))
    { // TODO
      var cont = new Cont("meth", node, null, benva, methodOperatorCont);
      return evalNode(calleeNode.object, stack.addFirst(cont), benva, store, time);
    }
    
    var frame = new OperatorKont(node, benva);
    return kont.push(frame, new EvalState(calleeNode, benva, store));      
  }

  function applyProc(node, operatorValue, operandValues, thisValue, benva, store, kont)
  {
    var thisAs = thisValue.addresses();
    var operatorAs = operatorValue.addresses();
    return thisAs.flatMap(
      function (thisa)
      {
        return operatorAs.flatMap(
          function (operatora)
          {
            var benv = store.lookupAval(operatora);
            var callables = benv.Call;
            return callables.flatMap(
              function (callable)
              {
                return callable.applyFunction(node, operandValues, thisa, benva, store, kont);
              })
          })
      });
  }


  function applyClosure(applicationNode, funNode, statica, operandValues, thisa, extendedBenva, store, kont)
  {
    var bodyNode = funNode.body;
    var nodes = bodyNode.body;
    if (nodes.length === 0)
    {
      return kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
    }
    
    var formalParameters = funNode.params;
  
    var extendedBenv = createEnvironment(statica);    
    extendedBenv = extendedBenv.add(P_THIS, l.abst1(thisa));
    for (var i = 0; i < formalParameters.length; i++)
    {
      var param = formalParameters[i];
      extendedBenv = extendedBenv.add(p.abst1(param.name), operandValues[i]);
    }    
    
    store = store.allocAval(extendedBenva, extendedBenv);
    
    var frame = new BodyKont(bodyNode, 1, extendedBenva);
    return kont.push(frame, new EvalState(nodes[0], extendedBenva, store));
  }

  function applyKont(frame, value, store, kont)
  {
    if (frame.isMarker)
    {
      return kont.pop(function (frame) {return new KontState(frame, value, store)});
    }
    return frame.apply(value, store, kont);
  }

  function evalIfStatement(node, benva, store, kont)
  {
    var testNode = node.test;
    var frame = new IfKont(node, benva);
    return kont.push(frame, new EvalState(testNode, benva, store));
  }

  function evalNode(node, benva, store, kont)
  {    
    if (node instanceof Number || node instanceof String || node instanceof Null)
    {
      return evalLiteral(node, benva, store, kont);        
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
        if (name === "quote")
        {
          return evalQuote(node, benva, store, kont);
        }
        if (name === "begin")
        {
          return evalBegin(node, benva, store, kont);
        }
      }
    }
    if (node instanceof Sym)
    {
      
    }
    throw new Error("cannot handle node " + node); 
  }

  var module = {};
  module.evalState =
    function (node, benva, store)
    {
      return new EvalState(node, benva, store);
    }
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

