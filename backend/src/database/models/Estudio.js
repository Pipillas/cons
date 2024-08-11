const mongoose = require("mongoose");
const { Schema } = mongoose;

const Estudio = new Schema(
  {
    paciente: {
      type: Object,
      required: true,
    },
    numero: {
      type: String,
    },
    tipoEstudio: {
      type: String,
    },
    doctor: {
      type: String,
    },
    estudios: {
      type: Array,
    },
    importeEfectivo: {
      type: String,
    },
    importeTarjeta: {
      type: String,
    },
    fecha: {
      type: String,
    },
    color: {
      type: String,
    },
    impresa: {
      type: Boolean,
    },
    informes: {
      type: Array,
    },
    tomografia: {
      type: Boolean,
    },
    cefalometria: {
      type: Boolean,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Estudio", Estudio);
