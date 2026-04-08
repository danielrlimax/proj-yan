import type { XLSXRow, CSVRow, ProductData, DashboardMetrics, LojaMetric, SKUMetric } from '../types';

// Normaliza strings para facilitar a comparação (minúsculas, sem acentos)
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Compara nomes de produtos (Focado em achar palavras-chave em comum)
function matchScore(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 100;
  if (na.includes(nb) || nb.includes(na)) return 80;

  const wordsA = new Set(na.split(/\s+/));
  const wordsB = new Set(nb.split(/\s+/));
  let overlap = 0;
  wordsA.forEach((w) => { if (wordsB.has(w) && w.length > 2) overlap++; });
  const total = Math.max(wordsA.size, wordsB.size);
  return total > 0 ? (overlap / total) * 60 : 0;
}

// Padroniza os nomes das lojas para agrupar todas do mesmo marketplace
function getStoreAlias(storeName: string): string {
  const n = normalize(storeName);
  if (n.includes('meli') || n.includes('mercado libre') || n === 'ml' || n.includes('ml cla')) return 'ml';
  if (n.includes('shopee')) return 'shopee';
  if (n.includes('shein')) return 'shein';
  if (n.includes('tiktok') || n.includes('tik tok')) return 'tiktok';
  if (n.includes('amazon')) return 'amazon';
  if (n.includes('magalu') || n.includes('magazine')) return 'magalu';
  return n;
}

