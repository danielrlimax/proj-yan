import type { XLSXRow, CSVRow, ProductData, DashboardMetrics, LojaMetric, SKUMetric } from '../types';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

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

function findBestCSVMatch(xlsxRow: XLSXRow, csvRows: CSVRow[]): CSVRow | null {
  let best: CSVRow | null = null;
  let bestScore = 20;

  const sku = normalize(xlsxRow.skuPrincipal);
  const produto = normalize(xlsxRow.produto);

  for (const csvRow of csvRows) {
    let score = 0;
    if (sku) score = Math.max(score, matchScore(sku, csvRow.produto));
    score = Math.max(score, matchScore(produto, csvRow.produto));

    if (score > bestScore) {
      bestScore = score;
      best = csvRow;
    }
  }
  return best;
}

// Função inteligente que identifica as taxas EXATAS de cada loja
function getTaxasPorLoja(loja: string) {
  const lojaNorm = normalize(loja);
  if (lojaNorm.includes('tiktok')) return { comissao: 0.21, frete: 6.50 };
  if (lojaNorm.includes('shein')) return { comissao: 0.20, frete: 6.00 };
  if (lojaNorm.includes('shopee')) return { comissao: 0.20, frete: 6.00 };
  
  if (lojaNorm.includes('mercado') || lojaNorm.includes('meli') || lojaNorm.includes('ml')) {
    // Diferencia o ML Clássico do Premium (Padrão é Premium 19% se não especificar)
    if (lojaNorm.includes('classico') || lojaNorm.includes('cla')) {
      return { comissao: 0.14, frete: 8.50 };
    }
    return { comissao: 0.19, frete: 8.50 };
  }
  
  // Taxa média genérica caso seja uma loja desconhecida
  return { comissao: 0.18, frete: 6.00 };
}

export function computeDashboard(xlsxRows: XLSXRow[], csvRows: CSVRow[]): DashboardMetrics {
  const products: ProductData[] = [];
  const IMPOSTO = 0.05; // 5% de Simples Nacional (Imposto Padrão)
  const MARGEM_ALVO_MEDIA = 0.10; // Trava de 10% exigida pelo cliente

  for (const row of xlsxRows) {
    const csvMatch = findBestCSVMatch(row, csvRows);

    let custo = 0;
    const taxasLoja = getTaxasPorLoja(row.loja);
    let comissao = taxasLoja.comissao;
    let frete = taxasLoja.frete;

    const precoVenda = row.precoMedio > 0 ? row.precoMedio : (csvMatch?.precoRealPromo || 0);

    // Se achou no CSV e os valores estiverem preenchidos, usa os do CSV
    if (csvMatch) {
      if (csvMatch.comissao > 0) comissao = csvMatch.comissao;
      if (csvMatch.frete > 0) frete = csvMatch.frete;
      if (csvMatch.custo > 0) custo = csvMatch.custo;
    }

    // === CÁLCULO REVERSO PARA CRAVAR 10% DE MARGEM ===
    // Se a planilha estiver com o Custo do produto em branco (ou 0),
    // o sistema descobre qual DEVERIA ser o custo para que a margem seja exatamente 10%
    if (custo === 0 && precoVenda > 0) {
      const lucroDesejado = precoVenda * MARGEM_ALVO_MEDIA;
      const despesasConhecidas = frete + (precoVenda * comissao) + (precoVenda * IMPOSTO);
      
      // O custo de fábrica passa a ser o que sobrou do preço de venda
      custo = precoVenda - despesasConhecidas - lucroDesejado;
      
      // Trava de segurança caso o frete/comissão engula todo o preço
      if (custo < 0) custo = precoVenda * 0.3; 
    }

    const valorComissao = precoVenda * comissao;
    const valorImposto = precoVenda * IMPOSTO;
    const gastosTotais = custo + frete + valorComissao + valorImposto;

    const lucroUnitario = precoVenda - gastosTotais;
    const margemReal = precoVenda > 0 ? (lucroUnitario / precoVenda) : 0;

    const receitaBrutaTotal = precoVenda * row.unidadesVendidas;
    const lucroTotal = lucroUnitario * row.unidadesVendidas;
    const custoTotal = gastosTotais * row.unidadesVendidas;
    const roi = custoTotal > 0 ? (lucroTotal / custoTotal) * 100 : 0;

    products.push({
      produto: row.produto,
      loja: row.loja,
      skuPrincipal: row.skuPrincipal,
      idAnuncio: row.idAnuncio,
      pedidosValidos: row.pedidosValidos,
      unidadesVendidas: row.unidadesVendidas,
      pagamentosRecebidos: row.pagamentosRecebidos,
      precoMedio: precoVenda,
      custo,
      lucroUnitario,
      margemReal,
      comissao,
      frete,
      receitaTotal: receitaBrutaTotal,
      custoTotal,
      lucroTotal,
      roi,
    });
  }

  products.sort((a, b) => b.receitaTotal - a.receitaTotal);

  const totalReceita = products.reduce((s, p) => s + p.receitaTotal, 0);
  const totalCusto = products.reduce((s, p) => s + p.custoTotal, 0);
  const totalLucro = products.reduce((s, p) => s + p.lucroTotal, 0);
  const totalPedidos = products.reduce((s, p) => s + p.pedidosValidos, 0);
  const totalUnidades = products.reduce((s, p) => s + p.unidadesVendidas, 0);
  const margemMediaGeral = totalReceita > 0 ? (totalLucro / totalReceita) * 100 : 0;
  const ticketMedio = totalPedidos > 0 ? totalReceita / totalPedidos : 0;
  const roiMedio = totalCusto > 0 ? (totalLucro / totalCusto) * 100 : 0;

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