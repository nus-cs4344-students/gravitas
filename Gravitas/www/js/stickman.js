var myId = 0;

var stickman;
var player;
var stickmanList;
var enemyBullets;
var enemiesTotal;
var enemiesAlive;
var explosions;
var logo;
var cursors;
var bullets;
var fireRate = 100;
var nextFire = 0;

var ready = false;
var eurecaServer;
//this function will handle client communication with the server
var eurecaClientSetup = function() {
	//create an instance of eureca.io client
	var eurecaClient = new Eureca.Client();
	
	eurecaClient.ready(function (proxy) {		
        eurecaServer = proxy;
	});

	eurecaClient.exports.setId = function(id)
	{
		myId = id;
		create();
		eurecaServer.handshake();
		ready = true;
	}
	eurecaClient.exports.kill = function(id)
	{
		if(stickmanList[id])
		{
			stickmanList[id].kill();
			console.log('killing ', id, stickmanList[id]);
		}
	}
	eurecaClient.exports.spawnEnemy = function(i, x, y)
	{
		if (i == myId) return;
		console.log('SPAWN');
		var stckman = new StickMan(i, game, stickman);
		stickmanList[i] = stckman;
	}
	//Server calls this to update state on client
	eurecaClient.exports.updateState = function(id, state)
	{
		if(stickmanList[id]) {
			stickmanList[id].cursor = state;
			stickmanList[id].stickman.x = state.x;
			stickmanList[id].stickman.y = state.y;
			stickmanList[id].stickman.angle = state.angle;
			stickmanList[id].update();
		}
	}
} 

//var game = new Phaser.Game(1600, 800, Phaser.AUTO, '', { preload: preload, create: create, update: update });

//to Set up eurecaclient
var game = new Phaser.Game(1600, 800, Phaser.AUTO, '', { preload: preload, create: eurecaClientSetup, update: update});

StickMan = function(index, game, player) {
	this.cursor = {
		left:false,
		right: false,
		up: false,
		fire: false
	}

	this.input = {
		left:false,
		right:false,
		up:false,
		fire:false
	}

	var x = 0;
	var y = 0;

	this.game = game;
	this.health = 30;
	this.player = player;
	this.bullets = game.add.group();
	this.bullets.enableBody = true;
	this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
	this.bullets.createMultiple(20, 'bullet', 0, false);
	this.bullets.setAll('anchor.x', 0.5);
	this.bullets.setAll('anchor.y', 0.5);
	this.bullets.setAll('outOfBoundsKill', true);
	this.bullets.setAll('checkWorldBounds', true);

	this.currentSpeed = 0;
	this.fireRate = 500;
	this.nextFire = 0;
	this.alive = true;

	this.stickman = game.add.sprite(x, y,'dude');
	this.stickman.anchor.set(0.5);
	this.stickman.id = index;
	game.physics.enable(this.stickman, Phaser.Physics.ARCADE);
	this.stickman.body.immovable = false;
	this.stickman.body.collideWorldBounds = true;

	this.stickman.angle = 0;
	    
    // player properties
    this.stickman.body.bounce.y = 0.2;
    this.stickman.body.gravity.y = 200;
    this.stickman.body.collideWorldBounds = true;

    // walking right or left
    this.stickman.animations.add('left', [0, 1, 2, 3], 10, true);
    this.stickman.animations.add('right', [5, 6, 7, 8], 10, true);


	game.physics.arcade.velocityFromRotation(this.stickman.rotation, 0, this.stickman.body.velocity);
};

StickMan.prototype.update = function() {
	var inputChanged = (
			this.cursor.left != this.input.left ||
			this.cursor.right != this.input.right ||
			this.cursor.up != this.input.up ||
			this.cursor.fire != this.input.fire
	);

	if(inputChanged)
	{
		//Send values to server
		if(this.stickman.id == myId)
		{
			this.input.x = this.stickman.x;
			this.input.y = this.stickman.y;
			this.input.angle = this.stickman.angle;

			eurecaServer.handleKeys(this.input);
		}
		//Right now does not immediately update gun rotation, not that we have a sprite for it
	}

	if(this.cursor.left)
	{
		this.stickman.body.velocity.x = -150;

		this.stickman.animations.play('left');
		this.facing = 'left';
	}
	else if (this.cursor.right)
	{
		this.stickman.body.velocity.x = 150;
		this.stickman.animations.play('right');
		this.facing = 'right';
	}
	else
	{
		this.stickman.animations.stop();
		this.stickman.body.velocity.x = 0;
		if(this.facing == 'left')
		{
			player.frame = 0;
		}
		else
		{
			player.frame = 7;
		}
	}
	if(this.cursor.up && this.stickman.body.touching.down)
	{
		this.stickman.body.velocity.y = -350;
	}
	if (this.cursor.fire)
	{
		this.fire({x:this.cursor.tx, y:this.cursor.ty});
	}
	
}

