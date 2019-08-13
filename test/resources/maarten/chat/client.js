var $window = $(window);
var $usernameInput = $('.usernameInput');
var $messages = $('.messages');
var $inputMessage = $('.inputMessage');
var $loginPage = $('.login.page');
var $chatPage = $('.chat.page');
$(function () {
    var FADE_TIME = 150;
    var TYPING_TIMER_LENGTH = 40000;
    var COLORS = [
        '#e21400', '#91580f', '#f8a700', '#f78b00',
        '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
        '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ];
    var username;
    var connected = false;
    var typing = false;
    var lastTypingTime;
    var $currentInput = $usernameInput.focus();
    var socket = io();
    const addParticipantsMessage = data => {
        var message = '';
        if (data.numUsers === 1) {
            message += 'there\'s 1 participant';
        } else {
            message += 'there are ' + data.numUsers + ' participants';
        }
        log(message);
    };
    const setUsername = () => {
        username = $usernameInput.val();
        if (username) {
            $loginPage.fadeOut();
            $chatPage.show();
            $loginPage.off('click');
            $currentInput = $inputMessage.focus();
            socket.emit('add_user', username);
        }
    };
    const sendMessage = () => {
        var message = $inputMessage.val();
        if (message && connected) {
            $inputMessage.val('');
            addChatMessage({
                username: username,
                message: message
            });
            socket.emit('new_message', message);
        }
    };
    const log = (message, options) => {
        var $el = $('<li>').addClass('log').text(message);
        addMessageElement($el, options);
    };
    const addChatMessage = (data, options) => {
        var $typingMessages = getTypingMessages(data);
        options = options || {};
        if ($typingMessages.length !== 0) {
            options.fade = false;
            $typingMessages.remove();
        }
        ;
        console.log('Got a message from ' + data.username);
        var $usernameDiv = $('<span class="username"/>').text(data.username).css('color', getUsernameColor(data.username));
        var $messageBodyDiv = $('<span class="messageBody">').text(data.message);
        var typingClass = data.typing ? 'typing' : '';
        var $messageDiv = $('<li class="message"/>').data('username', data.username).addClass(typingClass).append($usernameDiv, $messageBodyDiv);
        addMessageElement($messageDiv, options);
    };
    const addChatTyping = data => {
        data.typing = true;
        data.message = 'is typing';
        addChatMessage(data);
    };
    const removeChatTyping = data => {
        getTypingMessages(data).fadeOut(() => {
            $(this).remove();
        });
    };
    const addMessageElement = (el, options) => {
        var $el = $(el);
        if (!options) {
            options = {};
        }
        if (typeof options.fade === 'undefined') {
            options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
            options.prepend = false;
        }
        if (options.fade) {
            $el.hide().fadeIn(FADE_TIME);
        }
        if (options.prepend) {
            $messages.prepend($el);
        } else {
            $messages.append($el);
        }
        $messages[0].scrollTop = $messages[0].scrollHeight;
    };
    const cleanInput = input => {
        return $('<div/>').text(input).html();
    };
    const updateTyping = () => {
        if (connected) {
            if (!typing) {
                typing = true;
                socket.emit('typing');
            }
            lastTypingTime = new Date().getTime();
            setTimeout(() => {
                var typingTimer = new Date().getTime();
                var timeDiff = typingTimer - lastTypingTime;
                if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    socket.emit('stop_typing');
                    typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    };
    const getTypingMessages = data => {
        return $('.typing.message').filter(i => {
            return $(this).data('username') === data.username;
        });
    };
    const getUsernameColor = username => {
        var hash = 7;
        for (var i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + (hash << 5) - hash;
        }
        var index = Math.abs(hash % COLORS.length);
        return COLORS[index];
    };
    $window.keydown(event => {
        if (!(event.ctrlKey || event.metaKey || event.altKey)) {
            $currentInput.focus();
        }
        if (event.which === 13) {
            if (username) {
                sendMessage();
                socket.emit('stop_typing');
                typing = false;
            } else {
                setUsername();
            }
        }
    });
    $inputMessage.on('input', () => {
        updateTyping();
    });
    $loginPage.click(() => {
        $currentInput.focus();
    });
    $inputMessage.click(() => {
        $inputMessage.focus();
    });
    socket.on('login', data => {
        connected = true;
        var message = 'Welcome to Socket.IO Chat \u2013 ';
        log(message, { prepend: true });
        addParticipantsMessage(data);
    });
    socket.on('new_message', data => {
        addChatMessage(data);
    });
    socket.on('user_joined', data => {
        log(data.username + ' joined');
        addParticipantsMessage(data);
    });
    socket.on('user_left', data => {
        log(data.username + ' left');
        addParticipantsMessage(data);
        removeChatTyping(data);
    });
    socket.on('typing', data => {
        if (data.username === username) {
            throw new Exception();
        }
        addChatTyping(data);
    });
    socket.on('stop_typing', data => {
        removeChatTyping(data);
    });
    socket.on('disconnect', () => {
        log('you have been disconnected');
    });
    socket.on('reconnect', () => {
        log('you have been reconnected');
        if (username) {
            socket.emit('add_user', username);
        }
    });
    socket.on('reconnect_error', () => {
        log('attempt to reconnect has failed');
    });
});