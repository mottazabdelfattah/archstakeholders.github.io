function LookUpProject(pId, project_nodes){
    let prjct_id = pId;
    let prjct_type = PROJECT_NODE_TYPE;
    
    // lookup the project
    let projectnode = project_nodes.find(obj => { 
        return (obj.id === prjct_id && obj.type === prjct_type); 
    });

    if(typeof projectnode == 'undefined'){
        projectnode = {id:prjct_id, type: prjct_type, players: [], label:'prjct'+ prjct_id};
        project_nodes.push(projectnode);
    }

     

    return projectnode;
}


function GetGraphObj(data){
    
        
    
    // prepare graph
    let plyrs_nodes = [];
    let plyrs_links = [];
    let project_nodes = [];
    let project_links = [];
    let plyrs_nodes_by_country = [];
    let plyrs_links_by_country = [];

    let project_players_nodes = [];
    let player_projects_nodes = [];
    let player_projects_nodes_by_country = [];

    let countryRepNodes =[];
    let countryRepLinks =[];


    data.nodes.forEach(function(n, i) {
        n.label = n.name;     //add label prop.
        plyrs_nodes.push(n);    

        // add one representative node for each country
        let countryRep = countryRepNodes.find(function(o){ return o.id === n.country});
        if(typeof countryRep == 'undefined'){
            countryRep = {id:n.country};
            countryRepNodes.push(countryRep);
        }
        // link each player node to the respective country rep.
        countryRepLinks.push(
            {source: countryRep.id,target: n.id},
            {source: n.id,target: countryRep.id},
            {source: n.id,target: countryRep.id}
        );

        let playerProjects = n.projects;
        for(let i = 0; i < playerProjects.length; i++){
            let projectI = LookUpProject(playerProjects[i], project_nodes);
            projectI.players.push(n.id);    // assign player to project
            for(let j = i+1; j < playerProjects.length; j++){
                let projectJ = LookUpProject(playerProjects[j], project_nodes);                    
                project_links.push({
                    source: projectI.id,
                    target: projectJ.id,
                    connector_id: n.id,
                });
            }
        }
        
    });


    data.links.forEach(function(lnk) {
        lnk.projects.forEach(function(prjctID){
            let link_obj = {
                source: lnk.source,
                target: lnk.target,
                connector_id: prjctID,
            };
            plyrs_links.push(link_obj);
        });
    });


    // set palyer node size:
    let max_projects_per_player = Math.max.apply(Math, plyrs_nodes.map(function(p) { return p.projects.length; }))
    plyrs_nodes.forEach(function(n) {
        n.size = normalize(MIN_PROJECT_NODE_SIZE, MAX_PROJECT_NODE_SIZE, 1, max_projects_per_player, n.projects.length);
        n.icon_size = n.size*2.0;
        n.outline_size = n.size * (OUTLINE_SIZE_RATIO);
        n.fill = d3.schemeCategory10[ROLES.indexOf(n.type)];
        n.opacity = 0.8;
    });

    

    // set project node size:
    let max_no_players_per_project = Math.max.apply(Math, project_nodes.map(function(p) { return p.players.length; }))
    project_nodes.forEach(function(n) {
        n.size = n.icon_size = normalize(MIN_PROJECT_NODE_SIZE, MAX_PROJECT_NODE_SIZE, 1, max_no_players_per_project, n.players.length);
        n.fill = 'white';
    });
    

    // clone plyrs_nodes and plyrs_links into plyrs_nodes_by_country and plyrs_links_by_country before running the simulation
    plyrs_nodes.forEach(function(obj){ plyrs_nodes_by_country.push(JSON.parse(JSON.stringify(obj)))}); 
    plyrs_links.forEach(function(obj){ plyrs_links_by_country.push(JSON.parse(JSON.stringify(obj)))}); 


    // run force directed simulation
    simulateForceLayout(project_nodes, project_links, -80);
    simulateForceLayout(plyrs_nodes, plyrs_links, -50);
    simulateForceLayout(plyrs_nodes_by_country.concat(countryRepNodes), plyrs_links_by_country.concat(countryRepLinks), -50);


    // initialize fish eye prop.
    project_nodes.forEach(function(n){n.fisheye = {x : n.x, y : n.y, z : 1.0}});
    plyrs_nodes.forEach(function(n){n.fisheye = {x : n.x, y : n.y, z : 1.0}});
    plyrs_nodes_by_country.forEach(function(n){n.fisheye = {x : n.x, y : n.y, z : 1.0}});


    // prepare player-projects nodes
    for(let i=0; i < plyrs_nodes.length; i++){
        player_projects_nodes.push(...GetPlayersProjectsNodes(plyrs_nodes[i], project_nodes, plyrs_nodes));
    }


    // prepare player-projects nodes grp by country
    for(let i=0; i < plyrs_nodes_by_country.length; i++){
        player_projects_nodes_by_country.push(...GetPlayersProjectsNodes(plyrs_nodes_by_country[i], project_nodes, plyrs_nodes_by_country));
    }


    // prepare project-players nodes
    for(let i=0; i < project_nodes.length; i++){
        project_players_nodes.push(...GetProjectPlayersNodes(project_nodes[i], plyrs_nodes, project_nodes, false));
    }
    
    let gObj = {};
    gObj.project_nodes = project_nodes;
    gObj.project_links = project_links;
    gObj.plyrs_nodes = plyrs_nodes;
    gObj.plyrs_links = plyrs_links;
    gObj.plyrs_nodes_by_country = plyrs_nodes_by_country;
    gObj.plyrs_links_by_country = plyrs_links_by_country;
    gObj.project_players_nodes = project_players_nodes;
    gObj.player_projects_nodes = player_projects_nodes;
    gObj.player_projects_nodes_by_country = player_projects_nodes_by_country;
    return gObj;



}
function RedrawNLGraph(svg, gType, selected_enc, graphObj){
    svg.selectAll("*").remove();

    // register fisheye
    var fisheye = d3.fisheye.circular()
            .radius(200)
            .distortion(5);

    addDropShadowDef(svg);
    
    svg.on("mousemove", function () {
        fisheye.focus(d3.mouse(this));
        graphObj.project_nodes.forEach(function (d) { d.fisheye = fisheye(d); });
        graphObj.plyrs_nodes.forEach(function (d) { d.fisheye = fisheye(d); });
        graphObj.plyrs_nodes_by_country.forEach(function (d) { d.fisheye = fisheye(d); });
        
        setFisheyeCoordinates(graphObj.project_nodes, graphObj.project_players_nodes);
        setFisheyeCoordinates(graphObj.plyrs_nodes, graphObj.player_projects_nodes);
        setFisheyeCoordinates(graphObj.plyrs_nodes_by_country, graphObj.player_projects_nodes_by_country);
        
        RedrawNLGraph(svg, gType, selected_enc, graphObj);
    });

    if (gType == PROJECT_NL_GRAPH) {
        RedrawProjectsNLGraph(svg, selected_enc, graphObj);
    } else if (gType == PLAYER_NL_GRAPH) {
        RedrawPlayersNLGraph(svg, selected_enc, graphObj);
    } else{
        RedrawPlayersGrpByCountryNLGraph(svg, selected_enc, graphObj);
    }

    
    

    
}


