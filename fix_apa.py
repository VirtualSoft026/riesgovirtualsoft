import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

replacement = """        <!-- Membrete Placeholder -->
        <table style="width: 100%; border-collapse: collapse; border: none; background: transparent;">
            <thead style="height: 150px; border: none; background: transparent;">
                <tr><td style="border: none; background: transparent;"></td></tr>
            </thead>
            <tfoot style="height: 120px; border: none; background: transparent;">
                <tr><td style="border: none; background: transparent;"></td></tr>
            </tfoot>
            <tbody style="border: none; background: transparent;">
                <tr>
                    <td style="border: none; padding: 0; background: transparent; font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 2;">
                        
                        <div class="print-header" style="text-align: center; margin-bottom: 20px; border-bottom: 1px solid #000; padding-bottom: 10px;">
                            <h1 style="color: #000; font-size: 16pt; margin: 15px 0 5px 0; font-weight: bold;">Reporte de Desempeño Operativo</h1>
                            <p id="printReportMeta" style="color: #333; font-size: 12pt; margin: 0;"></p>
                        </div>
                        
                        <!-- IA Analysis Text -->
                        <div id="printAnalysisText" class="rich-text" style="font-size: 12pt; line-height: 2; margin-bottom: 30px; text-align: justify;">
                        </div>

                        <!-- Charts Container -->
                        <div class="print-charts">
                            <div style="page-break-inside: avoid; margin-bottom: 30px;">
                                <h3 style="color: #000; text-align: center; margin-bottom: 10px; font-size: 14pt; font-weight: bold;">Top Alerta Tardanzas</h3>
                                <img id="printChart5" src="" style="width: 100%; max-width: 500px; display: block; margin: 0 auto;">
                            </div>
                            <div style="margin-bottom: 30px; page-break-inside: avoid;">
                                <h3 style="color: #000; text-align: center; margin-bottom: 10px; font-size: 14pt; font-weight: bold;">Top Excelencia Puntualidad</h3>
                                <img id="printChart1" src="" style="width: 100%; max-width: 500px; display: block; margin: 0 auto;">
                            </div>
                            <div style="page-break-inside: avoid; margin-bottom: 30px;">
                                <h3 style="color: #000; text-align: center; margin-bottom: 10px; font-size: 14pt; font-weight: bold;">Promedio Inactividad Diaria (Min)</h3>
                                <img id="printChart3" src="" style="width: 100%; max-width: 500px; display: block; margin: 0 auto;">
                            </div>
                            <div style="page-break-inside: avoid; margin-bottom: 30px;">
                                <h3 style="color: #000; text-align: center; margin-bottom: 10px; font-size: 14pt; font-weight: bold;">Eficiencia y Volumen de Retiros</h3>
                                <img id="printChart4" src="" style="width: 100%; max-width: 600px; display: block; margin: 0 auto;">
                            </div>
                            <div style="page-break-inside: avoid; margin-bottom: 30px;">
                                <h3 style="color: #000; text-align: center; margin-bottom: 10px; font-size: 14pt; font-weight: bold;">Aprobaciones por Día</h3>
                                <img id="printChart2" src="" style="width: 100%; max-width: 600px; display: block; margin: 0 auto;">
                            </div>
                            <div id="printTableContainer" style="page-break-inside: auto; margin-bottom: 30px; display: block;">
                            </div>
                        </div>
                        
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Analysis Modal -->"""

html = re.sub(
    r"<!-- Membrete Placeholder -->\s*<div class=\"print-header.*?<!-- Analysis Modal -->",
    replacement,
    html,
    flags=re.DOTALL
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
