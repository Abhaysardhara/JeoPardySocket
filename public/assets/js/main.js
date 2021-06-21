/******************************************************************
*    Description: This file handles DOM events and socket events. *
*    Author: Abhay Sardhara                                       *
*    Email: abhays7675@gmail.com                                  *
*******************************************************************/

// Socket Initialization
var socket = io({transports: ['websocket'], upgrade: false});

// DOM Events
const userList = document.getElementById('users');
const trackList = document.getElementById('track');
const checkAns = document.getElementById('checkAns');
const resetGame = document.getElementById('resetGame');
const logout = document.getElementById('logout');
const msg = document.getElementById('msg');
const liverooms = document.getElementById('live-rooms');
const clueBoxes = document.querySelectorAll('.clue-box');
const gamePage0 = document.getElementById('gamePage0');
const gamePage1 = document.getElementById('gamePage1');
const gamePage2 = document.getElementById('gamePage2');
const roomDesk = document.getElementById('roomDesk');
var sound = new Audio("./assets/sounds/dailyDouble.wav");
var room = sessionStorage.getItem("room"),
    username = sessionStorage.getItem("name"),
    answer,
    point,
    round=0, y, z,
    status=false, isDD=false;
var memory = [[0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0]];

// Join User to specified room
socket.emit('room', {username, room});


/**********************************
*      Utility Functions          *
***********************************/

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
        const i = document.createElement('i');
        i.classList.add("fa");
        i.classList.add("fa-circle");
        i.classList.add("text-success");
        const span = document.createElement('span');
        span.classList.add("usernames");
        span.innerText = user.username + ': ' + user.score;
        li.appendChild(i);
        li.appendChild(span);
        userList.appendChild(li);
    });
}

// Print Live Rooms
function outputRooms(e) {
    liverooms.innerHTML = '';
    let tempRooms = e.rooms.filter(x => x != room);
    tempRooms.unshift(room);
    tempRooms.forEach((r, idx) => {
        const li = document.createElement('li');
        const span = document.createElement('span');
        if(idx==0) {
            span.classList.add("text-bold")
        }
        span.innerText = r;
        li.appendChild(span);
        liverooms.appendChild(li);
    });
    delete tempRooms;
}

// Tracking User Join
function outputTracksjoin(user) {
      const li = document.createElement('li');

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

/**********************************
*      DOM Event Section          *
***********************************/

// Avoid refresh page after form sumission
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

// Reset Game in room
resetGame.addEventListener('click', () => {
    socket.emit('resetGame', room);
})

// Logout from room
logout.addEventListener('click', () => {
    socket.emit('logout');
    window.location = "https://mnnit-jeopardy-socket.herokuapp.com/";
})

// Check user's answer (If similarity is greater or equal to 85% then answer is right, otherwise wrong)
checkAns.addEventListener('click', ()=> {
    let text = document.getElementById('msg').value;
    if(text.length > 0) {
        let z = similarity(text, answer) * 100.0;
        if(z >= 85) {
            socket.emit('addPoint', {username, point, room, round});
        }
        else {
            if(isDD) {
                point = point / 2;
                socket.emit('substractPoint', {username, point, room, round});
            }
            else {
                socket.emit('substractPoint', {username, point, room, round});
            }
            document.getElementById('show').classList.remove('hidden');
            document.getElementById("answer").classList.add('hidden');
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

document.getElementById("user-name").innerText = sessionStorage.getItem("name");
document.getElementById("room-name").innerText = "Room: " + sessionStorage.getItem("room");

clueBoxes.forEach((clueBox) => {
    clueBox.addEventListener('click', creatNewClue);
});

function creatNewClue() {
    let idx = $(this).data("id");
    let arr = idx.split("-");
    socket.emit('getQuestion', {room : room, x: round, y: arr[1], z: arr[2]});
}

// Continous time
$(document).ready(function() {
    var interval = setInterval(function() {
        var momentNow = moment();
        $('#date').html(momentNow.format('dddd').substring(0,3).toUpperCase() + ' - ' + momentNow.format('MMMM DD, YYYY'));  
        $('#time').html(momentNow.format('hh:mm:ss A'));
    }, 100);
});