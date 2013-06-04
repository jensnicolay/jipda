var jseval = {toString:function () {return "jseval"}};

jseval.doScopeLookup =
  function (name, benva, store, c)
  {
    var result = BOT;
    var benvas = [benva];
    while (benvas.length !== 0)
    {
      var a = benvas[0];
      benvas = benvas.slice(1);
      var benv = store.lookupAval(a);
      var value = benv.lookup(name);
      if (value !== BOT)
      {
        result = result.join(value);
      }
      else
      {
        benvas = benvas.concat(benv.parents);
      }
    }
    // approximation: if some chains have the var, then we assume ok
    // in theory we should check each chain separately, join the found results, and if necessary
    // create an error branch if one of the chains doesn't find the var
    if (result === BOT)
    {
      throw new Error("ReferenceError: " + name + " is not defined"); //TODO turn this into stack trace      
    }
    return result;
  }

jseval.doScopeSet =
  function (name, value, benva, store, c)
  {
    var benvas = [benva];
    var setTopLevel = false;
    while (benvas.length !== 0)
    {
      var a = benvas[0];
      benvas = benvas.slice(1);
      var benv = store.lookupAval(a);
      var existing = benv.lookup(name);
      if (existing !== BOT)
      {
        benv = benv.add(name, value);
        store = store.updateAval(a, benv); // side-effect
      }
      else
      {
        var parents = benv.parents;
        if (parents.length === 0)
        {
          setTopLevel = true;
        }
        else
        {
          benvas = benvas.concat(benv.parents);
        }
      }
    }
    if (setTopLevel)
    {
      var benv = store.lookupAval(c.globala);      
      benv = benv.add(name, value);
      store = store.updateAval(c.globala, benv); // side-effect
    }
    return store;
  }

jseval.doHoisting =
  function (node, benva, store, kont, c)
  {
    var hoisted = node.hoisted;
    if (!hoisted)
    {
      var scopeInfo = Ast.scopeInfo(node);
      hoisted = Ast.hoist(scopeInfo);
      node.hoisted = hoisted;
    }
    if (hoisted.funs.length > 0 || hoisted.vars.length > 0)
    {
      var benv = store.lookupAval(benva);      
      hoisted.funs.forEach(
        function (funDecl)
        {
          var node = funDecl.node;
          var allocateResult = c.e.allocateClosure(node, benva, store, kont, c);
          var closureRef = allocateResult.ref;
          store = allocateResult.store;
          var vr = node.id;
          benv = benv.add(c.p.abst1(vr.name), closureRef);
        });
      hoisted.vars.forEach(
        function (varDecl)
        {
          var vr = varDecl.node.id;    
          benv = benv.add(c.p.abst1(vr.name), c.L_UNDEFINED);
        });
      store = store.updateAval(benva, benv); // side-effect
    }
    return store;
  }

jseval.evalEmptyStatement =
  function (node, benva, store, kont, c)
  {
    return [new KontState(kont[0], c.L_UNDEFINED, store, kont.slice(1))];
  }

jseval.evalLiteral =
  function (node, benva, store, kont, c)
  {
    var value = c.l.abst1(node.value);
    return [new KontState(kont[0], value, store, kont.slice(1))];
  }

jseval.evalIdentifier =
  function (node, benva, store, kont, c)
  {
    var value = c.e.doScopeLookup(c.p.abst1(node.name), benva, store, c);
    return [new KontState(kont[0], value, store, kont.slice(1))];
  }

jseval.evalProgram =
  function (node, benva, store, kont, c)
  {
    store = c.e.doHoisting(node, benva, store, kont, c);    
    return c.e.evalStatementList(node, benva, store, kont, c);
  }

jseval.evalStatementList =
  function (node, benva, store, kont, c)
  {
    var nodes = node.body;
    if (nodes.length === 0)
    {
      return [new KontState(kont[0], c.L_UNDEFINED, store, kont.slice(1))];
    }
    if (nodes.length === 1)
    {
      return [new EvalState(nodes[0], benva, store, kont)];
//      return c.e.evalNode(nodes[0], benva, store, kont, c);
    }
    var frame = new StatementListKont(node, 1, benva, c.L_UNDEFINED);
    return [new EvalState(nodes[0], benva, store, kont.addFirst(frame))];
  }

function StatementListKont(node, i, benva, lastValue, marks)
{
  this.node = node;
  this.i = i;
  this.benva = benva;
  this.lastValue = lastValue;
  this.marks = marks || [];
}
StatementListKont.prototype.equals =
  function (x)
  {
    return this.node === x.node
      && this.i === x.i
      && Eq.equals(this.benva, x.benva)
      && Eq.equals(this.lastValue, x.lastValue);
  }
StatementListKont.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + node.hashCode();
    result = prime * result + i;
    result = prime * result + benva.hashCode();
    result = prime * result + lastValue.hashCode();
    return result;
  }
StatementListKont.prototype.mark =
  function (mark)
  {
    return new StatementListKont(this.node, this.i, this.benva, this.lastValue, this.marks.addUniqueLast(mark));
  }
StatementListKont.prototype.toString =
  function ()
  {
    return "slist-" + this.node.tag + "-" + this.i;
  }
StatementListKont.prototype.addresses =
  function ()
  {
    return this.lastValue.addresses().addLast(this.benva);
  }
StatementListKont.prototype.apply =
  function (value, store, kont, c)
  {
    var node = this.node;
    var benva = this.benva;
    var i = this.i;
    var lastValue = this.lastValue;
    
    // keep track of last value-producing statement (ECMA 12.1 Block, 14 Program)
    var newLastValue;
    var undefProj = value.meet(c.L_UNDEFINED);
    if (undefProj === BOT) // no undefined in value
    {
      newLastValue = value;
    }
    else if (value.equals(undefProj)) // value is undefined
    {
      newLastValue = lastValue;
    }
    else // value > undefined
    {
      newLastValue = c.l.join(value.prim.meet(c.P_DEFINED), value.as).join(lastValue); 
    }
    
    var nodes = node.body;
    if (i === nodes.length)
    {
      return [new KontState(kont[0], newLastValue, store, kont.slice(1))];
    }
    var frame = new StatementListKont(node, i + 1, benva, newLastValue);
    return [new EvalState(nodes[i], benva, store, kont.addFirst(frame))];
  }

jseval.evalVariableDeclaration =
  function (node, benva, store, kont, c)
  {
    var nodes = node.declarations;
    if (nodes.length === 0)
    {
      throw new Error("no declarations in " + node);
    }
    if (nodes.length === 1)
    {
      return c.e.evalVariableDeclarator(nodes[0], benva, store, kont, c);
    }
    var frame = new VariableDeclarationKont(node, 1, benva);
    return [new EvalState(nodes[0], benva, store, kont.addFirst(frame))];
  }

function VariableDeclarationKont(node, i, benva)
{
  this.node = node;
  this.i = i;
  this.benva = benva;
}
VariableDeclarationKont.prototype.equals =
  function (x)
  {
    return this.node === x.node && this.i === x.i && Eq.equals(this.benva, x.benva);
  }
VariableDeclarationKont.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + node.hashCode();
    result = prime * result + i;
    result = prime * result + benva.hashCode();
    return result;
  }
VariableDeclarationKont.prototype.toString =
  function ()
  {
    return "vdecl-" + this.node.tag + "-" + this.i;
  }
VariableDeclarationKont.prototype.addresses =
  function ()
  {
    return [this.benva];
  }
VariableDeclarationKont.prototype.apply =
  function (value, store, kont, c)
  {
    var node = this.node;
    var benva = this.benva;
    var i = this.i;
    
    var nodes = node.declarations;
    if (i === nodes.length)
    {
      return [new KontState(kont[0], value, store, kont.slice(1))];
    }
    var frame = new VariableDeclarationKont(node, i + 1, benva);
    return [new EvalState(nodes[i], benva, store, kont.addFirst(frame))];
  }

jseval.evalVariableDeclarator =
  function (node, benva, store, kont, c)
  { 
    var init = node.init;
      
    if (init === null)
    {
      return [new KontState(kont[0], c.L_UNDEFINED, store, kont.slice(1))];      
    }
    var frame = new VariableDeclaratorKont(node, benva);
    return [new EvalState(init, benva, store, kont.addFirst(frame))];
  }

function VariableDeclaratorKont(node, benva)
{
  this.node = node;
  this.benva = benva;
}
VariableDeclaratorKont.prototype.equals =
  function (x)
  {
    return this.node === x.node && Eq.equals(this.benva, x.benva);
  }
