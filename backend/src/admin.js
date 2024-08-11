require("./database/database.js");
const bcrypt = require("bcrypt");
const Paciente = require("./database/models/Paciente.js");

async function main(admin) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(admin.dni, salt);
    admin.pass = hash;
    await Paciente.create(admin)
}

main({
    dni: 'ecarduz',
    admin: true,
});