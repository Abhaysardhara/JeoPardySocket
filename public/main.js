var socket = io();

const submit = document.getElementById('create-room');
const yroom = document.getElementById('room-name');
const yname = document.getElementById('your-name');
const userList = document.getElementById('users');
const trackList = document.getElementById('track');
const checkAns = document.getElementById('checkAns');
var sound = new Audio("./assets/sounds/dailyDouble.wav");
document.getElementById('seeAns').style.display = "none";
var room;
var username,
    answer,
    point,
    status=false;

function reloadPage() {
    location.reload();
}

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

function outputUsers(users) {
    userList.innerHTML = '';
    users.forEach((user) => {
      const li = document.createElement('li');
      li.classList.add("list-group-item");
      li.innerText = user.username + ': ' + user.score;
      userList.appendChild(li);
    });
}

function outputTracksjoin(user) {
      const li = document.createElement('li');
      li.classList.add("list-group-item");
      li.innerText = user.username + ' joined room - ' + user.time;
      trackList.appendChild(li);
}

function outputTracksLeave(user) {
      const li = document.createElement('li');
      li.classList.add("list-group-item");

      li.innerText = user.username + ' left room - ' + user.time;
      trackList.appendChild(li);
}
function displayQuestion(data) {
    document.getElementById('question').innerText = data;
}

function displayBoard(data) {
    if(data==2) {
        document.getElementById('board').innerText = 'Final Round';
    }
    else {
        document.getElementById('board').innerText = 'Round: ' + (data+1);
    }
}

function displayPoint(data) {
    document.getElementById('point').innerText = 'Point: ' + data;
}

function displayCat(data) {
    document.getElementById('category').innerText = data;
}

submit.addEventListener('click', ()=> {
    room = yroom.value;
    username = yname.value;
    socket.emit('room', {username, room});
})

checkAns.addEventListener('click', ()=> {
    let text = document.getElementById('msg').value;
    let z = similarity(text, answer) * 100.0;
    if(z >= 75) {
        socket.emit('addPoint', {username, point, room});
    }
    else {
        socket.emit('substractPoint', {username, point, room});
        document.getElementById("answer").style.display = "none";
        document.getElementById('seeAns').style.display = "block";
    }
})

document.getElementById('seeAns').addEventListener('click', () => {
    alert('Answer is\n' + answer);
});

socket.on('userJoin', (data) => {
    outputTracksjoin(data.message);
})

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
    setTimeout(reloadPage, 2000);
})

socket.on('question', (data) => {
    displayBoard(data.board);
    displayQuestion(data.que);
    displayPoint(data.point);
    displayCat(data.category);
    answer = data.ans;
    point = data.point;
    document.getElementById('dailyDouble').style.display = "none";
    document.getElementById('seeAns').style.display = "none";
    if(data.isDailyDouble) {
        document.getElementById('dailyDouble').style.display = "block";
        sound.play();
        point += data.point;
        displayPoint(point);
    }
    console.log(data.que);
    console.log(data.ans);
})

socket.on('nextQue', (data) => {
    if(document.getElementById("answer").style.display = "none") {
        document.getElementById("answer").style.display = "block";
    }
    document.getElementById('seeAns').style.display = "none";
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

socket.on('userLeft', (data) => {
    outputTracksLeave(data.message);
})

socket.on('roomUsers', (data) => {
    outputUsers(data.roomUsers);
})

socket.on('reconnect_error', () => {
    console.log('attempt to reconnect has failed');
}) 