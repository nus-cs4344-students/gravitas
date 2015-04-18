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
var platforms;
var facing;
var readyToMove=false;
var guns;    
var hasGun = 0;

var bullet;    
var bulletTime = 0;

var ready = false;

var eurecaServer;
var room;

var GAME_WIDTH = 1600;
var GAME_HEIGHT = 800;

var spriteToBeRotated;
var left;
var right;
var up;
var down;
var shift;
//var angle = 0;
var countClockwise;
var countAntiClockwise;



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
		eurecaServer.joinRoom(myId);
        eurecaServer.provideRoomInfo(id);
        create();
        console.log("sending server my id to find my room");
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
    eurecaClient.exports.spawnEnemy = function(i, x, y, angle)
    {
        if (i == myId) return;
        console.log('SPAWN new stickman at ',x,' ',y,'hello',angle);
        console.log('ID is ', i);
        for(var c=0; c< room.length; c++){
            var enemyid = room[c];
            console.log("enemy id", enemyid);
            if (enemyid === i){
                var stckman = new StickMan(i, game, stickman, x, y,angle); //NOTE SPELLING not that it matters since                  this is enclosed;
                stickmanList[i] = stckman;
            }
        }

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
	eurecaClient.exports.roomStatus = function(roomlength)
	{
		console.log("Room has ", roomlength, " players.");
	};
    
    eurecaClient.exports.getRoomInfo = function(room1)
    {
    console.log(room1);
    console.log("get room info");    
     room = room1;   
    };

	eurecaClient.exports.readyUp = function()
	{
		readyToMove = true;
	};
    
    
};


StickMan = function(index, game, player, serverx, servery, sangle) {
    //this.id = index;
    
    this.cursor = {
		left:false,
		right: false,
		up: false,
        down: false,
		fire: false,
        rotateClockwise: false,
        rotateAntiClockwise: false,
        shift: false
	};

	this.input = {
		left:false,
		right:false,
		up:false,
        down: false,
		fire:false,
        rotateClockwise: false,
        rotateAntiClockwise: false,
        shift: false
	};
    
    this.count = {
        countClockwise: false,
        countAntiClockwise: false
        
    };
    
    
	//Zero if originally not present on server, as specified in server.js;
	//Other values if spawned.
	var x = serverx;
	var y = servery;
	
	this.game = game;
	//this.health = 30;
	this.player = player;
	this.bullets = game.add.group();
	this.bullets2 = game.add.group();
	this.bullets.enableBody = true;
	this.bullets2.enableBody = true;
	this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
	this.bullets2.physicsBodyType = Phaser.Physics.ARCADE;
	this.bullets.createMultiple(5, 'bullet', 0, false); //quantity, key, frame, default exists state (false, since it doesn't exist until created).
	this.bullets.setAll('anchor.x', 0.5); 
	this.bullets.setAll('anchor.y', 0.5);
	//Kill bullets when they leave the boundaries of the world
	this.bullets.setAll('outOfBoundsKill', true);
	this.bullets.setAll('checkWorldBounds', true);
	this.bullets2.createMultiple(20, 'bullet', 0, false); //quantity, key, frame, default exists state (false, since it doesn't exist until created).
	this.bullets2.setAll('anchor.x', 0.5); 
	this.bullets2.setAll('anchor.y', 0.5);
	//Kill bullets when they leave the boundaries of the world
	this.bullets2.setAll('outOfBoundsKill', true);
	this.bullets2.setAll('checkWorldBounds', true);


	this.currentSpeed = 0;
	this.fireRate = 500; //Milliseconds before another firing
	this.nextFire = 0;
	this.alive = true;
	this.guntype = "";

	spriteToBeRotated = this.stickman = game.add.sprite(x, y,'dude');
	console.log("Spawning new stickman at ",x," ",y);
	this.stickman.frame = 4;
	this.stickman.anchor.set(0.5);
	this.stickman.id = index;
	game.physics.enable(this.stickman, Phaser.Physics.ARCADE);
	this.stickman.body.immovable = false;
	//this.stickman.body.collideWorldBounds = true;

	this.stickman.angle = sangle;    
    // player properties
    this.stickman.body.bounce.y = 0.2;
    this.stickman.body.gravity.y = 200;
    this.stickman.body.collideWorldBounds = true;

    //stats
    var style = { font: "20px Arial", fill: "#fff"};
    this.stickman.health = 100;
    this.game.add.text(10, 20, "Health:", style);
    this.healthText = this.game.add.text(80, 20, "", style);


    // walking right or left
    this.stickman.animations.add('left', [0, 1, 2, 3], 10, true);
    this.stickman.animations.add('right', [5, 6, 7, 8], 10, true);

	game.physics.arcade.velocityFromRotation(this.stickman.rotation, 0, this.stickman.body.velocity);
};