function RedrawPlayersGrpByCountryNLGraph(svg, selected_enc, graphObj){
    let player_nodes = graphObj.plyrs_nodes_by_country;
    let plyrs_links = graphObj.plyrs_links_by_country;
    let project_nodes = graphObj.player_projects_nodes_by_country;
    
    // draw rings
    var plyrSVGNodes = DrawPlayersNodes(svg, selected_enc, player_nodes);

    if(showContours)
        drawContours(svg, player_nodes);

    // draw nodes attached to the ring
    if(showRingConnectors)
        DrawProjectsNodes(svg, project_nodes);

    // draw links
    if(showLinks)
        DrawLinks(svg, plyrs_links, project_nodes, !showRingConnectors);

    
}

function RedrawPlayersNLGraph(svg, selected_enc, graphObj){
    let player_nodes = graphObj.plyrs_nodes;
    let plyrs_links = graphObj.plyrs_links;
    let project_nodes = graphObj.player_projects_nodes;
    
    // draw rings
    var plyrSVGNodes = DrawPlayersNodes(svg, selected_enc, player_nodes);

    // draw nodes attached to the ring
    if(showRingConnectors)
        DrawProjectsNodes(svg, project_nodes);

    // draw links
    if(showLinks)
        DrawLinks(svg, plyrs_links, project_nodes, !showRingConnectors);


    // labels
    //DrawRingLabels(plyrSVGNodes, player_nodes);
}

