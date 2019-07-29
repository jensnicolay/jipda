var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require("../..")(server);
var port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log('Server listening at port %d', port);
    'FINISHED_SETUP';
});
app.use(express.static(path.join(__dirname, 'public')));
var numUsers = 0;
var is_typing = false;
io.on('connection', socket => {
    var addedUser = false;
    socket.on('new_message', data => {
        socket.emit('message', {
            username: socket.username,
            message: data
        });
    });
    socket.on('add_user', username => {
        if (addedUser) {
            return;
        }
        socket.username = username;
        ++numUsers;
        addedUser = true;
        socket.emit('login', { numUsers: numUsers });
        socket.emit('user_joined', {
            username: socket.username,
            numUsers: numUsers
        });
    });
    socket.on('typing', () => {
        is_typing = true;
        socket.emit('typing', { username: socket.username });
    });
    socket.on('stop_typing', () => {
        if (!is_typing) {
            return;
        }
        is_typing = false;
        socket.emit('stop_typing', { username: socket.username });
    });
    socket.on('disconnect', () => {
        if (addedUser) {
            if (numUsers <= 0) {
                return;
            }
            --numUsers;
            socket.emit('user_left', {
                username: socket.username,
                numUsers: numUsers
            });
        }
    });
});