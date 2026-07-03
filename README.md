# Facebook Marketplace Auto Publisher

Sistema de automatización para crear publicaciones en Facebook Marketplace.

## Instalación

```bash
npm install
```

## Configuración

1. Copia `.env.example` a `.env`
2. Agrega tus credenciales de Facebook (usa variables de entorno, nunca credenciales hardcodeadas)
3. Ejecuta `npm run login` la primera vez para guardar la sesión

## Uso

```bash
# Para publicar una nueva entrada
npm run publish
```

## Estructura

- `src/login.js` - Script para iniciar sesión y guardar sesión
- `src/publish.js` - Script principal para crear publicaciones
- `data/publicaciones.json` - Base de datos de publicaciones (no subir a git)
- `.env` - Variables de entorno (nunca subir a git)