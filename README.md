# Política de Comisiones — Círculo Internacional de Bienes Raíces

Sistema web para la generación y firma digital de políticas de comisiones inmobiliarias.

## 🚀 Despliegue rápido

[![Deploy on Render](https://img.shields.io/badge/Deploy%20on%20Render-✓-blue)](https://render.com)

### Opción A: Render (recomendado — gratis)

1. Fork o sube este repo a GitHub
2. Ve a [render.com](https://render.com) → **New** → **Web Service**
3. Conecta tu repo de GitHub
4. Configuración:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Click **Create Web Service**
6. ¡Listo! Tu app estará en `https://firma-comisiones.onrender.com`

### Opción B: Railway

1. Ve a [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Selecciona el repo
4. Railway detecta Node.js automáticamente
5. Click **Deploy**

### Opción C: Local

```bash
npm install
npm start
# → http://localhost:3000
```

## 📋 Características

- ✅ Formulario de política de comisiones (HTML/CSS)
- ✅ Backend Express con generación de PDF (Puppeteer)
- ✅ Hash criptográfico SHA-256 por documento
- ✅ Indexación de metadatos para modelos de IA (RAG)
- ✅ Cumplimiento LFPDPPP (México)
- ✅ Validación de RFC (13 caracteres) y CURP (18 caracteres)
- ✅ CORS habilitado
- ✅ Tests E2E con Playwright (8/8 passing)

## 🧪 Tests

```bash
npm test
```

## 📁 Estructura

```
├── index.html              # Frontend
├── server.js               # Backend Express
├── package.json            # Dependencias
├── playwright.config.js    # Config de tests
├── tests/                  # Tests E2E
└── tests/firma-comisiones.spec.js
```

## ⚖️ Marco Legal

- Código Civil para el Estado de Veracruz
- Código de Comercio (Art. 89-114 — Firma electrónica)
- LFPDPPP (Protección de datos personales)
- LFPIORPI (Antilavado de dinero)

---

© 2026 Círculo Internacional de Bienes Raíces
