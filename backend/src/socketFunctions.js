const mongoose = require('mongoose');
const Estudio = require('./database/models/Estudio.js');
const Paciente = require('./database/models/Paciente.js');
const Ingreso = require('./database/models/Ingreso.js');
const Gasto = require('./database/models/Gasto.js');
const Plantilla = require('./database/models/Plantilla.js');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
/*
const puppeteer = require('puppeteer');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

//INTERNO

const wwebVersion = '2.2412.54';

const client = new Client({
    authStrategy: new LocalAuth(),
    webVersionCache: {
        type: 'remote',
        remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${wwebVersion}.html`,
    },
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.initialize();
*/
async function editarEstudio(estudio) {
    const ID = mongoose.Types.ObjectId.createFromHexString(estudio._id);
    const estudo_sin_editar = await Estudio.findById(ID);
    estudio.estudios = estudio.estudios.map((est, index) => {
        let subido = false;
        let id = uuid.v4();
        let informe = 0;
        let extension = "";
        if (estudo_sin_editar.estudios[index]) {
            id = estudo_sin_editar.estudios[index].id;
            subido = estudo_sin_editar.estudios[index].subido;
            informe = estudo_sin_editar.estudios[index].informe;
            extension = estudo_sin_editar.estudios[index].extension;
        }
        return {
            nombre: est.nombre,
            id,
            subido,
            informe,
            extension,
        };
    });
    await Estudio.findByIdAndUpdate(ID, estudio);
};

async function crearEstudio(estudio) {
    const ultimoEstudio = await Estudio.findOne().sort({ createdAt: -1 });
    if (ultimoEstudio === null) {
        estudio.numero = 1;
    } else {
        estudio.numero = parseInt(ultimoEstudio.numero) + 1;
    }
    estudio.estudios = estudio.estudios.map((est) => {
        return {
            nombre: est.nombre,
            subido: false,
            id: uuid.v4(),
            informe: 0,
            extension: ''
        };
    });
    await Estudio.create(estudio);
}

function copiarCarpeta(origen, destino) {
    if (!fs.existsSync(origen)) {
        fs.mkdirSync(origen);
    }
    if (!fs.existsSync(destino)) {
        fs.mkdirSync(destino);
    }
    const archivos = fs.readdirSync(origen);
    archivos.forEach(function (archivo) {
        const origenPath = path.join(origen, archivo);
        const destinoPath = path.join(destino, archivo);
        if (fs.lstatSync(origenPath).isDirectory()) {
            copiarCarpeta(origenPath, destinoPath);
        } else {
            fs.copyFileSync(origenPath, destinoPath);
        }
    });
    fs.rmSync(origen, { recursive: true, force: true });
}

async function chequearCambiosPaciente(paciente) {
    const paciente_sin_modificar = await Paciente.findById(paciente._id);
    const carpetaOriginal = path.join(__dirname, "database", "files", paciente_sin_modificar.dni);
    const carpetaNueva = path.join(__dirname, "database", "files", paciente.dni);
    if (carpetaOriginal !== carpetaNueva) {
        copiarCarpeta(carpetaOriginal, carpetaNueva);
    }
    paciente._id = mongoose.Types.ObjectId.createFromHexString(paciente._id);
    await Estudio.updateMany({ "paciente._id": paciente._id }, { paciente });
    await Paciente.findByIdAndUpdate(paciente._id, paciente);
}

async function crearPaciente(paciente) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(paciente.dni, salt);
    paciente.pass = hash;
    fs.mkdirSync(path.join(__dirname, 'database', 'files', paciente.dni));
    return await Paciente.create(paciente);
};

async function guardarEstudio(estudio, paciente, io) {
    if (paciente._id) {
        await chequearCambiosPaciente(paciente);
    } else {
        paciente = await crearPaciente(paciente);
    }
    estudio.paciente = paciente;
    if (estudio._id) { // EDITANDO EL ESTUDIO PORQUE TIENE ID
        await editarEstudio(estudio);
    } else {
        await crearEstudio(estudio);
    }
    io.emit('cambios');
}

