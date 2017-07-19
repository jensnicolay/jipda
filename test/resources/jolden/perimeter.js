"use strict";

function WhiteNode(quad, parent) {
    // should be: QuadTreeNode.call(this, quad, parent);
    this.quadrant = quad;
    this.nw = null;
    this.ne = null;
    this.sw = null;
    this.se = null;
    this.parent = parent;
    this.nodeType = "white"; // to avoid use of instanceof
}
WhiteNode.prototype = QuadTreeNode.prototype;
WhiteNode.prototype.constructor = WhiteNode;
WhiteNode.prototype.perimeter =
    function (size) {
        return 0;
    }
WhiteNode.prototype.sumAdjacent =
    function (quad1, quad2, size) {
        return size
    }

function GreyNode(quad, parent) {
    // should be: QuadTreeNode.call(this, quad, parent);
    this.quadrant = quad;
    this.nw = null;
    this.ne = null;
    this.sw = null;
    this.se = null;
    this.parent = parent;
    this.nodeType = "grey";
}
GreyNode.prototype = QuadTreeNode.prototype;
GreyNode.prototype.constructor = GreyNode;
GreyNode.prototype.perimeter =
    function (size) {
        size = Math.floor(size / 2);
        var retval = this.sw.perimeter(size);
        retval += this.se.perimeter(size);
        retval += this.ne.perimeter(size);
        retval += this.nw.perimeter(size);
        return retval;
    }
GreyNode.prototype.sumAdjacent =
    function (quad1, quad2, size) {
        var child1 = quad1.child(this);
        var child2 = quad2.child(this);
        size = Math.floor(size / 2);
        return child1.sumAdjacent(quad1, quad2, size) + child2.sumAdjacent(quad1, quad2, size);
    }


function BlackNode(quad, parent) {
    // should be: QuadTreeNode.call(this, quad, parent);
    this.quadrant = quad;
    this.nw = null;
    this.ne = null;
    this.sw = null;
    this.se = null;
    this.parent = parent;
    this.nodeType = "black";
}
BlackNode.prototype = QuadTreeNode.prototype;
BlackNode.prototype.constructor = BlackNode;
BlackNode.prototype.perimeter =
    function (size) {
        var retval = 0;
        var neighbor = this.gtEqualAdjNeighbor(QuadTreeNode.NORTH);
        if (neighbor == null || neighbor.nodeType === "white")
            retval += size;
        else if (neighbor.nodeType === "grey")
            retval += neighbor.sumAdjacent(Quadrant.cSouthEast, Quadrant.cSouthWest, size);

        neighbor = this.gtEqualAdjNeighbor(QuadTreeNode.EAST);
        if (neighbor == null || neighbor.nodeType === "white")
            retval += size;
        else if (neighbor.nodeType === "grey")
            retval += neighbor.sumAdjacent(Quadrant.cSouthWest, Quadrant.cNorthWest, size);

        neighbor = this.gtEqualAdjNeighbor(QuadTreeNode.SOUTH);
        if (neighbor == null || neighbor.nodeType === "white")
            retval += size;
        else if (neighbor.nodeType === "grey")
            retval += neighbor.sumAdjacent(Quadrant.cNorthWest, Quadrant.cNorthEast, size);

        neighbor = this.gtEqualAdjNeighbor(QuadTreeNode.WEST);
        if (neighbor == null || neighbor.nodeType === "white")
            retval += size;
        else if (neighbor.nodeType === "grey")
            retval += neighbor.sumAdjacent(Quadrant.cNorthEast, Quadrant.cSouthEast, size);

        return retval;
    }
BlackNode.prototype.sumAdjacent =
    function (quad1, qaud2, size) {
        return 0;
    }

