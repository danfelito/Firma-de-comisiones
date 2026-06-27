const express = require('express');
const puppeteer = require('puppeteer');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());

const PUERTO = 3000;
const DIR_INDEXACION = path.join(__dirname, 'index_modelos');

async function inicializarEntorno() {
    await fs.mkdir(DIR_INDEXACION, { recursive: true });
}

app.post('/generar-pdf', async (req, res) => {
    try {
        const { nombre, rfc, curp, fecha } = req.body;
        
        // 1. Generación de PDF con Puppeteer
        const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        // Cargamos el HTML base y rellenamos los datos para la impresión
        const htmlPath = path.join(__dirname, 'index.html'); 
        await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
        
        await page.evaluate((data) => {
            document.getElementById('nombreCliente').value = data.nombre;
            document.getElementById('rfcCliente').value = data.rfc;
            document.getElementById('curpCliente').value = data.curp;
            document.querySelector('.no-print').style.display = 'none';
        }, { nombre, rfc, curp });

        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        // 2. Aplicación de Hash Criptográfico (SHA-256)
        const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
        const nombreArchivo = `Contrato_${rfc}_${Date.now()}.pdf`;
        const rutaArchivo = path.join(__dirname, nombreArchivo);
        await fs.writeFile(rutaArchivo, pdfBuffer);

        // 3. Indexación para Modelos de IA (Metadatos Estructurados)
        const metadata = {
            id_documento: crypto.randomUUID(),
            rfc_cliente: rfc,
            curp_cliente: curp,
            nombre_cliente: nombre,
            fecha_firma: fecha,
            hash_sha256: hash,
            ruta_archivo: rutaArchivo,
            contexto_legal: "LFPDPPP y Código de Comercio Mexicano",
            listo_para_rag: true
        };

        const rutaIndice = path.join(DIR_INDEXACION, `${rfc}_${Date.now()}.json`);
        await fs.writeFile(rutaIndice, JSON.stringify(metadata, null, 2));

        console.log(`Documento indexado. Hash: ${hash}`);
        
        // 4. Envío del PDF al frontend
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error crítico en el backend:', error);
        res.status(500).send('Error al generar el documento.');
    }
});

inicializarEntorno().then(() => {
    app.listen(PUERTO, () => {
        console.log(`Backend de automatización corriendo en http://localhost:${PUERTO}`);
    });
});