async function buscarPaciente(dni, socket) {
    const paciente = await Paciente.findOne({ dni });
    if (paciente) socket.emit('paciente-encontrado', paciente);
}

async function obtenerEstudios(fecha, tipoEstudio, socket) {
    let filtro = {};
    filtro.fecha = fecha;
    filtro.tipoEstudio = tipoEstudio;
    const estudios = await Estudio.find(filtro).sort({ createdAt: -1 });
    socket.emit('estudios', estudios);
};

async function cambiarColor(id, nombre, io) {
    await Estudio.findByIdAndUpdate(id, { color: nombre });
    io.emit('cambios');
}

async function buscarEstudio(id, socket) {
    let estudio = await Estudio.findById(id);
    socket.emit('editar-estudio', estudio);
};

async function borrarEstudio(id, io) {
    await Estudio.findByIdAndDelete(id);
    io.emit('cambios');
}

async function borrarPaciente(id, io) {
    await Paciente.findByIdAndDelete(id);
    io.emit('cambios');
}

async function informe1(estado, id_estudio_general, id_estudio, socket, io) {
    if (estado) {
        estado = 1;
    } else {
        estado = 0;
    }
    const estudio = await Estudio.findOneAndUpdate(
        { _id: id_estudio_general },
        { $set: { "estudios.$[elem].informe": estado } },
        {
            arrayFilters: [{ "elem.id": id_estudio }],
            new: true, // Devuelve el documento actualizado
        }
    );
    io.emit('cambios');
    socket.emit('estudio-click', estudio);
}

async function cancelarSubida(id_estudio_general, id_estudio, extension, io) {
    const estudio = await Estudio.findOneAndUpdate(
        { _id: id_estudio_general },
        {
            $set: {
                "estudios.$[elem].subido": false,
                "estudios.$[elem].extension": ''
            }
        },
        {
            arrayFilters: [{ "elem.id": id_estudio }],
            new: true,
        }
    );
    const pathFoto = path.join(__dirname, "database", 'files', estudio.paciente.dni, estudio.fecha, `${id_estudio}.${extension}`);
    if (fs.existsSync(pathFoto)) {
        fs.rmSync(pathFoto);
    }
    io.emit('cambios');
    io.emit('estudio-modal', estudio);
}

async function filtroEstudios(tipo_estudio, fecha, texto, page, socket) {
    let limit = 50;
    const saltarEstudios = limit * (page - 1);
    let filtro = {};
    filtro.tipoEstudio = tipo_estudio;
    if (fecha !== "") {
        filtro.fecha = fecha;
    }
    if (texto !== "") {
        filtro.$or = [
            { "paciente.dni": { $regex: texto, $options: "i" } },
            { "paciente.nombre": { $regex: texto, $options: "i" } },
            { "paciente.telefono": { $regex: texto, $options: "i" } },
            { "paciente.obraSocial": { $regex: texto, $options: "i" } },
            { numero: { $regex: texto, $options: "i" } },
            { tipoEstudio: { $regex: texto, $options: "i" } },
            { doctor: { $regex: texto, $options: "i" } },
            { "estudios.nombre": { $regex: texto, $options: "i" } },
            { importeEfectivo: { $regex: texto, $options: "i" } },
            { importeTarjeta: { $regex: texto, $options: "i" } },
            { fecha: { $regex: texto, $options: "i" } },
            { color: { $regex: texto, $options: "i" } },
        ];
    }
    const estudios = await Estudio.find(filtro).sort({ createdAt: -1 }).skip(saltarEstudios).limit(limit);
    const paginasTotal = Math.ceil((await Estudio.countDocuments(filtro)) / limit);
    socket.emit("filtro-estudios", estudios);
    socket.emit("total-paginas", paginasTotal);
}

