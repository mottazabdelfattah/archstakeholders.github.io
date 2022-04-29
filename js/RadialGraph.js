function GetRadialGraph(){
    d3.json("data/20220209_Players-Clean.json").then(function(data){ 
        
        //console.log(data)


        // prepare player projects bimodal graph
        let bimodal_nodes = [];
        let player_project_links = [];

        let sortedNodes = data.nodes.sort(PlayersSortFn);

        sortedNodes.forEach(function(n, i) {
            let radius = diameter / 2.0;
            let fixedPos = GetPlayerFixedPosition(i, sortedNodes.length, radius, width / 2.0, height / 2.0);
            
            let playernode = {
                id:'plyr'+n.id, 
                type: PLAYER_NODE_TYPE, 
                degree: n.projects.length, 
                palyer_role:n.type,
                fx:fixedPos[0],
                fy:fixedPos[1],
                angle: GetPlayerRotationAngle(fixedPos[0], fixedPos[1])
            };
            bimodal_nodes.push(playernode);


            n.projects.forEach(function(pId){
                let prjct_id = 'prjct'+pId;
                let prjct_type = PROJECT_NODE_TYPE;
                
                // lookup the project
                let projectnode = bimodal_nodes.find(obj => { 
                    return (obj.id === prjct_id && obj.type === prjct_type); 
                });

                if(typeof projectnode == 'undefined'){
                    projectnode = {id:prjct_id, type: prjct_type, degree: 0, angle:0};
                    bimodal_nodes.push(projectnode);
                }

                // degree increament
                projectnode.degree = projectnode.degree+1;
                
                // add links
                player_project_links.push({
                    source: playernode.id,
                    target: projectnode.id
                });
                
            });
            
            
        });


        
        



        let nodes = bimodal_nodes;
        let links = player_project_links;


        
        const svg = d3.select('body').append("svg");
        svg
        .attr("id",'container')
        .attr("width", width)
        .attr("height", height);

        var simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink().id(function(d) { return d.id; }))
        .force("charge", d3.forceManyBody().strength(-10))
        .force("forceX", d3.forceX(width / 2) )
        .force("forceY", d3.forceY(height / 2) )
        //.stop();


        simulation.force("link")
            .links(links);
        
        for (var i = 0; i < 300; ++i){
            simulation.tick();	
        } 

        var link = svg.append("g")
            .selectAll("line")
            .data(links)
            .enter().append("line")
            .attr("x1", function (d) {return d.source.x;})
            .attr("y1", function (d) {return d.source.y;})
            .attr("x2", function (d) {return d.target.x;})
            .attr("y2", function (d) {return d.target.y;})
            .attr("stroke", function (d) { return 'black'; })
            .attr("stroke-opacity", function (d) { return 0.2; })
            //.attr("opacity", function (d) { return d.hasOwnProperty('opacity') ? d.opacity : 1.0; })
            //.attr("stroke-width", function (d) { return stroke_width; });

        
        var g = svg.append("g");

        g
            .selectAll("circle")
            .data(nodes)
            .enter().append("circle")
            //.filter(function(d) { return (d.id=='plyr455'|| d.id=='plyr449' || d.id=='plyr441') })
            .attr("r", NODE_SIZE)
            .attr("cx", function (d) {return d.x;})
            .attr("cy", function (d) {return d.y;})
            .attr("stroke-width", 0.5)
            .attr("fill", function (d) { return d.type==PROJECT_NODE_TYPE? 'black' : d3.schemeCategory10[ROLES.indexOf(d.palyer_role)]; })
            .attr("stroke", function (d) { return "#fff"; })
            //.attr("stroke-opacity", function (d) { return d.hasOwnProperty('opacity') ? d.opacity : 1.0; })
            //.attr("opacity", function (d) { return d.hasOwnProperty('opacity') ? d.opacity : 1.0; })
        
            // g
            // .selectAll("text")
            // .data(nodes)
            // .enter().append("text")
            //     .attr("dx", function(d) { return d.x-(NODE_SIZE/2); })
            //     .attr("dy", function(d) { return d.y+(NODE_SIZE/2); })
            //     .text(function(d){return d.id;})
            //     //.attr("transform", function(d) { return "rotate("+d.angle+")"; }) 
            //     //.style("stroke", function(d){return d.strokeColor;})
            //     //.style("fill", function(d){return d.strokeColor;})
            //     //.style("stroke-width", "0.2px")
            //     .style("font-size" , "8px");

    
    });

    
}

