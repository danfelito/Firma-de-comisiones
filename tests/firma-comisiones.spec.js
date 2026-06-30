// @ts-check
const { test, expect } = require('@playwright/test');

const RFC_VALIDO = 'PEGJ850415AA1'; // 13 caracteres
const CURP_VALIDA = 'PEGJ850415HDFABC01'; // 18 caracteres

test('Cargar página principal y verificar título', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
    await expect(page).toHaveTitle(/Política de Comisiones/);
    await expect(page.locator('h1')).toContainText('Círculo Internacional de Bienes Raíces');
});

test('Validar campos vacíos - debe mostrar alerta', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
    
    page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('completar todos los campos');
        await dialog.accept();
    });
    await page.click('#btnGenerar');
});

test('Validar RFC incorrecto (menos de 13 caracteres)', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
    
    await page.fill('#nombreCliente', 'Juan Pérez García');
    await page.fill('#rfcCliente', 'PEGJ850415'); // 10 caracteres
    await page.fill('#curpCliente', CURP_VALIDA);
    
    page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('RFC debe tener exactamente 13 caracteres');
        await dialog.accept();
    });
    await page.click('#btnGenerar');
});

test('Validar CURP incorrecta (menos de 18 caracteres)', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
    
    await page.fill('#nombreCliente', 'Juan Pérez García');
    await page.fill('#rfcCliente', RFC_VALIDO); // 13 caracteres correcto
    await page.fill('#curpCliente', 'PEGJ850415HDFABC'); // 15 caracteres incorrecto
    
    page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('CURP debe tener exactamente 18 caracteres');
        await dialog.accept();
    });
    await page.click('#btnGenerar');
});

test('Validar que los checkboxes estén marcados', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
    
    await page.fill('#nombreCliente', 'Juan Pérez García');
    await page.fill('#rfcCliente', RFC_VALIDO); // 13 caracteres
    await page.fill('#curpCliente', CURP_VALIDA); // 18 caracteres
    // No marcamos los checkboxes
    
    page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('aceptar tanto los términos');
        await dialog.accept();
    });
    await page.click('#btnGenerar');
});

test('Flujo completo: llenar formulario, firmar y generar PDF', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
    
    // Llenar todos los campos correctamente
    await page.fill('#nombreCliente', 'Juan Pérez García');
    await page.fill('#rfcCliente', RFC_VALIDO);
    await page.fill('#curpCliente', CURP_VALIDA);
    await page.check('#aceptaTerminos');
    await page.check('#aceptaPrivacidad');
    
    // Manejar el alert de éxito que aparece después de la descarga
    page.on('dialog', async dialog => {
        console.log(`Dialog: ${dialog.message()}`);
        await dialog.accept();
    });
    
    // Click en generar y esperar la descarga
    const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }),
        page.click('#btnGenerar')
    ]);
    
    expect(download).toBeTruthy();
    const filename = download.suggestedFilename();
    console.log(`PDF descargado: ${filename}`);
    expect(filename).toMatch(/Contrato_PEGJ850415AA1_\d+\.pdf/);
    
    // Guardar el PDF para vista previa
    const downloadPath = 'A:/Proyectos IA/Firma de comisiones/Politicas_11/test_output';
    const fs = require('fs');
    fs.mkdirSync(downloadPath, { recursive: true });
    const filePath = `${downloadPath}/${filename}`;
    await download.saveAs(filePath);
    console.log(`PDF guardado en: ${filePath}`);
});

test('Screenshot de la página principal', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
    await page.screenshot({ 
        path: 'A:/Proyectos IA/Firma de comisiones/Politicas_11/test_output/screenshot_index.png', 
        fullPage: true 
    });
});

test('Screenshot del formulario lleno (vista previa del documento)', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
    
    await page.fill('#nombreCliente', 'Juan Pérez García');
    await page.fill('#rfcCliente', RFC_VALIDO);
    await page.fill('#curpCliente', CURP_VALIDA);
    await page.check('#aceptaTerminos');
    await page.check('#aceptaPrivacidad');
    
    await page.screenshot({ 
        path: 'A:/Proyectos IA/Firma de comisiones/Politicas_11/test_output/screenshot_formulario.png', 
        fullPage: true 
    });
});

test('Modal de Aviso de Privacidad Integral funciona', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
    
    // Click en el aviso de privacidad abreviado
    await page.click('.aviso-privacidad');
    
    // Verificar que el modal está visible
    const modal = page.locator('#modalAviso');
    await expect(modal).toBeVisible();
    
    // Verificar el título del modal
    await expect(page.locator('.modal-header')).toContainText('AVISO DE PRIVACIDAD INTEGRAL');
    
    // Verificar contenido del modal
    await expect(page.locator('#modalAviso')).toContainText('RESPONSABLE DEL TRATAMIENTO DE SUS DATOS PERSONALES');
    await expect(page.locator('#modalAviso')).toContainText('DERECHOS ARCO');
    await expect(page.locator('#modalAviso')).toContainText('circulointernacional1@gmail.com');
    
    // Cerrar con X
    await page.click('.modal-close');
    await expect(modal).not.toBeVisible();
});

test('Click en subrayado del checkbox abre el aviso de privacidad', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
    
    // Verificar que el texto está subrayado
    const textoSubrayado = page.locator('u');
    await expect(textoSubrayado).toContainText('AVISO DE PRIVACIDAD (LFPDPPP)');
    
    // Click en el texto subrayado debe abrir el modal
    await textoSubrayado.click();
    
    const modal = page.locator('#modalAviso');
    await expect(modal).toBeVisible();
    await expect(page.locator('.modal-header')).toContainText('AVISO DE PRIVACIDAD INTEGRAL');
    
    // Cerrar modal
    await page.click('.modal-close');
    await expect(modal).not.toBeVisible();
});

test('Fecha actual se muestra en el aviso de privacidad', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
    
    // Click para abrir el modal
    await page.click('.aviso-privacidad');
    
    // Verificar que la fecha se actualizó (formato: "29 de junio de 2026")
    const modal = page.locator('#modalAviso');
    const fechaElemento = page.locator('#fechaActualizacion');
    await expect(fechaElemento).toContainText('de');
    await expect(fechaElemento).toContainText('de');
    await expect(fechaElemento).not.toHaveText('[Día] de [Mes] de [Año]');
    
    // Cerrar modal
    await page.click('.modal-close');
});

test('Checkboxes marcados en el PDF generado', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
    
    // Llenar formulario completamente
    await page.fill('#nombreCliente', 'Juan Pérez García');
    await page.fill('#rfcCliente', RFC_VALIDO);
    await page.fill('#curpCliente', CURP_VALIDA);
    await page.check('#aceptaTerminos');
    await page.check('#aceptaPrivacidad');
    
    // Verificar que los checkboxes aparecen marcados antes de generar
    await expect(page.locator('#aceptaTerminos')).toBeChecked();
    await expect(page.locator('#aceptaPrivacidad')).toBeChecked();
    
    // Generar PDF
    const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }),
        page.click('#btnGenerar')
    ]);
    
    // Verificar que el PDF se descargó exitosamente
    expect(download).toBeTruthy();
    expect(download.suggestedFilename()).toMatch(/Contrato_PEGJ850415AA1_\d+\.pdf/);
});
