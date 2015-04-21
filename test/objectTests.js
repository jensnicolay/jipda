var suiteObjectTests = 

(function () 
{
  var module = new TestSuite("suiteObjectTests");
  var l = new JipdaLattice();
  var L_1 = l.abst1("1");
  var L_2 = l.abst1("2");
  var L_3 = l.abst1("3");
  var L_A = l.abst1("a");
  var L_B = l.abst1("b");
  var L_C = l.abst1("c");
//  var L_STRING = l.STRING;
//  var L_NUMBER = l.NUMBER;
//  var L_BOOL = l.BOOL;
  var L_UNDEFINED = l.abst1(undefined);
  
  module.testLookup1 =
    function ()
    {
      var obj = new Obj();
      obj = obj.add(L_A, L_1);
      assertEquals([L_1, true], obj.lookup(L_A));
    }
    
  module.testLookup2 =
    function ()
    {
      var obj = new Obj();
      obj = obj.add(L_A, L_1);
      obj = obj.add(L_B, L_2);
      assertEquals([L_2, true], obj.lookup(L_B));
    }
    
  module.testLookup3 =
    function ()
    {
      var obj = new Obj();
      obj = obj.add(L_A, L_1);
      obj = obj.add(L_B, L_2);
      assertEquals([L_1.join(L_2), false], obj.lookup(L_A.join(L_B)));
    }
    
  module.testLookup4 =
    function ()
    {
      var obj = new Obj();
      obj = obj.add(L_A, L_1);
      assertEquals([L_1, false], obj.lookup(L_A.join(L_B)));
    }
    
  return module;

})()


