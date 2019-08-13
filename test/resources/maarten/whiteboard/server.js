const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = 3000;
app.use(express.static(__dirname + '/public'));
function onConnection(socket){
  socket.on('drawing', (data) => socket.emit('drawing', data));
}
io.on('connection', onConnection);
http.listen(port, () => {
	console.log('listening on port ' + port);
	"FINISHED_SETUP"; //trap this
});
