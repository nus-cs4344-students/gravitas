Gravitas.Preloader = function(game){
	// define width and height of the game
    Gravitas.GAME_WIDTH = 1600;
	Gravitas.GAME_HEIGHT = 800;
};
Gravitas.Preloader.prototype = {
	preload: function(){
		// set background color and preload image
		this.stage.backgroundColor = '#FFFFFF';
		this.preloadBar = this.add.sprite((Gravitas.GAME_WIDTH-311)/2, (Gravitas.GAME_HEIGHT-27)/2, 'preloaderBar');
		this.load.setPreloadSprite(this.preloadBar);
		// load images
        this.load.image('title', 'www/assets/gravitaslogo.png');
        this.load.image('figure', 'www/assets/stickman.png');
		this.load.spritesheet('button-start', 'www/assets/button-start.png', 401, 143);              
	},
	create: function(){
		// start the MainMenu state
		this.state.start('MainMenu');
	}
};