VariableDeclaratorKont.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + node.hashCode();
    result = prime * result + benva.hashCode();
    return result;
  }
VariableDeclaratorKont.prototype.toString =
  function ()
  {
    return "vrator " + this.node.tag;
  }
VariableDeclaratorKont.prototype.addresses =
  function ()
  {
    return [this.benva];
  }
VariableDeclaratorKont.prototype.apply =
  function (value, store, kont, c)
  {
    var id = this.node.id;
    var benva = this.benva;
    var benv = store.lookupAval(benva);
    benv = benv.add(c.p.abst1(id.name), value);
    store = store.updateAval(benva, benv); // side-effect
    return [new KontState(kont[0], c.L_UNDEFINED, store, kont.slice(1))];
  }

jseval.evalBinaryExpression =
  function (node, benva, store, kont, c)
  {
    var frame = new LeftKont(node, benva);
    return [new EvalState(node.left, benva, store, kont.addFirst(frame))];
  }

function LeftKont(node, benva, marks)
{
  this.node = node;
  this.benva = benva;
  this.marks = marks || [];
}
LeftKont.prototype.equals =
  function (x)
  {
    return this.node === x.node && Eq.equals(this.benva, x.benva);
  }
LeftKont.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + node.hashCode();
    result = prime * result + benva.hashCode();
    return result;
  }
LeftKont.prototype.toString =
  function ()
  {
    return "left-" + this.node.tag;
  }
LeftKont.prototype.mark =
  function (mark)
  {
    return new LeftKont(this.node, this.benva, this.marks.addUniqueLast(mark));
  }
LeftKont.prototype.addresses =
  function ()
  {
    return [this.benva];
  }
LeftKont.prototype.apply =
  function (leftValue, store, kont, c)
  {
    var node = this.node;
    var benva = this.benva;
    var frame = new RightKont(node, benva, leftValue);
    return [new EvalState(node.right, benva, store, kont.addFirst(frame))];
  }

function RightKont(node, benva, leftValue, marks)
{
  this.node = node;
  this.benva = benva;
  this.leftValue = leftValue;
  this.marks = marks || [];
}
RightKont.prototype.equals =
  function (x)
  {
    return this.node === x.node && Eq.equals(this.benva, x.benva) && Eq.equals(this.leftValue, x.leftValue);
  }
RightKont.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + node.hashCode();
    result = prime * result + benva.hashCode();
    result = prime * result + leftValue.hashCode();
    return result;
  }
RightKont.prototype.toString =
  function ()
  {
    return "right-" + this.node.tag;
  }
RightKont.prototype.mark =
  function (mark)
  {
    return new RightKont(this.node, this.benva, this.leftValue, this.marks.addUniqueLast(mark));
  }
RightKont.prototype.addresses =
  function ()
  {
    return this.leftValue.addresses().addLast(this.benva);
  }
RightKont.prototype.apply =
  function (rightValue, store, kont, c)
  {
    var node = this.node;
    var benva = this.benva;
    var leftValue = this.leftValue;
    var leftPrim = leftValue.prim;
    var rightPrim = rightValue.prim;
    var leftAs = leftValue.addresses();
    var rightAs = rightValue.addresses();
    if (leftAs.length === 0 && rightAs.length === 0)
    {
      // fast path: primitives (no need for coercions on interpreter level)
      return c.e.applyBinaryExpressionPrim(node, leftPrim, rightPrim, benva, store, kont, c);
    }
    throw new Error("TODO");
  }

jseval.applyBinaryExpressionPrim =
  function (node, leftPrim, rightPrim, benva, store, kont, c)
  {
    var operator = node.operator;
    var prim;
    switch (node.operator)
    {
      case "+":
      {
        prim = c.p.add(leftPrim, rightPrim);
        break;
      }
      case "*":
      {
        prim = c.p.mul(leftPrim, rightPrim);
        break;
      }
      case "-":
      {
        prim = c.p.sub(leftPrim, rightPrim);
        break;
      }
      case "/":
      {
        prim = c.p.div(leftPrim, rightPrim);
        break;
      }
      case "%":
      {
        prim = c.p.rem(leftPrim, rightPrim);
        break;
      }
      case "===":
      {
        prim = c.p.eqq(leftPrim, rightPrim);
        break;
      }
      case "!==":
      {
        prim = c.p.neqq(leftPrim, rightPrim);
        break;
      }
      case "==":
      {
        prim = c.p.eq(leftPrim, rightPrim);
        break;
      }
      case "!=":
      {
        prim = c.p.neq(leftPrim, rightPrim);
        break;
      }
      case "<":
      {
        prim = c.p.lt(leftPrim, rightPrim);
        break;
      }
      case "<=":
      {
        prim = c.p.lte(leftPrim, rightPrim);
        break;
      }
      case ">":
      {
        prim = c.p.gt(leftPrim, rightPrim);
        break;
      }
      case ">=":
      {
        prim = c.p.gte(leftPrim, rightPrim);
        break;
      }
      case "&":
      {
        prim = c.p.binand(leftPrim, rightPrim);
        break;
      }
      case "|":
      {
        prim = c.p.binor(leftPrim, rightPrim);
        break;
      }
      case "<<":
      {
        prim = c.p.shl(leftPrim, rightPrim);
        break;
      }
      default: throw new Error("cannot handle binary operator " + node.operator);
    }
    return [new KontState(kont[0], c.l.join(prim, []), store, kont.slice(1))];
  }

jseval.evalAssignmentExpression =
  function (node, benva, store, kont, c)
  { 
    var left = node.left;
    
    switch (left.type)
    {
      case "Identifier":
      {
        return c.e.evalAssignmentExpressionIdentifier(node, benva, store, kont, c);
      }
      case "MemberExpression":
      {
        return c.e.evalAssignmentExpressionMember(node, benva, store, kont, c);        
//        return c.e.evalBaseExpression(left, stack.addFirst(rightCont()), benva, store, time, c);
      }
      default:
        throw new Error("evalAssignment: cannot handle left hand side " + left); 
    }
  }

jseval.evalAssignmentExpressionIdentifier =
  function (node, benva, store, kont, c)
  { 
    var right = node.right;
    var frame = new AssignIdentifierKont(node, benva);
    return [new EvalState(right, benva, store, kont.addFirst(frame))];
  }

function AssignIdentifierKont(node, benva)
{
  this.node = node;
  this.benva = benva;
}
AssignIdentifierKont.prototype.equals =
  function (x)
  {
    return this.node === x.node && Eq.equals(this.benva, x.benva);
  }
AssignIdentifierKont.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + node.hashCode();
    result = prime * result + benva.hashCode();
    return result;
  }
AssignIdentifierKont.prototype.toString =
  function ()
  {
    return "asid-" + this.node.tag;
  }
AssignIdentifierKont.prototype.addresses =
  function ()
  {
    return [this.benva];
  }
AssignIdentifierKont.prototype.apply =
  function (value, store, kont, c)
  {
    var node = this.node;
    var benva = this.benva;
    var id = node.left;
    store = c.e.doScopeSet(c.p.abst1(id.name), value, benva, store, c);
    return [new KontState(kont[0], value, store, kont)];
  }

//  function memberAssignmentCont()
//  {
//    return new Cont("=mem", right, null, benva,
//      function (stack, store, time, c)
//      {
//        var rvalues = stack[0];
//        var propertyName = stack[1];
//        var spn = toUserString(propertyName, store);
//        var uspn;
//        var length;
//        if (uspn = c.l.userLattice.isStringArrayIndex(spn)) // TODO wrong! 'is...Index' should return abstract boolean
//        {
//          length = c.l.userLattice.add(uspn, c.l.U_1);
//        }
//        var objectAddresses = stack[2].addresses();
//        var cont = stack[3];
//        var stack2 = stack.slice(4);
//        //print("rvalues", rvalues, "objectAddresses", objectAddresses, "propertyName", spn);
//        if (!objectAddresses)
//        {
//          throw new Error("cannot determine object addresses for lhs in " + node);
//        }
//        objectAddresses.forEach(
//          function (objectAddress)
//          {
//            var object = c.e.lookupAval(objectAddress, stack, store, c);
//            assertDefinedNotNull(object.lookup);
//            object = object.add(spn, rvalues);
//            if (length && object.isArray())
//            {
//              var lengthValue = object.lookup(c.l.U_LENGTH).value; // direct (local) lookup without protochain
//              if (c.l.userLattice.isTrue(c.l.userLattice.lt(lengthValue.user, length)))
//              {
//                object = object.add(c.l.U_LENGTH, new JipdaValue(length, []));
//              }
//            }
//            store = c.e.sideEffectAval(objectAddress, object, stack, store, c);
//          });
//        return cont.execute(stack2.addFirst(rvalues), store, time, c);
//      });
//  }

