const fs = require('fs');
const mongoose = require("mongoose");
const path = require('path');

const URI = "mongodb://127.0.0.1/11deabril";

const FILES_PATH = path.join(__dirname, 'files');

if (!fs.existsSync(FILES_PATH)) {
    fs.mkdirSync(FILES_PATH)
}

mongoose
    .connect(URI)
    .then((db) => console.log("DB is connected"))
    .catch((err) => console.error(err));

module.exports = mongoose;