function RedrawProjectsNLGraph(svg, selected_enc, graphObj){
    
    let project_nodes = graphObj.project_nodes;
    let project_links = graphObj.project_links;
    let player_nodes = graphObj.project_players_nodes;

    // draw ring nodes
    var prjctSVGNodes = DrawProjectsNodes(svg, project_nodes);


    // draw nodes attached to the ring
    if(showRingConnectors)
        DrawPlayersNodes(svg, selected_enc, player_nodes);


    // draw links
    if(showLinks)
        DrawLinks(svg, project_links, player_nodes, !showRingConnectors);


    // labels
    if(showLabels)
        DrawRingLabels(prjctSVGNodes, project_nodes);


    

}

function DrawRingLabels(g, nodes){
    // draw labels for ring nodes
    
    g
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .attr("text-anchor", "middle")
        //.filter(function (d) { return d.size > 10; })
        .text(function (d) { return d.label; })
        .style("stroke", function (d) { return 'black'; })
        .style("stroke-width", "0.2px")
        .style("font-size", function (d) { return normalize(1, 7, MIN_PROJECT_NODE_SIZE, MAX_PROJECT_NODE_SIZE, d.size) * d.fisheye.z+'px'; })
        .attr("dx", function (d) { return d.fisheye.x })
        .attr("dy", function (d) { return d.fisheye.y })
}


function DrawProjectsNodes(svg, project_nodes){
 
    var prjctSVGNodes = svg.append("g");
    prjctSVGNodes
        .selectAll("circle")
        .data(project_nodes)
        .enter().append("circle")
        .attr("r", function (d) { return d.fisheye.z * d.size; })
        .attr("cx", function (d) { return d.fisheye.x; })
        .attr("cy", function (d) { return d.fisheye.y; })
        .attr("stroke-width", 1.0)
        .attr("fill", function (d) { return d.fill })
        .attr("stroke", function (d) { return "black"; })
        .attr("id", function (d) { return d.id; })
        .on("mouseover", function (d) {
            ShowTooltip(d.label);
        })
        .on("mouseout", function (d) {
            HideTooltip();
        });

        
    
    return prjctSVGNodes;
}


