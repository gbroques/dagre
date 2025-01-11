/* eslint "no-console": off */

var expect = require("./chai").expect;
var Graph = require("@dagrejs/graphlib").Graph;
var util = require("../lib/util");

describe("util", () => {
  describe("simplify", () => {
    var g;

    beforeEach(() => g = new Graph({ multigraph: true }));

    it("copies without change a graph with no multi-edges", () => {
      g.setEdge("a", "b", { weight: 1, minlen: 1 });
      var g2 = util.simplify(g);
      expect(g2.edge("a", "b")).eql({ weight: 1, minlen: 1 });
      expect(g2.edgeCount()).equals(1);
    });

    it("collapses multi-edges", () => {
      g.setEdge("a", "b", { weight: 1, minlen: 1 });
      g.setEdge("a", "b", { weight: 2, minlen: 2 }, "multi");
      var g2 = util.simplify(g);
      expect(g2.isMultigraph()).to.be.false;
      expect(g2.edge("a", "b")).eql({ weight: 3, minlen: 2 });
      expect(g2.edgeCount()).equals(1);
    });

    it("copies the graph object", () => {
      g.setGraph({ foo: "bar" });
      var g2 = util.simplify(g);
      expect(g2.graph()).eqls({ foo: "bar" });
    });
  });

  describe("asNonCompoundGraph", () => {
    var g;

    beforeEach(() => g = new Graph({ compound: true, multigraph: true }));

    it("copies all nodes", () => {
      g.setNode("a", { foo: "bar" });
      g.setNode("b");
      var g2 = util.asNonCompoundGraph(g);
      expect(g2.node("a")).to.eql({ foo: "bar" });
      expect(g2.hasNode("b")).to.be.true;
    });

    it("copies all edges", () => {
      g.setEdge("a", "b", { foo: "bar" });
      g.setEdge("a", "b", { foo: "baz" }, "multi");
      var g2 = util.asNonCompoundGraph(g);
      expect(g2.edge("a", "b")).eqls({ foo: "bar" });
      expect(g2.edge("a", "b", "multi")).eqls({ foo: "baz" });
    });

    it("does not copy compound nodes", () => {
      g.setParent("a", "sg1");
      var g2 = util.asNonCompoundGraph(g);
      expect(g2.parent(g)).to.be.undefined;
      expect(g2.isCompound()).to.be.false;
    });

    it ("copies the graph object", () => {
      g.setGraph({ foo: "bar" });
      var g2 = util.asNonCompoundGraph(g);
      expect(g2.graph()).eqls({ foo: "bar" });
    });
  });

  describe("successorWeights", () => {
    it("maps a node to its successors with associated weights", () => {
      var g = new Graph({ multigraph: true });
      g.setEdge("a", "b", { weight: 2 });
      g.setEdge("b", "c", { weight: 1 });
      g.setEdge("b", "c", { weight: 2 }, "multi");
      g.setEdge("b", "d", { weight: 1 }, "multi");
      expect(util.successorWeights(g).a).to.eql({ b: 2 });
      expect(util.successorWeights(g).b).to.eql({ c: 3, d: 1 });
      expect(util.successorWeights(g).c).to.eql({});
      expect(util.successorWeights(g).d).to.eql({});
    });
  });

  describe("predecessorWeights", () => {
    it("maps a node to its predecessors with associated weights", () => {
      var g = new Graph({ multigraph: true });
      g.setEdge("a", "b", { weight: 2 });
      g.setEdge("b", "c", { weight: 1 });
      g.setEdge("b", "c", { weight: 2 }, "multi");
      g.setEdge("b", "d", { weight: 1 }, "multi");
      expect(util.predecessorWeights(g).a).to.eql({});
      expect(util.predecessorWeights(g).b).to.eql({ a: 2 });
      expect(util.predecessorWeights(g).c).to.eql({ b: 3 });
      expect(util.predecessorWeights(g).d).to.eql({ b: 1 });
    });
  });

  describe("intersectRect", () => {
    function expectIntersects(rect, point) {
      var cross = util.intersectRect(rect, point);
      if (cross.x !== point.x) {
        var m = (cross.y - point.y) / (cross.x - point.x);
        expect(cross.y - rect.y).equals(m * (cross.x - rect.x));
      }
    }

    function expectTouchesBorder(rect, point) {
      var cross = util.intersectRect(rect, point);
      if (Math.abs(rect.x - cross.x) !== rect.width / 2) {
        expect(Math.abs(rect.y - cross.y)).equals(rect.height / 2);
      }
    }

    it("creates a slope that will intersect the rectangle's center", () => {
      var rect = { x: 0, y: 0, width: 1, height: 1 };
      expectIntersects(rect, { x:  2, y:  6 });
      expectIntersects(rect, { x:  2, y: -6 });
      expectIntersects(rect, { x:  6, y:  2 });
      expectIntersects(rect, { x: -6, y:  2 });
      expectIntersects(rect, { x:  5, y:  0 });
      expectIntersects(rect, { x:  0, y:  5 });
    });

    it("touches the border of the rectangle", () => {
      var rect = { x: 0, y: 0, width: 1, height: 1 };
      expectTouchesBorder(rect, { x:  2, y:  6 });
      expectTouchesBorder(rect, { x:  2, y: -6 });
      expectTouchesBorder(rect, { x:  6, y:  2 });
      expectTouchesBorder(rect, { x: -6, y:  2 });
      expectTouchesBorder(rect, { x:  5, y:  0 });
      expectTouchesBorder(rect, { x:  0, y:  5 });
    });

    it("throws an error if the point is at the center of the rectangle", () => {
      var rect = { x: 0, y: 0, width: 1, height: 1 };
      expect(() => util.intersectRect(rect, { x: 0, y: 0 })).to.throw();
    });
  });

  describe("buildLayerMatrix", () => {
    it("creates a matrix based on rank and order of nodes in the graph", () => {
      var g = new Graph();
      g.setNode("a", { rank: 0, order: 0 });
      g.setNode("b", { rank: 0, order: 1 });
      g.setNode("c", { rank: 1, order: 0 });
      g.setNode("d", { rank: 1, order: 1 });
      g.setNode("e", { rank: 2, order: 0 });

      expect(util.buildLayerMatrix(g)).to.eql([
        ["a", "b"],
        ["c", "d"],
        ["e"]
      ]);
    });
  });

  describe("time", () => {
    var consoleLog;

    beforeEach(() => consoleLog = console.log);

    afterEach(() => console.log = consoleLog);

    it("logs timing information", () => {
      var capture = [];
      console.log = function() { capture.push(Array.from(arguments)[0]); };
      util.time("foo", function() {});
      expect(capture.length).to.equal(1);
      expect(capture[0]).to.match(/^foo time: .*ms/);
    });

    it("returns the value from the evaluated function", () => {
      console.log = function() {};
      expect(util.time("foo", () => "bar")).to.equal("bar");
    });
  });

  describe("range", () => {
    it("Builds an array to the limit", () => {
      const range = util.range(4);
      expect(range.length).equals(4);
      expect(range.reduce((acc, v) => acc + v)).equals(6);
    });

    it("Builds an array with a start", () => {
      const range = util.range(2, 4);
      expect(range.length).equals(2);
      expect(range.reduce((acc, v) => acc + v)).equals(5);
    });

    it("Builds an array with a negative step", () => {
      const range = util.range(5, -1, -1);
      expect(range[0]).equals(5);
      expect(range[5]).equals(0);
    });
  });

  describe("mapValues", () => {
    it("Creates an object with the same keys", () => {
      const users = {
        'fred':    { 'user': 'fred',    'age': 40 },
        'pebbles': { 'user': 'pebbles', 'age': 1 }
      };

      const ages = util.mapValues(users, user => user.age);
      expect(ages.fred).equals(40);
      expect(ages.pebbles).equals(1);
    });

    it("Can take a property name", () => {
      const users = {
        'fred':    { 'user': 'fred',    'age': 40 },
        'pebbles': { 'user': 'pebbles', 'age': 1 }
      };

      const ages = util.mapValues(users, 'age');
      expect(ages.fred).equals(40);
      expect(ages.pebbles).equals(1);
    });
  });
});