async function obtenerPacientes(texto, page, socket) {
    let limit = 50;
    const saltarPacientes = limit * (page - 1);
    let filtro = {};
    if (texto !== "") {
        filtro.$or = [
            { dni: { $regex: texto, $options: "i" } },
            { nombre: { $regex: texto, $options: "i" } },
            { telefono: { $regex: texto, $options: "i" } },
            { obraSocial: { $regex: texto, $options: "i" } },
        ];
    }
    const pacientes = await Paciente.find(filtro).sort({ createdAt: -1 }).skip(saltarPacientes).limit(limit);
    const paginasTotal = Math.ceil((await Paciente.countDocuments(filtro)) / limit);
    socket.emit("pacientes", pacientes);
    socket.emit("total-paginas", paginasTotal);
}

async function resetearContraseña(dni) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(dni, salt);
    const pass = hash;
    await Paciente.findOneAndUpdate({ dni }, { pass })
}

async function editarPaciente(paciente, io) {
    await chequearCambiosPaciente(paciente);
    await Paciente.findByIdAndUpdate(paciente);
    io.emit('cambios');
}

async function guardarIngreso(ingreso, io) {
    await Ingreso.create(ingreso);
    io.emit('cambios');
}

async function guardarGasto(gasto, io) {
    await Gasto.create(gasto);
    io.emit('cambios');
}

async function totalEfectivo(fecha, socket) {
    const result = await Estudio.aggregate([
        {
            $match: {
                fecha,
            },
        },
        {
            $group: {
                _id: null,
                totalImporteEfectivo: {
                    $sum: { $toDouble: "$importeEfectivo" },
                },
            },
        },
    ]);
    const totalImporteEfectivo = result.length > 0 ? result[0].totalImporteEfectivo : 0;
    socket.emit('total-efectivo', totalImporteEfectivo);
};

async function obtenerIngresos(fecha, socket) {
    const ingresos = await Ingreso.find({ fecha });
    socket.emit('ingresos', ingresos);
}

async function obtenerGastos(fecha, socket) {
    const gastos = await Gasto.find({ fecha });
    socket.emit('gastos', gastos);
}

// WEB

async function logIn(usuario, socket) {
    const paciente = await Paciente.findOne({ dni: usuario.usuario });
    let respuesta = 0;
    if (paciente) {
        if (bcrypt.compareSync(usuario.contraseña, paciente.pass)) {
            if (paciente.admin) {
                respuesta = 4;
            } else {
                respuesta = 3;
            }
        } else {
            respuesta = 2;
        }
    } else {
        respuesta = 1;
    }

    socket.emit('login', respuesta);
}

async function logInLocalStorage(usuario, contraseña, socket) {
    const paciente = await Paciente.findOne({ dni: usuario });
    let respuesta = 0;
    if (paciente) {
        if (bcrypt.compareSync(contraseña, paciente.pass)) {
            if (paciente.admin) {
                respuesta = 4;
            } else {
                respuesta = 3;
            }
        }
    }
    socket.emit('login-localstorage', respuesta);
}

async function estudiosPaciente(id, socket) {
    if (id !== null) {
        id = mongoose.Types.ObjectId.createFromHexString(id);
        const estudios = await Estudio.find({ "paciente._id": id });
        socket.emit('estudios-paciente', estudios);
    }
};

async function estudio(id, socket) {
    try {
        const estudio = await Estudio.findById(id);
        socket.emit('estudio', estudio);
    } catch (error) {
    }
};

async function cambiarContraseña(dni, pass) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(pass, salt);
    await Paciente.findOneAndUpdate({ dni }, { pass: hash });
};

function codigoInterno(code, socket) {
    if (code === '110699') {
        socket.emit('interno', true);
    } else {
        socket.emit('interno', false);
    }
};

async function estudiosAInformar(socket) {
    const estudios = await Estudio.find({
        estudios: {
            $elemMatch: {
                informe: 1,
            },
        },
    });
    socket.emit('estudios-a-informar', estudios);
};

async function estudiosInformados(fecha, socket) {
    const estudios = await Estudio.find({
        fecha,
        estudios: {
            $elemMatch: {
                informe: 2,
            },
        },
    });
    socket.emit('estudios-informados', estudios);
};

