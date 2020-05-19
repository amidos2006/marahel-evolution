let nsgaii = require('./nsgaii.js');
nsgaii.initialize('binary');

let explorerLength = 10;
let numberOfExplorer = 5;
let maxGeneValue = 40;
let numberOfMaps = 20;
let popSize = 100;
let crossover = 0.7;
let mutation = 0.3;

let algorithm = new nsgaii.NSGAII();

let chromosomes = algorithm.randomPopulation(explorerLength, numberOfExplorer, maxGeneValue, popSize);
for(let i=0; i<5; i++){
    console.log("Generation " + i + ":");
    for(let c of chromosomes){
        c.calculateValues(numberOfMaps);
    }
    algorithm.updatePopulation(chromosomes);
    chromosomes = algorithm.getNewChromosomes(crossover, mutation);
    console.log(algorithm.getJSON());
}
console.log("Done");