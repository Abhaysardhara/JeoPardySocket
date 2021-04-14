const moment = require('moment');

function formatMessage(username) {
    return {
        username : username,
        time : moment().utcOffset(330).format('h:mm a')
    };
}

module.exports = formatMessage;