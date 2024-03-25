"use strict";

function createNetPlayer(game, socket, playerName) {
  var player = {
    name: playerName || "Anonymous",
    onStateChange: onStateChange,
    onHistoryEvent: onHistoryEvent,
    onChatMessage: onChatMessage,
    onPlayerLeft: onPlayerLeft,
    playerId: socket.playerId,
  };

  try {
    var gameProxy = game.playerJoined(player);
  } catch (e) {
    handleError(e);
    return;
  }

  function onStateChange(state) {
    socket.emit("state", state);
  }

  function onChatMessage(playerIdx, message) {
    socket.emit("chat", {
      from: playerIdx,
      message: message,
    });
  }

  function onHistoryEvent(message, type, histGroup) {
    socket.emit("history", {
      message: message,
      type: type,
      histGroup: histGroup,
    });
  }

  function onCommand(data) {
    try {
      if (gameProxy != null) {
        gameProxy.command(data);
      }
    } catch (e) {
      handleError(e);
    }
  }

  function sendChatMessage(message) {
    if (gameProxy != null) {
      gameProxy.sendChatMessage(message);
    }
  }

  function onPlayerLeft() {
    socket.removeListener("command", onCommand);
    socket.removeListener("chat", sendChatMessage);
    socket.removeListener("disconnect", leaveGame);
    socket.removeListener("join", leaveGame);
    setTimeout(function () {
      socket.emit("state", null);
    });
  }

  function leaveGame() {
    if (gameProxy != null) {
      gameProxy.playerLeft();
      gameProxy = null;
      game = null;
    }
  }

  socket.on("command", onCommand);
  socket.on("chat", sendChatMessage);
  socket.on("disconnect", leaveGame);
  // If the player joins another game, leave this one.
  socket.on("join", leaveGame);

  function handleError(e) {
    var message;
    if (e instanceof Error) {
      console.error(e);
      console.error(e.stack);
      message = "Internal error";
    } else {
      message = e.message;
    }
    socket.emit("game-error", message);
  }
}

module.exports = createNetPlayer;
