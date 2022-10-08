const axios = require('axios')
const time = 1000 * 60 * 10

function alive (BASE_URL) {
    function ping () {
        const date = new Date()
        axios.get(BASE_URL)
        return console.log(`Waked up on ${date}`)
    }
    setInterval(ping, time)
}

module.exports.alive = alive
