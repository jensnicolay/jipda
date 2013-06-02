var suiteLatticeTests = 
  
(function () 
{
  var module = new TestSuite("suiteLatticeTests");
  
  module.sanityCheck =
    function (lat)
    {
      var undef = lat.abst1(undefined);
      var nul = lat.abst1(null);
      var sint = lat.abst1(123);
      var int = lat.abst1(1232975937593475894379);
      var float = lat.abst1(3.1415926);
      var str = lat.abst1("jfjsofj");
      var strnum = lat.abst1("134");
      var fals = lat.abst1(false);
      var tru = lat.abst1(true);
      var nan = lat.abst1(NaN);
      var pinf = lat.abst1(+Infinity);
      var ninf = lat.abst1(-Infinity);
      
      var vals = [undef, nul, sint, int, float, str, strnum, fals, tru, nan, pinf, ninf];
      
      vals.forEach(function (val) {
        assertTrue(val.join(val).equals(val));
        assertTrue(val.join(val).compareTo(val) === 0);
        assertTrue(val.compareTo(val.join(val)) === 0);
        assertTrue(val.join(val).subsumes(val));
        assertTrue(val.subsumes(val.join(val)));
      })
    }
  
  module.testLattice1 =
    function()
    {
      var lat = new Lattice1();
      module.sanityCheck(lat);
    }
  
  module.testCpLattice =
    function()
    {
      var lat = new CpLattice();
      module.sanityCheck(lat);
    }
  
  module.testSetLattice1 =
    function()
    {
      var lat = new LatN(1);
      module.sanityCheck(lat);
    }
  
  module.testSetLattice2 =
    function()
    {
      var lat = new LatN(2);
      module.sanityCheck(lat);
    }
  
  return module;
  
})()
