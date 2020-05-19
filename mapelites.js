let usedModules = null;

class Chromosome{
    constructor(explorerLength, numberOfExplorers, maxGeneValue){
        this._explorerLength = explorerLength;
        this._genes = [];
        this._numberOfExplorers = numberOfExplorers;
        this._maxGeneValue = maxGeneValue;
        this._fitness = -1;
        this._dimensions = [];
    }

    randomInit(){
        for (let i = 0; i < this._numberOfExplorers * this._explorerLength + 2; i++) {
            this._genes.push(Math.randomInt(0, this._maxGeneValue));
        }
    }

    initializeChromosome(json){
        this._genes = json["genes"];
        this._explorerLength = json["explorerLength"];
        this._numberOfExplorers = json["numberOfExplorers"];
        this._maxGeneValue = json["maxGeneValue"];
        this._fitness = json["fitness"];
        this._dimensions = json["dimensions"];
    }

    getJSON(){
       return {
            "genes": this._genes,
            "explorerLength": this._explorerLength,
            "numberOfExplorers": this._numberOfExplorers,
            "maxGeneValue": this._maxGeneValue,
            "fitness": this._fitness,
            "dimensions": this._dimensions
        }
    }

    clone(){
        let c = new Chromosome(this._explorerLength, this._numberOfExplorers, this._maxGeneValue);
        for (let i = 0; i < this._genes.length; i++) {
            c._genes[i] = this._genes[i];
        }
        return c;
    }

    crossover(c){
        let child = this.clone();
        let value = Math.randomInt(0, child._explorerSize + 2);
        if (value > 1) {
            for(let i=0; i<child._geneSize; i++){
                child._genes[(value - 2) * child._geneSize + i] = c._genes[(value - 2) * c._geneSize + i];
            }
        }
        else{
            child._genes[value] = c._genes[value];
        }
        return child;
    }

    mutate(){
        let child = this.clone();
        let value = Math.randomInt(0, child._explorerSize + 2);
        if(value > 1){
            let subValue = Math.randomInt(0, child._geneSize);
            child._genes[(value - 2) * child._geneSize + subValue] = Math.randomInt(0, child._maxGene);
        }
        else{
            child._genes[value] = Math.randomInt(0, child._maxGene);
        }
        return child;
    }

    _getScript(){
        return usedModules["parser"].getScript(this._genes, this._explorerLength);
    }

    calculateValues(numberOfMaps){
        let script = this._getScript();
        let results = usedModules["evaluator"](usedModules["marahel"], numberOfMaps, script);
        this._fitness = 1 - Math.average(results["changes"]);
        this._dimensions = results["dimensions"];
        return results;
    }

    fitness(){
        return this._fitness;
    }

    dimensions(){
        return this._dimensions;
    }
}

class Cell{
    constructor(dimensions){
        this._dim = dimensions;
        this._elite = null;
    }

    addChromosome(c){
        if(this._elite == null || this._elite.fitness() < c.fitness()){
            this._elite = c;
        }
    }

    getChromosome(){
        return this._elite;
    }

    getDimensions(){
        return this._dim;
    }
}

class MapElite{
    constructor(){
        this._map = {};
    }

    initializeMap(explorerLength, numberOfExplorers, maxGeneValue, batchSize){
        let chromosomes = [];
        for (let i = 0; i < batchSize; i++){
            let c = new Chromosome(explorerLength, numberOfExplorers, maxGeneValue);
            c.randomInit();
            chromosomes.push(c);
        }
        return chromosomes;
    }

    _getStringKey(dimensions, mapGranularity){
        let key = "";
        for(let d of dimensions){
            key += Math.clamp(Math.round(d * mapGranularity), -mapGranularity, mapGranularity) + ",";
        }
        return key.slice(0, key.length - 1);
    }

    getJSON(){
        return {
            "cells": this._getCells().length
        }
    }

    _getCells(){
        let cells = [];
        for(let key in this._map){
            cells.push(this._map[key]);
        }
        return cells;
    }

    getChromosomes(crossover, mutation, batchSize){
        let cells = this._getCells();
        let result = [];
        for (let i = 0; i < batchSize; i++){
            Math.shuffle(cells);
            let p1 = cells[0].getChromosome();
            Math.shuffle(cells);
            let p2 = cells[0].getChromosome();
            if(Math.randomFloat() < crossover){
                let child = p1.crossover(p2);
                if(Math.randomFloat() < mutation){
                    child = child.mutate();
                }
                result.push(child);
            }
            else{
                result.push(p1.mutate());
            }
        }
        return result;
    }

    assignChromosomes(chromosomes, mapGranularity){
        for(let c of chromosomes){
            let key = this._getStringKey(c.dimensions(), mapGranularity);
            if(!(key in this._map)){
                this._map[key] = new Cell(c.dimensions());
            }
            this._map[key].addChromosome(c);
        }
    }
}

module.exports = {
    'initialize': function(type, seed){
        usedModules = {};
        usedModules["marahel"] = require('./libs/Marahel.js');
        Math.randomFloat = usedModules["marahel"].random;
        Math.randomInt = usedModules["marahel"].randomInt;
        Math.seed = usedModules["marahel"].seed;
        Math.shuffle = usedModules["marahel"].shuffle;
        Math.clamp = function (v, min, max) {
            return Math.min(Math.max(v, min), max);
        }
        Math.average = function(array) {
            let total = 0;
            for (let v of array) {
                total += v;
            }
            return total / array.length;
        }

        usedModules["tracery"] = require('./libs/tracery.js');
        usedModules["tracery"].setRng(Math.randomFloat);
        if(seed){
            Math.seed(seed);
        }

        let fs = require('fs');
        let json = JSON.parse(fs.readFileSync('./assets/explorer.json', 'utf8'));

        let edictDist = {
            'binary': { "solid": 1, "empty": 1 },
            'zelda': {"solid":15, "empty": 30, "player": 1, "enemy": 5, "key": 1, "door": 1},
            'sokoban': {"solid":8, "empty": 9, "player": 1, "crate": 1, "target": 1}
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
    'MapElite': MapElite
}