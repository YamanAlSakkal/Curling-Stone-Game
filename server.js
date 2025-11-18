// server.js
const http = require("http");
const fs = require("fs");
const url = require("url");
const path = require("path");
const socketio = require("socket.io");

// Game State - Single End/Game, 4 stones per player, Live Score Tracking
let gameState = {
  homePlayer: null,      
  visitorPlayer: null,   
  currentTurn: "HOME",   
  stones: [],            
  homeScore: 0,          
  visitorScore: 0,       
  liveHomeScore: 0,      
  liveVisitorScore: 0,   
  homeStonesLeft: 4,     
  visitorStonesLeft: 4,  
  gameOver: false       
};

//Physics Constants
const STONE_RADIUS = 15;
const STONE_DIAMETER = STONE_RADIUS * 2;
const HOUSE_RADIUS = 100; 
const FRICTION = 0.985;   
const MIN_SPEED = 0.1;    
const TICK_RATE = 50;     
const RESTITUTION = 0.8;

// File Serving Setup
const ROOT_DIR = path.join(__dirname, "html");
const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css"
};

function getMimeType(filename) {
  return MIME_TYPES[path.extname(filename)] || "text/plain";
}

// HTTP Request Handler
function handler(req, res) {
  let parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname === "/" ? "/index.html" : parsedUrl.pathname;
  let requestedPath;
  try {
      requestedPath = path.join(ROOT_DIR, path.normalize(decodeURIComponent(pathname)));
  } catch (e) {
      res.writeHead(400);
      res.end("Invalid URL path.");
      return;
  }


  //prevent directory traversal
  if (!requestedPath.startsWith(ROOT_DIR + path.sep) && requestedPath !== ROOT_DIR) {
      res.writeHead(403);
      res.end("Forbidden");
      console.warn(`Directory traversal attempt blocked: ${pathname}`);
      return;
  }

  fs.readFile(requestedPath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
          console.log(`File not found: ${requestedPath}`);
          res.writeHead(404);
          res.end("Not Found");
      } else {
          console.error(`Server Error reading file: ${requestedPath}`, err);
          res.writeHead(500);
          res.end("Server Error");
      }
      return;
    }
    res.writeHead(200, { "Content-Type": getMimeType(requestedPath) });
    res.end(data);
  });
}

//create HTTP server and Socket.IO instance
const app = http.createServer(handler);
const io = socketio(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

//Physics Simulation Functions

function handleBoundaryCollision(stone) {
  // Canvas dimensions
  const canvasWidth = 600;
  const canvasHeight = 600;

  // Left/Right boundaries
  if (stone.x < STONE_RADIUS) {
    stone.x = STONE_RADIUS;
    stone.vx *= -RESTITUTION;
  } else if (stone.x > canvasWidth - STONE_RADIUS) {
    stone.x = canvasWidth - STONE_RADIUS;
    stone.vx *= -RESTITUTION;
  }
  // Top/Bottom boundaries
  if (stone.y < STONE_RADIUS) {
    stone.y = STONE_RADIUS;
    stone.vy *= -RESTITUTION;
  } else if (stone.y > canvasHeight - STONE_RADIUS) {
    stone.y = canvasHeight - STONE_RADIUS;
    stone.vy *= -RESTITUTION;
  }
}

function handleCollisions() {
  const stones = gameState.stones;
  const collisionPairs = [];
  const numStones = stones.length;

  //Collisions
  for (let i = 0; i < numStones; i++) {
    for (let j = i + 1; j < numStones; j++) {
      const s1 = stones[i];
      const s2 = stones[j];
      const dx = s2.x - s1.x;
      const dy = s2.y - s1.y;
      const distSq = dx * dx + dy * dy;
      const diameterSq = STONE_DIAMETER * STONE_DIAMETER;

      if (distSq < diameterSq && distSq > 1e-6) { 
        const distance = Math.sqrt(distSq);
        const overlap = STONE_DIAMETER - distance;
        const nx = dx / distance; 
        const ny = dy / distance; 
        collisionPairs.push({ stone1: s1, stone2: s2, overlap, nx, ny });
      }
    }
  }

  //resolve Overlaps
   collisionPairs.forEach(pair => {
        const moveFactor = pair.overlap * 0.5; 
        const moveX = pair.nx * moveFactor;
        const moveY = pair.ny * moveFactor;

        pair.stone1.x -= moveX; 
        pair.stone1.y -= moveY;
        pair.stone2.x += moveX; 
        pair.stone2.y += moveY;
    });


  //Resolve Collision Velocities
  collisionPairs.forEach(pair => {
    const s1 = pair.stone1;
    const s2 = pair.stone2;
    const nx = pair.nx;
    const ny = pair.ny;

    // Relative velocity
    const rvx = s2.vx - s1.vx;
    const rvy = s2.vy - s1.vy;

    //Velocity along the normal direction
    const velAlongNormal = rvx * nx + rvy * ny;

    // Only resolve if stones are moving towards each other
    if (velAlongNormal >= 0) return;

    const impulseScalar = -(1 + RESTITUTION) * velAlongNormal;

    // Apply impulse
    const impulseX = impulseScalar * nx * 0.5;
    const impulseY = impulseScalar * ny * 0.5;

    s1.vx -= impulseX;
    s1.vy -= impulseY;
    s2.vx += impulseX;
    s2.vy += impulseY;

    //maark stones as moving after collision
    s1.inMotion = true;
    s2.inMotion = true;
  });
}

//Game Logic Functions

function createStone(team, x, y, vx, vy) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2),
    team: team,
    x: x, y: y,
    vx: vx, vy: vy,
    inMotion: true
  };
}