function DrawPlayersNodes(svg, selected_enc, player_nodes){
    // draw players nodes
    var plyrSVGNodes = svg.append("g")
        .selectAll("circle")
        .data(player_nodes)
        .enter()
        .append("g");

    
    if (selected_enc == COLOR_BY_COUNTRY) {

        plyrSVGNodes.append("image")
            .attr("xlink:href", function (d) { return 'flags\\1x1\\' + d.country.toLowerCase() + '.svg'; })
            .attr("clip-path", function (d) { return cropCircle(svg, d.id + "_" + d.parent_id, d.fisheye.x, d.fisheye.y, d.icon_size*d.fisheye.z); })
            .attr("x", function (d) { return d.fisheye.x - ((d.icon_size*d.fisheye.z) / 2.0); })
            .attr("y", function (d) { return d.fisheye.y - ((d.icon_size*d.fisheye.z) / 2.0); })
            .attr("width", function (d) { return (d.icon_size*d.fisheye.z); })
            .attr("height", function (d) { return (d.icon_size*d.fisheye.z); })
            .attr("plyr", function (d) { return d.name; })
            .attr("opacity", function (d) {  return d.opacity; })
            
    } 
    else if (selected_enc == COLOR_BY_ROLE) {
        plyrSVGNodes.append("circle")
            .attr("r", function (d) { return d.fisheye.z * d.size; })
            .attr("cx", function (d) { return d.fisheye.x;  })
            .attr("cy", function (d) { return d.fisheye.y; })
            .attr("stroke-width", 0.5)
            .attr("fill", function (d) { return d.fill; })
            .attr("stroke", function (d) { return "#fff"; })
            .attr("plyr", function (d) { return d.name; })
            .attr("opacity", function (d) {  return d.opacity; })

    }else if (selected_enc == COLOR_BY_BOTH) {
        plyrSVGNodes.append("circle")
            .attr("r", function (d) { 
                return d.outline_size*d.fisheye.z; 
            })
            .attr("cx", function (d) { return d.fisheye.x; })
            .attr("cy", function (d) { return d.fisheye.y; })
            .attr("stroke-width", 0.5)
            .attr("fill", function (d) { return d.fill; })
            .attr("opacity", function (d) {  return 0.5; })
            .attr("stroke", function (d) { return "#fff"; })
            .attr("plyr", function (d) { return d.name; })

        plyrSVGNodes.append("image")
            .attr("xlink:href", function (d) { return 'flags\\1x1\\' + d.country.toLowerCase() + '.svg'; })
            .attr("clip-path", function (d) { return cropCircle(svg, d.id + "_" + d.parent_id, d.fisheye.x, d.fisheye.y, (d.icon_size*d.fisheye.z)); })
            .attr("x", function (d) { return d.fisheye.x - ((d.icon_size*d.fisheye.z) / 2.0); })
            .attr("y", function (d) { return d.fisheye.y - ((d.icon_size*d.fisheye.z) / 2.0); })
            .attr("width", function (d) { return (d.icon_size*d.fisheye.z); })
            .attr("height", function (d) { return (d.icon_size*d.fisheye.z); })
            .attr("plyr", function (d) { return d.name; })
            .attr("opacity", function (d) {  return d.opacity; })
    }

    plyrSVGNodes.on("mouseover", function (d) {
        ShowTooltip(d.label);
        // let newIconSize = d.icon_size * 4;
        
        // d3.select(this).select('circle')
        //     .transition()
        //     .attr("r", function (d) { return 4*(selected_enc == COLOR_BY_ROLE? d.size: d.outline_size); })

        // d3.select(this).select('image')
        //     .transition()
        //     .attr("clip-path", function (d) { return cropCircle(svg, d.id + "_" + d.parent_id + "zoomed", d.x, d.y, newIconSize); })
        //     .attr("x", function (d) { return d.x - (newIconSize / 2.0); })
        //     .attr("y", function (d) { return d.y - (newIconSize / 2.0); })
        //     .attr("width", newIconSize)
        //     .attr("height", newIconSize)
        //     .attr("height", newIconSize)
    })
    .on("mouseout", function (d) {
        HideTooltip();
        // d3.select(this).select('circle')
        //     .transition()
        //     .attr("r", function (d) { return d.size; })
        // d3.select(this).select('image')
        //     .transition()
        //     .attr("clip-path", function (d) { return cropCircle(svg, d.id + "_" + d.parent_id, d.x, d.y, d.icon_size); })
        //     .attr("x", function (d) { return d.x - (d.icon_size / 2.0); })
        //     .attr("y", function (d) { return d.y - (d.icon_size / 2.0); })
        //     .attr("width", function (d) { return d.icon_size;})
        //     .attr("height", function (d) { return d.icon_size;})
    });


    if(showLabels){
        plyrSVGNodes
            .append("text")
            //.filter(function (d) { return d.size > 10; })
            .attr("text-anchor", "middle")
            .style("stroke", function (d) { return 'black'; })
            .style("stroke-width", "0.2px")
            .style("font-size", function (d) { return normalize(1, 7, MIN_PROJECT_NODE_SIZE, MAX_PROJECT_NODE_SIZE, d.size) * d.fisheye.z + 'px'; })
            .attr("dx", function (d) { return d.fisheye.x })
            .attr("dy", function (d) { return d.fisheye.y })
            //.style("filter", "url(#drop-shadow)")
            .text(function (d) { return truncate(d.label, 7); });
    }
    
   

    
    
    
    

    return plyrSVGNodes;
}

function DrawLinks(svg, links, nodes, isAggregated){

    //isAggregated when true the ring connectors are hidden and all links are connected to the ring center
    
    if(!isAggregated){
        svg.append("g")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("x1", function (d) { return nodes.find(obj => { return (obj.parent_id === d.source.id && obj.id === d.connector_id); }).fisheye.x; })
        .attr("y1", function (d) { return nodes.find(obj => { return (obj.parent_id === d.source.id && obj.id === d.connector_id); }).fisheye.y; })
        .attr("x2", function (d) { return nodes.find(obj => { return (obj.parent_id === d.target.id && obj.id === d.connector_id); }).fisheye.x; })
        .attr("y2", function (d) { return nodes.find(obj => { return (obj.parent_id === d.target.id && obj.id === d.connector_id); }).fisheye.y; })
        .attr("stroke", function (d) { return 'black'; })
        .attr("stroke-opacity", function (d) { return 0.2; })
    }else{
        svg.append("g")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("x1", function (d) { return d.source.fisheye.x; })
        .attr("y1", function (d) { return d.source.fisheye.y; })
        .attr("x2", function (d) { return d.target.fisheye.x; })
        .attr("y2", function (d) { return d.target.fisheye.y; })
        .attr("stroke", function (d) { return 'black'; })
        .attr("stroke-opacity", function (d) { return 0.2; })
    }
    
}

