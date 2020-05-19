let directions = [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }];

function calculateAverageFitness(array, minslope, maxslope, min, max){
    let result = [];
    for(let v of array){
        result.push(calculateFitness(v, minslope, maxslope, min, max));
    }
    return Math.average(result);
}

function calculateFitness(value, minslope, maxslope, min, max){
    if(max == undefined){
        max = min;
        min = maxslope;
        maxslope = minslope;
    }
    if(value >= min && value <= max){
        return 1;
    }
    if(value < min){
        return Math.clamp(1 - (min - value) / minslope, 0, 1);
    }
    return Math.clamp(1 - (value - max) / maxslope, 0, 1);
}

function getStats(map, entities){
    let stats = {};
    for(let e of entities){
        stats[e] = [];
    }
    for(let y=0; y<map.length; y++){
        for(let x=0; x<map[y].length; x++){
            stats[map[y][x]].push({x:x, y:y});
        }
    }
    return stats;
}

function _floodFill(map, cmap, color, x, y, entities){
    let queue = [{x:x,y:y}];
    while(queue.length > 0){
        let current = queue.splice(0, 1)[0];
        let e = map[current.y][current.x];
        if (entities.indexOf(e) >= 0 && cmap[current.y][current.x] == -1){
            cmap[current.y][current.x] = color;
            for(let d of directions){
                let newloc = { x: current.x + d.x, y: current.y + d.y };
                if(newloc.x < 0 || newloc.x >= map[0].length || newloc.y < 0 || newloc.y >= map.length){
                    continue;
                }
                queue.push(newloc);
            }
        }
    }
}

function getRegions(stats, map, entities){
    let cmap = [];
    for(let y=0; y<map.length; y++){
        cmap.push([]);
        for(let x=0; x<map[y].length; x++){
            cmap[y].push(-1);
        }
    }
    let positions = [];
    for(let e of entities){
        positions = positions.concat(stats[e]);
    }
    let color = 0;
    for(let p of positions){
        if(cmap[p.y][p.x] == -1){
            _floodFill(map, cmap, color, p.x, p.y, entities);
            color += 1;
        }
    }
    let regions = [];
    for(let c=0; c<color; c++){
        regions.push([]);
    }
    for(let p of positions){
        regions[cmap[p.y][p.x]].push({x:p.x, y:p.y});
    }
    return regions;
}

function getDikjstra(map, x, y, entities){
    let dmap = [];
    for(let y=0; y<map.length; y++){
        dmap.push([]);
        for(let x=0; x<map[y].length; x++){
            dmap[y].push(-1);
        }
    }

    let queue = [{ x: x, y: y, dist: 0 }];
    while (queue.length > 0) {
        let current = queue.splice(0, 1)[0];
        let e = map[current.y][current.x];
        if (entities.indexOf(e) >= 0 && (dmap[current.y][current.x] == -1 || current.dist < dmap[current.y][current.x])) {
            dmap[current.y][current.x] = current.dist;
            for (let d of directions) {
                let newloc = { x: current.x + d.x, y: current.y + d.y, dist: current.dist + 1 };
                if (newloc.x < 0 || newloc.x >= map[0].length || newloc.y < 0 || newloc.y >= map.length) {
                    continue;
                }
                queue.push(newloc);
            }
        }
    }
    return dmap;
}

function _getFarLocation(region, dmap){
    let mp = region[0];
    for (let p of region){
        if(dmap[p.y][p.x] > dmap[mp.y][mp.x]){
            mp = p;
        }
    }
    return mp;
}

function getLongestPath(regions, map, entities){
    let maxValue = 0;
    for(let r of regions){
        Math.shuffle(r);
        let dmap = getDikjstra(map, r[0].x, r[0].y, entities);
        let mp = _getFarLocation(r, dmap);
        dmap = getDikjstra(map, mp.x, mp.y, entities);
        mp = _getFarLocation(r, dmap);
        if(dmap[mp.y][mp.x] > maxValue){
            maxValue = dmap[mp.y][mp.x];
        }
    }
    return maxValue;
}

