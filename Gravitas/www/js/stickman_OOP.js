var ready = false;
var eurecaServer;
//this function will handle client communication with the server
var eurecaClientSetup = function() {
	//create an instance of eureca.io client
	var eurecaClient = new Eureca.Client();
	
	eurecaClient.ready(function (proxy) {		
        eurecaServer = proxy;
		create();
		ready = true;
	});	
} 

//var game = new Phaser.Game(1600, 800, Phaser.AUTO, '', { preload: preload, create: create, update: update });

//to Set up eurecaclient
var game = new Phaser.Game(1600, 800, Phaser.AUTO, '', { preload: preload, create: eurecaClientSetup, update: update});
var myId = 0;
var player;
var stickman;
var stickmenList;
var platforms;
var cursors;
var facing;
var guns;    
var hasGun;
var bullet;    
var bullets;
var bulletTime = 0;
    

Stickman = function (index, game, player) {
        
    this.cursor = {
        left:false,    
        right:false,
        jump:false,
        fire:false                    
    }
        
    this.input = {
        left:false,
		right:false,
		jump:false,
		fire:false
	}
       
    this.player = player;
    this.game = game;
    this.health = 50;
    this.facing = facing;
    this.hasGun = false;
 
    // player settings
    this.stickman = game.add.sprite(32, game.world.height - 150, 'dude');
    this.stickman.id = index;
    // enable physics on player
    game.physics.arcade.enable(this.stickman);
    
    // player properties
    this.stickman.body.bounce.y = 0.2;
    this.stickman.body.gravity.y = 200;
    this.stickman.body.collideWorldBounds = true;

    // walking right or left
    this.stickman.animations.add('left', [0, 1, 2, 3], 10, true);
    this.stickman.animations.add('right', [5, 6, 7, 8], 10, true);
    
    this.bullets = game.add.group();
    //game.physics.enable(bullets,Phaser.Physics.ARCADE);
    this.healthbullets.enableBody = true;
    this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
    //bullets.createMultiple(30, 'bullet', 0, false);
    this.bullets.setAll('anchor.x', 0.5);
    this.bullets.setAll('anchor.y', 0.5);
    this.bullets.setAll('outOfBoundsKill', true);
    this.bullets.setAll('checkWorldBounds', true);
};

//add new properties to an existing prototype
Stickman.prototype.update = function() {
    
    game.physics.arcade.collide(this.stickman, platforms);
    game.physics.arcade.collide(guns, platforms);
    
     //  Checks to see if the player overlaps with any of the guns, if he does call the collectGun function
    game.physics.arcade.overlap(this.stickman, guns, collectGun, null, this);
    
	for (var i in this.input) {
        this.cursor[i] = this.input[i];    
    }
    this.stickman.body.velocity.x = 0;
    
    if (this.cursor.left){
    //  Move to the left
    this.stickman.body.velocity.x = -150;
    this.stickman.animations.play('left');
    this.stickman.facing = 'left';
    }
    else if (this.cursor.right){
    //  Move to the right
    this.stickman.body.velocity.x = 150;
    this.stickman.animations.play('right');
    this.stickman.facing = 'right';   
    }
    else{
        //stand still
        this.stickman.animations.stop();
        //face left
        if (this.stickman.facing == 'left'){
         this.stickman.frame = 0;
        }
        else{
        //face right    
         this.stickman.frame = 7;   
        }
    }
    if(this.cursor.fire){
     //shoot
        this.fire();  
    }
    if(this.cursor.up && this.stickman.body.touching.down){
        this.stickman.body.velocity.y = -350;
        
    }                
};

//getting the element that triggered the fire event
Stickman.prototype.fire= function(target){
    
    //has to be alive to shoot
    if(!this.alive) return;
    // Ensure that player has a gun before he is able to shoot  
    // To avoid players being allowed to fire too fast a time limit is set
    if (this.stickman.hasGun === true){
     if(game.time.now > bulletTime)
     {
        if (this.stickman.facing == 'right')
        {
            bullet = bullets.create(player.x+20, player.y+20, 'bullet');
            bullet.body.velocity.x = 400;
            bulletTime = game.time.now + 200;
        }
            
        if (this.stickman.facing == 'left')
        {
            bullet = bullets.create(player.x-20, player.y+20, 'bullet');
            bullet.body.velocity.x = -400;
            bulletTime = game.time.now + 200;
        }
     }
        
    }
    
}
Stickman.prototype.kill = function(){
    this.alive = false;
    this.stickman.kill();
}
        
function collectGun (stickman, gun) {
    // Removes the gun from the screen
    gun.kill();
    hasGun = true;
}
    
var game = new Phaser.Game(1600, 800, Phaser.AUTO, '', { preload: preload, create: create, update: update }); 

function preload() {

    game.load.image('sky', 'www/assets/sky2.png');
    game.load.image('ground', 'www/assets/platform.png');
    game.load.image('gun', 'www/assets/smalltempgun.png');
    game.load.image('bullet', 'www/assets/pbullet.gif');
    game.load.spritesheet('dude', 'www/assets/dude.png', 32, 48);

}
function create() {
    
    //  enable arcade physics system
    game.physics.startSystem(Phaser.Physics.ARCADE);
    
    //background for game
    var background = game.add.sprite(0,0,'sky');
    //  scalling background
    background.scale.set(2,2);
    
    //  this group will contain all stage objects
    platforms = game.add.group();
    
    // enable physics for any object that is created in this group
    platforms.enableBody = true;
    
    //  create the ground.
    var ground = platforms.create(0, game.world.height - 64, 'ground');
    // Scale it to fit the width of the game (the original sprite is 400x32 in size)
    ground.scale.setTo(4, 2);
    
    //  This stops it from falling away when you jump on it
    ground.body.immovable = true;
    
    // bottom ledge
    var ledge = platforms.create(800,500, 'ground');
    ledge.scale.setTo(2,1);
    ledge.body.immovable = true;
    
    // middle ledge
    var ledge = platforms.create(0,300, 'ground');
    ledge.scale.setTo(2.5,1);
    ledge.body.immovable = true;
    
    // top ledge
    var ledge = platforms.create(800, 100, 'ground');
    ledge.scale.setTo(2,1);
    ledge.body.immovable = true;
    
    stickmenList = {};
    
    player = new Stickman(myId, game, stickman);
    stickmenList[myId] = player;
    stickman = player.stickman;
    bullets = player.bullets;

    //  controls.
    cursors = game.input.keyboard.createCursorKeys();
    spaceBar = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    
}

function update() {
    
	player.input.left = cursors.left.isDown;
	player.input.right = cursors.right.isDown;
	player.input.up = cursors.up.isDown;
    player.input.fire = spaceBar.isDown;
    
}
function bulletHitPlayer(stickman, bullet){
 bullet.kill();   
}

function render() {}
        
        
        
        
        
