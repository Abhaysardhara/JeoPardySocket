// Modules initialization
const express = require('express');
const path = require('path');
const port = process.env.PORT || 3000
const app = express();
const http = require('http').createServer(app)
const redis = require('redis');
const io = require('socket.io')(http)
var bodyParser = require('body-parser')
const dotenv = require('dotenv');
dotenv.config();
const formatMessage = require('./utils/message');
const { userJoin, 
        userLeave, 
        getRoomUsers, 
        updateRoomUsersPoint, 
        substractRoomUsersPoint, 
        userLen, 
        getWinner, 
        resetUsers,
        distinctRooms
    } = require('./utils/users');


/**  Normalize a port into a number, string, or false. */
function normalizePort(val) {
    var port = parseInt(val, 10);
  
    if (isNaN(port)) {
        return val;
    }
  
    if (port >= 0) {
        return port;
    }
    return false;
}

// Redis Cache Connection
const client = redis.createClient({
    port: normalizePort(process.env.REDIS_PORT),
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASS,
    tls: {
        rejectUnauthorized: false
    }
});

// client.on('connect', (err, reply) => {
//     if(err) {
//         console.log('error redis');
//     }
//     console.log('redis connected');
// });
// client.on('error', (err) => {
//     console.log('Error: ' + err);

// });

// HTTP Listen
http.listen(port, () => console.log(`server listening on port: ${port}`))

// Pre defined states
var trackRoom = {};
var questions = require('./game/jeopardy_questions.json');
var boards = questions["boards"];

// Express static pages
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ type: 'application/*+json' }));

// Pick Random Questions for daily doubles
function pickRandomQuestion() {
    let board = Math.floor(Math.random() * 2);
    let cat = Math.floor(Math.random() * 4);
    let que = Math.floor(Math.random() * 5);
    
    return [board, cat, que];
}

function isDailyDoubleChecker(nested, x, y, z) {    
    for(let i=0; i<nested.length; ++i) {
        if(nested[i][0]==x && nested[i][1]==y && nested[i][2]==z) return true;
    }
    return false;
}

