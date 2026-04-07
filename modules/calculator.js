export function parseBRL(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const cleanStr = String(value).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanStr) || 0;
}

export function parsePercent(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const cleanStr = String(value).replace('%', '').replace(',', '.');
    return (parseFloat(cleanStr) || 0) / 100;
}

export function calculateFinancials(venda, custoMatching) {
    // Tenta pegar o Preço Médio ou calcula baseado na receita total dividida por unidades
    const pagamentos = parseBRL(venda['Pagamentos Recebidos']);
    const unidades = parseInt(venda['Unidades Vendidas']) || 0;
    
    let precoMedio = parseBRL(venda['Preço Médio']);
    if (precoMedio === 0 && unidades > 0) precoMedio = pagamentos / unidades;

    const receita = precoMedio * unidades;

    // Busca os custos do produto pareado
    const custoProduto = parseBRL(custoMatching?.Custo || 0);
    const freteFixo = parseBRL(custoMatching?.['Frete + custo fixo'] || 0);
    const comissao = custoMatching?.Comissão ? parsePercent(custoMatching.Comissão) : 0.20; // Default 20%
    const imposto = 0.05; // 5% de imposto baseado na matemática exata da sua planilha

    // CÁLCULO REAL (Igual ao seu Excel)
    // Desconta comissão e imposto percentuais sobre o preço de venda
    const deducoesVenda = precoMedio * (comissao + imposto);
    const lucroUnidade = precoMedio - deducoesVenda - custoProduto - freteFixo;
    
    const lucroTotal = lucroUnidade * unidades;
    const margem = precoMedio > 0 ? (lucroUnidade / precoMedio) : 0;

    return { 
        precoMedio, 
        unidades, 
        receita, 
        custoProduto, 
        freteFixo,
        lucroUnidade, 
        lucroTotal, 
        margem 
    };
}