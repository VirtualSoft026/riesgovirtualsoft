with open('styles.css', 'a', encoding='utf-8') as f:
    f.write('''

@media print {
  #printReportContainer table.data-table, #printAnalysisText table {
    font-family: 'Times New Roman', Times, serif !important;
    font-size: 11pt !important;
    color: #000 !important;
    border-top: 2px solid #000 !important;
    border-bottom: 2px solid #000 !important;
    border-left: none !important;
    border-right: none !important;
    background: #fff !important;
    width: 100% !important;
    border-collapse: collapse !important;
    margin-bottom: 20px !important;
  }
  #printReportContainer table.data-table th, #printReportContainer table.data-table td, #printAnalysisText table th, #printAnalysisText table td {
    border: none !important;
    border-bottom: 1px solid #ccc !important;
    color: #000 !important;
    background: #fff !important;
    padding: 8px !important;
    text-align: left !important;
  }
  #printReportContainer table.data-table thead tr:last-child th, #printAnalysisText table thead tr:last-child th {
    border-bottom: 2px solid #000 !important;
  }
  #printReportContainer table.data-table tbody tr:last-child td, #printAnalysisText table tbody tr:last-child td {
    border-bottom: none !important;
  }
}
''')
