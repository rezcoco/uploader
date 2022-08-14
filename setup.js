const { writeFile } = require('node:fs/promises')
const axios = require('axios')
const GD_TOKEN = process.env.GD_TOKEN
const CREDENTIALS = process.env.CREDENTIALS

async function setup() {
  const token = await axios.get(GD_TOKEN);
  const credentials = await axios.get(CREDENTIALS)
  
  await writeFile(__dirname+'/credentials.json', JSON.stringify(credentials.data))
  await writeFile(__dirname+'/token.json', JSON.stringify(token.data))
  return
};

module.exports.setup = setup
