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

const BOT = Object.create(null); // should be 'const', but gives problems with rebuilding
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
