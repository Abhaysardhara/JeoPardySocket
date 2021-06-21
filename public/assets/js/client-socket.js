/**********************************
*      Socket Logic               *
***********************************/

// User Join
socket.on('userJoin', (data) => {
    outputTracksjoin(data.message);
})

// Handle game end
socket.on('gameEnd', (data) => {
    // if(data.winner.length == 0) {
    //     socket.emit('resetGame', room);
    //     alert('No one is winner');
    // }
    // else {
    //     let text = '';
    //     data.winner.forEach(ele => {
    //         text += ele.username + ' is winner\n';
    //     });
    //     socket.emit('resetGame', room);
    //     alert(text);
    // }
    console.log(data);
    alert(data.winner);
})

// Response question data from SERVER
socket.on('question', (data) => {
    isDD=false;
    if(round==0) {
        gamePage0.classList.add('hidden');
    }
    else if(round==1) {
        gamePage1.classList.add('hidden');
    }
    else {
        gamePage2.classList.add('hidden');
    }
    roomDesk.classList.remove('hidden');
    document.getElementById("answer").classList.remove('hidden');
    document.getElementById('dailyDouble').classList.add('hidden');
    document.getElementById('show').classList.add('hidden');
    document.getElementById('solution').innerText = '';
    msg.value = '';
    msg.focus();
    displayBoard(data.board);
    displayQuestion(data.que);
    displayPoint(data.point);
    displayCat(data.category);
    answer = data.ans;
    point = data.point;
    if(data.isDailyDouble) {
        document.getElementById('dailyDouble').classList.remove('hidden');
        sound.play();
        isDD=true;
        point += data.point;
        displayPoint(point);
    }
    y = data.y;
    z = data.z;
    console.log(data.que);
    console.log(data.ans);
})

socket.on('dashboard', () => {
    if(round==0) {
        gamePage0.classList.remove('hidden');
    }
    else if(round==1) {
        gamePage1.classList.remove('hidden');
    }
    else {
        gamePage2.classList.remove('hidden');
    }
    roomDesk.classList.add('hidden');
    let dataid = round + '-' + y + '-' + z;
    let clueBox = document.querySelector(`[data-id="${dataid}"]`);
    clueBox.classList.add('disabled');
    clueBox.classList.add('clue-box-answered');
    clueBox.removeEventListener('click', creatNewClue);

    memory[y][z] = 1;

    let flag = true;
    memory.forEach(arr => {
        arr.forEach(e => {
            if(e==0) {
                flag = false;
            }
        });
    });

    if(flag) {
        for(let i=0; i<4; ++i) {
            for(let j=0; j<5; ++j) {
                memory[i][j] = 0;
            }
        }

        round += 1;

        if(round==1) {
            gamePage0.classList.add('hidden');
            gamePage1.classList.remove('hidden');
        }
        else if(round==2) {
            gamePage1.classList.add('hidden');
            gamePage2.classList.remove('hidden');
        }
    }
    delete flag;
})

socket.on('resetDashboard', () => {
    gamePage0.classList.remove('hidden');
    gamePage1.classList.add('hidden');
    gamePage2.classList.add('hidden');
    roomDesk.classList.add('hidden');

    clueBoxes.forEach((clueBox) => {
        clueBox.classList.remove('disabled');
        clueBox.classList.remove('clue-box-answered');
        clueBox.classList.add('clue-box-hover');
        clueBox.addEventListener('click', creatNewClue);
    });

    round=0;
    for(let i=0; i<4; ++i) {
        for(let j=0; j<5; ++j) {
            memory[i][j] = 0;
        }
    }
})

socket.on('gameState', (data) => {
    if(data.board == 1) {
        gamePage0.classList.add('hidden');
        gamePage1.classList.remove('hidden');
    }
    else if(data.board == 2) {
        gamePage0.classList.add('hidden');
        gamePage1.classList.add('hidden');
        gamePage2.classList.remove('hidden');
    }

    data.state.forEach(s => {
        let dataid = s[0] + '-' + s[1] + '-' + s[2];
        let clueBox = document.querySelector(`[data-id="${dataid}"]`);
        clueBox.classList.add('disabled');
        clueBox.classList.add('clue-box-answered');
        clueBox.removeEventListener('click', creatNewClue);
    })
    console.log(data)
})

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