StickMan.prototype.fire = function(target)
{
	if(!this.alive) return;
	if(this.game.time.now > this.nextFire && this.bullets.countDead() > 0)
	{
		this.nextFire = this.game.time.now + this.fireRate;
		var bullet = this.bullets.getFirstDead();
		bullet.reset(this.stickman.x, this.stickman.y);
		bullet.rotation = this.game.physics.arcade.moveToObject(bullet, target, 500);
	}
}

StickMan.prototype.kill = function()
{
	this.alive = false;
	this.stickman.kill();
}
	
function preload() {

   /**
    game.load.image('sky', 'assets/sky2.png');
    game.load.image('ground', 'assets/platform.png');
    game.load.image('gun', 'assets/smalltempgun.png');
    game.load.image('bullet', 'assets/pbullet.gif');
    game.load.spritesheet('dude', 'assets/dude.png', 32, 48); 
    **/
    
    game.load.image('sky', 'www/assets/sky2.png');
    game.load.image('ground', 'www/assets/platform.png');
    game.load.image('gun', 'www/assets/smalltempgun.png');
    game.load.image('bullet', 'www/assets/pbullet.gif');
    game.load.spritesheet('dude', 'www/assets/dude.png', 32, 48); 
    

}
    
//var player;
var platforms;
//var cursors;
var facing;


var guns;    
var hasGun = 0;
    
var bullet;    
var bullets;
var bulletTime = 0;


//var myId = 0;


function create() {
    
    //  enable arcade physics system
    game.physics.startSystem(Phaser.Physics.ARCADE);
	game.stage.disableVisibilityChange = true;
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

	
    // player settings
	stickmanList = {};
	player = new StickMan(myId, game, stickman);
	stickmanList[myId] = player;
	stickman = player.stickman;
	stickman.x = 0;
	stickman.y = 0;
	bullets = player.bullets;
    //player = game.add.sprite(32, game.world.height - 150, 'dude');
    // enable physics on player
    //game.physics.arcade.enable(player);
    //guns
    guns = game.add.group();


    guns.enableBody = true;


    for (var i = 0; i < 4; i++)
    {
        var gun = guns.create(i * 250, 277, 'gun');
    }
    
    gun = guns.create(1200, 475, 'gun');
    gun = guns.create(850, 77, 'gun');
	
    /*
    //bullets
    bullets = game.add.group();
    //game.physics.enable(bullets,Phaser.Physics.ARCADE);
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    //bullets.createMultiple(30, 'bullet', 0, false);
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 0.5);
    bullets.setAll('outOfBoundsKill', true);
    bullets.setAll('checkWorldBounds', true);

    */

    //  controls.
    cursors = game.input.keyboard.createCursorKeys();
    spaceBar = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    
    
}

function update() {
    
    //Do not update if client is not ready in Eureca
    if (!ready) return;
	console.log("Update!");

	player.input.left = cursors.left.isDown;
	player.input.right = cursors.right.isDown;
	player.input.up = cursors.up.isDown;
	player.input.fire = game.input.activePointer.isDown;
	player.input.tx = game.input.x+ game.camera.x;
	player.input.ty = game.input.y+ game.camera.y;
	
    game.physics.arcade.collide(stickman, platforms);
    game.physics.arcade.collide(guns, platforms);
    for(var i in stickmanList)
	{
		if(!stickmanList[i]) continue;
		var curBullets = stickmanList[i].bullets;
		var curStickman = stickmanList[i].stickman;
		for(var j in stickmanList)
		{
			if(!stickmanList[j]) continue;
			if(j!=i)
			{
				var targetStickman = stickmanList[j].stickman;
				game.physics.arcade.overlap(curBullets, targetStickman, bulletHitPlayer, null, this);
			}
			if(stickmanList[j].alive)
			{
				stickmanList[j].update();
				game.physics.arcade.collide(stickmanList[j].stickman, platforms);
				game.physics.arcade.overlap(stickmanList[j].stickman, guns, collectGun, null, this);
			}
		}
	}


     //  Checks to see if the player overlaps with any of the guns, if he does call the collectGun function
    game.physics.arcade.overlap(stickman, guns, collectGun, null, this);
    
}

function collectGun (player, gun) {
    
    // Removes the gun from the screen
    
    gun.kill();
    hasGun = 1;


}

function fireBullet () {
    // Ensure that player has a gun before he is able to shoot  
    // To avoid players being allowed to fire too fast a time limit is set
    if(hasGun == 1){
        if (game.time.now > bulletTime)
        {
            //  Grab the first bullet we can from the pool
            //bullet = bullets.getFirstExists(false);
            if (facing == 'right')
            {
                bullet = bullets.create(player.x+20, player.y+20, 'bullet');
                bullet.body.velocity.x = 400;
            bulletTime = game.time.now + 200;
            }
            
            if (facing == 'left')
            {
                bullet = bullets.create(player.x-20, player.y+20, 'bullet');
                bullet.body.velocity.x = -400;
            bulletTime = game.time.now + 200;
            }
        }
    }
}


function bulletHitPlayer(player, bullet){
    bullet.kill();
}
