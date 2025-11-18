//canvaswithtimer.js
const canvas = document.getElementById("mainCanvas");
const ctx = canvas.getContext("2d");
const sideCanvas = document.getElementById("zoomCanvas");
const sideCtx = sideCanvas.getContext("2d");

canvas.width = 600;
canvas.height = 600;

let gameState = null;
let myRole = null;

const STONE_RADIUS = 15;

// Establish socket connection
const socket = io();

socket.on("gameState", (state) => {
  gameState = state;
  updateScoreboard(state);
  drawGame();
  drawSidePanel();
});

socket.on("registrationSuccess", (data) => {
  myRole = data.role;
  //Disable registration buttons
  document.getElementById("joinHome").disabled = true;
  document.getElementById("joinVisitor").disabled = true;
  document.getElementById("joinSpectator").disabled = true;
  document.getElementById("restartButton").style.display = gameState && gameState.gameOver ? "inline-block" : "none";
});

//Update scoreboard overlays
function updateScoreboard(state) {
  document.getElementById("liveHomeScoreOverlay").textContent = state.liveHomeScore;
  document.getElementById("liveVisitorScoreOverlay").textContent = state.liveVisitorScore;
}

// Draw the main game scene
function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawCurlingHouse(ctx);
  if (gameState && gameState.stones) {
    gameState.stones.forEach((stone) => {
      drawStone(ctx, stone);
    });
  }
  drawShootingAreaIndicator(ctx);
}

// Draw the curling house (outer blue, middle white, inner red)
function drawCurlingHouse(context) {
  let centerX = canvas.width / 2;
  let centerY = canvas.height - 70;
  //outer circle
  context.beginPath();
  context.arc(centerX, centerY, 60, 0, 2 * Math.PI);
  context.fillStyle = "#ADD8E6";
  context.fill();
  context.strokeStyle = "#0000FF";
  context.lineWidth = 3;
  context.stroke();
  // Middle circle
  context.beginPath();
  context.arc(centerX, centerY, 40, 0, 2 * Math.PI);
  context.fillStyle = "#FFFFFF";
  context.fill();
  context.strokeStyle = "#000000";
  context.lineWidth = 2;
  context.stroke();
  //Inner circle
  context.beginPath();
  context.arc(centerX, centerY, 20, 0, 2 * Math.PI);
  context.fillStyle = "#FF0000";
  context.fill();
  context.strokeStyle = "#800000";
  context.lineWidth = 2;
  context.stroke();
}

// Draw a curling stone
function drawStone(context, stone) {
  context.beginPath();
  context.arc(stone.x, stone.y, STONE_RADIUS, 0, 2 * Math.PI);
  context.fillStyle = (stone.team === "HOME") ? "#FF9999" : "#FFD700";
  context.fill();
  context.strokeStyle = "#333";
  context.lineWidth = 2;
  context.stroke();
}

//a shooting area indicator (colored border) on the main canvas
function drawShootingAreaIndicator(context) {
  context.lineWidth = 4;
  if (gameState && gameState.currentTurn === "HOME") {
    context.strokeStyle = "#FF0000";
  } else {
    context.strokeStyle = "#0000FF";
  }
  context.strokeRect(0, 0, canvas.width, 100);
}

//the side (zoom) panel
function drawSidePanel() {
  sideCtx.clearRect(0, 0, sideCanvas.width, sideCanvas.height);
  // Define region for close-up view
  let regionWidth = 100, regionHeight = 100;
  let centerX = canvas.width / 2;
  let centerY = canvas.height - 70;
  let regionX = centerX - regionWidth / 2;
  let regionY = centerY - regionHeight / 2;
  sideCtx.save();
  sideCtx.scale(2, 2);
  sideCtx.translate(-regionX, -regionY);
  drawCurlingHouseSide(sideCtx, centerX, centerY);
  if (gameState && gameState.stones) {
    gameState.stones.forEach((stone) => {
      if (stone.x > regionX && stone.x < regionX + regionWidth &&
          stone.y > regionY && stone.y < regionY + regionHeight) {
        drawStoneSide(sideCtx, stone);
      }
    });
  }
  sideCtx.restore();
  drawAimIndicator();
}

// curling house on the side canvas
function drawCurlingHouseSide(context, centerX, centerY) {
  context.beginPath();
  context.arc(centerX, centerY, 60, 0, 2 * Math.PI);
  context.fillStyle = "#ADD8E6";
  context.fill();
  context.strokeStyle = "#0000FF";
  context.lineWidth = 3;
  context.stroke();
  context.beginPath();
  context.arc(centerX, centerY, 40, 0, 2 * Math.PI);
  context.fillStyle = "#FFFFFF";
  context.fill();
  context.strokeStyle = "#000000";
  context.lineWidth = 2;
  context.stroke();
  context.beginPath();
  context.arc(centerX, centerY, 20, 0, 2 * Math.PI);
  context.fillStyle = "#FF0000";
  context.fill();
  context.strokeStyle = "#800000";
  context.lineWidth = 2;
  context.stroke();
}

// stone on side canvas
function drawStoneSide(context, stone) {
  context.beginPath();
  context.arc(stone.x, stone.y, STONE_RADIUS, 0, 2 * Math.PI);
  context.fillStyle = (stone.team === "HOME") ? "#FF9999" : "#FFD700";
  context.fill();
  context.strokeStyle = "#333";
  context.lineWidth = 2;
  context.stroke();
}

// an aim indicator + in the center of the side canvas
function drawAimIndicator() {
  let centerX = sideCanvas.width / 2;
  let centerY = sideCanvas.height / 2;
  sideCtx.lineWidth = 4;
  let color = "#000000";
  if (gameState) {
    color = (gameState.currentTurn === "HOME") ? "#FF0000" : "#FFFF00";
  }
  sideCtx.strokeStyle = color;
  sideCtx.beginPath();
  sideCtx.moveTo(centerX - 10, centerY);
  sideCtx.lineTo(centerX + 10, centerY);
  sideCtx.stroke();
  sideCtx.beginPath();
  sideCtx.moveTo(centerX, centerY - 10);
  sideCtx.lineTo(centerX, centerY + 10);
  sideCtx.stroke();
}

//refresh the main and side canvases
setInterval(() => {
  drawGame();
  drawSidePanel();
}, 33);
