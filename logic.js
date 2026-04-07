export const formatBRL = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const parseValue = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(String(val).replace(/[R$\s,]/g, '').replace(/\./g, '').replace(',', '.') ) || 0;
};

export function getProductDNA(name) {
    if (!name) return { qty: 1, type: 'Outros' };
    const n = name.toLowerCase();
    
    // Identificação de Quantidade (Kit) - aprimorado para CSV Shein
    let qty = 1;
    const kitMatch = n.match(/kit\s*(\d+)/i);
    if (kitMatch) {
        qty = parseInt(kitMatch[1]);
    } else if (n.includes('kit 3') || n.includes('kit3')) qty = 3;
    else if (n.includes('kit 5') || n.includes('kit5')) qty = 5;
    else if (n.includes('kit 2') || n.includes('kit2')) qty = 2;

    // Identificação de Categoria - otimizado para produtos Shein do CSV
    let type = 'Geral';
    if (n.includes('alça larga') || n.includes('alca larga') || n.includes('alca_larga')) type = 'Alça Larga';
    else if (n.includes('alça fina') || n.includes('alca fina') || n.includes('alca_fina')) type = 'Alça Fina';
    else if (n.includes('baby look') || n.includes('babylook') || n.includes('baby_look')) type = 'Baby Look';
    else if (n.includes('tactel')) type = 'Tactel';
    else if (n.includes('bojo')) type = 'Bojo';
    else if (n.includes('short suplex') || n.includes('calça suplex')) type = 'Suplex';
    else if (n.includes('regata')) type = 'Regata';

    return { qty, type };
}

export function parseCostsCSV(csvData) {
    // Parser específico para 'Precificação Marketplace - Shein.csv'
    // Headers approx: MKT,Comissão,Frete,...,Produto (col 5),Margem,...,Frete + custo fixo (col12?),Custo (col14?),lucro
    const costs = [];
    csvData.slice(1).forEach(row => {  // Skip header
        const productName = row[5]?.trim();
        if (!productName || row.length < 15) return;
        
        const frete = parseValue(row[12] || row[2]);  // Frete + custo fixo or Frete
        const custoTotal = parseValue(row[14]);  // Custo column
        if (custoTotal <= 0) return;
        
        const dna = getProductDNA(productName);
        costs.push({
            type: dna.type,
            qty: dna.qty,
            frete,
            custo: custoTotal
        });
    });
    return costs;
}

export function processAnalytics(sales, costs) {
    // Mapa de custo médio por tipo/qty para lookup rápido
    const costMap = {};
    costs.forEach(c => {
        const key = `${c.type}-${c.qty}`;
        if (!costMap[key] || c.custo > costMap[key].custo) {
            costMap[key] = c;
        }
    });

    const groups = new Map();

    sales.forEach(row => {
        const name = row.Produtos || row.Produto || row['SKU Principal'] || row['Nome do Produto'];
        const units = parseInt(row['Unidades Vendidas'] || row['Qtd Vendida']) || 0;
        const revenue = parseValue(row['Pagamentos Recebidos'] || row['Receita Bruta']);
        if (!name || units === 0 || revenue === 0) return;

        const dna = getProductDNA(name);
        const vlrVendaUn = revenue / units;

        // Lookup custo exato ou fallback
        let productCost = 0;
        let freight = 6.00;
        const exactKey = `${dna.type}-${dna.qty}`;
        if (costMap[exactKey]) {
            const match = costMap[exactKey];
            productCost = match.custo;
            freight = match.frete;
        } else {
            // Fallback: média da categoria ou default R$12/un + frete R$6
            const avgCat = costs.filter(c => c.type === dna.type)
                                .reduce((sum, c) => sum + (c.custo / c.qty), 0) / 
                               (costs.filter(c => c.type === dna.type).length || 1);
            productCost = avgCat * dna.qty || 12 * dna.qty;
        }

        // Cálculo lucro líquido: Preço - 20% Com. - 5% Imp. - Custo - Frete
        const commission = vlrVendaUn * 0.20;
        const tax = vlrVendaUn * 0.05;
        const profitUn = vlrVendaUn - commission - tax - productCost - freight;

        const key = `${dna.type} Kit ${dna.qty}`;
        if (!groups.has(key)) {
            groups.set(key, {
                key, units: 0, revenue: 0, profit: 0, investment: 0, 
                avgTicket: 0, kitCost: productCost + freight
            });
        }

        const g = groups.get(key);
        g.units += units;
        g.revenue += revenue;
        g.profit += (profitUn * units);
        g.investment += (productCost + freight) * units;
        g.avgTicket = g.revenue / g.units;
    });

    return Array.from(groups.values())
        .map(g => ({
            ...g,
            margin: g.revenue > 0 ? (g.profit / g.revenue) : 0,
            roi: g.investment > 0 ? (g.profit / g.investment) : 0,
            breakEven: g.avgTicket > 0 ? Math.ceil(g.investment / g.avgTicket) : 0
        }))
        .filter(g => g.units > 0)
        .sort((a, b) => b.profit - a.profit);
}
