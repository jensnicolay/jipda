import {ArraySet} from './common.mjs';

export const BOT = Object.create(null); // should be 'const', but gives problems with rebuilding
BOT.join = function (other) { return other };
BOT.update = function (other) { return other };
BOT.meet = function (other) { return BOT };
BOT.hashCode = function () { return 0 };
BOT.equals = function (x) { return x === BOT };
BOT.subsumes = function (x) { return x === BOT };
BOT.isAddress = function () { return false };
BOT.addresses = function () { return ArraySet.empty() };
BOT.isTrue = function () { return false };
BOT.isFalse = function () { return false };
BOT.conc = function () { return [] };
BOT.toString = function () { return "_" };
BOT.nice = function () { return "_" };
BOT.accept = function (visitor) { return visitor.visitBOT(this) };
