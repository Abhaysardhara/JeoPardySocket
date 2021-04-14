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

function getRoomUsers(room) {
    return users.filter(user => user.room === room);
}

function updateRoomUsersPoint(username, score) {
    let idx = users.findIndex(user => user.username == username);
    users[idx].score += score;
}

function substractRoomUsersPoint(username, score) {
    let idx = users.findIndex(user => user.username == username);
    users[idx].score -= score;
}

function userLen() {
    return users.length;
}

function getWinner() {
    let maxi=-1;
    users.forEach(ele => {
        if(ele.score >= maxi) {
            maxi = ele.score;
        }
    });
    return users.filter(user => user.score === maxi);
}

function resetUsers() {
    users.length = 0;
}

module.exports = {
    userJoin,
    userLeave,
    getRoomUsers,
    updateRoomUsersPoint,
    substractRoomUsersPoint,
    userLen,
    getWinner,
    resetUsers
};