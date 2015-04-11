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

var GAME_WIDTH = 1600;
var GAME_HEIGHT = 800;
//this function will handle client communication with the server
var eurecaClientSetup = function(){
 
    //create an instance of eureca.io client
    var eurecaClient = new Eureca.Client();
    
    eurecaClient.ready(function (proxy) {       
        eurecaServer = proxy;
    });

    //All methods defined under the exports namespace are available
    //for remote process calling (Server is able to call these client functions)
    //Set player ID from server, create the game, run server handshake. 
    eurecaClient.exports.setId = function(id)
    {
        myId = id;
        console.log('This player id is ', id);
        create();
        eurecaServer.handshake();
        ready = true;
    };
    //When a stickman dies on the server, send the kill notification
    eurecaClient.exports.kill = function(id)
    {
        if(stickmanList[id])
        {
            stickmanList[id].kill();
            console.log('killing ', id, stickmanList[id]);
        }
    };
    //Spawn another client, provided its not this client itself, indicating error.
    eurecaClient.exports.spawnEnemy = function(i, x, y)
    {
        if (i == myId) return;
        console.log('SPAWN new stickman at ',x,' ',y);
        console.log('ID is ', i);
        var stckman = new StickMan(i, game, stickman, x, y); //NOTE SPELLING not that it matters since this is enclosed
        stickmanList[i] = stckman;
    };
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
    };  
    
}

StickMan = function(index, game, player, serverx, servery) {
    this.cursor = {
		left:false,
		right: false,
		up: false,
		fire: false
	};

	this.input = {
		left:false,
		right:false,
		up:false,
		fire:false
	};
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
	if (this.cursor.fire && this.stickman.alive !== false) //Fire in the direction of the cursor position 
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

var game = new Phaser.Game(1600, 800, Phaser.AUTO, '', { preload: preload, create: startgame, update: update});


function startgame(){
    // set scale options
    
    //eurecaClientSetup();
    
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;
    game.scale.setScreenSize(true);
    
    // display images
    game.add.sprite((GAME_WIDTH-500)/2, 30, 'title');
    game.add.sprite((GAME_WIDTH)/2-500, 350,'figure');
    // add the button that will start the game
    game.add.button(GAME_WIDTH-401-200, GAME_HEIGHT-143-50, 'button-start', eurecaClientSetup, 1, 0, 2);

}

function preload(){
     // preload the loading indicator first before anything else
    game.load.image('preloaderBar', 'www/assets/loading-bar.png');
    
    // set background color and preload image
    game.stage.backgroundColor = '#FFFFFF';
   
    game.load.image('title', 'www/assets/gravitaslogo.png');
    game.load.image('figure', 'www/assets/stickman.png');
    game.load.spritesheet('button-start', 'www/assets/button-start.png', 401, 143);       
    
    game.load.image('sky', 'www/assets/sky2.png');
    game.load.image('ground', 'www/assets/platform.png');
    game.load.image('gun', 'www/assets/smallgun1.png');
    game.load.image('bullet', 'www/assets/pbullet.gif');
    game.load.spritesheet('healthBar','www/assets/healthbar.png' , 32,35.2); 
    game.load.spritesheet('dude', 'www/assets/stickman288x48.png', 32, 48);   

}

function create(){
        //  enable arcade physics system
        game.physics.startSystem(Phaser.Physics.ARCADE); 
        game.stage.disableVisibilityChange = true;
       
        var background = game.add.sprite(0,0,'sky');
        //  scalling background
        background.scale.set(2,2);

        //  this group will contain all stage objects
        platforms = game.add.group();

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
        cursors = game.input.keyboard.createCursorKeys();
        spaceBar = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
};


function update(){
            //Do not update if client is not ready in Eureca
        if (!ready) return;

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
			//For every stickman, check if their bullets collide with platform.
			game.physics.arcade.collide(curBullets, platforms, destroyBullets, null, this);
            for(var j in stickmanList)
            {
				//For each stickman other than the current considered one, check if their bullet hit someone other than them
                if(!stickmanList[j]) continue;
                if(j!=i)
                {   
                    var targetStickman = stickmanList[j].stickman;
                    game.physics.arcade.overlap(curBullets, targetStickman, bulletHitPlayer, null, this);
					               }
                if(stickmanList[j].alive)
                {
                    stickmanList[j].update(); //Based on last known key states, update all alive stickmen
                    game.physics.arcade.collide(stickmanList[j].stickman, platforms);
                    game.physics.arcade.overlap(stickmanList[j].stickman, collectGun, null, this);

                }
            }
        }

         //  Checks to see if the player overlaps with any of the guns, if he does call the collectGun function
    game.physics.arcade.overlap(stickman, guns, collectGun, null, this);
	//Check to see if the bullets hit platforms; if so, destroy the bullets.
        game.physics.arcade.collide(bullets, platforms, destroyBullets, null, this);  
        
};   



function collectGun(player,gun){
        // Removes the gun from the screen  
        gun.kill();
        hasGun = 1;
    
};  

function destroyBullets(bullets,platforms){
        bullets.kill(); 
}


function fireBullets(){
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
        
    player.health = player.health - 10;

    if (player.health <= 0){
        player.kill();
    }
    bullet.kill();

}