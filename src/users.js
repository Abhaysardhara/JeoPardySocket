const users = [];

function userJoin(id, username, room, score) { 
    const user = {
        id : id,
        username : username,
        room : room,
        score : score
    };
    users.push(user);
    return user;
}

function userLeave(id) {
    const idx = users.findIndex(user => user.id === id);
    if(idx !== -1) {
        return users.splice(idx, 1)[0];
    }
}

function distinctRooms() {
    return [...new Set(users.map(x => x.room))];
}

function getRoomUsers(room) {
    return users.filter(user => user.room === room);
}

function updateRoomUsersPoint(username, score, room) {
    let idx = users.findIndex(user => ((user.username == username) && (user.room == room)));
    users[idx].score += score;
}

function substractRoomUsersPoint(username, score, room) {
    let idx = users.findIndex(user => ((user.username == username) && (user.room == room)));
    users[idx].score -= score;
}

function userLen(room) {
    return users.filter(user => user.room==room).length;
}

function getWinner(room) {
    let userInRoom = users.filter(user => user.room == room).sort((a, b) => b - a);

    let message = '';
    let len = userInRoom.length;

    if(len) {
        message += '1st : ' + userInRoom[0].username + ' (Score: ' + userInRoom[0].score + ')\n';
        len-=1;
    }
    if(len) {
        message += '2nd : ' + userInRoom[1].username + ' (Score: ' + userInRoom[1].score + ')\n';
        len-=1;
    }
    if(len) {
        message += '3rd : ' + userInRoom[2].username + ' (Score: ' + userInRoom[2].score + ')\n';
        len-=1;
    }
    if(len) {
        message += '4th : ' + userInRoom[3].username + ' (Score: ' + userInRoom[3].score + ')\n';
        len-=1;
    }
    return message;
}

Array.prototype.remove = function(value) {
    for (var i = this.length; i--; )
    {
        if (this[i].room === value) {
            this.splice(i, 1);
        }
    }
}

function resetUsers(room) {
    users.forEach(ele => {
        (ele.room == room)&&(ele.score=0);
    })
    // users.remove(room);
}

module.exports = {
    userJoin,
    userLeave,
    getRoomUsers,
    updateRoomUsersPoint,
    substractRoomUsersPoint,
    userLen,
    getWinner,
    resetUsers,
    distinctRooms
};