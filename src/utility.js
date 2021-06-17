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

module.exports = {
    pickRandomQuestion,
    isDailyDoubleChecker
};