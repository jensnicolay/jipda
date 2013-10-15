var Ast = (function ()
{
  var module = {};
  
  function nodeToString(node)
  {
    if (node === null)
    {
      return "";
    }
    switch (node.type)
    {
      case "Literal":
        return ""+node.value;
      case "Identifier": 
        return node.name;
      case "BinaryExpression": 
      case "LogicalExpression": 
        return nodeToString(node.left) + node.operator + nodeToString(node.right);
      case "CallExpression": 
        return nodeToString(node.callee) + "(" + node.arguments.map(nodeToString).join() + ")";
      case "FunctionExpression":
        return "function (" + node.params.map(nodeToString).join() + ") " + nodeToString(node.body);
      case "LetExpression":
        return "let (" + node.head.map(nodeToString).join() + ") " + nodeToString(node.body);
      case "AssignmentExpression":
        return nodeToString(node.left) + node.operator + nodeToString(node.right);
      case "ArrayExpression":
        return "[" + node.elements.map(nodeToString).join(",") + "]";
      case "MemberExpression":
        if (node.computed)
        {
          return nodeToString(node.object) + "[" + nodeToString(node.property) + "]";
        }
        else
        {
          return nodeToString(node.object) + "." + nodeToString(node.property)
        }
      case "ObjectExpression":
        return "{" +  node.properties.map(nodeToString).join(",") + "}";
      case "ThisExpression":
        return "this";
      case "NewExpression":
        return "new " + nodeToString(node.callee) + "(" + node.arguments.map(nodeToString).join() + ")";
      case "UpdateExpression":
        return node.prefix ? node.operator + nodeToString(node.argument) : nodeToString(node.argument) + node.operator;
      case "UnaryExpression":
        return node.operator + nodeToString(node.argument);
      case "ExpressionStatement":
        return nodeToString(node.expression) + ";";
      case "ReturnStatement":
        if (node.argument === null)
        {
          return "return;";
        }
        return "return " + nodeToString(node.argument) + ";";
      case "BreakStatement":
        if (node.label)
        {
          return "break " + nodeToString(node.label) + ";";
        }
        return "break;";
      case "LabeledStatement":
        return nodeToString(node.label) + ":" + nodeToString(node.body); 
      case "IfStatement":
        if (node.alternate === null)
        {
          return "if (" + nodeToString(node.test) + ") " + nodeToString(node.consequent);
        }
        else
        {
          return "if (" + nodeToString(node.test) + ") " + nodeToString(node.consequent) + " " + nodeToString(node.alternate);
        }
      case "ConditionalExpression":
        return nodeToString(node.test) + " ? " + nodeToString(node.consequent) + " " + nodeToString(node.alternate);
      case "SwitchStatement":
        return "switch (" + nodeToString(node.discriminant) + ") {" + (node.cases ? node.cases.map(nodeToString).join("") : "") + "}";
      case "SwitchCase":
        if (node.test === null)
        {
          return "default: " + node.consequent.map(nodeToString).join(" ");
        }
        return "case " + nodeToString(node.test) + ": " + node.consequent.map(nodeToString).join(" ");
      case "WhileStatement": 
        return "while (" + nodeToString(node.test) + ") " + nodeToString(node.body);
      case "DoWhileStatement": 
        return "do " + nodeToString(node.body) + " while (" + nodeToString(node.test) + ")";
      case "ForStatement":
        return "for (" + nodeToString(node.init) + ";" + nodeToString(node.test) + ";" + nodeToString(node.update) + ") " + nodeToString(node.body) + ";";
      case "FunctionDeclaration": 
        return "function " + nodeToString(node.id) + "(" + node.params.map(nodeToString).join() + ") " + nodeToString(node.body) + ";";
      case "VariableDeclaration": 
        return node.kind + " " + node.declarations.map(nodeToString).join() + ";";
      case "VariableDeclarator": 
        return nodeToString(node.id) + (node.init ? "=" + nodeToString(node.init) : "");
      case "Property": 
        return nodeToString(node.key) + ":" + nodeToString(node.value);
      case "Program": 
        return node.body.map(nodeToString).join(" ");
      case "BlockStatement": 
        return "{" + node.body.map(nodeToString).join(" ") + "}";
      case "TryStatement":
        return "try " + nodeToString(node.block) + " " + node.handlers.map(nodeToString).join(" ");
      case "CatchClause":
        return "catch (" + nodeToString(node.param) + ") " + nodeToString(node.body);
      case "ThrowStatement":
        return "throw " + nodeToString(node.argument);
      case "EmptyStatement":
        return ";";
      default:
        throw new Error("nodeToString: cannot handle " + node.type); 
      }
  }
  
  function isIdentifier(n)
  {
    return n.type === "Identifier";
  }
  
  /*
  function isVariable(n, ast)
  {
    if (isIdentifier(n))
    {
      var p = parent(n, ast);
      return isVariableDeclarator(p) || isFunctionExpressio(p) || isFunctionDeclaration(p);
    }
    return false;
  }
  */
  
  function isObjectExpression(n)
  {
    return n.type === "ObjectExpression";
  }
  
  function isReturnStatement(n)
  {
    return n.type === "ReturnStatement";
  }
  
  function isBreakStatement(n)
  {
    return n.type === "BreakStatement";
  }
  
  function isLabeledStatement(n)
  {
    return n.type === "LabeledStatement";
  }
  
  module.isCallExpression =
    function (n)
    {
      return n.type === "CallExpression";
    }
  
  function isVariableDeclaration(n)
  {
    return n.type === "VariableDeclaration";
  }
  
  function isVariableDeclarator(n)
  {
    return n.type === "VariableDeclarator";
  }
  
  function isAssignmentExpression(n)
  {
    return n.type === "AssignmentExpression";
  }
  
  function isBinaryExpression(n)
  {
    return n.type === "BinaryExpression";
  }
  
  function isLogicalExpression(n)
  {
    return n.type === "BinaryExpression";
  }
  
  function isUnaryExpression(n)
  {
    return n.type === "UnaryExpression";
  }
  
  function isFunctionExpression(n)
  {
    return n.type === "FunctionExpression";
  }
  
  function isNewExpression(n)
  {
    return n.type === "NewExpression";
  }
  
  function isArrayExpression(n)
  {
    return n.type === "ArrayExpression";
  }
  
  function isFunctionDeclaration(n)
  {
    return n.type === "FunctionDeclaration";
  }
  
  function isProgram(n)
  {
    return n.type === "Program";
  }
  
  function isBlockStatement(n)
  {
    return n.type === "BlockStatement";
  }
  
  function isThisExpression(n)
  {
    return n.type === "ThisExpression";
  }
  
  module.isMemberExpression =
    function (n)
    {
      return n.type === "MemberExpression";
    }
  
  function isUpdateExpression(n)
  {
    return n.type === "UpdateExpression";
  }
  
  function isTryStatement(n)
  {
    return n.type === "TryStatement";
  }
  
  function isCatchClause(n)
  {
    return n.type === "CatchClause";
  }
  
  function isIfStatement(n)
  {
    return n.type === "IfStatement";
  }
  
  function isConditionalExpression(n)
  {
    return n.type === "ConditionalExpression";
  }
  
  function isSwitchStatement(n)
  {
    return n.type === "SwitchStatement";
  }
  
  function children(node)
  {
    switch (node.type)
    {
      case "Literal": 
      case "Identifier":
        return [];
      case "BinaryExpression": 
      case "LogicalExpression": 
        return [node.left, node.right];
      case "CallExpression": 
        return [node.callee].concat(node.arguments);
      case "FunctionExpression": 
        return node.params.concat([node.body]);
      case "LetExpression":
          return node.head.concat([node.body]);
      case "AssignmentExpression":
        return [node.left, node.right];
      case "ArrayExpression":
        return node.elements;
      case "MemberExpression":
        return [node.object, node.property];
      case "ObjectExpression":
        return node.properties;
      case "ExpressionStatement": 
        return [node.expression];
      case "ThisExpression":
        return [];
      case "NewExpression":
        return [node.callee].concat(node.arguments);
      case "UpdateExpression":
        return [node.argument];
      case "UnaryExpression":
        return [node.argument];
      case "ReturnStatement":
        if (node.argument === null)
        {
          return [];
        }
        return [node.argument];
      case "BreakStatement": 
        if (node.label === null)
        {
          return [];
        }
        return [node.label];
      case "LabeledStatement":
        return [node.label, node.body];
      case "IfStatement": 
        if (node.alternate === null)
        {
          return [node.test, node.consequent];
        }
        return [node.test, node.consequent, node.alternate];
      case "ConditionalExpression": 
        return [node.test, node.consequent, node.alternate];
      case "SwitchStatement":
        if (node.cases)
        {
          return [node.discriminant].concat(node.cases.flatMap(children));        
        }
        return [node.discriminant];
      case "SwitchCase":
        if (node.test)
        {
          return [node.test].concat(node.consequent);
        }
        return node.consequent;
      case "WhileStatement": 
        return [node.test, node.body];
      case "DoWhileStatement": 
        return [node.body, node.test];
      case "ForStatement":
        return [node.init, node.test, node.update, node.body].filter(function (n) { return n !== null});
      case "FunctionDeclaration":
        return [node.id].concat(node.params).concat([node.body]);
      case "VariableDeclaration": 
        return node.declarations;
      case "VariableDeclarator":
        if (node.init === null)
        {
          return [node.id];
        }
        return [node.id, node.init];
      case "Property":
        return [node.key, node.value];
      case "Program": 
      case "BlockStatement": 
        return node.body;
      case "TryStatement": 
        return [node.block].concat(node.handlers);
      case "CatchClause":
        return [node.param, node.body];
      case "ThrowStatement":
        return [node.argument];
      case "EmptyStatement":
        return [];
      default: 
        throw new Error("children: cannot handle " + node); 
    }
  }
  
  function descendants(n)
  {
    if (Array.isArray(n))
    {
      return n.flatMap(descendants);
    }
    else
    {
      var cs = children(n);
      return cs.concat(descendants(cs));
    }
  }
  
  // depth-first
  function nodes(n)
  {
    if (Array.isArray(n))
    {
      return n.flatMap(nodes);
    }
    else
    {
      return [n].concat(nodes(children(n)));
    }
  }
  
  // debug
  module.printTree = function (n)
  {
    nodes(n).forEach(
      function (n)
      { 
        var props = [];
        for (var name in n)
        {
          if (n.hasOwnProperty(name) && name.startsWith("_"))
          {
            var val = n[name].tag ? "#" + n[name].tag : String(n[name]).substring(0,12);
            props = props.addLast(name+"="+val);
          }
        }
        print("#" + n.tag + "\t" + n, props);
      });
  }
  
  
  var __nodeCounter__ = 0;
  function tagNode(node)
  {
    node.tag = ++__nodeCounter__; 
  }
  
  //var __symCounter__ = 0;
  //function gensym(prefix)
  //{
  //  return prefix + ++__symCounter__; 
  //}
  
  module.createAst =
    function (source, config)
  {
    function visitNode(node)
    {
    
      function toString()
      {
        return nodeToString(this);
      }
      
      function hashCode()
      {
        return this.tag;
      }
  
      function nodify(x)
      {
        tagNode(x);
        x.toString = toString;
        x.hashCode = hashCode;
      }
    
      function doVisit(node)
      {
        if (node === null)
        {
          return;
        }
        nodify(node);
        var cs = children(node);
        cs.forEach(function (child) { doVisit(child, node);});
      }   
      doVisit(node);
    }
    
    var ast = esprima.parse(source, {loc: (config ? config.loc : false)});
    if (config && config.resetTagCounter)
    {
      __nodeCounter__ = 0;
    }
    visitNode(ast);
    return ast;
  }
  
  function expressionContext(ast)
  {
    if (ast.body.length !== 1)
    {
      throw new Error("expressionContext: expected single expression, got " + ast.body);
    }
    if (!ast.body[0].hasOwnProperty("expression"))
    {
      throw new Error("expressionContext: expected expression, got " + ast.body[0].type);
    }
    return ast.body[0].expression;
  }
  
  module.tagToNode = function (ast)
  {
    return function (tag)
    {
      var ns = nodes(ast).filter(function (node) { return node.tag === tag });
      if (ns.length === 1)
      {
        return ns[0];
      }
      throw new Error("for tag " + tag + " got " + ns);    
    }
  }
  
  module.locToNode = function (line, col, ast)
  {
    function covers(n)
    {
      if (n.loc.start.line > line)
      {
        return false;
      }
      if (n.loc.start.line === line)
      {
        if (n.loc.end.line === line)
        {
          return n.loc.start.column <= col && n.loc.end.column >= col;
        }
        return true;
      }
      return n.loc.end.line >= line;
    }
    
    function doIt(n)
    {
      if (covers(n))
      {
        var cs = children(n);
        var r = cs.flatMap(doIt);
        return r.length === 0 ? [n] : r;
      }
      return [];
    }
    
    var ns = doIt(ast);
    if (ns.length === 1)
    {
      return ns[0];
    }
    throw new Error("for loc (" + line + ", " + col + ") got " + ns);
  }
  
  function isChild(node, parent)
  {
    return children(parent).indexOf(node) > -1;
  }
  
  // createFromChildren
  
  function parent(node, ast)
  {
    var cs = children(ast);
    if (cs.indexOf(node) > -1)
    {
      return ast;
    }
    for (var i = 0; i < cs.length; i++)
    {
      if (p = parent(node, cs[i]))
      {
          return p;
      }
    }
    return false;
  }
  
  function isDeclarationIdentifier(n, ast)
  {
    if (isIdentifier(n))
    {
      var p = parent(n, ast);
      return isVariableDeclarator(p) || isFunctionExpression(p) || isFunctionDeclaration(p) || isCatchClause(p);
    }
    return false;
  }
  
  function isVarDeclarationIdentifier(n, ast)
  {
    if (isIdentifier(n))
    {
      var p = parent(n, ast);
      if (isVariableDeclarator(p))
      {
        var pp = parent(p, ast);
        return pp.kind === "var";
      }
      return isFunctionExpression(p) || isFunctionDeclaration(p);
    }
    return false;
  }
  
  function isConstDeclarationIdentifier(n, ast)
  {
    if (isIdentifier(n))
    {
      var p = parent(n, ast);
      if (isVariableDeclarator(p))
      {
        var pp = parent(p, ast);
        return pp.kind === "const";
      }
    }
    return false;
  }
  
  function isAssignedIdentifier(n, ast)
  {
    if (isIdentifier(n))
    {
      var p = parent(n, ast);
      if (isAssignmentExpression(p))
      {
        return p.left === n;
      }
    }
    return false;
  }
  
  module.isReferenceIdentifier = isReferenceIdentifier;
  function isReferenceIdentifier(n, ast)
  {
    if (isIdentifier(n))
    {
      var p = parent(n, ast);
      if (isAssignmentExpression(p))
      {
        return p.left !== n;
      }
      return !(isVariableDeclarator(p) || isFunctionExpression(p) || isFunctionDeclaration(p) || isCatchClause(p));
    }
    return false;
  }
  
  function enclosingBlock(node, ast)
  {
    var p = parent(node, ast);
    while (p)
    {
      if (isBlockStatement(p) || isProgram(p))
      {
        return p;
      }
      p = parent(p, ast);
    }
    return false;
  }
  
  function enclosingFunction(node, ast)
  {
    var p = parent(node, ast);
    while (p)
    {
      if (isFunctionExpression(p) || isFunctionDeclaration(p))
      {
        return p;
      }
      p = parent(p, ast);
    }
    return false;
  }
  
  module.scopeInfo =
    function (nodeWithBody)
    {
      if (nodeWithBody.params)
      {
        var params = nodeWithBody.params.map(
        function (param)
        {
          return {name:param.name, node:param, type:"D"};
        });
        return params.concat(helper(nodeWithBody.body));
      }
      else
      {
        return helper(nodeWithBody);
      }
      
      function helper(node)
      {
        if (node === null || isFunctionExpression(node))
        {
          return [];
        }
        if (isVariableDeclaration(node))
        {
          if (node.kind === "var")
          {
            return node.declarations.flatMap(
              function (decl)
              {
                return helper(decl.init).addLast({name:decl.id.name, node:decl, type:"D"});
              });
          }
        }
        else if (isFunctionDeclaration(node))
        {
          return [{name: node.id.name, node:node, type:"D"}];
        }
        else if (isAssignmentExpression(node))
        {
          if (isIdentifier(node.left))
          {
            return helper(node.right).addLast({name:node.left.name, node:node.left, type:"A"});            
          }
        }
        else if (isIdentifier(node))
        {
          return [{name:node.name, node:node, type:"R"}];
        }
        else if (isUpdateExpression(node))
        {
          if (isIdentifier(node.argument))
          {
            return [{name:node.argument.name, node:node.argument, type:"R"}, {name:node.argument.name, node:node.argument, type:"A"}];
          }
        }
        var cs = children(node);
        return cs.flatMap(helper);          
      }
    }

  module.hoist =
    function (scopeInfo)
    {
      var funs = [];
      var vars = [];
      scopeInfo.slice(0).reverse().forEach(
        function (item)
        {
          var name = item.name;
          var exists = false;
          if (isFunctionDeclaration(item.node))
          {
            funs.forEach(function (f) { if (f.name === name) {exists = true;}});
            if (!exists)
            {
              funs.push(item);
            }
          }
          else if (isVariableDeclarator(item.node))
          {
            vars.forEach(function (v) { if (v.name === name) {exists = true;}});
            if (!exists)
            {
              funs.forEach(function (f) { if (f.name === name) {exists = true;}});          
            }
            if (!exists)
            {
              vars.push(item);
            }        
          }
        });
      return {funs: funs, vars: vars, scopeInfo: scopeInfo, parent:parent};
    }
  
  module.nodes = nodes;
  return module;  
})()
