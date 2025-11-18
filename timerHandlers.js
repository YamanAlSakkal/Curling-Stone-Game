// timerHandlers.js
setInterval(() => {
  drawMainCanvas();
  drawZoomCanvas();

  if (gameState) {
    document.getElementById("scoreHome").textContent = gameState.homeScore;
    document.getElementById("scoreVisitor").textContent = gameState.visitorScore;
    // If it's HOME's turn, box would be red; if VISITOR's then it'd be yellow
    if (gameState.currentTurn === "HOME") {
      document.getElementById("shootingPlus").style.color = "red";
    } else {
      document.getElementById("shootingPlus").style.color = "yellow";
    }
  }
}, 33);
