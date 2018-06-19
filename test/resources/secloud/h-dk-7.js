function executeOnce () {
  var argc = arguments.length, bImplGlob = typeof arguments[argc - 1] === "string";
  if (bImplGlob) { argc++; }
  if (argc < 3) { throw new TypeError("executeOnce - not enough arguments"); }
  var fExec = arguments[0], sKey = arguments[argc - 2];
  if (typeof fExec !== "function") { throw new TypeError("executeOnce - first argument must be a function"); }
  if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { throw new TypeError("executeOnce - invalid identifier"); }
  if (decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) === "1") { return false; }
  fExec.apply(argc > 3 ? arguments[1] : null, argc > 4 ? Array.prototype.slice.call(arguments, 2, argc - 2) : []);
  document.cookie = encodeURIComponent(sKey) + "=1; expires=Fri, 31 Dec 9999 23:59:59 GMT" + (bImplGlob || !arguments[argc - 1] ? "; path=/" : "");
  return true;
}