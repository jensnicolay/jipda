var suiteAstTests = new TestSuite("astTests");

suiteAstTests.test1 =
	function ()
	{
		var ast = createAst("var a = 1; a;");
		var varA = ast.body[0].declarations[0].id;
		var refA = ast.body[1].expression;
		assertEquals([[varA]], scopeChain(refA, ast));
	};
	
suiteAstTests.test2 =
	function ()
	{
		var ast = createAst("var sq = function (x) {return x * x;}; sq(5);");
		var refX = ast.body[0].declarations[0].init.body.body[0].argument.left;
		var vs = scopeChain(refX, ast).flatten();
		assertEquals(["x", "sq"], vs.map(function (node) {return node.name;}));
	};

suiteAstTests.test2fd =
	function ()
	{
		var ast = createAst("function sq(x) {return x * x;}; sq(5);");
		var refX = $$$(ast).findDeclarationIdentifiers("x").toNode();
		var vs = scopeChain(refX, ast).flatten();
		assertEquals(["x", "sq"], vs.map(function (node) {return node.name;}));
	};

suiteAstTests.test3 =
	function ()
	{
		var ast = createAst("var x=1, y=2; x=y;");
		var varsDX = $$$(ast).nodes().filterDeclarationIdentifiers("x").toArray();
		var varsDY = $$$(ast).nodes().filterDeclarationIdentifiers("y").toArray();
		//var varsX = $$$(ast).nodes().filterVariables("x").toArray();
		//var varsY = $$$(ast).nodes().filterVariables("y").toArray();
		assertEquals(1, varsDX.length);
		assertEquals(1, varsDY.length);
		//assertEquals(2, varsX.length);
		//assertEquals(1, varsY.length);
	}

suiteAstTests.test4 =
	function ()
	{
		var ast = createAst("var x=1, y=2; var a=x+y;");
		var varX = $$$(ast).nodes().filterDeclarationIdentifiers("x").toNode();
		var varY = $$$(ast).nodes().filterDeclarationIdentifiers("y").toNode();
		var expXY = $$$(ast).findExpression("x+y").toNode();
		assertEquals([varX,varY], lookupRefVars(expXY, ast));
		assertEquals([varX,varY], lookupRefVars(ast, ast));
		assertEquals([], lookupAssignmentVars(expXY, ast));
		assertEquals([], lookupAssignmentVars(ast, ast));
	};

suiteAstTests.test5 =
	function ()
	{
		var ast = createAst("var x=1, y=2; x=y;");
		var varX = $$$(ast).nodes().filterDeclarationIdentifiers("x").toNode();
		var varY = $$$(ast).nodes().filterDeclarationIdentifiers("y").toNode();
		var assXY = $$$(ast).findExpression("x=y").toNode();
		assertEquals([varY], lookupRefVars(assXY, ast));
		assertEquals([varY], lookupRefVars(ast, ast));
		assertEquals([varX], lookupAssignmentVars(assXY, ast));
		assertEquals([varX], lookupAssignmentVars(ast, ast));
	};

/* LET unsupported
suiteAstTests.test6 =
	function ()
	{
		var ast = createAst("let x = 1; x;"); // treated as 'var' by SpiderMonkey
		var varX = $$$(ast).findDeclarationIdentifiers("x").toNode();
		assertTrue(isVariable(varX));
		var refX = $$$(ast).findReferenceIdentifiers("x").toNode();
		assertTrue(isReference(refX));
		assertEquals([[varX]], scopeChain(refX, ast));		
		assertEquals(varX, lookupNodeDeclarationIdentifier(refX, ast));
	};
*/