// adopted from: https://bl.ocks.org/XavierGimenez/a8e8c5e9aed71ba96bd52332682c0399
function drawContours(svg, nodes){
    // get country codes that have at least three nodes
    var countriesCodes = d3.set(nodes.map(function (n) { 
        return n.country; 
    })).values()
        .map(function (cId) {
            return {
                countryCode: cId,
                count: nodes.filter(function (n) { return n.country == cId; }).length
            };
        })
        .filter(function (country) { return country.count > 15; })
        .map(function (country) { return country.countryCode; });

    let groups = svg.append('g').attr('class', 'groups');
    let paths = groups.selectAll('.path_placeholder')
        .data(countriesCodes, function (d) { return d; })
        .enter()
        .append('g')
        .attr('class', 'path_placeholder')
        .append('path')
        .attr('opacity', 1);

        if(cntrFillStyle == FILL_CONTOUR_WITH_COLOR){
            paths
            .attr('stroke', function (d) { return d3.schemeCategory10[countriesCodes.indexOf(d)]; })
            .attr('fill', function (d) { return d3.schemeCategory10[countriesCodes.indexOf(d)]; })
        }else{
            paths
            .attr('stroke', function (d) { return getContourBackground(svg,  d, 'flags\\1x1\\' + d.toLowerCase() + '.svg') })
            .attr("fill", function (d) { return getContourBackground(svg,  d, 'flags\\1x1\\' + d.toLowerCase() + '.svg')})
        }
        
        
        
    updateGroups(countriesCodes, nodes, paths);
}


// select nodes of the group, retrieve its positions
// and return the convex hull of the specified points
// (3 points as minimum, otherwise returns null)
function polygonGenerator (country_code, nodes) {
    var node_coords = nodes
        .filter(function (d) { return d.country == country_code; })
        .map(function (d) { return [d.fisheye.x, d.fisheye.y]; });

    return d3.polygonHull(node_coords);
};


  
  
function updateGroups(groupIds, nodes, paths) {
    var valueline = d3.line()
      .x(function(d) { return d[0]; })
      .y(function(d) { return d[1]; })
      .curve(d3.curveCatmullRomClosed);
    var scaleFactor = 1.2;

    groupIds.forEach(function (groupId) {
        var path = paths.filter(function (d) { return d == groupId; })
            .attr('transform', 'scale(1) translate(0,0)')
            .attr('d', function (d) {
                polygon = polygonGenerator(d, nodes);
                centroid = d3.polygonCentroid(polygon);

                // to scale the shape properly around its points:
                // move the 'g' element to the centroid point, translate
                // all the path around the center of the 'g' and then
                // we can scale the 'g' element properly
                return valueline(
                    polygon.map(function (point) {
                        return [point[0] - centroid[0], point[1] - centroid[1]];
                    })
                );
            });

        d3.select(path.node().parentNode).attr('transform', 'translate(' + centroid[0] + ',' + (centroid[1]) + ') scale(' + scaleFactor + ')');
    });
}

