const express = require('express');
const path = require('path');
const port = process.env.PORT || 3000
const app = express();
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const formatMessage = require('./utils/message');
const {userJoin, userLeave, getRoomUsers, updateRoomUsersPoint, substractRoomUsersPoint, userLen, getWinner, resetUsers} = require('./utils/users');

http.listen(port, () => console.log(`server listening on port: ${port}`))

var x=0, y=0, z=0;
var trackWrong = [];
var questions = require('./game/jeopardy_questions.json');
var boards = questions["boards"];

var dailyDoubles = [];
var isDailyDouble = false;
app.use(express.static(path.join(__dirname, 'public')));

function pickRandomQuestion() {
    let board = Math.floor(Math.random() * 2);
    let cat = Math.floor(Math.random() * 4);
    let que = Math.floor(Math.random() * 5);
    return [board, cat, que];
    // console.log(boards[board].categories[Object.keys(boards[board].categories)[cat]][que]);
}

for(let i=0; i<3; ++i) {
    dailyDoubles.push(pickRandomQuestion());
}
console.log(dailyDoubles);

io.on('connection', (socket) => {
    console.log('user connected');

    socket.on('room', ({username, room}) => {
        const user = userJoin(socket.id, username, room, 0);
        socket.join(user.room);
        io.to(user.room).emit('roomUsers', {
            id: socket.id,
            room: user.room,
            roomUsers: getRoomUsers(user.room)
        });

        io.to(user.room).emit('userJoin', {
            message : formatMessage(user.username)
        });

        let obj = boards[x].categories[Object.keys(boards[x].categories)[y]][z];

        dailyDoubles.forEach(ele => {
            if(ele[0]==x && ele[1]==y && ele[2]==z) {
                isDailyDouble = true;
            }
        });

        io.to(user.room).emit('question', {
            que : obj.question,
            ans : obj.answer,
            board : x,
            point : x==1?obj.point*2:obj.point,
            category : Object.keys(boards[x].categories)[y],
            isDailyDouble : isDailyDouble
        });
        isDailyDouble = false;
    });

    socket.on('addPoint', (data) => {
        updateRoomUsersPoint(data.username, data.point);
        io.to(data.room).emit('roomUsers', {
            roomUsers: getRoomUsers(data.room)
        });

        if(x==2 && y==0 && z==0) {
            x=0; y=0; z=0;
            io.to(data.room).emit('gameEnd', {
                winner : getWinner()    
            });
        }
        else if(x<2 && y==3 && z==4) {
            x = x + 1;
            y = 0;
            z = 0;
        }
        else if(z==4) {
            y = y + 1;
            z = 0;
        }
        else {
            z = z + 1;
        }

        dailyDoubles.forEach(ele => {
            if(ele[0]==x && ele[1]==y && ele[2]==z) {
                isDailyDouble = true;
            }
        });

        let obj = boards[x].categories[Object.keys(boards[x].categories)[y]][z];

        io.to(data.room).emit('nextQue', {
            que : obj.question,
            ans : obj.answer,
            board : x,
            point : x==1?obj.point*2:obj.point,
            category : Object.keys(boards[x].categories)[y],
            isDailyDouble : isDailyDouble
        });
        isDailyDouble = false;
    });

    socket.on('substractPoint', (data) => {
        substractRoomUsersPoint(data.username, data.point);
        io.to(data.room).emit('roomUsers', {
            roomUsers: getRoomUsers(data.room)
        });

        trackWrong.push(data.username);
        if(trackWrong.length == userLen()) {
            trackWrong.length = 0;
            if(x==2 && y==0 && z==0) {
                x=0; y=0; z=0;
                io.to(data.room).emit('gameEnd', {
                    winner : getWinner()    
                });
            }
            else if(x<2 && y==3 && z==4) {
                x = x + 1;
                y = 0;
                z = 0;
            }
            else if(z==4) {
                y = y + 1;
                z = 0;
            }
            else {
                z = z + 1;
            }

            dailyDoubles.forEach(ele => {
                if(ele[0]==x && ele[1]==y && ele[2]==z) {
                    isDailyDouble = true;
                }
            });
    
            let obj = boards[x].categories[Object.keys(boards[x].categories)[y]][z];
    
            io.to(data.room).emit('nextQue', {
                que : obj.question,
                ans : obj.answer,
                board : x,
                point : x==1?obj.point*2:obj.point,
                category : Object.keys(boards[x].categories)[y],
                isDailyDouble : isDailyDouble
            });
            isDailyDouble = false;
        } 
    });

    socket.on('resetGame', (room) => {
        resetUsers();
        x=0; y=0; z=0;
    });

    socket.on('message', (data) => {
        text[data.room] = data.obj
        socket.compress(true).broadcast.to(data.room).emit('text', data.obj);
    });

    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if(user) {
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                roomUsers: getRoomUsers(user.room)
            });

            io.to(user.room).emit('userLeft', {
                message : formatMessage(user.username)
            });
        }
        console.log('user disconnected');
    });
});

app.get('/', function(req, res) {
    res.redirect('index.html');
});
