import type { XLSXRow, CSVRow, ProductData, DashboardMetrics, LojaMetric, SKUMetric } from '../types';

// Normalize strings for matching (lowercase, remove accents, trim)
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Score how well two product names match (0 = no match, higher = better)
function matchScore(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 100;
  if (na.includes(nb) || nb.includes(na)) return 80;

  // Word overlap
  const wordsA = new Set(na.split(/\s+/));
  const wordsB = new Set(nb.split(/\s+/));
  let overlap = 0;
  wordsA.forEach((w) => { if (wordsB.has(w) && w.length > 2) overlap++; });
  const total = Math.max(wordsA.size, wordsB.size);
  return total > 0 ? (overlap / total) * 60 : 0;
}

function findBestCSVMatch(xlsxRow: XLSXRow, csvRows: CSVRow[]): CSVRow | null {
  let best: CSVRow | null = null;
  let bestScore = 20; // minimum threshold

  // Try matching by SKU principal (short product name)
  const sku = normalize(xlsxRow.skuPrincipal);
  const produto = normalize(xlsxRow.produto);

  for (const csvRow of csvRows) {
    // Try SKU match first
    let score = 0;
    if (sku) {
      score = Math.max(score, matchScore(sku, csvRow.produto));
    }
    // Try full produto match
    score = Math.max(score, matchScore(produto, csvRow.produto));

    // Bonus if price is close
    if (xlsxRow.precoMedio > 0 && csvRow.precoRealPromo > 0) {
      const priceDiff = Math.abs(xlsxRow.precoMedio - csvRow.precoRealPromo) / csvRow.precoRealPromo;
      if (priceDiff < 0.05) score += 20;
      else if (priceDiff < 0.15) score += 10;
    }

    if (score > bestScore) {
      bestScore = score;
      best = csvRow;
    }
  }

  return best;
}

export function computeDashboard(xlsxRows: XLSXRow[], csvRows: CSVRow[]): DashboardMetrics {
  const products: ProductData[] = [];

  for (const row of xlsxRows) {
    const csvMatch = findBestCSVMatch(row, csvRows);

    // Use matched CSV data or estimate from XLSX data
    let custo = 0;
    let lucroUnitario = 0;
    let margemReal = 0;
    let comissao = 0;
    let frete = 0;

    if (csvMatch) {
      custo = csvMatch.custo;
      lucroUnitario = csvMatch.lucroUnitario;
      margemReal = csvMatch.margemReal;
      comissao = csvMatch.comissao;
      frete = csvMatch.frete;
    } else {
      // Fallback: estimate using average margin from CSV (11.49%)
      margemReal = 0.1149;
      comissao = 0.20;
      frete = 6;
      lucroUnitario = row.precoMedio * margemReal;
      custo = row.precoMedio * (1 - comissao) - frete - lucroUnitario;
      if (custo < 0) custo = row.precoMedio * 0.5;
    }

    const receitaTotal = row.pagamentosRecebidos;
    const custoTotal = (custo + frete) * row.unidadesVendidas;
    const lucroTotal = lucroUnitario * row.unidadesVendidas;
    const roi = custoTotal > 0 ? (lucroTotal / custoTotal) * 100 : 0;

    products.push({
      produto: row.produto,
      loja: row.loja,
      skuPrincipal: row.skuPrincipal,
      idAnuncio: row.idAnuncio,
      pedidosValidos: row.pedidosValidos,
      unidadesVendidas: row.unidadesVendidas,
      pagamentosRecebidos: row.pagamentosRecebidos,
      precoMedio: row.precoMedio,
      custo,
      lucroUnitario,
      margemReal,
      comissao,
      frete,
      receitaTotal,
      custoTotal,
      lucroTotal,
      roi,
    });
  }

  // Sort by receita desc
  products.sort((a, b) => b.receitaTotal - a.receitaTotal);

  const totalReceita = products.reduce((s, p) => s + p.receitaTotal, 0);
  const totalCusto = products.reduce((s, p) => s + p.custoTotal, 0);
  const totalLucro = products.reduce((s, p) => s + p.lucroTotal, 0);
  const totalPedidos = products.reduce((s, p) => s + p.pedidosValidos, 0);
  const totalUnidades = products.reduce((s, p) => s + p.unidadesVendidas, 0);
  const margemMediaGeral = totalReceita > 0 ? (totalLucro / totalReceita) * 100 : 0;
  const ticketMedio = totalPedidos > 0 ? totalReceita / totalPedidos : 0;
  const roiMedio = totalCusto > 0 ? (totalLucro / totalCusto) * 100 : 0;

  // By loja
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

  // By SKU
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

  // Accumulated profit (sorted by receita)
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

  // Margin distribution
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
    totalCusto,
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
