import {BOT} from '../lattice.mjs';
import typeLattice from "../type-lattice.mjs";
import {assert, assertFalse} from "../common.mjs";

function checkLattice(l)
{
  sanityCheck(l);

  const c = [0,1,2,"","hey","ho","0","3","4",true,false,undefined,null];
  const a = c.map(function (c) {return l.abst1(c)});

  function randomIntFromInterval(min, max)
  {
    return Math.floor(Math.random() * (max-min+1)+min);
  }

  function randomIndex()
  {
    return randomIntFromInterval(0, c.length - 1);
  }

  console.log("running lattice checks...");
  for (let i = 0; i < 1_000_000; i++)
  {
    var numJoins = randomIntFromInterval(1, 6);
    var v = BOT;
    for (let j = 0; j < numJoins; j++)
    {
      var index = randomIndex();
      var aval = a[index];
      var jv = v.join(aval);
      // print("v", v, "aval", aval, "jv", jv);
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
  console.log("done with lattice checks...");
}


function sanityCheck(lat)
{
    lat.sanity();
    assert(lat.abst1(0).isFalsy());
    assert(lat.abst1(1).isTruthy());
    assert(lat.abst1(-1).isTruthy());
    assert(lat.abst1("").isFalsy());
    assert(lat.abst1("0").isTruthy());
    assert(lat.abst1("xyz").isTruthy());
    assert(lat.abst1(true).isTruthy());
    assert(lat.abst1(false).isFalsy());

    assert(lat.abst1(0).join(lat.abst1("")).isFalsy());
    assert(lat.abst1(1).join(lat.abst1(-1)).isTruthy());
    assert(lat.abst1(true).join(lat.abst1(false)).isTruthy());
    assert(lat.abst1(true).join(lat.abst1(false)).isFalsy());
}

checkLattice(typeLattice);