var w = window.innerWidth;
var h = window.innerHeight;

var focus_node = null,
  highlight_node = null

var text_center = true;
var outline = false;

var min_score = 0;
var max_score = 1;

var highlight_color = "blue";
var highlight_trans = 0.1;

var size = d3.scale.pow().exponent(1)
  .domain([1,100])
  .range([8,24]);

var force = d3.layout.force()
  .charge(-1500)
  .linkDistance(100)
  .size([w,h])
  // .friction(0.5)
  // .gravity(0.05)


var default_node_color = "#ccc";
var default_link_color = "#888";
var nominal_base_node_size = 30;
var nominal_text_size = 10;
var max_text_size = 24;
var nominal_stroke = 1.5;
var max_stroke = 4.5;
var max_base_node_size = 36;

var min_zoom = 0.1;
var max_zoom = 7;
var svg = d3.select("#map").append("svg");
var zoom = d3.behavior.
  zoom().
  scaleExtent([min_zoom, max_zoom])
var g = svg.append("g");

svg.style("cursor", "move");

// Define the div for the tooltip
var legend = d3.select("#legend")

d3.json("graph.json", function(error, graph) {

  var linkedByIndex = {};
  var edges = graph.links.map(function(link) {
    var sourceNode = graph.nodes.filter(function(n) {
      return n.id === link.source;
    })[0];

    var targetNode = graph.nodes.filter(function(n) {
      return n.id === link.target;
    })[0];

    linkedByIndex[sourceNode.id + "," + targetNode.id] = true;

    return {
      source: sourceNode,
      target: targetNode,
      type: link.type
    }
  });

  function isConnected(a, b) {
    return linkedByIndex[a.id + "," + b.id] || linkedByIndex[b.id + "," + a.id] || a.id == b.id;
  }

  force
    .nodes(graph.nodes)
    .links(edges)
    .linkStrength(function(l, i) { return l.type == "relative" ? 0.35 : 1; })
    .start();

  var link = g.selectAll(".link")
    .data(edges)
    .enter()
    .append("line")
    .attr("class", function(d) { return "link " + (d.type || "") })
    .style("stroke-width", nominal_stroke)
    .style("stroke", default_link_color)

  var node = g.selectAll(".node")
    .data(graph.nodes)
    .enter()
    .append("g")
    .attr("class", "node")
    // .call(force.drag)

  // node.on("dblclick.zoom", function(d) { d3.event.stopPropagation();
  //   var dcx = (window.innerWidth/2-d.x*zoom.scale());
  //   var dcy = (window.innerHeight/2-d.y*zoom.scale());
  //   zoom.translate([dcx,dcy]);
  //   g.attr("transform", "translate("+ dcx + "," + dcy  + ")scale(" + zoom.scale() + ")");
  // });

  var circle = node
    .append("circle")
    .attr("r", 30)
    .style("fill", "#fff")

  node.append("image")
    .attr("href",  function(d) { if (d.img) { return baseUrl + "/assets/" + d.img; } })
    .attr("x", function(d) { return -20;})
    .attr("y", function(d) { return -20;})
    .attr("height", 40)
    .attr("width", 40);

  var text = g.selectAll(".text")
    .data(graph.nodes)
    .enter()
    .append("text")
    .attr("dy", ".35em")
    .style("font-size", nominal_text_size + "px")

  if (text_center)
    text.text(function(d) { if (!d.img) { return d.name || d.id; } })
      .style("text-anchor", "middle");
  else
    text.attr("dx", function(d) {return (size(d.size)|| nominal_base_node_size);})
      .text(function(d) { return d.name || d.id; });

  node.on("mouseover", function(d) {
    set_highlight(d);

  })
  .on("mouseout", function(d) {
    exit_highlight();
  })
  .on("mousedown", function(d) {
    var link = '';
    if (d.href) { link = '<p><a href="' + d.href + '">' + d.href + '</a></p>' }

    var html = '<h2>' + (d.name || d.id) + '</h2>'
      + link
      + (d.description || '');
    legend.html(html);
    d3.event.stopPropagation();
    focus_node = d;
    set_focus(d)
    if (highlight_node === null) set_highlight(d)
  });

  d3.select(window).on("mouseup", function() {
    if (focus_node!==null) {
      focus_node = null;
      if (highlight_trans<1) {
        circle.style("opacity", 1);
        text.style("opacity", 1);
        link.style("opacity", 1);
      }
    }
    if (highlight_node === null) exit_highlight();
  });

  function exit_highlight() {
    highlight_node = null;
    if (focus_node === null) {
      svg.style("cursor", "move");
      circle.style("stroke", "white");
      link.style("stroke", default_link_color);
    }
  }

  function set_focus(d) {
    if (highlight_trans<1)  {
      circle.style("opacity", function(o) {
        return isConnected(d, o) ? 1 : highlight_trans;
      });

      text.style("opacity", function(o) {
        return isConnected(d, o) ? 1 : highlight_trans;
      });

      link.style("opacity", function(o) {
        return o.source.index == d.index || o.target.index == d.index ? 1 : highlight_trans;
      });
    }
  }

  function set_highlight(d) {
    svg.style("cursor", "pointer");
    if (focus_node!==null) d = focus_node;
    highlight_node = d;

    if (highlight_color!="white") {
      circle.style("stroke", function(o) {
        return isConnected(d, o) ? highlight_color : "white";});
      link.style("stroke", function(o) {
        return o.source.index == d.index || o.target.index == d.index ? highlight_color : default_link_color;
      });
    }
  }

  zoom.on("zoom", function() {
    g.attr("transform", "translate(" + d3.event.translate + ")scale(1)");
  });

  svg.call(zoom);
  resize();
  // d3.select(window).on("resize", resize);

  force.on("tick", function() {
    node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    text.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

    link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

    node.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
  });

  function resize() {
    var width = window.innerWidth,
      height = window.innerHeight;

    svg.attr("width", width).attr("height", height);

    force.size([force.size()[0]+(width-w)/zoom.scale(),force.size()[1]+(height-h)/zoom.scale()]).resume();
    w = width;
    h = height;
  }
});
