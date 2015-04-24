"use strict";

function TreeNode(value, left, right)
{
  this.value = value;
  this.left = left;
  this.right = right;
}  
  
  /**
   * Construct a subtree with the specified number of levels.
   * We recursively call the constructor to create the tree.
   * @param levels the number of levels in the subtree
   **/
TreeNode.levels =
  function (levels)
  {
    var value = 1;
    var left;
    var right;
    if (levels <= 1) {
      if (levels <= 0) 
  throw new Error("Number of levels must be positive no.");
      left = null;
      right = null;
    } else {
      left = TreeNode.levels(levels - 1);
      right = TreeNode.levels(levels - 1);
    }
    return new TreeNode(value, left, right);
  }

  /**
   * Set the children of the tree
   * @param l the left child
   * @param r the right child
   **/
TreeNode.prototype.setChildren =
  function (l, r)
  {
    this.left = l;
    this.right = r;
  }

  /**
   * Create a tree with the given number of levels.
   * @param levels the number of levels in the tree
   **/
TreeNode.createTree =
  function (levels)
  {
    if (levels == 0) {
      return null;
    } else {
      var n = new TreeNode(1, null, null);
      n.left = TreeNode.createTree(levels - 1);
      n.right = TreeNode.createTree(levels - 1);
      return n;
    }
  }

  /**
   * Add the value of this node with the cumulative values
   * of the children of this node.
   * @return the cumulative value of this tree.
   **/
  TreeNode.prototype.addTree =
    function ()
    {
      var total = this.value;
      if (this.left != null) total += this.left.addTree();
      if (this.right != null) total += this.right.addTree();
      return total;
    }
  
  
  
    /**
     * The number of levels in the tree.
     **/
    var levels = 0;
    /**
     * Set to true to print the final result.
     **/
    var printResult = false;
    /**
     * Set to true to print informative messages
     **/
    var printMsgs = false;

    /**
     * The main routine which creates a tree and traverses it.
     * @param args the arguments to the program
     **/
    function main(args)
    {
      parseCmdLine(args);
      
      var start0 = performance.now();
      var root = TreeNode.levels(levels);
      var end0 = performance.now();
      
      var start1 = performance.now();
      var result = root.addTree();
      var end1 = performance.now();

      if (printResult || printMsgs) 
        print("Received results of " + result);

      if (printMsgs) {
        print("Treeadd alloc time " + (end0 - start0)/1000.0);
        print("Treeadd add time " + (end1 - start1)/1000.0);
        print("Treeadd total time " + (end1 - start0)/1000.0);
      }
      print("Done!");
    }

    /**
     * Parse the command line options.
     * @param args the command line options.
     **/
    function parseCmdLine(args)
    {
      var i = 0;
      var arg;

      while (i < args.length && args[i].startsWith("-")) {
        arg = args[i++];

        if (arg === "-l") {
    if (i < args.length) {
      levels = parseInt(args[i++], 10);
    } else throw new Error("-l requires the number of levels");
        } else if (arg === "-p") {
    printResult = true;
        } else if (arg === "-m") {
    printMsgs = true;
        } else if (arg === "-h") {
    usage();
        }
      }
      if (levels == 0) usage();
    }

    /**
     * The usage routine which describes the program options.
     **/
    function usage()
    {
      print("usage: java TreeAdd -l <levels> [-p] [-m] [-h]");
      print("    -l the number of levels in the tree");
      print("    -m (print informative messages)");
      print("    -p (print the result>)");
      print("    -h (this message)");
    }

  
  
/////
  
  
main(["-l", 5]);
  
