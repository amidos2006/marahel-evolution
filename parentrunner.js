function checkChromosome(chromosomes){
    for (let i = 0; i < chromosomes.length; i++) {
        if (!fs.existsSync('./output/chromosome_' + i + ".json")) {
            return false;
        }
    }
    return true;
}

function readChromosome(chromosomes){
    for (let i = 0; i < chromosomes.length; i++) {
        let c = chromosomes[i];
        let chJSON = JSON.parse(fs.readFileSync('./output/chromosome_' + i + '.json'));
        c.initializeChromosome(chJSON);
    }
}

function writeChromosome(chromosomes){
    for (let i = 0; i < chromosomes.length; i++) {
        let c = chromosomes[i];
        let chJSON = JSON.stringify(c.getJSON(), null, "\t");
        fs.writeFileSync('./input/chromosome_' + i + '.json', chJSON);
    }
}

function deleteChromosome(chromosomes){
    for (let i = 0; i < chromosomes.length; i++) {
        fs.unlinkSync('./output/chromosome_' + i + '.json');
    }
}

function saveMap(map, iteration){
    let cells = map._getCells();
    fs.mkdirSync("./result/map_" + iteration + "/");
    for(let c of cells){
        let key = map._getStringKey(c.getDimensions(), parameters["mapGranularity"]);
        fs.mkdirSync("./result/map_" + iteration + "/" + key + "/");
        fs.writeFileSync("./result/map_" + iteration + "/" + key + "/elite.json", 
            JSON.stringify(c.getChromosome().getJSON(), null, "\t"));
        fs.writeFileSync("./result/map_" + iteration + "/" + key + "/elite-script.json",
            JSON.stringify(c.getChromosome()._getScript(), null, "\t"));
    }
}

function savePopulation(algo, iteration){
    let pop = algo._population;
    fs.mkdirSync("./result/gen_" + iteration + "/");
    for (let i=0; i<pop.length; i++) {
        let c = pop[i];
        fs.writeFileSync("./result/gen_" + iteration + "/chromo_" + i + ".json",
            JSON.stringify(c.getJSON(), null, "\t"));
        fs.writeFileSync("./result/gen_" + iteration + "/script_" + i + ".json",
            JSON.stringify(c._getScript(), null, "\t"));
    }
}

function writeStats(map, iteration){
    let stats = JSON.parse(fs.readFileSync("./result/stats.json"));
    let json = map.getJSON();
    json["iteration"] = iteration;
    stats["stats"].push(json);
    fs.writeFileSync("./result/stats.json", JSON.stringify(stats, null, "\t"));
}

function deleteMap(iteration){
    if(i < 0){
        return;
    }
    rimraf.sync("./result/map_" + iteration + "/");
}

function deletePopulation(iteration) {
    if (i < 0) {
        return;
    }
    rimraf.sync("./result/gen_" + iteration + "/");
}

function sleep(time) {
    let start = Date.now();
    while(Date.now() - start < time);
}

let fs = require('fs');
let rimraf = require("rimraf");
let parameters = JSON.parse(fs.readFileSync('./assets/parameters.json'));
let algorithm = null;
if(parameters["algorithm"] == "nsgaii"){
    let nsga = require('./nsgaii.js');
    nsga.initialize(parameters["problem"]);
    algorithm = new nsga.NSGAII();
}
else{
    let ga = require('./ga.js');
    ga.initialize(parameters["problem"]);
    algorithm = new ga.GA();
}
Math.seed(parameters["seed"]);

let args = process.argv.slice(2);
let popSize = parseInt(args[0]);
let iterations = -1;
if(args.length > 1){
    iterations = parseInt(args[1]);
}
rimraf.sync('./result/');
rimraf.sync('./input/');
rimraf.sync('./output/');
fs.mkdirSync('./result/');
fs.mkdirSync('./input/');
fs.mkdirSync('./output/');
fs.writeFileSync('./result/stats.json', JSON.stringify({ "stats": [] }, null, "\t"));

let chromosomes = algorithm.randomPopulation(
    parameters["explorerLength"], 
    parameters["numberOfExplorer"], 
    parameters["maxGeneValue"], 
    popSize);
let i = 0;
while(iterations < 0 || i < iterations){
    writeChromosome(chromosomes);
    while (!checkChromosome(chromosomes)){
        sleep(1000);
    }
    sleep(5000);
    readChromosome(chromosomes);
    algorithm.updatePopulation(chromosomes);
    chromosomes = algorithm.getNewChromosomes(parameters["crossover"], parameters["mutation"]);
    savePopulation(algorithm, i);
    writeStats(algorithm, i);
    deleteChromosome(chromosomes);
    deletePopulation(i - 1);
    i += 1;
}