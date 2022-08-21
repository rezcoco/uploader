const { readdir, rename, copyFile, rm } = require('node:fs/promises')
const { exec } = require('node:child_process')
const path = require('path');


async function bulkRenamer(path, fileName) {
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
  console.log(`Archiving ${fileName}`)
  const exc = exec(`../archive.sh "${fileName}" "${parentPath}"`, { cwd: __dirname })
  return new Promise((resolve, reject) => {
    exc.stderr.on('data', (data) => {
      reject(data)
    });
    exc.on('close', (code) => {
      console.log('Archive: ', code)
      resolve(fileName)
    })
  })
}

async function clean(path) {
  console.log(`Cleaning ${path}`)
  return rm(path, { recursive: true })
}

module.exports = {
  bulkRenamer, archive, clean
}
