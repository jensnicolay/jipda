export default {
  object: node => "obj-" + node.tag,
  closure: node => "clo-" + node.tag,
  closureProtoObject: node => "proto-" + node.tag,
  array: node => node.type === "NewExpression" ? "arr" : "arr-" + node.tag,
  error: node => "err-" + node.tag,
  string: node => "str-" + node.tag,
  constructor: node => "ctr-" + node.tag,
  vr: node => "var-" + node.tag
}