function GetProjectPlayersNodes(prjct, allPlayers, project_nodes){
    let projectPlayersIDs = prjct.players;  // ids of the project players
    let projPlayersObjList = [];

    // initially, get all positions
    let free_positions = [];
    for(let i = 0; i < projectPlayersIDs.length; i++){
        free_positions.push(GetPlayerFixedPosition(i, projectPlayersIDs.length, prjct.size, prjct.x, prjct.y));
    }
        
    // get relevant player objects
    const filterArray = projectPlayersIDs
    const playersObjs = allPlayers.filter(({ id }) => filterArray.includes(id));

    // get player sorted by #projects (descending order)
    playersObjs.sort(plyr => plyr.projects.length);
    playersObjs.reverse();

    // for each player determine the best position
    for(let i = 0; i < playersObjs.length; i++){
        let plyr = playersObjs[i];
        let pos_lengths = [];   // avg link length associated with each pos
        for(let j = 0; j < free_positions.length; j++){
            // calculate avg link lengths per pos
            let posX = free_positions[j][0];
            let posY = free_positions[j][1];
            pos_lengths[j] = 0; 
            for(let k = 0; k < plyr.projects.length; k++){
                let prjct_id = plyr.projects[k];
                let projectnode = project_nodes.find(obj => { 
                    return (obj.id === prjct_id && obj.type === PROJECT_NODE_TYPE); 
                });
                pos_lengths[j] += GetLinkLength(posX, posY, projectnode.x, projectnode.y);
            }
            pos_lengths[j] /= plyr.projects.length; //avg
             
        }

        var best_pos_index = pos_lengths.indexOf(Math.min(...pos_lengths));
        
        // assign pos to player and add it to projPlayersObjList
        projPlayersObjList.push({
            id: plyr.id,
            name: plyr.name,
            label: plyr.label,
            type: plyr.type,
            country: plyr.country,
            x:free_positions[best_pos_index][0],
            y:free_positions[best_pos_index][1],
            fisheye : {
                x:free_positions[best_pos_index][0],
                y:free_positions[best_pos_index][1],
                z: 1.0,
            },
            parent_id: prjct.id,
            size : NODE_SIZE,
            icon_size: ICON_SIZE,
            outline_size: (ICON_SIZE/2.0) * (OUTLINE_SIZE_RATIO),
            fill: d3.schemeCategory10[ROLES.indexOf(plyr.type)],
            opacity:1.0,
        });
        

        // remove pos from free positions
        free_positions.splice(best_pos_index, 1); 

    }

    return projPlayersObjList;

}

function GetPlayersProjectsNodes(plyer, allProjects, plyer_nodes){
    let playerProjectsIDs = plyer.projects;  // ids of the projects associated with this player
    let plyrProjectsObjList = [];

    // initially, get all positions
    let free_positions = [];
    for(let i = 0; i < playerProjectsIDs.length; i++){
        let outline_width = Math.abs(plyer.size - plyer.icon_size/2.0)+ (ATTACHED_PROJECT_SIZE * 2);
        let si = plyer.icon_size/2.0 + (outline_width/2.0);
        free_positions.push(GetPlayerFixedPosition(i, playerProjectsIDs.length,si , plyer.x, plyer.y));
    }
        
    // get relevant project objects
    const filterArray = playerProjectsIDs
    const projectObjs = allProjects.filter(({ id }) => filterArray.includes(id));

    // get projects sorted by #players (descending order)
    projectObjs.sort(prjct => prjct.players.length);
    projectObjs.reverse();

    // for each player determine the best position
    for(let i = 0; i < projectObjs.length; i++){
        let prjct = projectObjs[i];
        let pos_lengths = [];   // avg link length associated with each pos
        for(let j = 0; j < free_positions.length; j++){
            // calculate avg link lengths per pos
            let posX = free_positions[j][0];
            let posY = free_positions[j][1];
            pos_lengths[j] = 0; 
            for(let k = 0; k < prjct.players.length; k++){
                let plyr_id = prjct.players[k];
                let plyernode = plyer_nodes.find(obj => { 
                    return (obj.id === plyr_id); 
                });
                pos_lengths[j] += GetLinkLength(posX, posY, plyernode.x, plyernode.y);
            }
            pos_lengths[j] /= prjct.players.length; //avg
             
        }

        var best_pos_index = pos_lengths.indexOf(Math.min(...pos_lengths));
        
        // assign pos to project and add it to plyrProjectsObjList
        plyrProjectsObjList.push({
            id: prjct.id,
            label: prjct.label,
            x:free_positions[best_pos_index][0],
            y:free_positions[best_pos_index][1],
            fisheye : {
                x:free_positions[best_pos_index][0],
                y:free_positions[best_pos_index][1],
                z: 1.0,
            },
            parent_id: plyer.id,
            size : ATTACHED_PROJECT_SIZE,
            icon_size: ICON_SIZE,
            fill: 'black',
        });
        

        // remove pos from free positions
        free_positions.splice(best_pos_index, 1); 

    }

    return plyrProjectsObjList;

}

