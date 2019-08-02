import {HashCode, Strings, Sets, MutableHashSet, ArraySet, assert, assertDefinedNotNull, assertFalse} from './common.mjs';
import * as Ast from './ast.mjs';
import {BOT} from './lattice.mjs';
import Benv from './benv.mjs';
import Store from './store.mjs';
import {Obj} from './object.mjs';
import {Arrays} from "./common";
import {blockScopeDeclarations, StringResource} from "./ast";

export default createSemantics;

const EMPTY_LKONT = [];
const EMPTY_ADDRESS_SET = ArraySet.empty();
//const queues = new Map([["ScriptJobs", "!ScriptJobs"]]);

let glcount = 0; // hack to distinguish different initial contexts (should really depend on program,
// and then kont -> resource becomes almost immediate (pruneGraph)


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


  function gc_(rootSet)
  {
    store = Agc.collect(rootSet);
    return store;
  }

  // function pushKont_(applyFun, lkont)
  // {
  //   const frame = new GenericKont(applyFun);
  //   [frame].concat(lkont)
  // }


  function States(machine)
  {
    this.states = [];
    this.machine = machine;
  }

  States.prototype[Symbol.iterator] =
      function* ()
      {
        yield* this.states;
      }

  States.prototype.evaluate =
      function (node, benv, lkont, kont)
      {
        this.states.push(this.machine.evaluate(node, benv, lkont, kont));
      }

  States.prototype.continue =
      function (value, lkont, kont)
      {
        this.states.push(this.machine.continue(value, lkont, kont));
      }

  States.prototype.throw =
      function (value, lkont, kont)
      {
        this.states.push(this.machine.throw(value, lkont, kont));
      }

  States.prototype.throwTypeError = // TODO this is not a type error!!
      function (msg, lkont, kont)
      {
        console.debug("throwTypeError: " + msg);
        assert(typeof msg === "string");
        const obj = createError(lat.abst1(msg), kont.realm);
        const addr = this.machine.alloc.error("@" + msg, kont);
        this.machine.storeAlloc(addr, obj);
        const ref = lat.abstRef(addr);
        this.states.push(this.machine.throw(ref, lkont, kont));
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
        return evalStatementList(node, benv, lkont, kont, machine);
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
    return [machine.continue(L_UNDEFINED, lkont, kont)];
  }

  function evalLiteral(node, benv, lkont, kont, machine)
  {
    var value = lat.abst1(node.value);
    return [machine.continue(value, lkont, kont)];
  }

  function evalIdentifier(node, benv, lkont, kont, machine)
  {
    var value = doScopeLookup(node, benv, kont, machine);
    return [machine.continue(value, lkont, kont)];
  }

  function evalThisExpression(node, benv, lkont, kont, machine)
  {
    const value = kont.thisValue;
    return [machine.continue(value, lkont, kont)];
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

  function evalStatementList(node, benv, lkont, kont, machine)
  {
    var nodes = node.body;
    if (nodes.length === 0)
    {
      return [machine.continue(L_UNDEFINED, lkont, kont)];
    }
    if (nodes.length === 1)
    {
      //return evaluate_(nodes[0], benv, lkont, kont, machine);
      return [machine.evaluate(nodes[0], benv, lkont, kont)];
    }
    var frame = new BodyKont(node, 1, benv);
    return [machine.evaluate(nodes[0], benv, [frame].concat(lkont), kont)];
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
        return [machine.evaluate(declarations[0], benv, [frame].concat(lkont), kont, machine)];
      }
      case 'let':
      {
        const frame = new LetDeclarationKont(node, 1, benv);
        return [machine.evaluate(declarations[0], benv, [frame].concat(lkont), kont, machine)];
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
      return [machine.continue(L_UNDEFINED, lkont, kont)];
    }
    return [machine.evaluate(init, benv, lkont, kont)];
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
          return [machine.continue(L_UNDEFINED, lkont, kont, machine)];
        }
        const frame = new VarDeclarationKont(node, i + 1, benv);
        return [machine.evaluate(declarations[i], benv, [frame].concat(lkont), kont, machine)]
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
        InitializeReferenceBinding(id, value, benv, kont, machine);
        if (i === declarations.length)
        {
          return [machine.continue(L_UNDEFINED, lkont, kont, machine)];
        }
        const frame = new LetDeclarationKont(node, i + 1, benv);
        return [machine.evaluate(declarations[i], benv, [frame].concat(lkont), kont, machine)]
      }

  function evalUnaryExpression(node, benv, lkont, kont, machine)
  {
    var frame = new UnaryKont(node);
    return [machine.evaluate(node.argument, benv, [frame].concat(lkont), kont)];
  }

  function evalBinaryExpression(node, benv, lkont, kont, machine)
  {
    var frame = new LeftKont(node, benv);
    return [machine.evaluate(node.left, benv, [frame].concat(lkont), kont)];
  }

  function evalLogicalExpression(node, benv, lkont, kont, machine)
  {
    var frame = new LogicalLeftKont(node, benv);
    return [machine.evaluate(node.left, benv, [frame].concat(lkont), kont)];
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
        return [machine.evaluate(right, benv, [frame].concat(lkont), kont)];
      }
      case "MemberExpression":
      {
        var object = left.object;
        var frame = new AssignMemberKont(node, benv);
        return [machine.evaluate(object, benv, [frame].concat(lkont), kont)];
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
        return [machine.continue(resultingValue, lkont, kont)];
      }
      case "MemberExpression":
      {
        var object = argument.object;
        var frame = new UpdateMemberKont(node, benv);
        return [machine.evaluate(object, benv, [frame].concat(lkont), kont)];
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
    prototype = prototype.add(P_CONSTRUCTOR, Property.fromValue(closureRef));
    machine.storeAlloc(prototypea, prototype);

    closure = closure.add(P_PROTOTYPE, Property.fromValue(lat.abstRef(prototypea)));
    machine.storeAlloc(closurea, closure);
    return closureRef;
  }

  function evalFunctionExpression(node, benv, lkont, kont, machine)
  {
    var closureRef = allocateClosure(node, benv, lkont, kont, machine);
    return [machine.continue(closureRef, lkont, kont)];
  }

  function evalFunctionDeclaration(node, benv, lkont, kont, machine)
  {
    return [machine.continue(L_UNDEFINED, lkont, kont)];
  }

  function evalCallExpression(node, benv, lkont, kont, machine)
  {
    var calleeNode = node.callee;

    if (Ast.isMemberExpression(calleeNode))
    {
      var object = calleeNode.object;
      var frame = new CallMemberKont(node, benv);
      return [machine.evaluate(object, benv, [frame].concat(lkont), kont)];
    }

    var frame = new OperatorKont(node, benv);
    return [machine.evaluate(calleeNode, benv, [frame].concat(lkont), kont)];
  }


  function applyProc(application, operatorValue, operandValues, thisValue, benv, lkont, kont, states)
  {
    var operatorAs = operatorValue.addresses();
    if (errors)
    {
      if (operatorAs.count() === 0)
      {
        states.throwTypeError(application.callee + " is not a function (" + operatorValue + ")", lkont, kont);
      }
    }
    for (const operatora of operatorAs.values())
    {
      const operatorObj = states.machine.storeLookup(operatora);
      const Call = operatorObj.getInternal("[[Call]]").value;
      for (const callable of Call)
      {
        //if (!callable.applyFunction) {print(application, callable, Object.keys(callable))};
        callable.applyFunction(application, operandValues, thisValue, benv, lkont, kont, states);
      }
    }
  }

  function $call(operatorValue, thisValue, operandValues, benv, lkont, kont, machine)
  {
    const states = new States(machine);
    const syntheticApplication = {type: "CallExpression"};
    Ast.tagNode(syntheticApplication);
    applyProc(syntheticApplication, operatorValue, operandValues, thisValue, benv, lkont, kont, states);
    return states;
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
  function applyCons(application, operatorValue, operandValues, benv, lkont, kont, states)
  {
    const operatorAs = operatorValue.addresses();
    for (const operatora of operatorAs.values())
    {
      const obj = states.machine.storeLookup(operatora);
      const protoRef = obj.lookup(P_PROTOTYPE).value.Value;
      const Call = obj.getInternal("[[Call]]").value;
      for (const callable of Call)
      {
        callable.applyConstructor(application, operandValues, protoRef, benv, lkont, kont, states);
      }
    }
  }

  function $construct(operatorValue, operandValues, benv, lkont, kont, machine)
  {
    const states = new States(machine);
    const syntheticApplication = {type: "NewExpression"};
    Ast.tagNode(syntheticApplication);
    applyCons(syntheticApplication, operatorValue, operandValues, benv, lkont, kont, states);
    return states;
  }

  function evalReturnStatement(node, benv, lkont, kont, machine)
  {
    var argumentNode = node.argument;
    if (argumentNode === null)
    {
      return [machine.return(L_UNDEFINED, lkont, kont)];
    }

    var frame = new ReturnKont(node);
    return [machine.evaluate(argumentNode, benv, [frame].concat(lkont), kont)];
  }

  function evalBreakStatement(node, benv, lkont, kont, machine)
  {
    return [machine.break(lkont, kont)];
  }

  function evalTryStatement(node, benv, lkont, kont, machine)
  {
    var block = node.block;
    var frame = new TryKont(node, benv);
    return [machine.evaluate(block, benv, [frame].concat(lkont), kont)];
  }

  function evalThrowStatement(node, benv, lkont, kont, machine)
  {
    var argumentNode = node.argument;
    var frame = new ThrowKont(node);
    return [machine.evaluate(argumentNode, benv, [frame].concat(lkont), kont)];
  }

  function evalIfStatement(node, benv, lkont, kont, machine)
  {
    var testNode = node.test;
    var frame = new IfKont(node, benv);
    return [machine.evaluate(testNode, benv, [frame].concat(lkont), kont)];
  }

  function evalConditionalExpression(node, benv, lkont, kont, machine)
  {
    var testNode = node.test;
    var frame = new IfKont(node, benv);
    return [machine.evaluate(testNode, benv, [frame].concat(lkont), kont)];
  }

  function evalForStatement(node, benv, lkont, kont, machine)
  {
    var init = node.init;
    if (init)
    {
      var frame = new ForInitKont(node, benv);
      return [machine.evaluate(init, benv, [frame].concat(lkont), kont)];
    }
    var test = node.test;
    var frame = new ForTestKont(node, L_UNDEFINED, benv);
    return [machine.evaluate(test, benv, [frame].concat(lkont), kont)];
  }

  function evalForInStatement(node, benv, lkont, kont, machine)
  {
    var right = node.right;
    var frame = new ForInRightKont(node, benv);
    return [machine.evaluate(right, benv, [frame].concat(lkont), kont)];
  }

  function evalWhileStatement(node, benv, lkont, kont, machine)
  {
    var test = node.test;
    var frame = new WhileTestKont(node, benv);
    return [machine.evaluate(test, benv, [frame].concat(lkont), kont)];
  }

  function evalDoWhileStatement(node, benv, lkont, kont, machine)
  {
    var body = node.body;
    var frame = new WhileBodyKont(node, benv);
    return [machine.evaluate(body, benv, [frame].concat(lkont), kont)];
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
      return [machine.continue(objectRef, lkont, kont)];
    }
    var frame = new ObjectKont(node, 1, benv, []);
    return [machine.evaluate(properties[0].value, benv, [frame].concat(lkont), kont)];
  }

  function evalArrayExpression(node, benv, lkont, kont, machine)
  {
    var elements = node.elements;
    if (elements.length === 0)
    {
      var arr = createArray(kont.realm);
      arr = arr.add(P_LENGTH, Property.fromValue(L_0));
      var arrAddress = machine.alloc.array(node, kont);
      machine.storeAlloc(arrAddress, arr);
      var arrRef = lat.abstRef(arrAddress);
      return [machine.continue(arrRef, lkont, kont)];
    }
    var frame = new ArrayKont(node, 1, benv, []);
    return [machine.evaluate(elements[0], benv, [frame].concat(lkont), kont)];
  }

  function evalMemberExpression(node, benv, lkont, kont, machine)
  {
    var object = node.object;
    var frame = new MemberKont(node, benv);
    return [machine.evaluate(object, benv, [frame].concat(lkont), kont)];
  }

  function createError(message, realm)
  {
    //const O = OrdinaryCreateFromConstructor();
    let obj = new Obj();
    obj = obj.setInternal("[[Prototype]]", realm.Intrinsics.get("%ErrorPrototype%"));
    obj = obj.setInternal("[[ErrorData]]", L_UNDEFINED);
    obj = obj.setInternal("[[Get]]", SetValueNoAddresses.from1(OrdinaryGet));
    obj = obj.add(P_MESSAGE, Property.fromValue(message));
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
        const scriptJobs = machine.storeLookup("ScriptJobs");
        if (scriptJobs.isEmpty())
        {
          return [];
        }
        const job = scriptJobs.first();
        machine.storeUpdate("ScriptJobs", scriptJobs.rest());

        const result = job.execute(lkont, kont, machine);
        return result;
      }

      if (kont.ex && Ast.isNewExpression(kont.ex))
      {
        value = kont.thisValue;
      } else
      {
        value = L_UNDEFINED;
      }

      const result = [];
      for (const stack of kont._stacks)
      {
        result.push(machine.continue(value, stack.lkont, stack.kont));
      }
      return result;
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

    const result = [];
    for (const stack of kont._stacks)
    {
      result.push(machine.continue(value, stack.lkont, stack.kont));
    }

    return result;
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
    return enqueueJob("ScriptJobs", new ScriptEvaluationJob(resource), machine);
  }

  function enqueueJob(qname, job, machine)
  {
    const jobs = machine.storeLookup(qname);
    const jobs2 = jobs.add(job);
    machine.storeUpdate(qname, jobs2);
  }

  function JobQueue(jobs)
  {
    this.jobs = jobs || ArraySet.empty()
  }

  JobQueue.prototype.equals =
      function (x)
      {
        if (this === x)
        {
          return true;
        }

        return x instanceof JobQueue
          && this.jobs.equals(x.jobs)
      }

  JobQueue.prototype.hashCode =
      function ()
      {
        return 42; // TODO
      }

  JobQueue.prototype.addresses =
    function ()
    {
      let addresses = EMPTY_ADDRESS_SET;
      for (const job of this.jobs)
      {
        addresses = addresses.join(job.addresses);
      }
      return addresses;
    }

  JobQueue.prototype.add =
      function (job)
      {
        return new JobQueue(this.jobs.add(job));
      }


  JobQueue.prototype.first =
      function ()
      {
        return this.jobs.first();
      }

  JobQueue.prototype.rest =
      function ()
      {
        return new JobQueue(this.jobs.rest());
      }

  JobQueue.prototype.isEmpty =
      function ()
      {
        return this.jobs.size() === 0;
      }

  JobQueue.prototype.update =
    function (x)
    {
      return x;
    }

   JobQueue.prototype.join =
       function (x)
       {
          return new JobQueue(this.jobs.join(x.jobs));
       }

  JobQueue.prototype.toString =
      function ()
      {
        return "(jobqueue: " + this.jobs + ")";
      }

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
  
  function performApply(operandValues, funNode, scope, lkont, kont, ctx, states)
  {
    const bodyNode = funNode.body;
    const nodes = bodyNode.body;
    if (nodes.length === 0)
    {
      states.continue(L_UNDEFINED, [], ctx);
    }
    else
    {
      let extendedBenv = scope.extend();

      const funScopeDecls = functionScopeDeclarations(funNode);
      const names = Object.keys(funScopeDecls);
      if (names.length > 0)
      {
        var nodeAddr = names.map(function (name)
        {
          var node = funScopeDecls[name];
          var addr = states.machine.alloc.vr(node.id || node, ctx); // new ctx!
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
            states.machine.storeAlloc(addr, node.i < operandValues.length ? operandValues[node.i] : L_UNDEFINED);
          }
          else if (Ast.isFunctionDeclaration(node))
          {
            var closureRef = allocateClosure(node, extendedBenv, lkont, kont, states.machine);
            states.machine.storeAlloc(addr, closureRef);
          }
          else if (Ast.isVariableDeclarator(node))
          {
            states.machine.storeAlloc(addr, L_UNDEFINED);
          }
          else if (Ast.isRestElement(node))
          {
            const create = CreateArrayFromList(operandValues.slice(node.i), node, lkont, kont, states);
            for (const arr of create)
            {
              const arrAddress = states.machine.alloc.array(node, ctx);
              states.machine.storeAlloc(arrAddress, arr);
              const arrRef = lat.abstRef(arrAddress);
              states.machine.storeAlloc(addr, arrRef);
            }
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
        const addr = states.machine.alloc.vr(decl.id, ctx); // new ctx!
        extendedBenv = extendedBenv.add(name, addr);
        states.machine.storeAlloc(addr, BOT);
      }

      states.evaluate(bodyNode, extendedBenv, [], ctx);
    }
  }
  
  
  ObjClosureCall.prototype.applyFunction =
      function (application, operandValues, thisValue, TODO_REMOVE, lkont, kont, states)
      {
        const userContext = states.machine.kalloc(this, operandValues);
        var previousStack = Stackget(new Stack(lkont, kont), states.machine);
        var stackAs = kont.stackAddresses(lkont).join(this.addresses());
        var ctx = createContext(application, thisValue, kont.realm, userContext, stackAs, previousStack, states.machine);
        performApply(operandValues, this.node, this.scope, lkont, kont, ctx, states);
      }
  
  ObjClosureCall.prototype.applyConstructor =
      function (application, operandValues, protoRef, TODO_REMOVE, lkont, kont, states)
      {
        // call store should not contain freshly allocated `this`
        const userContext = states.machine.kalloc(this, operandValues);
        const funNode = this.node;
        const obj = ObjectCreate(protoRef);
        const thisa = states.machine.alloc.constructor(funNode, kont, application);
        states.machine.storeAlloc(thisa, obj);
        const thisValue = lat.abstRef(thisa);
        const stackAs = kont.stackAddresses(lkont).join(this.addresses());
        const previousStack = Stackget(new Stack(lkont, kont), states.machine);
        const ctx = createContext(application, thisValue, kont.realm, userContext, stackAs, previousStack, states.machine);
        return performApply(operandValues, funNode, this.scope, lkont, kont, ctx, states);
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
        return [machine.evaluate(node.right, benv, [frame].concat(lkont), kont)];
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
        var result = [];
        switch (operator)
        {
          case "&&":
          {
            
            if (leftValue.isTruthy())
            {
              result = result.concat([machine.evaluate(node.right, benv, lkont, kont)]);
            }
            if (leftValue.isFalsy())
            {
              result = result.concat([machine.continue(leftValue, lkont, kont)]);
            }
            break;
          }
          case "||":
          {
            if (leftValue.isTruthy())
            {
              result = result.concat([machine.continue(leftValue, lkont, kont)]);
            }
            if (leftValue.isFalsy())
            {
              result = result.concat([machine.evaluate(node.right, benv, lkont, kont)]);
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
        return [machine.continue(resultValue, lkont, kont)];
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
        return [machine.continue(lat.add(leftValue, rightValue), lkont, kont, machine)];
      }
      case "*":
      {
        return [machine.continue(lat.mul(leftValue, rightValue), lkont, kont, machine)];
      }
      case "-":
      {
        return [machine.continue(lat.sub(leftValue, rightValue), lkont, kont, machine)];
      }
      case "/":
      {
        return [machine.continue(lat.div(leftValue, rightValue), lkont, kont, machine)];
      }
      case "%":
      {
        return [machine.continue(lat.rem(leftValue, rightValue), lkont, kont, machine)];
      }
      case "===":
      {
        return [machine.continue(lat.eqq(leftValue, rightValue), lkont, kont, machine)];
      }
      case "!==":
      {
        return [machine.continue(lat.neqq(leftValue, rightValue), lkont, kont, machine)];
      }
      case "==":
      {
        return [machine.continue(lat.eq(leftValue, rightValue), lkont, kont, machine)];
      }
      case "!=":
      {
        return [machine.continue(lat.neq(leftValue, rightValue), lkont, kont, machine)];
      }
      case "<":
      {
        return [machine.continue(lat.lt(leftValue, rightValue), lkont, kont, machine)];
      }
      case "<=":
      {
        return [machine.continue(lat.lte(leftValue, rightValue), lkont, kont, machine)];
      }
      case ">":
      {
        return [machine.continue(lat.gt(leftValue, rightValue), lkont, kont, machine)];
      }
      case ">=":
      {
        return [machine.continue(lat.gte(leftValue, rightValue), lkont, kont, machine)];
      }
      case "&":
      {
        return [machine.continue(lat.binand(leftValue, rightValue), lkont, kont, machine)];
      }
      case "|":
      {
        return [machine.continue(lat.binor(leftValue, rightValue), lkont, kont, machine)];
      }
      case "^":
      {
        return [machine.continue(lat.binxor(leftValue, rightValue), lkont, kont, machine)];
      }
      case "<<":
      {
        return [machine.continue(lat.shl(leftValue, rightValue), lkont, kont, machine)];
      }
      case ">>":
      {
        return [machine.continue(lat.shr(leftValue, rightValue), lkont, kont, machine)];
      }
      case ">>>":
      {
        return [machine.continue(lat.shrr(leftValue, rightValue), lkont, kont, machine)];
      }
      case "instanceof":
      {
        const states = new States(machine);
        const inst = InstanceofOperator(leftValue, rightValue, lkont, kont, states);
        for (const value of inst)
        {
          states.continue(value, lkont, kont);
        }
        return states;
      }
      case "in":
      {
        const states = new States(machine);
        if (rightValue.isNonRef())
        {
          states.throwTypeError("in: not an object", lkont, kont);
        }
        if (rightValue.isRef())
        {
          const prop = ToPropertyKey(leftValue, lkont, kont, states);
          for (const P of prop)
          {
            const hasProp = HasProperty(rightValue, P, lkont, kont, states);
            for (const result of hasProp)
            {
              states.continue(result, lkont, kont);
            }
          }
        }
        return states;
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
        return [machine.continue(newValue, lkont, kont)];
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
          const states = new States(machine);
          if (Ast.isNewExpression(node))
          {
            applyCons(node, operatorValue, [], benv, lkont, kont, states);
          }
          else
          {
            applyProc(node, operatorValue, [], kont.realm.GlobalObject, benv, lkont, kont, states);
          }
          return states;
        }
        const frame = new OperandsKont(node, 1, benv, operatorValue, [], kont.realm.GlobalObject);
        return [machine.evaluate(operands[0], benv, [frame].concat(lkont), kont)];
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
          const states = new States(machine);
          if (Ast.isNewExpression(node))
          {
            applyCons(node, operatorValue, operandValues.addLast(operandValue), benv, lkont, kont, states);
          }
          else
          {
            applyProc(node, operatorValue, operandValues.addLast(operandValue), thisValue, benv, lkont, kont, states);
          }
          return states;
        }
        const frame = new OperandsKont(node, i + 1, benv, operatorValue, operandValues.addLast(operandValue), thisValue);
        return [machine.evaluate(operands[i], benv, [frame].concat(lkont), kont)];
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
          return [machine.evaluate(nodes[i], benv, lkont, kont)];
        }
        var frame = new BodyKont(node, i + 1, benv);
        return [machine.evaluate(nodes[i], benv, [frame].concat(lkont), kont)];
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
        return [machine.return(value, lkont, kont)];
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
            return [machine.continue(tryValue, lkont, kont)];
          }
          const benv = this.benv;
          const frame = new FinalizerKont(node, tryValue, false);
          return evalStatementList(finalizer, benv, [frame].concat(lkont), kont, machine);
        }
        return [machine.continue(tryValue, lkont, kont)];
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
            return [machine.throw(throwValue, lkont, kont)];
          }
          const frame = new FinalizerKont(node, throwValue, true);
          return evalStatementList(finalizer, benv, [frame].concat(lkont), kont, machine);
        }
        
        var body = handler.body;
        var nodes = body.body;
        if (nodes.length === 0)
        {
          return [machine.continue(L_UNDEFINED, lkont, kont)];
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
          return [machine.throw(value, lkont, kont)];
        }
        return [machine.continue(value, lkont, kont)];
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
        return [machine.throw(throwValue, lkont, kont)];
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
        var result = [];
        if (conditionValue.isTruthy())
        {
          result = result.concat([machine.evaluate(consequent, benv, lkont, kont)]);
        }
        if (conditionValue.isFalsy())
        {
          if (alternate === null)
          {
            result = result.concat([machine.continue(L_UNDEFINED, lkont, kont)]);
          }
          else
          {
            result = result.concat([machine.evaluate(alternate, benv, lkont, kont)]);
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
      function (value, lkont, kont, machine)
      {
        var node = this.node;
        var benv = this.benv;
        var test = node.test;
        var frame = new ForTestKont(node, L_UNDEFINED, benv);
        return [machine.evaluate(test, benv, [frame].concat(lkont), kont)];
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
        var result = [];
        if (testValue.isTruthy())
        {
          var body = node.body;
          var frame = new ForBodyKont(node, benv);
          result = result.concat([machine.evaluate(body, benv, [frame].concat(lkont), kont)]);
        }
        if (testValue.isFalsy())
        {
          result = result.concat([machine.continue(this.bodyValue, lkont, kont)]);
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
      function (bodyValue, lkont, kont, machine)
      {
        var node = this.node;
        var benv = this.benv;
        var update = node.update;
        var frame = new ForUpdateKont(node, bodyValue, benv);
        return [machine.evaluate(update, benv, [frame].concat(lkont), kont)];
      }
  ForBodyKont.prototype.applyBreak =
      function (lkont, kont, machine)
      {
        return [machine.continue(L_UNDEFINED, lkont.slice(1), kont)];
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
        return [machine.evaluate(test, benv, [frame].concat(lkont), kont)];
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
        const states = new States(machine);
        const ownKeys = callInternal(ref, "[[OwnPropertyKeys]]", [], lkont, kont, states);
        forInHelper(node, nameNode, ref, ownKeys, 0, benv, lkont, kont, states);
        return states;
      }
  
  
  function forInHelper(node, nameNode, ref, ownKeys, i, benv, lkont, kont, states)
  {
    if (i === ownKeys.length)
    {
      const proto = callInternal(ref, "[[GetPrototypeOf]]", [], lkont, kont, states);
      for (const protoRef of proto)
      {
        const result = [];
        if (protoRef.isNull())
        {
          states.continue(L_UNDEFINED, lkont, kont);
        }
        if (protoRef.isNonNull()) // TODO: check for non-null ref/non-ref?
        {
          const ownKeys = callInternal(protoRef, "[[OwnPropertyKeys]]", [], lkont, kont, states);
          forInHelper(node, nameNode, protoRef, ownKeys, 0, benv, lkont, kont, states);
        }
      }
    }
    else
    {
      const ownKey = ownKeys[i];
      const ownProp = callInternal(ref, "[[GetOwnProperty]]", [ownKey], lkont, kont, states);
      for (const desc of ownProp)
      {
        if (desc instanceof Property && desc.Enumerable.isTrue()) // TODO instanceof? (can be prim `undefined`)
        {
          doScopeSet(nameNode, ownKey, benv, kont, states.machine);
          const frame = new ForInBodyKont(node, nameNode, ref, ownKeys, i, benv);
          states.evaluate(node.body, benv, [frame].concat(lkont), kont);
        }
        else
        {
          forInHelper(node, nameNode, ref, ownKeys, i + 1, benv, lkont, kont, states);
        }
      }
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
        const states = new States(machine);
        forInHelper(node, nameNode, ref, ownKeys, i + 1, benv, lkont, kont, states);
        return states;
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
          result = result.concat([machine.evaluate(body, benv, [frame].concat(lkont), kont)]);
        }
        if (testValue.isFalsy())
        {
          result = result.concat([machine.continue(L_UNDEFINED, lkont, kont)]);
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
      function (bodyValue, lkont, kont, machine)
      {
        var node = this.node;
        var benv = this.benv;
        var test = node.test;
        var frame = new WhileTestKont(node, benv);
        return [machine.evaluate(test, benv, [frame].concat(lkont), kont)];
      }
  WhileBodyKont.prototype.applyBreak =
      function (lkont, kont, machine)
      {
        return [machine.continue(L_UNDEFINED, lkont.slice(1), kont)];
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
          const states = new States(machine);

          function cont(j)
          {
            if (j === i)
            {
              states.continue(object, lkont, kont);
            }
            else
            {
              const propName = lat.abst1(properties[j].key.name);
              const propValue = initValues[j];
              const dataProperty = CreateDataPropertyOrThrow(object, propName, propValue, lkont, kont, states);
              for (const success of dataProperty)
              {
                if (!success.isTrue() || success.isFalse())
                {
                  throw new Error("TODO");
                }
                cont(j + 1);
              }
            }
          }

          cont(0);
          return states;
        }
        var frame = new ObjectKont(node, i + 1, benv, initValues);
        return [machine.evaluate(properties[i].value, benv, [frame].concat(lkont), kont)];
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
            arr = arr.add(indexName, Property.fromValue(initValues[j]));
          }
          arr = arr.add(P_LENGTH, Property.fromValue(lat.abst1(i)));
          machine.storeAlloc(arrAddress, arr);
          return [machine.continue(lat.abstRef(arrAddress), lkont, kont)];
        }
        var frame = new ArrayKont(node, i + 1, benv, initValues);
        return [machine.evaluate(elements[i], benv, [frame].concat(lkont), kont)];
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
        const states = new States(machine);
        const objectRef = ToObject(objectValue, node, lkont, kont, states);
        if (node.computed)
        {
          const frame = new MemberPropertyKont(node, benv, objectRef);
          states.evaluate(property, benv, [frame].concat(lkont), kont);
        }
        else
        {
          const value = doProtoLookup(lat.abst1(property.name), objectRef.addresses(), machine);
          states.continue(value, lkont, kont);
        }
        return states;
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
    return [machine.continue(value, lkont, kont)];
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
        const states = new States(machine);
        const objectRef = ToObject(objectValue, node, lkont, kont, states);
        const operands = node.arguments;
        invoke(node, objectRef, nameValue, operands, benv, lkont, kont, states);
        return states;
      }
  
  
  function invoke(application, thisValue, nameValue, operands, benv, lkont, kont, states)
  {
    var operatorValue = doProtoLookup(nameValue, thisValue.addresses(), states.machine);
    if (operands.length === 0)
    {
      if (Ast.isNewExpression(application))
      {
        applyCons(application, operatorValue, [], benv, lkont, kont, states);
      }
      else
      {
        applyProc(application, operatorValue, [], thisValue, null, lkont, kont, states);
      }
    }
    else
    {
      const frame = new OperandsKont(application, 1, benv, operatorValue, [], thisValue);
      states.evaluate(operands[0], benv, [frame].concat(lkont), kont);
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
          return [machine.evaluate(property, benv, [frame].concat(lkont), kont)];
        }
        var right = node.right;
        var nameValue = lat.abst1(property.name);
        var frame = new MemberAssignmentValueKont(node, benv, objectRef, nameValue);
        return [machine.evaluate(right, benv, [frame].concat(lkont), kont)];
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
          return [machine.evaluate(property, benv, [frame].concat(lkont), kont)];
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
        return [machine.continue(resultingValue, lkont, kont)];
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
        return [machine.evaluate(right, benv, [frame].concat(lkont), kont)];
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
     return [machine.continue(value, lkont, kont)];
   }
  
  // let genericCounter = 0;
  // function GenericKont(f)
  // {
  //   this.f = f;
  //   this.counter = genericCounter++;
  // }
  //
  // GenericKont.prototype.equals =
  //     function (x)
  //     {
  //       return x instanceof GenericKont
  //           && this.counter === x.counter
  //     }
  // GenericKont.prototype.hashCode =
  //     function ()
  //     {
  //       var prime = 31;
  //       var result = 1;
  //       result = prime * result + this.genericCounter;
  //       return result;
  //     }
  // GenericKont.prototype.toString =
  //     function ()
  //     {
  //       return "generic-" + this.counter;
  //     }
  // GenericKont.prototype.nice =
  //     function ()
  //     {
  //       return "generic-" + this.counter;
  //     }
  // GenericKont.prototype.addresses =
  //     function ()
  //     {
  //       return EMPTY_ADDRESS_SET;
  //     }
  // GenericKont.prototype.apply =
  //     function (value, lkont, kont, machine)
  //     {
  //       return f(value, lkont, kont, machine);
  //     }
  
  
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
      const prop = obj.lookup(name);
      let found = false;
      if (prop !== BOT)
      {
        found = prop.must;
        const desc = prop.value;
        
        if (IsDataDescriptor(desc))
        {
          const value = desc.Value;
          result = result.join(value);
        }
        if (IsAccessorDescriptor(desc))
        {
          throw new Error("NIY");
        }
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
  
  function lookupInternal(O, name, machine)
  {
    let result = BOT;
    const as = O.addresses().values();
    while (as.length > 0)
    {
      const a = as.pop();
      const obj = machine.storeLookup(a);
      const value = obj.getInternal(name).value;
      result = result.join(value);
    }
    return result;
  }
  
  function callInternal(O, name, args, lkont, kont, states)
  {
    const result = [];
    const as = O.addresses().values();
    for (const a of as)
    {
      const obj = states.machine.storeLookup(a);
      const fs = obj.getInternal(name).value;
      if (!fs)
      {
        throw new Error("no internal slot: " + name);
      }
      for (const f of fs)
      {
        const apply = f.apply(null, [O].concat(args).concat([lkont, kont, states]));
        for (const r of apply)
        {
          result.push(r);
        }
      }
    }
    return result;
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
      result = result.join(obj.getInternal(name).value);
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
    }
    else
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
      obj = obj.add(name, new Property(value, BOT, BOT, L_TRUE, L_TRUE, L_TRUE));
      if (hasInternalProperty(obj, "isArray").isTrue()) // TODO temp
      {
        // ES5.1 15.4.5.1
        var n = name.ToNumber();
        var i = name.ToUint32();
        if (n.equals(i))
        {
          var len = obj.lookup(P_LENGTH).value.Value;
          if (lat.gte(i, len).isTrue())
          {
            obj = obj.add(P_LENGTH, Property.fromValue(lat.add(i, L_1)));
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
  
  function createArray(realm)
  {
    var obj = new Obj();
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
    assertDefinedNotNull(Value);
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

  Property.prototype.update =
      function (x)
      {
        return new Property(
            this.Value.update(x.Value),
            this.Get.update(x.Get),
            this.Set.update(x.Set),
            this.Writable.update(x.Writable),
            this.Enumerable.update(x.Enumerable),
            this.Configurable.update(x.Configurable)
        );
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
  //
  // Property.prototype.abst =
  //     function ()
  //     {
  //       return this;
  //     }

  Property.prototype.addresses =
      function ()
      {
        return this.Value.addresses().join(this.Get.addresses()).join(this.Set.addresses());
      }

  Property.prototype.isUndefined =
  function ()
  {
    return false;
  }

  Property.prototype.isNonUndefined =
  function ()
  {
    return true;
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

  // 6.2.4.11
  function InitializeReferenceBinding(nameNode, value, benv, kont, machine)
  {
    const name = nameNode.name;
    const addr = benv.lookup(name);
    machine.storeAlloc(addr, value);
  }

  
  // 6.2.5.1
  function IsAccessorDescriptor(Desc)
  {
    if (Desc.equals(L_UNDEFINED)) // TODO: assumption = descriptors not joinable
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
    if (Desc.equals(L_UNDEFINED))
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
    if (Desc.equals(L_UNDEFINED))
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
  function FromPropertyDescriptor(Desc, node, lkont, kont, states)
  {
    if (Desc.equals(L_UNDEFINED))
    {
      return [L_UNDEFINED];
    }
    const result = [];
    const obj = ObjectCreate(kont.realm.Intrinsics.get("%ObjectPrototype%"));
    const objAddr = states.machine.alloc.object(node, kont);
    const objRef = lat.abstRef(objAddr);
    states.machine.storeAlloc(objAddr, obj);

    function writableCont()
    {
      if (Desc.Writable !== BOT)
      {
        const writable = CreateDataProperty(objRef, lat.abst1("writable"), Desc.Writable, lkont, kont, states);
        for (const success of writable)
        {
          assert(!success.isFalse());
          getterCont();
        }
      }
      else
      {
        getterCont();
      }
    }

    function getterCont()
    {
      if (Desc.Get !== BOT)
      {
        const getter = CreateDataProperty(objRef, lat.abst1("get"), Desc.Get, lkont, kont, states);
        for (const success of getter)
        {
          assert(!success.isFalse());
          setterCont();
        }
      }
      else
      {
        setterCont();
      }
    }

    function setterCont()
    {
      if (Desc.Set !== BOT)
      {
        const setter = CreateDataProperty(objRef, lat.abst1("set"), Desc.Set, lkont, kont, states);
        for (const success of setter)
        {
          assert(!success.isFalse());
          enumCont();
        }
      }
      else
      {
        enumCont();
      }
    }

    function enumCont()
    {
      if (Desc.Enumerable !== BOT)
      {
        const enum_ = CreateDataProperty(objRef, lat.abst1("enumerable"), Desc.Enumerable, lkont, kont, states);
        for (const success of enum_)
        {
          assert(!success.isFalse());
          configCont();
        }
      }
      else
      {
        configCont();
      }
    }

    function configCont()
    {
      if (Desc.Configurable !== BOT)
      {
        const config = CreateDataProperty(objRef, lat.abst1("configurable"), Desc.Configurable, lkont, kont, states);
        for (const success of config)
        {
          assert(!success.isFalse());
          result.push(objRef);
        }
      }
      else
      {
        result.push(objRef);
      }
    }

    if (Desc.Value !== BOT)
    {
      const value = CreateDataProperty(objRef, lat.abst1("value"), Desc.Value, lkont, kont, states);
      for (const success of value)
      {
        assert(!success.isFalse());
        writableCont();
      }
    }
    else
    {
      writableCont();
    }

    return result;
  }
  
  // 6.2.5.5
  function ToPropertyDescriptor(Obj, lkont, kont, states)
  {
    const result = [];
    if (Obj.isNonRef())
    {
      states.throwTypeError("6.2.5.5", lkont, kont);
    }
    if (Obj.isRef())
    {
      let desc = new Property(BOT, BOT, BOT, BOT, BOT, BOT);
      const enum_ = HasProperty(Obj, lat.abst1("enumerable"), lkont, kont, states);
      for (const hasValue of enum_)
      {
        if (hasValue.isTrue())
        {
          const enum_ = Get(Obj, lat.abst1("enumerable"), lkont, kont, states);
          for (const value of enum_)
          {
            desc.Enumerable = desc.Enumerable.join(value);
            configCont(desc);
          }
        }
        if (hasValue.isFalse())
        {
          configCont(desc);
        }
      }
    }

    function configCont(desc)
    {
      const config = HasProperty(Obj, lat.abst1("configurable"), lkont, kont, states);
      for (const hasValue of config)
      {
        if (hasValue.isTrue())
        {
          const config = Get(Obj, lat.abst1("configurable"), lkont, kont, states)// TODO ToBoolean
          for (const value of config)
          {
            desc.Configurable = desc.Configurable.join(value);
            valueCont(desc);
          }
        }
        if (hasValue.isFalse())
        {
          valueCont(desc);
        }
      }
    }

    function valueCont(desc)
    {
      const value = HasProperty(Obj, lat.abst1("value"), lkont, kont, states);
      for (const hasValue of value)
      {
        if (hasValue.isTrue())
        {
          const value_ = Get(Obj, lat.abst1("value"), lkont, kont, states);
          for (const value of value_)
          {
            desc.Value = desc.Value.join(value);
            writeCont(desc);
          }
        }
        if (hasValue.isFalse())
        {
          writeCont(desc);
        }
      }
    }

    function writeCont(desc)
    {
      const write = HasProperty(Obj, lat.abst1("writable"), lkont, kont, states);
      for (const hasValue of write)
      {
        if (hasValue.isTrue())
        {
          const write = Get(Obj, lat.abst1("writable"), lkont, kont, states)// TODO ToBoolean
          for (const value of write)
          {
            desc.Writable = desc.Writable.join(value);
            getCont(desc);
          }
        }
        if (hasValue.isFalse())
        {
          getCont(desc);
        }
      }
    }

    function getCont(desc)
    {
      const getter = HasProperty(Obj, lat.abst1("get"), lkont, kont, states);
      for (const hasValue of getter)
      {
        if (hasValue.isTrue())
        {
          const getter = Get(Obj, lat.abst1("get"), lkont, kont, states);
          for (const value of getter)
          {
            desc.Get = desc.Get.join(value); // TODO IsCallable, not undefined
            setCont(desc);
          }
        }
        if (hasValue.isFalse())
        {
          setCont(desc);
        }
      }
    }

    function setCont(desc)
    {
      const setter = HasProperty(Obj, lat.abst1("set"), lkont, kont, states);
      for (const hasValue of setter)
      {
        if (hasValue.isTrue())
        {
          const setter = Get(Obj, lat.abst1("set"), lkont, kont, states);
          for (const value of setter)
          {
            desc.Set = desc.Set.join(value); // TODO IsCallable, not undefined
            result.push(desc);       // TODO final checks on presence of Get/Set and Value/Writable
          }
        }
        if (hasValue.isFalse())
        {
          result.push(desc);      // TODO final checks on presence of Get/Set and Value/Writable
        }
      }
    }

    return result;
  }
  
  // 7.1.1
  // ToPrimitive: prelude


  // 7.1.1.1
  // OrdinaryToPrimitive: prelude

  // 7.1.3
  function ToNumber(argument, node, lkont, kont, states)
  {
    const result = [];
    // TODO
    result.push(argument.ToNumber());
    return result;
  }

  // 7.1.12
  // ToString: prelude
  // function ToString(arg, application, benv, lkont, kont, states)
  // {
  //
  // }

  // 7.1.13
  function ToObject(argument, node, lkont, kont, states)
  {
    if (fastPath && !argument.isNonRef())
    {
      return argument;
    }
    
    let result = BOT;
    if (argument.isUndefined())
    {
      states.throw(lat.abst1("7.1.13 - Undefined"), lkont, kont);
    }
    if (argument.isNull())
    {
      states.throw(lat.abst1("7.1.13 - Null"), lkont, kont);
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
      obj = obj.setInternal("[[NumberData]]", narg);
      const addr = states.machine.alloc.object(node, kont); // no number-specific alloc?
      states.machine.storeAlloc(addr, obj);
      const ref = lat.abstRef(addr);
      result = result.join(ref);
    }
    const sarg = argument.projectString();
    if (sarg !== BOT)
    {
      let obj = StringCreate(sarg, kont);
      const addr = states.machine.alloc.string(node, kont);
      states.machine.storeAlloc(addr, obj);
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
  function ToPropertyKey(argument, lkont, kont, states)
  {
    return [argument];
    
    // TODO:
    // return ToPrimitive(argument, "String", node, benv, lkont, kont,
    //   function (key)
    //   {
    //     // TODO: If Type(key) is Symbol, then Return key.
    //     return ToString(key, lkont, kont, cont);
    //   });
  }
  
  // 7.1.15
  function ToLength(argument, lkont, kont, states)
  {
    // TODO
    return [argument];
  }

  // 7.2.1
  function RequireObjectCoercible(arg, lkont, kont, states)
  {
    if (arg.isUndefined() || arg.isNull())
    {
      states.throwTypeError("7.2.1");
    }
    const result = [];
    if (arg.projectBoolean() !== BOT
        || arg.projectNumber() !== BOT
        || arg.projectString() !== BOT
        //|| arg.projectSymbol() TODO
        || arg.isRef())
    {
      result.push(arg);
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
  function Get(O, P, lkont, kont, states)
  {
    return callInternal(O, "[[Get]]", [P, O], lkont, kont, states);
  }
  
  // 7.3.4
  function CreateDataProperty(O, P, V, lkont, kont, states)
  {
    assertIsObject(O);
    assertIsPropertyKey(P);
    const newDesc = new Property(V, BOT, BOT, L_TRUE, L_TRUE, L_TRUE);
    return callInternal(O, "[[DefineOwnProperty]]", [P, newDesc], lkont, kont, states);
  }
  
  // 7.3.6
  function CreateDataPropertyOrThrow(O, P, V, lkont, kont, states)
  {
    assertIsObject(O);
    assertIsPropertyKey(P);
    const result = [];
    const dataProperty = CreateDataProperty(O, P, V, lkont, kont, states);
    for (const success of dataProperty)
    {
      if (success.isFalse())
      {
        states.throwTypeError("7.3.6", lkont, kont);
      }
      if (success.isTrue())
      {
        result.push(success);
      }
    }
    return result;
  }
  
  // 7.3.7
  function DefinePropertyOrThrow(O, P, desc, lkont, kont, states)
  {
    const ownProp = callInternal(O, "[[DefineOwnProperty]]", [P, desc], lkont, kont, states);
    const result = [];
    for (const success of ownProp)
    {
      if (success.isTrue())
      {
        result.push(success);
      }
      if (success.isFalse())
      {
        throw new Error("TODO");
      }
    }
    return result;
  }
  
  // 7.3.10
  function HasProperty(O, P, lkont, kont, states)
  {
    return callInternal(O, "[[HasProperty]]", [P], lkont, kont, states);
  }
  
  // 7.3.11
  function HasOwnProperty(O, P, lkont, kont, states)
  {
    assertIsObject(O);
    assertIsPropertyKey(P);
    let result = BOT;
    const as = O.addresses().values();
    // TODO: call [[GetOwnProperty]]
    for (const a of as)
    {
      const obj = states.machine.storeLookup(a);
      const prop = obj.lookup(P);
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
    return [result];
  }
  
  // 7.3.12
  function Call(F, V, argumentsList, cont, node, benv, lkont, kont, states)
  {
    // non-spec: argumentsList should be optional, and [] if not passed
    assert(Array.isArray(argumentsList));
    const ic = IsCallable(F, states.machine);
    if (ic.isFalse())
    {
      states.throwTypeError("not a function", lkont, kont);
    }
    if (ic.isTrue())
    {
      const frame = new CallKont(cont, node);
      applyProc(node, F, argumentsList, V, benv, [frame].concat(lkont), kont, states);
    }
  }

  function CallKont(cont, node)
  {
    this.cont = cont;
    this.node = node;
  }

  CallKont.prototype.equals =
      function (x)
      {
        return x instanceof CallKont
            && this.cont === x.cont
            && this.node === x.node
      }
  CallKont.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.node.hashCode();
        return result;
      }
  CallKont.prototype.toString =
      function ()
      {
        return "call-" + this.node.tag;
      }
  CallKont.prototype.nice =
      function ()
      {
        return "call-" + this.node.tag;
      }
  CallKont.prototype.addresses =
      function ()
      {
        return EMPTY_ADDRESS_SET;
      }
  CallKont.prototype.apply =
      function (value, lkont, kont, machine)
      {
        return cont(value, lkont, kont, machine);
      }


  // 7.3.16
  function CreateArrayFromList(elements, node, lkont, kont, states)///, cont)
  {
    assert(Array.isArray(elements)); // TODO: this is a weaker assert than in spec
    // TODO: spec
    let arr = createArray(kont.realm);
    for (let i = 0; i < elements.length; i++)
    {
      arr = arr.add(lat.abst1(String(i)), Property.fromValue(elements[i]));
    }
    arr = arr.add(P_LENGTH, Property.fromValue(lat.abst1(elements.length)));

//      const arrAddress = alloc.array(node, kont);
    //machine.storeAlloc(arrAddress, arr);
    
    //const arrRef = lat.abstRef(arrAddress);
    //return cont(arrRef, store);
    return [arr];
  }
  
  // 7.3.17
  function CreateListFromArrayLike(obj, elementTypes, lkont, kont, states)
  {
    if (elementTypes === undefined)
    {
      elementTypes = Sets.of(Types.Undefined, Types.Null, Types.Boolean, Types.String, Types.Symbol, Types.Number, Types.Object);
    }
    assert(elementTypes instanceof Set);
    const result = [];
    if (obj.isNonRef())
    {
      states.throwTypeError("7.3.17", lkont, kont);
    }
    if (obj.isRef())
    {
      const r1 = Get(obj, P_LENGTH, lkont, kont, states);
      for (const lenVal of r1)
      {
        const length = ToLength(lenVal, lkont, kont, states);
        for (const len of length)
        {
          const list = [];
          let index = L_0;
          let seen = ArraySet.empty();
          while ((!seen.contains(index)) && lat.lt(index, len).isTrue())
          {
            seen = seen.add(index);
            const indexName = index.ToString(); // TODO actual ToString call
            const next = doProtoLookup(indexName, obj.addresses(), states.machine); // TODO Get call
            const typeNext = Type(next);
            if (Sets.intersection(elementTypes, typeNext).size > 0)
            {
              list.push(next);
            }
            index = lat.add(index, L_1);
          }
          result.push(list);
        }
      }
    }
    return result;
  }
  
  // 7.3.19
  function OrdinaryHasInstance(C, O, lkont, kont, states)
  {
    const result = [];
    const ic = IsCallable(C, states.machine);
    if (ic.isFalse())
    {
      result.push(L_FALSE);
    }
    if (ic.isTrue())
    {
      // [[BoundTargetFunction]] // TODO
      if (O.isNonRef())
      {
        result.push(L_FALSE);
      }
      if (O.isRef())
      {
        const prototype = Get(C, P_PROTOTYPE, lkont, kont, states);
        for (const P of prototype)
        {
          if (P.isNonRef())
          {
            states.throwTypeError("7.3.19", lkont, kont);
          }
          if (P.isRef())
          {
            const W = [O];
            while (W.length > 0)
            {
              const O = W.pop();
              const getProto = callInternal(O, "[[GetPrototypeOf]]", [], lkont, kont, states);
              for (const O of getProto)
              {
                if (O.isNull())
                {
                  result.push(L_FALSE);
                }
                if (O.isNonNull())
                {
                  const sv = SameValue(P, O);
                  if (sv.isTrue())
                  {
                    result.push(L_TRUE);
  
                  }
                  if (sv.isFalse())
                  {
                    W.push(O);
                  }
                }
              }
            }
          }
        }
      }
    }
    return result;
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
  function OrdinaryGetPrototypeOf(O, lkont, kont, states)
  {
    const P = getInternal(O, "[[Prototype]]", states.machine);
    return [P];
  }

  // 9.1.2.1
  function OrdinarySetPrototypeOf(O, V, lkont, kont, states)
  {
    assertIsObjectOrNull(V);
    const extensible = getInternal(O, "[[Extensible]]", states.machine);
    const current = getInternal(O, "[[Prototype]]", states.machine);
    const sv = SameValue(V, current);
    const result = [];
    if (sv.isTrue())
    {
      result.push(L_TRUE);
    }
    if (sv.isFalse())
    {
      if (extensible.isFalse())
      {
        result.push(L_FALSE);
      }
      if (extensible.isTrue())
      {
        // TODO: steps 6,7,8 (loop)
        assignInternal(O, "[[Prototype]]", V, states.machine);
        result.push(L_TRUE);
      }
    }
    return result;
  }
  
  // 9.1.5.1
  function OrdinaryGetOwnProperty(O, P, lkont, kont, states)
  {
    assertIsPropertyKey(P);
    const result = [];
    const as = O.addresses().values();
    for (const a of as)
    {
      const obj = states.machine.storeLookup(a);
      const X = obj.lookup(P);
      if (X === BOT || !X.must)
      {
        result.push(L_UNDEFINED);
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
        result.push(D);
      }
    }
    return result;
  }
  
  // 9.1.6.1
  function OrdinaryDefineOwnProperty(O, P, Desc, lkont, kont, states)
  {
    const result = [];
    const ownProps = callInternal(O, "[[GetOwnProperty]]", [P], lkont, kont, states);
    for (const current of ownProps)
    {
      const extensible = lookupInternal(O, "[[Extensible]]", states.machine);
      const valApp = ValidateAndApplyPropertyDescriptor(O, P, extensible, Desc, current, lkont, kont, states);
      for (const r of valApp)
      {
        result.push(r);
      }
    }
    return result;
  }
  
  // 9.1.6.3
  function ValidateAndApplyPropertyDescriptor(O, P, extensible, Desc, current, lkont, kont, states)
  {
    // step 1
    if (O.isNonUndefined())
    {
      assertIsPropertyKey(P);
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
        if (IsGenericDescriptor(Desc) || IsDataDescriptor(Desc))
        {
          if (O.isNonUndefined())
          {
            const D = new Property(Desc.Value === BOT ? L_UNDEFINED : Desc.Value, BOT, BOT, Desc.Writable === BOT ? L_FALSE : Desc.Writable, Desc.Enumerable === BOT ? L_FALSE : Desc.Enumerable, Desc.Configurable === BOT ? L_FALSE : Desc.Configurable);
            const as = O.addresses().values();
            for (const a of as)
            {
              let obj = states.machine.storeLookup(a);
              obj = obj.add(P, D);
              states.machine.storeUpdate(a, obj);
            }
          }
        }
        if (IsAccessorDescriptor(Desc))
        {
          if (O.isNonUndefined())
          {
            const D = new Property(BOT, Desc.Get === BOT ? L_UNDEFINED : Desc.Get, Desc.Set === BOT ? L_UNDEFINED : Desc.Set, /*Desc.Writable === BOT ? L_FALSE : Desc.Writable*/ BOT, Desc.Enumerable === BOT ? L_FALSE : Desc.Enumerable, Desc.Configurable === BOT ? L_FALSE : Desc.Configurable);
            const as = O.addresses().values();
            for (const a of as)
            {
              let obj = states.machine.storeLookup(a);
              obj = obj.add(P, D);
              states.machine.storeUpdate(a, obj);
            }
          }
        }
        result = result.join(L_TRUE);
      }
    }
    // step 3
    if (current.isNonUndefined())
    {
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
          if (Desc.Configurable === BOT || Desc.Configurable.isFalse())
          {
            if (Desc.Enumerable !== BOT && lat.neqq(current.Enumerable, Desc.Enumerable).isTrue())
            {
              result = result.join(L_FALSE);
            }  
          }
        }
        // step 5
        if (current.Configurable.isTrue())
        {
          if (IsGenericDescriptor(Desc))
          {
            result = result.join(L_TRUE);
          }
          else
          {
            // step 6
            if (IsDataDescriptor(current) !== IsDataDescriptor(Desc))
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
                      let obj = states.machine.storeLookup(a);
                      obj = obj.add(P, D);
                      states.machine.storeUpdate(a, obj);
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
                      let obj = states.machine.storeLookup(a);
                      obj = obj.add(P, D);
                      states.machine.storeUpdate(a, obj);
                    }    
                  }
                }
                result = result.join(L_TRUE); // not in spec?
              }
            }
            else
            {
              // step 7
              if (IsDataDescriptor(current) && IsDataDescriptor(Desc))
              {
                if (current.Configurable.isFalse() && current.Writable.isFalse())
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
                else //?
                {
                  step9();
                }
              }
              else
              {
                  // step 8
                if (IsAccessorDescriptor(current) && IsAccesorDescriptor(Desc))
                {
                  if (current.Configurable.isFalse())
                  {
                    if (Desc.Set !== BOT && SameValue(Desc.Set, current.Set).isFalse())
                    {
                      result = result.join(L_FALSE);
                    }
                    if (Desc.Set === BOT || SameValue(Desc.Set, current.Set).isTrue())
                    {
                      if (Desc.Get !== BOT && SameValue(Desc.Get, current.Get).isFalse())
                      {
                        result = result.join(L_FALSE);
                      }
                      if (Desc.Get === BOT || SameValue(Desc.Get, current.Get).isTrue())
                      {
                        result = result.join(L_TRUE);
                      }                          
                    }
                  }
                }
                else
                {
                  step9();
                }
              }
            }
          }
        }
      }
    }

    function step9()
    {
      if (O.isNonUndefined())
      {
        const D = new Property(Desc.Value === BOT ? L_UNDEFINED : Desc.Value, Desc.Get === BOT ? L_UNDEFINED : Desc.Get, Desc.Set === BOT ? L_UNDEFINED : Desc.Set,
            Desc.Writable === BOT ? L_FALSE : Desc.Writable, Desc.Enumerable === BOT ? L_FALSE : Desc.Enumerable, Desc.Configurable === BOT ? L_FALSE : Desc.Configurable);
        const as = O.addresses().values();
        for (const a of as)
        {
          let obj = states.machine.storeLookup(a);
          obj = obj.add(P, D);
          states.machine.storeUpdate(a, obj);
        }
      }
      result = result.join(L_TRUE);
    }

    return [result];
  }
  
  
  // 9.1.7.1
  function OrdinaryHasProperty(O, P, lkont, kont, states)
  {
    assertIsPropertyKey(P);
    const result = [];
    const ownProps = callInternal(O, "[[GetOwnProperty]]", [P], lkont, kont, states);
    for (const hasOwn of ownProps)
    {
      if (!hasOwn.equals(L_UNDEFINED))
      {
        result.push(L_TRUE);
      }
      else
      {
        const proto = callInternal(O, "[[GetPrototypeOf]]", [], lkont, kont, states);
        for (const parent of proto)
        {
          if (parent.isNonNull())
          {
            const hasProp = callInternal(parent, "[[HasProperty]]", [P], lkont, kont, states);
            for (const r of hasProp)
            {
              result.push(r);
            }
          }
          if (parent.isNull())
          {
            result.push(L_FALSE);
          }
        }
      }
    }
    return result;
  }
  
  // 9.1.8.1
  function OrdinaryGet(O, P, Receiver, lkont, kont, states)
  {
    //return invokeMeta("OrdinaryGet", [O, P, Receiver], lkont, kont, as);
    const value = doProtoLookup(P, O.addresses(), states.machine);
    return [value];
  }
  
  // 9.1.9.1
  function OrdinarySet(O, P, V, Receiver)
  {
    assertIsPropertyKey(P);
    // TODO
    throw new Error("TODO 9.1.9.1");
  }
  
  // 9.1.11.1
  function OrdinaryOwnPropertyKeys(O, lkont, kont, states)
  {
    let keys = ArraySet.empty();
    const as = O.addresses().values();
    for (const a of as)
    {
      const obj = states.machine.storeLookup(a);
      // TODO: symbols, ascending numeric, chronological order, etc.
      // TODO: subsumption checking
      
      keys = keys.addAll(obj.names());
    }
    return keys.values();
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
  function OrdinaryCreateFromConstructor(constructor, intrinsicDefaultProto, internalSlotsList, lkont, kont, states)
  {
    assert(kont.realm.Intrinsics.has(intrinsicDefaultProto)); // TODO 'intension' part
    const proto = GetPrototypeFromConstructor(constructor, intrinsicDefaultProto, lkont, kont, states);
    return ObjectCreate(proto, internalSlotsList);
  }
  
  // 9.1.14
  function GetPrototypeFromConstructor(constructor, intrinsicDefaultProto, lkont, kont, states)
  {
    assert(kont.realm.Intrinsics.has(intrinsicDefaultProto)); // TODO 'intension' part
    assert(IsCallable(constructor, states.machine));
    const get = Get(constructor, P_PROTOTYPE, lkont, kont, states);
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
    let obj = new Obj();
    obj = obj.setInternal("[[Prototype]]", kont.realm.Intrinsics.get("%StringPrototype%"));
    obj = obj.setInternal("[[StringData]]", lprim);
    obj = obj.setInternal("[[Get]]", SetValueNoAddresses.from1(OrdinaryGet));
    obj = obj.add(P_LENGTH, Property.fromValue(lprim.stringLength()));
    return obj;
  }
  
  // 12.10.4
  function InstanceofOperator(O, C, lkont, kont, states)
  {
    let result = [];
    if (O.isNonRef())
    {
      states.continue(L_FALSE, lkont, kont);
    }
    // TODO instHandler
    const c = IsCallable(C, states.machine);
    if (c.isFalse())
    {
      throw new Error("TODO");
    }
    if (c.isTrue())
    {
      const hasInstance = OrdinaryHasInstance(C, O, lkont, kont, states);
      for (const r of hasInstance)
      {
        result.push(r);
      }
    }
    return result;
  }
  
  // 13.7.5.12
  // function ForInOfHeadEvaluation(TDZnames, expr, iterationKind, lkont, kont, states)

  // 19.1.2.3.1
  function ObjectDefineProperties(O, Properties, node, lkont, kont, states)
  {
    if (O.isNonRef())
    {
      states.throwTypeError("19.1.2.3.1", lkont, kont);
    }
    if (O.isRef())
    {
      const result = [];
      const props = ToObject(Properties, node, lkont, kont, states);
      const keys = callInternal(props, "[[OwnPropertyKeys]]", [], lkont, kont, states);
      const W = [{keys, descriptors: []}];
      while (W.length > 0)
      {
        const {keys, descriptors} = W.pop();
        if (keys.length === 0)
        {
          for (const pair of descriptors)
          {
            const [P, desc] = pair;
            const dpot = DefinePropertyOrThrow(O, P, desc, lkont, kont, states);
            for (const success of dpot)
            {
              if (success.isTrue())
              {
                result.push(O);
              }
            }
          }
        }
        else
        {
          const nextKey = keys[0];
          const ownProp = callInternal(props, "[[GetOwnProperty]]", [nextKey], lkont, kont, states);
          for (const propDesc of ownProp)
          {
            if (propDesc !== undefined && propDesc.Enumerable.isTrue())
            {
              const get = Get(props, nextKey, lkont, kont, states);
              for (const descObj of get)
              {
                const toPropDesc = ToPropertyDescriptor(descObj, lkont, kont, states);
                for (const desc of toPropDesc) // internal value
                {
                  const descriptors2 = descriptors.slice(0);
                  descriptors2.push([nextKey, desc]);
                  const keys2 = keys.slice(1);
                  W.push({keys: keys2, descriptors: descriptors2});
                }
              }
            }
          }
        }
      }
      return result;
    }
  }
  
  // 19.1.2.6
  function objectFreeze(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [O] = operandValues;
    // TODO
    states.continue(O, lkont, kont);
  }
  
  // 19.1.2.9
  function objectGetOwnPropertyNames(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [O] = operandValues;
    const ownProps = GetOwnPropertyKeys(O, Sets.of(Types.String), application, lkont, kont, states);
    for (const arrRef of ownProps)
    {
      states.continue(arrRef, lkont, kont);
    }
  }
  
  // 19.1.2.10.1
  function GetOwnPropertyKeys(O, Type_, node, lkont, kont, states)
  {
    const result = [];
    const obj = ToObject(O, node, lkont, kont, states);
    const keys = callInternal(obj, "[[OwnPropertyKeys]]", [], lkont, kont, states);
    let nameList = [];
    for (const nextKey of keys)
    {
      if (Sets.intersection(Type_, Type(nextKey)).size > 0)
      {
        nameList.push(nextKey);
      }
    }
    const create = CreateArrayFromList(nameList, node, lkont, kont, states);
    for (const arr of create)
    {
      const arrAddress = states.machine.alloc.array(node, kont);
      states.machine.storeAlloc(arrAddress, arr);
      const ref = lat.abstRef(arrAddress);
      result.push(ref);
    }
    return result;
  }

  // 19.1.2.20
  function objectSetPrototypeOf(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [O, Proto] = operandValues;
    const roc = RequireObjectCoercible(O, lkont, kont, states);
    for (const O of roc)
    {
      // const typeProto = Type(proto);
      // const typeObjectNull = Sets.intersection(typeProto, new Set([Types.Object, Types.Null]))
      // const neitherObjectNorNull = typeProto.size > typeObjectNull.size;
      // const objectOrNull = typeObjectNull.size > 0;
      if (isNeitherObjectNorNull(Proto))
      {
        states.throwTypeError("19.1.2.20-1", lkont, kont);
      }
      if (isObject(Proto) || isNull(Proto))
      {
        if (O.isNonRef())
        {
          states.continue(O, lkont, kont);
        }
        if (O.isRef())
        {
          const spo = callInternal(O, "[[SetPrototypeOf]]", [Proto], lkont, kont, states);
          for (const value of spo)
          {
            if (value.isFalse())
            {
              states.throwTypeError("19.1.2.20-2", lkont, kont);
            }
            if (value.isTrue())
            {
              states.continue(O, lkont, kont);
            }
          }
        }
      }
    }
  }

  // 19.2.1.1.1: placeholder, not even close to spec
//  function createDynamicFunction(constructor, newTarget, kind, args, benv, lkont, kont, states) // specc sig
  function createDynamicFunction(argsText, bodyText, benv, lkont, kont, states)
  {
    const functionText = "(function (" + argsText.join(", ") + ") {" + bodyText + "})";
    const functionNode = Ast.createAst(new StringResource(functionText)).body[0].expression;
    const closureRef = allocateClosure(functionNode, benv, lkont, kont, states.machine);
    states.continue(closureRef, lkont, kont);
  }

  function $createFunction(argsText, bodyText, benv, lkont, kont, machine)
  {
    const states = new States(machine);
    createDynamicFunction(argsText, bodyText, benv, lkont, kont, states);
    return states;
  }



  // 19.2.3.1
  function functionApply(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const ic = IsCallable(thisValue, states.machine);
    if (ic.isFalse())
    {
      states.throwTypeError("19.2.3.1", lkont, kont);
    }
    if (ic.isTrue())
    {
      const thisArg = operandValues[0];
      const argArray = operandValues[1];
      // TODO: PrepareForTailCall()
      if (!argArray)
      {
        applyProc(application, thisValue, [], thisArg, null, lkont, kont, states);
      }
      else
      {
        const r1 = CreateListFromArrayLike(argArray, undefined, lkont, kont, states);
        for (const argList of r1)
        {
          // TODO: PrepareForTailCall()
          applyProc(application, thisValue, argList, thisArg, null, lkont, kont, states);
        }
      }
    }
  }
  
  // 19.2.3.3
  function functionCall(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    let result = [];
    const ic = IsCallable(thisValue, states.machine);
    if (ic.isFalse())
    {
      states.throwTypeError("19.2.3.3", lkont, kont);
    }
    if (ic.isTrue())
    {
      const thisArg = operandValues[0];
      const argList = operandValues.slice(1);
      // TODO: PrepareForTailCall()
      applyProc(application, thisValue, argList, thisArg, null, lkont, kont, states);
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
    obj = obj.setInternal("[[Call]]", ArraySet.from1(Call));
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
    
    function allocNative()
    {
      return machine.alloc.native();
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
      
      const queueA = "ScriptJobs";
      machine.storeAlloc(queueA, new JobQueue());
      
      //var globalenva = "globalenv@0";
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
        object = object.add(lat.abst1(propertyName), new Property(value, BOT, BOT, L_FALSE, L_FALSE, L_FALSE));//Property.fromValue(value));
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
      var objectP = ObjectCreate(L_NULL);
//  objectP.toString = function () { return "~Object.prototype"; }; // debug
      var objecta = allocNative();
      objectP = registerProperty(objectP, "constructor", lat.abstRef(objecta));
      //objectP = registerPrimitiveFunction(objectP, "isPrototypeOf", objectPIsPrototypeOf);
      
      var object = createPrimitive(null, objectConstructor, realm);
      object = object.add(P_PROTOTYPE, Property.fromValue(objectProtoRef));//was objectProtoRef
      global = global.add(lat.abst1("Object"), Property.fromValue(lat.abstRef(objecta)));
      
      object = registerPrimitiveFunction(object, "freeze", objectFreeze);
      //object = registerPrimitiveFunction(object, "create", objectCreate);
      //object = registerPrimitiveFunction(object, objecta, "getPrototypeOf", objectGetPrototypeOf);
      //object = registerPrimitiveFunction(object, objecta, "defineProperty", objectDefineProperty);
      object = registerPrimitiveFunction(object, "setPrototypeOf", objectSetPrototypeOf);
      machine.storeAlloc(objecta, object);
      
      objectP = registerPrimitiveFunction(objectP, "hasOwnProperty", objectHasOwnProperty);
      objectP = registerPrimitiveFunction(objectP, "getOwnPropertyNames", objectGetOwnPropertyNames);
      machine.storeAlloc(objectPa, objectP);
      // END OBJECT
      
      
      // BEGIN FUNCTION
      var functionP = ObjectCreate(objectProtoRef);
      var functiona = allocNative();
      var functionP = registerProperty(functionP, "constructor", lat.abstRef(functiona));
      

      var fun = createPrimitive(functionFunction, functionFunction, realm);
      fun = fun.add(P_PROTOTYPE, Property.fromValue(functionProtoRef));
      global = global.add(lat.abst1("Function"), Property.fromValue(lat.abstRef(functiona)));
      machine.storeAlloc(functiona, fun);
      
      functionP = registerPrimitiveFunction(functionP, "call", functionCall);
      functionP = registerPrimitiveFunction(functionP, "apply", functionApply);

      machine.storeAlloc(functionPa, functionP);

      const emptyFunctionNode = Ast.createAst(new StringResource("(function () {})")).body[0].expression;

      function functionFunction(application, operandValues, thisValue, benv, lkont, kont, states)
      {
        if (operandValues.length === 0)
        {
          const closureRef = allocateClosure(emptyFunctionNode, benv, lkont, kont, states.machine);
          states.continue(closureRef, lkont, kont);
        }
        else
        {
          const bodyText = operandValues[operandValues.length - 1].conc1();
          const argsText = [];
          for (let i = 0; i < operandValues.length - 1; i++)
          {
            argsText.push(operandValues[i].conc1());
          }
          createDynamicFunction(argsText, bodyText, benv, lkont, kont, states);
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
      error = error.add(P_PROTOTYPE, Property.fromValue(errorProtoRef));
      global = global.add(lat.abst1("Error"), Property.fromValue(lat.abstRef(errora)));
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
      string = string.add(P_PROTOTYPE, Property.fromValue(intrinsics.get("%StringPrototype%")));
      global = global.add(lat.abst1("String"), Property.fromValue(lat.abstRef(stringa)));
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
      number = number.add(P_PROTOTYPE, Property.fromValue(intrinsics.get("%NumberPrototype%")));
      global = global.add(lat.abst1("Number"), Property.fromValue(lat.abstRef(numbera)));
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
      array = array.add(P_PROTOTYPE, Property.fromValue(arrayProtoRef));
      global = global.add(lat.abst1("Array"), Property.fromValue(lat.abstRef(arraya)));
      machine.storeAlloc(arraya, array);
      
      arrayP = registerPrimitiveFunction(arrayP, "toString", arrayToString);
      arrayP = registerPrimitiveFunction(arrayP, "concat", arrayConcat);
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
      global = global.add(lat.abst1("Math"), Property.fromValue(lat.abstRef(matha)));
      
      
      function mathSqrt(application, operandValues, thisValue, benv, lkont, kont, states)
      {
        var value = lat.sqrt(operandValues[0]);
        states.continue(value, lkont, kont);
      }
      
      function mathAbs(application, operandValues, thisValue, benv, lkont, kont, states)
      {
        var value = lat.abs(operandValues[0]);
        states.continue(value, lkont, kont);
      }
      
      function mathRound(application, operandValues, thisValue, benv, lkont, kont, states)
      {
        var value = lat.round(operandValues[0]);
        states.continue(value, lkont, kont);
      }
      
      function mathFloor(application, operandValues, thisValue, benv, lkont, kont, states)
      {
        var value = lat.floor(operandValues[0]);
        states.continue(value, lkont, kont);
      }
      
      function mathCos(application, operandValues, thisValue, benv, lkont, kont, states)
      {
        var value = lat.cos(operandValues[0]);
        states.continue(value, lkont, kont);
      }
      
      function mathSin(application, operandValues, thisValue, benv, lkont, kont, states)
      {
        var value = lat.sin(operandValues[0]);
        states.continue(value, lkont, kont);
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
      
      function mathRandom(application, operandValues, thisValue, benv, lkont, kont, states)
      {
        var value = lat.abst1(random());
        states.continue(value, lkont, kont);
      }

      // 20.2.2.24
      function mathMax(application, operandValues, thisValue, benv, lkont, kont, states)
      {
        var value = lat.max(operandValues[0], operandValues[1]);
        states.continue(value, lkont, kont);
      }

      // 20.2.2.25
      function mathMin(application, operandValues, thisValue, benv, lkont, kont, states)
      {
        var value = lat.min(operandValues[0], operandValues[1]);
        states.continue(value, lkont, kont);
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
      global = global.add(lat.abst1("$BASE$"), Property.fromValue(lat.abstRef(basea)));
      // END BASE

      // BEGIN PERFORMANCE
      let perf = ObjectCreate(realm.Intrinsics.get("%ObjectPrototype%"));
      const perfa = allocNative();
      perf = registerPrimitiveFunction(perf, "now", performanceNow, null);
      machine.storeAlloc(perfa, perf);
      global = registerProperty(global, "performance", lat.abstRef(perfa));

      function performanceNow(application, operandValues, thisValue, benv, lkont, kont, states)
      {
        var value = lat.abst1(performance.now());
        states.continue(value, lkont, kont);
      }

      // END PERFORMANCE


      function $join(application, operandValues, thisValue, benv, lkont, kont, states)
      {
        var value = operandValues.reduce(Lattice.join, BOT);
        states.continue(value, lkont, kont);
      }

      function _print(application, operandValues, thisValue, benv, lkont, kont, states)
      {
        console.log.apply(null, operandValues);
        states.continue(L_UNDEFINED, lkont, kont);
      }

      function globalParseInt(application, operandValues, thisValue, benv, lkont, kont, states)
      {
        var value = operandValues[0].parseInt(); // TODO: 2nd (base) arg
        states.continue(value, lkont, kont);
      }
      global = registerPrimitiveFunction(global, "parseInt", globalParseInt);

      function globalWrapService(application, operandValues, thisValue, benv, lkont, kont, states)
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
        const servicea = states.machine.alloc.object(application, kont);
        for (const [operationName, ops] of model)
        {
          const applyFunction = function (application, operandValues, thisValue, benv, lkont, kont, states)
          {
            for (const {args, result} of ops)
            {
              if (args.equals(operandValues))
              {
                states.continue(result, lkont, kont);
              }
            }
          };
          var primFunObject = createPrimitive(applyFunction, null, kont.realm);
          var primFunObjectAddress = allocNative();
          machine.storeAlloc(primFunObjectAddress, primFunObject);
          service = registerProperty(service, operationName, lat.abstRef(primFunObjectAddress));
        }
        machine.storeAlloc(servicea, service);
        states.continue(lat.abstRef(servicea), lkont, kont);
      }
      global = registerPrimitiveFunction(global, "wrapService", globalWrapService);


      machine.storeAlloc(globala, global);
      // END GLOBAL

      const kont = createContext(null, realm.GlobalObject, realm, "globalctx" + (glcount++), ArraySet.empty().add("ScriptJobs"), null, machine);
      // console.log("CREATED context " + kont);
      return kont;
    } // end initialize2

    const initialKont = initialize2(Benv.empty());
    const koState = machine.continue(L_UNDEFINED, [], initialKont);
    return koState;
  }

  function objectConstructor(application, operandValues, protoRef, benv, lkont, kont, states)
  {
    var obj = ObjectCreate(protoRef);
    var objectAddress = states.machine.alloc.object(application, kont);
    states.machine.storeAlloc(objectAddress, obj);
    var objRef = lat.abstRef(objectAddress);
    states.continue(objRef, lkont, kont);
  }

  // // 19.1.2.2
  // function objectCreate(application, operandValues, thisValue, benv, lkont, kont, machine)
  // {
  //   const [O, Properties] = operandValues;
  //   var obj = ObjectCreate(O);
  //
  //   // step 3
  //   if (Properties !== undefined)
  //   {
  //     return ObjectDefineProperties(obj, Properties, application, lkont, kont, objectCreateCont);
  //   }
  //   return objectCreateCont(obj, store);
  //
  //   // step 4
  //   function objectCreateCont(obj, store)
  //   {
  //     const objectAddress = alloc.object(application, kont);
  //     machine.storeAlloc(objectAddress, obj);
  //     const objRef = lat.abstRef(objectAddress);
  //     return [{state: machine.continue(objRef, lkont, kont, machine)}];
  //   }
  // }

  // // 19.1.2.4
  // function objectDefineProperty(application, operandValues, thisa, benv, lkont, kont, machine)
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
  //   //       var obj = machine.storeLookup(objectAddress);
  //   //       result = result.join(obj.Prototype);
  //   //     });
  //   // return [{state:machine.continue(result, lkont, kont)];
  // }


  function objectHasOwnProperty(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [V] = operandValues;
    const key = ToPropertyKey(V, lkont, kont, states);
    for (const P of key)
    {
      const O = ToObject(thisValue, application, lkont, kont, states);
      const has = HasOwnProperty(O, P, lkont, kont, states);
      for (const value of has)
      {
        states.continue(value, lkont, kont);
      }
    }
  }

  function errorFunction(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    return errorInitializer(application, operandValues, benv, lkont, kont, states);
  }

  function errorConstructor(application, operandValues, protoRef, benv, lkont, kont, states)
  {
    return errorInitializer(application, operandValues, benv, lkont, kont, states);
  }

  function errorInitializer(application, operandValues, benv, lkont, kont, states)
  {
    const message = operandValues.length === 1 && operandValues[0] !== BOT ? operandValues[0].ToString() : L_EMPTY_STRING;
    const obj = createError(message, kont.realm);
    var errAddress = states.machine.alloc.error(application, kont);
    states.machine.storeAlloc(errAddress, obj);
    var errRef = lat.abstRef(errAddress);
    states.continue(errRef, lkont, kont);
  }

  // 20.1.1.1
  function numberFunction(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    if (operandValues.length === 0)
    {
      states.continue(L_0, lkont, kont);
    }
    else
    {
      const tn = ToNumber(operandValues[0], application, lkont, kont, states);
      for (const value of tn)
      {
        states.continue(value, lkont, kont);
      }
    }
  }

  // 20.1.1.1
  function numberConstructor(application, operandValues, protoRef, benv, lkont, kont, states)
  {

    let tn;
    if (operandValues.length === 0)
    {
      tn = [L_0];
    }
    else
    {
      tn = ToNumber(operandValues[0], application, lkont, kont, states);
    }
    for (const value of tn)
    {
      let obj = ObjectCreate(kont.realm.Intrinsics.get("%NumberPrototype%")); // TODO OrdinaryCreateFromConstructor
      obj = obj.setInternal("[[NumberData]]", value);
      const addr = states.machine.alloc.object(application, kont); // no number-specific alloc?
      states.machine.storeAlloc(addr, obj);
      const ref = lat.abstRef(addr);
      states.continue(ref, lkont, kont);
    }
  }

  // 21.1.1.1
  function stringFunction(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    if (operandValues.length === 0)
    {
      states.continue(L_EMPTY_STRING, lkont, kont);
    }
    else
    {
      const operatorValue = baseReg.get("ToString");
      applyProc(application, operatorValue, operandValues, thisValue, benv, lkont, kont, states);
    }
  }

  // 21.1.3.1
  function stringCharAt(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    var lprim = getInternal(thisValue, "[[StringData]]", states.machine);
    var value = lprim.charAt(operandValues[0]);
    states.continue(value, lkont, kont);
  }

  // 21.1.3.2
  function stringCharCodeAt(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    var lprim = getInternal(thisValue, "[[StringData]]", states.machine);
    var value = lprim.charCodeAt(operandValues[0]);
    states.continue(value, lkont, kont);
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
  function stringStartsWith(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    var lprim = getInternal(thisValue, "[[StringData]]", states.machine);
    var value = lprim.startsWith(operandValues[0]);
    states.continue(value, lkont, kont);
  }

  // 21.1.3.22
  // substring: prelude

  // 21.1.3.25
  // toString: prelude

  function arrayConcat(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    if (operandValues.length !== 1)
    {
      throw new Error("TODO array.concat");
    }
    for (const thisa of thisValue.addresses())
    {
      var thisArr = states.machine.storeLookup(thisa);
      var thisLen = thisArr.lookup(P_LENGTH).value.Value;
      var argAddrs = operandValues[0].addresses();
      var resultArr = createArray(kont.realm);
      var i = L_0;
      var seen = ArraySet.empty();
      while ((!seen.contains(i)) && lat.lt(i, thisLen).isTrue())
      {
        seen = seen.add(i);
        var iname = i.ToString();
        var v = doProtoLookup(iname, ArraySet.from1(thisa), states.machine);
        resultArr = resultArr.add(iname, Property.fromValue(v));
        i = lat.add(i, L_1);
      }
      argAddrs.forEach(
          function (argAddr)
          {
            var argArr = states.machine.storeLookup(argAddr);
            var argLen = argArr.lookup(P_LENGTH).value.Value;
            var i = L_0;
            var seen = ArraySet.empty();
            while ((!seen.contains(i)) && lat.lt(i, argLen).isTrue())
            {
              seen = seen.add(i);
              var iname = i.ToString();
              var v = doProtoLookup(iname, ArraySet.from1(argAddr), states.machine);
              resultArr = resultArr.add(lat.add(thisLen, i).ToString(), Property.fromValue(argArr.lookup(iname).value.Value, BOT));
              i = lat.add(i, L_1);
            }
            resultArr = resultArr.add(P_LENGTH, Property.fromValue(lat.add(thisLen, i)));
          });
      var arrAddress = states.machine.alloc.array(application, kont);
      states.machine.storeAlloc(arrAddress, resultArr);
      states.continue(lat.abstRef(arrAddress), lkont, kont);
    }
  }

  function arrayConstructor(application, operandValues, protoRef, benv, lkont, kont, states)
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
    arr = arr.add(P_LENGTH, Property.fromValue(length));

    var arrAddress = states.machine.alloc.array(application, kont);
    states.machine.storeAlloc(arrAddress, arr);
    var arrRef = lat.abstRef(arrAddress);
    states.continue(arrRef, lkont, kont);
  }

  function arrayFunction(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    var arr = createArray(kont.realm);
    for (var i = 0; i < operandValues.length; i++)
    {
      arr = arr.add(lat.abst1(String(i)), Property.fromValue(operandValues[i]));
    }
    arr = arr.add(P_LENGTH, Property.fromValue(lat.abst1(operandValues.length)));

    var arrAddress = states.machine.alloc.array(application, kont);
    states.machine.storeAlloc(arrAddress, arr);
    var arrRef = lat.abstRef(arrAddress);
    states.continue(arrRef, lkont, kont);
  }

  function arrayToString(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    assert(states);
    // TODO: this is a hack (no actual ToString called)
    const create = CreateListFromArrayLike(thisValue, undefined, lkont, kont, states);
    for (const list of create)
    {
      states.continue(lat.abst1(list.join()), lkont, kont);
    }
  }

  // 22.1.3.15
  // Array.prototype.join: prelude

  // 22.1.3.14
  function arrayPush(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    for (const thisa of thisValue.addresses().values())
    {
      var arr = states.machine.storeLookup(thisa);
      var len = arr.lookup(P_LENGTH).value.Value;
      var lenStr = len.ToString();
      arr = arr.add(lenStr, Property.fromValue(operandValues[0]))
      var len1 = lat.add(len, L_1);
      arr = arr.add(P_LENGTH, Property.fromValue(len1));
      states.machine.storeUpdate(thisa, arr);
      states.continue(len1, lkont, kont);
    }
  }

  const baseReg = new Map(); // TODO: state!!!

  function baseNumberToString(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [m] = operandValues;
    states.continue(m.ToString(), lkont, kont);
  }

  function baseRegister(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [key, F] = operandValues;
    baseReg.set(key.conc1(), F);
    states.continue(L_TRUE, lkont, kont);
  }

  function baseDefinePropertyOrThrow(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [O, key, desc] = operandValues;
    const int = DefinePropertyOrThrow(O, key, desc, lkont, kont, states);
    for (const value of int)
    {
      states.continue(value, lkont, kont);
    }
  }

  function baseObjectDefineProperties(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [O, Properties] = operandValues;
    const int = ObjectDefineProperties(O, Properties, application, lkont, kont, states);
    for (const value of int)
    {
      states.continue(value, lkont, kont);
    }
  }

  function baseNewPropertyDescriptor(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const property = Property.fromValue(BOT);
    states.continue(property, lkont, kont);
  }

  function baseToPropertyKey(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [argument] = operandValues;
    const int = ToPropertyKey(argument, lkont, kont, states);
    for (const value of int)
    {
      states.continue(value, lkont, kont);
    }
  }

  function baseToPropertyDescriptor(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [Attributes] = operandValues;
    const int = ToPropertyDescriptor(Attributes, lkont, kont, states);
    for (const desc of int)
    {
      states.continue(desc, lkont, kont);
    }
  }

  function baseFromPropertyDescriptor(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [Desc] = operandValues;
    const int = FromPropertyDescriptor(Desc, application, lkont, kont, states);
    for (const value of int)
    {
      states.continue(value, lkont, kont);
    }
  }

  function baseStringCreate(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [value] = operandValues; // TODO pass prototype as second param
    const obj = StringCreate(value, kont);
    const obja = states.machine.alloc.string(application, kont);
    states.machine.storeAlloc(obja, obj);
    const ref = lat.abstRef(obja);
    states.continue(ref, lkont, kont);
  }

  function baseObjectCreate(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [proto, internalSlotsList] = operandValues;
    const obj = ObjectCreate(proto, internalSlotsList);
    const objAddr = states.machine.alloc.object(application, kont);
    states.machine.storeAlloc(objAddr, obj);
    const ref = lat.abstRef(objAddr);
    states.continue(ref, lkont, kont);
  }

  function baseToObject(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [O] = operandValues;
    const objectRef = ToObject(O, application, lkont, kont, states);
    states.continue(objectRef, lkont, kont);
  }

  function baseSameValue(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [x, y] = operandValues;
    const value = SameValue(x,y);
    states.continue(value, lkont, kont);
  }

  function baseSameNumberValue(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [x, y] = operandValues;
    states.continue(x.hasSameNumberValue(y), lkont, kont);
  }

  function baseSameBooleanValue(application, operandValues, thisValue, benv, lkont, kont, states)
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
    states.continue(result, lkont, kont);
  }

  function baseSameStringValue(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [x, y] = operandValues;
    states.continue(x.hasSameStringValue(y), lkont, kont);
  }

  function baseSameObjectValue(application, operandValues, thisValue, benv, lkont, kont, states)
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
    states.continue(result, lkont, kont);
  }

  function baseAddIntrinsic(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [Name, Value] = operandValues;
    kont.realm.Intrinsics.add(Name.conc1(), Value);
    states.continue(lat.abst1(undefined), lkont, kont);
  }

  function baseHasInternal(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [O, Name] = operandValues;
    const result = hasInternal(O, Name.conc1(), states.machine);
    states.continue(result, lkont, kont);
  }

  function baseLookupInternal(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [O, Name] = operandValues;
    const result = lookupInternal(O, Name.conc1(), states.machine);
    states.continue(result, lkont, kont);
  }

  function baseCallInternal(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [O, Name, ...args] = operandValues;
    const call = callInternal(O, Name.conc1(), args, lkont, kont, states);
    for (const value of call)
    {
      assertDefinedNotNull(value);
      states.continue(value, lkont, kont);
    }
  }

  function baseAssignInternal(application, operandValues, thisValue, benv, lkont, kont, states)
  {
    const [O, Name, Value] = operandValues;
    assignInternal(O, Name.conc1(), Value, states.machine);
    states.continue(lat.abst1(undefined), lkont, kont);
  }

  function ScriptEvaluationJob(resource)
  {
    this.resource = resource;
  }
  
  ScriptEvaluationJob.prototype.execute =
      function (lkont, kont, machine)
      {
        const ast = Ast.createAst(this.resource);
        return [machine.evaluate(ast, kont.realm.GlobalEnv, lkont, kont)];
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
    gc: gc_, enqueueScriptEvaluation, enqueueJob,
    $getProperty, $assignProperty, $call, $construct, $createFunction,
      lat};
}

// function SetValue(set)
// {
//   this.set = set || new Set();
// }
//
// SetValue.from1 =
//     function (x)
//     {
//       return new SetValue(new Set([x]));
//     }
//
// SetValue.prototype.add =
//     function (x)
//     {
//       return new SetValue(Sets.add(this.set, x));
//     }
//
// SetValue.prototype.join =
//     function (x)
//     {
//       if (x === BOT)
//       {
//         return this;
//       }
//       return new SetValue(Sets.union(this.set, x.set));
//     }
//
// SetValue.prototype.addresses =
//     function ()
//     {
//       let as = ArraySet.empty();
//       for (const x of this.set)
//       {
//         as = as.join(x.addresses());
//       }
//       return as;
//     }
//
// SetValue.prototype[Symbol.iterator] =
//     function* ()
//     {
//       yield* this.set;
//     }

// reminder: has `Set` semantics, i.e., based on `===`
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
    function (rootSet)
    {
      const reachable = MutableHashSet.empty();
      Agc.addressesReachable(rootSet, reachable);
      
      // const cleanup = Arrays.removeAll(reachable.values(), store.map.keys())
      // if (cleanup.length > 0)
      // {
      //   console.debug("cleaning up", cleanup);
      // }
      
      if (reachable.count() === store.map.count()) // we can do this since we have subsumption
      {
        return store;
      }
      const store2 = store.narrow(reachable);
      return store2;
    }

Agc.addressesReachable =
    function (addresses, reachable)
    {
      addresses.forEach(
          function (address)
          {
            Agc.addressReachable(address, reachable)
          });
    }

Agc.addressReachable =
    function (address, reachable)
    {
      if (reachable.contains(address))
      {
        return;
      }
      const aval = store.lookupAval(address);
      const addresses = aval.addresses();
      reachable.add(address);
      Agc.addressesReachable(addresses, reachable);
    }
    