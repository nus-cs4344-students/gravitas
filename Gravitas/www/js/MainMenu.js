Gravitas.MainMenu = function(game){};
Gravitas.MainMenu.prototype = {
    
    preload: function(){
        this.load.image('sky', 'www/assets/sky2.png');
        this.load.image('ground', 'www/assets/platform.png');
        this.load.image('gun', 'www/assets/smallgun1.png');
        this.load.image('bullet', 'www/assets/pbullet.gif');
        this.load.spritesheet('healthBar','www/assets/healthbar.png' , 32,35.2); 
        this.load.spritesheet('dude', 'www/assets/stickman288x48.png', 32, 48);
    
    },
	create: function(){
		// display images
		this.add.sprite((Gravitas.GAME_WIDTH-500)/2, 30, 'title');
        this.add.sprite((Gravitas.GAME_WIDTH)/2-500, 350,'figure');
		// add the button that will start the game
		this.add.button(Gravitas.GAME_WIDTH-401-200, Gravitas.GAME_HEIGHT-143-50, 'button-start', this.startGame, this, 1, 0, 2);
	},
	startGame: function() {
		// start the Game state
		this.state.start('StickMan');
	}
};