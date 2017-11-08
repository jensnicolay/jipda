export default function createSemantics()
{
  return new Semantics();
}

function Semantics()
{
}

Semantics.prototype.evaluate =
    function (exp, benv, store, lkont, kont, kstore, machine)
    {
      switch (exp.type)
      {
        case "Literal":
          return evalLiteral(exp, benv, store, lkont, kont, kstore, machine);
        case "Identifier":
          return evalIdentifier();
        case "BinaryExpression":
          return evalBinaryExpression(exp, benv, store, lkont, kont, kstore, machine);
        case "LogicalExpression":
          return evalLogicalExpression(exp, benv, store, lkont, kont, kstore, machine);
        case "CallExpression":
          return evalCallExpression(exp, benv, store, lkont, kont, kstore, machine);
        case "FunctionExpression":
          return evalFunctionExpression(exp, benv, store, lkont, kont, kstore, machine);
        case "AssignmentExpression":
          return evalAssignmentExpression(exp, benv, store, lkont, kont, kstore, machine);
        case "ArrayExpression":
          return evalArrayExpression(exp, benv, store, lkont, kont, kstore, machine);
        case "MemberExpression":
          return evalMemberExpression(exp, benv, store, lkont, kont, kstore, machine);
        case "ObjectExpression":
          return evalObjectExpression(exp, benv, store, lkont, kont, kstore, machine);
        case "ThisExpression":
          return evalThisExpression(exp, benv, store, lkont, kont, kstore, machine);
        case "NewExpression":
          return evalCallExpression(exp, benv, store, lkont, kont, kstore, machine);
        case "UpdateExpression":
          return evalUpdateExpression(exp, benv, store, lkont, kont, kstore, machine);
        case "UnaryExpression":
          return evalUnaryExpression(exp, benv, store, lkont, kont, kstore, machine);
        case "ExpressionStatement":
          return evalNode(node.expression, benv, store, lkont, kont, kstore, machine);
        case "ReturnStatement":
          return evalReturnStatement(exp, benv, store, lkont, kont, kstore, machine);
        case "BreakStatement":
          return evalBreakStatement(exp, benv, store, lkont, kont, kstore, machine);
        case "LabeledStatement":
          return evalLabeledStatement(exp, benv, store, lkont, kont, kstore, machine);
        case "IfStatement":
          return evalIfStatement(exp, benv, store, lkont, kont, kstore, machine);
        case "ConditionalExpression":
          return evalConditionalExpression(exp, benv, store, lkont, kont, kstore, machine);
        case "SwitchStatement":
          return evalSwitchStatement(exp, benv, store, lkont, kont, kstore, machine);
        case "ForStatement":
          return evalForStatement(exp, benv, store, lkont, kont, kstore, machine);
        case "ForInStatement":
          return evalForInStatement(exp, benv, store, lkont, kont, kstore, machine);
        case "ForOfStatement":
          return evalForOfStatement(exp, benv, store, lkont, kont, kstore, machine);
        case "WhileStatement":
          return evalWhileStatement(exp, benv, store, lkont, kont, kstore, machine);
        case "DoWhileStatement":
          return evalDoWhileStatement(exp, benv, store, lkont, kont, kstore, machine);
        case "FunctionDeclaration":
          return evalFunctionDeclaration(exp, benv, store, lkont, kont, kstore, machine);
        case "VariableDeclaration":
          return evalVariableDeclaration(exp, benv, store, lkont, kont, kstore, machine);
        case "VariableDeclarator":
          return evalVariableDeclarator(exp, benv, store, lkont, kont, kstore, machine);
        case "BlockStatement":
          return evalStatementList(exp, benv, store, lkont, kont, kstore, machine);
        case "EmptyStatement":
          return evalEmptyStatement(exp, benv, store, lkont, kont, kstore, machine);
        case "TryStatement":
          return evalTryStatement(exp, benv, store, lkont, kont, kstore, machine);
        case "ThrowStatement":
          return evalThrowStatement(exp, benv, store, lkont, kont, kstore, machine);
        case "Program":
          return evalProgram(exp, benv, store, lkont, kont, kstore, machine);
        default:
          throw new Error("cannot handle expression type " + exp.type);
      }
    }
    
function evalProgram(exp, benv, store, lkont, kont, kstore, machine)
{
  return evalStatementList(exp, benv, store, lkont, kont, kstore, machine);
}

function evalStatementList(exp, benv, store, lkont, kont, kstore, machine)
{
  const exps = exp.body;
  if (exps.length === 0)
  {
    return [machine.continue(machine.undefinedValue(), store, lkont, kont, kstore)];
  }
  if (exps.length === 1)
  {
    return [machine.evaluate(exps[0], benv, store, lkont, kont, kstore)];
  }
  const frame = new BodyKont(node, 1, benv);
  const lkont2 = machine.pushFrame(lkont, frame);
  return [machine.evaluate(exps[0], benv, store, lkont2, kont)];
}

function evalLiteral(exp, benv, store, lkont, kont, kstore, machine)
{
  const value = machine.abst1(exp.value);
  return [machine.continue(value, store, lkont, kont, kstore)];
}

Semantics.prototype.enqueue =
    function (queueName, job, store, lkont, kont, kstore, machine)
    {
      const currentQ = machine.storeLookup(store, queueName);
      const cons = new QueueCons(job, currentQ);
      const consA = qalloc.cons();
      store = machine.storeAlloc(store, consA, cons);
      store = machine.storeUpdate(store, queueA, machine.abstRef(consA));
      return [machine.continue(machine.undefinedValue(), benv, store, lkont, kont, kstore)];
    }

Semantics.prototype.initialize =
    function (benv, store, lkont, kont, kstore, machine)
    {
      return [machine.continue(machine.undefinedValue(), benv, store, lkont, kont, kstore)];
    }

