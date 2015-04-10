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

//var player;
var platforms;
//var cursors;
var facing;

var guns;    
var hasGun = 0;

var bullet;    
var bulletTime = 0;

var ready = false;
var eurecaServer;

var Game;

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
		console.log('This player id is ', id);
		create();
		eurecaServer.handshake();
		ready = true;
	}
    	//When a stickman dies on the server, send the kill notification
	eurecaClient.exports.kill = function(id)
	{
		if(stickmanList[id])
		{
			stickmanList[id].kill();
			console.log('killing ', id, stickmanList[id]);
		}
	}
    	//Spawn another client, provided its not this client itself, indicating error.
	eurecaClient.exports.spawnEnemy = function(i, x, y)
	{
		if (i == myId) return;
		console.log('SPAWN new stickman at ',x,' ',y);
		console.log('ID is ', i);
		var stckman = new StickMan(i, Game, stickman, x, y); //NOTE SPELLING not that it matters since this is enclosed
		stickmanList[i] = stckman;
	}
    	//Server calls this to make clients update their state; this function is called x times for each stickman in the list
	eurecaClient.exports.updateState = function(id, state)
	{
		if(stickmanList[id]) {
			stickmanList[id].cursor = state; //left/right/up/fire states
			stickmanList[id].stickman.x = state.x;
			stickmanList[id].stickman.y = state.y;
			stickmanList[id].stickman.angle = state.angle;
			stickmanList[id].update();
		}
	}
};
    
StickMan = function(index, game, player, serverx, servery) {
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
	//Zero if originally not present on server, as specified in server.js;
	//Other values if spawned.
	var x = serverx;
	var y = servery;

	
	this.game = game;
	//this.health = 30;
	this.player = player;
	this.bullets = game.add.group();
	this.bullets.enableBody = true;
	this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
	this.bullets.createMultiple(20, 'bullet', 0, false); //quantity, key, frame, default exists state (false, since it doesn't exist until created).
	this.bullets.setAll('anchor.x', 0.5); 
	this.bullets.setAll('anchor.y', 0.5);
	//Kill bullets when they leave the boundaries of the world
	this.bullets.setAll('outOfBoundsKill', true);
	this.bullets.setAll('checkWorldBounds', true);

	this.currentSpeed = 0;
	this.fireRate = 500; //Milliseconds before another firing
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

    //stats
    var style = { font: "20px Arial", fill: "#fff"};
    this.stickman.health = 100;
    this.game.add.text(10, 20, "Health:", style);
    this.healthText = this.game.add.text(80, 20, "", style);
    //this.refreshStats();


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

			this.healthText.text = this.stickman.health;

            // whenever there is a change in user input, the client will call
            // the server side handleKeys function. The handleKeys function will 
            // in turn invoke the client updateState function. The updateState function
            // will then update all the stickmans in a client's game.

			console.log("Angle is", this.stickman.angle);
			eurecaServer.handleKeys(this.input);
			//Besides these three values, tx and ty are updated.
			//angle is not currently useful, and should always be 0.
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
	if (this.cursor.fire && this.stickman.alive != false) //Fire in the direction of the cursor position 
	{
		this.fire({x:this.cursor.tx, y:this.cursor.ty}); //Values to be sent to server include these, as part of this.input as declared in update() 
	}
	
};

StickMan.prototype.fire = function(target)
{
	//Fire only when the interval calls for it
	if(!stickman.alive) return;
	if(this.game.time.now > this.nextFire && this.bullets.countDead() > 0)
	{
		this.nextFire = this.game.time.now + this.fireRate;
		var bullet = this.bullets.getFirstDead();
		bullet.reset(this.stickman.x, this.stickman.y);
		bullet.rotation = this.game.physics.arcade.moveToObject(bullet, target, 500);
	}
};

StickMan.prototype.kill = function()
{
	this.alive = false;
	this.stickman.kill();
};

//var game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser-example', { preload: preload, create: eurecaClientSetup, update: update, render: render });

function create() {
    
  //  enable arcade physics system
        Game.physics.startSystem(Phaser.Physics.ARCADE); 
        Game.stage.disableVisibilityChange = true;
       
        var background = Game.add.sprite(0,0,'sky');
        //  scalling background
        background.scale.set(2,2);

        //  this group will contain all stage objects
        platforms = Game.add.group();

        // enable physics for any object that is created in this group
        platforms.enableBody = true;

        //  create the ground.
        var ground = platforms.create(0, Game.world.height - 64, 'ground');
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
        player = new StickMan(myId, Game, stickman);
        stickmanList[myId] = player;
        stickman = player.stickman;
        stickman.x = 0;
        stickman.y = 0;
        bullets = player.bullets;
        //player = game.add.sprite(32, game.world.height - 150, 'dude');
        // enable physics on player
        //game.physics.arcade.enable(player);
        //guns
        guns = Game.add.group();


        guns.enableBody = true;


        for (var i = 1; i < 4; i++)
        {
            var gun = guns.create(i * 250, 274, 'gun');
        }

        gun = guns.create(1200, 474, 'gun');
        gun = guns.create(850, 74, 'gun');

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
        cursors = Game.input.keyboard.createCursorKeys();
        spaceBar = Game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
};

function update(){
//do not update if client not ready
	if (!ready) return;
	
	player.input.left = cursors.left.isDown;
	player.input.right = cursors.right.isDown;
	player.input.up = cursors.up.isDown;
	player.input.fire = game.input.activePointer.isDown;
	player.input.tx = game.input.x+ game.camera.x;
	player.input.ty = game.input.y+ game.camera.y;
	
	
	
	turret.rotation = game.physics.arcade.angleToPointer(turret);	
    land.tilePosition.x = -game.camera.x;
    land.tilePosition.y = -game.camera.y;

    	
	
    for (var i in tanksList)
    {
		if (!tanksList[i]) continue;
		var curBullets = tanksList[i].bullets;
		var curTank = tanksList[i].tank;
		for (var j in tanksList)
		{
			if (!tanksList[j]) continue;
			if (j!=i) 
			{
			
				var targetTank = tanksList[j].tank;
				
				game.physics.arcade.overlap(curBullets, targetTank, bulletHitPlayer, null, this);
			
			}
			if (tanksList[j].alive)
			{
				tanksList[j].update();
			}			
		}
    }
};

function bulletHitPlayer(bullet,player){
    
      console.log("before:");

    console.log(player.health);
    player.health -=10;  
    if(player.health<= 0){
        player.kill();
      }
    console.log("after:");
    console.log(player.health);
    bullet.kill();   
}

function collectGun(player,gun){
    gun.kill();
    hasGun = 1;    
};

function destroyBullets(bullets, platforms) {
 bullets.kill();   
}

function fireBullets(){
 if (Game.time.now > bulletTime)
            {
                //  Grab the first bullet we can from the pool
                //bullet = bullets.getFirstExists(false);
                if (facing == 'right')
                {
                    bullet = bullets.create(player.x+20, player.y+20, 'bullet');
                    bullet.body.velocity.x = 400;
                    bulletTime = Game.time.now + 200;
                }
            
                if (facing == 'left')
                {
                    bullet = bullets.create(player.x-20, player.y+20, 'bullet');
                    bullet.body.velocity.x = -400;
                bulletTime = Game.time.now + 200;
                }
            }
        };
    

	