const fs = require('fs');
const mongoose = require("mongoose");
const path = require('path');

const URI = "mongodb+srv://juli10capo:K5vUbroOWDUN5ham@consultorio.apuakw2.mongodb.net/?retryWrites=true&w=majority&appName=consultorio";

const FILES_PATH = path.join(__dirname, 'files');

if (!fs.existsSync(FILES_PATH)) {
    fs.mkdirSync(FILES_PATH)
}

mongoose
    .connect(URI)
    .then((db) => console.log("DB is connected"))
    .catch((err) => console.error(err));

module.exports = mongoose;