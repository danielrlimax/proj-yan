export function parseBRL(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    // Remove "R$", espaços, converte ponto de milhar para nada e vírgula para ponto decimal
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
    const precoMedio = parseBRL(venda['Preço Médio'] || venda['Pagamentos Recebidos'] / venda['Unidades Vendidas']);
    const unidades = parseInt(venda['Unidades Vendidas']) || 0;
    const receita = precoMedio * unidades;

    // Se não encontrou custo, assume 0 para não quebrar o código (pode ajustar para um padrão)
    const custoProduto = parseBRL(custoMatching?.Custo || 0);
    const freteFixo = parseBRL(custoMatching?.['Frete + custo fixo'] || 0);
    
    // Na falta da comissão da planilha de custos, assumimos 20% (0.20) e 6% de imposto
    const comissao = custoMatching?.Comissão ? parsePercent(custoMatching.Comissão) : 0.20;
    const imposto = 0.06; // Imposto padrão, ajuste se necessário

    // CÁLCULO DE LUCRO LÍQUIDO REAL DA VENDA:
    // Lucro = ReceitaBruta - (ReceitaBruta * (Comissao + Imposto)) - CustoTotalDoProduto - CustoFreteFixo
    const deducoesPercentuais = precoMedio * (comissao + imposto);
    const lucroUnidade = precoMedio - deducoesPercentuais - custoProduto - freteFixo;
    
    const lucroTotal = lucroUnidade * unidades;
    const margem = precoMedio > 0 ? (lucroUnidade / precoMedio) : 0;

    return {
        precoMedio,
        unidades,
        receita,
        custoProduto,
        lucroUnidade,
        lucroTotal,
        margem
    };
}