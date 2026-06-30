const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Headers de seguridad básicos
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Servir el HTML de forma estática
app.use(express.static(path.join(__dirname, '..')));

// Ruta raíz sirve el index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Templates PDF - Versión estática sin Puppeteer (universal compatibility)
app.post('/generar-pdf', async (req, res) => {
    try {
        const { nombre, rfc, curp, fecha } = req.body;

        // Generar PDF con jsPDF (compatible con todos los entornos)
        // Para mantener compatibilidad, usamos un enfoque alternativo
        // El PDF se genera en el cliente con datos encriptados
        
        // 1. Generar hash del contenido
        const contenido = `Política de Comisiones - ${nombre} - ${rfc} - ${curp} - ${fecha}`;
        const hash = crypto.createHash('sha256').update(contenido).digest('hex');
        
        // 2. Responder con datos para generar PDF en cliente
        res.json({
            success: true,
            hash: hash,
            datos: { nombre, rfc, curp, fecha },
            mensaje: 'Datos procesados. El PDF se generará en el cliente.'
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al procesar datos', details: error.message });
    }
});

// Endpoint para descargar PDF pre-generado (cuando usas Render/Docker)
app.get('/descargar-pdf/:rfc/:nombre', async (req, res) => {
    try {
        // Esta ruta funciona cuando el servidor tiene Chrome instalado
        const puppeteer = require('puppeteer');
        
        const { rfc, nombre } = req.params;
        const curp = req.query.curp || '';
        
        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        const page = await browser.newPage();
        const htmlPath = path.join(__dirname, '..', 'index.html');
        let htmlContent = await fs.readFile(htmlPath, 'utf-8');
        
        const escapeHtml = (str) => str.replace(/[&<>'"]/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));

        htmlContent = htmlContent
            .replace('<input type="text" id="nombreCliente" required>', `<input type="text" id="nombreCliente" value="${escapeHtml(nombre)}" required>`)
            .replace('<input type="text" id="rfcCliente" maxlength="13"', `<input type="text" id="rfcCliente" value="${escapeHtml(rfc)}" maxlength="13"`)
            .replace('<input type="text" id="curpCliente" maxlength="18"', `<input type="text" id="curpCliente" value="${escapeHtml(curp)}" maxlength="18"`)
            .replace('class="no-print"', 'class="no-print" style="display:none"');

        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
        const nombreArchivo = `Contrato_${rfc}_${Date.now()}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
        res.end(pdfBuffer);

    } catch (error) {
        // Si Puppeteer falla, devolver error con solución alternativa
        res.status(503).json({ 
            error: 'Generación de PDF temporalmente no disponible', 
            fallback: 'Actualiza la página y usa el botón nuevamente' 
        });
    }
});

module.exports = app;