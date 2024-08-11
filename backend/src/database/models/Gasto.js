const mongoose = require("mongoose");
const { Schema } = mongoose;

const Gasto = new Schema(
  {
    cantidad: {
      type: Number,
    },
    descripcion: {
      type: String,
    },
    fecha: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Gasto", Gasto);
