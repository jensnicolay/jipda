import {HashCode, Strings, Sets, MutableHashSet, ArraySet, assert, assertDefinedNotNull, assertFalse} from './common.mjs';
import * as Ast from './ast.mjs';
import {BOT} from './lattice.mjs';
import Benv from './benv.mjs';
import Store from './store.mjs';
import {Arrays, HashMap, Maps} from "./common.mjs";
import {blockScopeDeclarations, StringResource} from "./ast.mjs";
import { isVariableDeclaration } from './ast.mjs';

export default createSemantics;

const EMPTY_LKONT = [];
const EMPTY_ADDRESS_SET = ArraySet.empty();
//const queues = new Map([["ScriptJobs", "!ScriptJobs"]]);

let glcount = 0; // hack to distinguish different initial contexts (should really depend on program,
// and then kont -> resource becomes almost immediate (pruneGraph)


// reminder: has `Set` semantics, i.e., based on `===`
function SetValueNoAddresses(set)
{
  this.set = set || new Set();
}

function SetValue(set)
{
  this.set = set || ArraySet.empty();
}

SetValue.from1 =
    function (x)
    {
      assert(x.addresses);
      return new SetValue(ArraySet.from1(x));
    }

SetValue.prototype.add =
    function (x)
    {
      assert(x.addresses);
      return new SetValue(this.set.add(x));
    }

SetValue.prototype.hashCode =
    function ()
    {
      return this.set.hashCode();
    }

SetValue.prototype.equals =
    function (x)
    {
      if (this === x)
      {
        return true;
      }
      return this.set.equals(x.set);
    }

