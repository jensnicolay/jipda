function TreeNode(v, l ,r)
{
  this.v = v;
  this.l = l;
  this.r = r;
}

TreeNode.levels =
  function f(levels)
  {
    var value = 1;
    var left;
    var right;
    if (levels <= 1) {
      left = null;
      right = null;
    } else {
      left = TreeNode.levels(levels - 1);
      right = TreeNode.levels(levels - 1);
    }
    return new TreeNode(value, left, right);
  }

TreeNode.levels(3);