const path = require('path')
const { readdir, rename, copyFile, rm } = require('node:fs/promises')
const { exec } = require('node:child_process')

async function bulkRenamer (PATH) {
  const dir = await readdir(PATH, { withFileTypes: true })
  const dirname = dir.filter((dirent) => dirent.isDirectory())[0].name
  const fullDirPath = PATH + dirname + '/'
  const files = await readdir(fullDirPath)
  files.forEach((file) => {
    const fName = file.match(/(?=MrCong.com).+/i)[0].split('-')[1]
    rename(fullDirPath + file, fullDirPath + fName)
  })
  console.log('Done renaming')
  await copyFile(path.join(__dirname, 'How-To-Buy.txt'), path.join(fullDirPath, 'How-To-Buy.txt'))
  return fullDirPath
}

function archive (fileName, filePath) {
  console.log(`Archiving ${filePath}`)
  const exc = exec(`../archive.sh "${fileName}" "${filePath}"`, { cwd: __dirname })
  return new Promise((resolve, reject) => {
    exc.stderr.on('data', (data) => {
      console.error(data)
    })
    exc.on('close', (code) => {
      console.log('FileName: ', fileName, 'Archived: ', code)
      resolve(fileName)
    })
  })
}

async function clean (path) {
  return rm(path, { recursive: true })
}

module.exports = {
  bulkRenamer, archive, clean
}
