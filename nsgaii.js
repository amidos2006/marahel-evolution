let usedModules = null;

class Chromosome {
    constructor(explorerLength, numberOfExplorers, maxGeneValue) {
        this._explorerLength = explorerLength;
        this._numberOfExplorers = numberOfExplorers;
        this._maxGeneValue = maxGeneValue;
        this._genes = [];
        this._fitness = [];
        this._domination_count = 0;
        this._dominantes = [];
        this._rank = 0;
        this._distance = 0;
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

    isDominating(c){
        let better_in_one = false;
        let better_or_same = true;
        for(let i=0; i<this._fitness.length; i++){
            if(this._fitness[i] > c._fitness[i]){
                better_in_one = true;
            }
            else if(this._fitness[i] < c._fitness[i]){
                better_or_same = false;
            }
        }
        return better_or_same && better_in_one;
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
        this._fitness = results["dimensions"];
        return results;
    }

    fitness() {
        return this._fitness;
    }
}

class NSGAII{
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
        let ranks = {};
        for(let c of this._population){
            if (!("rank_" + c._rank in ranks)){
                ranks["rank_" + c._rank] = 0;
            }
            ranks["rank_" + c._rank] += 1;
        }
        return ranks;
    }

    _getParent(){
        let c1 = this._population[Math.randomInt(0, this._population.length)];
        let c2 = this._population[Math.randomInt(0, this._population.length)];
        if(c1._rank < c2._rank){
            return c1;
        }
        if(c1._rank > c2._rank){
            return c2;
        }
        if(c1._distance > c2._distance){
            return c1;
        }
        if(c1._distance < c2._distance){
            return c2;
        }
        if(Math.randomFloat() < 0.5){
            return c1;
        }
        return c2;
        
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

    _getRankPopulation(pop){
        let result = [];
        for(let c of pop){
            if(c._domination_count <= 0){
                result.push(c);
            }
        }
        return result;
    }

    _calculateCrowdingDistance(pop){
        for(let c of pop){
            c._distance = 0;
        }
        let dim = pop[0]._fitness.length
        for(let i=0; i<dim; i++){
            pop.sort((a,b)=>a._fitness[i] - b._fitness[i]);
            pop[0]._distance += 1000000;
            pop[pop.length - 1]._distance += 2000000;
            for(let j=1; j<pop.length-1; j++){
                pop[j]._distance += (pop[j+1]._fitness[i] - pop[j-1]._fitness[i]) / 
                    (pop[pop.length-1]._fitness[i] - pop[0]._fitness[i] + 0.00001);
            }
        }
    }

    updatePopulation(chromosomes) {
        let popSize = chromosomes.length;
        let temp_pop = this._population.concat(chromosomes);
        this._population = [];
        for (let c of temp_pop) {
            c._dominantes = [];
            c._domination_count = 0;
        }
        for(let c1 of temp_pop){
            for(let c2 of temp_pop){
                if(c1 == c2){
                    continue;
                }
                if(c1.isDominating(c2)){
                    c1._dominantes.push(c2);
                    c2._domination_count += 1;
                }
            }
        }
        let rank = 0;
        while(temp_pop.length > 0){
            let chromosomes = this._getRankPopulation(temp_pop);
            for(let c of chromosomes){
                c._rank = rank;
                temp_pop.splice(temp_pop.indexOf(c), 1);
                for(let d of c._dominantes){
                    d._domination_count -= 1;
                }
            }
            this._calculateCrowdingDistance(chromosomes);
            chromosomes.sort((a, b)=>b._distance - a._distance);
            this._population = this._population.concat(chromosomes);
            rank += 1;
        }
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
    'NSGAII': NSGAII
}