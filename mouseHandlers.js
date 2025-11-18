/*
  mouseHandlers.js
  Handles shooting interactions on the shootingCanvas
  Implements drag to shoot and emits a "shoot" event via socket.io
*/

const shootingCanvas = document.getElementById("shootingCanvas");
const shootingAreaDiv = document.getElementById("shootingArea");

let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let shootingStoneX, shootingStoneY;
const SHOOTING_STONE_RADIUS = 18;

//determine if the current player is allowed to shoot
function canShoot() {
  if (!gameState || !myRole || gameState.gameOver) return false;
  if (gameState.stones && gameState.stones.some(stone => stone.inMotion)) return false;
  return ((myRole === "HOME" && gameState.currentTurn === "HOME") ||
          (myRole === "VISITOR" && gameState.currentTurn === "VISITOR"));
}

//redraw the shooting canvas
function drawShootingCanvas() {
  const shootingCtx = shootingCanvas.getContext("2d");
  shootingCtx.clearRect(0, 0, shootingCanvas.width, shootingCanvas.height);

  if (canShoot()) {
    shootingStoneX = shootingCanvas.width / 2;
    shootingStoneY = SHOOTING_STONE_RADIUS + 15;
    drawStoneOnShooting(shootingCtx, shootingStoneX, shootingStoneY, SHOOTING_STONE_RADIUS, gameState.currentTurn);

    if (isDragging) {
      shootingCtx.beginPath();
      shootingCtx.moveTo(shootingStoneX, shootingStoneY);
      shootingCtx.lineTo(dragStartX, dragStartY);
      shootingCtx.strokeStyle = "#333";
      shootingCtx.lineWidth = 2;
      shootingCtx.setLineDash([5, 5]);
      shootingCtx.stroke();
      shootingCtx.setLineDash([]);
      const power = Math.hypot(shootingStoneX - dragStartX, shootingStoneY - dragStartY);
      shootingCtx.fillStyle = "#000";
      shootingCtx.font = "12px Arial";
      shootingCtx.textAlign = "center";
      shootingCtx.fillText(`Power: ${Math.round(power)}`, shootingCanvas.width / 2, shootingStoneY + SHOOTING_STONE_RADIUS + 15);
    }
  } else {
    if (gameState && !gameState.gameOver) {
      const stoneX = shootingCanvas.width / 2;
      const stoneY = SHOOTING_STONE_RADIUS + 15;
      shootingCtx.globalAlpha = 0.4;
      drawStoneOnShooting(shootingCtx, stoneX, stoneY, SHOOTING_STONE_RADIUS, gameState.currentTurn);
      shootingCtx.globalAlpha = 1.0;
    }
  }
}

function drawStoneOnShooting(context, x, y, radius, team) {
  context.beginPath();
  context.arc(x, y, radius, 0, 2 * Math.PI);
  context.fillStyle = (team === "HOME") ? "red" : "#FFD700";
  context.fill();
  context.strokeStyle = "#333";
  context.lineWidth = 1;
  context.stroke();
}

//mouse event handlers
shootingCanvas.addEventListener("mousedown", (e) => {
  if (!canShoot() || isDragging) return;
  const rect = shootingCanvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const dist = Math.hypot(mouseX - (shootingCanvas.width / 2), mouseY - (SHOOTING_STONE_RADIUS + 15));
  if (dist <= SHOOTING_STONE_RADIUS * 1.5) {
    isDragging = true;
    dragStartX = mouseX;
    dragStartY = mouseY;
    shootingAreaDiv.classList.add('shooting-area-dragging');
    drawShootingCanvas();
  }
});

shootingCanvas.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  const rect = shootingCanvas.getBoundingClientRect();
  dragStartX = e.clientX - rect.left;
  dragStartY = e.clientY - rect.top;
  drawShootingCanvas();
});

shootingCanvas.addEventListener("mouseup", (e) => {
  if (!isDragging) return;
  isDragging = false;
  shootingAreaDiv.classList.remove('shooting-area-dragging');
  const rect = shootingCanvas.getBoundingClientRect();
  const endX = e.clientX - rect.left;
  const endY = e.clientY - rect.top;
  const dx = endX - (shootingCanvas.width / 2);
  const dy = endY - (SHOOTING_STONE_RADIUS + 15);
  let power = Math.hypot(dx, dy);
  const minPower = 5;
  if (power < minPower) {
    console.log("Shot cancelled - not enough power.");
    drawShootingCanvas();
    return;
  }
  //reverse the vector to shoot in the opposite direction
  const shootDX = -dx;
  const shootDY = -dy;
  const serverStartX = 300;
  const serverStartY = 550;
  const powerScaleFactor = 1.5;
  const finalShootDX = shootDX * powerScaleFactor;
  const finalShootDY = shootDY * powerScaleFactor;
  socket.emit("shoot", {
    startX: serverStartX,
    startY: serverStartY,
    endX: serverStartX + finalShootDX,
    endY: serverStartY + finalShootDY
  });
  drawShootingCanvas();
});

shootingCanvas.addEventListener("mouseleave", (e) => {
  if (isDragging) {
    isDragging = false;
    shootingAreaDiv.classList.remove('shooting-area-dragging');
    console.log("Shot cancelled - mouse left shooting canvas.");
    drawShootingCanvas();
  }
});
