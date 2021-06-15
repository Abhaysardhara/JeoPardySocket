/**********************************
*      Socket Logic               *
***********************************/

// User Join
socket.on('userJoin', (data) => {
    outputTracksjoin(data.message);
})

// Handle game end
socket.on('gameEnd', (data) => {
    if(data.winner.length == 0) {
        socket.emit('resetGame', room);
        alert('No one is winner');
    }
    else {
        let text = '';
        data.winner.forEach(ele => {
            text += ele.username + ' is winner\n';
        });
        socket.emit('resetGame', room);
        alert(text);
    }
    location.href('/');
})

// first question of the game
socket.on('question', (data) => {
    document.getElementById('dailyDouble').style.display = "none";
    msg.value = '';
    msg.focus();
    displayBoard(data.board);
    displayQuestion(data.que);
    displayPoint(data.point);
    displayCat(data.category);
    answer = data.ans;
    point = data.point;
    document.getElementById('seeAns').style.display = "none";
    document.getElementById('solution').innerText = '';
    if(data.isDailyDouble) {
        document.getElementById('dailyDouble').style.display = "block";
        sound.play();
        point += data.point;
        displayPoint(point);
    }
    console.log(data.que);
    console.log(data.ans);
})

// Next question of the game
socket.on('nextQue', (data) => {
    document.getElementById('dailyDouble').style.display = "none";
    msg.value='';
    msg.focus();
    if(document.getElementById("answer").style.display = "none") {
        document.getElementById("answer").style.display = "block";
    }
    document.getElementById('seeAns').style.display = "none";
    document.getElementById('solution').innerText = '';
    displayBoard(data.board);
    displayQuestion(data.que);
    displayPoint(data.point);
    displayCat(data.category);
    answer = data.ans;
    point = data.point;
    if(data.isDailyDouble) {
        document.getElementById('dailyDouble').style.display = "block";
        sound.play();
        point += data.point;
        displayPoint(point);
    }
    console.log(data.que);
    console.log(data.ans);
});

// Handle user left event
socket.on('userLeft', (data) => {
    outputTracksLeave(data.message);
})

// Track available users
socket.on('roomUsers', (data) => {
    outputUsers(data.roomUsers);
    document.getElementById('numUser').innerText = data.roomUsers.length;
})

socket.on('newRoom', (data) => {
    outputRooms(data)
})

// Handle Socket Reconnection
socket.on('reconnect_error', () => {
    console.log('attempt to reconnect has failed');
})