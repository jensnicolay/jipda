"use strict";

function Node(degree) {
    this.value = Math.random();
    this.toNodes = [];
    this.next = null;
    this.fromNodes = null;
    this.coeffs = null;
    this.fromCount = 0;
    this.fromLength = 0;
}

Node.fillTable =
    function (size, degree) {
        var table = [];
        var prevNode = new Node(degree);
        for (var i = 1; i < size; i++) {
            var curNode = new Node(degree);
            table.push(curNode);
            prevNode.next = curNode;
            prevNode = curNode;
        }
        return table;
    }

Node.prototype.makeUniqueNeighbors =
    function (nodeTable) {
        for (var filled = 0; filled < this.toNodes.length; filled++) {
            var k;
            var otherNode;

            do {
                var index = Math.round(Math.random() * 1000);
                if (index < 0) index = -index;
                index = index % nodeTable.length;

                otherNode = nodeTable[index];

                for (k = 0; k < filled; k++) {
                    if (otherNode == this.toNodes[filled]) break;
                }
            } while (k < filled);

            this.toNodes[filled] = otherNode
            otherNode.fromCount++;
        }
    }

Node.prototype.makeFromNodes =
    function () {
        this.fromNodes = [];
        this.coeffs = [];
    }

Node.prototype.updateFromNodes =
    function () {
        for (var i = 0; i < this.toNodes.length; i++) {
            var otherNode = this.toNodes[i];
            var count = otherNode.fromLength++;
            otherNode.fromNodes[count] = this;
            otherNode.coeffs[count] = Math.random();
        }
    }

Node.prototype.computeNewValue =
    function () {
        for (var i = 0; i < this.fromCount; i++) {
            this.value -= this.coeffs[i] * this.fromNodes[i].value;
        }
    }

Node.prototype.elements =
    function () {
        var result = [];
        for (var p = this; p != null; p = p.next) {
            result.push(p);
        }
        return result;
    }
Node.prototype.toString =
    function () {
        return "value " + this.value + ", from_count " + this.fromCount;
    }

function BiGraph(e, h) {
    this.eNodes = e;
    this.hNodes = h;
}

BiGraph.create =
    function (numNodes, numDegree, verbose) {
        if (verbose) print("making nodes (tables in orig. version)");
        var hTable = Node.fillTable(numNodes, numDegree);
        var eTable = Node.fillTable(numNodes, numDegree);

        var elements;

        if (verbose) print("updating from and coeffs");

        elements = hTable[0].elements();
        for (var i = 0; i < elements.length; i++) {
            var n = elements[i];
            n.makeUniqueNeighbors(hTable);
        }

        elements = eTable[0].elements();
        for (var i = 0; i < elements.length; i++) {
            var n = elements[i];
            n.makeUniqueNeighbors(hTable);
        }

        if (verbose) print("filling from fields");
        elements = hTable[0].elements();
        for (var i = 0; i < elements.length; i++) {
            var n = elements[i];
            n.makeFromNodes();
        }
        elements = eTable[0].elements();
        for (var i = 0; i < elements.length; i++) {
            var n = elements[i];
            n.makeFromNodes();
        }

        elements = hTable[0].elements();
        for (var i = 0; i < elements.length; i++) {
            var n = elements[i];
            n.updateFromNodes();
        }
        elements = eTable[0].elements();
        for (var i = 0; i < elements.length; i++) {
            var n = elements[i];
            n.updateFromNodes();
        }

        var g = new BiGraph(eTable[0], hTable[0]);
        return g;
    }

BiGraph.prototype.compute =
    function () {
        var elements;
        elements = this.eNodes.elements();
        for (var i = 0; i < elements.length; i++) {
            var n = elements[i];
            n.computeNewValue();
        }
        elements = this.hNodes.elements();
        for (var i = 0; i < elements.length; i++) {
            var n = elements[i];
            n.computeNewValue();
        }
    }
BiGraph.prototype.toString =
    function () {
        var retval = "";
        var elements = this.eNodes.elements();
        for (var i = 0; i < elements.length; i++) {
            var n = elements[i];
            retval += "E: " + n + "\n";
        }
        elements = this.hNodes.elements();
        for (var i = 0; i < elements.length; i++) {
            var n = elements[i];
            retval += "H: " + n + "\n";
        }
    }

var numNodes = 0;
var numDegree = 0;
var numIter = 1;
var printResult = false;
var printMsgs = false;
function main(args) {
    parseCmdLine(args);

    if (printMsgs)
        print("Iniializing em3d random graph...");

    var start0 = performance.now();
    var graph = BiGraph.create(numNodes, numDegree, printResult);
    var end0 = performance.now();

    if (printMsgs)
        print("Propagating field values for " + numIter + " iteration(s)...");
    var start1 = performance.now();
    for (var i = 0; i < numIter; i++) {
        graph.compute();
    }
    var end1 = performance.now();

    if (printResult)
        print(graph);

    if (printMsgs) {
        print("EM3D build time " + (end0 - start0)/1000.0);
        print("EM3D compute time " + (end1 - start1)/1000.0);
        print("EM3D total time " + (end1 - start0)/1000.0);
    }
    print("Done!");
}

function parseCmdLine(args) {
    var i = 0;
    var arg;

    while (i < args.length && args[i].startsWith("-")) {
        arg = args[i++];

        if (arg === "-n") {
            if (i < args.length) {
                numNodes = parseInt(args[i++], 10);
            } else throw new Error("-n requires the number of nodes");
        } else if (arg === "-d") {
            if (i < args.length) {
                numDegree = parseInt(args[i++], 10);
            } else throw new Error("-d requires the out degree");
        } else if (arg === "-i") {
            if (i < args.length) {
                numIter = parseInt(args[i++], 10);
            } else throw new Error("-i requires the number of iterations");
        } else if (arg === "-p") {
            printResult = true;
        } else if (arg === "-m") {
            printMsgs = true;
        } else if (arg === "-h") {
            usage();
        }
    }
    if (numNodes == 0 || numDegree == 0) usage();
}

function usage() {
    print("usage: java Em3d -n <nodes> -d <degree> [-p] [-m] [-h]");
    print("    -n the number of nodes");
    print("    -d the out-degree of each node");
    print("    -i the number of iterations");
    print("    -p (print detailed results)");
    print("    -m (print informative messages)");
    print("    -h (this message)");
}

main(["-n", "2", "-d", "1"]);
