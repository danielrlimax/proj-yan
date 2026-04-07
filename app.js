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
        // AGORA ELE VAI MOSTRAR O ERRO REAL NO CONSOLE DO NAVEGADOR (Aperte F12)
        console.error("ERRO DETALHADO DURANTE O PROCESSAMENTO:", error);
        alert("Erro ao processar! Aperte F12 no teclado e veja a aba 'Console' para descobrir o motivo.");
        loadingStatus.innerText = "Erro no processamento. Tente novamente.";
        loadingStatus.style.color = "#ef4444";
    }
});