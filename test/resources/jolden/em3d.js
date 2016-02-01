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

var numNodes = 2;
var numDegree = 1;
var numIter = 1;
var printResult = false;

function main() {
    var graph = BiGraph.create(numNodes, numDegree, printResult);
    for (var i = 0; i < numIter; i++) {
        graph.compute();
    }
    if (printResult)
        print(graph);
    print("Done!");
}

main();
