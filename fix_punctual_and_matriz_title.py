import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace title update for single gestor matriz
js = js.replace(
    "if (elTitleMatriz) elTitleMatriz.innerHTML = `<i class='bx bx-target-lock'></i> Posición de Riesgo: ${selectedGestor}`;",
    "if (elTitleMatriz) elTitleMatriz.innerHTML = `<i class='bx bx-target-lock'></i> % Rechazos: ${selectedGestor}`;"
)

new_punctual_chart = """function drawPunctualDatesChart(id, dates, dataArr, bgColors) {
    destroyChart(id);
    const ctx = document.getElementById(id).getContext('2d');
    
    const datalabelsConfig = {
        formatter: function() {
            return "✓ 0 min";
        },
        anchor: 'center',
        align: 'center',
        color: '#ffffff',
        font: { size: 10, weight: 'bold' }
    };

    controlOperativoCharts[id] = new Chart(ctx, {
        type: 'bar',
        plugins: [typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {}],
        data: {
            labels: dates,
            datasets: [{
                label: 'Conexión a Tiempo',
                data: dates.map(() => 100),
                backgroundColor: 'rgba(103, 194, 58, 0.75)',
                borderColor: 'rgba(103, 194, 58, 1)',
                borderWidth: 1
            }]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 25 }
            },
            plugins: {
                datalabels: datalabelsConfig,
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return `${ctx.label}: Conexión a Tiempo (0 min tarde)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { maxRotation: 45, minRotation: 0, font: { size: 10 } }
                },
                y: {
                    beginAtZero: true,
                    max: 120,
                    ticks: {
                        callback: function(v) { return v === 100 ? 'A tiempo' : ''; }
                    }
                }
            }
        }
    });
}"""

pattern = r"function drawPunctualDatesChart\(id, dates, dataArr, bgColors\) \{.*?\n\}"
js = re.sub(pattern, new_punctual_chart, js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
