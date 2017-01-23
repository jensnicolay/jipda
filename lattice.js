"use strict";

function Lattice()
{
}

Lattice.join =
  function (x, y)
  {
    if (x === BOT)
    {
      return y;
    }
    return x.join(y);
  }

var BOT = Object.create(null); // should be 'const', but gives problems with rebuilding 
BOT.join = function (other) { return other };
BOT.meet = function (other) { return BOT };
BOT.hashCode = function () { return 0 };
BOT.equals = function (x) { return x === BOT };
BOT.subsumes = function (x) { return x === BOT };
BOT.isAddress = function () { return false };
BOT.addresses = function () { return ArraySet.empty() };
BOT.conc = function () { return [] };
BOT.toString = function () { return "_" };
BOT.nice = function () { return "_" };
BOT.accept = function (visitor) { return visitor.visitBOT(this) };


/// ECMA stuff, should be split off (is JavaScript specific)

var Ecma = {};

Ecma.isArrayIndex =
  function (x)
  {
    return typeof x === "number" && x > -1 && x < 4294967296;
  }

Ecma.isStringArrayIndex =
  function (x)
  {
    if (typeof x !== "string")
    {
      return false;
    }
    var number = Number(x);
    return Ecma.isArrayIndex(number);
  }

// //8.6.2
// Ecma.Class =
//   {
//     OBJECT: "Object",
//     FUNCTION: "Function",
//     ARRAY: "Array",
//     ARGUMENTS: "Arguments",
//     STRING: "String",
//     BOOLEAN: "Boolean",
//     NUMBER: "Number",
//     MATH: "Math",
//     DATE: "Date",
//     REGEXP: "RegExp",
//     ERROR: "Error",
//     JSON: "JSON"
//   };
