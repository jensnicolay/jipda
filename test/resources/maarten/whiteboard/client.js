'use strict';
(function() {
  var socket = io();
  var canvas = document.getElementsByClassName('whiteboard')[0];
  var colors = document.getElementsByClassName('color');
  var context = canvas.getContext('2d');
  const ownStartPos = {};
  const otherStartPos = {};
  var current = {
    color: 'black'
  };
  var drawing = false;
  canvas.addEventListener('mousedown', onMouseDown, false);
  canvas.addEventListener('mouseup', onMouseUp, false);
  canvas.addEventListener('mouseout', onMouseUp, false);
  canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);
  socket.on('drawing', onDrawingEvent);
  window.addEventListener('resize', onResize, false);
  onResize();
  const windowSize = 1000;
  function drawLine(x0, y0, x1, y1, color, emit){
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.stroke();
    context.closePath();
    if (!emit) { return; }
    socket.emit("drawing", {
      x0: x0,
      y0: y0,
      x1: x1,
      y1: y1,
      color: "green"
    });
  }
  function onMouseDown(e) {
    drawing = true;
    current.x = e.clientX;
    current.y = e.clientY;
    ownStartPos.xx = e.clientX;
    ownStartPos.yy = e.clientY;
  }
  function onMouseUp(e){
    if (!drawing) { return; }
    drawing = false;
    drawLine(current.x, current.y, e.clientX, e.clientY, current.color, true);
  }
  function onMouseMove(e){
    if (!drawing) { return; }
    drawLine(current.x, current.y, e.clientX, e.clientY, current.color, true);
    current.x = e.clientX;
    current.y = e.clientY;
  }
  function onColorUpdate(e){
    current.color = e.target.className.split(' ')[1];
  }
  function throttle(callback, delay) {
    return function() {
      callback.apply(null, arguments);
    };
  }
  function onDrawingEvent(data){
    otherStartPos.xxx = data.x0;
    otherStartPos.yyy = data.y0;
    drawLine(data.x0, data.y0, data.x1, data.y1, data.color, false);
  }
  function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
})();