jseval.allocateClosure =
  function (node, benva, store, kont, c)
  {
    var closure = c.createClosure(node, benva);
    var closurea = c.a.closure(node, benva, store, kont, c);
  
    var prototype = c.createObject(c.objectProtoRef);
    var prototypea = c.a.closureProtoObject(node, benva, store, kont, c);
    var closureRef = c.l.abst1(closurea);
    prototype = prototype.add(c.P_CONSTRUCTOR, closureRef);
    store = store.allocAval(prototypea, prototype);
  
    closure = closure.add(c.P_PROTOTYPE, c.l.abst1(prototypea));
    store = store.allocAval(closurea, closure);
    return {store: store, ref: closureRef}
  }

jseval.evalFunctionExpression =
  function (node, benva, store, kont, c)
  {
    var allocateResult = c.e.allocateClosure(node, benva, store, kont, c);
    var closureRef = allocateResult.ref;
    store = allocateResult.store;
    return [new KontState(kont[0], closureRef, store, kont.slice(1))];
  }

jseval.evalFunctionDeclaration =
  function (node, benva, store, kont, c)
  {
    // hoisted!
    return [new KontState(kont[0], c.L_UNDEFINED, store, kont.slice(1))];
  }

jseval.evalCallExpression =
  function (node, benva, store, kont, c)
  {
    var calleeNode = node.callee;
      
    if (Ast.isMemberExpression(calleeNode))
    {
      var cont = new Cont("meth", node, null, benva, c.e.methodOperatorCont);
      return c.e.evalNode(calleeNode.object, stack.addFirst(cont), benva, store, time, c);
    }
    
    var frame = new OperatorKont(node, benva);
    return [new EvalState(calleeNode, benva, store, kont.addFirst(frame))];      
  }

function OperatorKont(node, benva, marks)
{
  this.node = node;
  this.benva = benva;
  this.marks = marks || [];
}
OperatorKont.prototype.equals =
  function (x)
  {
    return this.node === x.node && Eq.equals(this.benva, x.benva);
  }
OperatorKont.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + node.hashCode();
    result = prime * result + benva.hashCode();
    return result;
  }
OperatorKont.prototype.toString =
  function ()
  {
    return "rator-" + this.node.tag;
  }
OperatorKont.prototype.mark =
  function (mark)
  {
    return new OperatorKont(this.node, this.benva, this.marks.addUniqueLast(mark));
  }
OperatorKont.prototype.addresses =
  function ()
  {
    return [this.benva];
  }
OperatorKont.prototype.apply =
  function (operatorValue, store, kont, c)
  {
    var node = this.node;
    var benva = this.benva;
    var operands = node.arguments;

    if (operands.length === 0)
    {
      return c.e.applyProc(node, operatorValue, [], c.globalRef, benva, store, kont, c);
    }
    var frame = new OperandsKont(node, 1, benva, operatorValue, [], c.globalRef);
    return [new EvalState(operands[0], benva, store, kont.addFirst(frame))];
  }

function OperandsKont(node, i, benva, operatorValue, operandValues, thisValue, marks)
{
  this.node = node;
  this.i = i;
  this.benva = benva;
  this.operatorValue = operatorValue;
  this.operandValues = operandValues;
  this.thisValue = thisValue;
  this.marks = marks || [];
}
OperandsKont.prototype.equals =
  function (x)
  {
    return this.node === x.node 
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
    result = prime * result + node.hashCode();
    result = prime * result + i;
    result = prime * result + benva.hashCode();
    result = prime * result + operatorValue.hashCode();
    result = prime * result + operandValues.hashCode();
    result = prime * result + thisValue.hashCode();
    return result;
  }
OperandsKont.prototype.toString =
  function ()
  {
    return "rand-" + this.node.tag + "-" + this.i;
  }
OperandsKont.prototype.mark =
  function (mark)
  {
    return new OperandsKont(this.node, this.i, this.benva, this.operatorValue, this.operandValues, this.thisValue, this.marks.addUniqueLast(mark));
  }
OperandsKont.prototype.addresses =
  function ()
  {
    return this.operatorValue.addresses()
      .concat(this.operandValues.flatMap(function (value) {return value.addresses()}))
      .concat(thisValue.addresses())
      .addLast(this.benva);
  }
OperandsKont.prototype.apply =
  function (operandValue, store, kont, c)
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
      return c.e.applyProc(node, operatorValue, operandValues.addLast(operandValue), thisValue, benva, store, kont, c);
    }
    var frame = new OperandsKont(node, i + 1, benva, operatorValue, operandValues.addLast(operandValue), thisValue);
    return [new EvalState(operands[i], benva, store, kont.addFirst(frame))];
  }

jseval.applyProc =
  function (node, operatorValue, operandValues, thisValue, benva, store, kont, c)
  {
    if (kont.length > 1024)
    {
      throw new Error("stack overflow");
    }
    
//    var visitedResult = c.v.visited(application, stack, benva, store, time);
//    if (visitedResult === null)
//    {
//      return [];
//    }
//    store = visitedResult.store;
//    stack = visitedResult.stack;
    
    // TODO 'thisValue' handling/type coercions?
    
    var operatorPrim = operatorValue.prim;
    if (operatorPrim === BOT)
    {
      // fast path: no type coercions needed
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
              return callables.map(
                function (callable)
                {
                  return new CallState(node, callable, operandValues, thisa, benva, store, kont[0], kont.slice(1));
                })
            })
        })
    }
  }

function ApplyState(node, fun, statica, operandValues, thisa, benva, store, kont)
{
  this.node = node;
  this.fun = fun;
  this.statica = statica;
  this.operandValues = operandValues;
  this.thisa = thisa;
  this.benva = benva;
  this.store = store;
  this.kont = kont;
}
ApplyState.prototype.toControlState =
  function ()
  {
    return new ApplyState(this.node, this.fun, this.statica, this.operandValues, this.thisa, this.benva, this.store, null);
  }
ApplyState.prototype.equals =
  function (x)
  {
    return this.node === x.node 
      && this.fun === x.fun 
      && Eq.equals(this.statica, x.statica) 
      && Eq.equals(this.operandValues, x.operandValues) 
      && Eq.equals(this.thisa, x.thisa) 
      && Eq.equals(this.benva, x.benva) 
      && Eq.equals(this.store, x.store) 
      && Eq.equals(this.kont, x.kont);
  }
ApplyState.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + node.hashCode();
    result = prime * result + fun.hashCode();
    result = prime * result + statica.hashCode();
    result = prime * result + operandValues.hashCode();
    result = prime * result + thisa.hashCode();
    result = prime * result + benva.hashCode();
    result = prime * result + store.hashCode();
    result = prime * result + kont.hashCode();
    return result;
  }

ApplyState.prototype.toString =
  function ()
  {
    return "#apply-" + this.node.tag;
  }

ApplyState.prototype.next =
  function (c)
  {
    return c.e.applyFunction(this.node, this.fun, this.statica, this.operandValues, this.thisa, this.benva, this.store, this.kont, c);
  }

function CallState(node, callable, operandValues, thisa, benva, store, returnFrame, kont)
{
  this.node = node;
  this.callable = callable;
  this.operandValues = operandValues;
  this.thisa = thisa;
  this.benva = benva;
  this.store = store;
  this.returnFrame = returnFrame;
  this.kont = kont;
}
CallState.prototype.toControlState =
  function ()
  {
    return new CallState(this.node, this.callable, this.operandValues, this.thisa, this.benva, this.store, this.returnFrame, null);
  }
CallState.prototype.equals =
  function (x)
  {
    return this.node === x.node
      && Eq.equals(this.callable, x.callable)
      && Eq.equals(this.operandValues, x.operandValues)
      && Eq.equals(this.thisa, x.thisa)
      && Eq.equals(this.benva, x.benva)
      && Eq.equals(this.store, x.store)
      && Eq.equals(this.returnFrame, x.returnFrame)
      && Eq.equals(this.kont, x.kont);
  }
CallState.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + node.hashCode();
    result = prime * result + callable.hashCode();
    result = prime * result + oeprandValues.hashCode();
    result = prime * result + thisa.hashCode();
    result = prime * result + benva.hashCode();
    result = prime * result + store.hashCode();
    result = prime * result + returnFrame.hashCode();
    result = prime * result + kont.hashCode();
    return result;
  }
CallState.prototype.toString =
  function ()
  {
    return "#call " + this.node.tag;
  }
