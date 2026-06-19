# DMD Reciclados — Gestión de Pesadas

Aplicación web estática para el registro, cálculo e impresión de pesadas de metales reciclados.

**Publicación:** [lucasfelice10.github.io/AnotadorDMD](https://lucasfelice10.github.io/AnotadorDMD/)

## Funcionalidades

- Registro de fecha y cliente por operación
- Múltiples materiales: Cobre, Aluminio, Bronce, Acero inoxidable, Otro o mixto
- Múltiples pesadas por material con cálculo automático
- Tara fija de **2 kg por cada pesada con peso mayor a cero**
- Peso neto = peso bruto total − tara total
- Impresión de boleta resumen y detalle completo
- Interfaz responsive y accesible

## Regla de negocio

```
Tara total = cantidad de pesadas positivas × 2 kg
Peso neto  = peso bruto total − tara total
```

Los campos vacíos o con valor cero no generan tara.

## Estructura del proyecto

```
/
├── index.html
├── css/
│   ├── tokens.css      # Variables de diseño
│   ├── base.css        # Reset y estilos base
│   ├── layout.css      # Estructura y grid
│   ├── components.css  # Componentes de UI
│   └── print.css       # Estilos de impresión
├── js/
│   ├── constants.js    # Constantes de negocio
│   ├── utils.js        # Utilidades (IDs, formato, DOM seguro)
│   ├── state.js        # Estado y mutaciones
│   ├── calculations.js # Lógica de cálculo pura
│   ├── validation.js   # Validaciones de entrada
│   ├── icons.js        # Íconos SVG inline
│   ├── renderer.js     # Renderizado del DOM
│   ├── printing.js     # Generación e impresión de documentos
│   └── app.js          # Orquestación y eventos
└── README.md
```

## Arquitectura

- **Estado central** como única fuente de verdad (`state.js`)
- El DOM refleja el estado; no se usan atributos `data-*` para cálculos
- Separación clara: estado, reglas de negocio, validación, cálculos, renderizado, impresión
- Módulos ES nativos (`<script type="module">`)
- Delegación de eventos en el contenedor principal
- Sin frameworks ni paso de compilación

## Seguridad

- Datos solo en memoria durante la sesión (sin `localStorage`)
- Contenido dinámico mediante `textContent` y `createElement`
- Sin `innerHTML` con datos del usuario
- Sin `document.write()` ni ventanas emergentes para imprimir
- Impresión mediante secciones ocultas en el DOM + `window.print()` + CSS `@media print`

> **Nota:** Para historial de clientes, usuarios o persistencia permanente se requiere un backend real con autenticación, autorización y validación del lado del servidor.

## Desarrollo local

La aplicación es un sitio estático. Para probarla localmente:

```bash
# Con Python 3
python -m http.server 8080

# O con npx
npx serve .
```

Abrir `http://localhost:8080` en el navegador.

> Los módulos ES requieren servir por HTTP; no funcionan abriendo `index.html` directamente con `file://`.

## Despliegue en GitHub Pages

1. Subir los archivos al repositorio
2. En **Settings → Pages**, seleccionar rama `main` y carpeta `/ (root)`
3. La app estará disponible en `https://<usuario>.github.io/AnotadorDMD/`

## Licencia

© DMD Reciclados