function getShortestDistance(stats, map, start, exit, entities){
    start = stats[start];
    exit = stats[exit];
    let min = Number.MAX_VALUE;
    for(let s of start){
        let dmap = getDikjstra(map, s.x, s.y, entities);
        for(let e of exit){
            if(dmap[e.y][e.x] >= 0 && dmap[e.y][e.x] < min){
                min = dmap[e.y][e.x];
            }
        }
    }
    return min;
}

function getDifference(map1, map2){
    let result = 0;
    for(let y=0; y<map1.length; y++){
        for(let x=0; x<map1[y].length; x++){
            if(map1[y][x] != map2[y][x]) result += 1;
        }
    }
    return result / (map1.length * map1[0].length);
}

function getEvaluator(edict){
    let entityList = [];
    for (let e in edict) {
        entityList.push(e);
    }
    entityList.sort();
    let entityIndex = {};
    for(let i=0; i<entityList.length; i++){
        entityIndex[entityList[i]] = i;
    }
    let emtpyEntities = [];
    for (let i = 0; i < entityList.length; i++) {
        if (entityList[i] == "solid" || entityList[i] == "door") continue;
        emtpyEntities.push(entityIndex[entityList[i]]);
    }
    let entities = [];
    for (let i = 0; i < entityList.length; i++) {
        entities.push(i);
    }
    let sokoban = require('./libs/sokoban.js');
    return {
        getEvaluation: {
            'binary': function(marahel, sample, script){
                let results = {
                    "maps": [],
                    "changes": [],
                    "regions": [],
                    "dimensions": [],
                    "pathlength": []
                };
                marahel.initialize(script);
                for (let i = 0; i < sample; i++) {
                    let initMap = null;
                    let map = marahel.generate(true, function(afterMap){
                        if(initMap == null)
                            initMap = afterMap;
                    });
                    results["maps"].push(map);
                    results["changes"].push(getDifference(initMap, map));
                    let stats1 = getStats(initMap, entities);
                    let stats2 = getStats(map, entities)
                    let regions1 = getRegions(stats1, initMap, emtpyEntities);
                    let regions2 = getRegions(stats2, map, emtpyEntities);
                    results["regions"].push(regions2.length);
                    let longestPath1 = getLongestPath(regions1, initMap, emtpyEntities);
                    let longestPath2 = getLongestPath(regions2, map, emtpyEntities);
                    results["pathlength"].push((longestPath2 - longestPath1));
                }
                results["dimensions"] = [
                    calculateAverageFitness(results["regions"], 1, 10, 1, 1), 
                    calculateAverageFitness(results["pathlength"], 20, 20, Number.MAX_VALUE)];
                return results;
            },
            'zelda': function (marahel, sample, script){
                let results = {
                    "maps": [],
                    "changes": [],
                    "dimensions": [],
                    "regions": [],
                    "player": [],
                    "key": [],
                    "door": [],
                    "enemies": [],
                    "close": [],
                    "solution": []
                };
                marahel.initialize(script);
                for (let i = 0; i < sample; i++) {
                    let initMap = null;
                    let map = marahel.generate(true, function (afterMap) {
                        if (initMap == null)
                            initMap = afterMap;
                    });
                    results["maps"].push(map);
                    results["changes"].push(getDifference(initMap, map));
                    let stats = getStats(map, entities)
                    let regions = getRegions(stats, map, emtpyEntities);
                    results["regions"].push(regions.length);
                    results["player"].push(stats[entityIndex["player"]].length);
                    results["key"].push(stats[entityIndex["key"]].length);
                    results["door"].push(stats[entityIndex["door"]].length);
                    results["enemies"].push(stats[entityIndex["enemy"]].length);
                    if (stats[entityIndex["player"]].length == 1) {
                        let distance = getShortestDistance(stats, map, entityIndex["player"], entityIndex["enemy"], emtpyEntities);
                        if (distance <= 5){
                            results["close"].push(distance);
                        }
                        else{
                            results["close"].push(5);
                        }
                        if (stats[entityIndex["key"]].length == 1 && stats[entityIndex["door"]].length == 1){
                            let keyDist = getShortestDistance(stats, map, entityIndex["player"], entityIndex["key"], emtpyEntities);
                            let tempEmpty = emtpyEntities.concat([entityIndex["door"]]);
                            let doorDist = getShortestDistance(stats, map, entityIndex["key"], entityIndex["door"], tempEmpty);
                            if(keyDist < 10000 && doorDist < 10000){
                                results["solution"].push(keyDist + doorDist);
                            }
                            else{
                                results["solution"].push(0);
                            }
                        }
                        else{
                            results["solution"].push(0);
                        }
                    }
                    else{
                        results["close"].push(5);
                        results["solution"].push(0);
                    }
                }
                results["dimensions"] = [
                    // calculateAverageFitness(results["regions"], 10, 1, 1),
                    calculateAverageFitness(results["player"], 1, 10, 1, 1), 
                    calculateAverageFitness(results["key"], 1, 10, 1, 1), 
                    calculateAverageFitness(results["door"], 1, 10, 1, 1), 
                    calculateAverageFitness(results["enemies"], 2, 5, 2, 4), 
                    // calculateAverageFitness(results["close"], 5, 5, Number.MAX_VALUE),
                    calculateAverageFitness(results["solution"], 20, 20, Number.MAX_VALUE)];
                return results;
            },
            'sokoban': function (marahel, sample, script){
                let results = {
                    "maps": [],
                    "changes": [],
                    "dimensions": [],
                    "regions": [],
                    "player": [],
                    "target": [],
                    "crate": [],
                    "diff": [],
                    "solution": []
                };
                marahel.initialize(script);
                for (let i = 0; i < sample; i++) {
                    let initMap = null;
                    let map = marahel.generate(true, function (afterMap) {
                        if (initMap == null)
                            initMap = afterMap;
                    });
                    results["maps"].push(map);
                    results["changes"].push(getDifference(initMap, map));
                    let stats = getStats(map, entities)
                    let regions = getRegions(stats, map, emtpyEntities);
                    results["regions"].push(regions.length);
                    results["player"].push(stats[entityIndex["player"]].length);
                    results["crate"].push(stats[entityIndex["crate"]].length);
                    results["target"].push(stats[entityIndex["target"]].length);
                    results["diff"].push(Math.abs(stats[entityIndex["crate"]].length - stats[entityIndex["target"]].length));
                    if (stats[entityIndex["player"]].length == 1 && 
                        stats[entityIndex["crate"]].length > 0 && stats[entityIndex["crate"]].length == stats[entityIndex["target"]].length){
                        let state = new sokoban(null);
                        let sokobanMap = [[]];
                        for(let x=0; x<map[0].length +2; x++){
                            sokobanMap[sokobanMap.length - 1].push(entityIndex["solid"]);
                        }
                        for(let y=0; y<map.length; y++){
                            sokobanMap.push([]);
                            for(let x=0; x<map[y].length + 2; x++){
                                if(x == 0 || x == map[y].length + 1){
                                    sokobanMap[sokobanMap.length - 1].push(entityIndex["solid"]);
                                    continue;
                                }
                                sokobanMap[sokobanMap.length - 1].push(map[y][x-1]);
                            }
                        }
                        sokobanMap.push([]);
                        for (let x = 0; x < map[0].length + 2; x++) {
                            sokobanMap[sokobanMap.length - 1].push(entityIndex["solid"]);
                        }
                        state.initialize(sokobanMap);
                        let sol = sokoban.solveBFS(state.clone(), 10000);
                        if(sol.length <= 0){
                            sol = sokoban.solveAStar(state.clone(), 10000);
                        }
                        results["solution"].push(sol.length);
                    }
                    else{
                        results["solution"].push(0);
                    }
                }
                results["dimensions"] = [
                    // calculateAverageFitness(results["regions"], 5, 1, 1),
                    calculateAverageFitness(results["player"], 1, 10, 1, 1), 
                    calculateAverageFitness(results["crate"], 2, 5, 2, 4), 
                    // calculateAverageFitness(results["target"], 5, 2, 4),
                    calculateAverageFitness(results["diff"], 10, -Number.MAX_VALUE, 0), 
                    calculateAverageFitness(results["solution"], 20, 20, Number.MAX_VALUE)
                ];
                return results;
            }
        }
        
    }
}

module.exports = getEvaluator;