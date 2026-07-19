import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

replacement_str = """
    const imgChart1 = document.getElementById('printChart1');
    const imgChart2 = document.getElementById('printChart2');
    const imgChart3 = document.getElementById('printChart3');
    const imgChart4 = document.getElementById('printChart4');

    // Chart 1: Si es global mostramos Excelencia, si es individual mostramos otra cosa o la ocultamos
    if (isGlobal && chartExcelencia) {
        try {
            imgChart1.src = chartExcelencia.toBase64Image();
            imgChart1.style.display = 'block';
            imgChart1.previousElementSibling.innerText = "Ranking de Excelencia (Top 5 Más Ágiles)";
            imgChart1.previousElementSibling.style.display = 'block';
        } catch (e) {
            console.error("Error capturando chartExcelencia:", e);
        }
    } else {
        imgChart1.style.display = 'none';
        if (imgChart1.previousElementSibling) imgChart1.previousElementSibling.style.display = 'none';
    }
    
    // Chart 2: Evolución diaria aplica para global e individual
    if (chartAprobaciones) {
        try {
            imgChart2.src = chartAprobaciones.toBase64Image();
            imgChart2.style.display = 'block';
            imgChart2.previousElementSibling.innerText = "Evolución Diaria de Retiros";
            imgChart2.previousElementSibling.style.display = 'block';
        } catch (e) {
            console.error("Error capturando chartAprobaciones:", e);
        }
    } else {
        imgChart2.style.display = 'none';
        if (imgChart2.previousElementSibling) imgChart2.previousElementSibling.style.display = 'none';
    }

    // Chart 3 & 4: Inactividad y Eficiencia (Solo Global)
    const chartInactividad = controlOperativoCharts['chartInactividad'];
    const chartEficiencia = controlOperativoCharts['chartEficiencia'];

    if (isGlobal && chartInactividad) {
        try {
            imgChart3.src = chartInactividad.toBase64Image();
            imgChart3.style.display = 'block';
            if (imgChart3.previousElementSibling) imgChart3.previousElementSibling.style.display = 'block';
        } catch(e) { console.error(e); }
    } else {
        imgChart3.style.display = 'none';
        if (imgChart3.previousElementSibling) imgChart3.previousElementSibling.style.display = 'none';
    }

    if (isGlobal && chartEficiencia) {
        try {
            imgChart4.src = chartEficiencia.toBase64Image();
            imgChart4.style.display = 'block';
            if (imgChart4.previousElementSibling) imgChart4.previousElementSibling.style.display = 'block';
        } catch(e) { console.error(e); }
    } else {
        imgChart4.style.display = 'none';
        if (imgChart4.previousElementSibling) imgChart4.previousElementSibling.style.display = 'none';
    }

    // 4. Llamar a imprimir
"""

# Find where to replace
regex = r"const imgChart1 = document\.getElementById\('printChart1'\);.*?// 4\. Llamar a imprimir"

new_js = re.sub(regex, replacement_str.strip(), js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(new_js)
