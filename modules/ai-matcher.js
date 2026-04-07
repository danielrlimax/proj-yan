import { calculateFinancials, parseBRL } from './calculator.js';

export function groupAndMatchProducts(salesData, pricingData) {
    // Configura IA (Fuse.js) para buscar nomes similares na planilha de custos
    const fuseOptions = {
        keys: ['Produto'],
        threshold: 0.5, // 0.0 é exato, 1.0 é qualquer coisa. 0.5 acha nomes similares
        includeScore: true
    };
    const fuse = new Fuse(pricingData, fuseOptions);

    const groupedMap = new Map();

    salesData.forEach(sale => {
        const nomeVenda = sale.Produtos || sale.Produto || sale['SKU Principal'] || "Produto Desconhecido";
        
        // 1. Procura o produto na planilha de custos
        const searchResults = fuse.search(nomeVenda);
        let bestCostMatch = null;

        if (searchResults.length > 0) {
            // Regra: "Se tiver variação de tamanho/preço diferente, utiliza o PREÇO/CUSTO MAIS ALTO"
            // Pega os resultados aceitáveis (score bom) e ordena pelo maior custo
            const goodMatches = searchResults.filter(res => res.score < 0.6).map(res => res.item);
            
            if (goodMatches.length > 0) {
                bestCostMatch = goodMatches.sort((a, b) => parseBRL(b.Custo) - parseBRL(a.Custo))[0];
            } else {
                bestCostMatch = searchResults[0].item;
            }
        }

        // 2. Calcula finanças para esta linha específica
        const financials = calculateFinancials(sale, bestCostMatch);
        
        // 3. Agrupa por "Nome Encontrado na Tabela de Custos" (ou nome original se não achar)
        const groupKey = bestCostMatch ? bestCostMatch.Produto : nomeVenda;

        if (!groupedMap.has(groupKey)) {
            groupedMap.set(groupKey, {
                nomeAgrupado: groupKey,
                anunciosOriginais: new Set(),
                unidadesTotal: 0,
                receitaTotal: 0,
                lucroTotal: 0,
                custoUnitarioReferencia: financials.custoProduto
            });
        }

        const group = groupedMap.get(groupKey);
        group.anunciosOriginais.add(nomeVenda);
        group.unidadesTotal += financials.unidades;
        group.receitaTotal += financials.receita;
        group.lucroTotal += financials.lucroTotal;
    });

    // Converte o Map para Array e calcula a margem média final
    return Array.from(groupedMap.values()).map(group => {
        return {
            ...group,
            anunciosContagem: group.anunciosOriginais.size,
            margemMedia: group.receitaTotal > 0 ? (group.lucroTotal / group.receitaTotal) : 0
        };
    }).sort((a, b) => b.lucroTotal - a.lucroTotal); // Ordena do maior lucro para o menor
}