suiteAstTests.test6c =
  function ()
  {
    var ast = createAst("const x = 1; x;");
    assertEquals("[]", $$$(ast).findVarDeclarationIdentifiers("x").toString());
    assertEquals("[x]", $$$(ast).findDeclarationIdentifiers("x").toString());
    var varX = $$$(ast).findConstDeclarationIdentifiers("x").toNode();
    assertTrue(isDeclarationIdentifier(varX, ast));
    assertTrue(isConstDeclarationIdentifier(varX, ast));
    assertEquals("const", declarationIdentifierKind(varX, ast));
    var refX = $$$(ast).findReferenceIdentifiers("x").toNode();
    assertTrue(isReferenceIdentifier(refX, ast));
    assertTrue(isConstReferenceIdentifier(refX, ast));
    assertEquals([[varX]], scopeChain(refX, ast));    
    assertEquals(varX, lookupDeclarationIdentifier(refX.name, refX, ast));
  };
	
	
suiteAstTests.test7 =
	function ()
	{
		var ast = createAst("x;");
		var refX = $$$(ast).findReferenceIdentifiers("x").toNode();
		assertEquals(ast, enclosingBlock(refX, ast));
		assertFalse(enclosingFunction(refX, ast));
		assertFalse(enclosingBlock(ast, ast));
		assertFalse(enclosingFunction(ast, ast));
	}
	
suiteAstTests.test8 =
	function ()
	{
		var ast = createAst("var f=function () {x};");
		var refX = $$$(ast).findReferenceIdentifiers("x").toNode();
		var funF = nodes(ast).filter(isFunctionExpression)[0];
		assertEquals(funF.body, enclosingBlock(refX, ast));
		assertEquals(funF, enclosingFunction(refX, ast));
		assertFalse(enclosingBlock(ast, ast));
		assertFalse(enclosingFunction(ast, ast));		
	}
	
suiteAstTests.test8fd =
	function ()
	{
		var ast = createAst("function f() {x};");
		var refX = $$$(ast).findReferenceIdentifiers("x").toNode();
		var funF = nodes(ast).filter(isFunctionDeclaration)[0];
		assertEquals(funF.body, enclosingBlock(refX, ast));
		assertEquals(funF, enclosingFunction(refX, ast));
		assertFalse(enclosingBlock(ast, ast));
		assertFalse(enclosingFunction(ast, ast));		
	}
	
