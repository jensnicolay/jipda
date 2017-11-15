// https://github.com/tc39/proposal-global
function getGlobal()
{
  if (typeof self !== 'undefined') { return self; }
  if (typeof window !== 'undefined') { return window; }
  if (typeof global !== 'undefined') { return global; }
  throw new Error('unable to locate global object');
}

const glob = getGlobal();

if (!glob['performance'])
{
  glob['performance'] = Date;
}