SetValue.prototype.join =
    function (x)
    {
      if (x === BOT)
      {
        return this;
      }
      return new SetValue(this.set.join(x.set));
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
    function* ()
    {
      yield* this.set;
    }

function createSemantics(lat, cc)
{
  const errors = cc.errors === undefined ? false : cc.errors;

  const fastPath = true;

  const L_UNDEFINED = lat.abst1(undefined);
  const L_NULL = lat.abst1(null);
  const L_0 = lat.abst1(+0);
  const L_MIN0 = lat.abst1(-0);
  const L_1 = lat.abst1(1);
  const L_NAN = lat.abst1(NaN);
  const L_TRUE = lat.abst1(true);
  const L_FALSE = lat.abst1(false);
  const L_MININFINITY = lat.abst1(-Infinity);
  const L_EMPTY_STRING = lat.abst1("");
  const P_PROTOTYPE = lat.abst1("prototype");
  const P_CONSTRUCTOR = lat.abst1("constructor");
  const P_LENGTH = lat.abst1("length");
  const P_MESSAGE = lat.abst1("message");


  function gc_(store, rootSet)
  {
    store = Agc.collect(store, rootSet);
    return store;
  }

  function throwTypeError(msg, lkont, kont, machine) // TODO this is not a type error!! // TODO temporary!
  {
    console.debug("throwTypeError: " + msg);
    assert(typeof msg === "string");
    const obj = createError(lat.abst1(msg), kont.realm);
    const addr = machine.alloc.error("@" + msg, kont);
    machine.storeAlloc(addr, obj);
    const ref = lat.abstRef(addr);
    machine.throw(ref, lkont, kont);
  }

  function evaluate_(node, benv, lkont, kont, machine)
  {
    switch (node.type)
    {
      case "Literal":
        return evalLiteral(node, benv, lkont, kont, machine);
      case "Identifier":
        return evalIdentifier(node, benv, lkont, kont, machine);
      case "BinaryExpression":
        return evalBinaryExpression(node, benv, lkont, kont, machine);
      case "LogicalExpression":
        return evalLogicalExpression(node, benv, lkont, kont, machine);
      case "CallExpression":
        return evalCallExpression(node, benv, lkont, kont, machine);
      case "FunctionExpression":
        return evalFunctionExpression(node, benv, lkont, kont, machine);
      case "AssignmentExpression":
        return evalAssignmentExpression(node, benv, lkont, kont, machine);
      case "ArrayExpression":
        return evalArrayExpression(node, benv, lkont, kont, machine);
      case "MemberExpression":
        return evalMemberExpression(node, benv, lkont, kont, machine);
      case "ObjectExpression":
        return evalObjectExpression(node, benv, lkont, kont, machine);
      case "ThisExpression":
        return evalThisExpression(node, benv, lkont, kont, machine);
      case "NewExpression":
        return evalCallExpression(node, benv, lkont, kont, machine);
      case "UpdateExpression":
        return evalUpdateExpression(node, benv, lkont, kont, machine);
      case "UnaryExpression":
        return evalUnaryExpression(node, benv, lkont, kont, machine);
      case "ExpressionStatement":
        return evaluate_(node.expression, benv, lkont, kont, machine);
      case "ReturnStatement":
        return evalReturnStatement(node, benv, lkont, kont, machine);
      case "BreakStatement":
        return evalBreakStatement(node, benv, lkont, kont, machine);
      case "LabeledStatement":
        return evalLabeledStatement(node, benv, lkont, kont, machine);
      case "IfStatement":
        return evalIfStatement(node, benv, lkont, kont, machine);
      case "ConditionalExpression":
        return evalConditionalExpression(node, benv, lkont, kont, machine);
      case "SwitchStatement":
        return evalSwitchStatement(node, benv, lkont, kont, machine);
      case "ForStatement":
        return evalForStatement(node, benv, lkont, kont, machine);
      case "ForInStatement":
        return evalForInStatement(node, benv, lkont, kont, machine);
      case "ForOfStatement":
        return evalForOfStatement(node, benv, lkont, kont, machine);
      case "WhileStatement":
        return evalWhileStatement(node, benv, lkont, kont, machine);
      case "DoWhileStatement":
        return evalDoWhileStatement(node, benv, lkont, kont, machine);
      case "FunctionDeclaration":
        return evalFunctionDeclaration(node, benv, lkont, kont, machine);
      case "VariableDeclaration":
        return evalVariableDeclaration(node, benv, lkont, kont, machine);
      case "VariableDeclarator":
        return evalVariableDeclarator(node, benv, lkont, kont, machine);
      case "BlockStatement":
        return evalBlockStatement(node, benv, lkont, kont, machine);
      case "EmptyStatement":
        return evalEmptyStatement(node, benv, lkont, kont, machine);
      case "TryStatement":
        return evalTryStatement(node, benv, lkont, kont, machine);
      case "ThrowStatement":
        return evalThrowStatement(node, benv, lkont, kont, machine);
      case "Program":
        return evalProgram(node, benv, lkont, kont, machine);
      default:
        throw new Error("cannot handle node " + node.type);
    }
  }

  function evalEmptyStatement(node, benv, lkont, kont, machine)
  {
    machine.continue(L_UNDEFINED, lkont, kont);
  }

  function evalLiteral(node, benv, lkont, kont, machine)
  {
    var value = lat.abst1(node.value);
    machine.continue(value, lkont, kont);
  }

  function evalIdentifier(node, benv, lkont, kont, machine)
  {
    var value = doScopeLookup(node, benv, kont, machine);
    machine.continue(value, lkont, kont);
  }

  function evalThisExpression(node, benv, lkont, kont, machine)
  {
    const value = kont.thisValue;
    machine.continue(value, lkont, kont);
  }

  function evalProgram(node, benv, lkont, kont, machine)
  {
    var funScopeDecls = functionScopeDeclarations(node);
    var names = Object.keys(funScopeDecls);
    names.forEach(
        function (name)
        {
          const node = funScopeDecls[name];
          const aname = lat.abst1(name);
          if (Ast.isFunctionDeclaration(node))
          {
            const closureRef = allocateClosure(node, benv, lkont, kont, machine);
            doProtoSet(aname, closureRef, kont.realm.GlobalObject, machine);
          } else if (Ast.isVariableDeclarator(node))
          {
            doProtoSet(aname, L_UNDEFINED, kont.realm.GlobalObject, machine);
          } else
          {
            throw new Error("cannot handle declaration " + node);
          }
        });

    const blockScopeDecls = blockScopeDeclarations(node);
    for (const [name, decl] of blockScopeDecls)
    {
      const addr = machine.alloc.vr(decl.id, kont);
      benv = benv.add(name, addr);
      machine.storeAlloc(addr, BOT);
    }

    return evalStatementList(node, benv, lkont, kont, machine);
  }

  function evalBlockStatement(node, benv, lkont, kont, machine)
  {
    // currently only called to eval nested BlockStatement but never for evalling body of fun/prog
    let extendedBenv = benv.extend();
    const blockScopeDecls = blockScopeDeclarations(node);
    for (const [name, decl] of blockScopeDecls)
    {
      const addr = machine.alloc.vr(decl.id, kont);
      extendedBenv = extendedBenv.add(name, addr);
      machine.storeAlloc(addr, BOT);
    }
    return evalStatementList(node, extendedBenv, lkont, kont, machine);
  }

  function evalStatementList(node, benv, lkont, kont, machine)
  {
    var nodes = node.body;
    if (nodes.length === 0)
    {
      machine.continue(L_UNDEFINED, lkont, kont);
      return;
    }
    if (nodes.length === 1)
    {
      machine.evaluate(nodes[0], benv, lkont, kont);
      return;
    }
    var frame = new BodyKont(node, 1, benv);
    machine.evaluate(nodes[0], benv, [frame].concat(lkont), kont);
  }

///
  function evalVariableDeclaration(node, benv, lkont, kont, machine)
  {
    var declarations = node.declarations;
    if (declarations.length === 0)
    {
      throw new Error("no declarations in " + node);
    }
    const kind = node.kind;
    switch (kind)
    {
      case 'var':
      {
        const frame = new VarDeclarationKont(node, 1, benv);
        machine.evaluate(declarations[0], benv, [frame].concat(lkont), kont, machine);
        return;
      }
      case 'let':
      {
        const frame = new LetDeclarationKont(node, 1, benv);
        machine.evaluate(declarations[0], benv, [frame].concat(lkont), kont, machine);
        return;
      }
      default:
        throw new Error("unsupported variable kind: " + kind);
    }
  }

  function evalVariableDeclarator(node, benv, lkont, kont, machine)
  {
    var init = node.init;
    if (init === null)
    {
      machine.continue(L_UNDEFINED, lkont, kont);
      return;
    }
    machine.evaluate(init, benv, lkont, kont);
    return;
  }

  function VarDeclarationKont(node, i, benv)
  {
    this.node = node;
    this.i = i;
    this.benv = benv;
  }

  VarDeclarationKont.prototype.equals =
      function (x)
      {
        return x instanceof VarDeclarationKont
            && this.node === x.node
            && this.i === x.i
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  VarDeclarationKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.i;
        result = prime * result + this.benv.hashCode();
        return result;
      }
  VarDeclarationKont.prototype.toString =
      function ()
      {
        return "vdec " + this.node.tag + " " + this.i;
      }
  VarDeclarationKont.prototype.nice =
      function ()
      {
        return "vdec " + this.node.tag + " " + this.i;
      }
  VarDeclarationKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  VarDeclarationKont.prototype.apply =
      function (value, lkont, kont, machine)
      {
        const node = this.node;
        const declarations = node.declarations;
        const i = this.i;
        const declaration = declarations[i - 1];
        const id = declaration.id;
        const benv = this.benv;
        doScopeSet(id, value, benv, kont, machine);
        if (i === declarations.length)
        {
          machine.continue(L_UNDEFINED, lkont, kont, machine);
          return;
        }
        const frame = new VarDeclarationKont(node, i + 1, benv);
        machine.evaluate(declarations[i], benv, [frame].concat(lkont), kont, machine);
      }


  function LetDeclarationKont(node, i, benv)
  {
    this.node = node;
    this.i = i;
    this.benv = benv;
  }

  LetDeclarationKont.prototype.equals =
      function (x)
      {
        return x instanceof LetDeclarationKont
            && this.node === x.node
            && this.i === x.i
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  LetDeclarationKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.i;
        result = prime * result + this.benv.hashCode();
        return result;
      }
  LetDeclarationKont.prototype.toString =
      function ()
      {
        return "ldec " + this.node.tag + " " + this.i;
      }
  LetDeclarationKont.prototype.nice =
      function ()
      {
        return "ldec " + this.node.tag + " " + this.i;
      }
  LetDeclarationKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  LetDeclarationKont.prototype.apply =
      function (value, lkont, kont, machine)
      {
        const node = this.node;
        const declarations = node.declarations;
        const i = this.i;
        const declaration = declarations[i - 1];
        const id = declaration.id;
        const benv = this.benv;
        InitializeReferencedBinding(id, value, benv, kont, machine);
        if (i === declarations.length)
        {
          machine.continue(L_UNDEFINED, lkont, kont, machine);
          return;
        }
        const frame = new LetDeclarationKont(node, i + 1, benv);
        machine.evaluate(declarations[i], benv, [frame].concat(lkont), kont, machine);
      }

  function evalUnaryExpression(node, benv, lkont, kont, machine)
  {
    var frame = new UnaryKont(node);
    machine.evaluate(node.argument, benv, [frame].concat(lkont), kont);
  }

  function evalBinaryExpression(node, benv, lkont, kont, machine)
  {
    var frame = new LeftKont(node, benv);
    machine.evaluate(node.left, benv, [frame].concat(lkont), kont);
  }

  function evalLogicalExpression(node, benv, lkont, kont, machine)
  {
    var frame = new LogicalLeftKont(node, benv);
    machine.evaluate(node.left, benv, [frame].concat(lkont), kont);
  }

  function evalAssignmentExpression(node, benv, lkont, kont, machine)
  {
    var left = node.left;
    switch (left.type)
    {
      case "Identifier":
      {
        var right = node.right;
        var frame = new AssignIdentifierKont(node, benv);
        machine.evaluate(right, benv, [frame].concat(lkont), kont);
        return;
      }
      case "MemberExpression":
      {
        var object = left.object;
        var frame = new AssignMemberKont(node, benv);
        machine.evaluate(object, benv, [frame].concat(lkont), kont);
        return;
      }
      default:
      {
        throw new Error("cannot handle left hand side " + left);
      }
    }
  }

  function evalUpdateExpression(node, benv, lkont, kont, machine)
  {
    var argument = node.argument;
    switch (argument.type)
    {
      case "Identifier":
      {
        var value = doScopeLookup(argument, benv, kont, machine);
        var updatedValue;
        switch (node.operator)
        {
          case "++":
          {
            updatedValue = lat.add(value, L_1);
            break;
          }
          case "--":
          {
            updatedValue = lat.sub(value, L_1);
            break;
          }
          default:
            throw new Error("cannot handle update operator " + node.operator);
        }
        if (updatedValue === BOT)
        {
          return [];
        }
        doScopeSet(argument, updatedValue, benv, kont, machine);
        var resultingValue = node.prefix ? updatedValue : value;
        machine.continue(resultingValue, lkont, kont);
        return;
      }
      case "MemberExpression":
      {
        var object = argument.object;
        var frame = new UpdateMemberKont(node, benv);
        machine.evaluate(object, benv, [frame].concat(lkont), kont);
        return;
      }
      default:
      {
        throw new Error("cannot handle argument " + argument);
      }
    }
  }


  function allocateClosure(node, benv, lkont, kont, machine)
  {
    var closure = createClosure(node, benv, kont.realm);
    var closurea = machine.alloc.closure(node, kont);

    var prototype = ObjectCreate(kont.realm.Intrinsics.get("%ObjectPrototype%"));
    var prototypea = machine.alloc.closureProtoObject(node, kont);
    var closureRef = lat.abstRef(closurea);
    prototype = prototype.addProperty(P_CONSTRUCTOR, Property.fromData(closureRef, L_TRUE, L_TRUE, L_TRUE));
    machine.storeAlloc(prototypea, prototype);

    closure = closure.addProperty(P_PROTOTYPE, Property.fromData(lat.abstRef(prototypea), L_TRUE, L_TRUE, L_TRUE));
    machine.storeAlloc(closurea, closure);
    return closureRef;
  }

  function evalFunctionExpression(node, benv, lkont, kont, machine)
  {
    var closureRef = allocateClosure(node, benv, lkont, kont, machine);
    machine.continue(closureRef, lkont, kont);
  }

  function evalFunctionDeclaration(node, benv, lkont, kont, machine)
  {
    machine.continue(L_UNDEFINED, lkont, kont);
  }

  function evalCallExpression(node, benv, lkont, kont, machine)
  {
    var calleeNode = node.callee;

    if (Ast.isMemberExpression(calleeNode))
    {
      var object = calleeNode.object;
      var frame = new CallMemberKont(node, benv);
      machine.evaluate(object, benv, [frame].concat(lkont), kont);
      return;
    }

    var frame = new OperatorKont(node, benv);
    machine.evaluate(calleeNode, benv, [frame].concat(lkont), kont);
  }


  function applyProc(application, operatorValue, operandValues, thisValue, benv, lkont, kont, machine)
  {
    var operatorAs = operatorValue.addresses();
    if (errors)
    {
      if (operatorAs.count() === 0)
      {
        throwTypeError(application.callee + " is not a function (" + operatorValue + ")", lkont, kont, machine);
      }
    }

    for (const operatora of operatorAs.values())
    {
      const operatorObj = machine.storeLookup(operatora);
      const Call = operatorObj.getInternal("[[Call]]");
      for (const callable of Call)
      {
        //if (!callable.applyFunction) {print(application, callable, Object.keys(callable))};
        callable.applyFunction(application, operandValues, thisValue, benv, lkont, kont, machine);
      }
    }
  }

  function $call(operatorValue, thisValue, operandValues, benv, lkont, kont, machine)
  {
    const syntheticApplication = {type: "CallExpression"};
    Ast.tagNode(syntheticApplication);
    applyProc(syntheticApplication, operatorValue, operandValues, thisValue, benv, lkont, kont, machine);
  }


  // function checkStates(ss)
  // {
  //   for (const s of ss)
  //   {
  //     if (typeof s.next !== 'function')
  //     {
  //       return false;
  //     }
  //   }
  //   return true;
  // }

  // cloned from 'applyProc', invokes 'applyConstructor' iso. 'applyFunction' on callables
  function applyCons(application, operatorValue, operandValues, benv, lkont, kont, machine)
  {
    const operatorAs = operatorValue.addresses();
    for (const operatora of operatorAs.values())
    {
      const obj = machine.storeLookup(operatora);
      const protoRef = obj.getProperty(P_PROTOTYPE).getValue();
      const Call = obj.getInternal("[[Call]]");
      for (const callable of Call)
      {
        callable.applyConstructor(application, operandValues, protoRef, benv, lkont, kont, machine);
      }
    }
  }

  function $construct(operatorValue, operandValues, benv, lkont, kont, machine)
  {
    const syntheticApplication = {type: "NewExpression"};
    Ast.tagNode(syntheticApplication);
    applyCons(syntheticApplication, operatorValue, operandValues, benv, lkont, kont, machine);
  }

  function evalReturnStatement(node, benv, lkont, kont, machine)
  {
    var argumentNode = node.argument;
    if (argumentNode === null)
    {
      machine.return(L_UNDEFINED, lkont, kont);
      return;
    }

    var frame = new ReturnKont(node);
    machine.evaluate(argumentNode, benv, [frame].concat(lkont), kont);
  }

  function evalBreakStatement(node, benv, lkont, kont, machine)
  {
    machine.break(lkont, kont);
  }

  function evalTryStatement(node, benv, lkont, kont, machine)
  {
    var block = node.block;
    var frame = new TryKont(node, benv);
    machine.evaluate(block, benv, [frame].concat(lkont), kont);
  }

  function evalThrowStatement(node, benv, lkont, kont, machine)
  {
    var argumentNode = node.argument;
    var frame = new ThrowKont(node);
    machine.evaluate(argumentNode, benv, [frame].concat(lkont), kont);
  }

  function evalIfStatement(node, benv, lkont, kont, machine)
  {
    var testNode = node.test;
    var frame = new IfKont(node, benv);
    machine.evaluate(testNode, benv, [frame].concat(lkont), kont);
  }

  function evalConditionalExpression(node, benv, lkont, kont, machine)
  {
    var testNode = node.test;
    var frame = new IfKont(node, benv);
    machine.evaluate(testNode, benv, [frame].concat(lkont), kont);
  }

  function evalForStatement(node, benv, lkont, kont, machine)
  {
    var init = node.init;
    if (init)
    {
      let forEnv;
      if (isVariableDeclaration(init) && init.kind === "let")
      {
        forEnv = benv.extend();
        for (const decl of init.declarations)
        {
          const addr = machine.alloc.vr(decl.id, kont);
          forEnv = forEnv.add(decl.id.name, addr);
          machine.storeAlloc(addr, BOT);    
        }
      }
      else
      {
        forEnv = benv;
      }
      var frame = new ForInitKont(node, forEnv);
      machine.evaluate(init, forEnv, [frame].concat(lkont), kont);
      return;
    }
    var test = node.test;
    var frame = new ForTestKont(node, L_UNDEFINED, benv);
    machine.evaluate(test, benv, [frame].concat(lkont), kont);
    return;
  }

  function evalForInStatement(node, benv, lkont, kont, machine)
  {
    var right = node.right;
    var frame = new ForInRightKont(node, benv);
    machine.evaluate(right, benv, [frame].concat(lkont), kont);
    return;
  }

  function evalWhileStatement(node, benv, lkont, kont, machine)
  {
    var test = node.test;
    var frame = new WhileTestKont(node, benv);
    machine.evaluate(test, benv, [frame].concat(lkont), kont);
    return;
  }

  function evalDoWhileStatement(node, benv, lkont, kont, machine)
  {
    var body = node.body;
    var frame = new WhileBodyKont(node, benv);
    machine.evaluate(body, benv, [frame].concat(lkont), kont);
    return;
  }

  function evalObjectExpression(node, benv, lkont, kont, machine)
  {
    var properties = node.properties;
    if (properties.length === 0)
    {
      var obj = ObjectCreate(kont.realm.Intrinsics.get("%ObjectPrototype%"));
      var objectAddress = machine.alloc.object(node, kont);
      machine.storeAlloc(objectAddress, obj);
      var objectRef = lat.abstRef(objectAddress);
      machine.continue(objectRef, lkont, kont);
      return;
    }
    var frame = new ObjectKont(node, 1, benv, []);
    machine.evaluate(properties[0].value, benv, [frame].concat(lkont), kont);
  }

  function evalArrayExpression(node, benv, lkont, kont, machine)
  {
    var elements = node.elements;
    if (elements.length === 0)
    {
      var arr = createArray(kont.realm);
      arr = arr.addProperty(P_LENGTH, Property.fromData(L_0, L_TRUE, L_TRUE, L_TRUE));
      var arrAddress = machine.alloc.array(node, kont);
      machine.storeAlloc(arrAddress, arr);
      var arrRef = lat.abstRef(arrAddress);
      machine.continue(arrRef, lkont, kont);
      return;
    }
    var frame = new ArrayKont(node, 1, benv, []);
    machine.evaluate(elements[0], benv, [frame].concat(lkont), kont);
  }

  function evalMemberExpression(node, benv, lkont, kont, machine)
  {
    var object = node.object;
    var frame = new MemberKont(node, benv);
    machine.evaluate(object, benv, [frame].concat(lkont), kont);
  }

  function createError(message, realm)
  {
    //const O = OrdinaryCreateFromConstructor();
    let obj = Obj.empty();
    obj = obj.setInternal("[[Prototype]]", realm.Intrinsics.get("%ErrorPrototype%"));
    obj = obj.setInternal("[[ErrorData]]", L_UNDEFINED);
    obj = obj.setInternal("[[Get]]", SetValueNoAddresses.from1(OrdinaryGet));
    obj = obj.addProperty(P_MESSAGE, Property.fromData(message, L_TRUE, L_TRUE, L_TRUE));
    return obj;
  }


  function continue_(value, lkont, kont, machine)
  {
    if (value === BOT)
    {
      return [];
    }

    if (lkont.length === 0)
    {
      if (kont._stacks.size === 0)
      {
        return machine.nextJob(lkont, kont);
      }

      if (kont.ex && Ast.isNewExpression(kont.ex))
      {
        value = kont.thisValue;
      } else
      {
        value = L_UNDEFINED;
      }

      for (const stack of kont._stacks)
      {
        machine.continue(value, stack.lkont, stack.kont);
      }

      return;
    }

    return lkont[0].apply(value, lkont.slice(1), kont, machine);
  }


  function return_(value, lkont, kont, machine)
  {
    if (kont._stacks.size === 0)
    {
      throw new Error("return outside function");
    }

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

    for (const stack of kont._stacks)
    {
      machine.continue(value, stack.lkont, stack.kont);
    }
  }

  function throw_(value, lkont, kont, machine)
  {
    function stackPop(lkont, kont)
    {
      var todo = [new Stack(lkont, kont)];
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
            result.push(new Stack(lkont.slice(i), kont));
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
              todo.push(new Stack(st.lkont, st.kont));
            });
        G = G.add(kont);
      }
      return result;
    }

    if (value === BOT)
    {
      return [];
    }

    var stacks = stackPop(lkont, kont);
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
            console.log("!!", frame);
          }
          result = result.concat(frame.applyThrow(value, lkont2, kont, machine));
        });
    return result;
  }

  function break_(lkont, kont, machine)
  {
    // if (value === BOT)s
    // {
    //   return [];
    // }

    for (let i = 0; i < lkont.length; i++)
    {
      if (lkont[i].applyBreak)
      {
        return lkont[i].applyBreak(lkont.slice(i), kont, machine);
      }
    }
    throw new Error("no break target\nlocal stack: " + lkont);
  }

  function enqueueScriptEvaluation(resource, machine)
  {
    return machine.enqueueJob(new ScriptEvaluationJob(resource));
  }
  //
  // function enqueueJob(qname, job, machine)
  // {
  //   const jobs = machine.storeLookup(qname);
  //   const jobs2 = jobs.add(job);
  //   machine.storeUpdate(qname, jobs2);
  // }
  //
  // function JobQueue(jobs)
  // {
  //   this.jobs = jobs || ArraySet.empty()
  // }
  //
  // JobQueue.prototype.equals =
  //     function (x)
  //     {
  //       if (this === x)
  //       {
  //         return true;
  //       }
  //
  //       return x instanceof JobQueue
  //           && this.jobs.equals(x.jobs)
  //     }
  //
  // JobQueue.prototype.hashCode =
  //     function ()
  //     {
  //       return 42; // TODO
  //     }
  //
  // JobQueue.prototype.addresses =
  //     function ()
  //     {
  //       let addresses = EMPTY_ADDRESS_SET;
  //       for (const job of this.jobs)
  //       {
  //         addresses = addresses.join(job.addresses);
  //       }
  //       return addresses;
  //     }
  //
  // JobQueue.prototype.add =
  //     function (job)
  //     {
  //       return new JobQueue(this.jobs.add(job));
  //     }
  //
  //
  // JobQueue.prototype.first =
  //     function ()
  //     {
  //       return this.jobs.first();
  //     }
  //
  // JobQueue.prototype.rest =
  //     function ()
  //     {
  //       return new JobQueue(this.jobs.rest());
  //     }
  //
  // JobQueue.prototype.isEmpty =
  //     function ()
  //     {
  //       return this.jobs.size() === 0;
  //     }
  //
  // JobQueue.prototype.join =
  //     function (x)
  //     {
  //       return new JobQueue(this.jobs.join(x.jobs));
  //     }
  //
  // JobQueue.prototype.toString =
  //     function ()
  //     {
  //       return "(jobqueue: " + this.jobs + ")";
  //     }
  //
  function functionScopeDeclarations(node)
  {
    let funScopeDecls = node.funScopeDecls;
    if (!funScopeDecls)
    {
      funScopeDecls = Ast.functionScopeDeclarations(node);
      node.funScopeDecls = funScopeDecls;
    }
    return funScopeDecls;
  }

  function blockScopeDeclarations(node)
  {
    let blockScopeDecls = node.blockScopeDecls;
    if (!blockScopeDecls)
    {
      blockScopeDecls = Ast.blockScopeDeclarations(node);
      node.blockScopeDecls = blockScopeDecls;
    }
    return blockScopeDecls;
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
    assertDefinedNotNull(scope);
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

  function performApply(operandValues, funNode, scope, lkont, kont, ctx, machine)
  {
    const bodyNode = funNode.body;
    const nodes = bodyNode.body;
    if (nodes.length === 0)
    {
      machine.continue(L_UNDEFINED, [], ctx);
    } else
    {
      let extendedBenv = scope.extend();

      const funScopeDecls = functionScopeDeclarations(funNode);
      const names = Object.keys(funScopeDecls);
      if (names.length > 0)
      {
        var nodeAddr = names.map(function (name)
        {
          var node = funScopeDecls[name];
          var addr = machine.alloc.vr(node.id || node, ctx); // new ctx!
          extendedBenv = extendedBenv.add(name, addr);
          return [node, addr];
        });

        for (let i = 0; i < nodeAddr.length; i++)
        {
          const na = nodeAddr[i];
          const node = na[0];
          const addr = na[1];
          if (Ast.isIdentifier(node)) // param
          {
            machine.storeAlloc(addr, node.i < operandValues.length ? operandValues[node.i] : L_UNDEFINED);
          } 
          else if (Ast.isFunctionDeclaration(node))
          {
            var closureRef = allocateClosure(node, extendedBenv, lkont, kont, machine);
            machine.storeAlloc(addr, closureRef);
          } 
          else if (Ast.isVariableDeclarator(node))
          {
            machine.storeAlloc(addr, L_UNDEFINED);
          } 
          else if (Ast.isRestElement(node))
          {
            const arr = CreateArrayFromList(operandValues.slice(node.i), node, lkont, kont, machine);
            const arrAddress = machine.alloc.array(node, ctx);
            machine.storeAlloc(arrAddress, arr);
            const arrRef = lat.abstRef(arrAddress);
            machine.storeAlloc(addr, arrRef);
          }
          else
          {
            throw new Error("cannot handle declaration " + node);
          }
        }
      }

      const blockScopeDecls = blockScopeDeclarations(funNode);
      for (const [name, decl] of blockScopeDecls)
      {
        const addr = machine.alloc.vr(decl.id, ctx); // new ctx!
        extendedBenv = extendedBenv.add(name, addr);
        machine.storeAlloc(addr, BOT);
      }

      //machine.evaluate(bodyNode, extendedBenv, [], ctx); // to avoid `evalBlockStatement`
      evalStatementList(bodyNode, extendedBenv, [], ctx, machine);
    }
  }


  ObjClosureCall.prototype.applyFunction =
      function (application, operandValues, thisValue, TODO_REMOVE, lkont, kont, machine)
      {
        const userContext = machine.kalloc(this, operandValues);
        var previousStack = Stackget(new Stack(lkont, kont), machine);
        var stackAs = kont.stackAddresses(lkont).join(this.addresses());
        var ctx = createContext(application, thisValue, kont.realm, userContext, stackAs, previousStack, machine);
        performApply(operandValues, this.node, this.scope, lkont, kont, ctx, machine);
      }

  ObjClosureCall.prototype.applyConstructor =
      function (application, operandValues, protoRef, TODO_REMOVE, lkont, kont, machine)
      {
        // call store should not contain freshly allocated `this`
        const userContext = machine.kalloc(this, operandValues);
        const funNode = this.node;
        const obj = ObjectCreate(protoRef);
        const thisa = machine.alloc.constructor(funNode, kont, application);
        machine.storeAlloc(thisa, obj);
        const thisValue = lat.abstRef(thisa);
        const stackAs = kont.stackAddresses(lkont).join(this.addresses());
        const previousStack = Stackget(new Stack(lkont, kont), machine);
        const ctx = createContext(application, thisValue, kont.realm, userContext, stackAs, previousStack, machine);
        return performApply(operandValues, funNode, this.scope, lkont, kont, ctx, machine);
      }

  ObjClosureCall.prototype.addresses =
      function ()
      {
        return this.scope.addresses();
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
      function (leftValue, lkont, kont, machine)
      {
        var node = this.node;
        var benv = this.benv;
        var frame = new RightKont(node, leftValue);
        machine.evaluate(node.right, benv, [frame].concat(lkont), kont);
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
      function (leftValue, lkont, kont, machine)
      {
        var node = this.node;
        var benv = this.benv;
        var operator = node.operator;
        switch (operator)
        {
          case "&&":
          {
            if (leftValue.isTruthy())
            {
              machine.evaluate(node.right, benv, lkont, kont);
            }
            if (leftValue.isFalsy())
            {
              machine.continue(leftValue, lkont, kont);
            }
            break;
          }
          case "||":
          {
            if (leftValue.isTruthy())
            {
              machine.continue(leftValue, lkont, kont);
            }
            if (leftValue.isFalsy())
            {
              machine.evaluate(node.right, benv, lkont, kont);
            }
            break;
          }
          default:
            throw new Error("cannot handle logical operator " + operator);
        }
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
      function (value, lkont, kont, machine)
      {
        const node = this.node;
        const leftValue = this.leftValue;
        const operator = node.operator;
        let resultValue;
        switch (node.operator)
        {
          case "!":
          {
            resultValue = lat.not(value);
            break;
          }
          case "+":
          {
            resultValue = lat.pos(value);
            break;
          }
          case "-":
          {
            resultValue = lat.neg(value);
            break;
          }
          case "~":
          {
            resultValue = lat.binnot(value);
            break;
          }
          case "typeof":
          {
            resultValue = BOT;
            if (value.projectUndefined() !== BOT)
            {
              resultValue = resultValue.join(lat.abst1("undefined"));
            }
            if (value.projectNull() !== BOT)
            {
              resultValue = resultValue.join(lat.abst1("object"));
            }
            if (value.projectString() !== BOT)
            {
              resultValue = resultValue.join(lat.abst1("string"));
            }
            if (value.projectNumber() !== BOT)
            {
              resultValue = resultValue.join(lat.abst1("number"));
            }
            if (value.projectBoolean() !== BOT)
            {
              resultValue = resultValue.join(lat.abst1("boolean"));
            }
            if (value.isRef())
            {
              const ic = IsCallable(value, machine);
              if (ic.isTrue())
              {
                resultValue = resultValue.join(lat.abst1("function"));
              }
              if (ic.isFalse())
              {
                resultValue = resultValue.join(lat.abst1("object"));
              }
            }
            break;
          }
          default:
            throw new Error("cannot handle unary operator " + node.operator);
        }
        machine.continue(resultValue, lkont, kont);
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
      function (rightValue, lkont, kont, machine)
      {
        var node = this.node;
        var leftValue = this.leftValue;
        var operator = node.operator;
        return applyBinaryOperator(operator, leftValue, rightValue, lkont, kont, machine);
      }

  function applyBinaryOperator(operator, leftValue, rightValue, lkont, kont, machine)
  {
    switch (operator)
    {
      case "+":
      {
        machine.continue(lat.add(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case "*":
      {
        machine.continue(lat.mul(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case "-":
      {
        machine.continue(lat.sub(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case "/":
      {
        machine.continue(lat.div(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case "%":
      {
        machine.continue(lat.rem(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case "===":
      {
        machine.continue(lat.eqq(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case "!==":
      {
        machine.continue(lat.neqq(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case "==":
      {
        machine.continue(lat.eq(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case "!=":
      {
        machine.continue(lat.neq(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case "<":
      {
        machine.continue(lat.lt(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case "<=":
      {
        machine.continue(lat.lte(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case ">":
      {
        machine.continue(lat.gt(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case ">=":
      {
        machine.continue(lat.gte(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case "&":
      {
        machine.continue(lat.binand(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case "|":
      {
        machine.continue(lat.binor(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case "^":
      {
        machine.continue(lat.binxor(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case "<<":
      {
        machine.continue(lat.shl(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case ">>":
      {
        machine.continue(lat.shr(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case ">>>":
      {
        machine.continue(lat.shrr(leftValue, rightValue), lkont, kont, machine);
        return;
      }
      case "instanceof":
      {
        InstanceofOperator(leftValue, rightValue, lkont, kont, machine, value =>
          machine.continue(value, lkont, kont));
        return;
      }
      case "in":
      {
        if (rightValue.isNonRef())
        {
          throwTypeError("in: not an object", lkont, kont, machine);
        }
        if (rightValue.isRef())
        {
          ToPropertyKey(leftValue, lkont, kont, machine, P =>
          {
            HasProperty(rightValue, P, lkont, kont, machine, result =>
            {
              machine.continue(result, lkont, kont);
            })
          })
        }
        return;
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
      function (value, lkont, kont, machine)
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
            var existingValue = doScopeLookup(node.left, benv, kont, machine);
            newValue = lat.add(existingValue, value);
            break;
          }
          case "-=":
          {
            var existingValue = doScopeLookup(node.left, benv, kont, machine);
            newValue = lat.sub(existingValue, value);
            break;
          }
          case "*=":
          {
            var existingValue = doScopeLookup(node.left, benv, kont, machine);
            newValue = lat.mul(existingValue, value);
            break;
          }
          case "|=":
          {
            var existingValue = doScopeLookup(node.left, benv, kont, machine);
            newValue = lat.binor(existingValue, value);
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
        doScopeSet(node.left, newValue, benv, kont, machine);
        machine.continue(newValue, lkont, kont);
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
      function (operatorValue, lkont, kont, machine)
      {
        var node = this.node;
        var benv = this.benv;
        var operands = node.arguments;

        if (operands.length === 0)
        {
          if (Ast.isNewExpression(node))
          {
            applyCons(node, operatorValue, [], benv, lkont, kont, machine);
          }
          else
          {
            applyProc(node, operatorValue, [], kont.realm.GlobalObject, benv, lkont, kont, machine);
          }
          return;
        }
        const frame = new OperandsKont(node, 1, benv, operatorValue, [], kont.realm.GlobalObject);
        machine.evaluate(operands[0], benv, [frame].concat(lkont), kont);
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
      function (operandValue, lkont, kont, machine)
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
            applyCons(node, operatorValue, operandValues.addLast(operandValue), benv, lkont, kont, machine);
          }
          else
          {
            applyProc(node, operatorValue, operandValues.addLast(operandValue), thisValue, benv, lkont, kont, machine);
          }
          return;
        }
        const frame = new OperandsKont(node, i + 1, benv, operatorValue, operandValues.addLast(operandValue), thisValue);
        machine.evaluate(operands[i], benv, [frame].concat(lkont), kont);
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
      function (value, lkont, kont, machine)
      {
        var node = this.node;
        var benv = this.benv;
        var i = this.i;

        var nodes = node.body;
        if (i === nodes.length - 1)
        {
          machine.evaluate(nodes[i], benv, lkont, kont);
          return;
        }
        var frame = new BodyKont(node, i + 1, benv);
        machine.evaluate(nodes[i], benv, [frame].concat(lkont), kont);
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
      function (value, lkont, kont, machine)
      {
        var node = this.node;
        machine.return(value, lkont, kont);
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
      function (tryValue, lkont, kont, machine)
      {
        var node = this.node;
        const finalizer = node.finalizer;
        if (finalizer !== null)
        {
          const finalizerBody = finalizer.body;
          if (finalizerBody.length === 0)
          {
            machine.continue(tryValue, lkont, kont);
            return;
          }
          const benv = this.benv;
          const frame = new FinalizerKont(node, tryValue, false);
          return evalStatementList(finalizer, benv, [frame].concat(lkont), kont, machine);
        }
        machine.continue(tryValue, lkont, kont);
      }
  TryKont.prototype.applyThrow =
      function (throwValue, lkont, kont, machine)
      {
        var node = this.node;
        const benv = this.benv;
        var handler = node.handler;

        if (handler === null)
        {
          const finalizer = node.finalizer;
          const finalizerBody = finalizer.body;
          if (finalizerBody.length === 0)
          {
            machine.throw(throwValue, lkont, kont);
            return;
          }
          const frame = new FinalizerKont(node, throwValue, true);
          return evalStatementList(finalizer, benv, [frame].concat(lkont), kont, machine);
        }

        var body = handler.body;
        var nodes = body.body;
        if (nodes.length === 0)
        {
          machine.continue(L_UNDEFINED, lkont, kont);
          return;
        }

        var extendedBenv = this.benv.extend();
        var param = handler.param;
        var name = param.name;
        var addr = machine.alloc.vr(param, kont);
        extendedBenv = extendedBenv.add(name, addr);
        machine.storeAlloc(addr, throwValue);
        return evalStatementList(body, extendedBenv, lkont, kont, machine);
      }

  function FinalizerKont(node, value, thrw)
  {
    this.node = node;
    this.value = value;
    this.thrw = thrw;
  }

  FinalizerKont.prototype.equals =
      function (x)
      {
        return x instanceof FinalizerKont
            && this.node === x.node
            && this.value.equals(x.value)
            && this.thrw === x.thrw
      }
  FinalizerKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        result = prime * result + this.value.hashCode();
        result = prime * result + HashCode.hashCode(this.thrw);
        return result;
      }
  FinalizerKont.prototype.toString =
      function ()
      {
        return "finalizer-" + this.node.tag;
      }
  FinalizerKont.prototype.nice =
      function ()
      {
        return "finalizer-" + this.node.tag;
      }
  FinalizerKont.prototype.addresses =
      function ()
      {
        return this.value.addresses();
      }
  FinalizerKont.prototype.apply =
      function (finalValue, lkont, kont, machine)
      {
        const value = this.value;
        const thrw = this.thrw;
        if (thrw)
        {
          machine.throw(value, lkont, kont);
          return;
        }
        machine.continue(value, lkont, kont);
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
      function (throwValue, lkont, kont, machine)
      {
        assertFalse(throwValue instanceof Obj)
        var node = this.node;
        machine.throw(throwValue, lkont, kont);
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
      function (conditionValue, lkont, kont, machine)
      {
        var node = this.node;
        var benv = this.benv;
        var consequent = node.consequent;
        var alternate = node.alternate;
        if (conditionValue.isTruthy())
        {
          machine.evaluate(consequent, benv, lkont, kont);
        }
        if (conditionValue.isFalsy())
        {
          if (alternate === null)
          {
            machine.continue(L_UNDEFINED, lkont, kont);
          } 
          else
          {
            machine.evaluate(alternate, benv, lkont, kont);
          }
        }
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
      function (value, lkont, kont, machine)
      {
        var node = this.node;
        var benv = this.benv;
        var test = node.test;
        var frame = new ForTestKont(node, L_UNDEFINED, benv);
        machine.evaluate(test, benv, [frame].concat(lkont), kont);
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
        return "fortest-" + Ast.nodeToNiceString(this.node);
      }
  ForTestKont.prototype.addresses =
      function ()
      {
        return this.benv.addresses();
      }
  ForTestKont.prototype.apply =
      function (testValue, lkont, kont, machine)
      {
        var node = this.node;
        var benv = this.benv;
        if (testValue.isTruthy())
        {
          var body = node.body;
          var frame = new ForBodyKont(node, benv);
          machine.evaluate(body, benv, [frame].concat(lkont), kont);
        }
        if (testValue.isFalsy())
        {
          machine.continue(this.bodyValue, lkont, kont);
        }
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
      function (bodyValue, lkont, kont, machine)
      {
        var node = this.node;
        var benv = this.benv;
        var update = node.update;
        var frame = new ForUpdateKont(node, bodyValue, benv);
        machine.evaluate(update, benv, [frame].concat(lkont), kont);
      }
  ForBodyKont.prototype.applyBreak =
      function (lkont, kont, machine)
      {
        machine.continue(L_UNDEFINED, lkont.slice(1), kont);
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
      function (updateValue, lkont, kont, machine)
      {
        var node = this.node;
        var benv = this.benv;
        var test = node.test;
        var frame = new ForTestKont(node, this.bodyValue, benv);
        machine.evaluate(test, benv, [frame].concat(lkont), kont);
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
      function (ref, lkont, kont, machine)
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
          default:
            throw new Error("cannot handle left expression " + left + " (" + left.type + ")");
        }
        callInternal(ref, "[[OwnPropertyKeys]]", [], lkont, kont, machine, ownKeys =>
          forInHelper(node, nameNode, ref, ownKeys, 0, benv, lkont, kont, machine));
      }

  function forInHelper(node, nameNode, ref, ownKeys, i, benv, lkont, kont, machine)
  {
    if (i === ownKeys.length)
    {
      callInternal(ref, "[[GetPrototypeOf]]", [], lkont, kont, machine, protoRef =>
      {
        if (protoRef.isNull())
        {
          machine.continue(L_UNDEFINED, lkont, kont);
        }
        if (protoRef.isNonNull()) // TODO: check for non-null ref/non-ref?
        {
          callInternal(protoRef, "[[OwnPropertyKeys]]", [], lkont, kont, machine, ownKeys =>
            forInHelper(node, nameNode, protoRef, ownKeys, 0, benv, lkont, kont, machine));
        }
      })
    }
    else
    {
      const ownKey = ownKeys[i];
      callInternal(ref, "[[GetOwnProperty]]", [ownKey], lkont, kont, machine, desc =>
      {
        if (desc.isDefined() && desc.getEnumerable().isTrue())
        {
          doScopeSet(nameNode, ownKey, benv, kont, machine);
          const frame = new ForInBodyKont(node, nameNode, ref, ownKeys, i, benv);
          machine.evaluate(node.body, benv, [frame].concat(lkont), kont);
        }
        if (desc.isUndefined() || desc.isEnumerableAbsent() || desc.getEnumerable().isFalse())
        {
          forInHelper(node, nameNode, ref, ownKeys, i + 1, benv, lkont, kont, machine);
        }
      })
    }
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
      function (unusedValue, lkont, kont, machine)
      {
        const node = this.node;
        const nameNode = this.nameNode;
        const ref = this.ref;
        const ownKeys = this.ownKeys;
        const i = this.i;
        const benv = this.benv;
        forInHelper(node, nameNode, ref, ownKeys, i + 1, benv, lkont, kont, machine);
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
      function (testValue, lkont, kont, machine)
      {
        var node = this.node;
        var benv = this.benv;
        var body = node.body;
        var result = [];
        if (testValue.isTruthy())
        {
          var frame = new WhileBodyKont(node, benv);
          machine.evaluate(body, benv, [frame].concat(lkont), kont);
        }
        if (testValue.isFalsy())
        {
          machine.continue(L_UNDEFINED, lkont, kont);
        }
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
      function (bodyValue, lkont, kont, machine)
      {
        var node = this.node;
        var benv = this.benv;
        var test = node.test;
        var frame = new WhileTestKont(node, benv);
        machine.evaluate(test, benv, [frame].concat(lkont), kont);
      }
  WhileBodyKont.prototype.applyBreak =
      function (lkont, kont, machine)
      {
        machine.continue(L_UNDEFINED, lkont.slice(1), kont);
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
      function (initValue, lkont, kont, machine)
      {
        var node = this.node;
        var properties = node.properties;
        var benv = this.benv;
        var i = this.i;
        var initValues = this.initValues.addLast(initValue);

        if (properties.length === i)
        {
          const obj = ObjectCreate(kont.realm.Intrinsics.get("%ObjectPrototype%"));
          const objectAddress = machine.alloc.object(node, kont);
          machine.storeAlloc(objectAddress, obj);
          const object = lat.abstRef(objectAddress);

          function cont(j)
          {
            if (j === i)
            {
              machine.continue(object, lkont, kont);
            }
            else
            {
              const propName = lat.abst1(properties[j].key.name);
              const propValue = initValues[j];
              CreateDataPropertyOrThrow(object, propName, propValue, lkont, kont, machine, success =>
              {
                if (success.isFalse())
                {
                  throw new Error("TODO");
                }
                if (success.isTrue())
                {
                  cont(j + 1);
                }
              });
            }
          }

          cont(0);
          return;
        }
        var frame = new ObjectKont(node, i + 1, benv, initValues);
        machine.evaluate(properties[i].value, benv, [frame].concat(lkont), kont);
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
      function (initValue, lkont, kont, machine)
      {
        var node = this.node;
        var elements = node.elements;
        var benv = this.benv;
        var i = this.i;
        var initValues = this.initValues.addLast(initValue);

        if (elements.length === i)
        {
          var arr = createArray(kont.realm);
          var arrAddress = machine.alloc.array(node, kont);
          for (var j = 0; j < i; j++)
          {
            var indexName = lat.abst1(String(j));
            arr = arr.addProperty(indexName, Property.fromData(initValues[j], L_TRUE, L_TRUE, L_TRUE));
          }
          arr = arr.addProperty(P_LENGTH, Property.fromData(lat.abst1(i), L_TRUE, L_TRUE, L_TRUE));
          machine.storeAlloc(arrAddress, arr);
          machine.continue(lat.abstRef(arrAddress), lkont, kont);
          return;
        }
        var frame = new ArrayKont(node, i + 1, benv, initValues);
        machine.evaluate(elements[i], benv, [frame].concat(lkont), kont);
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
      function (objectValue, lkont, kont, machine)
      {
        var node = this.node;
        var benv = this.benv;
        var property = node.property;
        const objectRef = ToObject(objectValue, node, lkont, kont, machine);
        if (node.computed)
        {
          const frame = new MemberPropertyKont(node, benv, objectRef);
          machine.evaluate(property, benv, [frame].concat(lkont), kont);
        } else
        {
          const value = doProtoLookup(lat.abst1(property.name), objectRef.addresses(), machine);
          machine.continue(value, lkont, kont);
        }
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
      function (propertyValue, lkont, kont, machine)
      {
        if (propertyValue === BOT)
        {
          return [];
        }
        var objectRef = this.objectRef;
        var nameValue = propertyValue.ToString();
        return $getProperty(objectRef, nameValue, lkont, kont, machine);
      }

  function $getProperty(obj, name, lkont, kont, machine)
  {
    const value = doProtoLookup(name, obj.addresses(), machine);
    machine.continue(value, lkont, kont);
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
      function (objectValue, lkont, kont, machine)
      {
        const node = this.node;
        const benv = this.benv;
        const property = node.callee.property;
        if (node.computed)
        {
          throw new Error("TODO");
        }
        const nameValue = lat.abst1(property.name);
        const objectRef = ToObject(objectValue, node, lkont, kont, machine);
        const operands = node.arguments;
        invoke(node, objectRef, nameValue, operands, benv, lkont, kont, machine);
      }


  function invoke(application, thisValue, nameValue, operands, benv, lkont, kont, machine)
  {
    var operatorValue = doProtoLookup(nameValue, thisValue.addresses(), machine);
    if (operands.length === 0)
    {
      if (Ast.isNewExpression(application))
      {
        applyCons(application, operatorValue, [], benv, lkont, kont, machine);
      } else
      {
        applyProc(application, operatorValue, [], thisValue, null, lkont, kont, machine);
      }
    } else
    {
      const frame = new OperandsKont(application, 1, benv, operatorValue, [], thisValue);
      machine.evaluate(operands[0], benv, [frame].concat(lkont), kont);
    }
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
      function (objectRef, lkont, kont, machine)
      {
        var node = this.node;
        var benv = this.benv;
        var left = node.left;
        var property = left.property;
        if (left.computed)
        {
          var frame = new AssignMemberPropertyKont(node, benv, objectRef);
          machine.evaluate(property, benv, [frame].concat(lkont), kont);
          return;
        }
        var right = node.right;
        var nameValue = lat.abst1(property.name);
        var frame = new MemberAssignmentValueKont(node, benv, objectRef, nameValue);
        machine.evaluate(right, benv, [frame].concat(lkont), kont);
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
      function (objectRef, lkont, kont, machine)
      {
        var node = this.node;
        var benv = this.benv;
        var argument = node.argument;
        var property = argument.property;
        if (argument.computed)
        {
          var frame = new UpdateMemberPropertyKont(node, benv, objectRef); // TODO
          machine.evaluate(property, benv, [frame].concat(lkont), kont);
          return;
        }
        var name = lat.abst1(property.name);
        var value = doProtoLookup(name, objectRef.addresses(), machine);
        if (value === BOT)
        {
          return [];
        }
        var updatedValue;
        switch (node.operator)
        {
          case "++":
          {
            updatedValue = lat.add(value, L_1);
            break;
          }
          case "--":
          {
            updatedValue = lat.sub(value, L_1);
            break;
          }
          default:
            throw new Error("cannot handle update operator " + node.operator);
        }
        if (updatedValue === BOT)
        {
          return [];
        }
        doProtoSet(name, updatedValue, objectRef, machine);
        var resultingValue = node.prefix ? updatedValue : value;
        machine.continue(resultingValue, lkont, kont);
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
      function (propertyValue, lkont, kont, machine)
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
        machine.evaluate(right, benv, [frame].concat(lkont), kont);
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
      function (value, lkont, kont, machine)
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
            var existingValue = doProtoLookup(nameValue, objectRef.addresses(), machine);
            var newValue = lat.add(existingValue, value);
            break;
          }
          case "-=":
          {
            var existingValue = doProtoLookup(nameValue, objectRef.addresses(), machine);
            var newValue = lat.sub(existingValue, value);
            break;
          }
          case "|=":
          {
            var existingValue = doProtoLookup(nameValue, objectRef.addresses(), machine);
            newValue = lat.binor(existingValue, value);
            break;
          }
          default:
            throw new Error("cannot handle assignment operator " + node.operator);
        }
        if (newValue === BOT)
        {
          return [];
        }
        return $assignProperty(objectRef, nameValue, newValue, lkont, kont, machine);
      }

  function $assignProperty(obj, name, value, lkont, kont, machine)
  {
    doProtoSet(name, value, obj, machine);
    machine.continue(value, lkont, kont);
  }

  function doScopeLookup(nameNode, benv, kont, machine)
  {
    var name = nameNode.name;
    var a = benv.lookup(name);
    if (a === BOT)
    {
      var aname = lat.abst1(name);
      const value = doProtoLookup(aname, kont.realm.GlobalObject.addresses(), machine);
      if (value === BOT)
      {
        throw new Error("not found in scope: " + nameNode);
      }
      return value;
    }
    return machine.storeLookup(a);
  }

  function doProtoLookup(name, as, machine)
  {
    assertDefinedNotNull(machine);
    let result = BOT;
    as = as.values();
    while (as.length !== 0)
    {
      var a = as.pop();
      var obj = machine.storeLookup(a);
      if (obj.propertyPresent(name))
      {
        const desc = obj.getProperty(name);
        if (IsDataDescriptor(desc).isTrue())
        {
          const value = desc.Value.getValue();
          result = result.join(value);
        }
        if (IsAccessorDescriptor(desc).isTrue())
        {
          throw new Error("NIY");
        }
      }
      if (obj.propertyAbsent(name))
      {
        const proto = obj.getInternal("[[Prototype]]");
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

  function lookupInternal(O, name, machine)
  {
    let result = BOT;
    const as = O.addresses().values();
    while (as.length > 0)
    {
      const a = as.pop();
      const obj = machine.storeLookup(a);
      const value = obj.getInternal(name);
      result = result.join(value);
    }
    return result;
  }

  function callInternal(O, name, args, lkont, kont, machine, cont)
  {
    assert(typeof cont === "function");
    const as = O.addresses();
    for (const a of as)
    {
      const obj = machine.storeLookup(a);
      const fs = obj.getInternal(name);
      if (!fs)
      {
        throw new Error("no internal slot " + name + " on " + obj + " (internals: " + obj.internals + ")");
      }
      for (const f of fs)
      {
        f.apply(null, [O].concat(args).concat([lkont, kont, machine, cont]));
      }
    }
  }

  function assignInternal(O, name, value, machine)
  {
    const as = O.addresses().values();
    while (as.length > 0)
    {
      const a = as.pop();
      let obj = machine.storeLookup(a);
      obj = obj.setInternal(name, value);
      machine.storeUpdate(a, obj);
    }
  }

  function hasInternal(O, name, machine)
  {
    assert(typeof name === "string");
    let result = BOT;
    const as = O.addresses().values();
    while (as.length > 0)
    {
      const a = as.pop();
      const obj = machine.storeLookup(a);
      result = result.join(hasInternalProperty(obj, name));
    }
    return result;
  }

  function getInternal(O, name, machine)
  {
    assert(typeof name === "string");
    let result = BOT;
    const as = O.addresses().values();
    while (as.length > 0)
    {
      const a = as.pop();
      const obj = machine.storeLookup(a);
      result = result.join(obj.getInternal(name));
    }
    return result;
  }

  function doScopeSet(nameNode, value, benv, kont, machine)
  {
    var name = nameNode.name;
    var a = benv.lookup(name);
    if (a === BOT)
    {
      var aname = lat.abst1(name);
      doProtoSet(aname, value, kont.realm.GlobalObject, machine);
    } else
    {
      machine.storeUpdate(a, value);
    }
  }

  function doProtoSet(name, value, objectRef, machine)
  {
    assertDefinedNotNull(value);
    var as = objectRef.addresses().values();
    while (as.length !== 0)
    {
      var a = as.pop();
      var obj = machine.storeLookup(a);
      obj = obj.addProperty(name, Property.fromData(value, L_TRUE, L_TRUE, L_TRUE));
      if (hasInternalProperty(obj, "isArray").isTrue()) // TODO temp
      {
        // 15.4.5.1
        var n = name.ToNumber();
        var i = name.ToUint32();
        if (n.equals(i))
        {
          var len = obj.getProperty(P_LENGTH).getValue();
          if (lat.gte(i, len).isTrue())
          {
            obj = obj.addProperty(P_LENGTH, Property.fromData(lat.add(i, L_1), L_TRUE, L_TRUE, L_TRUE));
          }
        }
      }
      machine.storeUpdate(a, obj);
    }
  }

  function createEnvironment(parents)
  {
    var benv = Benv.empty(parents);
    return benv;
  }

  function hasInternalProperty(obj, name)
  {
    let result = BOT;
    if (obj.internalPresent(name))
    {
      result = result.join(L_TRUE);
    };
    if (obj.internalAbsent(name))
    {
      result = result.join(L_FALSE);
    }
    return result;
  }

  function createArray(realm)
  {
    var obj = Obj.empty();
    obj = obj.setInternal("[[Prototype]]", realm.Intrinsics.get("%ArrayPrototype%"));

    // TODO 9.4.5.4: exotic [[Get]] for Integer Indexed Exotic Objects
    obj = obj.setInternal("[[Get]]", SetValueNoAddresses.from1(OrdinaryGet));
    // TODO 9.4.5.2
    obj = obj.setInternal("[[HasProperty]]", SetValueNoAddresses.from1(OrdinaryHasProperty));
    // TODO 9.4.5.1
    obj = obj.setInternal("[[GetOwnProperty]]", SetValueNoAddresses.from1(OrdinaryGetOwnProperty));

    obj = obj.setInternal("[[GetPrototypeOf]]", SetValueNoAddresses.from1(OrdinaryGetPrototypeOf));

    // TODO temp
    obj = obj.setInternal("isArray", L_TRUE);
    return obj;
  }

  /// debug helpers
  function callStacks(lkont, kont)
  {
    const unrolledStacks = Stackget(new Stack(lkont, kont)).unroll();
    return unrolledStacks.map(ur =>
        ur.map(stack =>
            (stack.kont && stack.kont.ex)
                ? Ast.nodeToNiceString(stack.kont.ex) + " " + stack._id + " " + stack.kont._id
                : String(stack)))
  }

  /// semantic helpers
  function semanticAssert(x)
  {
    if (x !== true)
    {
      const msg = "expected true, got " + x;
      if (hardSemanticAsserts)
      {
        throw new Error(msg);
      }
      console.log(msg);
    }
  }

  function isObject(O)
  {
    return O.isRef();
  }

  function isNull(O)
  {
    return O.isNull();
  }

  function isNeitherObjectNorNull(O)
  {
    for (const t of Type(O))
    {
      if (t !== Types.Object && t !== Types.Null)
      {
        return true;
      }
    }
    return false;
  }

  function assertIsObject(O)
  {
    semanticAssert(isObject(O));
  }

  function assertIsObjectOrNull(O)
  {
    semanticAssert(isObject(O) || isNull(O));
  }

  function assertIsPropertyKey(P)
  {
    const result = IsPropertyKey(P);
    semanticAssert(result.isTrue());
  }

  function assertIsCallable(F)
  {
    const result = IsCallable(F);
    semanticAssert(result.isTrue());
  }

  // const UNDEFINED = new Undefined();
  //
  // function Undefined()
  // {
  // }
  //
  // Undefined.prototype.equals =
  //     function (x)
  //     {
  //       return x instanceof Undefined;
  //     }
  //
  // Undefined.prototype.hashCode =
  //     function ()
  //     {
  //       return 79;
  //     }
  //
  // Undefined.prototype.addresses =
  //     function ()
  //     {
  //       return EMPTY_ADDRESS_SET;
  //     }
  //
  // Undefined.prototype.join =
  //     function (x)
  //     {
  //       if (x instanceof Undefined)
  //       {
  //         return this;
  //       }
  //       if (x instanceof Defined)
  //       {
  //         if (x.isUndefined())
  //         {
  //           return x;
  //         }
  //         return new Defined(x.value, false);
  //       }
  //     }
  //
  // Undefined.prototype.isDefined =
  //     function ()
  //     {
  //       return false;
  //     }
  //
  // Undefined.prototype.isUndefined =
  //     function ()
  //     {
  //       return true;
  //     }
  //
  // Undefined.prototype.projectDefined =
  //     function ()
  //     {
  //       return BOT;
  //     }
  //
  // Undefined.prototype.toString =
  //     function ()
  //     {
  //       return "{}";
  //     }
  //
  // function Defined(value, defined)
  // {
  //   assert(value !== BOT);
  //   this.value = value;
  //   this.defined = defined;
  // }
  //
  // Defined.prototype.equals =
  //     function (x)
  //     {
  //       return x instanceof Defined
  //           && this.value.equals(x.value)
  //           && this.defined === x.defined
  //     }
  //
  // Defined.prototype.hashCode =
  //     function ()
  //     {
  //       const prime = 31;
  //       let result = 1;
  //       result = prime * result + this.value.hashCode();
  //       result = prime * result + HashCode.hashCode(this.defined);
  //       return result;
  //     }
  //
  // Defined.prototype.addresses =
  //     function ()
  //     {
  //       return this.value.addresses();
  //     }
  //
  // Defined.prototype.join =
  //     function (x)
  //     {
  //       if (x instanceof Undefined)
  //       {
  //         if (this.isUndefined())
  //         {
  //           return this;
  //         }
  //         return new Defined(this.value, false);
  //       }
  //       if (x instanceof Defined)
  //       {
  //         return new Defined(this.value.join(x.value), this.defined && x.defined);
  //       }
  //       throw new Error();
  //     }
  //
  //
  // Defined.prototype.isDefined =
  //     function ()
  //     {
  //       return this.defined;
  //     }
  //
  // Defined.prototype.isUndefined =
  //     function ()
  //     {
  //       return !this.defined;
  //     }
  //
  // Defined.prototype.projectDefined =
  //     function ()
  //     {
  //       return this.value;
  //     }
  //
  // Defined.prototype.toString =
  //     function ()
  //     {
  //       return this.defined ? "{" + this.value + "}" : "{?" + this.value + "}"
  //     }

  const ABSENT = new Absent();

  function Absent()
  {
  }

  Absent.prototype.equals =
      function (x)
      {
        return x instanceof Absent;
      }

  Absent.prototype.hashCode =
      function ()
      {
        return 83;
      }

  Absent.prototype.addresses =
      function ()
      {
        return EMPTY_ADDRESS_SET;
      }

  Absent.prototype.join =
      function (x)
      {
        if (x instanceof Absent)
        {
          return this;
        }
        if (x instanceof Present)
        {
          if (x.isAbsent())
          {
            return x;
          }
          return new Present(x.value, false);
        }
      }

  Absent.prototype.isPresent =
      function ()
      {
        return false;
      }

  Absent.prototype.isAbsent =
      function ()
      {
        return true;
      }

  Absent.prototype.getValue =
      function ()
      {
        return BOT;
      }

  Absent.prototype.toString =
      function ()
      {
        return "[]";
      }

  function Present(value, present)
  {
    assert(value !== BOT);
    assertDefinedNotNull(present);
    this.value = value;
    this.present = present;
  }

  Present.from =
      function (value)
      {
        return new Present(value, true);
      }

  Present.prototype.equals =
      function (x)
      {
        return x instanceof Present
            && this.value.equals(x.value)
            && this.present === x.present
      }

  Present.prototype.hashCode =
      function ()
      {
        const prime = 31;
        let result = 1;
        result = prime * result + this.value.hashCode();
        result = prime * result + HashCode.hashCode(this.present);
        return result;
      }

  Present.prototype.addresses =
      function ()
      {
        return this.value.addresses();
      }

  Present.prototype.join =
      function (x)
      {
        if (x instanceof Absent)
        {
          if (this.isAbsent())
          {
            return this;
          }
          return new Present(this.value, false);
        }
        if (x instanceof Present)
        {
          return new Present(this.value.join(x.value), this.present && x.present);
        }
        throw new Error();
      }

  Present.prototype.isPresent =
      function ()
      {
        return this.present;
      }

  Present.prototype.isAbsent =
      function ()
      {
        return !this.present;
      }

  Present.prototype.getValue =
      function ()
      {
        return this.value;
      }

  Present.prototype.toString =
      function ()
      {
        return this.present ? "[" + this.value + "]" : "[?" + this.value + "]"
      }

  function Record(map)
  {
    assertDefinedNotNull(map);
    this.map = map;
  }

  Record.empty =
      function ()
      {
        return new Record(new Map());
      }

  Record.prototype.add =
      function (name, value)
      {
        assert(value.addresses);
        const newMap = new Map(this.map);
        newMap.set(name, Present.from(value));
        return new Record(newMap);
      }

  Record.prototype.isPresent =
      function (name)
      {
        return this.map.has(name);
      }

  Record.prototype.isAbsent =
      function (name)
      {
        const value = this.map.get(name);
        return !value || value.isAbsent();
      }

  Record.prototype.get =
      function (name)
      {
        const value = this.map.get(name);
        return value ? value.getValue() : BOT;
      }

  Record.prototype.equals =
      function (x)
      {
        if (this === x)
        {
          return true;
        }
        return Maps.equals(this.map, x.map, (x,y) => x === y || x.equals(y));
      }

  Record.prototype.join =
      function (other)
      {
        const joinedMap = Maps.join(this.map, other.map, (x,y) => x.join(y), BOT);
        return new Record(joinedMap);
      }

  Record.prototype.addresses =
      function ()
      {
        let addresses = ArraySet.empty();
        this.map.forEach((value, key) => {
          addresses = addresses.join(value.addresses())
        });
        return addresses;
      }

  function Obj(frame, internals)
  {
    assertDefinedNotNull(frame);
    assertDefinedNotNull(internals);
    this.frame = frame;//Obj.EMPTY_FRAME;
    this.internals = internals;//Record.empty();
  }

  Obj.empty =
      function ()
      {
        return new Obj(Obj.EMPTY_FRAME, Record.empty());
      }

  Obj.EMPTY_FRAME = HashMap.empty();

  Obj.prototype.toString =
      function ()
      {
        return "<" + this.names() + ">";
      };

  Obj.prototype.nice =
      function ()
      {
        return this.frame.nice();
      }

  function updateFrame(frame, name, value)
  {
    // if (name.conc1)
    // {
    //   return frame.put(name, value);
    // }
    return frame.put(name, value);
  }


  Obj.prototype.addInternal =
      function (name, value)
      {
        return new Obj(this.frame, this.internals.add(name, value));
      }

  Obj.prototype.setInternal = // TODO duplicate w.r.t. `set`? (do we need different add/update semantics?)
      function (name, value)
      {
        return new Obj(this.frame, this.internals.add(name, value));
      }

  Obj.prototype.internalPresent =
      function (name)
      {
        return this.internals.isPresent(name);
      }

  Obj.prototype.internalAbsent =
      function (name)
      {
        return this.internals.isAbsent(name);
      }

  Obj.prototype.getInternal =
      function (name)
      {
        return this.internals.get(name);
      }

  Obj.prototype.addProperty =
      function (name, value)
      {
        assert(name);
        const newFrame = updateFrame(this.frame, name, Present.from(value));
        return new Obj(newFrame, this.internals);
      }

  Obj.prototype.propertyPresent =
      function (name)
      {
        // const value = this.frame.get(name);
        // return value !== undefined && value.isPresent(); // TODO `frame.get` should return `BOT` iso. `undefined` when no prop
        var result = BOT;
        this.frame.iterateEntries(
            function (entry)
            {
              const entryName = entry[0];
              if (entryName.subsumes(name) || name.subsumes(entryName))
              {
                result = result.join(entry[1]);
              }
            });
        return result !== BOT && result.isPresent();
      }

  Obj.prototype.propertyAbsent = // TODO expensive (hiding pres/abs behind abstr)
      function (name)
      {
        var result = BOT;
        this.frame.iterateEntries(
            function (entry)
            {
              const entryName = entry[0];
              if (entryName.subsumes(name) || name.subsumes(entryName))
              {
                result = result.join(entry[1]);
              }
            });
        return result === BOT || result.isAbsent();
      }

  Obj.prototype.getProperty =
      function (name)
      {
        var result = BOT;
        this.frame.iterateEntries(
            function (entry)
            {
              const entryName = entry[0];
              if (entryName.subsumes(name) || name.subsumes(entryName))
              {
                result = result.join(entry[1].getValue());
              }
            });
        return result;
      }

  Obj.prototype.conc =
      function ()
      {
        return [this];
      }

  Obj.prototype.join =
      function (other)
      {
        if (other === BOT)
        {
          return this;
        }
        const newFrame = this.frame.join(other.frame, BOT);
        const newInternals = this.internals.join(other.internals);
        return new Obj(newFrame, newInternals);
      }

  Obj.prototype.equals =
      function (x)
      {
        if (this === x)
        {
          return true;
        }
        if (!(x instanceof Obj))
        {
          return false;
        }
        return this.frame.equals(x.frame)
            && this.internals.equals(x.internals);
      }

  Obj.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.frame.hashCode();
        return result;
      }

  Obj.prototype.diff = //DEBUG
      function (x)
      {
        var diff = [];
        if (!this.frame.equals(x.frame))
        {
          diff.push("[[frame]]\t" + this.frame.diff(x.frame));
        }
        return ">>>OBJ\n" + diff.join("\n") + "<<<";
      }

  Obj.prototype.names =
      function ()
      {
        return this.frame.keys();
      }

//  Obj.prototype.values =
//    function ()
//    {
//      return this.frame.map(function (entry) { return entry[1]; }).toSet();
//    }

  Obj.prototype.addresses =
      function ()
      {
        let addresses = ArraySet.empty();
        this.frame.values().forEach(function (value) {addresses = addresses.join(value.addresses())});
        addresses = addresses.join(this.internals.addresses());
        return addresses;
      }

  ///

  // 6
  function Type(x) // move to lattice?
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

  function TypeIsObject(x)
  {
    return x.isRef();
  }

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
    assert(Value instanceof Absent || Value instanceof Present);
    this.Value = Value;
    this.Get = Get;
    this.Set = Set;
    this.Writable = Writable;
    this.Enumerable = Enumerable;
    this.Configurable = Configurable;
  }

  Property.fromData =
      function (Value, Writable, Enumerable, Configurable)
      {
        assertDefinedNotNull(Value);
        assertDefinedNotNull(Writable);
        assertDefinedNotNull(Enumerable);
        assertDefinedNotNull(Configurable);
        return new Property(Value === BOT ? Present.from(L_UNDEFINED) : Present.from(Value), L_UNDEFINED, L_UNDEFINED, Writable === BOT ? L_FALSE : Writable, Enumerable === BOT ? L_FALSE : Enumerable, Configurable === BOT ? L_FALSE : Configurable);
      }

  Property.fromAccessor =
      function (Get, Set, Enumerable, Configurable)
      {
        assertDefinedNotNull(Get);
        assertDefinedNotNull(Set);
        assertDefinedNotNull(Enumerable);
        assertDefinedNotNull(Configurable);
        return new Property(ABSENT, Get === BOT ? L_UNDEFINED : Get, Set === BOT ? L_UNDEFINED : Set, L_UNDEFINED, Enumerable === BOT ? L_FALSE : Enumerable, Configurable === BOT ? L_FALSE : Configurable);
      }

  Property.default =
      function ()
      {
        return new Property(new Defined(L_UNDEFINED), L_UNDEFINED, L_UNDEFINED, L_FALSE, L_FALSE, L_FALSE);
      }

  Property.empty =
      function ()
      {
        return new Property(ABSENT, L_UNDEFINED, L_UNDEFINED, L_UNDEFINED, L_UNDEFINED, L_UNDEFINED);
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

  Property.prototype.isDefined =
      function ()
      {
        return true;
      }

  Property.prototype.isUndefined =
      function ()
      {
        return false;
      }

  Property.prototype.isValuePresent =
      function ()
  {
    return this.Value.isPresent();
  }

  Property.prototype.isValueAbsent =
      function ()
  {
    return this.Value.isAbsent();
  }

  Property.prototype.getValue
   = function ()
  {
    return this.Value.getValue();
  }

  Property.prototype.setValue =
      function (Value)
  {
    return new Property(Present.from(Value), this.Get, this.Set, this.Writable, this.Enumerable, this.Configurable);
  }

  Property.prototype.isGetPresent =
      function ()
  {
    return this.Get.isDefined();
  }

  Property.prototype.isGetAbsent =
      function ()
  {
    return this.Get.isUndefined();
  }

  Property.prototype.getGet =
      function ()
  {
    return this.Get.projectDefined();
  }

  Property.prototype.setGet =
      function (Get)
  {
    return new Property(this.Value, Get, this.Set, this.Writable, this.Enumerable, this.Configurable);
  }

  Property.prototype.isSetPresent =
      function ()
  {
    return this.Set.isDefined();
  }

  Property.prototype.isSetAbsent =
      function ()
  {
    return this.Set.isUndefined();
  }

  Property.prototype.getSet =
      function ()
  {
    return this.Set.projectDefined();
  }

  Property.prototype.setSet =
      function (Set__)
  {
    return new Property(this.Value, this.Get, Set__, this.Writable, this.Enumerable, this.Configurable);
  }


  Property.prototype.isWritablePresent =
      function ()
  {
    return this.Writable.isDefined();
  }

  Property.prototype.isWritableAbsent =
      function ()
  {
    return this.Writable.isUndefined();
  }

  Property.prototype.getWritable =
       function ()
  {
    return this.Writable.projectDefined();
  }

  Property.prototype.setWritable =
      function (Writable)
  {
    return new Property(this.Value, this.Get, this.Set, Writable, this.Enumerable, this.Configurable);
  }

  Property.prototype.isEnumerablePresent =
      function ()
  {
    return this.Enumerable.isDefined();
  }

  Property.prototype.isEnumerableAbsent =
      function ()
  {
    return this.Enumerable.isUndefined();
  }

  Property.prototype.getEnumerable =
      function ()
  {
    return this.Enumerable.projectDefined();
  }

  Property.prototype.setEnumerable =
      function (Enumerable)
  {
    return new Property(this.Value, this.Get, this.Set, this.Writable, Enumerable, this.Configurable);
  }


  Property.prototype.isConfigurablePresent
  = function ()
  {
    return this.Configurable.isDefined();
  }

  Property.prototype.isConfigurableAbsent =
      function ()
  {
    return this.Configurable.isUndefined();
  }

  Property.prototype.getConfigurable =
      function ()
  {
    return this.Configurable.projectDefined();
  }

  Property.prototype.setConfigurable =
      function (Configurable)
  {
    return new Property(this.Value, this.Get, this.Set, this.Writable, this.Enumerable, Configurable);
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
  // function Completion(Type, Value, Target)
  // {
  //   this.Type = Type;
  //   this.Value = Value;
  //   this.Target = Target;
  // }
  //
  // Completion.normal = new String("normal");
  // Completion.break = new String("break");
  // Completion.continue = new String("continue");
  // Completion.return = new String("return");
  // Completion.throw = new String("throw");
  // Completion.empty = new String("empty");
  //
  // // 6.2.2.1
  // function NormalCompletion(argument)
  // {
  //   return Completion(Completion.normal, value, Completion.empty);
  // }

  // 6.2.4.11
  function InitializeReferencedBinding(nameNode, value, benv, kont, machine)
  {
    const name = nameNode.name;
    const addr = benv.lookup(name);
    machine.storeAlloc(addr, value);
  }

  // 6.2.5.1
  function IsAccessorDescriptor(Desc)
  {
    let result = BOT;
    if (Desc.isUndefined())
    {
      result = result.join(L_FALSE)
    }
    if (Desc.isDefined())
    {
      if (Desc.isGetAbsent() && Desc.isSetAbsent())
      {
        result = result.join(L_FALSE);
      }
      if (Desc.isGetPresent() || Desc.isSetPresent())
      {
        result = result.join(L_TRUE);
      }
    }
    return result;
  }

  // 6.2.5.2
  function IsDataDescriptor(Desc)
  {
    let result = BOT;
    if (Desc.isUndefined())
    {
      result = result.join(L_FALSE);
    }
    if (Desc.isDefined())
    {
      if (Desc.isValueAbsent() && Desc.isWritableAbsent())
      {
        result = result.join(L_FALSE);
      }
      if (Desc.isValuePresent() || Desc.isWritablePresent())
      {
        result = result.join(L_TRUE);
      }
    }
    return result;
  }

  // 6.2.5.3
  function IsGenericDescriptor(Desc)
  {
    let result = BOT;
    if (Desc.isUndefined())
    {
      result = result.join(L_FALSE);
    }
    if (Desc.isDefined())
    {
      if (IsAccessorDescriptor(Desc).isFalse() && IsDataDescriptor(Desc).isFalse())
      {
        result = result.join(L_TRUE);
      }
      if (IsAccessorDescriptor(Desc).isTrue() || IsDataDescriptor(Desc).isTrue())
      {
        result = result.join(L_FALSE);
      }
    }
    return result;
  }

  // 6.2.5.4
  function FromPropertyDescriptor(Desc, node, lkont, kont, machine, cont) // ? undefined | ref
  {
    if (Desc.isUndefined())
    {
      cont(L_UNDEFINED);
    }
    if (Desc.isDefined())
    {
      const obj = ObjectCreate(kont.realm.Intrinsics.get("%ObjectPrototype%"));
      const objAddr = machine.alloc.object(node, kont);
      const objRef = lat.abstRef(objAddr);
      machine.storeAlloc(objAddr, obj);
      if (Desc.isValuePresent())
      {
        CreateDataProperty(objRef, lat.abst1("value"), Desc.getValue(), lkont, kont, machine, success =>
        {
          assert(!success.isFalse());
        })
      }
      if (Desc.isWritablePresent())
      {
        CreateDataProperty(objRef, lat.abst1("writable"), Desc.getWritable(), lkont, kont, machine, success =>
        {
          assert(!success.isFalse());
        })
      }
      if (Desc.isGetPresent())
      {
        CreateDataProperty(objRef, lat.abst1("get"), Desc.getGet(), lkont, kont, machine, success =>
        {
          assert(!success.isFalse());
        })
      }
      if (Desc.isSetPresent())
      {
        CreateDataProperty(objRef, lat.abst1("set"), Desc.getSet(), lkont, kont, machine, success =>
        {
          assert(!success.isFalse());
        })
      }
      if (Desc.isEnumerablePresent())
      {
        CreateDataProperty(objRef, lat.abst1("enumerable"), Desc.getEnumerable(), lkont, kont, machine, success =>
        {
          assert(!success.isFalse());
        })
      }
      if (Desc.isConfigurablePresent())
      {
        CreateDataProperty(objRef, lat.abst1("configurable"), Desc.getConfigurable(), lkont, kont, machine, success =>
        {
          assert(!success.isFalse());
        })
      }
      cont(objRef);
    }
  }

  // 6.2.5.5
  function ToPropertyDescriptor(Obj, lkont, kont, machine, cont) // ? Property
  {
    assert(typeof cont === "function");
    if (Obj.isNonRef())
    {
      throwTypeError("6.2.5.5", lkont, kont, machine);
    }
    if (Obj.isRef())
    {
      let desc = Property.empty();
      HasProperty(Obj, lat.abst1("enumerable"), lkont, kont, machine, hasEnumerable =>
      {
        if (hasEnumerable.isTrue())
        {
          Get(Obj, lat.abst1("enumerable"), lkont, kont, machine, value =>
          {
            const enumerable = ToBoolean(value, lkont, kont, machine);
            step5(desc.setEnumerable(enumerable));
          })
        }
        if (hasEnumerable.isFalse())
        {
          step5(desc);
        }
      })
    }

    function step5(desc)
    {
      HasProperty(Obj, lat.abst1("configurable"), lkont, kont, machine, hasConfigurable =>
      {
        if (hasConfigurable.isTrue())
        {
          Get(Obj, lat.abst1("configurable"), lkont, kont, machine, value =>
          {
            const configurable = ToBoolean(value, lkont, kont, machine);
            step7(desc.setConfigurable(configurable));
          })
        }
        if (hasConfigurable.isFalse())
        {
          step7(desc);
        }
      })
    }

    function step7(desc)
    {
      HasProperty(Obj, lat.abst1("value"), lkont, kont, machine, hasValue =>
      {
        if (hasValue.isTrue())
        {
          Get(Obj, lat.abst1("value"), lkont, kont, machine, value =>
          {
            step9(desc.setValue(value));
          })
        }
        if (hasValue.isFalse())
        {
          step9(desc);
        }
      })
    }

    function step9(desc)
    {
      HasProperty(Obj, lat.abst1("writable"), lkont, kont, machine, hasWritable =>
      {
        if (hasWritable.isTrue())
        {
          Get(Obj, lat.abst1("writable"), lkont, kont, machine, value =>
          {
            const writable = ToBoolean(value, lkont, kont, machine);
            step11(desc.setWritable(writable))
          })
        }
        if (hasWritable.isFalse())
        {
          step11(desc)
        }
      })
    }

    function step11(desc)
    {
      HasProperty(Obj, lat.abst1("get"), lkont, kont, machine, hasGet =>
      {
        if (hasGet.isTrue())
        {
          Get(Obj, lat.abst1("get"), lkont, kont, machine, getter =>
          {
            if (IsCallable(getter, machine).isFalse() && getter.isDefined())
            {
              throwTypeError("6.2.5.5 - [[Get]]", lkont, kont, machine);
            }
            if (IsCallable(getter, machine).isTrue() || getter.isUndefined())
            {
              step13(desc.setGet(getter));
            }
          })
        }
        if (hasGet.isFalse())
        {
          step13(desc);
        }
      })
    }

    function step13(desc)
    {
      HasProperty(Obj, lat.abst1("set"), lkont, kont, machine, hasSet =>
      {
        if (hasSet.isTrue())
        {
          Get(Obj, lat.abst1("set"), lkont, kont, machine, setter =>
          {
            if (IsCallable(setter, machine).isFalse() && setter.isDefined())
            {
              throwTypeError("6.2.5.5 - [[Set]]", lkont, kont, machine);
            }
            if (IsCallable(setter, machine).isTrue() || setter.isUndefined())
            {
              step15(desc.setSet(setter));
            }
          })
        }
        if (hasSet.isFalse())
        {
          step15(desc);
        }
      })
    }

    function step15(desc)
    {
      if (desc.isGetPresent() || desc.isSetPresent())
      {
        if (desc.isValuePresent() || desc.isWritablePresent())
        {
          throwTypeError("6.2.5.5 - Accessor + Data", lkont, kont, machine);
        }
        if (desc.isValueAbsent() && desc.isWritableAbsent())
        {
          cont(desc);
        }
      }
      if (desc.isGetAbsent() && desc.isSetAbsent())
      {
        cont(desc);
      }
    }
  }

  // function GenericKont(name, kctx, f)
  // {
  //   this.name = name;
  //   this.kctx = kctx;
  //   this.f = f;
  // }
  //
  // GenericKont.prototype.equals =
  //     function (x)
  //     {
  //       return x instanceof GenericKont
  //           && this.name === x.name
  //           && (this.kctx === x.kctx || this.kctx.equals(kctx))
  //     }
  // GenericKont.prototype.hashCode =
  //     function ()
  //     {
  //       var prime = 31;
  //       var result = 1;
  //       result = prime * result + Hashcode.hashCode(this.name);
  //       result = prime * result + this.kctx.hashCode();
  //       return result;
  //     }
  // GenericKont.prototype.toString =
  //     function ()
  //     {
  //       return name + "-" + this.kctx;
  //     }
  // GenericKont.prototype.addresses =
  //     function ()
  //     {
  //       return this.kctx.addresses();
  //     }
  // GenericKont.prototype.apply =
  //     function (value, lkont, kont, machine)
  //     {
  //       return this.f(value, lkont, kont, machine);
  //     }

  // 7.1.1
  function ToPrimitive(input, PreferredType, lkont, kont, machine, cont)
  {
    assert(typeof cont === "function");
    // TODO: assert input is an ECMAScript language value
    if (input.isRef())
    {
      let hint;
      if (PreferredType === undefined)
      {
        hint = "default";
      }
      else if (PreferredType === "String")
      {
        hint = "string";
      }
      else
      {
        assert(PreferredType === "Number");
        hint = "number";
      }
      // TODO exotic stuff
      if (hint === "default")
      {
        hint = "number";
      }
      OrdinaryToPrimitive(input, hint, lkont, kont, machine, cont);
    }
    if (input.isNonRef())
    {
      cont(input);
    }
  }

  // 7.1.1.1
  function OrdinaryToPrimitive(O, hint, lkont, kont, machine, cont)
  {
    assert(typeof cont === "function");
    assert(TypeIsObject(O));
    assert(hint === "string" || hint === "number");
    let methodNames;
    if (hint === "string")
    {
      methodNames = ["toString", "valueOf"];
    } else
    {
      methodNames = ["valueOf", "toString"];
    }

    step5(0);

    function step5(i)
    {
      if (i < methodNames.length)
      {
        Get(O, lat.abst1(methodNames[i]), lkont, kont, machine, method =>
        {
          const isCallable = IsCallable(method, machine);
          if (isCallable.isTrue())
          {
            Call(method, O, [], null, null, lkont, kont, machine, result =>
            {
              if (result.isNonRef())
              {
                cont(result.projectPrimitive());
              }
              if (result.isRef())
              {
                step5(i + 1);
              }
            })
          }
          if (isCallable.isFalse())
          {
            step5(i + 1);
          }
        })
      }
      else
      {
        throwTypeError("7.1.1.1", lkont, kont, machine);
      }
    }
  }

  // 7.1.2
  function ToBoolean(argument, machine)
  {
    return argument.ToBoolean();
  }

// 7.1.3
  function ToNumber(argument, node, lkont, kont, machine)
  {
    const result = [];
    // TODO
    result.push(argument.ToNumber());
    return result;
  }

  // 7.1.12
  function ToString(argument, lkont, kont, machine, cont)
  {
    assert(typeof cont === "function");
    if (argument.isUndefined())
    {
      cont(lat.abst1("undefined"));
    }
    if (argument.isNull())
    {
      cont(lat.abst1("null"));
    }
    if (argument.isTrue())
    {
      cont(lat.abst1("true"));
    }
    if (argument.isFalse())
    {
      cont(lat.abst1("false"));
    }
    if (argument.projectNumber() !== BOT)
    {
      cont(argument.projectNumber().ToString()); // TODO mmm...
    }
    if (argument.projectString() !== BOT)
    {
      cont(argument.projectString());
    }
    // TODO symbol
    if (argument.isRef())
    {
      ToPrimitive(argument, "String", lkont, kont, machine, primValue =>
          ToString(primValue, lkont, kont, machine, cont));
    }
  }

  // 7.1.13
  function ToObject(argument, node, lkont, kont, machine)
  {
    if (fastPath && !argument.isNonRef())
    {
      return argument;
    }

    let result = BOT;
    if (argument.isUndefined())
    {
      machine.throw(lat.abst1("7.1.13 - Undefined"), lkont, kont);
    }
    if (argument.isNull())
    {
      machine.throw(lat.abst1("7.1.13 - Null"), lkont, kont);
    }
    const barg = argument.projectBoolean();
    if (barg !== BOT)
    {
      throw new Error("TODO");
    }
    const narg = argument.projectNumber();
    if (narg !== BOT)
    {
      let obj = ObjectCreate(kont.realm.Intrinsics.get("%NumberPrototype%"));
      obj = obj.addInternal("[[NumberData]]", narg);
      const addr = machine.alloc.object(node, kont); // no number-specific alloc?
      machine.storeAlloc(addr, obj);
      const ref = lat.abstRef(addr);
      result = result.join(ref);
    }
    const sarg = argument.projectString();
    if (sarg !== BOT)
    {
      let obj = StringCreate(sarg, kont);
      const addr = machine.alloc.string(node, kont);
      machine.storeAlloc(addr, obj);
      const ref = lat.abstRef(addr);
      result = result.join(ref);
    }
    // TODO symbols
    if (argument.isRef())
    {
      result = result.join(argument);
    }
    return result;
  }

  // 7.1.14
  function ToPropertyKey(argument, lkont, kont, machine, cont)
  {
    assert(typeof cont === "function");
    ToPrimitive(argument, "String", lkont, kont, machine, key =>
      // TODO: If Type(key) is Symbol, then Return key
      ToString(key, lkont, kont, machine, cont));
  }

  // 7.1.15
  function ToLength(argument, lkont, kont, machine)
  {
    // TODO
    return argument;
  }

  // 7.2.1
function RequireObjectCoercible(arg, lkont, kont, machine)
  {
    let result = BOT;
    if (arg.isUndefined() || arg.isNull())
    {
      throwTypeError("7.2.1", lkont, kont, machine);
    }
    if (arg.projectBoolean() !== BOT
        || arg.projectNumber() !== BOT
        || arg.projectString() !== BOT
        //|| arg.projectSymbol() TODO
        || arg.isRef())
    {
      result = result.join(arg);
    }
    return result;
  }

  // 7.2.3
  function IsCallable(argument, machine)
  {
    let result = BOT;
    if (argument.isNonRef())
    {
      result = result.join(L_FALSE);
    }
    if (argument.isRef())
    {
      result = result.join(hasInternal(argument, '[[Call]]', machine));
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
        const snv = lat.hasSameNumberValue(nx, ny);
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
      result = result.join(lat.abst1(lat.hasSameStringValue(x, y)));
    }
    if (tx.has(Types.Boolean))
    {
      const bx = x.projectBoolean();
      const by = y.projectBoolean();
      result = result.join(lat.abst1(bx.equals(by)));
    }
    // TODO: symbol
    if (x.isRef())
    {
      result = result.join(lat.abst1(x.addresses().equals(y.addresses())));
    }
    return result;
  }

  // 7.3.1
  function Get(O, P, lkont, kont, machine, cont)
  {
    assertIsObject(O);
    assert(IsPropertyKey(P).isTrue());
    return callInternal(O, "[[Get]]", [P, O], lkont, kont, machine, cont);
  }

  // 7.3.4
  function CreateDataProperty(O, P, V, lkont, kont, machine, cont)
  {
    assertIsObject(O);
    assertIsPropertyKey(P);
    const newDesc = Property.fromData(V, L_TRUE, L_TRUE, L_TRUE);
    callInternal(O, "[[DefineOwnProperty]]", [P, newDesc], lkont, kont, machine, cont);
  }

  // 7.3.6
  function CreateDataPropertyOrThrow(O, P, V, lkont, kont, machine, cont)
  {
    assertIsObject(O);
    assertIsPropertyKey(P);
    CreateDataProperty(O, P, V, lkont, kont, machine, success =>
    {
      if (success.isFalse())
      {
        throwTypeError("7.3.6", lkont, kont, machine);
      }
      if (success.isTrue())
      {
        cont(L_TRUE);
      }
    })
  }

  // 7.3.7
  function DefinePropertyOrThrow(O, P, desc, lkont, kont, machine, cont) // ? bool
  {
    assert(typeof cont === "function");
    callInternal(O, "[[DefineOwnProperty]]", [P, desc], lkont, kont, machine, success =>
    {
      if (success.isTrue())
      {
        cont(L_TRUE);
      }
      if (success.isFalse())
      {
        throw new Error("TODO");
      }
    })
  }

  // 7.3.10
  function HasProperty(O, P, lkont, kont, machine, cont)
  {
    assert(typeof cont === "function");
    return callInternal(O, "[[HasProperty]]", [P], lkont, kont, machine, cont);
  }

  // 7.3.11
  function HasOwnProperty(O, P, lkont, kont, machine, cont)
  {
    assert(typeof cont === "function");
    assertIsObject(O);
    assert(IsPropertyKey(P).isTrue());
    callInternal(O, "[[GetOwnProperty]]", [P], lkont, kont, machine, desc =>
    {
      if (desc.isUndefined())
      {
        cont(L_FALSE);
      }
      if (desc.isDefined())
      {
        cont(L_TRUE);
      }
    })
  }

  // 7.3.12
  function Call(F, V, argumentsList, node, benv, lkont, kont, machine, cont)
  {
    assert(typeof cont === "function");
    // non-spec: argumentsList should be optional, and [] if not passed
    assert(Array.isArray(argumentsList));
    const ic = IsCallable(F, machine);
    if (ic.isFalse())
    {
      throwTypeError("not a function", lkont, kont, machine);
    }
    if (ic.isTrue())
    {
      const frame = new CallKont(cont, F, V, argumentsList, node, benv);
      applyProc(node, F, argumentsList, V, benv, [frame].concat(lkont), kont, machine);
    }
  }

  function CallKont(cont, F, V, argumentsList, node, benv)
  {
    this.cont = cont;
    this.F = F;
    this.V = V;
    this.argumentsList = argumentsList;
    this.node = node;
    this.benv = benv;
  }

  CallKont.prototype.equals =
      function (x)
      {
        return x instanceof CallKont
            && this.F.equals(x.F)
            && this.V.equals(x.V)
            && this.argumentsList.equals(x.argumentsList)
            && this.node === x.node
            && (this.benv === x.benv || this.benv.equals(x.benv))
      }
  CallKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.F.hashCode();
        result = prime * result + this.V.hashCode();
        result = prime * result + this.argumentsList.hashCode();
        result = prime * result + this.node.hashCode();
        result = prime * result + this.benv.hashCode();
        return result;
      }
  CallKont.prototype.toString =
      function ()
      {
        return "call-" + this.V + "-" + this.node.tag;
      }
  CallKont.prototype.addresses =
      function ()
      {
        return EMPTY_ADDRESS_SET;
      }
  CallKont.prototype.apply =
      function (value, lkont, kont, machine)
      {
        return this.cont(value); // assume no change in other params
      }

  // 7.1.15
  function ToLength(argument, lkont, kont, machine)
  {
    // TODO!
    return argument.projectNumber();
  }

  // 7.3.16
  function CreateArrayFromList(elements, node, lkont, kont, machine)///, cont)
  {
    assert(Array.isArray(elements)); // TODO: this is a weaker assert than in spec
    // TODO: spec
    let arr = createArray(kont.realm);
    for (let i = 0; i < elements.length; i++)
    {
      arr = arr.addProperty(lat.abst1(String(i)), Property.fromData(elements[i], L_TRUE, L_TRUE, L_TRUE));
    }
    arr = arr.addProperty(P_LENGTH, Property.fromData(lat.abst1(elements.length), L_TRUE, L_TRUE, L_TRUE));

//      const arrAddress = alloc.array(node, kont);
    //machine.storeAlloc(arrAddress, arr);

    //const arrRef = lat.abstRef(arrAddress);
    //return cont(arrRef, store);
    return arr;
  }

  // 7.3.17
  function LengthOfArrayLike(obj, lkont, kont, machine, cont)
  {
    assert(obj.isRef());
    Get(obj, P_LENGTH, lkont, kont, machine, value =>
        cont(ToLength(value, lkont, kont, machine)));
  }

  // 7.3.18
  function CreateListFromArrayLike(obj, elementTypes, lkont, kont, machine, cont) // ? List
  {
    assert(typeof cont === "function");
    if (elementTypes === undefined)
    {
      elementTypes = Sets.of(Types.Undefined, Types.Null, Types.Boolean, Types.String, Types.Symbol, Types.Number, Types.Object);
    }
    if (obj.isNonRef())
    {
      throwTypeError("7.3.17", lkont, kont, machine);
    }
    if (obj.isRef())
    {
      LengthOfArrayLike(obj, lkont, kont, machine, len =>
      {
        const list = [];
        let index = L_0;
        let seen = ArraySet.empty();
        while ((!seen.contains(index)) && lat.lt(index, len).isTrue())
        {
          seen = seen.add(index);
          const indexName = index.ToString(); // TODO actual ToString call
          const next = doProtoLookup(indexName, obj.addresses(), machine); // TODO Get call
          const typeNext = Type(next);
          if (Sets.intersection(elementTypes, typeNext).size > 0)
          {
            list.push(next);
          }
          index = lat.add(index, L_1);
        }
        cont(list);
      })
    }
  }

  // 7.3.20
  function OrdinaryHasInstance(C, O, lkont, kont, machine, cont)
  {
    const result = BOT;
    const ic = IsCallable(C, machine);
    if (ic.isFalse())
    {
      cont(L_FALSE);
    }
    if (ic.isTrue())
    {
      // [[BoundTargetFunction]] // TODO
      if (O.isNonRef())
      {
        cont(L_FALSE);
      }
      if (O.isRef())
      {
        Get(C, P_PROTOTYPE, lkont, kont, machine, P =>
        {
          if (P.isNonRef())
          {
            throwTypeError("7.3.19", lkont, kont, machine);
          }
          if (P.isRef())
          {
            const W = [O];
            while (W.length > 0)
            {
              const O = W.pop();
              const getProto = callInternal(O, "[[GetPrototypeOf]]", [], lkont, kont, machine, O =>
              {
                if (O.isNull())
                {
                  cont(L_FALSE);
                }
                if (O.isNonNull())
                {
                  const sv = SameValue(P, O);
                  if (sv.isTrue())
                  {
                    cont(L_TRUE);
                  }
                  if (sv.isFalse())
                  {
                    W.push(O);
                  }
                }
              })
            }
          }
        })
      }
    }
  }

  // 8.2
  function Realm()
  {
    this.Intrinsics = undefined;
    this.GlobalObject = undefined;
    this.GlobalEnvironment = undefined;
  }

  Realm.prototype.equals =
      function (x)
      {
        if (this === x)
        {
          return true;
        }

        throw new Error("TODO: multi-realm");
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
  //   const objProtoa = alloc.object();
  //   intrinsics.add("%ObjectPrototype%", )
  // }

  // 9.1.1.1
  function OrdinaryGetPrototypeOf(O, lkont, kont, machine, cont) // ref | null
  {
    assert(typeof cont === "function");
    const P = getInternal(O, "[[Prototype]]", machine);
    assert(P.isRef() || P.isNull())
    cont(P);
  }

  // 9.1.2.1
  function OrdinarySetPrototypeOf(O, V, lkont, kont, machine, cont) // bool
  {
    assert(typeof cont === "function");
    assertIsObjectOrNull(V);
    const extensible = getInternal(O, "[[Extensible]]", machine);
    const current = getInternal(O, "[[Prototype]]", machine);
    const sv = SameValue(V, current);
    let result = BOT;
    if (sv.isTrue())
    {
      result = result.join(L_TRUE);
    }
    if (sv.isFalse())
    {
      if (extensible.isFalse())
      {
        result = result.join(L_FALSE);
      }
      if (extensible.isTrue())
      {
        // TODO: steps 6,7,8 (loop)
        assignInternal(O, "[[Prototype]]", V, machine);
        result = result.join(L_TRUE);
      }
    }
    cont(result);
  }

  // 9.1.5.1
  function OrdinaryGetOwnProperty(O, P, lkont, kont, machine, cont) // undefined | Property
  {
    assert(typeof cont === "function");
    assert(IsPropertyKey(P).isTrue());
    for (const a of O.addresses())
    {
      const obj = machine.storeLookup(a);
      if (obj.propertyPresent(P))
      {
        const D = obj.getProperty(P);
        assert(D instanceof Property);
        cont(D);
      }
      if (obj.propertyAbsent(P))
      {
        cont(L_UNDEFINED);
      }
    }
  }

  // 9.1.6.1
  function OrdinaryDefineOwnProperty(O, P, Desc, lkont, kont, machine, cont) // bool
  {
    assert(typeof cont === "function");
    callInternal(O, "[[GetOwnProperty]]", [P], lkont, kont, machine, current =>
    {
      const extensible = lookupInternal(O, "[[Extensible]]", machine);
      ValidateAndApplyPropertyDescriptor(O, P, extensible, Desc, current, lkont, kont, machine, cont)
    });
  }

  // 9.1.6.3
  function ValidateAndApplyPropertyDescriptor(O, P, extensible, Desc, current, lkont, kont, machine, cont) // bool
  {
    assert(typeof cont === "function");
    // step 1
    if (O.isDefined())
    {
      assert(IsPropertyKey(P).isTrue());
    }
    let result = BOT;
    // step 2
    if (current.isUndefined())
    {
      if (extensible.isFalse())
      {
        result = result.join(L_FALSE);
      }
      if (extensible.isTrue())
      {
        if (IsGenericDescriptor(Desc).isTrue() || IsDataDescriptor(Desc).isTrue())
        {
          if (O.isDefined())
          {
            const D = Property.fromData(Desc.getValue(), Desc.getWritable(), Desc.getEnumerable(), Desc.getConfigurable());
            const as = O.addresses();
            for (const a of as)
            {
              let obj = machine.storeLookup(a);
              obj = obj.addProperty(P, D);
              machine.storeUpdate(a, obj);
            }
          }
        }
        if (IsGenericDescriptor(Desc).isFalse() && IsDataDescriptor(Desc).isFalse())
        {
          assert(IsAccessorDescriptor(Desc).isTrue())
          if (O.isDefined())
          {
            const D = Property.fromAccessor(Desc.getGet(), Desc.getSet(), Desc.getEnumerable(), Desc.getConfigurable());
            const as = O.addresses();
            for (const a of as)
            {
              let obj = machine.storeLookup(a);
              obj = obj.addProperty(P, D);
              machine.storeUpdate(a, obj);
            }
          }
        }
        result = result.join(L_TRUE);
      }
    }
    // step 3
    let step5 = false;
    if (current.isDefined())
    {
      if (Desc.isValueAbsent() && Desc.isGetAbsent() && Desc.isSetAbsent() && Desc.isWritableAbsent() && Desc.isEnumerableAbsent() && Desc.isConfigurableAbsent())
      {
        result = result.join(L_TRUE);
      }
      if (Desc.isValuePresent() || Desc.isGetPresent() && Desc.isSetPresent() && Desc.isWritablePresent() && Desc.isEnumerablePresent() && Desc.isConfigurablePresent())
      {
        if (current.getConfigurable().isFalse())
        {
          if (Desc.isConfigurablePresent() && Desc.getConfigurable().isTrue())
          {
            result = result.join(L_FALSE);
          }
          if (Desc.isConfigurableAbsent() || Desc.getConfigurable().isFalse())
          {
            if (Desc.isEnumerablePresent() && SameValue(Desc.getEnumerable(), current.getEnumerable()).isFalse())
            {
              result = result.join(L_FALSE);
            }
            if (Desc.isEnumerableAbsent() || SameValue(Desc.getEnumerable(), current.getEnumerable()).isTrue())
            {
              step5 = true;
            }
          }
        }
        if (current.getConfigurable().isTrue())
        {
          step5 = true;
        }
      }

      if (step5)
      {
        if (IsGenericDescriptor(Desc).isTrue())
        {
          // no further validation is required
        }
        if (IsGenericDescriptor(Desc).isFalse())
        {
          machine.throw(lat.abst1("NYI"), lkont, kont);
        }
      }
    }
    cont(result);
  }

  // 9.1.7.1
  function OrdinaryHasProperty(O, P, lkont, kont, machine, cont) // bool
  {
    assert(typeof cont === "function");
    assert(IsPropertyKey(P).isTrue());
    callInternal(O, "[[GetOwnProperty]]", [P], lkont, kont, machine, hasOwn =>
    {
      if (hasOwn.isDefined())
      {
        cont(L_TRUE);
      }
      if (hasOwn.isUndefined())
      {
        const parent = callInternal(O, "[[GetPrototypeOf]]", [], lkont, kont, machine, parent =>
        {
          if (parent.isNonNull())
          {
            callInternal(parent, "[[HasProperty]]", [P], lkont, kont, machine, cont);
          }
          if (parent.isNull())
          {
            cont(L_FALSE);
          }
        })
      }
    })
  }


  // 9.1.8.1
  function OrdinaryGet(O, P, Receiver, lkont, kont, machine, cont)
  {
    assert(typeof cont === "function");
    const value = doProtoLookup(P, O.addresses(), machine);
    cont(value);
  }

  // 9.1.9.1
  function OrdinarySet(O, P, V, Receiver, cont)
  {
    assert(typeof cont === "function");
    assert(IsPropertyKey(P).isTrue());
    // TODO
    throw new Error("TODO 9.1.9.1");
  }

  // 9.1.11.1
  function OrdinaryOwnPropertyKeys(O, lkont, kont, machine, cont)
  {
    assert(typeof cont === "function");
    let keys = ArraySet.empty();
    const as = O.addresses().values();
    for (const a of as)
    {
      const obj = machine.storeLookup(a);
      // TODO: symbols, ascending numeric, chronological order, etc.
      // TODO: subsumption checking

      keys = keys.addAll(obj.names());
    }
    cont(keys.values());
  }

  // 9.1.12
  function ObjectCreate(proto, internalSlotsList) // Obj
  {
    if (internalSlotsList === undefined)
    {
      internalSlotsList = [];
    }
    let obj = Obj.empty();
    internalSlotsList.forEach((slot) => obj = obj.setInternal(slot, BOT));
    // step 3
    // 9.1.1
    obj = obj.setInternal("[[GetPrototypeOf]]", SetValueNoAddresses.from1(OrdinaryGetPrototypeOf));
    // 9.1.2
    obj = obj.setInternal("[[SetPrototypeOf]]", SetValueNoAddresses.from1(OrdinarySetPrototypeOf));
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
  function OrdinaryCreateFromConstructor(constructor, intrinsicDefaultProto, internalSlotsList, lkont, kont, machine)
  {
    assert(kont.realm.Intrinsics.has(intrinsicDefaultProto)); // TODO 'intension' part
    const proto = GetPrototypeFromConstructor(constructor, intrinsicDefaultProto, lkont, kont, machine);
    return ObjectCreate(proto, internalSlotsList);
  }

  // 9.1.14
  function GetPrototypeFromConstructor(constructor, intrinsicDefaultProto, lkont, kont, machine)
  {
    assert(kont.realm.Intrinsics.has(intrinsicDefaultProto)); // TODO 'intension' part
    assert(IsCallable(constructor, machine));
    const get = Get(constructor, P_PROTOTYPE, lkont, kont, machine);
    const result = [];
    for (const proto of get)
    {
      if (proto.isNonRef())
      {
        // TODO realms
        result.push(kont.realm.Intrinsics.get(intrinsicDefaultProto));
      }
      if (proto.isRef())
      {
        result.push(proto);
      }
    }
    return result;
  }

  // 9.4.3.4
  function StringCreate(lprim, kont)
  {
    let obj = Obj.empty();
    obj = obj.setInternal("[[Prototype]]", kont.realm.Intrinsics.get("%StringPrototype%"));
    obj = obj.setInternal("[[StringData]]", lprim);
    obj = obj.setInternal("[[Get]]", SetValueNoAddresses.from1(OrdinaryGet));
    obj = obj.addProperty(P_LENGTH, Property.fromData(lprim.stringLength(), L_TRUE, L_TRUE, L_TRUE));
    return obj;
  }

  // 12.10.4
  function InstanceofOperator(O, C, lkont, kont, machine, cont)
  {
    if (O.isNonRef())
    {
      cont(L_FALSE);
    }
    // TODO instHandler
    const c = IsCallable(C, machine);
    if (c.isFalse())
    {
      throw new Error("TODO");
    }
    if (c.isTrue())
    {
      OrdinaryHasInstance(C, O, lkont, kont, machine, cont)
    }
  }

  // 13.7.5.12
  // function ForInOfHeadEvaluation(TDZnames, expr, iterationKind, lkont, kont, machine)

  // 19.1.2.2
  function objectCreate(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [O, Properties] = operandValues;
    if (O.isNonRef() && O.isNonNull())
    {
      throwTypeError("19.1.2.2", lkont, kont, machine);
    }
    if (O.isRef() || O.isNull())
    {
      const objo = ObjectCreate(O);
      const obja = machine.alloc.object(application, kont);
      machine.storeAlloc(obja, objo);
      const obj = lat.abstRef(obja);
      if (Properties && Properties.isDefined())
      {
        ObjectDefineProperties(obj, Properties, application, lkont, kont, machine, value =>
          machine.continue(value, lkont, kont));
      }
      if (!Properties || Properties.isUndefined())
      {
        machine.continue(obj, lkont, kont);
      }
    }
  }

  // 19.1.2.3
  function objectDefineProperties(O, Properties, node, lkont, kont, machine)
  {
    ObjectDefineProperties(O, Properties, node, lkont, kont, machine, value =>
      machine.continue(value, lkont, kont));
  }

  // 19.1.2.3.1
  function ObjectDefineProperties(O, Properties, node, lkont, kont, machine, cont)
  {
    if (O.isNonRef())
    {
      throwTypeError("19.1.2.3.1", lkont, kont, machine);
    }
    if (O.isRef())
    {
      const props = ToObject(Properties, node, lkont, kont, machine);
      callInternal(props, "[[OwnPropertyKeys]]", [], lkont, kont, machine, keys =>
      {
        step5(keys, []);
      });

      function step5(keys, descriptors)
      {
        if (keys.length === 0)
        {
          step6(descriptors);
        }
        else
        {
          const nextKey = keys[0];
          callInternal(props, "[[GetOwnProperty]]", [nextKey], lkont, kont, machine, propDesc =>
          {
            if (propDesc.isDefined() && propDesc.getEnumerable().isTrue()) // TODO `isEnumerable` etc. should be API on `Property`
            {
              Get(props, nextKey, lkont, kont, machine, descObj =>
              {
                ToPropertyDescriptor(descObj, lkont, kont, machine, desc =>
                {
                  step5(keys.slice(1), Arrays.push([nextKey, desc], descriptors));
                })
              })
            }
            if (propDesc.isUndefined() || propDesc.isEnumerableAbsent() || propDesc.getEnumerable().isFalse()) // TODO `isNotEnumerable` etc. should be API on `Property`
            {
              step5(keys.slice(1), descriptors);
            }
          })
        }
      }

      function step6(descriptors)
      {
        if (descriptors.length > 0)
        {
          const pair = descriptors[0];
          const P = pair[0];
          const desc = pair[1];
          DefinePropertyOrThrow(O, P, desc, lkont, kont, machine, _ =>
              step6(descriptors.slice(1)));
        }
      }

      cont(O);
    }
  }

  // 19.1.2.4
  function objectDefineProperty(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [O, P, Attributes] = operandValues;
    if (O.isNonRef())
    {
      throwTypeError("19.1.2.4", lkont, kont, machine);
    }
    if (O.isRef())
    {
      ToPropertyKey(P, lkont, kont, machine, key =>
        ToPropertyDescriptor(Attributes, lkont, kont, machine, desc =>
          DefinePropertyOrThrow(O, key, desc, lkont, kont, machine, _ =>
            machine.continue(O, lkont, kont))));
    }
  }

  // 19.1.2.6
  function objectFreeze(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [O] = operandValues;
    // TODO
    machine.continue(O, lkont, kont);
  }

  // 19.1.2.8
  function objectGetOwnPropertyDescriptor(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [O, P] = operandValues;
    const obj = ToObject(O, application, lkont, kont, machine);
    ToPropertyKey(P, lkont, kont, machine, key =>
      callInternal(obj, "[[GetOwnProperty]]", [key], lkont, kont, machine, desc =>
          FromPropertyDescriptor(desc, application, lkont, kont, machine, value =>
              machine.continue(value, lkont, kont))));
  }

  // 19.1.2.9
  function objectGetOwnPropertyNames(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [O] = operandValues;
    GetOwnPropertyKeys(O, Sets.of(Types.String), application, lkont, kont, machine, ownProps =>
    {
      machine.continue(ownProps, lkont, kont);
    });
  }

  // 19.1.2.11.1
  function GetOwnPropertyKeys(O, type, node, lkont, kont, machine, cont)
  {
    assert(typeof cont === "function");
    const obj = ToObject(O, node, lkont, kont, machine);
    callInternal(obj, "[[OwnPropertyKeys]]", [], lkont, kont, machine, keys =>
    {
      let nameList = [];
      for (const nextKey of keys)
      {
        if (Sets.intersection(type, Type(nextKey)).size > 0)
        {
          nameList.push(nextKey);
        }
      }
      const arr = CreateArrayFromList(nameList, node, lkont, kont, machine);
      const arrAddress = machine.alloc.array(node, kont);
      machine.storeAlloc(arrAddress, arr);
      const ref = lat.abstRef(arrAddress);
      cont(ref);
    });
  }

  // 19.1.2.12
  function objectGetPrototypeOf(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [O] = operandValues;
    const obj = ToObject(O, application, lkont, kont, machine);
    callInternal(O, "[[GetPrototypeOf]]", [], lkont, kont, machine, value =>
      machine.continue(value, lkont, kont));
  }

  // 19.1.2.21
  function objectSetPrototypeOf(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [Orand, Proto] = operandValues;
    const O = RequireObjectCoercible(Orand, lkont, kont, machine);
    // const typeProto = Type(proto);
    // const typeObjectNull = Sets.intersection(typeProto, new Set([Types.Object, Types.Null]))
    // const neitherObjectNorNull = typeProto.size > typeObjectNull.size;
    // const objectOrNull = typeObjectNull.size > 0;
    if (isNeitherObjectNorNull(Proto))
    {
      throwTypeError("19.1.2.20-1", lkont, kont, machine);
    }
    if (isObject(Proto) || isNull(Proto))
    {
      if (O.isNonRef())
      {
        machine.continue(O, lkont, kont);
      }
      if (O.isRef())
      {
        callInternal(O, "[[SetPrototypeOf]]", [Proto], lkont, kont, machine, value =>
        {
          if (value.isFalse())
          {
            throwTypeError("19.1.2.20-2", lkont, kont, machine);
          }
          if (value.isTrue())
          {
            machine.continue(O, lkont, kont);
          }
        })
      }
    }
  }

  // 19.2.1.1.1: placeholder, not even close to spec
//  function createDynamicFunction(constructor, newTarget, kind, args, benv, lkont, kont, machine) // specc sig
  function createDynamicFunction(argsText, bodyText, benv, lkont, kont, machine)
  {
    const functionText = "(function (" + argsText.join(", ") + ") {" + bodyText + "})";
    const functionNode = Ast.createAst(new StringResource(functionText)).body[0].expression;
    const closureRef = allocateClosure(functionNode, benv, lkont, kont, machine);
    machine.continue(closureRef, lkont, kont);
  }

  function $createFunction(argsText, bodyText, benv, lkont, kont, machine)
  {
    createDynamicFunction(argsText, bodyText, benv, lkont, kont, machine);
  }



  // 19.2.3.1
  function functionApply(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const ic = IsCallable(thisValue, machine);
    if (ic.isFalse())
    {
      throwTypeError("19.2.3.1", lkont, kont, machine);
    }
    if (ic.isTrue())
    {
      const thisArg = operandValues[0];
      const argArray = operandValues[1];
      // TODO: PrepareForTailCall()
      if (!argArray)
      {
        applyProc(application, thisValue, [], thisArg, null, lkont, kont, machine);
      }
      else
      {
        const r1 = CreateListFromArrayLike(argArray, undefined, lkont, kont, machine, argList =>
        {
          // TODO: PrepareForTailCall()
          applyProc(application, thisValue, argList, thisArg, null, lkont, kont, machine);
        })
      }
    }
  }

  // 19.2.3.3
  function functionCall(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    let result = [];
    const ic = IsCallable(thisValue, machine);
    if (ic.isFalse())
    {
      throwTypeError("19.2.3.3", lkont, kont, machine);
    }
    if (ic.isTrue())
    {
      const thisArg = operandValues[0];
      const argList = operandValues.slice(1);
      // TODO: PrepareForTailCall()
      applyProc(application, thisValue, argList, thisArg, null, lkont, kont, machine);
    }
  }


  function createClosure(node, scope, realm)
  {
    var obj = createFunction(new ObjClosureCall(node, scope), realm);
    return obj;
  }

  function createPrimitive(applyFunction, applyConstructor, realm)
  {
    var obj = createFunction(new ObjPrimitiveCall(applyFunction, applyConstructor), realm);
    return obj;
  }

  function createFunction(Call, realm)
  {
    var obj = ObjectCreate(realm.Intrinsics.get("%FunctionPrototype%"));
    obj = obj.setInternal("[[Call]]", SetValue.from1(Call));
    return obj;
  }

  function createContext(application, thisValue, realm, userContext, stackAs, previousStack, machine)
  {
    var ctx0 = new JipdaContext(application, thisValue, realm, userContext, EMPTY_ADDRESS_SET/*stackAs*/);
    var ctx = ctx0.intern(machine.contexts);
    if (ctx === ctx0)
    {
      //console.log("created new context", ctx._id, (application || "<root>").toString(), "this", thisValue);
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
        machine.increaseSstorei();
      }
    }
    // ctx._sstorei = machine.getSstorei();
    return ctx;
  }

  function JipdaContext(ex, thisValue, realm, userContext, as)
  {
    assert(thisValue);
    assert(realm);
    assert(as instanceof ArraySet);
    this.ex = ex;
    this.thisValue = thisValue;
    this.realm = realm;
    this.userContext = userContext;
    this.as = as;
    this._stacks = null;
    this._id = -1;
    // this._sstorei = -1;
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
            && this.realm.equals(ctx.realm)
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

  JipdaContext.prototype.stackAddresses =
      function (lkont)
      {
        let addresses = this.addresses();
        for (const frame of lkont)
        {
          addresses = addresses.join(frame.addresses());
        }
        return addresses;
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

  ////////////////////////////////


  function Stack(lkont, kont)
  {
    this.lkont = lkont;
    this.kont = kont;
    this._id = -1;
  }

  Stack.prototype.equals =
      function (x)
      {
        if (this === x)
        {
          return true;
        }
        return this.lkont.equals(x.lkont)
            && this.kont === x.kont;
      }

  Stack.prototype.toString =
      function ()
      {
        return "[" + this.lkont + ", " + this.kont + "]";
      }

  Stack.prototype.unroll =
      function ()
      {
        function unroll(stack, seen)
        {

          if (seen[stack._id])
          {
            return [[stack, "*"]];
          }
          seen[stack._id] = true;

          if (stack.kont._stacks.size === 0)
          {
            return [[stack]];
          }

          const result = [];
          for (const stack2 of stack.kont._stacks)
          {
            const unrolled = unroll(stack2, seen.slice(0));
            for (const ur of unrolled)
            {
              result.push([stack].concat(ur))
            }
          }
          return result;
        }

        return unroll(this, []);
      }


  function Stackget(st, machine)
  {
    for (let i = 0; i < machine.stacks.length; i++)
    {
      if (machine.stacks[i].equals(st))
      {
        return machine.stacks[i];
      }
    }
    st._id = machine.stacks.push(st) - 1;
    return st;
  }


  function initialize(machine)
  {

    let nativeCounter = 0;

    function allocNative()
    {
      return "nat-" + nativeCounter++;
    }

    function initialize2(benv)
    {
      const realm = new Realm();
      const intrinsics = new Intrinsics();
      realm.Intrinsics = intrinsics;

      const globala = allocNative();
      const globalRef = lat.abstRef(globala);
      realm.GlobalObject = globalRef;

      realm.GlobalEnv = benv;

      // const queueA = "ScriptJobs";
      // machine.storeAlloc(queueA, new JobQueue());

      const objectPa = allocNative();
      const objectProtoRef = lat.abstRef(objectPa);
      intrinsics.add("%ObjectPrototype%", objectProtoRef);
      const functionPa = allocNative();
      const functionProtoRef = lat.abstRef(functionPa);
      intrinsics.add("%FunctionPrototype%", functionProtoRef);

      function registerPrimitiveFunction(object, propertyName, applyFunction, applyConstructor)
      {
        var primFunObject = createPrimitive(applyFunction, applyConstructor, realm);
        var primFunObjectAddress = allocNative();
        machine.storeAlloc(primFunObjectAddress, primFunObject); // TODO: danger, relies on 'init store'
        return registerProperty(object, propertyName, lat.abstRef(primFunObjectAddress));
      }

      function registerProperty(object, propertyName, value)
      {
        object = object.addProperty(lat.abst1(propertyName), Property.fromData(value, L_TRUE, L_FALSE, L_TRUE));
        return object;
      }

// BEGIN GLOBAL
      var global = ObjectCreate(objectProtoRef);

      // ECMA 15.1.1 value properties of the global object (no "null", ...)
      global = registerProperty(global, "undefined", L_UNDEFINED);
      global = registerProperty(global, "NaN", lat.abst1(NaN));
      global = registerProperty(global, "Infinity", lat.abst1(Infinity));

      // specific interpreter functions
//  global = registerPrimitiveFunction(global, globala, "$meta", $meta);
      global = registerPrimitiveFunction(global, "$join", $join);
      global = registerPrimitiveFunction(global, "print", _print);
      // end specific interpreter functions

      // BEGIN OBJECT
      let objectP = ObjectCreate(L_NULL);
//  objectP.toString = function () { return "~Object.prototype"; }; // debug
      const objecta = allocNative();
      const object = lat.abstRef(objecta);
      objectP = registerProperty(objectP, "constructor", object);
      global = global.addProperty(lat.abst1("Object"), Property.fromData(object, L_TRUE, L_TRUE, L_TRUE));
      let objecto = createPrimitive(null, objectConstructor, realm);
      
      // 19.1.2
      // TODO objecto = registerPrimitiveFunction(objecto, "assign", objectAssign);
      objecto = registerPrimitiveFunction(objecto, "create", objectCreate);
      objecto = registerPrimitiveFunction(objecto, "defineProperties", objectDefineProperties);
      objecto = registerPrimitiveFunction(objecto, "defineProperty", objectDefineProperty);
      // TODO objecto = registerPrimitiveFunction(objecto, "entries", objectEntries);
      objecto = registerPrimitiveFunction(objecto, "freeze", objectFreeze);
      // TODO objecto = registerPrimitiveFunction(objecto, "fromEntries", objectFromEntries);
      objecto = registerPrimitiveFunction(objecto, "getOwnPropertyDescriptor", objectGetOwnPropertyDescriptor);
      // TODO objecto = registerPrimitiveFunction(objecto, "getOwnPropertyDescriptors", objectGetOwnPropertyDescriptors);
      objecto = registerPrimitiveFunction(objecto, "getOwnPropertyNames", objectGetOwnPropertyNames);
      // TODO objecto = registerPrimitiveFunction(objecto, "getOwnPropertySymbols", objectGetOwnPropertySymbols);
      objecto = registerPrimitiveFunction(objecto, "getPrototypeOf", objectGetPrototypeOf);
      // TODO objecto = registerPrimitiveFunction(objecto, "is", objectIs);
      // TODO objecto = registerPrimitiveFunction(objecto, "isExtensible", objectIsExtensible);
      // TODO objecto = registerPrimitiveFunction(objecto, "isFrozen", objectIsFrozen);
      // TODO objecto = registerPrimitiveFunction(objecto, "isSealed", objectIsSealed);
      // TODO objecto = registerPrimitiveFunction(objecto, "keys", objectKeys);
      // TODO objecto = registerPrimitiveFunction(objecto, "preventExtensions", objectPreventExtensions);
      objecto = objecto.addProperty(P_PROTOTYPE, Property.fromData(objectProtoRef, L_TRUE, L_TRUE, L_TRUE));
      // TODO object = registerPrimitiveFunction(object, "seal", objectSeal);
      objecto = registerPrimitiveFunction(objecto, "setPrototypeOf", objectSetPrototypeOf);
      // TODO object = registerPrimitiveFunction(objecto, "values", objectValues);

      machine.storeAlloc(objecta, objecto);

      // 19.1.3
      objectP = registerPrimitiveFunction(objectP, "hasOwnProperty", objectProtoHasOwnProperty);
      objectP = registerPrimitiveFunction(objectP, "isPrototypeOf", objectProtoIsPrototypeOf);
      machine.storeAlloc(objectPa, objectP);
      // END OBJECT


      // BEGIN FUNCTION
      var functionP = ObjectCreate(objectProtoRef);
      var functiona = allocNative();
      var functionP = registerProperty(functionP, "constructor", lat.abstRef(functiona));


      var fun = createPrimitive(functionFunction, functionFunction, realm);
      fun = fun.addProperty(P_PROTOTYPE, Property.fromData(functionProtoRef, L_TRUE, L_TRUE, L_TRUE));
      global = global.addProperty(lat.abst1("Function"), Property.fromData(lat.abstRef(functiona), L_TRUE, L_TRUE, L_TRUE));
      machine.storeAlloc(functiona, fun);

      functionP = registerPrimitiveFunction(functionP, "call", functionCall);
      functionP = registerPrimitiveFunction(functionP, "apply", functionApply);

      machine.storeAlloc(functionPa, functionP);

      const emptyFunctionNode = Ast.createAst(new StringResource("(function () {})")).body[0].expression;

      function functionFunction(application, operandValues, thisValue, benv, lkont, kont, machine)
      {
        if (operandValues.length === 0)
        {
          const closureRef = allocateClosure(emptyFunctionNode, benv, lkont, kont, machine);
          machine.continue(closureRef, lkont, kont);
        }
        else
        {
          const bodyText = operandValues[operandValues.length - 1].conc1();
          const argsText = [];
          for (let i = 0; i < operandValues.length - 1; i++)
          {
            argsText.push(operandValues[i].conc1());
          }
          createDynamicFunction(argsText, bodyText, benv, lkont, kont, machine);
        }
      }
      // END FUNCTION


      // BEGIN ERROR
      const errorPa = allocNative();
      const errorProtoRef = lat.abstRef(errorPa);
      intrinsics.add("%ErrorPrototype%", errorProtoRef);

      var errorP = ObjectCreate(intrinsics.get("%ObjectPrototype%"));
      var errora = allocNative();
      var errorP = registerProperty(errorP, "constructor", lat.abstRef(errora));
      var error = createPrimitive(errorFunction, errorConstructor, realm);
      error = error.addProperty(P_PROTOTYPE, Property.fromData(errorProtoRef, L_TRUE, L_TRUE, L_TRUE));
      global = global.addProperty(lat.abst1("Error"), Property.fromData(lat.abstRef(errora), L_TRUE, L_TRUE, L_TRUE));
      machine.storeAlloc(errora, error);
      machine.storeAlloc(errorPa, errorP);
      // END ERROR


      // BEGIN STRING
      const stringPa = allocNative();
      const stringProtoRef = lat.abstRef(stringPa);
      intrinsics.add("%StringPrototype%", stringProtoRef);
      var stringP = ObjectCreate(intrinsics.get("%ObjectPrototype%"));
      //  stringP.toString = function () { return "~String.prototype"; }; // debug
      var stringa = allocNative();
      var stringP = registerProperty(stringP, "constructor", lat.abstRef(stringa));
      var string = createPrimitive(stringFunction, null, realm);
      string = string.addProperty(P_PROTOTYPE, Property.fromData(intrinsics.get("%StringPrototype%"), L_TRUE, L_TRUE, L_TRUE));
      global = global.addProperty(lat.abst1("String"), Property.fromData(lat.abstRef(stringa), L_TRUE, L_TRUE, L_TRUE));
      machine.storeAlloc(stringa, string);


      stringP = registerPrimitiveFunction(stringP, "charAt", stringCharAt);
      stringP = registerPrimitiveFunction(stringP, "charCodeAt", stringCharCodeAt);
      stringP = registerPrimitiveFunction(stringP, "startsWith", stringStartsWith);

      machine.storeAlloc(stringPa, stringP);
      // END STRING

      // BEGIN NUMBER
      const numberPa = allocNative();
      const numberProtoRef = lat.abstRef(numberPa);
      intrinsics.add("%NumberPrototype%", numberProtoRef);
      var numberP = ObjectCreate(intrinsics.get("%ObjectPrototype%"));
      var numbera = allocNative();
      numberP = registerProperty(numberP, "constructor", lat.abstRef(numbera));
      var number = createPrimitive(numberFunction, numberConstructor, realm);
      number = number.addProperty(P_PROTOTYPE, Property.fromData(intrinsics.get("%NumberPrototype%"), L_TRUE, L_TRUE, L_TRUE));
      global = global.addProperty(lat.abst1("Number"), Property.fromData(lat.abstRef(numbera), L_TRUE, L_TRUE, L_TRUE));
      machine.storeAlloc(numbera, number);

      // stringP = registerPrimitiveFunction(stringP, "charAt", stringCharAt);

      machine.storeAlloc(numberPa, numberP);

      // END NUMBER



      // BEGIN ARRAY
      const arrayPa = allocNative();
      const arrayProtoRef = lat.abstRef(arrayPa);
      intrinsics.add("%ArrayPrototype%", arrayProtoRef);

      var arrayP = ObjectCreate(intrinsics.get("%ObjectPrototype%"));
      var arraya = allocNative();
      var arrayP = registerProperty(arrayP, "constructor", lat.abstRef(arraya));
      var array = createPrimitive(arrayFunction, arrayConstructor, realm);
      array = array.addProperty(P_PROTOTYPE, Property.fromData(arrayProtoRef, L_TRUE, L_TRUE, L_TRUE));
      global = global.addProperty(lat.abst1("Array"), Property.fromData(lat.abstRef(arraya), L_TRUE, L_TRUE, L_TRUE));
      machine.storeAlloc(arraya, array);

      arrayP = registerPrimitiveFunction(arrayP, "toString", arrayToString);
      // arrayP = registerPrimitiveFunction(arrayP, "concat", arrayConcat);
      arrayP = registerPrimitiveFunction(arrayP, "push", arrayPush);
      machine.storeAlloc(arrayPa, arrayP);
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
      math = registerPrimitiveFunction(math, "max", mathMax);
      math = registerPrimitiveFunction(math, "min", mathMin);
//  math = registerProperty(math, "PI", lat.abst1(Math.PI));
      machine.storeAlloc(matha, math);
      global = global.addProperty(lat.abst1("Math"), Property.fromData(lat.abstRef(matha), L_TRUE, L_TRUE, L_TRUE));


      function mathSqrt(application, operandValues, thisValue, benv, lkont, kont, machine)
      {
        var value = lat.sqrt(operandValues[0]);
        machine.continue(value, lkont, kont);
      }

      function mathAbs(application, operandValues, thisValue, benv, lkont, kont, machine)
      {
        var value = lat.abs(operandValues[0]);
        machine.continue(value, lkont, kont);
      }

      function mathRound(application, operandValues, thisValue, benv, lkont, kont, machine)
      {
        var value = lat.round(operandValues[0]);
        machine.continue(value, lkont, kont);
      }

      function mathFloor(application, operandValues, thisValue, benv, lkont, kont, machine)
      {
        var value = lat.floor(operandValues[0]);
        machine.continue(value, lkont, kont);
      }

      function mathCos(application, operandValues, thisValue, benv, lkont, kont, machine)
      {
        var value = lat.cos(operandValues[0]);
        machine.continue(value, lkont, kont);
      }

      function mathSin(application, operandValues, thisValue, benv, lkont, kont, machine)
      {
        var value = lat.sin(operandValues[0]);
        machine.continue(value, lkont, kont);
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

      function mathRandom(application, operandValues, thisValue, benv, lkont, kont, machine)
      {
        var value = lat.abst1(random());
        machine.continue(value, lkont, kont);
      }

      // 20.2.2.24
      function mathMax(application, operandValues, thisValue, benv, lkont, kont, machine)
      {
        var value = lat.max(operandValues[0], operandValues[1]);
        machine.continue(value, lkont, kont);
      }

      // 20.2.2.25
      function mathMin(application, operandValues, thisValue, benv, lkont, kont, machine)
      {
        var value = lat.min(operandValues[0], operandValues[1]);
        machine.continue(value, lkont, kont);
      }
      // END MATH


      // BEGIN BASE
      var base = ObjectCreate(lat.abst1(null));
      var basea = allocNative();
      base = registerPrimitiveFunction(base, "addIntrinsic", baseAddIntrinsic);
      base = registerPrimitiveFunction(base, "assignInternal", baseAssignInternal);
      base = registerPrimitiveFunction(base, "callInternal", baseCallInternal);
      base = registerPrimitiveFunction(base, "DefinePropertyOrThrow", baseDefinePropertyOrThrow);
      base = registerPrimitiveFunction(base, "hasInternal", baseHasInternal);
      base = registerPrimitiveFunction(base, "lookupInternal", baseLookupInternal);
      base = registerPrimitiveFunction(base, "newPropertyDescriptor", baseNewPropertyDescriptor);
      base = registerPrimitiveFunction(base, "SameValue", baseSameValue);
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

      base = registerPrimitiveFunction(base, "register", baseRegister);
      base = registerPrimitiveFunction(base, "NumberToString", baseNumberToString);

      machine.storeAlloc(basea, base);
      global = global.addProperty(lat.abst1("$BASE$"), Property.fromData(lat.abstRef(basea), L_TRUE, L_TRUE, L_TRUE));
      // END BASE

      // BEGIN PERFORMANCE
      let perf = ObjectCreate(realm.Intrinsics.get("%ObjectPrototype%"));
      const perfa = allocNative();
      perf = registerPrimitiveFunction(perf, "now", performanceNow, null);
      machine.storeAlloc(perfa, perf);
      global = registerProperty(global, "performance", lat.abstRef(perfa));

      function performanceNow(application, operandValues, thisValue, benv, lkont, kont, machine)
      {
        var value = lat.abst1(performance.now());
        machine.continue(value, lkont, kont);
      }

      // END PERFORMANCE


      function $join(application, operandValues, thisValue, benv, lkont, kont, machine)
      {
        var value = operandValues.reduce(Lattice.join, BOT);
        machine.continue(value, lkont, kont);
      }

      function _print(application, operandValues, thisValue, benv, lkont, kont, machine)
      {
        console.log.apply(null, operandValues);
        machine.continue(L_UNDEFINED, lkont, kont);
      }

      function globalParseInt(application, operandValues, thisValue, benv, lkont, kont, machine)
      {
        var value = operandValues[0].parseInt(); // TODO: 2nd (base) arg
        machine.continue(value, lkont, kont);
      }
      global = registerPrimitiveFunction(global, "parseInt", globalParseInt);

      function globalWrapService(application, operandValues, thisValue, benv, lkont, kont, machine)
      {
        const [Obj, Name] = operandValues;
        const serviceName = Name.conc1();
        const model = new Map();
        for (const {name, operation, arguments: args, result} of cc.interactionModel)
        {
          if (name === serviceName)
          {
            let ops = model.get(operation);
            if (!ops)
            {
              ops = [];
              model.set(operation, ops);
            }
            ops.push({args:args.map(lat.abst1), result:lat.abst1(result)});
          }
        }
        let service = ObjectCreate(lat.abst1(null));
        const servicea = machine.alloc.object(application, kont);
        for (const [operationName, ops] of model)
        {
          const applyFunction = function (application, operandValues, thisValue, benv, lkont, kont, machine)
          {
            for (const {args, result} of ops)
            {
              if (args.equals(operandValues))
              {
                machine.continue(result, lkont, kont);
              }
            }
          };
          var primFunObject = createPrimitive(applyFunction, null, kont.realm);
          var primFunObjectAddress = allocNative();
          machine.storeAlloc(primFunObjectAddress, primFunObject);
          service = registerProperty(service, operationName, lat.abstRef(primFunObjectAddress));
        }
        machine.storeAlloc(servicea, service);
        machine.continue(lat.abstRef(servicea), lkont, kont);
      }
      global = registerPrimitiveFunction(global, "wrapService", globalWrapService);


      machine.storeAlloc(globala, global);
      // END GLOBAL

      const kont = createContext(null, realm.GlobalObject, realm, "globalctx" + (glcount++), ArraySet.empty().add("ScriptJobs"), null, machine);
      // console.log("CREATED context " + kont);
      return kont;
    } // end initialize2

    const initialKont = initialize2(Benv.empty());
    return initialKont;
  }

  function objectConstructor(application, operandValues, protoRef, benv, lkont, kont, machine)
  {
    var obj = ObjectCreate(protoRef);
    var objectAddress = machine.alloc.object(application, kont);
    machine.storeAlloc(objectAddress, obj);
    var objRef = lat.abstRef(objectAddress);
    machine.continue(objRef, lkont, kont);
  }

  // 19.1.3.2
  function objectProtoHasOwnProperty(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [V] = operandValues;
    ToPropertyKey(V, lkont, kont, machine, P =>
    {
      const O = ToObject(thisValue, application, lkont, kont, machine);
      HasOwnProperty(O, P, lkont, kont, machine, value =>
        machine.continue(value, lkont, kont));
    });
  }

  // 19.1.3.3
  function objectProtoIsPrototypeOf(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [V] = operandValues;
    if (V.isNonRef())
    {
      machine.continue(L_FALSE, lkont, kont, machine);
    }
    if (V.isRef())
    {
      const O = ToObject(thisValue, application, lkont, kont, machine);
      step3(O, V);
    }

    function step3(O, V)
    {
      callInternal(V, "[[GetPrototypeOf]]", [], lkont, kont, machine, V =>
      {
        if (V.isNull())
        {
          machine.continue(L_FALSE, lkont, kont, machine);
        }
        if (V.isNonNull())
        {
          const sv = SameValue(O, V);
          if (sv.isTrue())
          {
            machine.continue(L_TRUE, lkont, kont, machine);
          }
          if (sv.isFalse())
          {
            step3(O, V);
          }
        }
      })
    }
  }

  function errorFunction(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    return errorInitializer(application, operandValues, benv, lkont, kont, machine);
  }

  function errorConstructor(application, operandValues, protoRef, benv, lkont, kont, machine)
  {
    return errorInitializer(application, operandValues, benv, lkont, kont, machine);
  }

  function errorInitializer(application, operandValues, benv, lkont, kont, machine)
  {
    const message = operandValues.length === 1 && operandValues[0] !== BOT ? operandValues[0].ToString() : L_EMPTY_STRING;
    const obj = createError(message, kont.realm);
    var errAddress = machine.alloc.error(application, kont);
    machine.storeAlloc(errAddress, obj);
    var errRef = lat.abstRef(errAddress);
    machine.continue(errRef, lkont, kont);
  }

  // 20.1.1.1
  function numberFunction(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    if (operandValues.length === 0)
    {
      machine.continue(L_0, lkont, kont);
    }
    else
    {
      const tn = ToNumber(operandValues[0], application, lkont, kont, machine);
      for (const value of tn)
      {
        machine.continue(value, lkont, kont);
      }
    }
  }

  // 20.1.1.1
  function numberConstructor(application, operandValues, protoRef, benv, lkont, kont, machine)
  {

    let tn;
    if (operandValues.length === 0)
    {
      tn = [L_0];
    }
    else
    {
      tn = ToNumber(operandValues[0], application, lkont, kont, machine);
    }
    for (const value of tn)
    {
      let obj = ObjectCreate(kont.realm.Intrinsics.get("%NumberPrototype%")); // TODO OrdinaryCreateFromConstructor
      obj = obj.setInternal("[[NumberData]]", value);
      const addr = machine.alloc.object(application, kont); // no number-specific alloc?
      machine.storeAlloc(addr, obj);
      const ref = lat.abstRef(addr);
      machine.continue(ref, lkont, kont);
    }
  }

  // 21.1.1.1
  function stringFunction(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    if (operandValues.length === 0)
    {
      machine.continue(L_EMPTY_STRING, lkont, kont);
    }
    else
    {
      ToString(operandValues[0], lkont, kont, machine, value =>
          machine.continue(value, lkont, kont));
    }
  }

  // 21.1.3.1
  function stringCharAt(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    var lprim = getInternal(thisValue, "[[StringData]]", machine);
    var value = lprim.charAt(operandValues[0]);
    machine.continue(value, lkont, kont);
  }

  // 21.1.3.2
  function stringCharCodeAt(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    var lprim = getInternal(thisValue, "[[StringData]]", machine);
    var value = lprim.charCodeAt(operandValues[0]);
    machine.continue(value, lkont, kont);
  }

  // 21.1.3.7
  // includes: prelude

  // 21.1.3.8
  // indexOf: prelude

  // 21.1.3.19
  // slice: prelude

  // 21.1.3.20
  // split: prelude

  // 21.1.3.21
  function stringStartsWith(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    var lprim = getInternal(thisValue, "[[StringData]]", machine);
    var value = lprim.startsWith(operandValues[0]);
    machine.continue(value, lkont, kont);
  }

  // 21.1.3.22
  // substring: prelude

  // 21.1.3.25
  // toString: prelude

  function arrayConstructor(application, operandValues, protoRef, benv, lkont, kont, machine)
  {
    var arr = createArray(kont.realm);
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
    arr = arr.addProperty(P_LENGTH, Property.fromData(length, L_TRUE, L_TRUE, L_TRUE));

    var arrAddress = machine.alloc.array(application, kont);
    machine.storeAlloc(arrAddress, arr);
    var arrRef = lat.abstRef(arrAddress);
    machine.continue(arrRef, lkont, kont);
  }

  function arrayFunction(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    var arr = createArray(kont.realm);
    for (var i = 0; i < operandValues.length; i++)
    {
      arr = arr.addProperty(lat.abst1(String(i)), Property.fromData(operandValues[i], L_TRUE, L_TRUE, L_TRUE));
    }
    arr = arr.addProperty(P_LENGTH, Property.fromData(lat.abst1(operandValues.length), L_TRUE, L_TRUE, L_TRUE));

    var arrAddress = machine.alloc.array(application, kont);
    machine.storeAlloc(arrAddress, arr);
    var arrRef = lat.abstRef(arrAddress);
    machine.continue(arrRef, lkont, kont);
  }

  // 22.1.3.1
  // Array.prototype.concat

  function arrayToString(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    assert(machine);
    // TODO: this is a hack (no actual ToString called)
    const create = CreateListFromArrayLike(thisValue, undefined, lkont, kont, machine, list =>
      machine.continue(lat.abst1(list.join()), lkont, kont));
  }

  // 22.1.3.15
  // Array.prototype.join: prelude

  // 22.1.3.14
  function arrayPush(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    for (const thisa of thisValue.addresses())
    {
      var arr = machine.storeLookup(thisa);
      var len = arr.getProperty(P_LENGTH).getValue();
      var lenStr = len.ToString();
      arr = arr.addProperty(lenStr, Property.fromData(operandValues[0], L_TRUE, L_TRUE, L_TRUE))
      var len1 = lat.add(len, L_1);
      arr = arr.addProperty(P_LENGTH, Property.fromData(len1, L_TRUE, L_TRUE, L_TRUE));
      machine.storeUpdate(thisa, arr);
      machine.continue(len1, lkont, kont);
    }
  }

  const baseReg = new Map(); // TODO: state!!!

  function baseNumberToString(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [m] = operandValues;
    machine.continue(m.ToString(), lkont, kont);
  }

  function baseRegister(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [key, F] = operandValues;
    baseReg.set(key.conc1(), F);
    machine.continue(L_TRUE, lkont, kont);
  }

  function baseDefinePropertyOrThrow(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [O, key, desc] = operandValues;
    const int = DefinePropertyOrThrow(O, key, desc, lkont, kont, machine, value =>
      machine.continue(value, lkont, kont));
  }

  function baseObjectDefineProperties(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [O, Properties] = operandValues;
    const int = ObjectDefineProperties(O, Properties, application, lkont, kont, machine, value =>
      machine.continue(value, lkont, kont));
  }

  function baseNewPropertyDescriptor(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const property = Property.empty();
    machine.continue(property, lkont, kont);
  }

  function baseToPropertyKey(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [argument] = operandValues;
    const int = ToPropertyKey(argument, lkont, kont, machine, value =>
      machine.continue(value, lkont, kont));
  }

  function baseToPropertyDescriptor(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [Attributes] = operandValues;
    ToPropertyDescriptor(Attributes, lkont, kont, machine, desc =>
      machine.continue(desc, lkont, kont));
  }

  function baseFromPropertyDescriptor(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [Desc] = operandValues;
    FromPropertyDescriptor(Desc, application, lkont, kont, machine, value =>
      machine.continue(value, lkont, kont));
  }

  function baseStringCreate(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [value] = operandValues; // TODO pass prototype as second param
    const obj = StringCreate(value, kont);
    const obja = machine.alloc.string(application, kont);
    machine.storeAlloc(obja, obj);
    const ref = lat.abstRef(obja);
    machine.continue(ref, lkont, kont);
  }

  function baseObjectCreate(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [proto, internalSlotsList] = operandValues;
    const obj = ObjectCreate(proto, internalSlotsList);
    const objAddr = machine.alloc.object(application, kont);
    machine.storeAlloc(objAddr, obj);
    const ref = lat.abstRef(objAddr);
    machine.continue(ref, lkont, kont);
  }

  function baseToObject(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [O] = operandValues;
    const objectRef = ToObject(O, application, lkont, kont, machine);
    machine.continue(objectRef, lkont, kont);
  }

  function baseSameValue(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [x, y] = operandValues;
    const value = SameValue(x,y);
    machine.continue(value, lkont, kont);
  }

  function baseSameNumberValue(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [x, y] = operandValues;
    machine.continue(x.hasSameNumberValue(y), lkont, kont);
  }

  function baseSameBooleanValue(application, operandValues, thisValue, benv, lkont, kont, machine)
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
    machine.continue(result, lkont, kont);
  }

  function baseSameStringValue(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [x, y] = operandValues;
    machine.continue(x.hasSameStringValue(y), lkont, kont);
  }

  function baseSameObjectValue(application, operandValues, thisValue, benv, lkont, kont, machine)
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
    machine.continue(result, lkont, kont);
  }

  function baseAddIntrinsic(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [Name, Value] = operandValues;
    kont.realm.Intrinsics.add(Name.conc1(), Value);
    machine.continue(lat.abst1(undefined), lkont, kont);
  }

  function baseHasInternal(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [O, Name] = operandValues;
    const result = hasInternal(O, Name.conc1(), machine);
    machine.continue(result, lkont, kont);
  }

  function baseLookupInternal(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [O, Name] = operandValues;
    const result = lookupInternal(O, Name.conc1(), machine);
    machine.continue(result, lkont, kont);
  }

  function baseCallInternal(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    console.log("kont", kont._id);
    const [O, Name, ...args] = operandValues;
    const call = callInternal(O, Name.conc1(), args, lkont, kont, machine, value =>
      machine.continue(value, lkont, kont));
  }

  function baseAssignInternal(application, operandValues, thisValue, benv, lkont, kont, machine)
  {
    const [O, Name, Value] = operandValues;
    assignInternal(O, Name.conc1(), Value, machine);
    machine.continue(lat.abst1(undefined), lkont, kont);
  }

  function ScriptEvaluationJob(resource)
  {
    this.resource = resource;
  }

  ScriptEvaluationJob.prototype.execute =
      function (lkont, kont, machine)
      {
        const ast = Ast.createAst(this.resource);
        machine.evaluate(ast, kont.realm.GlobalEnv, lkont, kont);
      }

  ScriptEvaluationJob.prototype.hashCode =
      function ()
      {
        var prime = 29;
        var result = 1;
        result = prime * result + 0; // 0 = ScriptEvaluationJob (TODO)
        result = prime * result + this.resource.hashCode();
        return result;
      }

  ScriptEvaluationJob.prototype.addresses =
      function ()
      {
        return ArraySet.empty();
      }

  return {
    initialize,
    evaluate: evaluate_, continue:continue_, return:return_, throw: throw_, break: break_,
    gc: gc_, enqueueScriptEvaluation,
    $getProperty, $assignProperty, $call, $construct, $createFunction,
    lat}
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
      return EMPTY_ADDRESS_SET;
    }

SetValueNoAddresses.prototype.equals =
  function (x)
  {
    if (this === x)
    {
      return true;
    }
    return Sets.equals(this.set, x.set);
  }

SetValueNoAddresses.prototype[Symbol.iterator] =
    function* ()
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


const Agc = {};

Agc.collect =
    function (store, rootSet)
    {
      const reachable = MutableHashSet.empty();
      Agc.addressesReachable(rootSet, store, reachable);
      
      // const cleanup = Arrays.removeAll(reachable.values(), store.map.keys())
      // if (cleanup.length > 0)
      // {
      //   console.debug("cleaning up", cleanup);
      // }
      
      if (reachable.count() === store.map.size) // we can do this since we have subsumption
      {
        return store;
      }
      const store2 = store.narrow(reachable);
      return store2;
    }

Agc.addressesReachable =
    function (addresses, store, reachable)
    {
      addresses.forEach(
          function (address)
          {
            Agc.addressReachable(address, store, reachable)
          });
    }

Agc.addressReachable =
    function (address, store, reachable)
    {
      if (reachable.contains(address))
      {
        return;
      }
      const value = store.get(address);
      const addresses = value.addresses();
      reachable.add(address);
      Agc.addressesReachable(addresses, store, reachable);
    }
    