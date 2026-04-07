import { calculateFinancials, parseBRL } from './calculator.js';

export function groupAndMatchProducts(salesData, pricingData) {
    const fuse = new Fuse(pricingData, { keys: ['Produto'], threshold: 0.5, includeScore: true });
    const groupedMap = new Map();

    salesData.forEach(sale => {
        const nomeVenda = sale.Produtos || sale.Produto || sale['SKU Principal'] || "Produto Desconhecido";
        const searchResults = fuse.search(nomeVenda);
        let bestCostMatch = null;

        if (searchResults.length > 0) {
            const goodMatches = searchResults.filter(res => res.score < 0.6).map(res => res.item);
            if (goodMatches.length > 0) {
                // Regra: Usa o CUSTO MAIS ALTO se houver variações parecidas
                bestCostMatch = goodMatches.sort((a, b) => parseBRL(b.Custo) - parseBRL(a.Custo))[0];
            } else {
                bestCostMatch = searchResults[0].item;
            }
        }

        const financials = calculateFinancials(sale, bestCostMatch);
        const groupKey = bestCostMatch ? bestCostMatch.Produto : nomeVenda;

        if (!groupedMap.has(groupKey)) {
            groupedMap.set(groupKey, {
                nomeAgrupado: groupKey, anunciosOriginais: new Set(),
                unidadesTotal: 0, receitaTotal: 0, lucroTotal: 0,
                custoUnitarioReferencia: financials.custoProduto
            });
        }

        const group = groupedMap.get(groupKey);
        group.anunciosOriginais.add(nomeVenda);
        group.unidadesTotal += financials.unidades;
        group.receitaTotal += financials.receita;
        group.lucroTotal += financials.lucroTotal;
    });

    return Array.from(groupedMap.values()).map(group => {
        return {
            ...group,
            anunciosContagem: group.anunciosOriginais.size,
            margemMedia: group.receitaTotal > 0 ? (group.lucroTotal / group.receitaTotal) : 0
        };
    }).sort((a, b) => b.lucroTotal - a.lucroTotal);
}