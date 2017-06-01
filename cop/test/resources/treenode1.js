function TreeNode(l)
{
  var a = this;
  a.l = l;
}

TreeNode.levels =
  function f(levels)
  {
    var left;
    if (levels <= 1) {
      left = null;
    } else {
      left = TreeNode.levels(levels - 1);
    }
    return new TreeNode(left);
  }

TreeNode.levels(3);