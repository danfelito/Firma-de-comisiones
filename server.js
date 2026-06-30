const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
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

// Rate limiting simple (100 requests por IP cada 15 minutos)
const rateLimitMap = new Map();
app.use('/generar-pdf', (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const maxRequests = 100;
    
    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
        return next();
    }
    
    const record = rateLimitMap.get(ip);
    if (now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
        return next();
    }
    
    if (record.count >= maxRequests) {
        return res.status(429).json({ error: 'Demasiadas solicitudes. Intente más tarde.' });
    }
    
    record.count++;
    next();
});

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
        let htmlContent = await fs.readFile(htmlPath, 'utf-8');
        
        // Inyectar los datos del cliente directamente en el HTML antes de renderizar
        const escapeHtml = (str) => str.replace(/[&<>'"]/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));

        // Reemplazar campos del formulario
        htmlContent = htmlContent
            .replace(
                '<input type="text" id="nombreCliente" required>',
                `<input type="text" id="nombreCliente" value="${escapeHtml(nombre)}" required>`
            )
            .replace(
                '<input type="text" id="rfcCliente" maxlength="13" pattern="[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}" required style="text-transform: uppercase;">',
                `<input type="text" id="rfcCliente" value="${escapeHtml(rfc)}" maxlength="13" pattern="[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}" required style="text-transform: uppercase;">`
            )
            .replace(
                '<input type="text" id="curpCliente" maxlength="18" pattern="[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{2}" required style="text-transform: uppercase;">',
                `<input type="text" id="curpCliente" value="${escapeHtml(curp)}" maxlength="18" pattern="[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{2}" required style="text-transform: uppercase;">`
            );

        // Ocultar elementos no deseados en PDF
        htmlContent = htmlContent.replace('class="no-print"', 'class="no-print" style="display:none"');

        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        // Añadir estilos de impresión para formato corporativo moderno (Linear-inspired dark mode)
        await page.addStyleTag({
            content: `
                @page { size: A4; margin: 0; }
                html, body { margin: 0; padding: 0; overflow: hidden; background: #08090a; }
                body { font-family: 'Inter', system-ui, sans-serif; font-feature-settings: "ss03", "cv01"; }
                .pdf-container { padding: 0; width: 100%; box-sizing: border-box; }
                h1 { font-size: 14pt; margin: 2px 0; font-weight: 510; letter-spacing: -0.5px; border-bottom: 1px solid rgba(196,30,58,0.2); padding-bottom: 6px; }
                h2 { font-size: 10pt; margin: 10px 0 4px 0; font-weight: 510; letter-spacing: -0.2px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 2px; }
                h3 { font-size: 8pt; margin: 2px 0; font-weight: 510; letter-spacing: -0.1px; }
                .header-info { margin: 10px 0; font-size: 7pt; font-weight: 300; }
                .seccion { padding: 6px; margin: 6px 0; background: rgba(255,255,255,0.02); border-radius: 4px; }
                .operacion { padding: 6px; margin: 3px 0; font-size: 7pt; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); }
                .firma-box { padding: 6px; margin: 6px 0; font-size: 7pt; border-radius: 6px; }
                .aviso-privacidad { font-size: 6pt; padding: 6px; margin-top: 6px; border-radius: 4px; }
                p, li, label { margin: 1px 0; font-size: 7pt; }
                ul { padding-left: 20px; }
                li { margin: 3px 0; }
                .btn-accion { display: none !important; }
            `
        });

        const pdfBuffer = await page.pdf({ 
            format: 'A4', 
            printBackground: true,
            margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
        });
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
        await fs.writeFile(rutaIndice, JSON.stringify(metadata, null, 2), 'utf8');

        console.log(`Documento indexado. Hash: ${hash}`);

        // 4. Envío del PDF al frontend
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer);

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