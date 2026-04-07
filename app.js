import { parseValue, getProductDNA, processAnalytics, formatBRL, parseCostsCSV } from './logic.js';

let pricingDb = [];
let charts = {};
let csvFile = null;
let salesFile = null;

document.addEventListener('DOMContentLoaded', () => {
    updateStatus('Pronto para upload dos arquivos de custos (CSV) e vendas (XLSX).');
    setupEventListeners();
});

function setupEventListeners() {
    const csvInput = document.getElementById('csv-input');
    const excelInput = document.getElementById('excel-input');
    const analyzeBtn = document.getElementById('analyze-btn');

    if (csvInput) csvInput.onchange = handleCsvUpload;
    if (excelInput) excelInput.onchange = handleExcelUpload;
    if (analyzeBtn) analyzeBtn.onclick = analyzeFiles;
}

function handleCsvUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    csvFile = file;
    document.getElementById('csv-file-name')?.classList.remove('hidden');
    document.getElementById('csv-file-name')?.textContent = `CSV: ${file.name}`;
    updateStatus(`CSV de custos carregado: ${file.name}`);
}

function handleExcelUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    salesFile = file;
    document.getElementById('excel-file-name')?.classList.remove('hidden');
    document.getElementById('excel-file-name')?.textContent = `XLSX: ${file.name}`;
    updateStatus(`Arquivo de vendas carregado: ${file.name}`);
}

function analyzeFiles() {
    if (!csvFile || !salesFile) {
        updateStatus('Erro: Carregue tanto o CSV de custos quanto o XLSX de vendas.', true);
        return;
    }

    updateStatus('Processando arquivos...');

    // Process CSV costs
    const csvReader = new FileReader();
    csvReader.onload = (evt) => {
        const csvText = evt.target.result;
        const csvData = Papa.parse(csvText, { header: false }).data;
        pricingDb = parseCostsCSV(csvData);
        
        if (pricingDb.length === 0) {
            updateStatus('Erro: Nenhum custo válido encontrado no CSV.', true);
            return;
        }

        // Process XLSX sales
        const excelReader = new FileReader();
        excelReader.onload = (evt2) => {
            const data = new Uint8Array(evt2.target.result);
            const wb = XLSX.read(data, { type: 'array' });
            const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            
            const results = processAnalytics(json, pricingDb);
            renderDashboard(results);
        };
        excelReader.readAsArrayBuffer(salesFile);
    };
    csvReader.readAsText(csvFile);
}

function updateStatus(text, isError = false) {
    const status = document.getElementById('status-text');
    if (status) {
        status.textContent = text;
        status.style.color = isError ? '#ef4444' : '#10b981';
    }
}

function renderDashboard(data) {
    document.getElementById('loader-screen').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('hidden');

    const totalProfit = data.reduce((a, b) => a + b.profit, 0);
    const totalRev = data.reduce((a, b) => a + b.revenue, 0);
    const totalInv = data.reduce((a, b) => a + b.investment, 0);

    document.getElementById('total-profit').textContent = formatBRL(totalProfit);
    document.getElementById('total-revenue').textContent = formatBRL(totalRev);
    document.getElementById('avg-roi').textContent = totalInv > 0 ? ((totalProfit / totalInv) * 100).toFixed(1) + "%" : "0%";
    document.getElementById('avg-margin').textContent = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) + "%" : "0%";

    const tbody = document.getElementById('table-body');
    tbody.innerHTML = data.map(item => `
        <tr>
            <td><strong>${item.key}</strong></td>
            <td>${item.units.toLocaleString()}</td>
            <td>${formatBRL(item.avgTicket)}</td>
            <td>${formatBRL(item.kitCost)}</td>
            <td class="${item.profit > 0 ? 'text-success' : 'text-danger'}">${formatBRL(item.profit)}</td>
            <td>${(item.roi * 100).toFixed(1)}%</td>
            <td>${(item.margin * 100).toFixed(1)}%</td>
            <td>${item.breakEven} un.</td>
        </tr>
    `).join('');

    initCharts(data);
    updateStatus('Análise completa!');
}

function initCharts(data) {
    // Destroy existing charts
    Object.values(charts).forEach(chart => chart.destroy());

    const topProfit = data.slice(0, 8);
    const topVolume = data.slice(0, 8).sort((a, b) => b.units - a.units);

    // Profit Chart
    const profitCtx = document.getElementById('profitChart')?.getContext('2d');
    if (profitCtx) {
        charts.profit = new Chart(profitCtx, {
            type: 'bar',
            data: {
                labels: topProfit.map(i => i.key.slice(0, 20)),
                datasets: [{
                    label: 'Lucro Líquido (R$)',
                    data: topProfit.map(i => i.profit),
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: '#10b981',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } },
                plugins: { legend: { display: false } }
            }
        });
    }

    // Volume Chart (Pie)
    const volumeCtx = document.getElementById('volumeChart')?.getContext('2d');
    if (volumeCtx) {
        charts.volume = new Chart(volumeCtx, {
            type: 'doughnut',
            data: {
                labels: topVolume.map(i => i.key.slice(0, 15)),
                datasets: [{
                    data: topVolume.map(i => i.units),
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