StickMan.prototype.snapShot = function() {
	this.input.left = false;
	this.input.right = false;
	this.input.up = false;

	this.input.fire = false;
    this.rotateClockwise = false;
    this.rotateAntiClockwise = false;
    this.shift = false;
    
    this.count.countClockwise = false;
    this.count.countAntiClockwise = false;
    
    
	this.input.tx = 0;
	this.input.ty = 0;
    this.input.x = this.stickman.x;
	this.input.y = this.stickman.y;
    
    
	this.input.angle = 0;
	console.log("snapShot: ");
	console.log(this.input);
	eurecaServer.handleKeys(this.input);
};

StickMan.prototype.update = function() {
	var inputChanged = (
			this.cursor.left != this.input.left ||
			this.cursor.right != this.input.right ||
			this.cursor.up != this.input.up ||
            (this.cursor.rotateClockwise != this.input.rotateClockwise  &&  this.cursor.shift!= this.input.shift)||
         (this.cursor.rotateAntiClockwise != this.input.rotateAntiClockwise &&  this.cursor.shift!= this.input.shift)||
			this.cursor.fire != this.input.fire
	);   
    
    //var clockwiseRotationChanged = this.input.rotateClockwise  &&  this.input.shift;
   // var anticlockwiseRotationChanged = this.input.rotateAntiClockwise &&  this.input.shift;
        
    
	if(stickman == this.stickman)
	this.healthText.text = this.stickman.health; //Update health every time this is called.
    
	if(inputChanged && readyToMove )
	{
		//Send values to server
		if(this.stickman.id == myId)
		{
			this.input.x = this.stickman.x;
			this.input.y = this.stickman.y;
            this.input.angle = this.stickman.angle;
                     
            console.log("angle", this.stickman.angle);
            /**
            if((this.count.countClockwise == 0 && clockwiseRotationChanged) || 
                    this.count.countAntiClockwise == 0 && anticlockwiseRotationChanged){
                this.input.angle = this.stickman.angle;
                if(clockwiseRotationChanged){
                    this.count.countClockwise = true;
                    console.log("start rotating clockwise");
                }
                else if(anticlockwiseRotationChanged){
                    this.countAntiClockwise = true;
                    console.log("start rotating anticlockwise");
                }
            }
            
           else if((this.countClockwise == 1 && !clockwiseRotationChanged) || this.countAntiClockwise == 1 && !anticlockwiseRotationChanged){
                this.input.angle = this.stickman.angle;
                if(!clockwiseRotationChanged){
                    this.countClockwise = false;
                    console.log("stop rotating clockwise");
                }
                else if(!anticlockwiseRotationChanged){
                    this.countAntiClockwise = false;
                    console.log("stop rotating anticlockwise");
                }
            
            }
            **/
            // whenever there is a change in user input, the client will call
            // the server side handleKeys function. The handleKeys function will 
            // in turn invoke the client updateState function. The updateState function
            // will then update all the stickmans in a client's game.
			eurecaServer.handleKeys(this.input);
			//Besides these three values, tx and ty are updated.
			//angle is not currently useful, and should always be 0.
		}
		//Right now does not immediately update gun rotation, not that we have a sprite for it
	}
    
    
    //if(this.cursor.rotateClockwise){
    if(this.cursor.rotateClockwise && this.cursor.shift){
        //console.log("rotateclockwise");
        this.stickman.angle +=1;
        //console.log("after",this.stickman.angle);
    }
    else if(this.cursor.rotateAntiClockwise && this.cursor.shift){
        //console.log("rotateAnticlockwise");
        this.stickman.angle -=1;
        //console.log("after",this.stickman.angle);
    }
    
	else if(this.cursor.left)
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
		this.stickman.frame = 4;
		this.stickman.animations.stop();
		this.stickman.body.velocity.x = 0;
		if(this.facing == 'left')
		{
		//	this.stickman.frame = 0;
		}
		else if(this.facing == 'right')
		{
		//	this.stickman.frame = 7;
		}
		else if(this.facing == 'center')
		{
			this.stickman.frame = 4;
		}
	}


    //For the up key - JUMP 
    //stick to the ground
	if( (this.stickman.angle <= 45 && this.stickman.angle >=0
                ||this.stickman.angle < 0 && this.stickman.angle >= -45) && this.cursor.up && this.stickman.body.touching.down)
	{
		this.stickman.body.velocity.y = -350;
        this.stickman.body.velocity.x = 0;
	}
    //stick to the sky
    else if( (this.cursor.up &&this.stickman.body.touching.up) ||  (this.cursor.up && this.stickman.body.blocked.up) ){
        this.stickman.body.velocity.y = 350;
        this.stickman.body.velocity.x = 0;
    }
    //touching left ledges or left boundary the game
    else if ( (this.stickman.angle <= 135 && this.stickman.angle >45 && this.cursor.up  && this.stickman.body.touching.left)
        ||  (this.stickman.angle <= 135 && this.stickman.angle >45 && this.cursor.up  && this.stickman.body.blocked.left) ){
        this.stickman.body.velocity.x = 1000;

        /**console.log("this.stickman.body.blocked.up",this.stickman.body.blocked.up);
        console.log("this.stickman.body.blocked.down", this.stickman.body.blocked.down);
        console.log("this.stickman.body.blocked.left", this.stickman.body.blocked.left);
        console.log("this.stickman.body.blocked.right", this.stickman.body.blocked.right); **/

        //console.log("this.stickman.body.touching.up",this.stickman.body.touching.up);
        //console.log("this.stickman.body.touching.down", this.stickman.body.touching.
        //console.log("this.stickman.body.touching.left")
        //console.log("this.stickman.body.touching.right", this.stickman.body.touching.right);
    }
     //touching right ledges or right boundary the game
    else if( (this.stickman.angle< -45 && this.stickman.angle >= -135 && this.cursor.up && this.stickman.body.touching.right)
        || (this.stickman.angle< -45 && this.stickman.angle >= -135 && this.cursor.up && this.stickman.body.blocked.right) ){
        this.stickman.body.velocity.x = 1000;
    }



    //console.log("this.stickman.body.touching.left: ", this.stickman.body.touching.left);
    //console.log("this.stickman.body.blocked.left: ",this.stickman.body.blocked.left);


    //For the left keys - move towards left

    //stick to the ground
    if( (this.stickman.angle <= 45 && this.stickman.angle >=0
                ||this.stickman.angle < 0 && this.stickman.angle >= -45) && this.cursor.left && this.stickman.body.touching.down)
    {
         this.stickman.body.velocity.x = -350;
    }
    //stick to the sky 
    else if( (this.cursor.up &&this.stickman.body.touching.up) ||  (this.cursor.left && this.stickman.body.blocked.up) ){
          this.stickman.body.velocity.x = -350;
    }

    //touching left ledges or left boundary the game
    else if( (this.stickman.angle <= 135 && this.stickman.angle >45 && this.cursor.left  && this.stickman.body.touching.left)
        ||  (this.stickman.angle <= 135 && this.stickman.angle >45 && this.cursor.left  && this.stickman.body.blocked.left) ){
        console.log("move towards left for left ledge");
        this.stickman.body.velocity.y = -500;
    }
     //touching right ledges or right boundary the game
    else if( (this.stickman.angle< -45 && this.stickman.angle >= -135 && this.cursor.left && this.stickman.body.touching.right)
        || (this.stickman.angle< -45 && this.stickman.angle >= -135 && this.cursor.left && this.stickman.body.blocked.right) ){
         console.log("move towards left for right ledge");
        this.stickman.body.velocity.y = 500;
    }



  //For the right keys - move towards right

    //stick to the ground
    if( (this.stickman.angle <= 45 && this.stickman.angle >=0
                ||this.stickman.angle < 0 && this.stickman.angle >= -45) && this.cursor.right && this.stickman.body.touching.down)
    {
         this.stickman.body.velocity.x = 350;
    }
    //stick to the sky 
    else if( (this.cursor.up &&this.stickman.body.touching.up) ||  (this.cursor.right && this.stickman.body.blocked.up) ){
          this.stickman.body.velocity.x = 350;
    }
    //touching left ledges or left boundary the game
    else if ( (this.stickman.angle <= 135 && this.stickman.angle >45 && this.cursor.right  && this.stickman.body.touching.left)
        ||  (this.stickman.angle <= 135 && this.stickman.angle >45 && this.cursor.right  && this.stickman.body.blocked.left) ){
        console.log("move towards right for left ledge");
        this.stickman.body.velocity.y = 500;
    }
     //touching right ledges or right boundary the game
    else if( (this.stickman.angle< -45 && this.stickman.angle >= -135 && this.cursor.right && this.stickman.body.touching.right)
        || (this.stickman.angle< -45 && this.stickman.angle >= -135 && this.cursor.right && this.stickman.body.blocked.right) ){
         console.log("move towards right for right ledge");
        this.stickman.body.velocity.y = -500;
    }





    /**
    else if( (this.cursor.up && this.stickman.body.touching.left) ||   (this.cursor.up && this.stickman.body.blocked.left)   ){
        console.log("left");
        this.stickman.body.gravity.x = 20000;
        this.stickman.body.gravity.y = 0;

    }

    else if( (this.cursor.up && this.stickman.body.touching.right) ||   (this.cursor.up && this.stickman.body.blocked.right)   ){
        console.log("right");
        this.stickman.body.gravity.x = -20000; 
        this.stickman.body.gravity.y = 0;
    
    } **/




	if (this.cursor.fire && this.stickman.alive !== false) //Fire in the direction of the cursor position 
	{
		this.fire({x:this.cursor.tx, y:this.cursor.ty}); //Values to be sent to server include these, as part of this.input as declared in update() 
        //console.log("FIREEEE");
	}

     //console.log("stickman angle",this.stickman.angle)
         //stick to the sky   
     
     

     
     
     if(this.stickman.angle <= 180 && this.stickman.angle > 135 
                || this.stickman.angle < -135 && this.stickman.angle >= -180 ){


                this.stickman.body.gravity.y = -200;
                this.stickman.body.gravity.x = 0;
               
                //if(down.isDown){
                /** if(this.input.down.isDown){
                    console.log("stickman down");
                    this.stickman.body.velocity.y = 200;
                    this.stickman.body.velocity.x = 0;
                } **/ 
                //if(left.isDown && !shift.isDown){
                
               // console.log("this.stickman.body.blocked.up : ",this.stickman.body.blocked.up);
                // console.log("this.stickman.body.touching.up : ", this.stickman.body.touching.up);

                /**
         
               if(this.input.left && !this.input.shift && this.stickman.body.blocked.up
                 || this.input.left && !this.input.shift && this.stickman.body.touching.up){
                    console.log("stickman left");
                    this.stickman.body.velocity.x = -150;
                    this.stickman.body.velocity.y = 0;
                }
                //else if(right.isDown && !shift.isDown){
                else if(this.input.right && !this.input.shift && this.stickman.body.blocked.up 
                       || this.input.right && !this.input.shift && this.stickman.body.touching.up){
                    console.log("stickman right");
                    this.stickman.body.velocity.x = 150;
                    this.stickman.body.velocity.y = 0;
                }
                //else if(up.isDown){
                else if(this.input.up && this.stickman.body.blocked.up || this.input.up && this.stickman.body.touching.up ){
                    console.log("stickman up");
                    this.stickman.body.velocity.y = 200;
                    this.stickman.body.velocity.x = 0;      
                }**/
            
                
            } 
            
            
            //stick to the ground
            else if (this.stickman.angle <= 45 && this.stickman.angle >=0
                ||this.stickman.angle < 0 && this.stickman.angle >= -45){
                this.stickman.body.gravity.y = 200;
                this.stickman.body.gravity.x = 0;
                
                /**
                 //if(cursors.right.isDown){
                if(this.input.right.isDown && !this.input.shift.isDown){
                    this.stickman.body.velocity.x = 150;
                    this.stickman.body.velocity.y = 0;
                } 
                //else if(cursors.left.isDown){
                else if(this.input.left.isDown && !this.input.shift.isDown){
                    this.stickman.body.velocity.x = -150;
                    this.stickman.body.velocity.y = 0;
                }
                //else if(cursors.up.isDown){
                else if(this.input.up.isDown){
                    this.stickman.body.velocity.y = -350;
                    this.stickman.body.velocity.x = 0;
                }
                //else if(cursors.down.isDown){
                else if(this.input.down.isDown){
                    this.stickman.body.velocity.y = 350;
                    this.stickman.body.velocity.x = 0;
                } **/
                
                
                    
            }
        
            //stick to the left wall
            else if (this.stickman.angle <= 135 && this.stickman.angle >45){
                //console.log("angle in 45,135", curStickman.angle);
                this.stickman.body.gravity.y = 0;
                this.stickman.body.gravity.x = -10000;  
                
                /**
                //if(cursors.right.isDown){
                if(this.input.right.isDown && !this.input.shift.isDown){
                    this.stickman.body.gravity.x = 20000;
                    this.stickman.body.gravity.y = 0;
                } 
                //if(cursors.left.isDown){
                else if(this.input.left.isDown && !this.input.shift.isDown){
                    this.stickman.body.gravity.x = -20000;
                    this.stickman.body.gravity.y = 0;
                }    
                //else if(cursors.up.isDown){
                else if(this.input.up.isDown){
                    this.stickman.body.velocity.y = -150;
                    this.stickman.body.velocity.x =0;
                }
                //else if(cursors.down.isDown){
                else if(this.input.down.isDown){
                    this.stickman.body.velocity.y = 150;
                    this.stickman.body.velocity.x =0;
                } 
                **/
                
                
            }
            
            //stick to the right wall
            else if(this.stickman.angle< -45 && this.stickman.angle >= -135){
                console.log("this.angle");
                this.stickman.body.gravity.y = 0;
                this.stickman.body.gravity.x = 10000;
                
                /**
                //if(cursors.left.isDown){
                if(this.input.left.isDown && !this.input.shift.isDown){
                    this.stickman.body.gravity.x = -20000; 
                    this.stickman.body.gravity.y = 0;
                }
                //if(cursors.right.isDown){
                if(this.input.right.isDown && !this.input.shift.isDown){
                    this.stickman.body.gravity.x  = 20000; 
                    this.stickman.body.gravity.y = 0;
                }
                //else if(cursors.up.isDown){
                else if(this.input.up.isDown){
                    this.stickman.body.velocity.y = -150;
                    this.stickman.body.velocity.x =0;
                }
                //else if(cursors.down.isDown){
                else if(this.input.down.isDown){
                    this.stickman.body.velocity.y = 150;
                    this.stickman.body.velocity.x =0;
                }  **/     
            }

};