// live count of stones in the target
function updateLiveScores() {
    const centerX = 300; // Center of the house on main canvas
    const centerY = 300;
    let currentLiveHome = 0;
    let currentLiveVisitor = 0;
    let changed = false;

    gameState.stones.forEach(stone => {
        // Check distance from center for
        const distance = Math.hypot(stone.x - centerX, stone.y - centerY);
        if (distance <= HOUSE_RADIUS) { //i s it within the outer blue ring?
            if (stone.team === "HOME") {
                currentLiveHome++;
            } else {
                currentLiveVisitor++;
            }
        }
    });

    // Update gameState if the counts have changed
    if (currentLiveHome !== gameState.liveHomeScore || currentLiveVisitor !== gameState.liveVisitorScore) {
        gameState.liveHomeScore = currentLiveHome;
        gameState.liveVisitorScore = currentLiveVisitor;
        changed = true;
    }
    return changed; //indicate if a change occurred
}

// Main Game Loop (Physics & State Update)
setInterval(() => {
  //stop processing if game is over (waiting for manual restart), note: I added a button to manually retart just cuz it seemed more convenient 
  if (gameState.gameOver) return;

  let stonesMovedOrStopped = false; // Did any stone's motion state change?
  let anyStoneStillMoving = false;  // Is at least one stone still moving?

  //Physics Simulation Steps 
  //Apply movement based on current velocity
  gameState.stones.forEach(stone => {
      if (stone.inMotion) { stone.x += stone.vx; stone.y += stone.vy; stonesMovedOrStopped = true; } });

  //Handle boundary collisions
  gameState.stones.forEach(stone => {
      if (stone.inMotion) { const ovx=stone.vx,ovy=stone.vy; handleBoundaryCollision(stone); if(stone.vx!==ovx || stone.vy!==ovy) stonesMovedOrStopped=true;} });

  //Handle stone to stone collisions
  handleCollisions(); //this marks stones as inMotion if they collide

  //Apply friction and check stopping condition
  gameState.stones.forEach(stone => {
      if (stone.inMotion) {
          const ovx=stone.vx,ovy=stone.vy;
          stone.vx *= FRICTION; stone.vy *= FRICTION;
          if (Math.hypot(stone.vx, stone.vy) < MIN_SPEED) { 
              stone.vx = 0; stone.vy = 0; stone.inMotion = false; stonesMovedOrStopped = true;
          } else {
              anyStoneStillMoving = true; //Mark that at least one stone is moving
              if(stone.vx!==ovx || stone.vy!==ovy) stonesMovedOrStopped=true; 
          }
      }
  });

  const liveScoresChanged = updateLiveScores(); //check scores based on current positions


  // check Game State Transitions
  const allStonesShot = gameState.homeStonesLeft === 0 && gameState.visitorStonesLeft === 0;
  const allStonesStopped = !anyStoneStillMoving; //Game action stops when no stones are moving

  let gameJustEnded = false;

  if (allStonesShot && allStonesStopped && !gameState.gameOver) {
      // game ends only if players is out of stones
      if (stonesMovedOrStopped || liveScoresChanged) {
          //update final scores from the last live scores
          gameState.homeScore = gameState.liveHomeScore;
          gameState.visitorScore = gameState.liveVisitorScore;

          gameState.gameOver = true; 
          gameJustEnded = true;      
          console.log(`Game Over! Final Score (Live Count): Home ${gameState.homeScore} - Visitor ${gameState.visitorScore}. Waiting for restart.`);
      }
  }

  if (stonesMovedOrStopped || liveScoresChanged || gameJustEnded) {
      io.emit("gameState", gameState);
  }

}, TICK_RATE);


