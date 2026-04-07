import { fetchCSV, parseExcel } from './modules/parser.js';
import { groupAndMatchProducts } from './modules/ai-matcher.js';
import { renderCharts, updateKPIs, updateTable } from './modules/ui-charts.js';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQOKJdC-S3fLFW6t2E1CRKABogN-2dwhW7bQpyFldS-3uUf3oUnDsu6PNBbyyT8lsttYqJwNHgxLTSI/pub?gid=1183835234&single=true&output=csv';

let pricingData = [];
let salesData = [];

// Elementos da UI
const uploadInput = document.getElementById('uploadExcel');
const btnSync = document.getElementById('btnSync');

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    btnSync.innerText = "Sincronizando...";
    pricingData = await fetchCSV(CSV_URL);
    btnSync.innerText = "Sincronizar Planilha de Custos";
    console.log("Custos carregados:", pricingData.length, "linhas.");
});

btnSync.addEventListener('click', async () => {
    btnSync.innerText = "Sincronizando...";
    pricingData = await fetchCSV(CSV_URL);
    btnSync.innerText = "Sincronizar Planilha de Custos";
    if (salesData.length > 0) processDashboard();
});

uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (pricingData.length === 0) {
        alert("Aguarde a sincronização dos custos antes de enviar as vendas.");
        return;
    }

    salesData = await parseExcel(file);
    processDashboard();
});

function processDashboard() {
    // 1. Usa IA (Fuse.js) para cruzar dados de vendas com custos
    const analyzedData = groupAndMatchProducts(salesData, pricingData);
    
    // 2. Atualiza Interface
    updateKPIs(analyzedData);
    updateTable(analyzedData);
    renderCharts(analyzedData);
}