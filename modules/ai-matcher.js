import { calculateFinancials, parseBRL } from './calculator.js';

// Função para extrair se é "Kit 3", "Kit 5", etc. Blindada contra células vazias.
function extractQuantity(name) {
    if (!name || typeof name !== 'string') return null; // PROTEÇÃO CONTRA LINHAS VAZIAS
    const match = name.match(/kit\s*0*(\d+)|(\d+)\s*(?:peças|pecas|unidades)/i);
    return match ? parseInt(match[1] || match[2]) : null;
}

export function groupAndMatchProducts(salesData, pricingData) {
    const groupedMap = new Map();

    // Limpa a base de preços: ignora linhas do CSV que estejam totalmente em branco
    const validPricing = pricingData.filter(p => p && p.Produto);

    salesData.forEach(sale => {
        // Se a linha de venda não tiver nenhum desses campos, ignora a linha
        const nomeVenda = sale.Produtos || sale.Produto || sale['SKU Principal'];
        if (!nomeVenda) return; // Pula a linha se estiver vazia
        
        const targetQty = extractQuantity(nomeVenda);
        
        let candidates = validPricing;
        if (targetQty) {
            const filtered = validPricing.filter(p => extractQuantity(p.Produto) === targetQty);
            if (filtered.length > 0) candidates = filtered;
        }

        const fuse = new Fuse(candidates, { 
            keys: ['Produto'], 
            threshold: 0.4, 
            ignoreLocation: true 
        });

        const searchResults = fuse.search(nomeVenda);
        let bestCostMatch = null;

        if (searchResults.length > 0) {
            const goodMatches = searchResults.filter(res => res.score < 0.6).map(res => res.item);
            const itemsToEvaluate = goodMatches.length > 0 ? goodMatches : [searchResults[0].item];
            bestCostMatch = itemsToEvaluate.sort((a, b) => parseBRL(b.Custo) - parseBRL(a.Custo))[0];
        } else if (candidates.length > 0) {
            bestCostMatch = candidates.sort((a, b) => parseBRL(b.Custo) - parseBRL(a.Custo))[0];
        }

        const financials = calculateFinancials(sale, bestCostMatch);
        
        // Proteção ao separar o nome do produto
        let groupKey = nomeVenda;
        if (bestCostMatch && bestCostMatch.Produto && typeof bestCostMatch.Produto === 'string') {
            groupKey = bestCostMatch.Produto.split('-')[0].trim();
        } else if (typeof nomeVenda === 'string') {
            groupKey = nomeVenda.split('-')[0].trim();
        }

        if (!groupedMap.has(groupKey)) {
            groupedMap.set(groupKey, {
                nomeAgrupado: groupKey,
                anunciosOriginais: new Set(),
                unidadesTotal: 0,
                receitaTotal: 0,
                lucroTotal: 0,
                custoBaseUsado: financials.custoProduto + financials.freteFixo
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