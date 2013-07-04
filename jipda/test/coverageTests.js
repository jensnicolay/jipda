var suiteCoverageTests = 
  
(function () 
{
  var module = new TestSuite("coverageTests");
  
  //function tt() { b(); return displayTestResults(TestSuite.runSuites([suiteConcreteTests]))}
  
  function coverage(ast, printIt)
  {
    if (printIt)
    {
      printTree(ast);
    }
    return nodes(ast).flatMap(function (n) {return n.visited ? [] : [n.tag]});
  }
  
  module.test1 =
    function ()
    {
      var ast = createAst("42", {resetTagCounter:true});
      var lat = new CpLattice();
      var jipda = new Jipda({lattice: lat, k:0, ag: tagAg});
      jipda.evalNode(ast);
      assertSetEquals([], coverage(ast));
    }
        
  module.test2 =
    function ()
    {
      var src = read("test/resources/loopy1.js");
      var ast = createAst(src, {resetTagCounter:true, loc:true});
      var lat = new CpLattice();
      var jipda = new Jipda({lattice: lat, k:0, ag: tagAg});
      jipda.evalNode(ast);
      assertSetEquals([], coverage(ast));
    }
          
  module.test3 =
    function ()
    {
      var src = read("test/resources/loopy2.js");
      var ast = createAst(src, {resetTagCounter:true, loc:true});
      var lat = new CpLattice();
      var jipda = new Jipda({lattice: lat, k:0, ag: tagAg});
      jipda.evalNode(ast);
      assertSetEquals([], coverage(ast));
    }
          
  module.test4 =
    function ()
    {
      var src = read("test/resources/nssetup.js");
      var ast = createAst(src, {resetTagCounter:true, loc:true});
      var lat = new CpLattice();
      var jipda = new Jipda({lattice: lat, k:0, ag: tagAg});
      jipda.evalNode(ast);
      assertSetEquals([], coverage(ast));
    }
          
  module.test5 =
    function ()
    {
      var src = read("test/resources/tajs2009.js");
      var ast = createAst(src, {resetTagCounter:true, loc:true});
      var lat = new CpLattice();
      var jipda = new Jipda({lattice: lat, k:0, ag: tagAg});
      jipda.evalNode(ast);
      assertSetEquals([], coverage(ast));
    }
          
//  module.test6 =
//    function ()
//    {
//      var src = read("resources/loopy3.js");
//      var ast = createAst(src, {resetTagCounter:true, loc:true});
//      var lat = new CpLattice();
//      var jipda = new Jipda({lattice: lat, k:0, ag: tagAg});
//      jipda.evalGlobal(ast, {state:state});
//      assertSetEquals([], coverage(ast));
//    }
          
// print(coverage(ast).map(tagToNode(ast)).map(function(n){return [n,n.loc.start.line,n.loc.start.column]}).join("\n"))  
  
  return module;
  
})()
