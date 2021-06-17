const moment = require('moment');

// Format user tracking message
function formatMessage(username) {
    return {
        username : username,
        time : moment().utcOffset(330).format('h:mm a')
    };
}

module.exports = formatMessage;