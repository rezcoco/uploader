const mongoose = require('mongoose');
const { Schema } = require('mongoose');
const URI = process.env.URI

const connectionParams = {
  useNewUrlParser: true,
  useUnifiedTopology: true
}

const main = async () => {
    await mongoose.connect(URI, connectionParams)
      .then( () => console.log('Connected to Mongodb'))
      .catch((err) => console.log(err))
    return mongoose
}

const LinkSchema = new Schema({
  name: { type: String, unique: true },
  link: Schema.Types.Mixed 
})

LinkSchema.statics.isDuplicate = async function(name) {
  try {
    const result = await this.findOne({name})
    if (result) return true
    return false
  } catch(err) {
    console.log(err)
  }
}
const Link = mongoose.model('link', LinkSchema)

module.exports = { main, Link }
