document.addEventListener('DOMContentLoaded', () => {
    // 1. CONSTANTES Y SELECTORES
    const TARA_POR_PESADA = 2;
    const contenedorMateriales = document.getElementById('contenedor-materiales');
    const totalGeneralElement = document.getElementById('total-general');

    const inputCliente = document.getElementById('cliente');
    const inputFecha = document.getElementById('fecha');
    const resumenClienteSpan = document.getElementById('resumen-cliente').querySelector('span');
    const resumenFechaSpan = document.getElementById('resumen-fecha').querySelector('span');

    let materialCounter = 0;
    
    // Fecha por defecto = hoy
    document.getElementById('fecha').valueAsDate = new Date();
    
    // Botones principales
    document.getElementById('btn-agregar-material').addEventListener('click', createMaterialBlock);
    document.getElementById('btn-imprimir-boleta').addEventListener('click', generateSummaryPDF);
    document.getElementById('btn-imprimir-detalle').addEventListener('click', generateDetailPDF);
    
    // Barra de resumen
    inputCliente.addEventListener('input', updateResumenBar);
    inputFecha.addEventListener('change', updateResumenBar);
    updateResumenBar();

    // FUNCIÓN: Actualiza la barra de resumen (cliente + fecha)
    function updateResumenBar() {
        const cliente = inputCliente.value || 'N/A';
        const fechaInput = inputFecha.value;
        const fecha = fechaInput 
            ? new Date(fechaInput + 'T12:00:00').toLocaleDateString('es-AR', { dateStyle: 'medium' }) 
            : 'N/A';
        
        resumenClienteSpan.textContent = cliente;
        resumenFechaSpan.textContent = fecha;
    }

    // 2. CÁLCULO DE TOTALES (por material)
    function calculateTotals(materialId) {
        const materialSection = document.getElementById(materialId);
        if (!materialSection) return;

        const weightInputs = materialSection.querySelectorAll('input[type="number"]');
        let totalBruto = 0;
        let numPesadas = 0;

        weightInputs.forEach(input => {
            const weight = parseFloat(input.value) || 0;
            if (weight > 0) {
                totalBruto += weight;
                numPesadas++; 
            }
        });

        const taraTotal = numPesadas * TARA_POR_PESADA;
        const totalNeto = totalBruto - taraTotal;

        const totalElement = materialSection.querySelector('.total-material');
        totalElement.innerHTML = `
            Total Bruto: ${totalBruto.toFixed(2)} kg<br>
            Tara (${numPesadas}x${TARA_POR_PESADA}kg): -${taraTotal.toFixed(2)} kg<br>
            <strong>Total Neto: ${totalNeto.toFixed(2)} kg</strong>
        `;
        
        totalElement.dataset.neto = totalNeto.toFixed(2);
        totalElement.dataset.bruto = totalBruto.toFixed(2);
        totalElement.dataset.tara = taraTotal.toFixed(2);
        totalElement.dataset.pesadas = numPesadas;

        calculateGrandTotal(); 
    }

    // 3. TOTAL GENERAL (Web)
    function calculateGrandTotal() {
        let granTotalNeto = 0;
        document.querySelectorAll('.total-material').forEach(element => {
            granTotalNeto += parseFloat(element.dataset.neto) || 0; 
        });
        totalGeneralElement.innerHTML = `Total Neto Global: <strong>${granTotalNeto.toFixed(2)} kg</strong>`;
    }

    // 4. CREA UN BLOQUE DE MATERIAL
    function createMaterialBlock() {
        materialCounter++;
        const materialId = `material-${materialCounter}`;

        const materialBlock = document.createElement('div');
        materialBlock.className = 'material-seccion';
        materialBlock.id = materialId;
        materialBlock.innerHTML = `
            <div class="input-grupo">
                <label for="select-${materialId}">Elegir Material:</label>
                <select id="select-${materialId}">
                    <option value="Cobre">Cobre</option>
                    <option value="Aluminio">Aluminio</option>
                    <option value="Bronce">Bronce</option>
                    <option value="Inoxidable">Acero Inoxidable</option>
                    <option value="Otro">Otro/Mixto</option>
                </select>
            </div>
            
            <h4>Pesadas (Peso Bruto):</h4>
            <div class="pesadas-contenedor"></div>
            <div class="acciones-internas">
                <button class="btn-anadir-pesada" data-material-id="${materialId}">+ Añadir Pesada</button>
                <button class="btn-quitar-material" data-material-id="${materialId}">Quitar Material</button>
            </div>

            <div class="total-material" data-neto="0" data-bruto="0" data-tara="0" data-pesadas="0">
                <strong>Total Neto: 0.00 kg</strong>
            </div>
        `;
        contenedorMateriales.appendChild(materialBlock);
        
        // Listeners internos
        materialBlock.querySelector('.btn-anadir-pesada').addEventListener('click', (e) => {
            e.preventDefault();
            addWeightInput(materialId);
        });
        materialBlock.querySelector('.btn-quitar-material').addEventListener('click', () => {
            if (window.confirm('¿Está seguro de que desea eliminar esta sección de material?')) {
                materialBlock.remove();
                calculateGrandTotal();
            }
        });
        materialBlock.querySelector(`#select-${materialId}`).addEventListener('change', () => calculateTotals(materialId));
        
        addWeightInput(materialId); // primera pesada
    }

    // 5. AÑADIR CAMPO DE PESO
    function addWeightInput(materialId) {
        const materialSection = document.getElementById(materialId);
        const contenedorPesadas = materialSection.querySelector('.pesadas-contenedor');

        const inputContainer = document.createElement('div');
        inputContainer.className = 'pesada-item';
        
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = '0.01';
        input.placeholder = 'Peso (kg)';
        input.value = 0;
        
        input.addEventListener('input', () => calculateTotals(materialId));
        
        const btnRemove = document.createElement('button');
        btnRemove.textContent = 'x';
        btnRemove.className = 'btn-quitar';
        btnRemove.title = 'Quitar esta pesada';
        btnRemove.addEventListener('click', (e) => {
            e.preventDefault();
            inputContainer.remove();
            calculateTotals(materialId);
        });

        inputContainer.appendChild(input);
        inputContainer.appendChild(btnRemove);
        contenedorPesadas.appendChild(inputContainer);

        calculateTotals(materialId);
    }
    
    // 6. GENERACIÓN DE PDF 1: BOLETA RESUMEN
    function generateSummaryPDF() {
        buildInvoiceContent();
        togglePrintView('boleta-resumen');
        window.print();
        restoreWebView();
    }

    // Construye el contenido de la boleta de resumen
    function buildInvoiceContent() {
        const boletaBody = document.querySelector('#tabla-resumen tbody');
        const boletaCabecera = document.getElementById('boleta-datos-cabecera');
        const boletaTotal = document.getElementById('boleta-total-final');
        boletaBody.innerHTML = ''; 

        const cliente = document.getElementById('cliente').value || 'N/A';
        const fechaInput = document.getElementById('fecha').value;
        const fecha = fechaInput 
            ? new Date(fechaInput + 'T12:00:00').toLocaleDateString('es-AR', { dateStyle: 'medium' }) 
            : 'N/A';
        
        boletaCabecera.innerHTML = `
            <p><strong>Cliente:</strong> ${cliente}</p>
            <p><strong>Fecha:</strong> ${fecha}</p>
        `;

        let granTotalNeto = 0;

        document.querySelectorAll('.material-seccion').forEach(section => {
            const materialName = section.querySelector('select').value;
            const totalElement = section.querySelector('.total-material');
            
            const totalNeto = parseFloat(totalElement.dataset.neto);
            const totalBruto = parseFloat(totalElement.dataset.bruto);
            const taraTotal = parseFloat(totalElement.dataset.tara);

            granTotalNeto += totalNeto;

            const row = boletaBody.insertRow();
            row.innerHTML = `
                <td>${materialName}</td>
                <td>${totalBruto.toFixed(2)}</td>
                <td>-${taraTotal.toFixed(2)}</td>
                <td>${totalNeto.toFixed(2)}</td>
            `;
        });
        
        boletaTotal.innerHTML = `TOTAL NETO A PAGAR: <strong>${granTotalNeto.toFixed(2)} kg</strong>`;
    }

    // 7. GENERACIÓN DE PDF 2: DETALLE COMPLETO
    function generateDetailPDF() {
        const detalleContenedor = document.getElementById('detalle-contenedor-materiales');
        detalleContenedor.innerHTML = ''; 

        const cliente = document.getElementById('cliente').value || 'N/A';
        const fechaInput = document.getElementById('fecha').value;
        const fecha = fechaInput 
            ? new Date(fechaInput + 'T12:00:00').toLocaleDateString('es-AR', { dateStyle: 'medium' }) 
            : 'N/A';
        
        document.getElementById('detalle-datos-cabecera').innerHTML = `
            <p><strong>Cliente:</strong> ${cliente}</p>
            <p><strong>Fecha:</strong> ${fecha}</p>
        `;

        let granTotalNeto = 0;

        document.querySelectorAll('.material-seccion').forEach(section => {
            const materialName = section.querySelector('select').value;
            const totalElement = section.querySelector('.total-material');
            
            const totalNeto = parseFloat(totalElement.dataset.neto);
            const totalBruto = parseFloat(totalElement.dataset.bruto);
            const taraTotal = parseFloat(totalElement.dataset.tara);

            granTotalNeto += totalNeto;

            const materialBlock = document.createElement('div');
            materialBlock.className = 'detalle-material-block';
            
            let htmlContent = `<h4>Material: ${materialName}</h4>`;
            htmlContent += `
                <table>
                    <thead>
                        <tr><th>#</th><th>Peso Bruto (kg)</th></tr>
                    </thead>
                    <tbody>
            `;
            
            section.querySelectorAll('.pesada-item input[type="number"]').forEach((input, index) => {
                const pesoBruto = parseFloat(input.value) || 0;
                if (pesoBruto > 0) {
                    htmlContent += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${pesoBruto.toFixed(2)}</td>
                        </tr>
                    `;
                }
            });

            htmlContent += `
                    </tbody>
                </table>
                <p class="detalle-totales">
                    Bruto Total: ${totalBruto.toFixed(2)} kg | 
                    Tara Descontada: -${taraTotal.toFixed(2)} kg |
                    <strong>NETO POR MATERIAL: ${totalNeto.toFixed(2)} kg</strong>
                </p>
                <hr class="detalle-divisor">
            `;

            materialBlock.innerHTML = htmlContent;
            detalleContenedor.appendChild(materialBlock);
        });

        document.getElementById('detalle-total-final').innerHTML = 
            `TOTAL NETO GLOBAL: <strong>${granTotalNeto.toFixed(2)} kg</strong>`;

        togglePrintView('detalle-pesadas');
        window.print();
        restoreWebView();
    }
    
    // 8. FUNCIONES DE VISTA PARA IMPRESIÓN

    // Mostrar solo la sección de impresión indicada
    function togglePrintView(sectionId) {
        // Ocultar elementos de la web
        document.getElementById('contenedor-materiales').style.display = 'none';
        document.querySelector('.acciones').style.display = 'none';
        document.querySelector('.datos-iniciales').style.display = 'none';
        document.querySelector('.web-only').style.display = 'none';

        // Ocultar todas las secciones de impresión
        document.querySelectorAll('.print-only').forEach(sec => {
            sec.style.display = 'none';
        });

        // Mostrar solo la sección que corresponde
        document.getElementById(sectionId).style.display = 'block';
    }

    // Restaurar vista normal de la web
    function restoreWebView() {
        document.getElementById('contenedor-materiales').style.display = 'block';
        document.querySelector('.acciones').style.display = 'flex';
        document.querySelector('.datos-iniciales').style.display = 'flex';
        document.querySelector('.web-only').style.display = 'block';

        document.querySelectorAll('.print-only').forEach(sec => {
            sec.style.display = 'none';
        });
    }

    // Bloque inicial
    createMaterialBlock();
});
