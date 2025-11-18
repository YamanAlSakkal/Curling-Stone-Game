/*
  zoomCanvas.js
  draws the close-up (zoom) view of the curling house
*/

const zoomCanvas = document.getElementById("zoomCanvas");
const zoomCtx = zoomCanvas.getContext("2d");

zoomCanvas.width = 180;
zoomCanvas.height = 180;

function drawZoomCanvas() {
  zoomCtx.clearRect(0, 0, zoomCanvas.width, zoomCanvas.height);
  drawCurlingHouseOnZoom(zoomCtx);
  if (gameState && gameState.stones) {
    gameState.stones.forEach(stone => {
      let distFromCenter = Math.hypot(stone.x - 300, stone.y - 300);
      if (distFromCenter < 120) {
        let scale = 0.5;
        let zx = 90 + (stone.x - 300) * scale;
        let zy = 90 + (stone.y - 300) * scale;
        drawStoneAtZoom(zoomCtx, zx, zy, stone.team);
      }
    });
  }
}

function drawStoneAtZoom(context, x, y, team) {
  context.beginPath();
  context.arc(x, y, STONE_RADIUS * 0.5, 0, 2 * Math.PI);
  context.fillStyle = (team === "HOME") ? "red" : "yellow";
  context.fill();
  context.strokeStyle = "#333";
  context.stroke();
}

function drawCurlingHouseOnZoom(context) {
  context.beginPath();
  context.arc(90, 90, 70, 0, 2 * Math.PI);
  context.fillStyle = "blue";
  context.fill();
  context.beginPath();
  context.arc(90, 90, 40, 0, 2 * Math.PI);
  context.fillStyle = "white";
  context.fill();
  context.beginPath();
  context.arc(90, 90, 20, 0, 2 * Math.PI);
  context.fillStyle = "red";
  context.fill();
  context.beginPath();
  context.moveTo(90 - 80, 90);
  context.lineTo(90 + 80, 90);
  context.moveTo(90, 90 - 80);
  context.lineTo(90, 90 + 80);
  context.strokeStyle = "#333";
  context.stroke();
}

//refresh zoom canvas periodically.
setInterval(() => {
  drawZoomCanvas();
}, 33);
