let usedModules = null;

class Chromosome {
    constructor(explorerLength, numberOfExplorers, maxGeneValue) {
        this._explorerLength = explorerLength;
        this._numberOfExplorers = numberOfExplorers;
        this._maxGeneValue = maxGeneValue;
        this._genes = [];
        this._fitness = -1;
    }

    randomInit() {
        for (let i = 0; i < this._numberOfExplorers * this._explorerLength + 2; i++) {
            this._genes.push(Math.randomInt(0, this._maxGeneValue));
        }
    }

    initializeChromosome(json) {
        this._explorerLength = json["explorerLength"];
        this._numberOfExplorers = json["numberOfExplorers"];
        this._maxGeneValue = json["maxGeneValue"];
        this._genes = json["genes"];
        this._fitness = json["fitness"];
    }

    getJSON() {
        return {
            "explorerLength": this._explorerLength,
            "numberOfExplorers": this._numberOfExplorers,
            "maxGeneValue": this._maxGeneValue,
            "genes": this._genes,
            "fitness": this._fitness
        };
    }

    clone() {
        let c = new Chromosome(this._explorerLength, this._numberOfExplorers, this._maxGeneValue);
        for (let i = 0; i < this._genes.length; i++) {
            c._genes[i] = this._genes[i];
        }
        return c;
    }

    crossover(c) {
        let child = this.clone();
        let value = Math.randomInt(0, child._numberOfExplorers + 2);
        if (value > 1) {
            for (let i = 0; i < child._explorerLength; i++) {
                child._genes[(value - 2) * child._explorerLength + i + 2] = c._genes[(value - 2) * c._explorerLength + i + 2];
            }
        }
        else {
            child._genes[value] = c._genes[value];
        }
        return child;
    }

    mutate() {
        let child = this.clone();
        let value = Math.randomInt(0, child._numberOfExplorers + 2);
        if (value > 1) {
            let subValue = Math.randomInt(0, child._explorerLength);
            child._genes[(value - 2) * child._explorerLength + subValue + 2] = Math.randomInt(0, child._maxGeneValue);
        }
        else {
            child._genes[value] = Math.randomInt(0, child._maxGeneValue);
        }
        return child;
    }

    _getScript() {
        return usedModules["parser"].getScript(this._genes, this._explorerLength);
    }

    calculateValues(numberOfMaps) {
        let script = this._getScript();
        let results = usedModules["evaluator"](usedModules["marahel"], numberOfMaps, script);
        this._fitness = 0;
        let total = 0;
        for(let i=0; i<results["dimensions"].length; i++){
            this._fitness += results["dimensions"][i];
            total += 1;
        }
        if(results["dimensions"].length > 2){
            this._fitness += results["dimensions"][results["dimensions"].length-1];
            total += 1;
        }
        this._fitness = this._fitness / total;
        return results;
    }

    fitness() {
        return this._fitness;
    }
}

class GA{
    constructor(){
        this._population = [];
    }

    randomPopulation(explorerLength, numberOfExplorers, maxGeneValue, popSize){
        let chromosomes = [];
        for(let i=0; i<popSize; i++){
            let c = new Chromosome(explorerLength, numberOfExplorers, maxGeneValue);
            c.randomInit();
            chromosomes.push(c);
        }
        return chromosomes;
    }

    getJSON() {
        let maxValue = this._population[0]._fitness;
        let minValue = this._population[0]._fitness;
        let avgValue = 0;
        for(let c of this._population){
            if(c._fitness > maxValue){
                maxValue = c._fitness;
            }
            if(c._fitness < minValue){
                minValue = c._fitness;
            }
            avgValue += c._fitness;
        }
        avgValue /= this._population.length;
        let varValue = 0;
        for (let c of this._population) {
            varValue += Math.pow(c._fitness - avgValue, 2);
        }
        varValue /= this._population.length;
        return {
            'maxFitness': maxValue,
            'minFitness': minValue,
            'avgFitness': avgValue,
            'varFitness': varValue
        };
    }

    _getParent(){
        let c1 = this._population[Math.randomInt(0, this._population.length)];
        let c2 = this._population[Math.randomInt(0, this._population.length)];
        if (c1._fitness < c2._fitness){
            return c2;
        }
        if (c1._fitness > c2._fitness){
            return c1;
        }
        if(Math.randomFloat() < 0.5){
            return c2;
        }
        return c1;
        
    }

    getNewChromosomes(crossover, mutation) {
        let result = [];
        for (let i = 0; i < this._population.length; i++) {
            let p1 = this._getParent();
            let p2 = this._getParent();
            if (Math.randomFloat() < crossover) {
                let child = p1.crossover(p2);
                if (Math.randomFloat() < mutation) {
                    child = child.mutate();
                }
                result.push(child);
            }
            else {
                result.push(p1.mutate());
            }
        }
        return result;
    }

    updatePopulation(chromosomes) {
        let popSize = chromosomes.length;
        if(this._population.length > 0){
            this._population.sort((a, b) => b._fitness - a._fitness);
            this._population = this._population.slice(0, 0.1 * popSize);
        }
        this._population = this._population.concat(chromosomes);
        this._population.sort((a, b) => b._fitness - a._fitness);
        this._population = this._population.slice(0, popSize);
    }
}

module.exports = {
    'initialize': function (type, seed) {
        usedModules = {};
        usedModules["marahel"] = require('./libs/Marahel.js');
        Math.randomFloat = usedModules["marahel"].random;
        Math.randomInt = usedModules["marahel"].randomInt;
        Math.seed = usedModules["marahel"].seed;
        Math.shuffle = usedModules["marahel"].shuffle;
        Math.clamp = function (v, min, max) {
            return Math.min(Math.max(v, min), max);
        }
        Math.average = function (array) {
            let total = 0;
            for (let v of array) {
                total += v;
            }
            return total / array.length;
        }

        usedModules["tracery"] = require('./libs/tracery.js');
        usedModules["tracery"].setRng(Math.randomFloat);
        if (seed) {
            Math.seed(seed);
        }

        let fs = require('fs');
        let json = JSON.parse(fs.readFileSync('./assets/explorer.json', 'utf8'));

        let edictDist = {
            'binary': { "solid": 1, "empty": 1 },
            'zelda': { "solid": 15, "empty": 30, "player": 1, "enemy": 5, "key": 1, "door": 1 },
            'sokoban': { "solid": 8, "empty": 9, "player": 1, "crate": 1, "target": 1 }
        };
        usedModules["edict"] = edictDist[type];

        let entities = [];
        for (let e in usedModules["edict"]) {
            entities.push(e);
        }
        json['entity'] = entities;
        let mapSize = {
            'binary': "14x14",
            'zelda': "11x7",
            'sokoban': "5x5"
        };

        usedModules["parser"] = require('./parser.js')(json, usedModules["tracery"], mapSize[type], usedModules["edict"]);
        usedModules["evaluator"] = require('./evaluation.js')(usedModules["edict"]).getEvaluation[type];
    },
    'Chromosome': Chromosome,
    'GA': GA
}