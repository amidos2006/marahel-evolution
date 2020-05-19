let fs = require('fs');
let savePixels = require("save-pixels");
let zeros = require("zeros");
let marahel = require('./libs/Marahel.js');
Math.randomFloat = marahel.random;
Math.randomInt = marahel.randomInt;
Math.seed = marahel.seed;
Math.shuffle = marahel.shuffle;
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

let problem = 'zelda';
let colorMap = {
    'binary': [0xFFFFFF, 0x000000],
    'zelda': [0x00FFFF, 0xFFFFFF, 0xFF0000, 0xFFFF00, 0x00FF00, 0x000000],
    'sokoban': [0xFF0000, 0xFFFFFF, 0x00FF00, 0x000000, 0x0000FF]
}[problem];
let border = {
    'binary': 1,
    'zelda': 5,
    'sokoban': 3
}[problem];
let edict = {
    'binary': { "solid": 1, "empty": 1 },
    'zelda': { "solid": 15, "empty": 30, "player": 1, "enemy": 5, "key": 1, "door": 1 },
    'sokoban': { "solid": 8, "empty": 9, "player": 1, "crate": 1, "target": 1 }
}[problem];

let script = JSON.parse(fs.readFileSync('./bestScripts/' + problem + '.json'));
// let evaluator = require('./evaluation.js')(edict).getEvaluation[problem];
// console.log(evaluator(marahel, 50, script));

marahel.initialize(script);
for (let i = 0; i < 10; i++) {
    let map = marahel.generate(true);
    
    let picture = zeros([map[0].length + 2, map.length + 2, 3]);
    for(let y=0; y< map.length + 2; y++){
        let color = colorMap[border];
        
        picture.set(0, y, 0, color >> 16);
        picture.set(0, y, 1, color >> 8 & 0xff);
        picture.set(0, y, 2, color & 0xff);

        picture.set(map[0].length + 1, y, 0, color >> 16);
        picture.set(map[0].length + 1, y, 1, color >> 8 & 0xff);
        picture.set(map[0].length + 1, y, 2, color & 0xff);
    }
    for(let x=0; x<map[0].length + 2; x++){
        let color = colorMap[border];
        picture.set(x, 0, 0, color >> 16);
        picture.set(x, 0, 1, color >> 8 & 0xff);
        picture.set(x, 0, 2, color & 0xff);

        picture.set(x, map.length + 1, 0, color >> 16);
        picture.set(x, map.length + 1, 1, color >> 8 & 0xff);
        picture.set(x, map.length + 1, 2, color & 0xff);
    }
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            let color = colorMap[map[y][x]];
            picture.set(x + 1, y + 1, 0, color >> 16);
            picture.set(x + 1, y + 1, 1, color >> 8 & 0xff);
            picture.set(x + 1, y + 1, 2, color & 0xff);
        }
    }
    savePixels(picture, "png").pipe(fs.createWriteStream("out_" + i + ".png"));
    for(let y=0; y<map.length; y++){
        let line = ""
        for(let x=0; x<map[y].length; x++){
            line += map[y][x].toString()
        }
        console.log(line)
    }
    console.log("\n")
}

let nsga = require('./nsgaii.js');
nsga.initialize(problem);

let chJSON = JSON.parse(fs.readFileSync('bestScripts/' + problem + '_chromosome.json'));
let c = new nsga.Chromosome(0, 0, 0);
c.initializeChromosome(chJSON);
console.log(c._getScript());
console.log(c.calculateValues(50));
console.log('\n')