function cleanEstimator(estimator) {
    let parts = estimator.split(/\((.+)\)/);
    if (parts.length > 1) {
        let entities = parts[1].split("|");
        let unique = new Set();
        for (let e of entities) {
            unique.add(e.trim());
        }
        entities = "";
        for (let e of unique) {
            entities += e + "|";
        }
        entities = entities.slice(0, entities.length - 1);
        return parts[0].trim() + "(" + entities + ")";
    }
    return estimator;
}

function cleanCondition(condition) {
    if (condition.indexOf(/>=|<=|==|!=|>|</) >= 0){
        let symbol = condition.match(/>=|<=|==|!=|>|</)[0];
        const [left, right] = condition.split(/>=|<=|==|!=|>|</);
        let clean_left = cleanEstimator(left);
        let clean_right = cleanEstimator(right);
        return clean_left + symbol + clean_right;
    }
    return cleanEstimator(condition);
}

function cleanExecuter(executer) {
    let parts = executer.split(/\((.+)\)/);
    let entities = parts[1].split("|");
    let unique_count = {};
    for (let e of entities) {
        if (!(e.trim() in unique_count)) {
            unique_count[e.trim()] = 0;
        }
        unique_count[e.trim()] += 1;
    }
    entities = "";
    let single_value = Object.keys(unique_count).length;
    for (let e in unique_count) {
        if (unique_count[e] > 1 && single_value > 1) {
            entities += e + ":" + unique_count[e] + "|";
        }
        else {
            entities += e + "|";
        }
    }
    entities = entities.slice(0, entities.length - 1);
    return parts[0].trim() + "(" + entities + ")";
}

function cleanRules(rules) {
    let unique_rules = new Set();
    for (let r of rules) {
        let sides = r.split("->");

        let conditions = sides[0].split(",");
        let unique_conds = new Set();
        for (let c of conditions) {
            var tokens = c.split(new RegExp(['==', '!=', '>=', '<=', '>', '<'].join('|'), 'g'));
            if(tokens.length > 1 && tokens[0].trim() == tokens[1].trim()){
                continue;
            }
            unique_conds.add(cleanCondition(c));
        }
        let clean_conditions = "";
        for (let c of unique_conds){
            clean_conditions += c + ",";
        }
        clean_conditions = clean_conditions.slice(0, clean_conditions.length - 1);

        let executers = sides[1].split(",");
        let unique_execs = new Set();
        for (let e of executers) {
            unique_execs.add(cleanExecuter(e));
        }
        let clean_executers = "";
        for (let e of unique_execs){
            clean_executers += e + ",";
        }
        clean_executers = clean_executers.slice(0, clean_executers.length - 1);

        unique_rules.add(clean_conditions + " -> " + clean_executers);
    }
    let results = [];
    for(let r of unique_rules){
        results.push(r);
    }
    return results;
}

function cleanExplorer(tracery, json, sequence) {
    let grammar = tracery.createGrammar(json);
    let script = grammar.flattenSequence("#origin#", sequence);
    let result = JSON.parse(script);
    switch (result.type) {
        case "horiz":
            delete result["parameters"]["dirprob"];
            delete result["parameters"]["directions"];
            delete result["parameters"]["entities"];
            delete result["parameters"]["heuristics"];
            break;
        case "vert":
            delete result["parameters"]["dirprob"];
            delete result["parameters"]["directions"];
            delete result["parameters"]["entities"];
            delete result["parameters"]["heuristics"];
            break;
        case "random":
            delete result["parameters"]["dirprob"];
            delete result["parameters"]["directions"];
            delete result["parameters"]["entities"];
            delete result["parameters"]["heuristics"];
            break;
        case "digger":
            delete result["parameters"]["entities"];
            delete result["parameters"]["heuristics"];
            break;
        case "connect":
            delete result["parameters"]["dirprob"];
            delete result["parameters"]["heuristics"];
            break;
        case "greedy":
            delete result["parameters"]["dirprob"];
            delete result["parameters"]["entities"];
            break;
        case "wide":
            delete result["parameters"]["dirprob"];
            delete result["parameters"]["directions"];
            delete result["parameters"]["entities"];
            break;
        case "rorder":
            delete result["parameters"]["dirprob"];
            delete result["parameters"]["directions"];
            delete result["parameters"]["entities"];
            delete result["parameters"]["heuristics"];
            break;
    }
    if("heuristics" in result["parameters"]){
        let heuristics = result["parameters"]["heuristics"].split(",");
        let unique_heur = new Set();
        for (let h of heuristics) {
            unique_heur.add(cleanCondition(h));
        }
        let clean_heur = "";
        for (let h of unique_heur) {
            clean_heur += h + ",";
        }
        clean_heur = clean_heur.slice(0, clean_heur.length - 1);
        result["parameters"]["heuristics"] = clean_heur;
    }
    result["rules"] = cleanRules(result["rules"]);
    return result;
}

function createExecuter(json, tracery, map_size, edict){
    let entityList = [];
    let entities = "";
    for(let e in edict){
        entities += e + ":" + edict[e] + "|";
        entityList.push(e);
    }
    entityList.sort();
    entities = entities.slice(0, entities.length - 1);
    let init_explorer = {
        "type": "horz",
        "region": "map",
        "rules": [
            "self(any) -> self(" + entities + ")"
        ]
    }
    let script = {
        "metadata":{
            "min": map_size,
            "max": map_size
        },
        "entities": entityList,
        "neighborhoods": {
            "allnc": "111,121,111",
            "plusnc": "010,121,010",
            "horzl": "000,131,000",
            "vertl": "010,030,010",
            "diag": "101,030,101",
            "diagnc": "101,020,101",
            "allfive": "11111,11111,11311,11111,11111",
            "plusfive": "00100,00100,11311,00100,00100",
            "diagfive": "10001,01010,00300,01010,10001"
        },
        "explorers":[]
    };
    let executer = {
        getScript: function(sequence, size){
            let temp = Math.randomFloat();
            Math.seed(sequence[0]);
            let n_explorers = sequence[1] % 4 + 2;
            script["explorers"] = [init_explorer];
            for(let i=0; i<n_explorers; i++){
                let seq = sequence.slice(2+i*size, 2+(i+1)*size);
                script["explorers"].push(cleanExplorer(tracery, json, seq));
            }
            Math.seed(temp);
            return script;
        }
    };
    return executer;
}

module.exports = createExecuter;