// Client socket connection handler
io.on('connection', (socket) => {
    console.log('user connected');

    socket.on('room', ({username, room}) => {
        const user = userJoin(socket.id, username, room, 0);
        socket.join(user.room);
        socket.room = user.room;
        socket.name = user.user;

        io.sockets.emit('newRoom', {rooms : distinctRooms()});

        if(userLen(room) == 1) {
            trackRoom[room] = [];
            trackRoom[room][0] = {};
            trackRoom[room][0]['x'] = 0;
            trackRoom[room][0]['y'] = 0;
            trackRoom[room][0]['z'] = 0;
            trackRoom[room][1] = {};
            trackRoom[room][1]['trackWrong'] = [];
            trackRoom[room][2] = {};
            trackRoom[room][2]['dailyDoubles'] = [];
            for(let i=0; i<3; ++i) {
                trackRoom[room][2]['dailyDoubles'].push(pickRandomQuestion());
            }
        }

        io.to(user.room).emit('roomUsers', {
            id: socket.id,
            room: user.room,
            roomUsers: getRoomUsers(user.room)
        });

        io.to(user.room).emit('userJoin', {
            message : formatMessage(user.username)
        });

        let x = trackRoom[room][0]['x'];
        let y = trackRoom[room][0]['y'];
        let z = trackRoom[room][0]['z'];
        let obj = boards[x].categories[Object.keys(boards[x].categories)[y]][z];

        io.to(user.room).emit('question', {
            que : obj.question,
            ans : obj.answer,
            board : x,
            point : x==1?obj.point*2:obj.point,
            category : Object.keys(boards[x].categories)[y],
            isDailyDouble : isDailyDoubleChecker(trackRoom[room][2]['dailyDoubles'], x, y, z)
        });
    });

    // Correct answer event handler
    socket.on('addPoint', (data) => {
        updateRoomUsersPoint(data.username, data.point, data.room);
        trackRoom[data.room][1]['trackWrong'].length=0;
        io.to(data.room).emit('roomUsers', {
            roomUsers: getRoomUsers(data.room)
        });

        let x = trackRoom[data.room][0]['x'];
        let y = trackRoom[data.room][0]['y'];
        let z = trackRoom[data.room][0]['z'];

        if(x==2 && y==0 && z==0) {
            x=0; y=0; z=0;
            io.to(data.room).emit('gameEnd', {
                winner : getWinner(data.room)    
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

        let obj = boards[x].categories[Object.keys(boards[x].categories)[y]][z];

        io.to(data.room).emit('nextQue', {
            que : obj.question,
            ans : obj.answer,
            board : x,
            point : x==1?obj.point*2:obj.point,
            category : Object.keys(boards[x].categories)[y],
            isDailyDouble : isDailyDoubleChecker(trackRoom[data.room][2]['dailyDoubles'], x, y, z)
        });
        trackRoom[data.room][0]['x'] = x;
        trackRoom[data.room][0]['y'] = y;
        trackRoom[data.room][0]['z'] = z;
    });

    // Wrong answer event handler
    socket.on('substractPoint', (data) => {
        substractRoomUsersPoint(data.username, data.point, data.room);
        io.to(data.room).emit('roomUsers', {
            roomUsers: getRoomUsers(data.room)
        });

        // trackWrong.push(data.username);
        trackRoom[data.room][1]['trackWrong'].push(data.username);
        if(trackRoom[data.room][1]['trackWrong'].length == userLen(data.room)) {
            trackRoom[data.room][1]['trackWrong'].length = 0;
            let x = trackRoom[data.room][0]['x'];
            let y = trackRoom[data.room][0]['y'];
            let z = trackRoom[data.room][0]['z'];
            if(x==2 && y==0 && z==0) {
                x=0; y=0; z=0;
                io.to(data.room).emit('gameEnd', {
                    winner : getWinner(data.room)    
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
    
            let obj = boards[x].categories[Object.keys(boards[x].categories)[y]][z];
    
            io.to(data.room).emit('nextQue', {
                que : obj.question,
                ans : obj.answer,
                board : x,
                point : x==1?obj.point*2:obj.point,
                category : Object.keys(boards[x].categories)[y],
                isDailyDouble : isDailyDoubleChecker(trackRoom[data.room][2]['dailyDoubles'], x, y, z)
            });
            trackRoom[data.room][0]['x'] = x;
            trackRoom[data.room][0]['y'] = y;
            trackRoom[data.room][0]['z'] = z;
        } 
    });

    // Reset game
    socket.on('resetGame', (room) => {
        resetUsers(room);

        trackRoom[room][0]['x'] = 0;
        trackRoom[room][0]['y'] = 0;
        trackRoom[room][0]['z'] = 0;
        trackRoom[room][1]['trackWrong'].length = 0;

        io.to(room).emit('roomUsers', {
            room: room,
            roomUsers: getRoomUsers(room)
        });

        let obj = boards[0].categories[Object.keys(boards[0].categories)[0]][0];
        
        trackRoom[room][2]['dailyDoubles'].length = 0;
        for(let i=0; i<3; ++i) {
            trackRoom[room][2]['dailyDoubles'].push(pickRandomQuestion());
        }

        io.to(room).emit('question', { 
            que : obj.question,
            ans : obj.answer,
            board : trackRoom[room][0]['x'],
            point : trackRoom[room][0]['x']==1?obj.point*2:obj.point,
            category : Object.keys(boards[trackRoom[room][0]['x']].categories)[trackRoom[room][0]['y']],
            isDailyDouble : isDailyDoubleChecker(trackRoom[room][2]['dailyDoubles'], 0, 0, 0)
        });
        // io.to(room).emit('quit');
    });

    socket.on('logout', () => {
        const user = userLeave(socket.id);

        if(user) {
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                roomUsers: getRoomUsers(user.room)
            });

            io.to(user.room).emit('userLeft', {
                message : formatMessage(user.username)
            });
            const idx = trackRoom[user.room][1]['trackWrong'].findIndex(ele => ele === user.username);
            if(idx !== -1) {
                trackRoom[user.room][1]['trackWrong'].splice(idx, 1)[0];
            }
        }
    });

    // Broadcast message (chat PopUp)
    socket.on('new message', (data) => {
        socket.broadcast.to(data.room).emit('text', data);
    });

    // User disconnect event handler
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);
        io.sockets.emit('newRoom', {rooms : distinctRooms()});

        if(user) {
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                roomUsers: getRoomUsers(user.room)
            });

            io.to(user.room).emit('userLeft', {
                message : formatMessage(user.username)
            });
        }
    });
});

// router
app.get('/', (req, res) => {
    res.render('index', {isSet: false});
});

app.post('/game', (req, res) => {
    res.render('game');
});

app.post('/new', (req, res) => {
    if(userLen(req.body.roomname) == 4) {
        res.render('index', {message: 'Room is full, Create new room or join other room', isSet: true});
    }
    else {
        res.render('new');
    }
})