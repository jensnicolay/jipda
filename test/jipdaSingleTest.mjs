import fs from 'fs';

import {assertEquals, assert} from '../common';
import {FileResource, StringResource} from "../ast";
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {computeInitialCeskState, explore, isSuccessState} from '../abstract-machine';
import typeLattice from "../type-lattice";
import aacKalloc from "../aac-kalloc";
import tagCtxAlloc from "../tag-alloc";
//import tagCtxAlloc from "../tag-ctx-alloc";

const ast0resource = new FileResource("../prelude.js");

//const jsConcSemantics = createSemantics(concLattice, {errors: true});
const jsTypeSemantics = createSemantics(typeLattice, {errors:true});

//const s0Conc = computeInitialCeskState(jsConcSemantics, concAlloc, concKalloc, ast0resource);
const s0Type = computeInitialCeskState(jsTypeSemantics, concAlloc, concKalloc, ast0resource);

let c = 0;

function run(resource, expected)
{
  console.log(++c + "\t" + resource);

  // process.stdout.write("conc ");
  // const s1Conc = s0Conc.switchMachine(jsConcSemantics, concAlloc, concKalloc, {hardAsserts: true});
  //
  // const s2Conc = s1Conc.enqueueScriptEvaluation(resource);
  // let actualConc = jsConcSemantics.lat.bot();
  // const systemConc = explore([s2Conc], s =>
  // {
  //   if (isSuccessState(s))
  //   {
  //     console.log(s.value);
  //     //actualConc = actualConc.join(s.value);
  //   }
  //   else if (s.isThrowState)
  //   {
  //     throw new Error(s.value + "\n" + s.value.addresses().map(addr => s.store.lookupAval(addr).lookup(jsConcSemantics.lat.abst1("message")).value.Value).join());
  //   }
  //   else if (s.isErrorState)
  //   {
  //     throw new Error(s.node.loc.start.line + ": " + s.msg);
  //   }
  //   else
  //   {
  //     throw new Error("no progress: " + s);
  //   }
  // });
  // if (!concLattice.abst1(expected).equals(actualConc))
  // {
  //   throw new Error("expected " + expected + ", got " + actualConc);
  // }

  process.stdout.write("type ");
  const s1Type = s0Type.switchMachine(jsTypeSemantics, tagCtxAlloc, aacKalloc, {hardAsserts: true});
  const s2Type = s1Type.enqueueScriptEvaluation(resource);
  let actualType = jsTypeSemantics.lat.bot();

  let sss = null;

  const systemType = explore([s2Type], s => {
    if (isSuccessState(s))
    {
      // console.log("abstract success value: " + s.value);
      // if (sss) {console.log(s.store.diff(sss))};
      // sss = s.store;
      actualType = actualType.join(s.value);
    }
    else if (s.isThrowState)
    {
      console.warn(s.value + "\n" + s.value.addresses().map(addr => s.store.lookupAval(addr).lookup(jsTypeSemantics.lat.abst1("message")).value.Value).join());
    }
    else if (s.isErrorState)
    {
      throw new Error(s.node.loc.start.line + ": " + s.msg);
    }
    else
    {
      throw new Error("no progress: " + s);
    }
  });
  if (!actualType.subsumes(jsTypeSemantics.lat.abst1(expected)))
  {
    if (!actualType.abst().subsumes(jsTypeSemantics.lat.abst1(expected)))
    {
      console.log(jsTypeSemantics.lat.abst1(expected).constructor.name)
      throw new Error(actualType + " does not subsume " + expected);
    }
    console.warn("required abst on abstract value");
  }

  console.log();
}

function runSource(src, expected)
{
  return run(new StringResource(src), expected);
}

function runFile(path, expected)
{
  return run(new FileResource(path), expected);
}

function runEval(...tests)
{
  for (const t of tests)
  {
    runSource(t, eval(t));
  }
}



//runSource("function Circle(x,y,r){this.x=x;this.y=y;this.r=r};function area(s){return 3*s.r*s.r};var circles=[[10,100,4],[-10,-10,3],[0,50,5]].map(function (xyr){return new Circle(xyr[0], xyr[1], xyr[2])});var totalArea = circles.map(area).reduce(function (x,y) {return x+y});totalArea", 150);
//runSource("var x={a:1}; function Y() {this.b=2};Y.prototype=x;var obj=new Y();var glob=[];for (var prop in obj) {glob.push(prop)};glob.length===2 && glob.indexOf('a')>-1 && glob.indexOf('b')>-1", true);
//runSource("var t = 'aBRaCADabrA'; t.length", 11);
runSource("'0,1,hello'.split(',').length", 3 );