async function guardarInforme(estudio, io) {
    estudio.paciente._id = mongoose.Types.ObjectId.createFromHexString(estudio.paciente._id);
    await Estudio.findByIdAndUpdate(estudio._id, estudio);
    io.emit('cambios');
    const style = `<style>
    @import url("https://fonts.googleapis.com/css2?family=Quicksand:wght@300..700&display=swap");

    @page {
      size: A4;
      margin: 0;
      padding: 0;
    }

    .body-informe {
      font-family: "Quicksand", sans-serif;
      font-optical-sizing: auto;
      margin: 1cm;
      background-color: rgb(103, 103, 103);
    }

    .container {
      width: 80%;
      max-width: 21cm;
      /*height: 29.7cm;*/
      height: fit-content;
      margin: auto;
      background-color: rgb(255, 255, 255);
      box-sizing: border-box;
    }

    .header {
      text-align: center;
      border-bottom: 1px solid #000;
    }

    .contenedor-logo {
      display: flex;
      align-items: center;
    }

    .logo {
      width: 90px;
    }

    .titulo {
      width: 100%;
      font-size: 23px;
      padding: 10px;
      font-weight: bold;
    }

    .contenedor-info {
      margin-bottom: 10px;
    }

    .info {
      font-size: 12px;
      margin-bottom: 5px;
    }

    .info-section {
      margin: 10px;
      gap: 0px;
      display: flex;
      justify-content: space-around;
      font-weight: bold;
    }

    .study {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
    }

    .study-name {
      text-align: center;
      text-decoration: underline;
      margin-bottom: 10px;
      font-size: 20px;
      font-weight: bold;
    }

    .study-content {
      font-size: 14px;
    }

    .footer {
      text-align: right;
      margin-top: 1cm;
      font-size: 15px;
    }

    .firma {
      width: 220px;
    }
</style>`;
    const htmlContent = `<!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Informe</title>
        ${style}
    </head>

    <body class="body-informe">
    <div class="container">
      <header class="header">
        <div class="contenedor-logo">
          <span class="titulo">CONSULTORIO 11 DE ABRIL 130</span>
        </div>
        <div class="contenedor-info">
          <span class="info">
            RADIOLOGIA GENERAL DIGITAL - TOMOGRAFÍA DENTAL COMPUTADA 3D
            <br />
            ECOGRAFIA GENERAL - DOPPLER COLOR - ECOCARDIOGRAFIA
          </span>
          <br />
          <span class="info">11 de Abril 130 Bahía Blanca - Buenos Aires Tel: 291-523-3604</span>
        </div>
      </header>
      <main>
        <div class="info-section">
          <span class="fecha">Fecha: ${`${estudio.fecha.split('-')[2]}/${estudio.fecha.split('-')[1]}/${estudio.fecha.split('-')[0]}`}</span>
          <span class="nombre">Nombre: ${estudio.paciente.nombre}</span>
          <span class="dni">DNI: ${estudio.paciente.dni}</span>
        </div>
        ${estudio.informes.map(data => `
        <div class="study">
        <span class="study-name">
            ${data.titulo}
        </span>
        <div class="study-content">${data.contenido.replace(/\n/g, "<br>")}</div>
        </div>
        `).join('')}
      </main>
      <footer class="footer">
        <p>
          <img class="firma" src="./firma-digital.jpeg" alt="" />
        </p>
      </footer>
    </div>
  </body>

    </html>`;
    const browser = await puppeteer.launch({
        headless: "false",
    });
    const page = await browser.newPage();
    const htmlPath = path.join(__dirname, 'html-pdf', 'index.html');
    fs.writeFileSync(htmlPath, htmlContent);
    await page.goto(`file://${htmlPath}`);
    const rutaFecha = path.join(__dirname, 'database', 'files', estudio.paciente.dni, estudio.fecha);
    const path_pdf = path.join(rutaFecha, 'informe.pdf');
    await page.pdf({
        path: path_pdf,
        format: "A4",
    });
    await browser.close();
};

const enviarMensaje = async (numero, mensaje) => await client.sendMessage(numero, mensaje);

