const mongoose = require("mongoose");
const { Schema } = mongoose;

const Plantilla = new Schema(
    {
        titulo: {
            type: String,
        },
        contenido: {
            type: String,
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Plantilla", Plantilla);