// Game Reset Function
function resetGame() {
  console.log("Resetting game state on request...");
  // Keep players assigned if they are still connected
  //reset everything
  gameState.currentTurn = "HOME";
  gameState.stones = [];
  gameState.homeScore = 0;       
  gameState.visitorScore = 0;    
  gameState.liveHomeScore = 0;   
  gameState.liveVisitorScore = 0;
  gameState.homeStonesLeft = 4;  
  gameState.visitorStonesLeft = 4;
  gameState.gameOver = false;    //Game is active again

  io.emit("gameState", gameState); //notify all players of the reset state
  console.log("Game reset. Ready for new game.");
}


//Socket.IO Connection Handling
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.emit("gameState", gameState); //Send current state 

  // Handle Player Role Registration
  socket.on("registerRole", (data) => {
    let assignedRole = null; let success = false;
    if (data.role === "HOME" && !gameState.homePlayer) { gameState.homePlayer = socket.id; assignedRole = "HOME"; success = true; console.log(`${socket.id} registered as HOME`); }
    else if (data.role === "VISITOR" && !gameState.visitorPlayer) { gameState.visitorPlayer = socket.id; assignedRole = "VISITOR"; success = true; console.log(`${socket.id} registered as VISITOR`); }
    else if (data.role === "SPECTATOR") { assignedRole = "SPECTATOR"; success = true; console.log(`${socket.id} registered as SPECTATOR`); }
    else { console.log(`Registration failed for ${socket.id} as ${data.role}: Slot taken or invalid role.`); }
    if (success) { socket.emit("registrationSuccess", { role: assignedRole }); } else { if(data.role === "HOME" || data.role === "VISITOR") { socket.emit("registrationFailed", { role: data.role, reason: "Slot already taken." }); } }
    io.emit("gameState", gameState);
   });

  // Handle Stone Shooting
  socket.on("shoot", (data) => {
    const activeTeam=gameState.currentTurn; const activePlayer = activeTeam==="HOME"?gameState.homePlayer:gameState.visitorPlayer;
    //Validation checks
    if (gameState.gameOver) { console.log(`Shoot reject ${socket.id}: Game Over`); return; }
    if (socket.id !== activePlayer) { console.log(`Shoot reject ${socket.id}: Not player's turn/role`); return; }
    if (gameState.stones.some(s=>s.inMotion)) { console.log(`Shoot reject ${socket.id}: Stones still moving`); return; }
    if ((activeTeam === "HOME" && gameState.homeStonesLeft <= 0) || (activeTeam === "VISITOR" && gameState.visitorStonesLeft <= 0)) { console.log(`Shoot reject ${socket.id}: No stones left`); return; }
    if (!data || typeof data.startX !== 'number' || typeof data.startY !== 'number' || typeof data.endX !== 'number' || typeof data.endY !== 'number') { console.log(`Shoot reject ${socket.id}: Invalid shoot data format`); return; }

    //process the shot
    const dx = data.endX - data.startX; const dy = data.endY - data.startY; const powerFactor = 0.2;
    const startX = 300; const startY = 600 - 50; // Define starting position centrally near bottom
    const newStone = createStone(activeTeam, startX, startY, dx * powerFactor, dy * powerFactor);
    gameState.stones.push(newStone);
    if (activeTeam === "HOME") { gameState.homeStonesLeft--; } else { gameState.visitorStonesLeft--; }
    const otherPlayerHasStones = activeTeam === "HOME" ? gameState.visitorStonesLeft > 0 : gameState.homeStonesLeft > 0;
    if (otherPlayerHasStones) { gameState.currentTurn = activeTeam === "HOME" ? "VISITOR" : "HOME"; }
    //Emit state after processing shot and turn change
    io.emit("gameState", gameState);
  });

  // handle Manual Game Restart Request
  socket.on("requestRestart", () => {
      if (gameState.gameOver) { console.log(`Restart request approved from ${socket.id}`); resetGame(); } else { console.log(`Restart request from ${socket.id} ignored (game not over).`); } });

  //handle player/client Disconnection
  socket.on("disconnect", (reason) => {
      console.log(`Client disconnected: ${socket.id}. Reason: ${reason}`); let playerLeft=false; if(socket.id === gameState.homePlayer){gameState.homePlayer = null; playerLeft=true; console.log("Home player slot cleared.");} if(socket.id === gameState.visitorPlayer){gameState.visitorPlayer = null; playerLeft=true; console.log("Visitor player slot cleared.");} if(playerLeft){ io.emit("gameState", gameState); } }); // Notify others if a player left
});

console.log("Server setup complete. Socket.IO event handlers registered.");