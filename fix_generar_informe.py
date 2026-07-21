import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

replacement = """function generarReporteEjecutivoPDF() {
    // 1. Obtener metadatos (gestor y periodo)
    const gestorSelect = document.getElementById('filtroGestorOperativo');
    const gestorText = gestorSelect.options[gestorSelect.selectedIndex].text;
    
    const periodoSelect = document.getElementById('filtroFechaOperativo');
    let periodoText = periodoSelect.options[periodoSelect.selectedIndex].text;
    
    if (periodoSelect.value === 'custom') {
        const start = document.getElementById('operativoDateStart').value;
        const end = document.getElementById('operativoDateEnd').value;
        periodoText = `Personalizado (${start || 'Inicio'} a ${end || 'Fin'})`;
    }

    const now = new Date();
    document.getElementById('printReportMeta').innerText = `Fecha de generación: ${now.toLocaleString()} | Gestor(es): ${gestorText} | Periodo: ${periodoText}`;

    // 2. Copiar el análisis de IA
    const analisisHtml = document.getElementById('analysisModalBody').innerHTML;
    document.getElementById('printAnalysisText').innerHTML = analisisHtml;

    // 3. Capturar gráficas como imágenes
    const chartExcelencia = controlOperativoCharts['chartTardanzasMejores'];
    const chartPeores = controlOperativoCharts['chartTardanzasPeores'];
    const chartAprobaciones = controlOperativoCharts['chartAprobacionesDia'];
    const chartInactividad = controlOperativoCharts['chartInactividad'];
    const chartEficiencia = controlOperativoCharts['chartEficiencia'];

    const imgChart1 = document.getElementById('printChart1'); // Excelencia
    const imgChart2 = document.getElementById('printChart2'); // Aprobaciones
    const imgChart3 = document.getElementById('printChart3'); // Inactividad
    const imgChart4 = document.getElementById('printChart4'); // Eficiencia
    const imgChart5 = document.getElementById('printChart5'); // Peores

    // Función auxiliar para imprimir chart
    const renderPrintChart = (chartObj, imgEl, titleText) => {
        if (chartObj && imgEl) {
            try {
                imgEl.src = chartObj.toBase64Image();
                imgEl.style.display = 'block';
                if (imgEl.previousElementSibling) {
                    imgEl.previousElementSibling.innerText = titleText;
                    imgEl.previousElementSibling.style.display = 'block';
                }
                imgEl.parentElement.style.display = 'block';
            } catch (e) {
                console.error("Error capturando chart:", titleText, e);
            }
        } else if (imgEl) {
            imgEl.style.display = 'none';
            if (imgEl.previousElementSibling) imgEl.previousElementSibling.style.display = 'none';
            imgEl.parentElement.style.display = 'none';
        }
    };

    renderPrintChart(chartPeores, imgChart5, "Top Alerta Tardanzas (Peores)");
    renderPrintChart(chartExcelencia, imgChart1, "Top Excelencia Puntualidad (Mejores)");
    renderPrintChart(chartAprobaciones, imgChart2, "Evolución Diaria de Retiros");
    renderPrintChart(chartInactividad, imgChart3, "Promedio Inactividad Diaria (Min)");
    renderPrintChart(chartEficiencia, imgChart4, "Eficiencia y Volumen de Retiros");

    // 3.5. Tabla de Resumen
    const printTableContainer = document.getElementById('printTableContainer');
    if (printTableContainer) {
        const tableDiv = document.getElementById('tablaResumenOperativo').parentElement;
        printTableContainer.innerHTML = `<h3 style="color: var(--accent-primary); text-align: center; margin-bottom: 20px; font-size: 16px;">Resumen de Retiros por Gestor</h3>` + tableDiv.outerHTML;
        printTableContainer.style.display = 'block';
    }

    // 4. Llamar a imprimir
    setTimeout(() => {
        window.print();
    }, 800);
}"""

js = re.sub(
    r"function generarReporteEjecutivoPDF\(\) \{.*?\n\}\n\n\n\nasync function loadControlOperativoData",
    replacement + "\n\n\n\nasync function loadControlOperativoData",
    js,
    flags=re.DOTALL
)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
