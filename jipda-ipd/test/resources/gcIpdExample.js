// example from "Introspective Pushdown Analysis"
function id(x) { return x }
function f(n) { return n <= 1 ? 1 : n * f(n-1) }
function g(n) { return n <= 1 ? 1 : n*n + g(n-1) }
id(f)(3) + id(g)(4) // 36
