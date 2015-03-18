
/// <reference path="phaser.d.ts"/>
var map; // The tilemap
var layer; // A layer within a tileset
var stickmanSprite;

var game = new Phaser.Game
    (1344, 608, Phaser.AUTO, '',
    { preload: this.preload, create: this.create, update: this.update });

function preload() {
    
    game.load.tilemap('map', 'map.json', null, Phaser.Tilemap.TILED_JSON);
    game.load.image('ground_1x1', 'ground_1x1.png');
    game.load.image('stickman', 'stickman.png');
    
}

function create() {
   map = game.add.tilemap('map');
   map.addTilesetImage('ground_1x1');
   layer = map.createLayer('Tile Layer 1');
   layer.resizeWorld();

}

function update() {
 
}