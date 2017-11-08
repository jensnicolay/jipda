let counter = 0;

export default {
  native: () => counter++, // native allocator interface
  object: () => counter++,
  closure: () => counter++,
  closureProtoObject: () => counter++,
  array: () => counter++,
  error: () => counter++,
  string: () => counter++,
  constructor: () => counter++,
  vr: () => counter++
}