/******************************************************************
*    Description: This file handles DOM events and socket events. *
*    Author: Abhay Sardhara                                       *
*    Email: abhays7675@gmail.com                                  *

*******************************************************************/
var socket = io({transports: ['websocket'], upgrade: false});

// DOM Events
const userList = document.getElementById('users');
const trackList = document.getElementById('track');
const checkAns = document.getElementById('checkAns');
const resetGame = document.getElementById('resetGame');
const logout = document.getElementById('logout');
const msg = document.getElementById('msg');
var sound = new Audio("./assets/sounds/dailyDouble.wav");
document.getElementById('seeAns').style.display = "none";
var room = sessionStorage.getItem("room");
var username = sessionStorage.getItem("name"),
    answer,
    point,
    status=false;

// Join User to specified room
socket.emit('room', {username, room});

$(function() {
    $("form").submit(function() { return false; });
});

// Execute a function when the user releases a key on the keyboard
msg.addEventListener("keyup", event => {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
      // Cancel the default action, if needed
      event.preventDefault();
      // Trigger the checkAns element with a click
      checkAns.click();
    }
});
  

// Check similarity between user input and answer of question
function similarity(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
    }

    function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
        if (i == 0)
            costs[j] = j;
        else {
            if (j > 0) {
            var newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
                newValue = Math.min(Math.min(newValue, lastValue),
                costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
            }
        }
        }
        if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

// Print all available users with their score in specific room
function outputUsers(users) {
    userList.innerHTML = '';
    users.forEach((user) => {
      const li = document.createElement('li');
      li.classList.add("list-group-item");
      li.innerText = user.username + ': ' + user.score;
      userList.appendChild(li);
    });
}

// Tracking User Join
function outputTracksjoin(user) {
      const li = document.createElement('li');
      li.classList.add("list-group-item");
      li.innerText = user.username + ' joined room - ' + user.time;
      trackList.appendChild(li);
}

//  Tracking User leave
function outputTracksLeave(user) {
      const li = document.createElement('li');
      li.classList.add("list-group-item");

      li.innerText = user.username + ' left room - ' + user.time;
      trackList.appendChild(li);
}

//  Display question
function displayQuestion(data) {
    document.getElementById('question').innerText = data;
}

// Display board data (currently which round is going on)
function displayBoard(data) {
    if(data==2) {
        document.getElementById('board').innerText = 'Final Round';
    }
    else {
        document.getElementById('board').innerText = 'Round: ' + (data+1);
    }
}

// Display points of current question on screen
function displayPoint(data) {
    document.getElementById('point').innerText = 'Point: ' + data;
}

//  Display category of question
function displayCat(data) {
    document.getElementById('category').innerText = data;
}

// Reset Game in room
resetGame.addEventListener('click', () => {
    socket.emit('resetGame', room);
    // setTimeout(reloadPage, 2000);
})

// Logout from room
logout.addEventListener('click', () => {
    socket.emit('logout');
    window.location = "http://localhost:3000/";
})

// Check user's answer (If similarity is greater or equal to 85% then answer is right, otherwise wrong)
checkAns.addEventListener('click', ()=> {
    let text = document.getElementById('msg').value;
    if(text.length > 0) {
        let z = similarity(text, answer) * 100.0;
        if(z >= 85) {
            socket.emit('addPoint', {username, point, room});
        }
        else {
            socket.emit('substractPoint', {username, point, room});
            document.getElementById("answer").style.display = "none";
            document.getElementById('seeAns').style.display = "block";
        }
    }
    else {
        alert('Please enter answer!!!');
    }
})

// Show answer
document.getElementById('seeAns').addEventListener('click', () => {
    document.getElementById('solution').innerText = answer;
});

// User Join
socket.on('userJoin', (data) => {
    outputTracksjoin(data.message);
})

// socket.on('redirectToHome', () => {
//     location.href('/');
// })

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
    msg.value = '';
    displayBoard(data.board);
    displayQuestion(data.que);
    displayPoint(data.point);
    displayCat(data.category);
    answer = data.ans;
    point = data.point;
    document.getElementById('dailyDouble').style.display = "none";
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
    msg.value='';
    if(document.getElementById("answer").style.display = "none") {
        document.getElementById("answer").style.display = "block";
    }
    document.getElementById('seeAns').style.display = "none";
    document.getElementById('solution').innerText = '';
    displayBoard(data.board);
    displayQuestion(data.que);
    displayPoint(data.point);
    displayCat(data.category);
    document.getElementById('dailyDouble').style.display = "none";
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

// Handle Socket Reconnection
socket.on('reconnect_error', () => {
    console.log('attempt to reconnect has failed');
})
