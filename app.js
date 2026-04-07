import { fetchCSV, parseExcel } from './modules/parser.js';
import { groupAndMatchProducts } from './modules/ai-matcher.js';
import { renderCharts, updateKPIs, updateTable } from './modules/ui-charts.js';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQOKJdC-S3fLFW6t2E1CRKABogN-2dwhW7bQpyFldS-3uUf3oUnDsu6PNBbyyT8lsttYqJwNHgxLTSI/pub?gid=1183835234&single=true&output=csv';

let pricingData = [];

// Elementos da UI
const uploadScreen = document.getElementById('upload-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const uploadInput = document.getElementById('uploadExcel');
const loadingStatus = document.getElementById('loadingStatus');
const btnNewUpload = document.getElementById('btnNewUpload');

// Inicialização: Baixa a planilha de custos em background
document.addEventListener('DOMContentLoaded', async () => {
    try {
        pricingData = await fetchCSV(CSV_URL);
        loadingStatus.innerText = "Planilha de custos sincronizada! Aguardando Excel...";
        loadingStatus.style.color = "var(--profit)";
    } catch (error) {
        loadingStatus.innerText = "Erro ao buscar custos. Verifique a internet.";
        loadingStatus.style.color = "#ef4444";
    }
});

// Evento de Upload do Arquivo Excel
uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (pricingData.length === 0) {
        alert("A planilha de custos ainda está sendo carregada. Aguarde alguns segundos.");
        return;
    }

    loadingStatus.innerText = "Processando dados e aplicando IA...";
    loadingStatus.style.color = "var(--accent)";

    try {
        // 1. Lê o Excel
        const salesData = await parseExcel(file);
        
        // 2. Cruza dados usando IA
        const analyzedData = groupAndMatchProducts(salesData, pricingData);
        
        // 3. Atualiza o Dashboard
        updateKPIs(analyzedData);
        updateTable(analyzedData);
        renderCharts(analyzedData);

        // 4. Troca de Tela
        showDashboard();
    } catch (error) {
        alert("Erro ao ler o arquivo Excel.");
        loadingStatus.innerText = "Erro no processamento.";
    }
});

// Voltar para tela inicial
btnNewUpload.addEventListener('click', () => {
    uploadInput.value = ""; // limpa o input
    dashboardScreen.style.opacity = "0";
    setTimeout(() => {
        dashboardScreen.style.display = "none";
        uploadScreen.style.display = "flex";
        uploadScreen.style.opacity = "1";
        loadingStatus.innerText = "Aguardando novo Excel...";
    }, 500);
});

// Função de animação de troca de tela
function showDashboard() {
    uploadScreen.style.opacity = "0";
    setTimeout(() => {
        uploadScreen.style.display = "none";
        dashboardScreen.style.display = "block";
        // Pequeno delay para a opacidade funcionar
        setTimeout(() => {
            dashboardScreen.style.opacity = "1";
        }, 50);
    }, 500); // 500ms é o tempo da transição no CSS
}