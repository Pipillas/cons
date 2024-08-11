const mongoose = require("mongoose");
const { Schema } = mongoose;

const Paciente = new Schema(
  {
    dni: {
      type: String,
      unique: true,
    },
    pass: {
      type: String,
    },
    nombre: {
      type: String,
    },
    telefono: {
      type: String,
    },
    obraSocial: {
      type: String,
    },
    admin: {
      type: Boolean,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Paciente", Paciente);