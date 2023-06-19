const fs = require("fs");
const jsdom = require("jsdom");
const graphviz = require("graphviz");
const minify = require("html-minifier").minify;


var isBrowser = (() => !(typeof process === "object"
                         && typeof process.versions === "object"
                         && typeof process.versions.node !== "undefined"))();

const createDoc = function (html) {
  const minifiedHtml = minify(html, {
    removeComments: true,
    collapseWhitespace: true,
  });

  if (!isBrowser) {
    const dom = new jsdom.JSDOM(html);
    return dom.window.document.body;
  } else{
    var container = document.createElement("html");
    container.innerHTML = html;
    return container;
  }
};

const htmlString = fs.readFileSync("./html.txt", "utf8");

const root = createDoc(htmlString);

// Create digraph G
var g = graphviz.digraph("G");

const dequeue = [];
const lookup = new Object();

// 第一趟循环添加ID
let cnt = 0;
dequeue.push(root);
while (dequeue.length > 0) {
  let len = dequeue.length;
  for (let i = 0; i < len; i++) {
    let node = dequeue.shift();
    node["nodeID"] = cnt.toString();
    let nodeGraphviz = g.addNode(node["nodeID"]);
    nodeGraphviz.set("shape", "box");
    lookup[node["nodeID"]] = nodeGraphviz;
    cnt += 1;

    for (let child of node.childNodes) {
      dequeue.push(child);
    }
  }
}

var nodeLabel = `
nodeID: {nodeID} <- {parentID}
nodeName: {nodeName}
nodeType: {nodeType}
nodeValue: {nodeValue}
data: {data}
`;

// 第一趟循环画图
dequeue.push(root);
while (dequeue.length > 0) {
  let len = dequeue.length;
  for (let i = 0; i < len; i++) {
    let node = dequeue.shift();
    let nodeGraphviz = lookup[node["nodeID"]];
    nodeGraphviz.set("label", (nodeLabel.replace(/\{nodeName\}/g, node["nodeName"])
                               .replace(/\{nodeType\}/g, node["nodeType"])
                               .replace(/\{nodeValue\}/g, node["nodeValue"] ? node["nodeValue"].replaceAll('"', "'") : node["nodeValue"])
                               .replace(/\{data\}/g,
                                        node["data"]
                                        ? node["data"].replaceAll('"', "'").replace(/\n/gm, "⮒").replace(/ /g, "·")
                                        : node["data"])
                               .replace(/\{nodeID\}/g, node["nodeID"])
                               .replace(/\{parentID\}/g, node["parentNode"] ? node["parentNode"]["nodeID"] : "?")
                              ));

    for (let child of node.childNodes) {
      g.addEdge(lookup[node["nodeID"]],
                lookup[child["nodeID"]]);
      dequeue.push(child);
    }
  }
}

fs.writeFile("./output.dot", g.to_dot(), function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The file was saved!");
});

g.output("pdf", "output.pdf");
