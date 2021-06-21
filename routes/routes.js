const { userLen } = require('../src/users');
module.exports = function(app){
    // router
    app.get('/', (req, res) => {
        res.render('index', {isSet: false});
    });

    app.post('/game', (req, res) => {
        res.render('game');
    });

    app.get('/new', (req, res) => {
        res.render('index', {message: 'Please enter your name and room name', isSet: true})
    })

    app.post('/new', (req, res) => {
        if(userLen(req.body.roomname) == 4) {
            res.render('index', {message: 'Room is full, Create new room or join other room', isSet: true});
        }
        else {
            res.render('new');
        }
    })
}