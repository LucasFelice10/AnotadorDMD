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

    // ========= 1) BARRA RESUMEN =========
    function updateResumenBar() {
        const cliente = inputCliente.value || 'N/A';
        const fechaInput = inputFecha.value;
        const fecha = fechaInput 
            ? new Date(fechaInput + 'T12:00:00').toLocaleDateString('es-AR', { dateStyle: 'medium' }) 
            : 'N/A';
        
        resumenClienteSpan.textContent = cliente;
        resumenFechaSpan.textContent = fecha;
    }

    function getClienteYFecha() {
        const cliente = inputCliente.value || 'N/A';
        const fechaInput = inputFecha.value;
        const fecha = fechaInput 
            ? new Date(fechaInput + 'T12:00:00').toLocaleDateString('es-AR', { dateStyle: 'medium' }) 
            : 'N/A';
        return { cliente, fecha };
    }

    // ========= 2) CÁLCULOS =========
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

    function calculateGrandTotal() {
        let granTotalNeto = 0;
        document.querySelectorAll('.total-material').forEach(element => {
            granTotalNeto += parseFloat(element.dataset.neto) || 0; 
        });
        totalGeneralElement.innerHTML = `Total Neto Global: <strong>${granTotalNeto.toFixed(2)} kg</strong>`;
    }

    // ========= 3) BLOQUES DE MATERIAL =========
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

    // ========= 4) IMPRESIÓN – UTILIDAD GENERAL =========
    function printHTML(htmlCompleto) {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('El navegador bloqueó la ventana de impresión. Permití pop-ups para esta página.');
            return;
        }
        printWindow.document.open();
        printWindow.document.write(htmlCompleto);
        printWindow.document.close();

        // En muchos navegadores mobile, el print se debe llamar luego de un pequeño delay
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 300);
    }

    function basePrintStyles() {
        return `
            <style>
                * { box-sizing: border-box; }
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    color: #000;
                }
                h1 {
                    text-align: center;
                    font-size: 20px;
                    margin-bottom: 5px;
                    text-transform: uppercase;
                    letter-spacing: 3px;
                }
                h2 {
                    text-align: center;
                    font-size: 16px;
                    margin-top: 0;
                    margin-bottom: 15px;
                }
                h3 {
                    font-size: 14px;
                    margin-top: 20px;
                    margin-bottom: 5px;
                }
                .cabecera {
                    font-size: 12px;
                    margin-bottom: 15px;
                }
                .cabecera p {
                    margin: 2px 0;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                th, td {
                    border: 1px solid #ccc;
                    padding: 6px 8px;
                    font-size: 12px;
                    text-align: left;
                }
                th {
                    background-color: #f0f0f0;
                }
                .totales {
                    margin-top: 15px;
                    font-size: 14px;
                    font-weight: bold;
                    text-align: right;
                }
                .detalle-totales {
                    font-size: 12px;
                    margin-top: 5px;
                    text-align: right;
                }
                hr {
                    margin: 15px 0;
                    border: none;
                    border-top: 1px solid #ccc;
                }
            </style>
        `;
    }

    // ========= 5) IMPRESIÓN – BOLETA RESUMEN =========
    function generateSummaryPDF() {
        const { cliente, fecha } = getClienteYFecha();

        let filasHTML = '';
        let granTotalNeto = 0;

        document.querySelectorAll('.material-seccion').forEach(section => {
            const materialName = section.querySelector('select').value;
            const totalElement = section.querySelector('.total-material');
            
            const totalNeto = parseFloat(totalElement.dataset.neto) || 0;
            const totalBruto = parseFloat(totalElement.dataset.bruto) || 0;
            const taraTotal = parseFloat(totalElement.dataset.tara) || 0;

            if (totalBruto === 0 && totalNeto === 0) {
                // si no hay nada cargado en ese material, lo salteamos
                return;
            }

            granTotalNeto += totalNeto;

            filasHTML += `
                <tr>
                    <td>${materialName}</td>
                    <td>${totalBruto.toFixed(2)}</td>
                    <td>-${taraTotal.toFixed(2)}</td>
                    <td>${totalNeto.toFixed(2)}</td>
                </tr>
            `;
        });

        if (!filasHTML) {
            filasHTML = `
                <tr>
                    <td colspan="4">Sin pesadas registradas.</td>
                </tr>
            `;
        }

        const html = `
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Boleta de Pesadas - DMD Reciclados</title>
                ${basePrintStyles()}
            </head>
            <body>
                <h1>DMD RECICLADOS</h1>
                <h2>Boleta de Pesadas</h2>

                <div class="cabecera">
                    <p><strong>Cliente:</strong> ${cliente}</p>
                    <p><strong>Fecha:</strong> ${fecha}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Material</th>
                            <th>Peso Bruto (kg)</th>
                            <th>Tara (2kg x Pesada)</th>
                            <th>Peso Neto (kg)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasHTML}
                    </tbody>
                </table>

                <div class="totales">
                    TOTAL NETO A PAGAR: ${granTotalNeto.toFixed(2)} kg
                </div>
            </body>
            </html>
        `;

        printHTML(html);
    }

    // ========= 6) IMPRESIÓN – DETALLE COMPLETO =========
    function generateDetailPDF() {
        const { cliente, fecha } = getClienteYFecha();

        let bloquesMaterialesHTML = '';
        let granTotalNeto = 0;

        document.querySelectorAll('.material-seccion').forEach(section => {
            const materialName = section.querySelector('select').value;
            const totalElement = section.querySelector('.total-material');
            
            const totalNeto = parseFloat(totalElement.dataset.neto) || 0;
            const totalBruto = parseFloat(totalElement.dataset.bruto) || 0;
            const taraTotal = parseFloat(totalElement.dataset.tara) || 0;

            if (totalBruto === 0 && totalNeto === 0) {
                return;
            }

            granTotalNeto += totalNeto;

            let filasPesadas = '';
            let index = 0;

            section.querySelectorAll('.pesada-item input[type="number"]').forEach(input => {
                const pesoBruto = parseFloat(input.value) || 0;
                if (pesoBruto > 0) {
                    index++;
                    filasPesadas += `
                        <tr>
                            <td>${index}</td>
                            <td>${pesoBruto.toFixed(2)}</td>
                        </tr>
                    `;
                }
            });

            if (!filasPesadas) {
                filasPesadas = `
                    <tr>
                        <td colspan="2">Sin pesadas registradas.</td>
                    </tr>
                `;
            }

            bloquesMaterialesHTML += `
                <h3>Material: ${materialName}</h3>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Peso Bruto (kg)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasPesadas}
                    </tbody>
                </table>
                <div class="detalle-totales">
                    Bruto Total: ${totalBruto.toFixed(2)} kg |
                    Tara Descontada: -${taraTotal.toFixed(2)} kg |
                    <strong>Neto por Material: ${totalNeto.toFixed(2)} kg</strong>
                </div>
                <hr>
            `;
        });

        if (!bloquesMaterialesHTML) {
            bloquesMaterialesHTML = `
                <p>No hay pesadas registradas para mostrar el detalle.</p>
            `;
        }

        const html = `
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Detalle de Pesadas - DMD Reciclados</title>
                ${basePrintStyles()}
            </head>
            <body>
                <h1>DMD RECICLADOS</h1>
                <h2>Detalle Completo de Pesadas</h2>

                <div class="cabecera">
                    <p><strong>Cliente:</strong> ${cliente}</p>
                    <p><strong>Fecha:</strong> ${fecha}</p>
                </div>

                ${bloquesMaterialesHTML}

                <div class="totales">
                    TOTAL NETO GLOBAL: ${granTotalNeto.toFixed(2)} kg
                </div>
            </body>
            </html>
        `;

        printHTML(html);
    }

    // ========= 7) INICIAL =========
    createMaterialBlock();
});

