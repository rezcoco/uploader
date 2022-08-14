const { readdir } = require('node:fs/promises')
const { rename } = require('node:fs/promises')
const { copyFile } = require('node:fs/promises')
const { exec } = require('node:child_process')
const path = require('path');


async function bulkRenamer(path, fileName, gid) {
  const dir = await readdir(path, { withFileTypes: true })
  const dirname = dir.filter((dirent) => dirent.isDirectory())[0].name
  const fullDirPath = path+dirname+'/'
  const files = await readdir(fullDirPath)
  files.forEach((file) => {
    const fName = file.match(/(?=MrCong.com).+/i)[0].split('-')[1]
    rename(fullDirPath+file, fullDirPath+fName)
  })
  console.log('Done renaming')
  await copyFile(__dirname+'/How-To-Buy.txt', fullDirPath+'/How-To-Buy.txt')
  return fullDirPath
}

function archive(fileName, filePath) {
  const parentPath = path.dirname(filePath)
  const exc = exec(`../archive.sh "${fileName}" "${parentPath}"`, { cwd: __dirname })
  return new Promise((resolve, reject) => {
    exc.stdout.on('data', (data) => {
      console.log(data);
    });
    exc.stderr.on('data', (data) => {
      reject(data)
    });
    exc.on('close', (code) => {
      console.log('Closed: ', code)
      if (code === 0) resolve(fileName)
    })
  })
}

module.exports = {
  bulkRenamer, archive
}