// function simulateForceLayoutWithCountryRepNodes(nodes, links, countrynodes, countrylinks, strength){
//     var allNodes = nodes.concat(countrynodes); 
//     var allLinks = links.concat(countrylinks); 



//     var simulation = d3.forceSimulation(allNodes)
//         .force("link", d3.forceLink().id(function (d) { return d.id; }))
//         .force("charge", d3.forceManyBody().strength(strength))
//         .force("forceX", d3.forceX(width / 2))
//         .force("forceY", d3.forceY(height / 2))
//         .force("collide", d3.forceCollide().strength(1).radius((d) => d.size + (d.size / 2)).iterations(1))
//     //.stop();


//     simulation.force("link")
//         .links(allLinks);

//     for (var i = 0; i < 300; ++i) {
//         simulation.tick();
//     } 

   
// }
function simulateForceLayout(nodes, links, strength){
    
    var simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink().id(function (d) { return d.id; }))
        .force("charge", d3.forceManyBody().strength(strength))
        .force("forceX", d3.forceX(width / 2))
        .force("forceY", d3.forceY(height / 2))
        .force("collide", d3.forceCollide().strength(1).radius((d) => d.size + (d.size / 2)).iterations(1))
    //.stop();


    simulation.force("link")
        .links(links);

    for (var i = 0; i < 300; ++i) {
        simulation.tick();
    } 

   

}



function GetLinkLength(x1, y1, x2, y2){
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function ShowTooltip(info){
    
    d3.select('#tooltipDiv').transition()		
        .duration(200)		
        .style("opacity", .9);		
    d3.select('#tooltipDiv').html(info)	
        .style("left", (d3.event.pageX) + "px")		
        .style("top", (d3.event.pageY) + "px");	
}

function HideTooltip(){
    
    d3.select('#tooltipDiv').transition()		
        .duration(500)		
        .style("opacity", 0);	
}

function cropCircle(svg, nId, x, y, r){
    let id = 'clipCircle'+nId;
    svg
	.append('clipPath')
    .attr('id', id)
    .append('circle')
	.attr('cx', x)
	.attr('cy', y)
	.attr('r', r/2)
    

    return 'url(#'+id+')';
}

function getContourBackground(svg, cId, url){
    let id = 'contourBackground'+cId;
    svg.append('defs')
        .append('pattern')
        .attr('id', id)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 100)
        .attr('height', 100)
        .append('svg:image')
        .attr('xlink:href', url)
        .attr("width", 100)
        .attr("height", 100)
        .attr("x", 0)
        .attr("y", 0);

    return 'url(#'+id+')';
}

function addDropShadowDef(svg){
    var dropShadowFilter = svg
        .append('defs')
        .append('svg:filter')
        .attr('id', 'drop-shadow')
        .attr('filterUnits', "userSpaceOnUse")
        .attr('width', '250%')
        .attr('height', '250%');
    dropShadowFilter.append('svg:feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('stdDeviation', 2)
        .attr('result', 'blur-out');
    dropShadowFilter.append('svg:feColorMatrix')
        .attr('in', 'blur-out')
        .attr('type', 'hueRotate')
        .attr('values', 180)
        .attr('result', 'color-out');
    dropShadowFilter.append('svg:feOffset')
        .attr('in', 'color-out')
        .attr('dx', 3)
        .attr('dy', 3)
        .attr('result', 'the-shadow');
    dropShadowFilter.append('svg:feBlend')
        .attr('in', 'SourceGraphic')
        .attr('in2', 'the-shadow')
        .attr('mode', 'normal');
}

function setFisheyeCoordinates(ringNodes, attachedNodes){
    // set fisheye coordinates 
    for(let i=0; i < attachedNodes.length; i++){
        let parentID = attachedNodes[i].parent_id;
        let obj = ringNodes.find(o => { return (o.id === parentID); });

        // get theta in radian
        let theta = Math.atan2(attachedNodes[i].y - obj.y, attachedNodes[i].x - obj.x);
        let newX = obj.fisheye.x + (obj.size * obj.fisheye.z) * Math.cos(theta);
        let newY = obj.fisheye.y + (obj.size * obj.fisheye.z) * Math.sin(theta);
        
        attachedNodes[i].fisheye.x = newX;
        attachedNodes[i].fisheye.y = newY;
        attachedNodes[i].fisheye.z = obj.fisheye.z;
    }

}