"use strict";

function Patient(v) {
    this.home = v;
    this.hospitalsVisited = 0;
    this.time = 0;
    this.timeLeft = 0;
}

function Hospital(level) {
    this.personnel = 1 << (level - 1);
    this.freePersonnel = this.personnel;
    this.numWaitingPatients = 0;
    this.waiting = new List();
    this.assess = new List();
    this.inside = new List();
    this.up = new List();
}

Hospital.prototype.putInHospital =
    function (p) {
        var num = p.hospitalsVisited;
        p.hospitalsVisited++;
        if (this.freePersonnel > 0) {
            this.freePersonnel--;
            this.assess.add(p);
            p.timeLeft = 3;
            p.time += 3;
        } else {
            this.waiting.add(p);
        }
    }

Hospital.prototype.checkPatientsInside =
    function (returned) {
        var elements = this.inside.elements();
        for (var i = 0; i < elements.length; i++) {
            var p = elements[i];
            p.timeLeft -= 1;
            if (p.timeLeft == 0) {
                this.freePersonnel++;
                this.inside.delete(p);
                returned.add(p);
            }
        }
    }

Hospital.prototype.checkPatientsAssess =
    function (v) {
        var up = new List();
        var elements = this.assess.elements();
        for (var i = 0; i < elements.length; i++) {
            var p = elements[i];
            p.timeLeft -= 1;
            if (p.timeLeft == 0) {
                if (v.staysHere()) {
                    this.assess.delete(p);
                    this.inside.add(p);
                    p.timeLeft = 10;
                    p.time += 10;
                } else {
                    this.freePersonnel++;
                    this.assess.delete(p);
                    this.up.add(p);
                }
            }
        }
        return up;
    }

Hospital.prototype.checkPatientsWaiting =
    function () {
        var elements = this.waiting.elements();
        for (var i = 0; i < elements.length; i++) {
            var p = elements[i];
            if (this.freePersonnel > 0) {
                this.freePersonnel--;
                p.timeLeft = 3;
                p.time += 3;
                this.waiting.delete(p);
                this.assess.add(p);
            } else {
                p.time++;
            }
        }
    }

function ListNode(o) {
    this.object = o;
    this.next = null;
}

function List() {
    this.head = null;
    this.tail = null;
}

List.prototype.add =
    function (p) {
        var node = new ListNode(p);
        if (this.head == null) {
            this.head = node;
        } else {
            this.tail.next = node;
        }
        this.tail = node;
    }

List.prototype.delete =
    function (o) {
        if (this.head == null) return;

        if (this.tail.object == o) {
            this.tail == null;
        }

        if (this.head.object == o) {
            this.head = this.head.next;
            return;
        }

        var p = this.head;
        for (var ln = this.head.next; ln != null; ln = ln.next) {
            if (ln.object == o) {
                p.next = ln.next;
                return;
            }
            p = ln;
        }
    }

List.prototype.elements =
    function () {
        var curNode = this.head;
        var result = [];
        while (curNode != null) {
            result.push(curNode.object);
            curNode = curNode.next;
        }
        return result;
    }

function Results() {
    this.totalPatients = 0;
    this.totalTime = 0;
    this.totalHospitals = 0;
}

function Village(level, l, p, s) {
    this.back = p;
    this.label = l;
    this.forward = [];
    this.seed = this.label * (this.IQ + s);
    this.hospital = new Hospital(level);
    this.returned = new List();
}

Village.IA   = 16807;
Village.IM   = 2147483647;
Village.AM   = 1.0/Village.IM;
Village.IQ   = 127773;
Village.IR   = 2836;
Village.MASK = 123459876;

Village.prototype.addVillage =
    function (i, c) {
        this.forward[i] = c;
    }

Village.prototype.staysHere =
    function () {
        var rand = Village.myRand(seed);
        seed = Math.round(rand * this.IM);
        return (rand > 0.1 || back == null);
    }

Village.createVillage =
    function createVillage(level, label, back, seed) {
        if (level == 0) {
            return null;
        } else {
            var village = new Village(level, label, back, seed);
            for (var i = 3; i >= 0; i--) {
                var child = this.createVillage(level - 1, (label * 4) + i + 1, village, seed);
                village.addVillage(i, child);
            }
            return village;
        }
    }

