var suiteConcreteTests = 
  
(function () 
{
  var module = new TestSuite("suiteConcreteTests");
  
  function run(src, expected)
  {
    var ast = new SchemeParser().parse(src)[0];
    var lat = new CpLattice();
    var cesk = lcCesk({a:createConcreteAg(), l: new CpLattice()});
    var result = new Pushdown().analyze(ast, cesk);
    var actual = result.stepFwOver(result.initial).map(function (c) {return c.q.value}).reduce(Lattice.join, BOT);
    assertEquals(SetValue.from1(cesk.l.abst1(expected)), actual);    
  }

  module.test1 =
    function ()
    {
      run("42", 42);
      run("#t", true);
      run("#f", false);
    }
        
  module.test2 =
    function ()
    {
      run("(begin 41 42)", 42);
    }
            
  module.test3 =
    function ()
    {
      run("(letrec ((a 1)) a)", 1);
      run("(letrec ((a 2)) (+ a a))", 4);
      run("(letrec ((a 2) (b 3)) (+ a b))", 5);
      run("(letrec ((a 3) (b 4) (c 5)) (- a b c))", -6);
//      run("var a = 4; a = 5; a;", 5); SET!
    };
    
  module.test4 =
    function ()
    {
      run("(letrec ((pi (lambda () 3))) (begin (pi) (pi)))", 3); 
      // repeat test with (define (pi) 3)
    };
    
  module.test5 =
    function ()
    {
      run("(letrec ((sq (lambda (x) (* x x)))) (sq 5))", 25);
      // repeat test with (define (sq x) ...)
      run("(letrec ((sq (lambda (x) (* x x)))) (begin (sq 5) (sq 6)))", 36);
    };

//    module.testChurchNums = // TODO too slow
//      function ()
//      {
//        run(read("test/resources/churchNums.scm"), true);    
//      }
    
    module.testGcIpd =
      function ()
      {
        run(read("test/resources/gcIpdExample.scm"), 36);    
      }
    
    module.testSat2 =
      function ()
      {
        run(read("test/resources/sat2.scm"), true);    
      }
    
//    module.testRotate = // TODO too slow
//      function ()
//      {
//        run(read("test/resources/rotate.scm"), "hallo");    
//      }
    
    module.testFib =
      function ()
      {
        run("(letrec ((fib (lambda (n) (if (< n 2) n (+ (fib (- n 1)) (fib (- n 2))))))) (fib 4))", 3);
      }
    
    module.testFac =
      function ()
      {
        run("(letrec ((f (lambda (n) (if (= n 0) 1 (* n (f (- n 1))))))) (f 10))", 3628800);
      }
    
    module.test101 =
      function ()
      {
        run("(letrec ((g (lambda () 1)) (f (lambda (n) (if (= n 0) 0 (+ (f (- n 1)) (g)))))) (f 10))", 10);
      }
    
    module.test200 =
      function ()
      {
        run("(if 123 1 2)", 1);
        run("(if (lambda () 123) 1 2)", 1);
        run("(if (cons 1 2) 1 2)", 1);
        run("(if #t 1 2)", 1);
        run("(if #f 1 2)", 2);
      }
    
        
  return module;
  
})()
