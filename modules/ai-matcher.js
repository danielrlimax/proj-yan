import { calculateFinancials, parseBRL } from './calculator.js';

// Função para extrair se é "Kit 3", "Kit 5", "2 peças", etc.
function extractQuantity(name) {
    const match = name.match(/kit\s*0*(\d+)|(\d+)\s*(?:peças|pecas|unidades)/i);
    return match ? parseInt(match[1] || match[2]) : null;
}

export function groupAndMatchProducts(salesData, pricingData) {
    const groupedMap = new Map();

    salesData.forEach(sale => {
        const nomeVenda = sale.Produtos || sale.Produto || sale['SKU Principal'] || "Produto Desconhecido";
        
        // 1. Extração rigorosa de quantidade para evitar misturar Kit 3 com Kit 5
        const targetQty = extractQuantity(nomeVenda);
        
        // Filtra a base de custos pela mesma quantidade (se encontrada)
        let candidates = pricingData;
        if (targetQty) {
            const filtered = pricingData.filter(p => extractQuantity(p.Produto) === targetQty);
            if (filtered.length > 0) candidates = filtered;
        }

        // 2. Busca Fuzzy apenas nos candidatos válidos
        const fuse = new Fuse(candidates, { 
            keys: ['Produto'], 
            threshold: 0.4, // Mais rigoroso
            ignoreLocation: true 
        });

        const searchResults = fuse.search(nomeVenda);
        let bestCostMatch = null;

        // 3. Regra de Negócio: Se tem variação parecida, assume o CUSTO MAIS ALTO (Pior Cenário)
        if (searchResults.length > 0) {
            // Pega os matches razoáveis
            const goodMatches = searchResults.filter(res => res.score < 0.6).map(res => res.item);
            const itemsToEvaluate = goodMatches.length > 0 ? goodMatches : [searchResults[0].item];
            
            bestCostMatch = itemsToEvaluate.sort((a, b) => parseBRL(b.Custo) - parseBRL(a.Custo))[0];
        } else {
            // Fallback extremo: Pega o item mais caro dos candidatos com a mesma quantidade
            bestCostMatch = candidates.sort((a, b) => parseBRL(b.Custo) - parseBRL(a.Custo))[0];
        }

        // 4. Cálculos Financeiros Corrigidos
        const financials = calculateFinancials(sale, bestCostMatch);
        
        // Define o nome base do agrupamento (Remove tamanho/cor para juntar tudo)
        const groupKey = bestCostMatch ? bestCostMatch.Produto.split('-')[0].trim() : nomeVenda.split('-')[0].trim();

        if (!groupedMap.has(groupKey)) {
            groupedMap.set(groupKey, {
                nomeAgrupado: groupKey,
                anunciosOriginais: new Set(),
                unidadesTotal: 0,
                receitaTotal: 0,
                lucroTotal: 0,
                custoBaseUsado: financials.custoProduto + financials.freteFixo // Custo + Frete Fixo da sua planilha
            });
        }

        const group = groupedMap.get(groupKey);
        group.anunciosOriginais.add(nomeVenda);
        group.unidadesTotal += financials.unidades;
        group.receitaTotal += financials.receita;
        group.lucroTotal += financials.lucroTotal;
    });

    // 5. Finaliza e calcula as margens globais de cada grupo
    return Array.from(groupedMap.values()).map(group => {
        return {
            ...group,
            anunciosContagem: group.anunciosOriginais.size,
            // Margem real agregada daquele grupo de produtos
            margemMedia: group.receitaTotal > 0 ? (group.lucroTotal / group.receitaTotal) : 0
        };
    }).sort((a, b) => b.lucroTotal - a.lucroTotal);
}