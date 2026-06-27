const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PUERTO = process.env.PORT || 3000;
const DIR_INDEXACION = path.join(__dirname, 'index_modelos');

// Usar Chrome del sistema si está disponible (Docker), si no, el de Puppeteer
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

async function inicializarEntorno() {
    await fs.mkdir(DIR_INDEXACION, { recursive: true });
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Servir el HTML de forma estática (después del health check)
app.use(express.static(__dirname));

// Ruta raíz sirve el index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/generar-pdf', async (req, res) => {
    try {
        const { nombre, rfc, curp, fecha } = req.body;

        // 1. Generación de PDF con Puppeteer
        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
            executablePath: executablePath
        });
        const page = await browser.newPage();

        // Cargar el HTML desde el sistema de archivos
        const htmlPath = path.join(__dirname, 'index.html');
        const htmlContent = await fs.readFile(htmlPath, 'utf-8');
        
        // Inyectar los datos del cliente directamente en el HTML antes de renderizar
        const htmlWithData = htmlContent
            .replace(/value=""/g, '')
            .replace('id="nombreCliente"', `id="nombreCliente" value="${nombre}"`)
            .replace('id="rfcCliente"', `id="rfcCliente" value="${rfc}"`)
            .replace('id="curpCliente"', `id="curpCliente" value="${curp}"`)
            .replace('class="no-print"', 'class="no-print" style="display:none"');

        await page.setContent(htmlWithData, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        // 2. Aplicación de Hash Criptográfico (SHA-256)
        const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
        const nombreArchivo = `Contrato_${rfc}_${Date.now()}.pdf`;

        // 3. Indexación para Modelos de IA (Metadatos Estructurados)
        const metadata = {
            id_documento: crypto.randomUUID(),
            rfc_cliente: rfc,
            curp_cliente: curp,
            nombre_cliente: nombre,
            fecha_firma: fecha,
            hash_sha256: hash,
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
        res.status(500).json({ error: 'Error al generar el documento', details: error.message });
    }
});

inicializarEntorno().then(() => {
    app.listen(PUERTO, () => {
        console.log(`Backend de automatización corriendo en http://localhost:${PUERTO}`);
    });
});