function QuadTreeNode(quad, parent) {
    this.quadrant = quad;
    this.nw = null;
    this.ne = null;
    this.sw = null;
    this.se = null;
    this.parent = parent;
}
QuadTreeNode.gcmp = 4194304;
QuadTreeNode.lcmp = 1048576;
QuadTreeNode.NORTH = 0;
QuadTreeNode.EAST = 1;
QuadTreeNode.SOUTH = 2;
QuadTreeNode.WEST = 3;
QuadTreeNode.prototype.setChildren =
    function (nw, ne, sw, se) {
        this.nw = nw;
        this.ne = ne;
        this.sw = sw;
        this.se = se;
    }
QuadTreeNode.prototype.getNorthWest =
    function () {
        return this.nw;
    }
QuadTreeNode.prototype.getNorthEast =
    function () {
        return this.ne;
    }
QuadTreeNode.prototype.getSouthWest =
    function () {
        return this.sw;
    }
QuadTreeNode.prototype.getSouthEast =
    function () {
        return this.se;
    }
QuadTreeNode.createTree =
    function (size, center_x, center_y, parent, quadrant, level) {
        var node;
        var intersect = QuadTreeNode.checkIntersect(center_x, center_y, size);
        size = Math.floor(size/2);
        if (intersect == 0 && size < 512) {
            node = new WhiteNode(quadrant, parent);
        } else if (intersect == 2) {
            node = new BlackNode(quadrant, parent);
        } else {
            if (level == 0) {
                node = new BlackNode(quadrant, parent);
            } else {
                node = new GreyNode(quadrant, parent);
                var sw = QuadTreeNode.createTree(size, center_x-size, center_y-size, node, Quadrant.cSouthWest, level - 1);
                var se = QuadTreeNode.createTree(size, center_x+size, center_y-size, node, Quadrant.cSouthEast, level - 1);
                var ne = QuadTreeNode.createTree(size, center_x+size, center_y+size, node, Quadrant.cNorthEast, level - 1);
                var nw = QuadTreeNode.createTree(size, center_x-size, center_y+size, node, Quadrant.cNorthWest, level - 1);
                node.setChildren(nw, ne, sw, se);
            }
        }
        return node;
    }
QuadTreeNode.prototype.gtEqualAdjNeighbor =
    function (dir) {
        var q;
        if (this.parent != null && this.quadrant.adjacent(dir)) {
            q = this.parent.gtEqualAdjNeighbor(dir);
        } else {
            q = this.parent;
        }

        if (q != null && q.nodeType === "grey") {
            return this.quadrant.reflect(dir).child(q);
        } else {
            return q;
        }
    }
QuadTreeNode.prototype.countTree =
    function () {
        if (this.nw == null && this.ne == null && this.sw == null && this.se == null) {
            return 1;
        } else {
            return this.sw.countTree() + this.se.countTree() + this.ne.countTree() + this.nw.countTree();
        }
    }
QuadTreeNode.checkOutside =
    function (x, y) {
        var euclid = x*x+y*y;
        if (euclid > QuadTreeNode.gcmp) return 1;
        if (euclid < QuadTreeNode.lcmp) return -1;
        return 0;
    }
QuadTreeNode.checkIntersect =
    function (center_x, center_y, size) {
        if (QuadTreeNode.checkOutside(center_x+size, center_y+size) == 0 &&
            QuadTreeNode.checkOutside(center_x+size, center_y-size) == 0 &&
            QuadTreeNode.checkOutside(center_x-size, center_y-size) == 0 &&
            QuadTreeNode.checkOutside(center_x-size, center_y+size) == 0)
            return 2;

        var sum = QuadTreeNode.checkOutside(center_x+size, center_y+size) +
            QuadTreeNode.checkOutside(center_x+size, center_y-size) +
            QuadTreeNode.checkOutside(center_x-size, center_y-size) +
            QuadTreeNode.checkOutside(center_x-size, center_y+size);

        if ((sum==4) || (sum==-4)) return 0;

        return 1;
    }

function NorthWest() {}
NorthWest.prototype.adjacent =
    function (direction) {
        return (direction == QuadTreeNode.NORTH || direction == QuadTreeNode.WEST);
    }
