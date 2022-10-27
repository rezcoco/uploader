const path = require('path')

const downloadStatus = {
    STATUS_UPLOADING: 'Uploading...📤',
    STATUS_DOWNLOADING: 'Downloading...📥',
    STATUS_FAILED: 'Failed 🚫. Cleaning download',
    STATUS_ARCHIVING: 'Archiving...🔐',
    STATUS_EXTRACTING: 'Extracting...📂',
    STATUS_RENAMING: 'Renamaing...✏️',
    STATUS_CANCELLED: 'Cancelled...❌',
    STATUS_WAITING: 'Waiting...⏳'
}

const PROGRESS_MAX_SIZE = Math.floor(100 / 8)
const PROGRESS_INCOMPLETE = ['▰', '▰', '▰', '▰', '▰', '▰', '▰']

function generateProgress (completed, total) {
    let p = !total ? 0 : Math.round(completed / total * 100)
    const pr = !total ? 0 : (completed / total * 100).toFixed(2)
    p = Math.min(Math.max(p, 0), 100)
    let str = '['
    const cFull = Math.floor(p / 8)
    const cPart = Math.round(p % 8 - 1)
    str += '▰'.repeat(cFull)
    if (cPart >= 0) {
        str += PROGRESS_INCOMPLETE[cPart]
    }
    str += '▱'.repeat(PROGRESS_MAX_SIZE - cFull)
    str = `${str}] ${pr}%`

    return str
}

function convertTime (s) {
    if (typeof s !== 'number' || s === 0) {
        return '0s'
    }
    const fm = [
        Math.floor(s / 60 / 60 / 24), // DAYS
        Math.floor(s / 60 / 60) % 24, // HOURS
        Math.floor(s / 60) % 60, // MINUTES
        s % 60 // SECONDS
    ]
    // eslint-disable-next-line array-callback-return
    const final = fm.map(function (v, i) {
        const format = ['d', 'h', 'm', 's']
        if (v !== 0) {
            return v + format[i]
        }
    }).join('')
    return final
}

function eta (totalLength, completedLength, speed) {
    if (totalLength === 0 || completedLength === 0) {
        return 0 + 's'
    }
    const remainingLength = totalLength - completedLength
    return convertTime(Math.round(remainingLength / speed))
}

// eslint-disable-next-line no-unused-vars
function sleep (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatSize (size) {
    if (size === 0) {
        return 0 + 'B'
    }
    if (size < 1000) {
        return formatNumber(size) + 'B'
    }
    if (size < 1024000) {
        return formatNumber(size / 1024) + 'KiB'
    }
    if (size < 1048576000) {
        return formatNumber(size / 1048576) + 'MiB'
    }
    return formatNumber(size / 1073741824) + 'GiB'
}

function formatNumber (n) {
    return Math.round(n * 100) / 100
}

function getFileName (filePath) {
    const { path } = filePath
    const r = path.match(/(?=downloads\/\d+\/).+/)
    if (r) {
        return r[0].split('/')[2]
    }
    return ''
}

class AriaDownloadStatus {
    constructor (aria2, gid, fileName, dir, status, part = false) {
        this.aria2 = aria2
        this.gid = gid
        this.fileName = fileName
        this.dir = path.join(__dirname, 'downloads', String(dir), '/')
        this.part = part
        this.status = status
        this.index = dir
    }

    async getDownload (key) {
        return this.aria2.call('tellStatus', this.gid, key)
    }

    async name () {
        const { files } = await this.getDownload(['files'])
        return getFileName(files[0])
    }

    async path () {
        const { files } = await this.getDownload(['files'])
        return files[0].path
    }

    async total () {
        const { totalLength } = await this.getDownload(['totalLength'])
        return formatSize(totalLength)
    }

    async downloaded () {
        const { completedLength } = await this.getDownload(['completedLength'])
        return formatSize(completedLength)
    }

    async speed () {
        const { downloadSpeed } = await this.getDownload(['downloadSpeed'])
        return formatSize(downloadSpeed)
    }

    async time () {
        const { totalLength, completedLength, downloadSpeed } = await this.getDownload(['totalLength', 'completedLength', 'downloadSpeed'])
        return eta(Number(totalLength), Number(completedLength), Number(downloadSpeed))
    }

    async progress () {
        const { completedLength, totalLength } = await this.getDownload(['completedLength', 'totalLength'])
        return generateProgress(Number(completedLength), Number(totalLength))
    }
}

module.exports = { AriaDownloadStatus, downloadStatus, formatSize }
