

function drawGaaph(data){
    simulateForceLayout(data.nodes, data.links, -50);
    const svg = d3.select('body').select('#clmn2').append("svg");
    svg
        .attr("id", 'container')
        .attr("width", width)
        .attr("height", height);

    var fisheye = d3.fisheye.circular()
        .radius(200)
        .distortion(5);
    

    var node = svg.append("g");
    node
        .selectAll("circle")
        .data(data.nodes)
        .enter().append("circle")
        .attr("r", function (d) { return d.projects.length; })
        .attr("cx", function (d) { return d.x; })
        .attr("cy", function (d) { return d.y; })
        .attr("fill", function (d) { return 'black;' })

    var link = svg.append("g");
    link    
        .selectAll("line")
        .data(data.links)
        .enter().append("line")
        .attr("x1", function (d) { return d.source.x; })
        .attr("y1", function (d) { return d.source.y; })
        .attr("x2", function (d) { return d.target.x; })
        .attr("y2", function (d) { return d.target.y; })
        .attr("stroke", function (d) { return 'black'; })
        .attr("stroke-opacity", function (d) { return 0.2; })

        
    svg.on("mousemove", function () {
        fisheye.focus(d3.mouse(this));
        svg.selectAll("circle").each(function (d) { d.fisheye = fisheye(d); });

        node.selectAll("circle")
            .attr("cx", function (d) { return d.fisheye.x; })
            .attr("cy", function (d) { return d.fisheye.y; })
            .attr("r", function (d) { return d.fisheye.z * d.projects.length; });

        link.selectAll("line")
            .attr("x1", function (d) { return d.source.fisheye.x; })
            .attr("y1", function (d) { return d.source.fisheye.y; })
            .attr("x2", function (d) { return d.target.fisheye.x; })
            .attr("y2", function (d) { return d.target.fisheye.y; });
    });

}