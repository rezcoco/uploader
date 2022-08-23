const downloadStatus = {
  STATUS_UPLOADING: "Uploading...📤",
  STATUS_DOWNLOADING: "Downloading...📥",
  STATUS_FAILED: "Failed 🚫. Cleaning download",
  STATUS_ARCHIVING: "Archiving...🔐",
  STATUS_EXTRACTING: "Extracting...📂",
  STATUS_RENAMING: 'Renamaing...✏️',
  STATUS_CANCELLED: "Cancelled...❌"
}

const PROGRESS_MAX_SIZE = Math.floor(100 / 8);
const PROGRESS_INCOMPLETE = ['▰', '▰', '▰', '▰', '▰', '▰', '▰']

function generateProgress (completed, total) {
  let p
  if (completed == 0 && total == 0) {
    p = 0
  } else {
    p = (completed / total * 100).toFixed(2)
  }
  p = Math.min(Math.max(p, 0), 100);
  pr = Math.round(p)
  var str = '[';
  var cFull = Math.floor(pr / 8);
  var cPart = Math.round(pr % 8 - 1);
  str += '▰'.repeat(cFull);
  if (cPart >= 0) {
    str += PROGRESS_INCOMPLETE[cPart];
  }
  str += '▱'.repeat(PROGRESS_MAX_SIZE - cFull);
  str = `${str}] ${p}%`;

  return str;
}

function convertTime(s) {
  if (typeof s != 'number' || s == 0) {
    return '0s'
  }
  const fm = [
    Math.floor(s / 60 / 60 / 24), // DAYS
    Math.floor(s / 60 / 60) % 24, // HOURS
    Math.floor(s / 60) % 60, // MINUTES
    s % 60 // SECONDS
  ];
  const final = fm.map(function(v, i) {
    const format = ['d', 'h', 'm', 's']
    if (v !== 0) {
      return v + format[i]
    }
  }).join('');
  return final
}

function eta(totalLength, completedLength, speed) {
  if (!totalLength && !completedLength && !speed) {
    return 0 + 's'
  }
  const remainingLength = totalLength - completedLength
  return convertTime(Math.round(remainingLength / speed))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatSize (size) {
  if (size === 0) {
    return 0 + 'B'
  }
  if (size < 1000) {
    return formatNumber(size) + 'B';
  }
  if (size < 1024000) {
    return formatNumber(size / 1024) + 'KiB';
  }
  if (size < 1048576000) {
    return formatNumber(size / 1048576) + 'MiB';
  }
  return formatNumber(size / 1073741824) + 'GiB';
}

function formatNumber (n) {
  return Math.round(n * 100) / 100;
}

function getFileName(filePath) {
  const { path } = filePath
  const r = path.match(/(?=downloads\/\d\/).+/)
  if (r) {
    return r[0].split('/')[2]
  }
  return ''
}

class AriaDownloadStatus {
  constructor(aria2, gid, dir, status, part=0) {
    this.aria2 = aria2
    this.gid = gid
    this.dir = __dirname+'/downloads/'+dir+'/'
    this.part = part
    this.status = status
  }
  async getDownload(key) {
    return this.aria2.call('tellStatus', this.gid, key)
  }
  async name() { 
    const { files } = await this.getDownload(['files'])
    return getFileName(files[0])
  }
  async path() {
    const { files } = await this.getDownload(['files'])
    return files[0].path
  }
  async total() {
    const { totalLength } = await this.getDownload(['totalLength'])
    return formatSize(totalLength)
  }
  async downloaded() {
    const { completedLength } = await this.getDownload(['completedLength'])
    return formatSize(completedLength)
  }
  async speed() {
    const { downloadSpeed } = await this.getDownload(['downloadSpeed'])
    return formatSize(downloadSpeed)
  }
  async time() {
    const { totalLength, completedLength, downloadSpeed } = await this.getDownload(['totalLength', 'completedLength', 'downloadSpeed'])
    return eta(totalLength, completedLength, downloadSpeed)
  }
  async progress() {
    const { completedLength, totalLength } = await this.getDownload(['completedLength', 'totalLength'])
    return generateProgress(completedLength, totalLength)
  }
}

class GdriveDownloadStatus {
  constructor (fileName, status, size=0, completed=0) {
    this.fileName = fileName,
    this.size = size,
    this.completed = completed,
    this.status = status
  }
  progress() {
    return generateProgress(completed, size)
  }
}

module.exports = { AriaDownloadStatus, GdriveDownloadStatus, downloadStatus }
