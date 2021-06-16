// Modules initialization
const express = require('express');
const path = require('path');
const port = process.env.PORT || 3000
const app = express();
const http = require('http').createServer(app)
const io = require('socket.io')(http)
var bodyParser = require('body-parser')
var compression = require('compression');
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
// const client = redis.createClient({
//     port: normalizePort(process.env.REDIS_PORT),
//     host: process.env.REDIS_HOST,
//     password: process.env.REDIS_PASS,
//     tls: {
//         rejectUnauthorized: false
//     }
// });

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
app.use(compression());
app.use(express.static(path.join(__dirname, 'public'), {
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        if (path.match(/\.(css|png|jpg|jpeg|gif|ico|svg|js)$/)) {
            const date = new Date();
            date.setFullYear(date.getFullYear() + 1);
            res.setHeader("Expires", date.toUTCString());
            res.setHeader("Cache-Control", "public, max-age=345600, immutable");
        }
    }
}));
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
            trackRoom[room][0]['trackWrong'] = [];
            trackRoom[room][1] = {};
            trackRoom[room][1]['dailyDoubles'] = [];
            for(let i=0; i<3; ++i) {
                trackRoom[room][1]['dailyDoubles'].push(pickRandomQuestion());
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
    });

    socket.on('getQuestion', (data) => {
        let obj = boards[data.x].categories[Object.keys(boards[data.x].categories)[data.y]][data.z];
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
        io.to(data.room).emit('roomUsers', {
            roomUsers: getRoomUsers(data.room)
        });

        if(data.round == 2) {
            io.to(data.room).emit('gameEnd', {
                winner : getWinner(data.room)    
            });
        }

        io.to(data.room).emit('dashboard');
    });

    // Wrong answer event handler
    socket.on('substractPoint', (data) => {
        substractRoomUsersPoint(data.username, data.point, data.room);
        io.to(data.room).emit('roomUsers', {
            roomUsers: getRoomUsers(data.room)
        });

        trackRoom[data.room][0]['trackWrong'].push(data.username);

        if(trackRoom[data.room][0]['trackWrong'].length == userLen(data.room)) {
            trackRoom[data.room][0]['trackWrong'].length = 0;

            if(data.round == 2) {
                io.to(data.room).emit('gameEnd', {
                    winner : getWinner(data.room)    
                });
            }

            io.to(data.room).emit('dashboard');
        } 
    });

    // Reset game
    socket.on('resetGame', (room) => {
        resetUsers(room);

        trackRoom[room][0]['trackWrong'].length = 0;

        io.to(room).emit('roomUsers', {
            room: room,
            roomUsers: getRoomUsers(room)
        });
        
        trackRoom[room][1]['dailyDoubles'].length = 0;
        for(let i=0; i<3; ++i) {
            trackRoom[room][1]['dailyDoubles'].push(pickRandomQuestion());
        }

        io.to(room).emit('resetDashboard');
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
            const idx = trackRoom[user.room][0]['trackWrong'].findIndex(ele => ele === user.username);
            if(idx !== -1) {
                trackRoom[user.room][0]['trackWrong'].splice(idx, 1)[0];
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