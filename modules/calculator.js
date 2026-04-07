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
    const precoMedio = parseBRL(venda['Preço Médio'] || venda['Pagamentos Recebidos'] / venda['Unidades Vendidas']);
    const unidades = parseInt(venda['Unidades Vendidas']) || 0;
    const receita = precoMedio * unidades;

    const custoProduto = parseBRL(custoMatching?.Custo || 0);
    const freteFixo = parseBRL(custoMatching?.['Frete + custo fixo'] || 0);
    const comissao = custoMatching?.Comissão ? parsePercent(custoMatching.Comissão) : 0.20;
    const imposto = 0.06;

    const deducoesPercentuais = precoMedio * (comissao + imposto);
    const lucroUnidade = precoMedio - deducoesPercentuais - custoProduto - freteFixo;
    
    const lucroTotal = lucroUnidade * unidades;

    return { precoMedio, unidades, receita, custoProduto, lucroUnidade, lucroTotal };
}