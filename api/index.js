const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
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

// Generar hash y devolver datos (PDF se genera en el cliente)
app.post('/generar-pdf', async (req, res) => {
    try {
        const { nombre, rfc, curp, fecha } = req.body;

        const contenido = `Política de Comisiones - ${nombre} - ${rfc} - ${curp} - ${fecha}`;
        const hash = crypto.createHash('sha256').update(contenido).digest('hex');
        
        res.json({
            success: true,
            hash: hash,
            datos: { nombre, rfc, curp, fecha },
            mensaje: 'Datos procesados. El PDF se generará en el cliente.'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al procesar datos' });
    }
});

module.exports = app;