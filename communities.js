


var N_NODES=40,
  N_GROUPS=6,
  P_IN = 0.5,
  P_OUT = 0.1,ITER=0,
  COMM_MODE=false, off=15, hull, hullg

function handleClick(event){
                draw(document.getElementById("myVal").value)
                return false;
            }

  function draw(val){
      N_GROUPS=val
      restart()
  }

var  nodes = [],
  links = [];

function random_range(min, max) {
      return Math.round((Math.random() * (max - min) + min) * 100)/100;
  }

function random_int(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function gen_nodes(){

    nodes=[]
    for(var i=0;i < N_NODES;i++){
      nodes.push({id:i+(ITER*N_NODES),group:random_int(0,N_GROUPS)})
    }
    ITER+=1
}

function gen_links(){
  links=[]
  for(var i=0;i<N_NODES;i++){
    for(var j=i+1;j<N_NODES;j++){
      rng = Math.random()
      if(nodes[i].group==nodes[j].group){
        if(rng <= P_IN){links.push({source:nodes[i],target:nodes[j]})}}
      else{
        if(rng <= P_OUT){links.push({source:nodes[i],target:nodes[j]})}}
    }
  }
}

var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    color = d3.scaleSequential(d3.interpolateCool);

var curve = d3.line().curve(d3.curveCardinalClosed);


// set up force
var simulation = d3.forceSimulation(nodes)
    .force("charge", d3.forceManyBody().strength(-400))
    .force("link", d3.forceLink(links).distance(function(l, i) {

      if(!COMM_MODE) return 1; else{
    var n1 = l.source, n2 = l.target;
  return n1.lou_group != n2.lou_group ? 100 : 1;

  }}))
    .force("x", d3.forceX())
    .force("y", d3.forceY())
    .alphaTarget(1);

var g = svg.append("g").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")"),
    link = g.append("g").attr("stroke", "#b5b5b5").attr("stroke-width", 1.0).selectAll(".link"),
    node = g.append("g").attr("stroke", "#fff").attr("stroke-width", 1.5).selectAll(".node")

hullg = g.append("g")

restart();


// random resets
d3.interval(function() {
P_IN = random_range(0.5,1)
P_OUT = random_range(0,0.3)

restart();

}, 15000, d3.now());

function drawCluster(d) {
  //console.log(d.path)
  return curve(d.path); // 0.8
}

function getGroup(n) { if (COMM_MODE) return n.lou_group; else return 0 }

function getCommunities(){
  var community = jLouvain().nodes(nodes.map(function(a) {return a.id;})).
            edges(links.map(function(a) {return {source: a.source.id, target: a.target.id}}));
  var community_assignment_result = community();
  for(i in nodes){
    nodes[i].lou_group = community_assignment_result[nodes[i].id]
  }
}

function restart() {

  gen_nodes()
  gen_links()
  getCommunities()

  // Apply the general update pattern to the nodes.
  node = node.data(nodes, function(d) { return d.id;});
  node.exit().remove();
  node = node.enter().append("circle").attr("fill", function(d) { return color(d.group); }).attr("r", 8).merge(node);


  // Apply the general update pattern to the links.
  link = link.data(links, function(d) { return d.source.id + "-" + d.target.id; });
  link.exit().remove();
  link = link.enter().append("line").merge(link);

  hullg.selectAll("path.hull").remove();
  hull = hullg.selectAll("path.hull")
      .data(convexHulls(nodes, getGroup, off))
      .enter().append("path")
      .attr("class", "hull")
      .attr("d", drawCluster)
      .style("fill", function(d) { return color(d.group); })
      .on("click", function(d) {
        COMM_MODE=!COMM_MODE
       restart();
    });

  // Update and restart the simulation.
  simulation.nodes(nodes);

  simulation.on("tick", ticked);
  simulation.force("link").links(links);
  simulation.alpha(1).restart();

  svg.selectAll('text').remove();
  // probability text
  svg.append("text")
  .style("fill", "black")
      .attr("x", width)
      .attr("y", 10)
      .attr("text-anchor", "end")
      .style('font-family','sans-serif')
      .style('font-size','12px')
      .text("P(Connection Within) = "+P_IN+"; P(Connection Between)="+P_OUT);

  }

function convexHulls(nodes, index, offset) {
  var hulls = {};

  // create point sets
  for (var k=0; k<nodes.length; ++k) {
    var n = nodes[k];
    if (n.size) continue;
    var i = getGroup(n),
        l = hulls[i] || (hulls[i] = []);
    l.push([n.x-offset, n.y-offset]);
    l.push([n.x-offset, n.y+offset]);
    l.push([n.x+offset, n.y-offset]);
    l.push([n.x+offset, n.y+offset]);
  }

  // create convex hulls
  var hullset = [];
  for (i in hulls) {
    hullset.push({group: i,
      path: d3.polygonHull(hulls[i])});
  }

  return hullset;
}

function ticked() {
  node.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })

      if (!hull.empty()) {
        hull.data(convexHulls(nodes, getGroup, off))
            .attr("d", drawCluster)
      }

  link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });
}
