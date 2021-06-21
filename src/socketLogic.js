const formatMessage = require('./message');
const { userJoin, 
        userLeave, 
        getRoomUsers, 
        updateRoomUsersPoint, 
        substractRoomUsersPoint, 
        userLen, 
        getWinner, 
        resetUsers,
        distinctRooms
} = require('./users');
const {pickRandomQuestion, isDailyDoubleChecker} = require('./utility');

// Pre defined states
var trackRoom = {};
var questions = require('../game/jeopardy_questions.json');
var boards = questions["boards"];

module.exports = function(socket, io) {

    // User join event
    socket.on('room', ({username, room}) => {
        const user = userJoin(socket.id, username, room, 0);
        socket.join(user.room);
        socket.room = user.room;
        socket.name = user.user;

        if(userLen(socket.room) > 1) {
            socket.emit('gameState', {
                state : trackRoom[socket.room][2]['states'],
                board : trackRoom[socket.room][3]['board']
            });

            trackRoom[socket.room][3]['mode']==1 && trackRoom[socket.room][0]['trackWrong'].push(socket.name);
        }

        // Send distinct online room
        io.sockets.emit('newRoom', {rooms : distinctRooms()});

        if(userLen(room) == 1) {
            trackRoom[room] = [];
            trackRoom[room][0] = {};
            trackRoom[room][0]['trackWrong'] = [];      // Track Wrong User for question
            trackRoom[room][1] = {};
            trackRoom[room][1]['dailyDoubles'] = [];    // Daily Doubles Questions (3 Questions)
            trackRoom[room][2] = {};
            trackRoom[room][2]['states'] = [];      // Visited Questions Tracking
            trackRoom[room][3] = {};
            trackRoom[room][3]['board'] = 0;    // Board Number, 0-Board1, 1-Board2, 2-Board3
            trackRoom[room][3]['mode'] = 0;    // Mode (Current state of game - Question or Board on display) 0-Board, 1-Question
            console.log(trackRoom)
            for(let i=0; i<3; ++i) {
                trackRoom[room][1]['dailyDoubles'].push(pickRandomQuestion());
            }
        }

        // Users in room
        io.to(user.room).emit('roomUsers', {
            id: socket.id,
            room: user.room,
            roomUsers: getRoomUsers(user.room)
        });

        // User tracking room
        io.to(user.room).emit('userJoin', {
            message : formatMessage(user.username)
        });
    });

    // Get question event
    socket.on('getQuestion', (data) => {
        trackRoom[socket.room][3]['mode']=1;
        let obj = boards[data.x].categories[Object.keys(boards[data.x].categories)[data.y]][data.z];
        trackRoom[socket.room][2]['states'].push([data.x, data.y, data.z]);
        trackRoom[socket.room][3]['board'] = data.x;
        io.to(data.room).emit('question', {
            que : obj.question,
            ans : obj.answer,
            board : data.x,
            point : data.x==1?obj.point*2:obj.point,
            category : Object.keys(boards[data.x].categories)[data.y],
            isDailyDouble : isDailyDoubleChecker(trackRoom[data.room][1]['dailyDoubles'], data.x, data.y, data.z),
            y : data.y,
            z : data.z
        });
    })

    // Correct answer event handler
    socket.on('addPoint', (data) => {
        updateRoomUsersPoint(data.username, data.point, data.room);
        trackRoom[data.room][0]['trackWrong'].length=0;

        // Get available room users
        io.to(data.room).emit('roomUsers', {
            roomUsers: getRoomUsers(data.room)
        });

        // Send result to user (game end)
        if(data.round == 2) {
            io.to(data.room).emit('gameEnd', {
                winner : getWinner(data.room)    
            });
        }

        // Show dashboard
        io.to(data.room).emit('dashboard');
        trackRoom[data.room][3]['mode']=0;
    });

    // Wrong answer event handler
    socket.on('substractPoint', (data) => {
        substractRoomUsersPoint(data.username, data.point, data.room);
        io.to(data.room).emit('roomUsers', {
            roomUsers: getRoomUsers(data.room)
        });

        // trackRoom to track wrong answer for specific question
        trackRoom[data.room][0]['trackWrong'].push(data.username);

        // If all users give wrong answer, Show game dashboard
        if(trackRoom[data.room][0]['trackWrong'].length == userLen(data.room)) {
            trackRoom[data.room][0]['trackWrong'].length = 0;

            // If Game is completed
            if(data.round == 2) {
                io.to(data.room).emit('gameEnd', {
                    winner : getWinner(data.room)    
                });
            }

            // Show dashboard
            io.to(data.room).emit('dashboard');
            trackRoom[data.room][3]['mode']=0;
        } 
    });

    // Reset game
    socket.on('resetGame', (room) => {
       
        // Send Winner data
        io.to(room).emit('gameEnd', {
            winner : getWinner(room)    
        });

        // Reset Users score data
        resetUsers(room);

        trackRoom[room][0]['trackWrong'].length = 0;

        // Send online users detail
        io.to(room).emit('roomUsers', {
            room: room,
            roomUsers: getRoomUsers(room)
        });
        
        // Randomize Daily Doubles questions
        trackRoom[room][1]['dailyDoubles'].length = 0;
        for(let i=0; i<3; ++i) {
            trackRoom[room][1]['dailyDoubles'].push(pickRandomQuestion());
        }

        // Reset game dashboard
        io.to(room).emit('resetDashboard');
        trackRoom[room][2]['states'].length = 0;
        trackRoom[room][3]['mode']=0;
    });

    // Logout event
    socket.on('logout', () => {

        // Remove user data from store
        const user = userLeave(socket.id);

        // If target user found
        if(user) {

            // Send available users
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                roomUsers: getRoomUsers(user.room)
            });

            // Send user tracking detail
            io.to(user.room).emit('userLeft', {
                message : formatMessage(user.username)
            });

            // Reset wrong answer tracking detail for disconnected user
            const idx = trackRoom[user.room][0]['trackWrong'].findIndex(ele => ele === user.username);
            if(idx !== -1) {
                trackRoom[user.room][0]['trackWrong'].splice(idx, 1)[0];
            }

            // If all the user except the left user are wrong then render dashboard (Edge Case)
            if(userLen(user.room) == trackRoom[user.room][0]['trackWrong'].length) {
                // Render game dashboard
                io.to(user.room).emit('dashboard');
                trackRoom[user.room][3]['mode']=0;
            }
        }
    });

    // Broadcast message (chat PopUp)
    socket.on('new message', (data) => {
        socket.broadcast.to(data.room).emit('text', data);
    });

    // User disconnect event handler
    socket.on('disconnect', () => {

        // Remove user from data store
        const user = userLeave(socket.id);

        // Send available online rooms
        io.sockets.emit('newRoom', {rooms : distinctRooms()});

        if(user) {

            // Send available room users
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                roomUsers: getRoomUsers(user.room)
            });

            // Notify room member about left userq
            io.to(user.room).emit('userLeft', {
                message : formatMessage(user.username)
            });

            // If all the user except the left user are wrong then render dashboard (Edge Case)
            if(userLen(user.room) == trackRoom[user.room][0]['trackWrong'].length) {
                // Render game dashboard
                io.to(user.room).emit('dashboard');
                trackRoom[user.room][3]['mode']=0;
            }
        }
    });
  
};