import {BOT} from '../lattice.mjs';
import {Obj, Present, Absent} from '../object.mjs';
import typeLattice from "../type-lattice.mjs";
import concLattice from "../conc-lattice.mjs";
import {assert, assertFalse} from "../common.mjs";

function randomIntFromInterval(min, max)
{
  return Math.floor(Math.random() * (max-min+1)+min);
}


function checkForLattice(l)
{
  sanityCheck(l);

  // const names = ["0", "1", "2", "length", "x", "y"];
  // const anames = names.map(name => l.abst1(c));

  // function randomName()
  // {
  //   return randomIntFromInterval(0, c.length - 1);
  // }

  // console.log("running object checks...");
  // for (let i = 0; i < 1_000_000; i++)
  // {
}


function sanityCheck(lat)
{
  const P_X = lat.abst1("x");
  const P_Y = lat.abst1("y");
  const P_1 = lat.abst1("1");
  const P_2 = lat.abst1("2");

  const D_1 = lat.abst1(1);
  const D_2 = lat.abst1(2);

  function t1()
  {
    let obj1 = Obj.empty();
    let obj2 = Obj.empty();
    assert(obj1.equals(obj2));
    assert(obj1.getProperty(P_X).isAbsent());
    assertFalse(obj1.getProperty(P_Y).isPresent());

    let obj3 = obj1.join(obj2);
    assert(obj1.equals(obj3));
    assert(obj2.equals(obj3));
    assert(obj3.getProperty(P_X).isAbsent());
    assertFalse(obj3.getProperty(P_Y).isPresent());
  }

  function t2()
  {
    let obj1 = Obj.empty();
    obj1 = obj1.addProperty(P_X, D_1);
    let obj2 = Obj.empty();
    obj2 = obj2.addProperty(P_X, D_1);
    assert(obj1.equals(obj2));
    assert(obj1.getProperty(P_X).isPresent());
    assertFalse(obj1.getProperty(P_X).isAbsent());

    let obj3 = obj1.join(obj2);
    assert(obj1.equals(obj3));
    assert(obj2.equals(obj3));
    assert(obj3.getProperty(P_X).isPresent());
    assertFalse(obj3.getProperty(P_X).isAbsent());
  }

  function t3()
  {
    let obj1 = Obj.empty();
    obj1 = obj1.addProperty(P_X, D_1);
    let obj2 = Obj.empty();
    obj2 = obj2.addProperty(P_Y, D_2);
    assertFalse(obj1.equals(obj2));
    assert(obj1.getProperty(P_X).isPresent());
    assertFalse(obj1.getProperty(P_X).isAbsent());

    let obj3 = obj1.join(obj2);
    assert(obj1.equals(obj3));
    assert(obj2.equals(obj3));
    assert(obj3.getProperty(P_X).isPresent());
    assertFalse(obj3.getProperty(P_X).isAbsent());
  }

  t1();
  t2();
  t3()
}

checkForLattice(typeLattice);