CallState.prototype.next =
  function (c)
  {
    return this.callable.applyFunction(this.node, this.operandValues, this.thisa, this.benva, this.store, this.returnFrame, this.kont, c);
  }

function KontState(frame, value, store, kont)
{
  this.frame = frame;
  this.value = value;
  this.store = store;
  this.kont = kont;
}
KontState.prototype.toControlState =
  function ()
  {
    return new KontState(this.frame, this.value, this.store, null);
  }
KontState.prototype.equals =
  function (x)
  {
    return Eq.equals(this.frame, x.frame) 
      && Eq.equals(this.value, x.value) 
      && Eq.equals(this.store, x.store)
      && Eq.equals(this.kont, x.kont);
  }
KontState.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + frame.hashCode();
    result = prime * result + value.hashCode();
    result = prime * result + store.hashCode();
    result = prime * result + kont.hashCode();
    return result;
  }
KontState.prototype.toString =
  function ()
  {
    return "#kont-" + this.frame.constructor;
  }

KontState.prototype.next =
  function (c)
  {
    return this.frame.apply(this.value, this.store, this.kont, c);
  }

jseval.applyFunction =
  function (applicationNode, funNode, statica, operandValues, thisa, benva, store, kont, c)
  {
    var bodyNode = funNode.body;
    var nodes = bodyNode.body;
    if (nodes.length === 0)
    {
      return [new KontState(kont[0], c.L_UNDEFINED, store, kont, c)];
    }
    
    var formalParameters = funNode.params;
  
    var extendedBenv = c.createEnvironment(statica);    
    extendedBenv = extendedBenv.add(c.P_THIS, c.l.abst1(thisa));
    for (var i = 0; i < formalParameters.length; i++)
    {
      var param = formalParameters[i];
      extendedBenv = extendedBenv.add(c.p.abst1(param.name), operandValues[i]);
    }    
    var extendedBenva = c.a.benv(applicationNode, benva, store, kont);
    
    store = c.e.doHoisting(funNode, benva, store, kont, c);
    store = store.allocAval(extendedBenva, extendedBenv);
    
    // ECMA 13.2.1(6): [[Code]] cannot be evaluated as StatementList
    var frame = new BodyKont(bodyNode, 1, extendedBenva);
    return [new EvalState(nodes[0], extendedBenva, store, kont.addFirst(frame))];
  }

function BodyKont(node, i, benva, marks)
{
  this.node = node;
  this.i = i;
  this.benva = benva;
  this.marks = marks || [];
}
BodyKont.prototype.equals =
  function (x)
  {
    return this.node === x.node
      && this.i === x.i
      && Eq.equals(this.benva, x.benva);
  }
BodyKont.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + node.hashCode();
    result = prime * result + i;
    result = prime * result + benva.hashCode();
    return result;
  }
BodyKont.prototype.toString =
  function ()
  {
    return "body-" + this.node.tag + "-" + this.i;
  }
BodyKont.prototype.mark =
  function (mark)
  {
    return new BodyKont(this.node, this.i, this.benva, this.marks.addUniqueLast(mark));
  }
BodyKont.prototype.addresses =
  function ()
  {
    return [this.benva];
  }
BodyKont.prototype.apply =
  function (ignoredValue, store, kont, c)
  {
    var node = this.node;
    var benva = this.benva;
    var i = this.i;
    
    var nodes = node.body;
    if (i === nodes.length)
    {
      return [new KontState(kont[0], c.L_UNDEFINED, store, kont.slice(1))];
    }
    var frame = new BodyKont(node, i + 1, benva);
    return [new EvalState(nodes[i], benva, store, kont.addFirst(frame))];
  }

jseval.evalReturnStatement =
  function (node, benva, store, kont, c)
  {
    var argumentNode = node.argument;
    if (argumentNode === null)
    {
      return [new ReturnState(node, c.L_UNDEFINED, store, kont[0], kont.slice(1))];
    }
    
    var frame = new ReturnKont(node, benva);
    return [new EvalState(argumentNode, benva, store, kont.addFirst(frame))];
  }

function ReturnKont(node, benva, marks)
{
  this.node = node;
  this.benva = benva;
  this.marks = marks || [];
}
ReturnKont.prototype.equals =
  function (x)
  {
    return this.node === x.node 
      && Eq.equals(this.benva, x.benva);
  }
ReturnKont.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + node.hashCode();
    result = prime * result + benva.hashCode();
    return result;
  }
ReturnKont.prototype.toString =
  function ()
  {
    return "ret-" + this.node.tag;
  }
ReturnKont.prototype.mark =
  function (mark)
  {
    return new ReturnKont(this.node, this.benva, this.marks.addUniqueLast(mark));
  }
ReturnKont.prototype.addresses =
  function ()
  {
    return [this.benva];
  }
ReturnKont.prototype.apply =
  function (returnValue, store, kont, c)
  {
    var node = this.node;
    var benva = this.benva;    
    return [new ReturnState(node, returnValue, store, kont[0], kont.slice(1))];
  }

function ReturnState(node, returnValue, store, frame, kont)
{
  this.node = node;
  this.returnValue = returnValue;
  this.store = store;
  this.frame = frame;
  this.kont = kont;
}
ReturnState.prototype.toControlState =
  function ()
  {
    return new ReturnState(this.node, this.returnValue, this.store, this.frame, null);
  }
ReturnState.prototype.equals =
  function (x)
  {
    return this.node === x.node 
      && Eq.equals(this.returnValue, x.returnValue) 
      && Eq.equals(this.store, x.store) 
      && Eq.equals(this.frame, x.frame) 
      && Eq.equals(this.kont, x.kont);
  }
ReturnState.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + node.hashCode();
    result = prime * result + returnValue.hashCode();
    result = prime * result + store.hashCode();
    result = prime * result + frame.hashCode();
    result = prime * result + kont.hashCode();
    return result;
  }
ReturnState.prototype.toString =
  function ()
  {
    return "#return-" + this.node.tag;
  }
ReturnState.prototype.next =
  function (c)
  {
    return c.e.scanReturn(this.node, this.returnValue, this.store, this.frame, this.kont, c);
  }

jseval.scanReturn =
  function (node, returnValue, store, frame, kont, c)
  {
    var marks = frame.marks;
//      print("marks", frame);
    for (var j = 0; j < marks.length; j++)
    {
      var mark = marks[j];
      if (Ast.isCallExpression(mark))
      {
        return frame.apply(returnValue, store, kont, c);
//          return [new KontState(frame, returnValue, store, kont.slice(1))];
      }
    }
    if (kont.length === 0)
    {
      throw new Error("return not in function: " + node);      
    }
    return [new ReturnState(node, returnValue, store, kont[0], kont.slice(1))];
  }

jseval.evalIfStatement =
  function (node, benva, store, kont, c)
  {
    var testNode = node.test;
    var frame = new IfKont(node, benva);
    return [new EvalState(testNode, benva, store, kont.addFirst(frame))];
  }

jseval.evalConditionalExpression =
  function (node, benva, store, kont, c)
  {
    var testNode = node.test;
    var frame = new IfKont(node, benva);
    return [new EvalState(testNode, benva, store, kont.addFirst(frame))];
  }

function IfKont(node, benva, marks)
{
  this.node = node;
  this.benva = benva;
  this.marks = marks || [];
}
IfKont.prototype.equals =
  function (x)
  {
    return this.node === x.node && Eq.equals(this.benva, x.benva);
  }
IfKont.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + node.hashCode();
    result = prime * result + benva.hashCode();
    return result;
  }
IfKont.prototype.toString =
  function ()
  {
    return "if-" + this.node.tag;
  }
IfKont.prototype.mark =
  function (mark)
  {
    return new IfKont(this.node, this.benva, this.marks.addUniqueLast(mark));
  }
IfKont.prototype.addresses =
  function ()
  {
    return [this.benva];
  }
IfKont.prototype.apply =
  function (conditionValue, store, kont, c)
  {
    var node = this.node;
    var benva = this.benva;    
    var consequent = node.consequent;
    var alternate = node.alternate;
    // TODO ToBoolean
    var falseProj = conditionValue.meet(c.L_FALSE);
    if (falseProj === BOT) // no false in value
    {
//      return [new EvalState(consequent, benva, store, kont)];
      return c.e.evalNode(consequent, benva, store, kont, c);
    }
    else if (conditionValue.equals(falseProj)) // value is false
    {
      if (alternate === null)
      {
        return [new KontState(kont[0], c.L_UNDEFINED, store, kont.slice(1))];
      }
//      return [new EvalState(alternate, benva, store, kont)];
      return c.e.evalNode(alternate, benva, store, kont, c);
    }
    else // value > false
    {
      var consequentState = new EvalState(consequent, benva, store, kont);
      var alternateState;
      if (alternate === null)
      {
        alternateState = new KontState(kont[0], c.L_UNDEFINED, store, kont.slice(1));
      }
      else
      {
        alternateState = new EvalState(alternate, benva, store, kont);
      }
      return [consequentState, alternateState];
    }
  }

