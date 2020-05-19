function checkChromosome(index, size){
    for(let i=0; i<size; i++){
        if(!fs.existsSync('./input/chromosome_' + (index*size+i) + ".json")){
            return false;
        }
    }
    return true;
}

function deleteChromosome(index, size){
    for (let i = 0; i < size; i++) {
        fs.unlinkSync('./input/chromosome_' + (index * size + i) + '.json');
    }
}

function readChromosome(index, size){
    let result = [];
    for (let i = 0; i < size; i++) {
        let chJSON = JSON.parse(fs.readFileSync('./input/chromosome_' + (index*size+i) + '.json'));
        let c = new algoMod.Chromosome(0, 0, 0);
        c.initializeChromosome(chJSON);
        result.push(c);
    }
    return result;
}

function writeChromosome(index, size, chromosomes){
    for (let i = 0; i < size; i++) {
        let c = chromosomes[i];
        let chJSON = JSON.stringify(c.getJSON(), null, "\t");
        fs.writeFileSync('./output/chromosome_' + (index * size + i) + '.json', chJSON);
    }
}

function sleep(time) {
    let start = Date.now();
    while (Date.now() - start < time);
}

let fs = require('fs');
let parameters = JSON.parse(fs.readFileSync('./assets/parameters.json'));
let algoMod = null;
if (parameters["algorithm"] == "nsgaii") {
    algoMod = require('./nsgaii.js');
    algoMod.initialize(parameters["problem"]);
}
else {
    algoMod = require('./ga.js');
    algoMod.initialize(parameters["problem"]);
}
Math.seed(parameters["seed"]);
let args = process.argv.slice(2);
let index = parseInt(args[0]);
let size = parseInt(args[1]);

while(true){
    while(!checkChromosome(index, size)){
        sleep(1000);
    }
    sleep(5000);
    let chromosomes = readChromosome(index, size);
    for(let c of chromosomes){
        c.calculateValues(parameters["numberOfMaps"]);
    }
    writeChromosome(index, size, chromosomes);
    deleteChromosome(index, size);
}
