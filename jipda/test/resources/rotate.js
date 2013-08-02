function rotate(n, x, y, z)
{
  if (n === 0)
  {
    return x;
  }
  return rotate(n-1, y, z, x);
}

rotate(41, 5, true, "hallo");