suiteAstTests.test9 =
	function ()
	{
		var ast = createAst("var x=0; {print(x); var x=1}; print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals([[], [varsX[0], varsX[1]]], scopeChain(refsX[0], ast));		
		assertEquals([[varsX[0], varsX[1]]], scopeChain(refsX[1], ast));		
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};

suiteAstTests.test10 =
	function ()
	{
		var ast = createAst("var x=0; {print(x); {var x=1}}; print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals([[], [varsX[0], varsX[1]]], scopeChain(refsX[0], ast));		
		assertEquals([[varsX[0], varsX[1]]], scopeChain(refsX[1], ast));		
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};

suiteAstTests.test11 =
	function ()
	{
		var ast = createAst("var x=0; var f=function () {print(x); var x=1}; print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		var varF = $$$(ast).findDeclarationIdentifiers("f").toNode();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals([[], [varsX[1]], [varsX[0], varF]], scopeChain(refsX[0], ast));		
		assertEquals([[varsX[0], varF]], scopeChain(refsX[1], ast));		
		assertEquals(varsX[1], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};

suiteAstTests.test11fd =
	function ()
	{
		var ast = createAst("var x=0; function f() {print(x); var x=1}; print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		var varF = $$$(ast).findDeclarationIdentifiers("f").toNode();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals([[], [varsX[1]], [varsX[0], varF]], scopeChain(refsX[0], ast));		
		assertEquals([[varsX[0], varF]], scopeChain(refsX[1], ast));		
		assertEquals(varsX[1], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};

suiteAstTests.test12 =
	function ()
	{
		var ast = createAst("var x=0; {print(x); let x=1}; print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals([[varsX[1]], [varsX[0]]], scopeChain(refsX[0], ast));		
		assertEquals([[varsX[0]]], scopeChain(refsX[1], ast));		
		assertEquals(varsX[1], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};

suiteAstTests.test13 =
	function ()
	{
		var ast = createAst("var x=0; {print(x); {let x=1}}; print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals([[], [varsX[0]]], scopeChain(refsX[0], ast));		
		assertEquals([[varsX[0]]], scopeChain(refsX[1], ast));		
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};

	/* LET unsupported
suiteAstTests.test14 =
	function ()
	{
		var ast = createAst("var x=0; var f=function () {print(x); let x=1}; f(); print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		var varF = $$$(ast).findDeclarationIdentifiers("f").toNode();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals([[], [varsX[1]], [varsX[0], varF]], scopeChain(refsX[0], ast)); // let = var		
		assertEquals([[varsX[0], varF]], scopeChain(refsX[1], ast));		
		assertEquals(varsX[1], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};
	
suiteAstTests.test14fd =
	function ()
	{
		var ast = createAst("var x=0; function f() {print(x); let x=1}; f(); print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		var varF = $$$(ast).findDeclarationIdentifiers("f").toNode();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals([[], [varsX[1]], [varsX[0], varF]], scopeChain(refsX[0], ast)); // let = var		
		assertEquals([[varsX[0], varF]], scopeChain(refsX[1], ast));		
		assertEquals(varsX[1], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};
	 */

suiteAstTests.test15 =
	function ()
	{
		var ast = createAst("var x=0; var f=function () {print(x); {let x=1}}; f(); print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		var varF = $$$(ast).findDeclarationIdentifiers("f").toNode();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals([[], [], [varsX[0], varF]], scopeChain(refsX[0], ast));		
		assertEquals([[varsX[0], varF]], scopeChain(refsX[1], ast));		
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};

suiteAstTests.test15fd =
	function ()
	{
		var ast = createAst("var x=0; function f() {print(x); {let x=1}}; f(); print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		var varF = $$$(ast).findDeclarationIdentifiers("f").toNode();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals([[], [], [varsX[0], varF]], scopeChain(refsX[0], ast));		
		assertEquals([[varsX[0], varF]], scopeChain(refsX[1], ast));		
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};

	/* LET unsupported
suiteAstTests.test16 =
	function ()
	{
		var ast = createAst("let x=1; var f=function (p) {let x=2; print(x);}; print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		var varF = $$$(ast).findDeclarationIdentifiers("f").toNode();
		var varP = $$$(ast).findDeclarationIdentifiers("p").toNode();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals([[], [varP, varsX[1]], [varsX[0], varF]], scopeChain(refsX[0], ast)); // let = var		
		assertEquals([[varsX[0], varF]], scopeChain(refsX[1], ast));		
		assertEquals(varsX[1], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};

suiteAstTests.test16fd =
	function ()
	{
		var ast = createAst("let x=1; function f(p) {let x=2; print(x);}; print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		var varF = $$$(ast).findDeclarationIdentifiers("f").toNode();
		var varP = $$$(ast).findDeclarationIdentifiers("p").toNode();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals([[], [varP, varsX[1]], [varsX[0], varF]], scopeChain(refsX[0], ast)); // let = var		
		assertEquals([[varsX[0], varF]], scopeChain(refsX[1], ast));		
		assertEquals(varsX[1], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};
	
suiteAstTests.test17 =
	function ()
	{
		var ast = createAst("let x=1; if (true) { let x=2; print(x); }; print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals([[varsX[1]], [varsX[0]]], scopeChain(refsX[0], ast));
		assertEquals([[varsX[0]]], scopeChain(refsX[1], ast));		
		assertEquals(varsX[1], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};

suiteAstTests.test18 =
	function ()
	{
		var ast = createAst("let x=0; if (true) { var x=1; print(x); }; print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals([[], [varsX[0], varsX[1]]], scopeChain(refsX[0], ast));		
		assertEquals([[varsX[0], varsX[1]]], scopeChain(refsX[1], ast));		
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};
*/

suiteAstTests.test19 =
	function ()
	{
		var ast = createAst("var x=0; var f = function () {if (true) { print(x); var x=1;}}; f(); print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals(varsX[1], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};

suiteAstTests.test19fd =
	function ()
	{
		var ast = createAst("var x=0; function f() {if (true) { print(x); var x=1;}}; f(); print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals(varsX[1], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};


suiteAstTests.test20 =
	function ()
	{
		var ast = createAst("var x=0; var f = function () {if (true) { print(x); let x=1;}}; f(); print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals(varsX[1], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};

suiteAstTests.test20fd =
	function ()
	{
		var ast = createAst("var x=0; function f() {if (true) { print(x); let x=1;}}; f(); print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals(varsX[1], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};

  /* LET unsupported
suiteAstTests.test21 =
	function ()
	{
		var ast = createAst("var x=0; let (x=1) print(x); print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals([[varsX[1]], [varsX[0]]], scopeChain(refsX[0], ast));		
		assertEquals([[varsX[0]]], scopeChain(refsX[1], ast));		
		assertEquals(varsX[1], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};


suiteAstTests.test22 =
	function ()
	{
		var ast = createAst("var x=0; let (x=x) print(x);");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(2, refsX.length);
		assertEquals([[varsX[0]]], scopeChain(refsX[0], ast));		
		assertEquals([[varsX[1]], [varsX[0]]], scopeChain(refsX[1], ast));		
		assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[0], ast));
		assertEquals(varsX[1], lookupNodeDeclarationIdentifier(refsX[1], ast));
	};
*/
	
suiteAstTests.test23 =
	function ()
	{
		var ast = createAst("var x=0; for (var x=1; false; false) {print(x)};");
		var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
		assertEquals(2, varsX.length);
		var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
		assertEquals(1, refsX.length);
		assertEquals([[], [], [varsX[0], varsX[1]]], scopeChain(refsX[0], ast));				
	};

suiteAstTests.test24 =
  function ()
  {
    var ast = createAst("var x=0; for (let x=1; false; false) {print(x)};");
    var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
    assertEquals(2, varsX.length);
    var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
    assertEquals(1, refsX.length);
    assertEquals([[], [varsX[1]], [varsX[0]]], scopeChain(refsX[0], ast));        
  };

suiteAstTests.test25 =
  function ()
  {
    var ast = createAst("var a;");
    assertEquals("var a;", ast.toString());
  };
  
suiteAstTests.test26 =
  function ()
  {
    var ast = createAst("var x=0; try {print(x); var x=1; print(x); throw 42} catch (e) {print(x)} print(x);");
    var varsX = $$$(ast).findDeclarationIdentifiers("x").toArray();
    var varE = $$$(ast).findDeclarationIdentifiers("e").toNode();
    assertEquals(2, varsX.length);
    var refsX = $$$(ast).findReferenceIdentifiers("x").toArray();
    assertEquals(4, refsX.length);
    assertEquals([[], [varsX[0], varsX[1]]], scopeChain(refsX[0], ast));    
    assertEquals([[], [varsX[0], varsX[1]]], scopeChain(refsX[1], ast));    
    assertEquals([[], [varE], [varsX[0], varsX[1]]], scopeChain(refsX[2], ast));
    assertEquals(["block","catch","fun"], scopeChain(refsX[2], ast).map(function (x) {return x.kind}));
    assertEquals([[varsX[0], varsX[1]]], scopeChain(refsX[3], ast));    
    assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[0], ast));
    assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[1], ast));
    assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[2], ast));
    assertEquals(varsX[0], lookupNodeDeclarationIdentifier(refsX[3], ast));
  };

suiteAstTests.test27 =
  function ()
  {
    var ast = createAst("var x=0; try {throw 42} catch (e) {print(e)};");
    var varX = $$$(ast).findDeclarationIdentifiers("x").toNode();
    var varE = $$$(ast).findDeclarationIdentifiers("e").toNode();
    var refE = $$$(ast).findReferenceIdentifiers("e").toNode();
    assertEquals([[], [varE], [varX]], scopeChain(refE, ast));    
  };

suiteAstTests.test28 =
  function ()
  {
    var ast = createAst("var x;");
    assertEquals(4, nodes(ast).length);    
  };



  