function findBestCSVMatch(xlsxRow: XLSXRow, csvRows: CSVRow[]): CSVRow | null {
  let best: CSVRow | null = null;
  let bestScore = 0;

  const skuXlsx = normalize(xlsxRow.skuPrincipal || '');
  const produtoXlsx = normalize(xlsxRow.produto || '');
  const lojaAliasXlsx = getStoreAlias(xlsxRow.loja || '');

  for (const csvRow of csvRows) {
    let score = 0;
    const produtoCsv = normalize(csvRow.produto || '');
    const mktAliasCsv = getStoreAlias(csvRow.mkt || '');

    // 1. Pontuação pelo Nome/SKU do Produto
    if (skuXlsx && produtoCsv.includes(skuXlsx)) score += 50;
    score += matchScore(produtoXlsx, produtoCsv);

    // 2. Pontuação por Canal de Venda
    if (lojaAliasXlsx === mktAliasCsv) {
      score += 30;

      // 3. REGRA DO MERCADO LIVRE (Desempate entre Premium e Clássico pelo preço)
      if (lojaAliasXlsx === 'ml') {
        const precoReferenciaCsv = csvRow.precoRealPromo > 0 ? csvRow.precoRealPromo : csvRow.precoVenda;
        const diferencaPreco = Math.abs(xlsxRow.precoMedio - precoReferenciaCsv);

        if (diferencaPreco <= 2.00) {
          score += 50; 
        } else if (diferencaPreco <= 5.00) {
          score += 25; 
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = csvRow;
    }
  }

  return bestScore >= 40 ? best : null;
}

export function computeDashboard(xlsxRows: XLSXRow[], csvRows: CSVRow[]): DashboardMetrics {
  const products: ProductData[] = [];

  // IMPOSTO ESCONDIDO NO CSV (5% Simples Nacional)
  // Matematicamente comprovado pela diferença de R$ 2,50 no lucro da blusa de R$ 49,90
  const IMPOSTO_PCT = 0.05; 

  for (const row of xlsxRows) {
    const csvMatch = findBestCSVMatch(row, csvRows);
    const precoVenda = row.precoMedio;
    const unidades = row.unidadesVendidas;

    let custoProduto = 0;
    let comissaoPct = 0;
    let freteECustoFixo = 0;

    // Se achou correspondência no CSV
    if (csvMatch) {
      // Usa o custo do CSV. Se por acaso estiver zerado, assume 60% do valor de venda
      custoProduto = csvMatch.custo > 0 ? csvMatch.custo : precoVenda * 0.60;
      freteECustoFixo = csvMatch.frete > 0 ? csvMatch.frete : 0;
      
      const mktNomeOriginal = normalize(csvMatch.mkt || '');
      if (mktNomeOriginal === 'ml') {
        comissaoPct = 0.19; // ML Premium
      } else if (mktNomeOriginal.includes('ml cla')) {
        comissaoPct = 0.14; // ML Clássico
      } else {
        comissaoPct = csvMatch.comissao > 0 ? csvMatch.comissao : 0.16; 
      }
      
    } else {
      // FALLBACK MAIS REALISTA (~10% a 12% de margem)
      // Para produtos do XLSX que não foram encontrados no CSV
      custoProduto = precoVenda * 0.60; // Mercadoria = 60% do preço
      const loja = normalize(row.loja || '');
      
      if (loja.includes('meli')) {
        comissaoPct = 0.16; // Puxamos para a média (16%)
        freteECustoFixo = precoVenda < 79 ? 6.00 : 0.00;
      } else if (loja.includes('shopee')) {
        comissaoPct = 0.20;
        freteECustoFixo = 3.00;
      } else if (loja.includes('shein')) {
        comissaoPct = 0.16;
        freteECustoFixo = 0.00;
      } else {
        comissaoPct = 0.16;
        freteECustoFixo = 3.00;
      }
    }

    // Calcula os descontos
    const valorComissao = precoVenda * comissaoPct;
    const valorImposto = precoVenda * IMPOSTO_PCT; // Aplica os 5% que faltavam!
    
    // Lucro Unitário = Venda - Custo - Comissão - Imposto - Frete
    const lucroUnitario = precoVenda - custoProduto - valorComissao - valorImposto - freteECustoFixo;
    const margemReal = precoVenda > 0 ? (lucroUnitario / precoVenda) : 0;

    // Totais do Produto
    const receitaTotal = row.pagamentosRecebidos > 0 ? row.pagamentosRecebidos : (precoVenda * unidades);
    const custoMercadoriaTotal = custoProduto * unidades;
    const despesasVendaTotal = (valorComissao + valorImposto + freteECustoFixo) * unidades;
    
    const lucroTotal = receitaTotal - custoMercadoriaTotal - despesasVendaTotal;
    
    const investimentoTotal = custoMercadoriaTotal + despesasVendaTotal;
    const roi = investimentoTotal > 0 ? (lucroTotal / investimentoTotal) * 100 : 0;

    products.push({
      produto: row.produto,
      loja: row.loja,
      skuPrincipal: row.skuPrincipal,
      idAnuncio: row.idAnuncio,
      pedidosValidos: row.pedidosValidos,
      unidadesVendidas: unidades,
      pagamentosRecebidos: receitaTotal,
      precoMedio: precoVenda,
      custo: custoProduto,
      lucroUnitario,
      margemReal,
      comissao: comissaoPct,
      frete: freteECustoFixo + valorImposto, // Agrupado para refletir o custo total extra
      receitaTotal,
      custoTotal: custoMercadoriaTotal, 
      lucroTotal,
      roi,
    });
  }

  // Ordena os produtos pela maior receita
  products.sort((a, b) => b.receitaTotal - a.receitaTotal);

  const totalReceita = products.reduce((s, p) => s + p.receitaTotal, 0);
  const totalCustoGeral = products.reduce((s, p) => {
    // Custo Total agora engloba: Mercadoria + Frete + Comissão + Impostos
    return s + p.custoTotal + (p.frete * p.unidadesVendidas) + (p.precoMedio * p.comissao * p.unidadesVendidas);
  }, 0);

  const totalLucro = products.reduce((s, p) => s + p.lucroTotal, 0);
  const totalPedidos = products.reduce((s, p) => s + p.pedidosValidos, 0);
  const totalUnidades = products.reduce((s, p) => s + p.unidadesVendidas, 0);
  
  const margemMediaGeral = totalReceita > 0 ? (totalLucro / totalReceita) * 100 : 0;
  const ticketMedio = totalPedidos > 0 ? totalReceita / totalPedidos : 0;
  const roiMedio = totalCustoGeral > 0 ? (totalLucro / totalCustoGeral) * 100 : 0;

  // Por loja
  const lojaMap = new Map<string, LojaMetric>();
  for (const p of products) {
    const lojaKey = p.loja || 'Desconhecido';
    if (!lojaMap.has(lojaKey)) {
      lojaMap.set(lojaKey, { loja: lojaKey, receita: 0, lucro: 0, pedidos: 0, unidades: 0, margem: 0 });
    }
    const l = lojaMap.get(lojaKey)!;
    l.receita += p.receitaTotal;
    l.lucro += p.lucroTotal;
    l.pedidos += p.pedidosValidos;
    l.unidades += p.unidadesVendidas;
  }
  const porLoja = Array.from(lojaMap.values()).map((l) => ({
    ...l,
    margem: l.receita > 0 ? (l.lucro / l.receita) * 100 : 0,
  })).sort((a, b) => b.receita - a.receita);

  // Por SKU
  const skuMap = new Map<string, SKUMetric>();
  for (const p of products) {
    const skuKey = p.skuPrincipal || p.produto.substring(0, 30);
    if (!skuMap.has(skuKey)) {
      skuMap.set(skuKey, { sku: skuKey, produto: p.produto, receita: 0, lucro: 0, unidades: 0, margem: 0 });
    }
    const s = skuMap.get(skuKey)!;
    s.receita += p.receitaTotal;
    s.lucro += p.lucroTotal;
    s.unidades += p.unidadesVendidas;
  }
  const porSKU = Array.from(skuMap.values()).map((s) => ({
    ...s,
    margem: s.receita > 0 ? (s.lucro / s.receita) * 100 : 0,
  })).sort((a, b) => b.receita - a.receita).slice(0, 15);

  // Lucro Acumulado
  let acum = 0;
  const lucroAcumulado = products.map((p, i) => {
    acum += p.lucroTotal;
    return {
      index: i + 1,
      label: (p.skuPrincipal || p.produto).substring(0, 20),
      lucro: acum,
      receita: p.receitaTotal,
    };
  });

  // Distribuição de Margem
  const faixas = ['<5%', '5-10%', '10-15%', '15-20%', '>20%'];
  const counts = [0, 0, 0, 0, 0];
  for (const p of products) {
    const m = p.margemReal * 100;
    if (m < 5) counts[0]++;
    else if (m < 10) counts[1]++;
    else if (m < 15) counts[2]++;
    else if (m < 20) counts[3]++;
    else counts[4]++;
  }
  const distribuicaoMargem = faixas.map((f, i) => ({ faixa: f, count: counts[i] }));

  return {
    totalReceita,
    totalCusto: totalCustoGeral,
    totalLucro,
    totalPedidos,
    totalUnidades,
    margemMediaGeral,
    ticketMedio,
    roiMedio,
    topProdutos: products.slice(0, 10),
    porLoja,
    porSKU,
    lucroAcumulado,
    distribuicaoMargem,
    produtos: products,
  };
}