var BFSNode = (function () {
    function BFSNode(parent, sokoban) {
        this._parent = parent;
        this._children = [];
        this._depth = 0;
        if (parent != null) {
            this._depth = parent._depth + 1;
        }
        this._sokoban = sokoban;
    }
    Object.defineProperty(BFSNode.prototype, "stateString", {
        get: function () {
            return stringfy(this._sokoban);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BFSNode.prototype, "isTerminal", {
        get: function () {
            return this._sokoban.checkWin();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BFSNode.prototype, "depth", {
        get: function () {
            return this._depth;
        },
        enumerable: true,
        configurable: true
    });
    BFSNode.prototype.expand = function () {
        for (var i = 0; i < 4; i++) {
            var newState = this._sokoban.clone();
            var actionPair = getDirection(i);
            newState.update(actionPair.x, actionPair.y, false);
            this._children[i] = new BFSNode(this, newState);
        }
        return this._children;
    };
    BFSNode.prototype.getActionSequence = function () {
        var currentNode = this;
        var answer = [];
        while (currentNode._parent != null) {
            for (var i = 0; i < currentNode._parent._children.length; i++) {
                if (currentNode._parent._children[i] == currentNode) {
                    answer.push(i);
                    break;
                }
            }
            currentNode = currentNode._parent;
        }
        return answer.reverse();
    };
    return BFSNode;
}());
var BFS = (function () {
    function BFS() {
    }
    BFS.prototype.solve = function (sokoban, maxNodes) {
        var root = new BFSNode(null, sokoban.clone());
        var queue = [root];
        var visited = {};
        var numberOfExpandedNodes = 0;
        visited[stringfy(sokoban)] = true;
        while (queue.length > 0 && numberOfExpandedNodes < maxNodes) {
            var currentNode = queue.splice(0, 1)[0];
            if (currentNode.isTerminal) {
                return currentNode.getActionSequence();
            }
            var nodes = currentNode.expand();
            for (var _i = 0, nodes_2 = nodes; _i < nodes_2.length; _i++) {
                var n = nodes_2[_i];
                var currentState = n.stateString;
                if (!(currentState in visited)) {
                    visited[currentState] = true;
                    queue.push(n);
                    numberOfExpandedNodes += 1;
                }
            }
        }
        return [];
    };
    return BFS;
}());

var AStarNode = (function () {
    function AStarNode(parent, sokoban) {
        this._parent = parent;
        this._children = [];
        this._depth = 0;
        this._estimate = 0;
        if (parent != null) {
            this._depth = parent._depth + 1;
        }
        this._sokoban = sokoban;
    }
    Object.defineProperty(AStarNode.prototype, "stateString", {
        get: function () {
            return stringfy(this._sokoban);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AStarNode.prototype, "isTerminal", {
        get: function () {
            return this._sokoban.checkWin();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AStarNode.prototype, "estimate", {
        get: function () {
            return this._estimate;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AStarNode.prototype, "depth", {
        get: function () {
            return this._depth;
        },
        enumerable: true,
        configurable: true
    });
    AStarNode.prototype.expand = function (heuristic) {
        for (var i = 0; i < 4; i++) {
            var newState = this._sokoban.clone();
            var actionPair = getDirection(i);
            newState.update(actionPair.x, actionPair.y, false);
            this._children[i] = new AStarNode(this, newState);
            this._children[i]._estimate = heuristic(this._children[i]._depth, this._children[i]._sokoban);
        }
        return this._children;
    };
    AStarNode.prototype.getActionSequence = function () {
        var currentNode = this;
        var answer = [];
        while (currentNode._parent != null) {
            for (var i = 0; i < currentNode._parent._children.length; i++) {
                if (currentNode._parent._children[i] == currentNode) {
                    answer.push(i);
                    break;
                }
            }
            currentNode = currentNode._parent;
        }
        return answer.reverse();
    };
    AStarNode.prototype.getBestFrontierNode = function () {
        var current = this;
        var result = null;
        var queue = [current];
        while (queue.length > 0) {
            current = queue.splice(0, 1)[0];
            if (current._children.length < 4 && (result == null || result._estimate < current._estimate)) {
                result = current;
            }
            for (var _i = 0, _a = current._children; _i < _a.length; _i++) {
                var c = _a[_i];
                queue.push(c);
            }
        }
        return result;
    };
    return AStarNode;
}());

function getDirection(input) {
    switch (input) {
        case 0:
            return { x: -1, y: 0 };
        case 1:
            return { x: 1, y: 0 };
        case 2:
            return { x: 0, y: -1 };
        case 3:
            return { x: 0, y: 1 };
    }
    return { x: 0, y: 0 };
}

function stringfy(sokoban) {
    var result = "";
    var p = sokoban.player.getTile();
    result += p.x + "," + p.y;
    for (var _i = 0, _a = sokoban.boulders; _i < _a.length; _i++) {
        var b = _a[_i];
        p = b.getTile();
        result += "," + p.x + "," + p.y;
    }
    return result;
}

function getDistance(p1, p2) {
    return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
}

function getNearestObject(box, Objects) {
    var boxLoc = box.getTile();
    var index = 0;
    var minDistance = getDistance(boxLoc, Objects[index].getTile());
    for (var i = 1; i < Objects.length; i++) {
        var currentDistance = getDistance(boxLoc, Objects[i].getTile());
        if (currentDistance < minDistance) {
            minDistance = currentDistance;
            index = i;
        }
    }
    return index;
};

function averageDistance(sokoban) {
    var targets = [];
    for (var _i = 0, _a = sokoban.targets; _i < _a.length; _i++) {
        var t = _a[_i];
        targets.push(t);
    }
    var boxes = [];
    for (var _b = 0, _c = sokoban.boulders; _b < _c.length; _b++) {
        var b = _c[_b];
        boxes.push(b);
    }
    var result = 0;
    boxes.sort(function (a, b) {
        var i1 = getNearestObject(a, targets);
        var i2 = getNearestObject(b, targets);
        return getDistance(a.getTile(), targets[i1].getTile()) -
            getDistance(b.getTile(), targets[i2].getTile());
    });
    for (var _d = 0, boxes_1 = boxes; _d < boxes_1.length; _d++) {
        var b = boxes_1[_d];
        var index = getNearestObject(b, targets);
        result += getDistance(b.getTile(), targets[index].getTile());
        targets.splice(index, 1);
    }
    return result / boxes.length;
}

var AStar = (function () {
    function AStar() {
        this._heuristic = function(depth, sokoban) {
            var result = depth / 10 + averageDistance(sokoban) * sokoban.boulders.length;
            return 1 / (Math.log(result + 1) + 1);
        };
    }
    AStar.prototype.solve = function (sokoban, maxNodes) {
        var root = new AStarNode(null, sokoban.clone());
        var queue = [root];
        var visited = {};
        var numberOfExpandedNodes = 0;
        visited[stringfy(sokoban)] = true;
        while (queue.length > 0 && numberOfExpandedNodes < maxNodes) {
            queue.sort(function (a, b) {
                return b.estimate - a.estimate;
            });
            var currentNode = queue.splice(0, 1)[0];
            if (currentNode.isTerminal) {
                return currentNode.getActionSequence();
            }
            var nodes = currentNode.expand(this._heuristic);
            for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                var n = nodes_1[_i];
                var currentState = n.stateString;
                if (!(currentState in visited)) {
                    visited[currentState] = true;
                    queue.push(n);
                    numberOfExpandedNodes += 1;
                }
            }
        }
        return [];
    };
    return AStar;
}());

let Entity = function (x, y, img, index) {
    this.x = x;
    this.y = y;
    this.img = img;
    this.index = index;
};

Entity.prototype.clone = function(){
    return new Entity(this.x, this.y, this.img, this.index);
}

Entity.prototype.getTile = function () {
    return { x: Math.floor(this.x / 16), y: Math.floor(this.y / 16) };
};

Entity.prototype.collide = function (other, xTile, yTile) {
    if (xTile == undefined) {
        xTile = 0;
    }
    if (yTile == undefined) {
        yTile = 0;
    }
    let loc = this.getTile();
    let otherLoc = other.getTile();
    return loc.x + xTile == otherLoc.x && loc.y + yTile == otherLoc.y;
};

Entity.prototype.render = function (context) {
    context.save();
    context.translate(this.x, this.y);
    let xNum = Math.floor(this.img.width / 16);
    let yNum = Math.floor(this.img.height / 16);
    let sx = (this.index % xNum) * 16;
    let sy = (Math.floor(this.index / xNum) % yNum) * 16;
    context.drawImage(this.img, sx, sy, 16, 16, 0, 0, 16, 16);
    context.restore();
}

let SokobanGame = function (img) {
    this.player = new Entity(0, 0, img, 4);
    this.boulders = [];
    this.targets = [];
    this.walls = [];
    this.undo = [];
}

SokobanGame.prototype.initialize = function (map, useEntities) {
    this.player.x = 0;
    this.player.y = 0;
    this.boulders = [];
    this.targets = [];
    this.walls = [];
    this.undo = [];
    if(useEntities == undefined){
        useEntities = false;
    }
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            let index = map[y][x];
            if(useEntities){
                index = index.index;
            }
            switch (index) {
                case 3:
                    this.walls.push(new Entity(x * 16, y * 16, this.player.img, index));
                    break;
                case 2:
                    this.player.x = x * 16;
                    this.player.y = y * 16;
                    break;
                case 0:
                    this.boulders.push(new Entity(x * 16, y * 16, this.player.img, index));
                    break;
                case 4:
                    this.targets.push(new Entity(x * 16, y * 16, this.player.img, index));
                    break;
                case 5:
                    this.boulders.push(new Entity(x * 16, y * 16, this.player.img, 0));
                    this.targets.push(new Entity(x * 16, y * 16, this.player.img, 1));
                    break;
            }
        }
    }
}

SokobanGame.prototype.clone = function(){
    let clone = new SokobanGame(this.player.img);
    clone.player = this.player.clone();
    for(let b of this.boulders){
        clone.boulders.push(b.clone());
    }
    clone.targets = this.targets;
    clone.walls = this.walls;
    return clone;
}

SokobanGame.prototype.collide = function (obj, array, xDir, yDir) {
    for (let a of array) {
        if (obj.collide(a, xDir, yDir)) {
            return a;
        }
    }
    return null;
};

SokobanGame.prototype.tryMove = function (xDir, yDir) {
    if (this.collide(this.player, this.walls, xDir, yDir) != null) {
        return false;
    }
    let boulder = this.collide(this.player, this.boulders, xDir, yDir);
    if (boulder != null) {
        if (this.collide(boulder, this.boulders.concat(this.walls), xDir, yDir)) {
            return false;
        }
        else {
            boulder.x += xDir * 16;
            boulder.y += yDir * 16;
        }
    }
    this.player.x += xDir * 16;
    this.player.y += yDir * 16;
    if (xDir != 0 || yDir != 0) {
        return true;
    }
    return false;
}

SokobanGame.prototype.checkWin = function () {
    for (let b of this.boulders) {
        let covered = false;
        for (let t of this.targets) {
            if (b.collide(t)) {
                covered = true;
                break;
            }
        }
        if (!covered) {
            return false;
        }
    }
    return true;
}

SokobanGame.prototype.getUndoObject = function () {
    let undoObject = {
        player: { x: this.player.x, y: this.player.y },
        boulders: []
    };
    for (let b of this.boulders) {
        undoObject.boulders.push({ x: b.x, y: b.y });
    }
    return undoObject;
}

SokobanGame.prototype.undoMove = function () {
    if (this.undo.length == 0) {
        return;
    }
    let undoObject = this.undo.pop();
    this.player.x = undoObject.player.x;
    this.player.y = undoObject.player.y;
    for (let i = 0; i < this.boulders.length; i++) {
        this.boulders[i].x = undoObject.boulders[i].x;
        this.boulders[i].y = undoObject.boulders[i].y;
    }
}

SokobanGame.prototype.update = function (xDir, yDir, undo) {
    if(undo){
        this.undoMove();
    }
    let undoObject = this.getUndoObject();
    if (this.tryMove(xDir, yDir)) {
        this.undo.push(undoObject);
    }
};

SokobanGame.prototype.render = function (context) {
    for (let t of this.targets) {
        t.render(context);
    }
    for (let w of this.walls) {
        w.render(context);
    }
    for (let b of this.boulders) {
        b.render(context);
    }
    this.player.render(context);
};

module.exports = SokobanGame
let bfs = new BFS();
module.exports["solveBFS"] = bfs.solve.bind(bfs);
let astar = new AStar();
module.exports["solveAStar"] = astar.solve.bind(astar);
