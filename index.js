// Modules initialization
const express = require('express');
const path = require('path');
const port = process.env.PORT || 3000
const app = express();
const http = require('http').createServer(app)
const io = require('socket.io')(http)
var bodyParser = require('body-parser')
var compression = require('compression');

// HTTP Listen
http.listen(port, () => console.log(`server listening on port: ${port}`))

// View Engine
app.set('view engine', 'hbs');
// Express file compression
app.use(compression());
// Express static pages
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
// Body Parser Json
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ type: 'application/*+json' }));

// Client socket connection handler
io.on('connection', (socket) => {
    console.log('user connected');
    require('./src/socketLogic')(socket, io);
});

// Routes
require('./routes/routes')(app);