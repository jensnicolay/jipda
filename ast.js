"use strict";

var Ast = {}
  
  function nodeToString(node)
  {
    if (node === null)
    {
      return "";
    }
    switch (node.type)
    {
      case "Literal":
        return String(node.value);
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
      case "ForInStatement":
        return "for (" + nodeToString(node.left) + " in " + nodeToString(node.right) + ") " + nodeToString(node.body) + ";";
      case "ForOfStatement":
        return "for (" + nodeToString(node.left) + " of " + nodeToString(node.right) + ") " + nodeToString(node.body) + ";";
      case "FunctionDeclaration":
        return "function " + nodeToString(node.id) + "(" + node.params.map(nodeToString).join() + ") " + nodeToString(node.body) + ";";
      case "VariableDeclaration": 
        return node.kind + " " + node.declarations.map(nodeToString).join();
      case "VariableDeclarator": 
        return nodeToString(node.id) + (node.init ? "=" + nodeToString(node.init) : "");
      case "Property": 
        return nodeToString(node.key) + ":" + nodeToString(node.value);
      case "Program": 
        return node.body.map(nodeToString).join(" ");
      case "BlockStatement": 
        return "{" + node.body.map(nodeToString).join(" ") + "}";
      case "TryStatement":
        return "try " + nodeToString(node.block) + " " + node.handler ? nodeToString(node.handler) : "" + node.finalizer ? nodeToString(node.finalizer) : "";
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
  
Ast.isIdentifier =
  function (n)
  {
    return n.type === "Identifier";
  }
  
  /*
  function isVariable(n, ast)
  {
    if (isIdentifier(n))
    {
      var p = parent(n, ast);
      return Ast.isVariableDeclarator(p) || isFunctionExpressio(p) || Ast.isFunctionDeclaration(p);
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
  
  Ast.isCallExpression =
    function (n)
    {
      return n.type === "CallExpression";
    }
  
  function isVariableDeclaration(n)
  {
    return n.type === "VariableDeclaration";
  }
  
Ast.isVariableDeclarator =
  function (n)
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
  
Ast.isNewExpression =
  function (n)
  {
    return n.type === "NewExpression";
  }
  
  function isArrayExpression(n)
  {
    return n.type === "ArrayExpression";
  }
  
Ast.isFunctionDeclaration =
  function (n)
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
  
  Ast.isMemberExpression =
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

  Ast.visit =
      function (ast, visitor, parent, prop, index)
      {
        const type = ast.type;
        if (!type)
        {
          return;
        }
        const visitChildren = (visitor[type] || visitor.Node)(ast, parent, prop, index);
        if (visitChildren)
        {
          for (const prop in ast)
          {
            const child = ast[prop];
            if (Array.isArray(child))
            {
              for (let i = 0; i < child.length; i++)
              {
                const childd = child[i];
                Ast.visit(childd, visitor, ast, prop, i);
              }
            }
            else
            {
              Ast.visit(child, visitor, ast, prop, false);
            }
          }
        }
      }

  Ast.children =
  function (node)
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
          return [node.discriminant].concat(node.cases.flatMap(Ast.children));        
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
      case "ForInStatement":
        return [node.left, node.right, node.body];
      case "ForOfStatement":
        return [node.left, node.right, node.body];
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
        const result = [node.block];
        if (node.handler)
        {
          result.push(node.handler);
        }
        if (node.finalizer)
        {
          result.push(node.finalizer);
        }
        return result;
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
      var cs = Ast.children(n);
      return cs.concat(descendants(cs));
    }
  }
  
  // depth-first
  Ast.nodes = function(n)
  {
    if (Array.isArray(n))
    {
      return n.flatMap(Ast.nodes);
    }
    else
    {
      return [n].concat(Ast.nodes(Ast.children(n)));
    }
  }
  
  // debug
  Ast.printTree = function (n)
  {
    Ast.nodes(n).forEach(
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
    node.tag = __nodeCounter__++; 
  }
  
  //var __symCounter__ = 0;
  //function gensym(prefix)
  //{
  //  return prefix + ++__symCounter__; 
  //}
  
  
Ast.augmentAst = 
  function (node)
  {
  
    function toString()
    {
      return nodeToString(this);
    }
    
    function equals(x)
    {
      return this === x;
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
      x.equals = equals;
    }
  
    function doVisit(node)
    {
      if (node === null)
      {
        return;
      }
      nodify(node);
      var cs = Ast.children(node);
      cs.forEach(function (child) {doVisit(child, node)});
    }   
    doVisit(node);
  }

  
Ast.createAst =
  function (source, config)
  {
    config = config || {loc:true, keepTagCounter:false};
    var ast = esprima.parse(source, {loc:config.loc});
    if (!config.keepTagCounter)
    {
      __nodeCounter__ = 0;
    }
    Ast.augmentAst(ast);
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
  
  Ast.tagToNode = function (ast)
  {
    return function (tag)
    {
      var ns = Ast.nodes(ast).filter(function (node) { return node.tag === tag });
      if (ns.length === 1)
      {
        return ns[0];
      }
      throw new Error("for tag " + tag + " got " + ns);    
    }
  }
  
  Ast.locToNode = function (line, col, ast)
  {
    function covers(n)
    {
      if (n.loc.start.line > line || n.loc.end.line < line)
      {
        return false;
      }
      if (n.loc.start.line === line)
      {
        if (n.loc.start.column > col)
        {
          return false;
        }
        if (n.loc.end.line === line)
        {
          return n.loc.end.column > col;
        }
        return true;
      }
      return true;
    }
    
    function doIt(n)
    {
//      print(n, "start", n.loc.start.line, n.loc.start.column, "end", n.loc.end.line, n.loc.end.column, "covers", line, col, covers(n));
      if (covers(n))
      {
        var cs = Ast.children(n);
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
    return Arrays.contains(node, Ast.children(parent));
  }
  
  // createFromChildren
  
  function parent(node, ast)
  {
    var cs = Ast.children(ast);
    if (cs.indexOf(node) > -1)
    {
      return ast;
    }
    var p;
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
    if (Ast.isIdentifier(n))
    {
      var p = parent(n, ast);
      return Ast.isVariableDeclarator(p) || isFunctionExpression(p) || Ast.isFunctionDeclaration(p) || isCatchClause(p);
    }
    return false;
  }
  
  function isVarDeclarationIdentifier(n, ast)
  {
    if (Ast.isIdentifier(n))
    {
      var p = parent(n, ast);
      if (Ast.isVariableDeclarator(p))
      {
        var pp = parent(p, ast);
        return pp.kind === "var";
      }
      return isFunctionExpression(p) || Ast.isFunctionDeclaration(p);
    }
    return false;
  }
  
  function isConstDeclarationIdentifier(n, ast)
  {
    if (Ast.isIdentifier(n))
    {
      var p = parent(n, ast);
      if (Ast.isVariableDeclarator(p))
      {
        var pp = parent(p, ast);
        return pp.kind === "const";
      }
    }
    return false;
  }
  
  function isAssignedIdentifier(n, ast)
  {
    if (Ast.isIdentifier(n))
    {
      var p = parent(n, ast);
      if (isAssignmentExpression(p))
      {
        return p.left === n;
      }
    }
    return false;
  }
  
  Ast.isReferenceIdentifier = isReferenceIdentifier;
  function isReferenceIdentifier(n, ast)
  {
    if (Ast.isIdentifier(n))
    {
      var p = parent(n, ast);
      if (isAssignmentExpression(p))
      {
        return p.left !== n;
      }
      return !(Ast.isVariableDeclarator(p) || isFunctionExpression(p) || Ast.isFunctionDeclaration(p) || isCatchClause(p));
    }
    return false;
  }
  
Ast.enclosingBlock =
  function (node, ast)
  {
    var p = parent(node, ast);
    while (p)
    {
      if (isFunctionExpression(p) || Ast.isFunctionDeclaration(p)) // needed? (funs contain block statements as body)
      {
        return false;
      }
      if (isBlockStatement(p) || isProgram(p))
      {
        return p;
      }
      p = parent(p, ast);
    }
    return false;
  }
  
//Ast.enclosingFunction =  // does not deal with scope per se (does not deal with top-level Program scope)
//  function (node, ast)
//  {
//    var p = parent(node, ast);
//    while (p)
//    {
//      if (isFunctionExpression(p) || Ast.isFunctionDeclaration(p))
//      {
//        return p;
//      }
//      p = parent(p, ast);
//    }
//    return false;
//  }
  
//

Ast.functionScopeDeclarations =
  function (nodeWithBody)
  {
    var result = Object.create(null); // name -> declarationNode
    if (nodeWithBody.params)
    {
      nodeWithBody.params.forEach(
        function (param, i)
        {
          result[param.name] = param;
          param.i = i;
        });
      helper(nodeWithBody.body);
    }
    else
    {
      helper(nodeWithBody);
    }
    
    function helper(node)
    {
      if (node === null || isFunctionExpression(node))
      {
        return;
      }
      if (isVariableDeclaration(node))
      {
        if (node.kind === "var")
        {
          return node.declarations.forEach(
            function (decl)
            {
              var existing = result[decl.id.name]; 
              if (!existing)
              {
                result[decl.id.name] = decl;
              }
              helper(decl.init);
            });
        }
      }
      else if (Ast.isFunctionDeclaration(node))
      {
        result[node.id.name] = node;
      }
      else
      {
        var cs = Ast.children(node);
        cs.forEach(helper);
      }
    }
    
    return result;
  }

Ast.enclosingFunScope = // deals with scope (also program)
  function (node, ast)
  {
    var p = parent(node, ast);
    while (p)
    {
      if (isFunctionExpression(p) || Ast.isFunctionDeclaration(p) || isProgram(p))
      {
        return p;
      }
      p = parent(p, ast);
    }
    return false;
  }

Ast.findDeclarationNode =
  function (name, node, ast)
  {
    var enclosingFunScope = Ast.enclosingFunScope(node, ast);
    while (enclosingFunScope)
    {
      var varScope = Ast.functionScopeDeclarations(enclosingFunScope);
      var node = varScope[name];
      if (node)
      {
        return node;
      }
      enclosingFunScope = Ast.enclosingFunScope(enclosingFunScope, ast);
    }
    return false;
  }

////////////////

//Ast.resolveLexicalBindings =
//  function (ast)
//  {
//  
//    function helper(node)
//    {
//      switch (node.type)
//      {
//        case "FunctionDeclaration":
//          var decls = Ast.functionScopeDeclarations(node);
//          node.declarations = decls;
//          node.enclosingFunScope
//          break;
//        case "FunctionExpression":
//          var decls = Ast.functionScopeDeclarations(node);
//          node.declarations = decls;
//          break;
//        case "Identifier":
//          var enclosingFunScope0 = Ast.enclosingFunScope(node, ast);
//          var enclosingFunScope = enclosingFuncScope0;
//          while (enclosingFunScope)
//          {
//            var varScope = enclosingFunScope.declarations;
//            var dnode = varScope[name];
//            if (dnode)
//            {
//              node.enclosingFunScope = enclosingFunScope0;
//              node.targetFunScope = varScope;
//            }
//            enclosingFunScope = enclosingFunScope;
//          }
//      }      
//    }
//    
//    helper(ast);
//  }