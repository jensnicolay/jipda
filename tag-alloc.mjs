import {assertDefinedNotNull} from "./common.mjs";

export default {
  object: (node, ctx) => {assertDefinedNotNull(ctx); return "obj-" + node.tag},// + "@" + ctx._id},
  closure: (node, ctx) => {assertDefinedNotNull(ctx); return "clo-" + node.tag},// + "@" + ctx._id},
  closureProtoObject: (node, ctx) => {assertDefinedNotNull(ctx); return "pro-" + node.tag},// + "@" + ctx._id},
  array: (node, ctx) => {assertDefinedNotNull(ctx); return "arr-" + node.tag},// + "@" + ctx._id},//node.type === "NewExpression" ? "arr" : "arr-" + node.tag,
  error: (node, ctx) => {assertDefinedNotNull(ctx); return "err-" + node.tag},// + "@" + ctx._id},
  string: (node, ctx) => {assertDefinedNotNull(ctx); return "str-" + node.tag},// + "@" + ctx._id},
  constructor: (node, ctx) => {assertDefinedNotNull(ctx); return "ctr-" + node.tag},// + "@" + ctx._id},
  vr: (node, ctx) => {assertDefinedNotNull(ctx); return "var-" + node.tag},// + "@" + ctx._id}
}