jseval.evalNode =
  function (node, benva, store, kont, c)
  {
    switch (node.type)
    {
      case "Literal": 
        return c.e.evalLiteral(node, benva, store, kont, c);
      case "Identifier":
        return c.e.evalIdentifier(node, benva, store, kont, c);
      case "BinaryExpression":
        return c.e.evalBinaryExpression(node, benva, store, kont, c);
      case "LogicalExpression":
        return c.e.evalLogicalExpression(node, benva, store, kont, c);
      case "CallExpression":
        return c.e.evalCallExpression(node, benva, store, kont, c);
      case "FunctionExpression":
        return c.e.evalFunctionExpression(node, benva, store, kont, c);
      case "AssignmentExpression":
        return c.e.evalAssignmentExpression(node, benva, store, kont, c);
      case "ArrayExpression":
        return c.e.evalArrayExpression(node, benva, store, kont, c);
      case "MemberExpression":
        return c.e.evalMemberExpression(node, benva, store, kont, c);
      case "ObjectExpression":
        return c.e.evalObjectExpression(node, benva, store, kont, c);
      case "ThisExpression":
        return c.e.evalThisExpression(node, benva, store, kont, c);
      case "NewExpression":
        return c.e.evalNewExpression(node, benva, store, kont, c);
      case "UpdateExpression":
        return c.e.evalUpdateExpression(node, benva, store, kont, c);
      case "UnaryExpression":
        return c.e.evalUnaryExpression(node, benva, store, kont, c);
      case "ExpressionStatement":
        return c.e.evalNode(node.expression, benva, store, kont, c);
      case "ReturnStatement": 
        return c.e.evalReturnStatement(node, benva, store, kont, c);
      case "BreakStatement": 
        return c.e.evalBreakStatement(node, benva, store, kont, c);
      case "LabeledStatement": 
        return c.e.evalLabeledStatement(node, benva, store, kont, c);
      case "IfStatement": 
        return c.e.evalIfStatement(node, benva, store, kont, c);
      case "ConditionalExpression": 
        return c.e.evalConditionalExpression(node, benva, store, kont, c);
      case "SwitchStatement": 
        return c.e.evalSwitchStatement(node, benva, store, kont, c);
      case "ForStatement": 
        return c.e.evalForStatement(node, benva, store, kont, c);
      case "WhileStatement": 
        return c.e.evalWhileStatement(node, benva, store, kont, c);
      case "FunctionDeclaration": 
        return c.e.evalFunctionDeclaration(node, benva, store, kont, c);
      case "VariableDeclaration": 
        return c.e.evalVariableDeclaration(node, benva, store, kont, c);
      case "VariableDeclarator": 
        return c.e.evalVariableDeclarator(node, benva, store, kont, c);
      case "BlockStatement":
        return c.e.evalStatementList(node, benva, store, kont, c);
      case "EmptyStatement":
        return c.e.evalEmptyStatement(node, benva, store, kont, c);
      case "TryStatement": 
        return c.e.evalTryStatement(node, benva, store, kont, c);
      case "ThrowStatement": 
        return c.e.evalThrowStatement(node, benva, store, kont, c);
      case "Program":
        return c.e.evalProgram(node, benva, store, kont, c);
      default:
        throw new "cannot handle node " + node.type; 
    }  
  }

jseval.haltKont =
  function (value, store, kont, c)
  {
    print("halt", value, "\n" + store.nice(), kont);
    return [];
  }