NorthWest.prototype.reflect =
    function (direction) {
        if (direction == QuadTreeNode.WEST || direction == QuadTreeNode.EAST) {
            return Quadrant.cNorthEast;
        }
        return Quadrant.cSouthWest;
    }
NorthWest.prototype.child =
    function (node) {
        return node.getNorthWest();
    }

function NorthEast() {}
NorthEast.prototype.adjacent =
    function (direction) {
        return (direction == QuadTreeNode.NORTH || direction == QuadTreeNode.EAST);
    }
NorthEast.prototype.reflect =
    function (direction) {
        if (direction == QuadTreeNode.WEST || direction == QuadTreeNode.EAST) {
            return Quadrant.cNorthWest;
        }
        return Quadrant.cSouthEast;
    }
NorthEast.prototype.child =
    function (node) {
        return node.getNorthEast();
    }


function SouthWest() {}
SouthWest.prototype.adjacent =
    function (direction) {
        return (direction == QuadTreeNode.SOUTH || direction == QuadTreeNode.WEST);
    }
SouthWest.prototype.reflect =
    function (direction) {
        if (direction == QuadTreeNode.WEST || direction == QuadTreeNode.EAST) {
            return Quadrant.cSouthEast;
        }
        return Quadrant.cNorthWest;
    }
SouthWest.prototype.child =
    function (node) {
        return node.getSouthWest();
    }

function SouthEast() {}
SouthEast.prototype.adjacent =
    function (direction) {
        return (direction == QuadTreeNode.SOUTH || direction == QuadTreeNode.EAST);
    }
SouthEast.prototype.reflect =
    function (direction) {
        if (direction == QuadTreeNode.WEST || direction == QuadTreeNode.EAST) {
            return Quadrant.cSouthWest;
        }
        return Quadrant.cNorthEast;
    }
NorthEast.prototype.child =
    function (node) {
        return node.getSouthEast();
    }

function Quadrant() {}
Quadrant.cNorthWest = new NorthWest();
Quadrant.cNorthEast = new NorthEast();
Quadrant.cSouthWest = new SouthWest();
Quadrant.cSouthEast = new SouthEast();

var levels = 0;
var printResult = false;
var printMsgs = false;

function main(args) {
    parseCmdLine(args);

    var size = 1 << levels;
    var msize = 1 << (levels - 1);
    QuadTreeNode.gcmp = size * 1024;
    QuadTreeNode.lcmp = msize * 1024;

    var start0 = performance.now();
    var tree = QuadTreeNode.createTree(msize, 0, 0, null, Quadrant.cSouthEast, levels);
    var end0 = performance.now();

    var start1 = performance.now();
    var leaves = tree.countTree();
    var end1 = performance.now();

    var start2 = performance.now();
    var perm = tree.perimeter(size);
    var end2 = performance.now();

    if (printResult) {
        print("Perimeter is " + perm);
        print("Number of leaves " + leaves);
    }

    if (printMsgs) {
        print("QuadTree alloc time " + (end0 - start0)/1000.0);
        print("Count leaves time " + (end1 - start1)/1000.0);
        print("Perimeter compute time " + (end2 - start2)/1000.0);
    }
    print("Done!");
}

function parseCmdLine(args) {
    var i = 0;
    var arg;

    while (i < args.length && args[i].startsWith("-")) {
        arg = args[i++];

        if (arg === "-l") {
            if (i < args.length) {
                levels = parseInt(args[i++], 10);
            } else {
                throw new Error("-l requires the number of levels");
            }
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
function usage() {
    print("usage: java Perimeter -l <num> [-p] [-m] [-h]");
    print("    -l number of levels in the quadtree (image size = 2^l)");
    print("    -p (print the results)");
    print("    -m (print informative messages)");
    print("    -h (this message)");
}

main(["-l", "4"]);
