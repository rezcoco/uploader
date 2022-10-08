const axios = require('axios')
const time = 1000 * 60 * 10

function alive (BASE_URL) {
    function ping () {
        return axios.get(BASE_URL)
    }
    setInterval(ping, time)
}

module.exports.alive = alive