jseval.initialize =
  function (cc)
  {
    var c = {};
    c.a = cc.a;
    c.b = cc.b;
    c.e = cc.e;
    c.l = cc.l;
    c.p = cc.p;
    
    // install constants
    c.L_UNDEFINED = c.l.abst1(undefined);
    c.L_NULL = c.l.abst1(null);
    c.L_0 = c.l.abst1(0);
    c.L_1 = c.l.abst1(1);
//    c.L_TRUE = c.l.abst1(true);
    c.L_FALSE = c.l.abst1(false);
    c.L_MININFINITY = c.l.abst1(-Infinity);
    c.P_0 = c.p.abst1(0);
    c.P_1 = c.p.abst1(1);
    c.P_TRUE = c.p.abst1(true);
    c.P_FALSE = c.p.abst1(false);
//    c.P_BOOL = c.P_TRUE.join(c.P_FALSE);
    c.P_THIS = c.p.abst1("this");
    c.P_PROTOTYPE = c.p.abst1("prototype");
    c.P_CONSTRUCTOR = c.p.abst1("constructor");
    c.P_LENGTH = c.p.abst1("length");
    c.P_NULL = c.p.abst1(null);
    c.P_NUMBER = c.p.NUMBER;
    c.P_STRING = c.p.STRING;
    c.P_DEFINED = c.P_NULL.join(c.P_TRUE).join(c.P_FALSE).join(c.P_NUMBER).join(c.P_STRING);

    // install global pointers and refs
    var globala = new ContextAddr("this", 0);
    c.globala = globala;
    c.globalRef = c.l.abst1(globala); // global this
    var objectPa = new ContextAddr("Object.prototype", 0);
    c.objectProtoRef = c.l.abst1(objectPa);
    var functionPa = new ContextAddr("Function.prototype", 0);
    c.functionProtoRef = c.l.abst1(functionPa);
    var stringPa = new ContextAddr("String.prototype", 0);
    c.stringProtoRef = c.l.abst1(stringPa);
    var arrayPa = new ContextAddr("Array.prototype", 0);
    c.arrayProtoRef = c.l.abst1(arrayPa);
    
    c.createEnvironment = function (parenta)
    {
      var benv = c.b.createEnvironment(parenta);
      return benv;
    }

    c.createObject = function (Prototype)
    {
      assertDefinedNotNull(Prototype, "[[Prototype]]");
      var benv = c.b.createObject(Prototype);
      return benv;
    }

    c.createArray = function ()
    {
      var benv = c.b.createArray(c.arrayProtoRef);
      return benv;
    }

    c.createString = function (prim)
    {
      assertDefinedNotNull(prim, "prim");
      var benv = c.b.createString(prim, c.stringProtoRef);
      return benv;
    }

    c.createClosure = function (node, scope)
    {
      var benv = c.b.createFunction(new BenvClosureCall(node, scope), c.functionProtoRef);
      return benv;
    }

    c.createPrimitive = function (applyFunction)
    {
      var benv = c.b.createFunction(new BenvPrimitiveCall(applyFunction), c.functionProtoRef);
      return benv;
    }
    
    function registerProperty(object, propertyName, value)
    {
      object = object.add(c.p.abst1(propertyName), value);
      return object;      
    }
    
    // create global object and initial store
    var global = c.createObject(c.objectProtoRef);
    var store = new Store();

    function registerPrimitiveFunction(object, objectAddress, propertyName, fun)
    {
      var primFunObject = c.createPrimitive(fun);
      var primFunObjectAddress = new ContextAddr(objectAddress, "<" + propertyName + ">"); 
      store = store.allocAval(primFunObjectAddress, primFunObject);    
      return registerProperty(object, propertyName, c.l.abst1(primFunObjectAddress));
    }
    
    // BEGIN OBJECT
    var objectP = c.createObject(c.L_NULL);
    objectP.toString = function () { return "<Object.prototype>"; }; // debug
    var objecta = new ContextAddr("<Object>", 0);
    objectP = registerProperty(objectP, "constructor", c.l.abst1(objecta));
    
    var object = c.createPrimitive(objectConstructor);
    object = object.add(c.P_PROTOTYPE, c.objectProtoRef);//was c.objectProtoRef
    global = global.add(c.p.abst1("Object"), c.l.abst1(objecta));
    
    object = registerPrimitiveFunction(object, objecta, "getPrototypeOf", objectGetPrototypeOf);
    object = registerPrimitiveFunction(object, objecta, "create", objectCreate);

    store = store.allocAval(objecta, object);
    store = store.allocAval(objectPa, objectP);
    // END OBJECT

        
    // BEGIN FUNCTION
    var functionP = c.createObject(c.objectProtoRef);
    functionP.toString = function () { return "<Function.prototype>"; }; // debug
    var functiona = new ContextAddr("<Function>", 0);
    var functionP = registerProperty(functionP, "constructor", c.l.abst1(functiona));
    var fun = c.createPrimitive(function () {}); // TODO
    fun = fun.add(c.P_PROTOTYPE, c.functionProtoRef);
    global = global.add(c.p.abst1("Function"), c.l.abst1(functiona));
    store = store.allocAval(functiona, fun);

    store = store.allocAval(functionPa, functionP);
    // END FUNCTION 
            
    // BEGIN STRING
    var stringP = c.createObject(c.objectProtoRef);
    stringP.toString = function () { return "<String.prototype>"; }; // debug
    var stringa = new ContextAddr("<String>", 0);
    var stringP = registerProperty(stringP, "constructor", c.l.abst1(stringa));
    var string = c.createPrimitive(stringConstructor);
    string = string.add(c.P_PROTOTYPE, c.stringProtoRef);
    var stringNa = new ContextAddr("String", 0);
    global = global.add(c.p.abst1("String"), c.l.abst1(stringa));
    store = store.allocAval(stringa, string);

    store = store.allocAval(stringPa, stringP);
    // END STRING 
            
    // BEGIN ARRAY
    var arrayP = c.createObject(c.objectProtoRef);
    arrayP.toString = function () { return "<Array.prototype>"; }; // debug
    var arraya = new ContextAddr("<Array>", 0);
    var arrayP = registerProperty(arrayP, "constructor", c.l.abst1(arraya));
    var array = c.createPrimitive(arrayConstructor);
    array = array.add(c.P_PROTOTYPE, c.arrayProtoRef);
    var arrayNa = new ContextAddr("Array", 0);
    store = store.allocAval(arraya, array);
    global = global.add(c.p.abst1("Array"), c.l.abst1(arraya));
    
    arrayP = registerPrimitiveFunction(arrayP, arrayPa, "concat", arrayConcat);
    arrayP = registerPrimitiveFunction(arrayP, arrayPa, "push", arrayPush);
    arrayP = registerPrimitiveFunction(arrayP, arrayPa, "map", arrayMap);
    arrayP = registerPrimitiveFunction(arrayP, arrayPa, "reduce", arrayReduce); // TODO
    arrayP = registerPrimitiveFunction(arrayP, arrayPa, "filter", arrayFilter);
    store = store.allocAval(arrayPa, arrayP);
    // END ARRAY
    
    // BEGIN MATH
    var math = c.createObject(c.objectProtoRef);
    math = registerPrimitiveFunction(math, globala, "abs", mathAbs);
    math = registerPrimitiveFunction(math, globala, "round", mathRound);
    math = registerPrimitiveFunction(math, globala, "sin", mathCos);
    math = registerPrimitiveFunction(math, globala, "cos", mathSin);
    math = registerPrimitiveFunction(math, globala, "sqrt", mathSqrt);
    math = registerPrimitiveFunction(math, globala, "max", mathMax);
    math = registerPrimitiveFunction(math, globala, "random", mathRandom);
    math = registerProperty(math, "PI", c.l.abst1(Math.PI));
    var matha = new ContextAddr("<Math>", 0);
    store = store.allocAval(matha, math);
    global = global.add(c.p.abst1("Math"), c.l.abst1(matha));
    // END MATH
    
    // BEGIN GLOBAL
    global = global.add(c.P_THIS, c.globalRef); // global "this" address
    // ECMA 15.1.1 value properties of the global object (no "null", ...)
    global = registerProperty(global, "undefined", c.L_UNDEFINED);
    global = registerProperty(global, "NaN", c.l.abst1(NaN));
    global = registerProperty(global, "Infinity", c.l.abst1(Infinity));

    // specific interpreter functions
    global = registerPrimitiveFunction(global, globala, "$meta", $meta);
    global = registerPrimitiveFunction(global, globala, "$join", $join);
    global = registerPrimitiveFunction(global, globala, "print", _print);
    // end specific interpreter functions
    
    store = store.allocAval(globala, global);
    // END GLOBAL
    
    // BEGIN PRIMITIVES
    function objectConstructor(application, operands, objectAddress, stack, benva, store, time, c)
    {
      var cont = stack[0];
      var stack2 = stack.slice(1);
      var obj = c.createObject(c.objectProtoRef);
      store = c.e.allocAval(objectAddress, obj, stack, store, c);
      return kont[0].apply(stack2.addFirst(c.l.abst1(objectAddress)), store, time, c);
    }    
    
    function objectCreate(application, operands, objectAddress, stack, benva, store, time, c)
    {
      if (operands.length !== 1)
      {
        throw new Error("TODO");
      }
      var cont = stack[0];
      var stack2 = stack.slice(1);
      var obj = c.createObject(operands[0]);
      var address = c.a.object(application, time);
      store = c.e.allocAval(address, obj, stack, store, c);
      return kont[0].apply(stack2.addFirst(c.l.abst1(address)), store, time, c);
    }    
    
    function objectGetPrototypeOf(application, operands, objectAddress, stack, benva, store, time, c)
    {
      var cont = stack[0];
      var stack2 = stack.slice(1);
      var operand = operands[0];
      if (operand.prim === BOT)
      {
        var addresses = operand.addresses();
        var object = addresses.map(store.lookupAval, store).reduce(Lattice.join);
        return kont[0].apply(stack2.addFirst(object.Prototype), store, time, c);
      }
      throw new Error("TODO");
    }    

    function stringConstructor(application, operands, ths, stack, benva, store, time, c)
    {
      // TODO (also for other built-in constructors): throwing away freshly created object (that has different addr, so not that bad)!
      // (postpone creating fresh object?)
      if (isNewExpression(application))
      {
        var cont = stack[0];
        var stack2 = stack.slice(1);

        if (operands.length === 0)
        {
          var stringBenv = c.createString(c.p.abst1("")); // TODO constant 
          var stringAddress = c.a.string(application, time);
          stringBenv = stringBenv.add(c.P_LENGTH, c.L_0);
          store = c.e.allocAval(stringAddress, stringBenv, stack, store);
          return kont[0].apply(stack2.addFirst(c.l.abst1(stringAddress)), store, time, c);
        }
        
        var prim = operands[0].user.ToString(); // TODO ToString iso. project
        var stringBenv = c.createString(prim); 
        var stringAddress = c.a.array(application, time); // TODO this is not an array(!)
        stringBenv = stringBenv.add(c.P_LENGTH, new JipdaValue(prim.length(), []));
        store = c.e.allocAval(stringAddress, stringBenv, stack, store);
        return kont[0].apply(stack2.addFirst(c.l.abst1(stringAddress)), store, time, c);        
      }
      if (operands.length === 0)
      {
        var cont = stack[0];
        var stack2 = stack.slice(1);
        return kont[0].apply(stack2.addFirst(c.l.abst1("")), store, time, c); // TODO constant  
      }
      return c.e.ToString(application, stack.addFirst(operands[0]), benva, store, time, c);
    }    
        
    function arrayConstructor(application, operands, ths, stack, benva, store, time, c)
    {
      var cont = stack[0];
      var stack2 = stack.slice(1);
      var arrayBenv = c.createArray();
      var arrayAddress = c.a.array(application, time);
      var l;
      if (operands.length === 0)
      {
        l = c.L_0;
      }
      else
      {
        l = operands[0];
      }
      arrayBenv = arrayBenv.add(c.P_LENGTH, l);
      store = c.e.allocAval(arrayAddress, arrayBenv, stack, store);
      return kont[0].apply(stack2.addFirst(c.l.abst1(arrayAddress)), store, time, c);
    }    
    
    function arrayPush(application, operands, objectAddress, stack, benva, store, time, c)
    {
      var cont = stack[0];
      var stack2 = stack.slice(1);
     
      var arg0aa = operands[0];
                    
      var receiver = c.e.lookupAval(objectAddress, stack, store, c);
      var lreceiver = receiver.lookup(c.l.U_LENGTH);
      if (lreceiver === BOT)
      {
        // this branch is untested (need apply or call)
//        receiver = receiver.add(c.P_0.ToString(), newPropertyAddress);
//        store = c.e.allocAval(newPropertyAddress, arg0aa, stack, store, c);
//        var lengthPropertyAddress = c.a.objectPropery(objectAddress, c.l.U_LENGTH);
//        receiver = receiver.add(c.P_LENGTH, lengthPropertyAddress);
//        store = c.e.allocAval(lengthPropertyAddress, c.L_0, stack, store, c);
//        store = c.e.sideEffectAval(objectAddress, receiver, stack, store, c);
//        return kont[0].apply(stack2.addFirst(arg0aa), store, time, c);
        throw new Error("TODO");
      }
      else
      {
        var lreceiveru = lreceiver.user;
        receiver = receiver.add(lreceiveru.ToString(), arg0aa);
        var newLengthu = c.p.add(lreceiveru, c.l.U_1);
        var newLength = new JipdaValue(newLengthu, []);
        receiver = receiver.add(c.l.U_LENGTH, newLength);
        store = c.e.sideEffectAval(objectAddress, receiver, stack, store, c);
        return kont[0].apply(stack2.addFirst(newLength), store, time, c);                                                                                  
      }
    }
    
    function arrayConcat(application, operands, objectAddress, stack, benva, store, time, c)
    {
      var cont = stack[0];
      var stack2 = stack.slice(1);
     
      var arg0aa = operands[0];

      var receiver = c.e.lookupAval(objectAddress, stack, store, c);
      var lreceiveru = receiver.lookup(c.l.U_LENGTH).user;
      var arg0 = c.e.doLookupAddresses(arg0aa.addresses(), stack, store, c);
      var larg0 = arg0.lookup(c.l.U_LENGTH);
      var larg0u = larg0.user;
      var result = c.createArray();
      var resulta = c.a.array(application, time);
      return arrayCopy(receiver, c.l.U_0, result, c.l.U_0, lreceiveru, stack, store, c,
        function (result, index, store, c)
        {
          return arrayCopy(arg0, c.P_0, result, index, larg0u, stack, store, c, 
            function (result, index, store, c)
            {
              result = result.add(c.l.U_LENGTH, new JipdaValue(index, []));
              store = c.e.allocAval(resulta, result, stack, store, c);
              return kont[0].apply(stack2.addFirst(c.l.abst1(resulta)), store, time, c);                                                                                  
            });
        });
    } 
    
    function arrayMap(application, operands, thisa, stack, benva, store, time, c)
    {
      // TODO ToObject(thisa)
      // TODO best way to solve this?
      var receiver = c.e.lookupAval(thisa, stack, store, c);
      var lenValue = receiver.lookup(c.P_LENGTH);
      
      function arrayMapToUInt32Cont()
      {
        return new Cont("arrayMapToUInt32", application, null, benva,
          function (stack, store, time, c)
          {
            var lenPrim = stack[0].user;
            var stack2 = stack.slice(1);
            
            var arr = c.createArray();
            var arrAddr = c.a.array(application, time);
            store = store.allocAval(arrAddr, arr, stack, store, c);
            
            
            function arrayMapLoop(k, arr, stack, store, time, c)
            {
              while (c.p.isTrue(c.p.lt(k, lenPrim)))
              {
                var indexValue = receiver.lookup(k.ToString());
                if (indexValue !== BOT && !indexValue.equals(c.L_UNDEFINED)) // TODO project defined/undefined
                {
                  return c.e.applyProc(application, [c.l.abst1(thisa), new JipdaValue(k, []), indexValue, operands[0], operands[1] || c.GLOBALA, arrayMapCont(k, arr)].concat(stack), benva, store, time, c, 3); // TODO this addresses          
                }
                k = c.p.add(k, c.P_1);
              }

              arr = arr.add(c.P_LENGTH, new JipdaValue(lenPrim, []));
              store = c.e.sideEffectAval(arrAddr, arr, stack, store, c);
              //stack[0] jarr    (GC)
              //stack[1] f       (GC)
              //stack[2] this    (GC)
              var cont = stack[3];
              var stack2 = stack.slice(4);
              return kont[0].apply(stack2.addFirst(jarr), store, time, c);            
            }
            
            function arrayMapCont(k, arr)
            {
              return new Cont("arrayMap", application, k, benva,
                function (stack, store, time, c)
                {
                  var value = stack[0];
                  var stack2 = stack.slice(1);
                  arr = arr.add(k.ToString(), value);
                  // side-effect now for GC
                  store = c.e.sideEffectAval(arrAddr, arr, stack, store, c);
                  return arrayMapLoop(c.p.add(k, c.P_1), arr, stack2, store, time, c);
                });
            }
            
            var jarr = c.l.abst1(arrAddr);
            return arrayMapLoop(c.P_0, arr, stack2.addFirst(jarr), store, time, c);            
          });
      }
      
      // add thisAddr and fAddr to rootset 
      var stack2 = stack.addFirst(thisa).addFirst(operands[0]);
      return ToUInt32(lenValue, application, stack2.addFirst(arrayMapToUInt32Cont()), benva, store, time, c);
    }
    
    function arrayReduce(application, operands, thisa, stack, benva, store, time, c)
    {
      // TODO ToObject(thisa)
      // TODO best way to solve this?
      var receiver = c.e.lookupAval(thisa, stack, store, c);
      var lenValue = receiver.lookup(c.P_LENGTH);
      
      function arrayReduceToUInt32Cont()
      {
        return new Cont("arrayReduceToUInt32", application, null, benva,
          function (stack, store, time, c)
          {
            var lenPrim = stack[0].user;
            var k = c.P_0;
            if (operands[1])
            {
              return arrayReduceLoop(k, operands[1], stack, store, time, c);
            }
            else
            {
              if (c.p.isTrue(c.p.eqq(lenPrim, c.P_0)))
              {
                var stack2 = stack.slice(1);
                return performThrow(c.l.abst1("Type error"), application, stack2, benva, store, time, c);
              }
              while (c.p.isTrue(c.p.lt(k, lenPrim)))
              {
                var indexValue = receiver.lookup(k.ToString());
                if (indexValue !== BOT)
                {
                  return arrayReduceLoop(c.p.add(k, c.P_1), indexValue, stack, store, time, c);
                }
                k = c.p.add(k, c.P_1);
              }              
            }
            
            function arrayReduceLoop(k, result, stack, store, time, c)
            {
              while (c.p.isTrue(c.p.lt(k, lenPrim)))
              {
                var indexValue = receiver.lookup(k.ToString()); // TODO here, and similar methods, proto lookup?
                if (indexValue !== BOT)
                {
                  var stack2 = stack.slice(1);
                  return c.e.applyProc(application, [c.l.abst1(thisa), new JipdaValue(k, []), indexValue, result, operands[0], c.l.abst1(thisa), arrayReduceCont(k)].concat(stack2), benva, store, time, c, 4); // TODO this addresses          
                }
                k = c.p.add(k, c.P_1);
              }
              //stack[0] index value
              //stack[1] GC
              //stack[2] GC
              var cont = stack[3];
              var stack2 = stack.slice(4);
              return kont[0].apply(stack2.addFirst(result), store, time, c);            
            }
            
            function arrayReduceCont(k)
            {
              return new Cont("arrayReduce", application, k, benva,
                function (stack, store, time, c)
                {
                  var result = stack[0];
                  return arrayReduceLoop(c.p.add(k, c.P_1), result, stack, store, time, c);
                });
            }
          });
      }
      
      // add receiver, reducer to rootset
      var stack2 = stack.addFirst(thisa).addFirst(operands[0]);
      return ToUInt32(lenValue, application, stack2.addFirst(arrayReduceToUInt32Cont()), benva, store, time, c);
    }

    function arrayFilter(application, operands, thisa, stack, benva, store, time, c)
    {
      // TODO ToObject(thisa)
      // TODO best way to solve this?
      var receiver = c.e.lookupAval(thisa, stack, store, c);
      var lenValue = receiver.lookup(c.P_LENGTH);
      
      function arrayFilterToUInt32Cont() // TODO numAllocedProperties is concrete integer (used as index), k is abstract???
      { // but numAP is also used to slice stuff of stack... make two counters: concrete and abst?
        // Points against: every JS conc value should be abstractable
        return new Cont("arrayFilterToUInt32", application, null, benva,
          function (stack, store, time, c)
          {
            var lenPrim = stack[0].user;
            var stack2 = stack.slice(1);
            
            var arr = c.createArray();
            var arrAddr = c.a.array(application, time);
            var jarr = c.l.abst1(arrAddr);
            store = c.e.allocAval(arrAddr, arr, stack, store, c);
            
            function arrayFilterLoop(k, numAllocedProperties, arr, stack, store, time, c)
            {
              while (c.p.isTrue(c.p.lt(k, lenPrim)))
              {
                var indexValue = receiver.lookup(k.ToString());
                if (indexValue !== BOT && !indexValue.equals(c.L_UNDEFINED)) // TODO project defined/undefined
                {
                  return c.e.applyProc(application, [indexValue, new JipdaValue(k, []), indexValue, operands[0], operands[1] || c.GLOBALA, arrayFilterCont(k, indexValue, numAllocedProperties, arr)].concat(stack), benva, store, time, c, 3); // TODO this addresses          
                }
                k = c.p.add(k, c.l.U_1);
              }
              
              arr = arr.add(c.P_LENGTH, c.l.abst1(numAllocedProperties));
              store = c.e.sideEffectAval(arrAddr, arr, stack, store, c);
              //stack[0] jarr    (GC)
              //stack[1] f       (GC)
              //stack[2] this    (GC)
              var cont = stack[3];
              var stack2 = stack.slice(4);
              return kont[0].apply(stack2.addFirst(jarr), store, time, c);            
            }
            
            function arrayFilterCont(k, indexValue, numAllocedProperties, arr)
            {
              return new Cont("arrayFilter", application, k, benva,
                function (stack, store, time, c)
                {
                  var value = toUserBoolean(stack[0]);
                  var stack2 = stack.slice(1);
                  if (c.p.isTrue(value))
                  {
                    var propName = c.p.abst1(String(numAllocedProperties));
                    arr = arr.add(propName, indexValue);
                    // side-effect now for GC
                    store = c.e.sideEffectAval(arrAddr, arr, stack, store, c);
                    return arrayFilterLoop(c.p.add(k, c.P_1), numAllocedProperties + 1, arr, stack2, store, time, c);                    
                  }
                  if (c.p.isFalse(value))
                  {
                    return arrayFilterLoop(c.p.add(k, c.P_1), numAllocedProperties, arr, stack2, store, time, c);
                  }
                  return [new Task("Array.prototype.filter true",
                            function ()
                            { // copied
                              var propName = c.p.abst1(String(numAllocedProperties));
                              arr = arr.add(propName, indexValue);
                              // side-effect now for GC
                              store = c.e.sideEffectAval(arrAddr, arr, stack, store, c);
                              return arrayFilterLoop(c.p.add(k, c.P_1), numAllocedProperties + 1, arr, stack2, store, time, c);                    
                            }),
                          new Task("Array.prototype.filter false",
                            function ()
                            { // copied
                              return arrayFilterLoop(c.p.add(k, c.P_1), numAllocedProperties, arr, stack2, store, time, c);
                            })];
                });
            }
            return arrayFilterLoop(c.l.U_0, 0, arr, stack2.addFirst(jarr), store, time, c);            
          });
      }
      
      // add receiver, filter function to rootset
      var stack2 = stack.addFirst(thisa).addFirst(operands[0]);
      return ToUInt32(lenValue, application, stack2.addFirst(arrayFilterToUInt32Cont()), benva, store, time, c);
    }    
    
    function mathSqrt(application, operands, objectAddress, stack, benva, store, time, c)
    {
      var cont = stack[0];
      var stack2 = stack.slice(1);
      var u = toUserNumber(operands[0], store);
      var r = c.p.sqrt(u);
      var j = new JipdaValue(r, []);
      return kont[0].apply(stack2.addFirst(j), store, time, c);
    }
    
    function mathAbs(application, operands, objectAddress, stack, benva, store, time, c)
    {
      var cont = stack[0];
      var stack2 = stack.slice(1);
      var u = toUserNumber(operands[0], store);
      var r = c.p.abs(u);
      var j = new JipdaValue(r, []);
      return kont[0].apply(stack2.addFirst(j), store, time, c);
    }
    
    function mathRound(application, operands, objectAddress, stack, benva, store, time, c)
    {
      var cont = stack[0];
      var stack2 = stack.slice(1);
      var u = toUserNumber(operands[0], store);
      var r = c.p.round(u);
      var j = new JipdaValue(r, []);
      return kont[0].apply(stack2.addFirst(j), store, time, c);
    }
    
    function mathSin(application, operands, objectAddress, stack, benva, store, time, c)
    {
      var cont = stack[0];
      var stack2 = stack.slice(1);
      var u = toUserNumber(operands[0], store);
      var r = c.p.sin(u);
      var j = new JipdaValue(r, []);
      return kont[0].apply(stack2.addFirst(j), store, time, c);
    }
    
    function mathCos(application, operands, objectAddress, stack, benva, store, time, c)
    {
      var cont = stack[0];
      var stack2 = stack.slice(1);
      var u = toUserNumber(operands[0], store);
      var r = c.p.cos(u);
      var j = new JipdaValue(r, []);
      return kont[0].apply(stack2.addFirst(j), store, time, c);
    }
    
    function mathMax(application, operands, objectAddress, stack, benva, store, time, c)
    {
      var cont = stack[0];
      var stack2 = stack.slice(1);
      if (operands.length === 2)
      {
        var u1 = toUserNumber(operands[0], store);
        var u2 = toUserNumber(operands[1], store);
        var r = c.p.max(u1, u2);
        var j = new JipdaValue(r, []);
        return kont[0].apply(stack2.addFirst(j), store, time, c);        
      }
      throw new Error("NYI");
    }
    
    // deterministic random from Octane benchmarks 
    var seed = 49734321;
    function mathRandom(application, operands, objectAddress, stack, benva, store, time, c)
    {
      var cont = stack[0];
      var stack2 = stack.slice(1);
      // Robert Jenkins' 32 bit integer hash function.
      seed = ((seed + 0x7ed55d16) + (seed << 12))  & 0xffffffff;
      seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
      seed = ((seed + 0x165667b1) + (seed << 5))   & 0xffffffff;
      seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
      seed = ((seed + 0xfd7046c5) + (seed << 3))   & 0xffffffff;
      seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
      var r = c.p.abst1((seed & 0xfffffff) / 0x10000000);
      var j = new JipdaValue(r, []);
      return kont[0].apply(stack2.addFirst(j), store, time, c);
    }
    
    function $meta(application, operands, objectAddress, stack, benva, store, time, c)
    {
      var cont = stack[0];
      var stack2 = stack.slice(1);
      var str = operands[0].conc()[0];
      var value = c.l.abst1(eval(str));
      return kont[0].apply(stack2.addFirst(value), store, time, c);
    }
    
    function $join(application, operands, thisa, stack, benva, store, time, c)
    {
      var cont = stack[0];
      var stack2 = stack.slice(1);
      var value = operands.reduce(Lattice.join, BOT);
      return kont[0].apply(stack2.addFirst(value), store, time, c);
    }    
    
    function $toString(application, operands, thisa, stack, benva, store, time, c)
    {
      var cont = stack[0];
      var stack2 = stack.slice(1);
      var value = operands.reduce(Lattice.join, BOT);
      return kont[0].apply(stack2.addFirst(value), store, time, c);
    }    
    
    function _print(application, operands, objectAddress, stack, benva, store, time, c)
    {
      var cont = stack[0];
      var stack2 = stack.slice(1);
      print.apply(null, operands);
      return kont[0].apply(stack2.addFirst(c.L_UNDEFINED), store, time, c);
    }    
    // END PRIMITIVES
    
    // BEGIN HELPERS
    function arrayCopy(srcBenv, srcPos, dstBenv, dstPos, l, stack, store, c, fcont)
    {
      var i = c.l.U_0;
      while (c.p.isTrue(c.p.lt(i, l)))
      {
        var srcvalue = srcBenv.lookup(c.p.add(i, srcPos).ToString());
        var dstName = c.p.add(i, dstPos).ToString();
        dstBenv = dstBenv.add(dstName, srcvalue);
        i = c.p.add(i, c.l.U_1);
      }
      return fcont(dstBenv, c.p.add(i, dstPos), store, c);
    }
    // END HELPERS
    
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
    
    function BenvClosureCall(node, scope)
    {
      this.node = node;
      this.scope = scope;
    }

    BenvClosureCall.prototype.toString =
      function ()
      {
        return "<BenvClosureCall " + this.node.tag + ">"
      }

    BenvClosureCall.prototype.equals =
      function (other)
      {
        if (this === other)
        {
          return true;
        }
        if (!(this instanceof BenvClosureCall))
        {
          return false;
        }
        return this.node === other.node
          && this.scope.equals(other.scope);
      }

    BenvClosureCall.prototype.applyFunction =
      function (application, operandValues, thisa, benva, store, returnKont, kont, c)
      {
//        print("BenvClosureCall.applyFunction", application, "operandValues", operandValues, "ths", ths);
        var fun = this.node;
        var statica = this.scope;
//        print("marking", returnKont);
        var markedKont = returnKont.mark(application);
        return [new ApplyState(application, fun, statica, operandValues, thisa, benva, store, kont.addFirst(markedKont))];
      }

    BenvClosureCall.prototype.addresses =
      function ()
      {
        return [this.scope];
      }

    
    c.store = store;
    return c;
  }
