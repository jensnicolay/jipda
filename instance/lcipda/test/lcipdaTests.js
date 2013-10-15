var suiteLcipdaTests = 

(function () 
{
  var module = new TestSuite("suiteLcipdaTests");

  function run(src, cesk, expected)
  {
    var ast = new SchemeParser().parse(src)[0];
    var result = new Pushdown().analyze(ast, cesk);
    var actual = result.stepFwOver(result.initial).map(function (q) {return q.value}).reduce(Lattice.join, BOT);
    assertEquals(expected, actual);
  }
  
  function createCesk(cc)
  {
    cc = cc || {};
    return schemeCesk({a:cc.a || tagAg, p:cc.p || new Lattice1()});
  }
  
  module.test1a =
    function ()
    {
      var cesk = createCesk();
      run("42", cesk, cesk.l.abst1(42));
    }
    
   module.test12a =
  	function ()
  	{
  		var src = "(begin (define sq (lambda (x) (* x x))) (sq 5) (sq 6))";
  		var cesk = createCesk();
      run(src, cesk, cesk.l.abst1(36));
      // property addresses: var allocated as (vr, time)
//      assertEquals(jipda.lattice.abst([25, 30, 36]), actual);
      // now: extended benv directly takes x to value, and extended benv is allocated as (application, time)
  	}
//  
//  module.test12b =
//  	function ()
//  	{
//  		var ast = createAst("var sq = function (x) {return x * x;}; sq(5); sq(6);");
//  		var lat = new LatN(1);var jipda = new Jipda({lattice: lat, k:0, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//  		assertEquals(jipda.lattice.abst1(36), actual);
//  	};
//  
//  module.test13 =
//  	function ()
//  	{
//  		var ast = createAst("var sq = function (x) {return x * x;}; sq(5); sq(6);");
//  		var lat = new LatN(1);var jipda = new Jipda({lattice: lat, k:1, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//  		assertEquals(jipda.lattice.abst1(36), actual);
//  	};
//  
  module.test19a =
  	function ()
  	{
  		var src = "(begin (define count (lambda (n) (if (= n 0) \"done\" (count (- n 1))))) (count 200))";
      var cesk = createCesk();
      run(src, cesk, cesk.l.abst1("done"));
  	}
  	
//  module.test19b =
//  	function ()
//  	{
//  		var src = "var count = function (n) {if (n===0) {return 'done';} else {return count(n-1);}}; count(200)");
//  		var lat = new LatN(1);var jipda = new Jipda({lattice: lat, k:4, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//  		assertEquals(jipda.lattice.abst1("done"), actual);
//  	};
  	
 module.test20a =
   function ()
   {
     var src = "(begin (define f (lambda () (f))) (f))";
     var cesk = createCesk();
     run(src, cesk, BOT);
   }
 
 module.test20b =
   function ()
   {
     var src = "(begin (define t (lambda (x) (t (+ x 1)))) (t 0))";
     var cesk = createCesk();
     run(src, cesk, BOT);
   }
   
  	
//  module.test26a =
//  	function ()
//  	{
//  		var ast = createAst("var z=0; var f=function (i) { if (i<4) {z=z+1;f(i+1);}}; f(0); z;");
//  		var lat = new LatN(4);var jipda = new Jipda({lattice: lat, k:3, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//  		assertEquals(jipda.lattice.abst([4,5]), actual); // concrete: 4
//  	};
//  	
//  module.test26b =
//  	function ()
//  	{
//  		var ast = createAst("var z=0; var f=function (i) { if (i<4) {z=z+1;f(i+1);}}; f(0); z;");
//  		var lat = new LatN(4);var jipda = new Jipda({lattice: lat, k:4, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//  		assertEquals(jipda.lattice.abst1(4), actual);
//  	};
//  	
//  module.test27a =
//  	function ()
//  	{
//  		var ast = createAst("var z=0; var s=0; var f=function (i) {if (z === 7) {s=s+1} if (i<10) {z=z+1;f(i+1);}}; f(0); s;");
//  		var lat = new LatN(4);var jipda = new Jipda({lattice: lat, k:0, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//  		// concrete: 1 (but k === 0 !!!)
//  		assertEquals(lat.Top, actual.user); /// mmm...
//  		assertEquals([], actual.as);
//  	};
//  	
//  module.test27b =
//  	function ()
//  	{
//  		var ast = createAst("var z=0; var c=false; var f=function (i) {if (z === 7) {c=true} if (i<10) {z=z+1;f(i+1);}}; f(0); c;");
//  		var lat = new LatN(4);
//  		var jipda = new Jipda({lattice: lat, k:0, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      // concrete: true
//  		assertEquals(jipda.lattice.abst([false, true]), actual);
//  	};
//  	
//  module.test27c =
//  	function ()
//  	{
//  		var ast = createAst("var z=0; var c=false; var f=function (i) {if (z === 7) {c=true} if (i<10) {z=z+1;f(i+1);}}; f(0); z;");
//  		var lat = new LatN(4);
//  		var jipda = new Jipda({lattice: lat, k:999, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//  		assertEquals(jipda.lattice.abst1(10), actual);
//  		var store = result.map(State.store).reduce(Lattice.join, BOT);
//  		var global = store.lookupAval(jipda.globalObject);
//  		var actual2 = global.lookup(lat.abst1("c")).value;
//  		assertEquals(jipda.lattice.abst1(true), actual2);
//  	};
//  	
//  module.test61a =
//  	function ()
//  	{
//  		var ast = createAst("for (var i=0; i<3; i++) i;");
//  		var lat = new LatN(1);var jipda = new Jipda({lattice: lat, k:3, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//  		assertEquals(jipda.lattice.abst1(2), actual);
//  	}	
//  
//  module.test61aa =
//  	function ()
//  	{
//  		var ast = createAst("for (var i=0; i<3; i++) i;");
//  		var lat = new LatN(1);var jipda = new Jipda({lattice: lat, k:2, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(lat.Top, actual.user);
//      assertEquals([], actual.as);
//  		// time is limiting factor: 3 iterations have same var i, but timestamps [], [x], [x,y]
//  	}	
//  
//  module.test61b =
//  	function ()
//  	{
//  		var ast = createAst("for (var i=0; i<3; i++) i; i;");
//  		var lat = new LatN(1);
//  		var jipda = new Jipda({lattice: lat, k:3, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//  		assertEquals(jipda.lattice.abst1(3), actual);
//  	}	
//  
//  module.test61bb =
//  	function ()
//  	{
//  		var ast = createAst("for (var i=0; i<3; i++) i; i;");
//  		var lat = new LatN(1);
//  		var jipda = new Jipda({lattice: lat, k:2, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(lat.Top, actual.user);
//      assertEquals([], actual.as);
//  	}	
//  
//  module.test64 =
//    function ()
//    {
//      var ast = createAst("for (var i=0; true; i++) i; i;");
//      var lat = new LatN(1);var jipda = new Jipda({lattice: lat, k:4, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(BOT, actual);
//    } 
//  
//  module.test65 =
//    function ()
//    {
//      var ast = createAst("var ar = []; for (var i = 0; i < 1000; i++) {ar[i] = i;}; ar;");
//      var lat = new LatN(1);
//      var jipda = new Jipda({lattice: lat, k:4, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      //assertEquals("{100}", actual);
//    } 
//  
//  module.test76a =
//    function ()
//    {
//      var src = "var a = new Array(10); a.length";
//      var ast = createAst(src);
//      var lat = new LatN(1);
//      var jipda = new Jipda({lattice: lat, k:0, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(jipda.lattice.abst1(10), actual); 
//    }
//  
//  module.test76b =
//    function ()
//    {
//      var src = "var a = new Array(10); a[3] = 3; a.length";
//      var ast = createAst(src);
//      var lat = new LatN(1);var jipda = new Jipda({lattice: lat, k:0, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(jipda.lattice.abst1(10), actual); 
//    }
//  
//  module.test78a =
//    function ()
//    {
//      var src = "var a = 0; for (var i = 0; i < 1000; i++); a = 1; a";
//      var ast = createAst(src);
//      var lat = new LatN(2);
//      var jipda = new Jipda({lattice: lat, k:0, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      // property addresses:
////      assertEquals(jipda.lattice.abst1(1), actual); // threaded heap: {1}, single-threaded heap: {1,0}
//      assertEquals(jipda.lattice.abst1(1), actual);
//    }
//  
//  module.test79a =
//    function ()
//    {
//      var src = read("test/resources/loopy1.js");
//      var ast = createAst(src);
//      var lat = new LatN(1);
//      var jipda = new Jipda({lattice: lat, k:4, a: tagAg});
////      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      var result = jipda.evalNode(ast);
//    }
//  
//  module.test79b =
//    function ()
//    {
//      var src = read("test/resources/loopy2.js");
//      var ast = createAst(src);
//      var lat = new LatN(1);
//      var jipda = new Jipda({lattice: lat, k:4, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(jipda.lattice.abst1(true), actual);
//    }
//  
//  module.test80 =
//    function ()
//    {
//      var src = read("test/resources/nssetup.js");
//      var ast = createAst(src);
//      var lat = new LatN(1);
//      var jipda = new Jipda({lattice: lat, k:1, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(jipda.lattice.abst1(true), actual);
//    }
//  
//  module.test81a =
//    function ()
//    {
//      // GC bug: primitives should add receiver + operands to root
//      var src = "[1,2,3].map(function (x) { return x + 1 })";
//      var ast = createAst(src);
//      var lat = new LatN(1);var jipda = new Jipda({lattice: lat, k:1, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      //assertEquals(jipda.lattice.abst1(true), actual); TODO when abstract printer       
//    }
//  
//  module.test81b =
//    function ()
//    {
//    // GC bug: primitives should add operator + operands to root
//      var src = "[2,3,4].map(function (x) { return x*x*x })[1]";
//      var ast = createAst(src);
//      var lat = new LatN(1);var jipda = new Jipda({lattice: lat, k:1, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(jipda.lattice.abst1(27), actual);       
//    }
//  
//  module.test81c =
//    function ()
//    {
//      var src = "[2,3,4].reduce(function (x,y) {return x+y})";
//      var ast = createAst(src);
//      var lat = new LatN(1);var jipda = new Jipda({lattice: lat, k:1, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(jipda.lattice.abst1(9), actual);       
//    }
//  
//  module.test82 =
//    function ()
//    {
//      var src = "var o1={x:1}; var o2={x:2}; var o=$join(o1,o2); o.x";
//      var ast = createAst(src);
//      var lat = new LatN(2);var jipda = new Jipda({lattice: lat, k:1, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(jipda.lattice.abst([1,2]), actual);           
//    }
//  
//  module.test83 =
//    function ()
//    {
//      var src = "var a=[]; for (var i = 0; i < 1000; i++) { a.push({x:5}) }"; // (bug) should not crash
//      var ast = createAst(src);
//      var lat = new Lattice1();
//      var jipda = new Jipda({lattice: lat, k:0, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(lat.Num, actual.user);           
//    }
//  
//  module.test84 =
//    function ()
//    {
//      var src = "function f(){for (var i = 0; i < 10; i++){var j = i * i;} return j;}; f()";
//      var ast = createAst(src);
//      var lat = new Lattice1();
//      var jipda = new Jipda({lattice: lat, k:0, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(lat.Num, actual.user);           
//    }
//  
//  module.test85 =
//    function ()
//    {
//      var src = "var num = $join(1,2); function fib(n) {if (n<2) {return n} else {return fib(n-1)+fib(n-2)}}; fib(num);";
//      var ast = createAst(src);
//      var lat = new Lattice1(); 
//      var jipda = new Jipda({lattice: lat, k:0, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(lat.Num, actual.user);           
//    }
//  
//  module.test86 =
//    function ()
//    {
//      var src = read("test/resources/nssetup.js");
//      var ast = createAst(src);
//      var lat = new Lattice1(); 
//      var jipda = new Jipda({lattice: lat, k:2, a: tagAg}); // for k < 2, we always join same scope (extended benv) for reset()
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(jipda.lattice.abst1(true), actual);
//      var store = result.map(State.store).reduce(Lattice.join, BOT);
//      var slv = store.lookupAval(jipda.globalObject).lookup(lat.abst1("solver")).value;
//      assertTrue(slv.addresses().length === 1);
//      assertTrue(slv.user === BOT);
//    }
    
    module.testGcIpd =
      function ()
      {
        var src = read("test/resources/gcIpdExample.scm");
        var cesk = createCesk()
        run(src, cesk, cesk.l.product(cesk.p.NUMBER, []));
      }  	
  	
    module.testRotate =
      function ()
      {
        var src = read("test/resources/rotate.scm");
        var cesk = createCesk({p:new SetLattice(3)});
        run(src, cesk, cesk.l.abst([5, true, "hallo"]));
      }
    
    module.testFac =
      function ()
      {
        var src = "(begin (define f (lambda (n) (if (= n 0) 1 (* n (f (- n 1)))))) (f 10))";
        var cesk = createCesk();
        run(src, cesk, cesk.l.product(cesk.p.NUMBER, []));
      }
    
    module.testFib =
      function ()
      {
        var src = "(begin (define fib (lambda (n) (if (< n 2) n (+ (fib (- n 1)) (fib (- n 2)))))) (fib 4))";
        var cesk = createCesk();
        run(src, cesk, cesk.l.product(cesk.p.NUMBER, []));
      }
          
//    module.test100 =  SET!
//      function ()
//      {
//        var src = "var z=false; function f(n) {if (n===10) {g()}; if (n>0) {f(n-1)}}; function g() {z=true}; f(20); z"
//        var cesk = createCesk();
//        run(src, cesk, cesk.l.abst([true, false]));
//      }
    
//    module.test101 = //HANGS, !retval! ? 
//      function ()
//      {
//        var src = "(begin (define g (lambda () 1)) (define f (lambda (n) (if (= n 0) 0 (+ (f (- n 1)) (g))))) (f 10))";
//        var cesk = createCesk();
//        run(src, cesk, cesk.l.product(cesk.p.NUMBER, []));
//      }
    
//    module.testChurchNums =
//    function ()
//    {
//      var src = read("test/resources/churchNums.js");
//      var c = Pushdown.context({p:new Lattice1(), a:tagAg});
//      run(src, c, c.l.abst([true, false]));
//    }    
    
    
    // simplest of GC tests
//    
//    function f(x)
//    {
//        return x;
//    }
//
//    function g(y)
//    {
//        return f(y);
//    }
//
//    g(1);
//    g(2);
    //
      
  return module;

})()


