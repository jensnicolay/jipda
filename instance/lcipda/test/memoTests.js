var suiteMemoTests = 

(function () 
{
  var module = new TestSuite("suiteMemoTests");

  function run(src, cesk, expectedNumMemoEdges)
  {
    var ast = new SchemeParser().parse(src)[0];
    var result = new Pushdown().analyze(ast, cesk);
    var actual = result.etg.edges().filter(function (e) {return e.marks === "MEMO"});
    assertEquals(expectedNumMemoEdges, actual.length);
  }
  
  function createCesk(cc)
  {
    cc = cc || {};
    return lcCesk({a:cc.a, gc:cc.gc, p:cc.p || new Lattice1(), memo:true});
  }
  
  function multiplex(src, e1, e2, e3, e4)
  {
    var cesk1 = new lcCesk({gc:false, a:createMonoTagAg(), p:new Lattice1(), memo:true});
    var cesk2 = new lcCesk({gc:false, a:create1cfaTagAg(), p:new Lattice1(), memo:true});
    var cesk3 = new lcCesk({gc:true, a:createMonoTagAg(), p:new Lattice1(), memo:true});
    var cesk4 = new lcCesk({gc:true, a:create1cfaTagAg(), p:new Lattice1(), memo:true});
    run(src, cesk1, e1);
    run(src, cesk2, e2);
    run(src, cesk3, e3);
    run(src, cesk4, e4);
  }
  
  module.test1 =
    function ()
    {
      var src = "(letrec ((sq (lambda (x) (* x x)))) (sq 5) (sq 6) (sq 7))";
      multiplex(src, 1, 0, 0, 0);
    }

  module.test2 =
    function ()
    {
      var src = "(letrec ((fac (lambda (n) (if (= n 0) 1 (* n (fac (- n 1))))))) (fac 10))";
      multiplex(src, 1, 1, 1, 1);
    }

  module.test3 =
    function ()
    {
      var src = "(letrec ((id (lambda (x) (letrec ((y x)) y)))) (id 3) (id 3))";
      multiplex(src, 1, 1, 1, 1);
    }

  module.test4 =
    function ()
    {
      var src = "(letrec ((fib (lambda (n) (if (< n 2) n (+ (fib (- n 1)) (fib (- n 2))))))) (fib 4))";
      multiplex(src, 2, 4, 2, 3);
    }

  return module;

})()


