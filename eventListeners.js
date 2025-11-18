/*
  eventListeners.js
  registers event listeners for player registration buttons and restart
  relies on the global socket variable created in canvasWithTimer.js
*/

document.addEventListener("DOMContentLoaded", () => {
  const joinHomeBtn = document.getElementById("joinHome");
  const joinVisitorBtn = document.getElementById("joinVisitor");
  const joinSpectatorBtn = document.getElementById("joinSpectator");
  const restartBtn = document.getElementById("restartButton");

  joinHomeBtn.addEventListener("click", () => {
    socket.emit("registerRole", { role: "HOME" });
  });
  joinVisitorBtn.addEventListener("click", () => {
    socket.emit("registerRole", { role: "VISITOR" });
  });
  joinSpectatorBtn.addEventListener("click", () => {
    socket.emit("registerRole", { role: "SPECTATOR" });
  });
  restartBtn.addEventListener("click", () => {
    socket.emit("requestRestart");
  });
});
