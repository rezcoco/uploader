const path = require('path')
const { readdir, rename, copyFile, rm } = require('node:fs/promises')
const { exec } = require('node:child_process')

async function rd (path) {
    return readdir(path, { withFileTypes: true })
}

function imgName (fileName) {
    const s = fileName.split('-')
    s.splice(0, s.length - 1)

    return s.join('')
}

function rn (files, fullDirPath) {
    files.forEach(async (file) => {
        const fileName = file.name
        if (file.isFile()) {
            const fName = imgName(fileName)
            return rename(path.join(fullDirPath, fileName), path.join(fullDirPath, fName))
        } else {
            const folderPath = path.join(fullDirPath, fileName)
            const folder = await rd(folderPath)
            return rn(folder, folderPath)
        }
    })
}

async function bulkRenamer (PATH) {
    const dir = await rd(PATH)
    const dirname = dir.filter((dirent) => dirent.isDirectory())[0].name
    const fullDirPath = path.join(PATH, dirname, '/')
    const files = await rd(fullDirPath)

    // renaming
    await rn(files, fullDirPath)

    console.log('Done renaming')
    await copyFile(path.join(__dirname, 'How-To-Buy.txt'), path.join(fullDirPath, 'How-To-Buy.txt'))
    return fullDirPath
}

function archive (fileName, filePath) {
    console.log(`Archiving ${fileName}`)
    const exc = exec(`../scripts/archive.sh "${fileName}" "${filePath}"`, { cwd: __dirname })
    return new Promise((resolve, reject) => {
        exc.stderr.on('data', (data) => {
            console.error(data)
        })
        exc.on('close', (code) => {
            console.log('Archived: ', fileName, 'Code: ', code)
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
