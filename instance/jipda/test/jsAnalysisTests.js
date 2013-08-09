var suiteJsAnalysisTests = 

(function () 
{
  var module = new TestSuite("jsAnalysisTests"); 
  
//  module.test1 =
//    function ()
//    {
//      var src = "var x = 1; x = 2;";
//      var ast = createAst(src);
//      var jsa = new JsAnalysis(ast);
//      var varX = $$$(ast).varsWithName("x").toNode();
//      assertEquals(jsa.lattice.abst1(undefined).join(jsa.lattice.abst1(1)).join(jsa.lattice.abst1(2)), jsa.value(varX));
//    }
//  
//  module.test2 =
//    function ()
//    {
//      var src = "var x = { foo: 42 }";
//      var ast = createAst(src);
//      var jsa = new JsAnalysis(ast);
//      var varX = $$$(ast).varsWithName("x").toNode();
//      var objectAddresses = jsa.objects(varX);
//      assertEquals(1, objectAddresses.length);
//      var objectAddress = objectAddresses[0];
//      assertTrue(objectAddress instanceof Addr);
//      var object = jsa.lookup(objectAddress);
//      assertTrue(object.isBenv);
//      assertDefinedNotNull(object.lookup(jsa.primLattice.abst1("foo")));
//    }
//  
//  module.test3 =
//    function ()
//    {
//      var src = "var x = function () {}; x();";
//      var ast = createAst(src);
//      var jsa = new JsAnalysis(ast);
//      var func = $$$(ast).functionExpressions().toNode();
//      var scopeAddresses = jsa.scope(func);
//      assertEquals(1, scopeAddresses.length);
//      var scopeAddress = scopeAddresses[0]
//      assertEquals(jsa.globala,scopeAddress);
//    }
//  
//  module.test4a =
//    function ()
//    {
//      var src = "function F() {}; var f = new F();";
//      var ast = createAst(src);
//      var jsa = new JsAnalysis(ast);
//      var node = $$$(ast).newExpressions().toNode();
//      var objectAddresses = jsa.objects(node);
//      assertEquals(1, objectAddresses.length);
//      var objectAddress = objectAddresses[0];
//      var protoAddresses = jsa.proto(objectAddress);
//      assertEquals(1, protoAddresses.length);
//      var protoAddress = protoAddresses[0];
//      assertTrue(Addr.isAddress(protoAddress));
//    }
//  
//  module.test4b =
//    function ()
//    {
//      var src = "function F() {}; F.prototype = 123; var f = new F();";
//      var ast = createAst(src);
//      var jsa = new JsAnalysis(ast);
//      var node = $$$(ast).newExpressions().toNode();
//      var objectAddresses = jsa.objects(node);
//      var objectAddress = objectAddresses[0];
//      var protoAddresses = jsa.proto(objectAddress);
//      assertEquals(0, protoAddresses.length);
//    }
//  
//  module.test5 =
//    function ()
//    {
//      var src = "var x = { y : 123 }; var z = { p : x };";
//      var ast = createAst(src);
//      var jsa = new JsAnalysis(ast);
//      var varX = $$$(ast).varsWithName("x").toNode();
//      var varZ = $$$(ast).varsWithName("z").toNode();
//      var objectAddressesZ = jsa.objects(varZ);
//      assertEquals(1, objectAddressesZ.length);
//      var objectAddress = objectAddressesZ[0];
//      var object = jsa.lookup(objectAddress);
//      var props = jsa.props(objectAddress);
//      var objectAddressesX = jsa.objects(varX);
//      assertEquals(objectAddressesX, props);
//    }
//  
//  module.test6 =
//    function ()
//    {
//      var src = "var x = { y : 123 };";
//      var ast = createAst(src);
//      var jsa = new JsAnalysis(ast);
//      var varX = $$$(ast).varsWithName("x").toNode();
//      var objectAddresses = jsa.objects(varX);
//      assertEquals(1, objectAddresses.length);
//      var objectAddress = objectAddresses[0];
//      assertTrue(jsa.mayHaveProp(objectAddress, "y"));
//      assertFalse(jsa.mayHaveProp(objectAddress, "z"));
//    }
//  
//  module.test8a =
//    function ()
//    {
//      var src = "var x = function (y) { return y }; x(x);";
//      var ast = createAst(src);
//      var jsa = new JsAnalysis(ast);
//      var varX = $$$(ast).varsWithName("x").toNode();
//      var objectAddresses = jsa.objects(varX);
//      assertEquals(1, objectAddresses.length);
//      var objectAddress = objectAddresses[0];
//      var arg = jsa.arg(objectAddress, 1);
//      assertEquals(objectAddresses, arg);
//    }
//  
//  module.test8b =
//    function ()
//    {
//      var src = "var x = { y : function (z) { return z }}; x.y(x);";
//      var ast = createAst(src);
//      var jsa = new JsAnalysis(ast);
//      var func = $$$(ast).functionExpressions().toNode();
//      var varX = $$$(ast).varsWithName("x").toNode();
//      var objectAddresses = jsa.objects(func);
//      assertEquals(1, objectAddresses.length);
//      var objectAddress = objectAddresses[0];
//      var arg = jsa.arg(objectAddress, 0);
//      var objectAddressesX = jsa.objects(varX);
//      assertEquals(objectAddressesX, arg);
//    }
//  
//  module.test9 =
//    function ()
//    {
//      var src = "var x = function (y) { return y }; x(x);";
//      var ast = createAst(src);
//      var jsa = new JsAnalysis(ast);
//      var varX = $$$(ast).varsWithName("x").toNode();
//      var objectAddresses = jsa.objects(varX);
//      assertEquals(1, objectAddresses.length);
//      var objectAddress = objectAddresses[0];
//      var ret = jsa.ret(objectAddress);
//      assertEquals(objectAddresses, ret);
//    }
//  
//  module.test10 =
//    function ()
//    {
//      var src = "function F(x) {this.x = x;} function g(p) {return p.x;} var f = new F(123); g(f);";
//      var ast = createAst(src);
//      var jsa = new JsAnalysis(ast);
//      // threw error (Benv subsumption error)
//    }
//  
//  module.test11 =
//    function ()
//    {
//      var src = "var o1 = {}; var o2 = {}";
//      var ast = createAst(src);
//      var jsa = new JsAnalysis(ast);
//      var as = jsa.allObjects();
//      var vars = nodes(ast).filter(isIdentifier);
//      assertTrue(as.subsumes(jsa.objects(vars[0]).concat(jsa.objects(vars[1]))));
//    }
  
  return module;
})();