Village.prototype.simulate =
    function () {
        var val = [];
        for (var i = 3; i >= 0; i--) {
            var v = this.forward[i];
            if (v != null) {
                val[i] = v.simulate();
            }
        }

        for (var i = 3; i >= 0; i--) {
            var l = val[i];
            if (l != null) {
                var elements = l.elements();
                for (var i = 0; i < elements.length; i++) {
                    var p = elements[i];
                    this.hospital.putInHospital(p);
                }
            }
        }

        this.hospital.checkPatientsInside(this.returned);
        var up = this.hospital.checkPatientsAssess(this);
        this.hospital.checkPatientsWaiting();

        var p = this.generatePatient()
        if (p != null) {
            this.hospital.putInHospital(p);
        }

        return up;
    }

Village.prototype.getResults =
    function () {
        var fval = [];
        for (var i = 3; i >= 0; i--) {
            var v = this.forward[i];
            if (v != null) {
                fval[i] = v.getResults();
            }
        }

        var r = new Results();
        for (var i = 3; i >= 0; i--) {
            if (fval[i] != null) {
                r.totalHospitals += fval[i].totalHospitals;
                r.totalPatients += fval[i].totalPatients;
                r.totalTime += fval[i].totalTime;
            }
        }

        var elements = this.returned.elements();
        for (var i = 0; i < elements.length; i++) {
            var p = elements[i];
            r.totalHospitals += p.hospitalsVisited;
            r.totalTime += p.time;
            r.totalPatients += 1.0;
        }

        return r;
    }

Village.prototype.generatePatient =
    function () {
        var rand = Village.myRand(seed)
        this.seed = Math.round(rand * this.IM);
        var p = null;
        if (rand > 0.666) {
            p = new Patient(this);
        }
        return p;
    }

Village.myRand =
    function (idum) {
        idum = idum ^ this.MASK;
        var k = idum / this.IQ;
        idum = this.IA * (idum - k * this.IQ) - this.IR * k;
        idum = idum ^ this.MASK;
        if (idum < 0)
            idum += this.IM;
        var answer = this.AM * idum;
        return answer;
    }

var maxLevel = 0;
var maxTime = 0;
var seed = 0;
var printResult = false;
var printMsgs = false;

function main(args) {
    parseCmdLine(args);

    var start0 = performance.now();
    var top = Village.createVillage(maxLevel, 0, null, seed);
    var end0 = performance.now();

    if (printMsgs)
        print("Columbian Health Care Simulator\nWorking...");

    var start1 = performance.now();
    for (var i = 0; i < maxTime; i++) {
        if ((i % 50) == 0 && printMsgs) print(i);
        top.simulate();
    }

    var r = top.getResults();

    var end1 = performance.now();

    if (printResult || printMsgs) {
        print("# of people treated:            " + r.totalPatients + " people");
        print("Average length of stay:         " + r.totalTime / r.totalPatients + " time units");
        print("Average # of hospitals visited: " + r.totalHospitals / r.totalPatients);
    }
    if (printMsgs) {
        print("Build Time " + (end0 - start0)/1000.0);
        print("Run Time " + (end1 - start1)/1000.0);
        print("Total Time " + (end1 - start0)/1000.0);
    }

    print("Done!");
}

function parseCmdLine(args) {
    var arg;
    var i = 0;
    while (i < args.length && args[i].startsWith("-")) {
        arg = args[i++];

        if (arg === "-l") {
            if (i < args.length) {
                maxLevel = parseInt(args[i++], 10);
            } else throw new Error("-l requires the number of levels");
        } else if (arg === "-t") {
            if (i < args.length) {
                maxTime = parseInt(args[i++], 10);
            } else throw new Error("-t requires the amount of time");
        } else if (arg === "-s") {
            if (i < args.length) {
                seed = parseInt(args[i++], 10);
            } else throw new Error("-s requires a seed value");
        } else if (arg === "-p") {
            printResult = true;
        } else if (arg === "-m") {
            printMsgs = true;
        } else if (arg === "-h") {
            usage();
        }
    }
    if (maxTime == 0 || maxLevel == 0 || seed == 0) usage();
}

function usage() {
    print("usage: java Health -l <levels> -t <time> -s <seed> [-p] [-m] [-h]");
    print("    -l the size of the health care system");
    print("    -t the amount of simulation time");
    print("    -s a random no. generator seed");
    print("    -p (print results)");
    print("    -m (print information messages");
    print("    -h (this message)");
}

main(["-l", "2", "-t", "20", "-s", "1", "-m"])
