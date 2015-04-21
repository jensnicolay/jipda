  load("common.js");
  load("lattice.js");
  load("abstLattice1-2.js");
  load("test.js");


  var c = [0,1,2,"","hey","ho","0","3","4",true,false,undefined,null];
  var l = new JipdaLattice();
  var a = c.map(function (c) {return l.abst1(c)});
  
  function randomIntFromInterval(min,max) {
    return Math.floor(Math.random()*(max-min+1)+min);
}
  
  function randomIndex()
  {
    return randomIntFromInterval(0, c.length - 1);
  }
 
  for (var i = 0; i < 1000000; i++)
  {
    var numJoins = randomIntFromInterval(1, 6);
    var v = BOT;
    for (var j = 0; j < numJoins; j++)
    {
      var index = randomIndex();
      var aval = a[index];
      var jv = v.join(aval);
      print("v", v, "aval", aval, "jv", jv);
      assert(jv.subsumes(v));
      assert(jv.subsumes(aval));
      if (!jv.equals(v))
      {        
        assertFalse(v.subsumes(jv));
      }
      if (!jv.equals(aval))
      {        
        assertFalse(aval.subsumes(jv));
      }
      v = jv;
    }
  }
