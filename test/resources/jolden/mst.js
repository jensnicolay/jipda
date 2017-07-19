var vertices = 0;
var printResult = false;
var printMsgs = false;

var __NOEFF__vindex = 0;

function Vertex(n, numvert) {
    this.mindist = 9999999;
    this.next = n;
    this.neighbors = [];
    this.index = __NOEFF__vindex++;
}

Vertex.prototype.setMindist =
    function (m) {
        this.mindist = m;
    }

Vertex.prototype.setNext =
    function (v) {
        this.next = v;
    }

function Graph(numvert) {
    this.nodes = [];
    var v = null;
    for (var i = numvert-1; i >= 0; i--) {
        this.nodes[i] = new Vertex(v, numvert);
        v = this.nodes[i];
    }
    this.addEdges(numvert);
}

Graph.CONST_m1 = 10000;
Graph.CONST_b = 31415821;
Graph.RANGE = 2048;

Graph.prototype.createGraph =
    function (numvert) {
        this.nodes = [];
        var v = null;
        for (var i = numvert-1; i >= 0; i--) {
            nodes[i] = new Vertex(v, numvert);
            v = nodes[i];
        }
        this.addEdges(numVert);
    }

Graph.prototype.firstNode =
    function () {
        return this.nodes[0];
    }

var counter = 0;
Graph.prototype.addEdges =
    function (numvert) {
        var count1 = 0;
        for (var tmp = this.nodes[0]; tmp != null; tmp = tmp.next) {
            var hash = tmp.neighbors;
            for (var i = 0; i < numvert; i++) {
                if (i != count1) {
                    var dist = this.computeDist(i, count1, numvert);
                    hash[this.nodes[i].index] = dist;
                }
            }
            count1++;
        }
    }

Graph.prototype.computeDist =
    function (i, j, numvert) {
        var less, gt;
        if (i < j) {
            less = i; gt = j;
        } else {
            less = j; gt = i;
        }
        return (this.random(less * numvert + gt) % this.RANGE) + 1;
    }

Graph.prototype.mult =
    function (p, q) {
        var p1, p0, q1, q0;

        p1 = Math.floor(p / this.CONST_m1);
        p0 = p % this.CONST_m1
        q1 = Math.floor(q / this.CONST_m1);
        q0 = q % this.CONST_m1;
        return (((p0*q1+p1*q0) % this.CONST_m1)*this.CONST_m1+p0*q0);
    }

Graph.prototype.random =
    function (seed) {
        return this.mult(seed, this.CONST_b) + 1;
    }

function BlueReturn() {
    this.vert = null;
    this.dist = null;
}

BlueReturn.prototype.setVert =
    function (v) {
        this.vert = v;
    }

BlueReturn.prototype.setDist =
    function (d) {
        this.dist = d;
    }

function main(args) {
    parseCmdLine(args)

    if (printMsgs)
        print("Making graph of size " + vertices);
    var start0 = performance.now();
    var graph = new Graph(vertices);
    var end0 = performance.now();

    if (printMsgs)
        print("About to compute MST");
    var start1 = performance.now();
    var dist = computeMST(graph, vertices);
    var end1 = performance.now();

    if (printResult || printMsgs)
        print("MST has cost " + dist);

    if (printMsgs) {
        print("Build graph time " + (end0 - start0)/1000.0);
        print("Compute time " + (end1 - start1)/1000.0);
        print("Total time " + (end1 - start0)/1000.0);
    }

    print("Done!");
}

var MyVertexList = null;
function computeMST(graph, numvert) {
    var cost = 0;

    var inserted = graph.firstNode();
    var tmp = inserted.next;
    MyVertexList = tmp;
    numvert--;

    while (numvert != 0) {
        var br = doAllBlueRule(inserted);
        inserted = br.vert;
        var dist = br.dist;
        numvert--;
        cost += dist;
    }
    return cost;
}

function BlueRule(inserted, vlist) {
    var retval = new BlueReturn();

    if (vlist == null) {
        retval.setDist(999999);
        return retval;
    }

    var prev = vlist;
    retval.setVert(vlist);
    retval.setDist(vlist.mindist);
    var hash = vlist.neighbors;
    var o = hash[inserted.index];
    if (o != null) {
        var dist = o;
        if (dist < retval.dist) {
            vlast.setMindist(dist);
            retval.setDist(dist);
        }
    } else
        print("Not found");

    var count = 0;
    for (var tmp = vlist.next; tmp != null; prev = tmp) {
        count++;
        if (tmp == inserted) {
            var next = tmp.next;
            prev.setNext(next);
        } else {
            hash = tmp.neighbors;
            var dist2 = tmp.mindist;
            o = hash[inserted.index];
            if (o != null) {
                var dist = o;
                if (dist < dist2) {
                    tmp.setMindist(dist);
                    dist2 = dist;
                }
            } else
                print("Not found");

            if (dist2 < retval.dist) {
                retval.setVert(tmp);
                retval.setDist(dist2);
            }
        }
        tmp = tmp.next // here because JIPDA doesn't handle sequence expressions
    }
    return retval;
}

function doAllBlueRule(inserted) {
    if (inserted == MyVertexList)
        MyVertexList = MyVertexList.next;
    return BlueRule(inserted, MyVertexList);
}

function parseCmdLine(args) {
    var i = 0;
    var arg;

    while (i < args.length && args[i].startsWith("-")) {
      arg = args[i++];

      if (arg === "-v") {
          if (i < args.length) {
              vertices = parseInt(args[i++], 10);
          } else throw new Error("-v requires the number of vertices");
      } else if (arg === "-p") {
          printResult = true;
      } else if (arg === "-m") {
          printMsgs = true;
      } else if (arg === "-h") {
          usage();
      }
    }
    if (vertices == 0) usage();
}

function usage() {
    print("usage: java MST -v <levels> [-p] [-m] [-h]");
    print("    -v the number of vertices in the graph");
    print("    -p (print the result>)");
    print("    -m (print informative messages)");
    print("    -h (this message)");
}

main(["-v", "64"]);
