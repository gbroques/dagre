var expect = require("./chai").expect;
var layout = require("..").layout;
var Graph = require("@dagrejs/graphlib").Graph;

describe("layout", () => {
  var g;

  beforeEach(() => {
    g = new Graph({ multigraph: true, compound: true })
      .setGraph({})
      .setDefaultEdgeLabel(() => ({}));
  });

  it("can layout a single node", () => {
    g.setNode("a", { width: 50, height: 100 });
    layout(g);
    expect(extractCoordinates(g)).to.eql({
      a: { x: 50 / 2, y: 100 / 2 }
    });
    expect(g.node("a").x).to.equal(50 / 2);
    expect(g.node("a").y).to.equal(100 / 2);
  });

  it("can layout two nodes on the same rank", () => {
    g.graph().nodesep = 200;
    g.setNode("a", { width: 50, height: 100 });
    g.setNode("b", { width: 75, height: 200 });
    layout(g);
    expect(extractCoordinates(g)).to.eql({
      a: { x: 50 / 2,            y: 200 / 2 },
      b: { x: 50 + 200 + 75 / 2, y: 200 / 2 }
    });
  });

  it("can layout two nodes connected by an edge", () => {
    g.graph().ranksep = 300;
    g.setNode("a", { width: 50, height: 100, rank: 0 });
    g.setNode("b", { width: 75, height: 200, rank: 2 });
    g.setEdge("a", "b");
    layout(g);
    expect(extractCoordinates(g)).to.eql({
      a: { x: 75 / 2, y: 100 / 2 },
      b: { x: 75 / 2, y: 100 + 300 + 200 / 2 }
    });

    // We should not get x, y coordinates if the edge has no label
    expect(g.edge("a", "b")).to.not.have.property("x");
    expect(g.edge("a", "b")).to.not.have.property("y");
  });

  it("can layout an edge with a label", () => {
    g.graph().ranksep = 300;
    g.setNode("a", { width: 50, height: 100, rank: 0 });
    g.setNode("b", { width: 75, height: 200, rank: 2 });
    g.setEdge("a", "b", { width: 60, height: 70, labelpos: "c" });
    layout(g);
    expect(extractCoordinates(g)).to.eql({
      a: { x: 75 / 2, y: 100 / 2 },
      b: { x: 75 / 2, y: 100 + 150 + 70 + 150 + 200 / 2 }
    });
    expect(g.edge("a", "b").x).eqls(75 / 2);
    expect(g.edge("a", "b").y).eqls(100  + 150 + 70 / 2 );
  });

  describe("can layout an edge with a long label, with rankdir =", () => {
    ["TB", "BT", "LR", "RL"].forEach(rankdir => {
      it(rankdir, () => {
        g.graph().nodesep = g.graph().edgesep = 10;
        g.graph().rankdir = rankdir;
        ["a", "b", "c", "d"].forEach((v, i) => {
          g.setNode(v, { width: 10, height: 10, rank: i * 2 });
        });
        g.setEdge("a", "c", { width: 2000, height: 10, labelpos: "c" });
        g.setEdge("b", "d", { width: 1, height: 1 });
        layout(g);

        var p1, p2;
        if (rankdir === "TB" || rankdir === "BT") {
          p1 = g.edge("a", "c");
          p2 = g.edge("b", "d");
        } else {
          p1 = g.node("a");
          p2 = g.node("c");
        }

        expect(Math.abs(p1.x - p2.x)).gt(1000);
      });
    });
  });

  describe("can apply an offset, with rankdir =", () => {
    ["TB", "BT", "LR", "RL"].forEach(rankdir => {
      it(rankdir, () => {
        g.graph().nodesep = g.graph().edgesep = 10;
        g.graph().rankdir = rankdir;
        ["a", "b", "c", "d"].forEach((v, i) => {
          g.setNode(v, { width: 10, height: 10, rank: i * 2 });
        });
        g.setEdge("a", "b", { width: 10, height: 10, labelpos: "l", labeloffset: 1000 });
        g.setEdge("c", "d", { width: 10, height: 10, labelpos: "r", labeloffset: 1000 });
        layout(g);

        if (rankdir === "TB" || rankdir === "BT") {
          expect(g.edge("a", "b").x - g.edge("a", "b").points[0].x).equals(-1000 - 10 / 2);
          expect(g.edge("c", "d").x - g.edge("c", "d").points[0].x).equals(1000 + 10 / 2);
        } else {
          expect(g.edge("a", "b").y - g.edge("a", "b").points[0].y).equals(-1000 - 10 / 2);
          expect(g.edge("c", "d").y - g.edge("c", "d").points[0].y).equals(1000 + 10 / 2);
        }
      });
    });
  });

  it("can layout a long edge with a label", () => {
    g.graph().ranksep = 300;
    g.setNode("a", { width: 50, height: 100, rank: 0 });
    g.setNode("b", { width: 75, height: 200, rank: 2 });
    g.setEdge("a", "b", { width: 60, height: 70, minlen: 2, labelpos: "c" });
    layout(g);
    expect(g.edge("a", "b").x).to.equal(75 / 2);
    expect(g.edge("a", "b").y)
      .to.be.gt(g.node("a").y)
      .to.be.lt(g.node("b").y);
  });

  it("adds rectangle intersects for edges", () => {
    g.graph().ranksep = 200;
    g.setNode("a", { width: 100, height: 100, rank: 0 });
    g.setNode("b", { width: 100, height: 100, rank: 2 });
    g.setEdge("a", "b");
    layout(g);
    var points = g.edge("a", "b").points;
    expect(points).to.have.length(3);
    expect(points).eqls([
      { x: 100 / 2, y: 100 },           // intersect with bottom of a
      { x: 100 / 2, y: 100 + 200 / 2 }, // point for edge label
      { x: 100 / 2, y: 100 + 200 }      // intersect with top of b
    ]);
  });

  it("adds rectangle intersects for edges spanning multiple ranks", () => {
    g.graph().ranksep = 200;
    g.setNode("a", { width: 100, height: 100, rank: 0 });
    g.setNode("b", { width: 100, height: 100, rank: 4 });
    g.setEdge("a", "b", { minlen: 2 });
    layout(g);
    var points = g.edge("a", "b").points;
    expect(points).to.have.length(5);
    expect(points).eqls([
      { x: 100 / 2, y: 100 },           // intersect with bottom of a
      { x: 100 / 2, y: 100 + 200 / 2 }, // bend #1
      { x: 100 / 2, y: 100 + 400 / 2 }, // point for edge label
      { x: 100 / 2, y: 100 + 600 / 2 }, // bend #2
      { x: 100 / 2, y: 100 + 800 / 2 }  // intersect with top of b
    ]);
  });

  it("adds dimensions to the graph", () => {
    g.setNode("a", { width: 100, height: 50 });
    layout(g);
    expect(g.graph().width).equals(100);
    expect(g.graph().height).equals(50);
  });

  describe("ensures all coordinates are in the bounding box for the graph", () => {
    ["TB", "BT", "LR", "RL"].forEach(rankdir => {
      describe(rankdir, () => {
        beforeEach(() => {
          g.graph().rankdir = rankdir;
        });

        it("node", () => {
          g.setNode("a", { width: 100, height: 200, rank: 0 });
          layout(g);
          expect(g.node("a").x).equals(100 / 2);
          expect(g.node("a").y).equals(200 / 2);
        });

        it("edge, labelpos = l", () => {
          g.setNode("a", { width: 100, height: 100, rank: 0 });
          g.setNode("b", { width: 100, height: 100, rank: 2 });
          g.setEdge("a", "b", {
            width: 1000, height: 2000, labelpos: "l", labeloffset: 0
          });
          layout(g);
          if (rankdir === "TB" || rankdir === "BT") {
            expect(g.edge("a", "b").x).equals(1000 / 2);
          } else {
            expect(g.edge("a", "b").y).equals(2000 / 2);
          }
        });
      });
    });
  });

  it("treats attributes with case-insensitivity", () => {
    g.graph().nodeSep = 200; // note the capital S
    g.setNode("a", { width: 50, height: 100 });
    g.setNode("b", { width: 75, height: 200 });
    layout(g);
    expect(extractCoordinates(g)).to.eql({
      a: { x: 50 / 2,            y: 200 / 2 },
      b: { x: 50 + 200 + 75 / 2, y: 200 / 2 }
    });
  });
});

function extractCoordinates(g) {
  var nodes = g.nodes();
  return nodes.reduce((acc, v) => {
    const node = g.node(v);
    acc[v] = { x: node.x, y: node.y };
    return acc;
  }, {});
}
