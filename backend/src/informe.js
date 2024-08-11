require('./database/database.js');
const Estudio = require('./database/models/Estudio.js');

async function main() {
    try {
        const estudios = await Estudio.find({
            estudios: {
                $elemMatch: {
                    informe: 2,
                },
            },
        });
        // Usar un bucle for...of para esperar a que se completen las actualizaciones
        for (const est of estudios) {
            // Actualizar cada documento
            await Estudio.findByIdAndUpdate(est._id, { informes: ['blank'] });
        }
        console.log("Actualización completada correctamente.");
    } catch (error) {
        console.error("Error al actualizar documentos:", error);
    }
}

main();