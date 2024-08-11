const http = require('http');
const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const multer = require("multer");
const path = require('path');
const fs = require('fs');
const app = express();
const socketFunctions = require('./socketFunctions.js');
const Estudio = require('./database/models/Estudio.js');

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const rutaDNI = path.join(__dirname, 'database', 'files', req.params.dni);
        if (!fs.existsSync(rutaDNI)) {
            fs.mkdirSync(rutaDNI);
        }
        const rutaFecha = path.join(__dirname, 'database', 'files', req.params.dni, req.params.fecha);
        if (!fs.existsSync(rutaFecha)) {
            fs.mkdirSync(rutaFecha);
        }
        cb(null, rutaFecha);
    },
    filename: function (req, file, cb) {
        cb(null, `${req.params.id_estudio}${path.extname(file.originalname)}`);
    },
});

const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', express.static(path.join(__dirname, 'database', 'files')));

app.post('/api/file/:dni/:fecha/:id_estudio_general/:id_estudio', upload.array('files'), async (req, res) => {
    let extname = path.extname(req.files[0].originalname).replace('.', '');
    const estudio = await Estudio.findOneAndUpdate(
        { _id: req.params.id_estudio_general },
        {
            $set: {
                "estudios.$[elem].subido": true,
                "estudios.$[elem].extension": extname
            },
        },
        {
            arrayFilters: [{ "elem.id": req.params.id_estudio }],
            new: true, // Para devolver el documento actualizado en lugar del original
        }
    );
    res.json({ message: "Archivos subidos exitosamente" });
    io.emit("cambios");
    io.emit('estudio-modal', estudio);
});

app.get("/api/descargar/:dni/:fecha/:id_estudio/:ext", (req, res) => {
    const directoryPath = path.join(__dirname, "database", 'files', req.params.dni, req.params.fecha, `${req.params.id_estudio}.${req.params.ext}`);
    if (fs.existsSync(directoryPath)) {
        res.download(directoryPath);
    } else {
        res.status(404).send("Directorio no encontrado");
    }
});

io.on('connection', (socket) => socketFunctions(io, socket))

server.listen(5000, () => {
    console.log("Server en puerto: 5000");
});