StickMan.prototype.fire = function(target)
{
	//Fire only when the interval calls for it
	var bulletspeed=0;
	var bullettype;
	if(!stickman.alive) return;
	if(!stickman.guntype) return;
	console.log(stickman.guntype);
	if(stickman.guntype == 'gun')
	{
		this.fireRate = 800;
		bulletspeed = 500;
		bullettype = 1;
	}
	else if(stickman.guntype == 'gun2')
	{
		this.fireRate = 1000;
		bulletspeed = 800;
		bullettype = 2;
	}
	else if(stickman.guntype == 'gun3')
	{
		this.fireRate = 100;
		bulletspeed = 300;
		bullettype = 1;
	}
	if(this.game.time.now > this.nextFire && this.bullets.countDead() > 0)
	{
		this.nextFire = this.game.time.now + this.fireRate;
		var bullet = this.bullets.getFirstDead();
		bullet.reset(this.stickman.x, this.stickman.y);
		bullet.rotation = this.game.physics.arcade.moveToObject(bullet, target, bulletspeed);
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
	game.load.image('gun2', 'www/assets/smallgun2.png');
	game.load.image('gun3', 'www/assets/smallgun3.png');
	game.load.image('gun4', 'www/assets/smallgun4.png');
	game.load.image('gun5', 'www/assets/smallgun5.png');
    game.load.image('bullet', 'www/assets/pbullet.gif');
    game.load.spritesheet('healthBar','www/assets/healthbar.png' , 32,35.2); 
    game.load.spritesheet('dude', 'www/assets/stickman288x48.png', 32, 48);   

}

function create(){
    
    //rotateClockwise = game.input.keyboard.addKey(Phaser.Keyboard.A);
    //rotateAntiClockwise = game.input.keyboard.addKey(Phaser.Keyboard.D);
    
    //cursors = game.input.keyboard.createCursorKeys();
    left = game.input.keyboard.addKey(Phaser.Keyboard.A);
    right = game.input.keyboard.addKey(Phaser.Keyboard.D);
    up = game.input.keyboard.addKey(Phaser.Keyboard.W);
    down = game.input.keyboard.addKey(Phaser.Keyboard.S);
    
    
    //rotateClockwise = cursors.right;
    //rotateAntiClockwise = cursors.left;
    rotateClockwise = right;
    rotateAntiClockwise = left;
    
    //control = game.input.keyboard.addKey(Phaser.Keyboard.CONTROL);
    shift = game.input.keyboard.addKey(Phaser.Keyboard.SHIFT);

    // enable arcade physics system
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
    var ground = platforms.create(0, game.world.height - 64, 'ground');
    // Scale it to fit the width of the game (the original sprite is 400x32 in size)
    ground.scale.setTo(4, 2);

    //  This stops it from falling away when you jump on it
    ground.body.immovable = true;

    // bottom ledge
    var ledge1 = platforms.create(600,500, 'ground');
    ledge1.scale.setTo(0.6,0.1);
    ledge1.body.immovable = true;

    // middle ledge
    var ledge2 = platforms.create(400,300, 'ground'); //x, y from left, sprite
    ledge2.scale.setTo(0.4,0.1); //Length, thickness
    ledge2.body.immovable = true;

    // top ledge
    var ledge3 = platforms.create(700, 100, 'ground');
    ledge3.scale.setTo(0.5,0.1);
    ledge3.body.immovable = true;

	var ledge4 = platforms.create(1000, 250, 'ground');
	ledge4.scale.setTo(0.1, 0.1);
	ledge4.body.immovable = true;

	var ledge5 = platforms.create(1070, 300, 'ground');
	ledge5.scale.setTo(0.1, 0.1);
	ledge5.body.immovable = true;

	var ledge6 = platforms.create(1140, 350, 'ground');
	ledge6.scale.setTo(0.1, 0.1);
	ledge6.body.immovable = true;

	var ledge7 = platforms.create(1210, 400, 'ground');
	ledge7.scale.setTo(0.1, 0.1);
	ledge7.body.immovable = true;

	var ledge8 = platforms.create(200, 420, 'ground');
	ledge8.scale.setTo(0.1, 0.1);
	ledge8.body.immovable = true;

	var ledge9 = platforms.create(50, 120, 'ground');
	ledge9.scale.setTo(0.5, 0.1);
	ledge9.body.immovable = true;

	var ledge10 = platforms.create(1200, game.world.height-150, 'ground');
	ledge10.scale.setTo(0.02, 5);
	ledge10.body.immovable = true;

	var ledge11 = platforms.create(1400, 100, 'ground');
	ledge11.scale.setTo(0.3, 0.1);
	ledge11.body.immovable = true;

	var ledge12 = platforms.create(1520, 100, 'ground');
	ledge12.scale.setTo(0.01, 5);
	ledge12.body.immovable = true;

	var ledge13 = platforms.create(1400, 200, 'ground');
	ledge13.scale.setTo(0.3, 0.1);
	ledge13.body.immovable = true;

	var ledge14 = platforms.create(500, game.world.height - 90, 'ground');
	ledge14.scale.setTo(.5, 1);
	ledge14.body.immovable = true;

	var ledge15 = platforms.create(0, 600, 'ground');
	ledge15.scale.setTo(0.3, 0.1);
	ledge15.body.immovable = true;

	var ledge16 = platforms.create(1480, 600, 'ground');
	ledge16.scale.setTo(0.3, 0.1);
	ledge16.body.immovable = true;

    // player settings
    stickmanList = {};
	var randomx = game.world.randomX;
	var randomy = game.world.randomY-300;
    player = new StickMan(myId, game, stickman, randomx, randomy);
	console.log("Randomx: ", randomx);
	console.log("Randomy: ", randomy);
    stickmanList[myId] = player;
    stickman = player.stickman;
    //stickman.x = randomx;
    //stickman.y = randomy;
    bullets = player.bullets;
    guns = game.add.group();
	guns2 = game.add.group();
	guns3 = game.add.group();
    guns.enableBody = true;
	guns2.enableBody = true;
	guns3.enableBody = true;

    for (var i = 1; i < 3; i++)
    {
        var gun = guns.create(i * 250, 274, 'gun');
    }

    gun = guns2.create(1560, 634, 'gun2');
    gun = guns3.create(850, 74, 'gun3');
	gun = guns2.create(1400, 70, 'gun2');
	gun = guns.create(800, 510, 'gun');
    
    //  controls.
    //cursors = game.input.keyboard.createCursorKeys();
    //spaceBar = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
	eurecaServer.handshake(myId, stickman.x, stickman.y);
    player.snapShot();

    //spaceBar = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    //game.input.keyboard.addKey(Phaser.Keyboard.W);
    // rotateClockwise = game.input.keyboard.addKey(Phaser.Keyboard.A);
    //game.input.keyboard.addKey(Phaser.Keyboard.S);
    //rotateAntiClockwise = game.input.keyboard.addKey(Phaser.Keyboard.D);
        
        
};


function update(){
            //Do not update if client is not ready in Eureca
        if (!ready) return;

		/**player.input.left = cursors.left.isDown;
        player.input.right = cursors.right.isDown;
        player.input.up = cursors.up.isDown;**/
    
        player.input.left = left.isDown;
        player.input.right = right.isDown;
        player.input.up = up.isDown;
       // player.input.down = down.isDown;
        player.input.fire = game.input.activePointer.isDown;
        player.input.rotateAntiClockwise = rotateAntiClockwise.isDown;
        player.input.rotateClockwise = rotateClockwise.isDown;
        player.input.shift = shift.isDown;  
        player.input.tx = game.input.x+ game.camera.x;
        player.input.ty = game.input.y+ game.camera.y;
    
       game.physics.arcade.collide(stickman, platforms);
       game.physics.arcade.collide(guns, platforms);
	   game.physics.arcade.collide(guns2, platforms);
	   game.physics.arcade.collide(guns3, platforms);
    
        
            console.log("player angle",player.stickman.angle);
            console.log("player update up",player.input.up);
    
    
        
            //stick to the sky
          if(player.stickman.angle <= 180 && player.stickman.angle > 135 
                || player.stickman.angle < -135 && player.stickman.angle >= -180 ){
                player.stickman.body.gravity.y = -200;
                player.stickman.body.gravity.x = 0;
                //player.stickman.body.velocity.x = 0;
                //player.stickman.body.velocity.y = 0;
                
            
                //if(down.isDown){
                /** if(player.input.down.isDown){
                    console.log("player down");
                    player.stickman.body.velocity.y = 200;
                    player.stickman.body.velocity.x = 0;
                }  **/
                //if(left.isDown && !shift.isDown){
                    /**
                if((player.input.left && !player.input.shift && player.stickman.body.blocked.up)
                  || (player.input.left && !player.input.shift && player.stickman.body.touching.up) ){
                    console.log("player left");
                    player.stickman.body.velocity.x = -150;
                    player.stickman.body.velocity.y = 0;
                }
                //else if(right.isDown && !shift.isDown){
                else if( (player.input.right && !player.input.shift && player.stickman.body.blocked.up)
                       || (player.input.right && !player.input.shift && player.stickman.body.touching.up) ){
                    console.log("player right");
                    player.stickman.body.velocity.x = 150;
                    player.stickman.body.velocity.y = 0;
                }
                //else if(up.isDown){
                else if( (player.input.up && player.stickman.body.blocked.up) 
                        || (player.input.up && player.stickman.body.touching.up) ){
                    console.log("player up");
                    player.stickman.body.velocity.y = 200;
                    player.stickman.body.velocity.x = 0;      
                } **/          
            } 
            
            //stick to the ground
            else if (player.stickman.angle <= 45 && player.stickman.angle >=0
                ||player.stickman.angle < 0 && player.stickman.angle >= -45){
                player.stickman.body.gravity.y = 200;
                player.stickman.body.gravity.x = 0;
                
                /**
                 //if(cursors.right.isDown){
                if(player.input.right.isDown && !player.input.shift.isDown){
                    player.stickman.body.velocity.x = 150;
                    player.stickman.body.velocity.y = 0;
                } 
                //else if(cursors.left.isDown){
                else if(player.input.left.isDown && !player.input.shift.isDown){
                    player.stickman.body.velocity.x = -150;
                    player.stickman.body.velocity.y = 0;
                }
                //else if(cursors.up.isDown){
                else if(player.input.up.isDown){
                    player.stickman.body.velocity.y = -350;
                    player.stickman.body.velocity.x = 0;
                }
                //else if(cursors.down.isDown){
                else if(player.input.down.isDown){
                    player.stickman.body.velocity.y = 350;
                    player.stickman.body.velocity.x = 0;
                } **/
                    
            }
        
            //stick to the left wall
            else if (player.stickman.angle <= 135 && player.stickman.angle >45){
                //console.log("angle in 45,135", curStickman.angle);
                player.stickman.body.gravity.y = 0;
                player.stickman.body.gravity.x = -10000;
                
                /**
                //if(cursors.right.isDown){
                if(player.input.right.isDown && !player.input.shift.isDown){
                    player.stickman.body.gravity.x = 20000;
                    player.stickman.body.gravity.y = 0;
                } 
                //if(cursors.left.isDown){
                else if(player.input.left.isDown && !player.input.shift.isDown){
                    player.stickman.body.gravity.x = -20000;
                    player.stickman.body.gravity.y = 0;
                }    
                //else if(cursors.up.isDown){
                else if(player.input.up.isDown){
                    player.stickman.body.velocity.y = -150;
                    player.stickman.body.velocity.x =0;
                }
                //else if(cursors.down.isDown){
                else if(player.input.down.isDown){
                    player.stickman.body.velocity.y = 150;
                    player.stickman.body.velocity.x =0;
                }   **/    
                
            }
            
            //stick to the right wall
            else if(player.stickman.angle< -45 && player.stickman.angle >= -135){
                player.stickman.body.gravity.y = 0;
                player.stickman.body.gravity.x = 10000;
                console.log("player.angle");
                /**
                //if(cursors.left.isDown){
                if(player.input.left.isDown && !player.input.shift.isDown){
                    player.stickman.body.gravity.x = -20000; 
                    player.stickman.body.gravity.y = 0;
                }
                //if(cursors.right.isDown){
                if(player.input.right.isDown && !player.input.shift.isDown){
                    player.stickman.body.gravity.x = 20000; 
                    player.stickman.body.gravity.y = 0;
                }
                //else if(cursors.up.isDown){
                else if(player.input.up.isDown){
                    player.stickman.body.velocity.y = -150;
                    player.stickman.body.velocity.x =0;
                }
                //else if(cursors.down.isDown){
                else if(player.input.down.isDown){
                    player.stickman.body.velocity.y = 150;
                    player.stickman.body.velocity.x =0;
                }  **/     
            }
 
        for(var i in stickmanList)
        {
            if(!stickmanList[i]) continue;
            var curBullets = stickmanList[i].bullets;
            var curStickman = stickmanList[i].stickman;
        
            //console.log("player id", player.id);
            //console.log("stickman id",curStickman.id);
            
            //if (player.id == curStickman.id){
  
            //console.log(curStickman.angle);
            //console.log("gravityx", curStickman.body.gravity.x);
            //console.log("gravityy", curStickman.body.gravity.y);
            //console.log("velx", curStickman.body.velocity.x);
            //console.log("vely", curStickman.body.velocity.y); 
            
            
			//For every stickman, check if their bullets collide with platform.
			game.physics.arcade.collide(curBullets, platforms, destroyBullets, null, this);
			game.physics.arcade.overlap(curStickman, guns, collectGun, null, this);
			game.physics.arcade.overlap(curStickman, guns2, collectGun, null, this);
			game.physics.arcade.overlap(curStickman, guns3, collectGun, null, this);
			game.physics.arcade.collide(curStickman, platforms);
            for(var j in stickmanList)
            {
			//Check if this curStickman hit anyone with its bullets	
                if(!stickmanList[j]) continue;
                if(j!=i)
                {   
                    var targetStickman = stickmanList[j].stickman;
                    game.physics.arcade.overlap(curBullets, targetStickman, bulletHitPlayer, null, this);
				}
                if(stickmanList[j].alive)
                {
                    stickmanList[j].update(); //Based on last known key states, update all alive stickmen

                }
            }
        }
};



function collectGun(player,gun){
        // Removes the gun from the screen  
    gun.kill();
	console.log(gun);
	console.log(gun.key);
	if(gun.key == 'gun')
		player.guntype = 'gun';
	else if(gun.key == 'gun2')
		player.guntype = 'gun2';
	else if(gun.key == 'gun3')
		player.guntype = 'gun3';
    
}  

function destroyBullets(bullets,platforms){
        bullets.kill(); 
}


function bulletHitPlayer(targetStickman, bullet){
	console.log(bullet.key);
	if(bullet.key == 'bullet')
	{
		targetStickman.health = targetStickman.health - 10;
	}
	else
	{
		target.Stickman.health = targetStickman.health - 3;
	}
	if(targetStickman == stickman)
	{
		console.log("I am hit!");
		
	}
	console.log(targetStickman.health);

    if (targetStickman.health <= 0){
        targetStickman.kill();
    }
    bullet.kill();
	
}