async function enviarWhatsapp(paciente) {
    const mensaje = `🙎‍♂️USUARIO: ${paciente.dni}\n🔐CONTRASEÑA: ${paciente.dni} (SI NUNCA LA CAMBIO)`;
    const telefono = `549${paciente.telefono}@c.us`;
    try {
        await enviarMensaje(telefono, `https://11deabril.com`);
        await enviarMensaje(telefono, mensaje);
    } catch (error) {
        console.log(error);
    }
}

async function obtenerPlantillas(socket) {
    const plantillas = await Plantilla.find();
    socket.emit('plantillas', plantillas);
};

async function guardarPlantilla(plantilla, io) {
    await Plantilla.create(plantilla);
    const plantillas = await Plantilla.find();
    io.emit('plantillas', plantillas);
}

async function borrarPlantilla(plantilla, io) {
    await Plantilla.findOneAndDelete({ titulo: plantilla.titulo, contenido: plantilla.contenido });
    const plantillas = await Plantilla.find();
    io.emit('plantillas', plantillas);
};

function socketFunctions(io, socket) {

    // INTERNO
    socket.on('guardar-estudio', async (estudio, paciente) => await guardarEstudio(estudio, paciente, io));
    socket.on('buscar-paciente', async (dni) => await buscarPaciente(dni, socket));
    socket.on('obtener-estudios', async (fecha, tipoEstudio) => await obtenerEstudios(fecha, tipoEstudio, socket));
    socket.on('cambiar-color', async (id, nombre) => await cambiarColor(id, nombre, io));
    socket.on('editar-estudio', async (id) => await buscarEstudio(id, socket));
    socket.on('borrar-estudio', async (id) => await borrarEstudio(id, io));
    socket.on('borrar-paciente', async (id) => await borrarPaciente(id, io));
    socket.on('informe-1', async (estado, id_estudio_general, id_estudio) => await informe1(estado, id_estudio_general, id_estudio, socket, io));
    socket.on('cancelar-subida', async (id_estudio_general, id_estudio, extension) => await cancelarSubida(id_estudio_general, id_estudio, extension, io));
    socket.on('filtro-estudios', async (tipo_estudio, fecha, texto, page) => await filtroEstudios(tipo_estudio, fecha, texto, page, socket));
    socket.on('obtener-pacientes', async (texto, page) => await obtenerPacientes(texto, page, socket));
    socket.on('resetear-contraseña', async (dni) => await resetearContraseña(dni));
    socket.on('editar-paciente', async (paciente) => await editarPaciente(paciente, io));
    socket.on('ingreso', async (ingreso) => await guardarIngreso(ingreso, io));
    socket.on('gasto', async (gasto) => await guardarGasto(gasto, io));
    socket.on('total-efectivo', async (fecha) => await totalEfectivo(fecha, socket));
    socket.on('ingresos', async (fecha) => await obtenerIngresos(fecha, socket));
    socket.on('gastos', async (fecha) => await obtenerGastos(fecha, socket));
    socket.on('interno', (code) => codigoInterno(code, socket));
    socket.on('plantillas', async () => await obtenerPlantillas(socket));
    socket.on('guardar-plantilla', async (plantilla) => await guardarPlantilla(plantilla, io));
    socket.on('borrar-plantilla', async (plantilla) => await borrarPlantilla(plantilla, io));

    //WEB
    socket.on('login', async (usuario) => await logIn(usuario, socket));
    socket.on('login-localstorage', async (usuario, contraseña) => await logInLocalStorage(usuario, contraseña, socket));
    socket.on('estudios-paciente', async id => await estudiosPaciente(id, socket));
    socket.on('estudio', async id => await estudio(id, socket));
    socket.on('contraseña', async (dni, pass) => await cambiarContraseña(dni, pass));
    socket.on('estudios-a-informar', async () => await estudiosAInformar(socket));
    socket.on('estudios-informados', async (fecha) => await estudiosInformados(fecha, socket));
    socket.on('informe', async estudio => await guardarInforme(estudio, io));
    socket.on('enviar-whatsapp', async paciente => await enviarWhatsapp(paciente));
}

module.exports = socketFunctions;