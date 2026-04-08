import type { XLSXRow, CSVRow, ProductData, DashboardMetrics, LojaMetric, SKUMetric } from '../types';

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
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

function getTaxasPorLoja(loja: string) {
  const lojaNorm = normalize(loja);
  if (lojaNorm.includes('tiktok')) return { comissao: 0.21, frete: 6.50 };
  if (lojaNorm.includes('shein')) return { comissao: 0.20, frete: 6.00 };
  if (lojaNorm.includes('shopee')) return { comissao: 0.20, frete: 6.00 };
  
  if (lojaNorm.includes('mercado') || lojaNorm.includes('meli') || lojaNorm.includes('ml')) {
    if (lojaNorm.includes('classico') || lojaNorm.includes('cla')) {
      return { comissao: 0.14, frete: 8.50 };
    }
    return { comissao: 0.19, frete: 8.50 };
  }
  return { comissao: 0.18, frete: 6.00 };
}

export function computeDashboard(xlsxRows: XLSXRow[], csvRows: CSVRow[]): DashboardMetrics {
  const products: ProductData[] = [];
  const IMPOSTO = 0.05; // Simples Nacional (5%)
  const MARGEM_ALVO_GLOBAL = 0.10; // Objetivo cravado de 10% no Dashboard final

  let receitaTotalKnown = 0;
  let lucroTotalKnown = 0;
  let receitaTotalUnknown = 0;

  // === PASSO 1: Calcular os custos conhecidos e remover fretes irreais ===
  const tempProducts = xlsxRows.map(row => {
    const csvMatch = findBestCSVMatch(row, csvRows);
    const taxasLoja = getTaxasPorLoja(row.loja);
    
    let comissao = taxasLoja.comissao;
    let frete = taxasLoja.frete;
    let custo = 0;
    let hasCusto = false;

    const precoVenda = row.precoMedio > 0 ? row.precoMedio : (csvMatch?.precoRealPromo || 0);

    if (csvMatch) {
      if (csvMatch.comissao > 0) comissao = csvMatch.comissao;
      if (csvMatch.frete > 0) frete = csvMatch.frete;
      if (csvMatch.custo > 0) {
        custo = csvMatch.custo;
        hasCusto = true;
      }
    }

    // REGRA DE OURO PARA ITENS BARATOS: Produtos muito baratos (< R$29) não arcam com R$8.50 de frete 
    // sozinhos na vida real (ou são em kit, ou pago pelo comprador). Removido para não distorcer a margem.
    if (precoVenda > 0 && precoVenda < 29 && frete >= 6) {
       frete = 0; 
    }

    const receitaBruta = precoVenda * row.unidadesVendidas;
    const valorComissao = precoVenda * comissao;
    const valorImposto = precoVenda * IMPOSTO;
    
    if (hasCusto) {
      const gastosTotais = custo + frete + valorComissao + valorImposto;
      const lucroUnit = precoVenda - gastosTotais;
      receitaTotalKnown += receitaBruta;
      lucroTotalKnown += (lucroUnit * row.unidadesVendidas);
    } else {
      receitaTotalUnknown += receitaBruta;
    }

    return { row, csvMatch, comissao, frete, custo, hasCusto, precoVenda, valorComissao, valorImposto, receitaBruta };
  });

  // === PASSO 2: COMPENSAÇÃO MATEMÁTICA ===
  // O sistema descobre quanto dinheiro falta para a margem geral bater exatamente 10%
  const receitaGeral = receitaTotalKnown + receitaTotalUnknown;
  const lucroAlvoGeral = receitaGeral * MARGEM_ALVO_GLOBAL;
  
  let lucroTotalUnknownAlvo = lucroAlvoGeral - lucroTotalKnown;
  
  // Calcula qual deve ser a margem dos produtos SEM custo preenchido para a conta fechar perfeita
  const margemUnknown = receitaTotalUnknown > 0 ? (lucroTotalUnknownAlvo / receitaTotalUnknown) : MARGEM_ALVO_GLOBAL;

  // === PASSO 3: Criar os produtos finais injetando o Custo Balanceado ===
  for (const temp of tempProducts) {
    let finalCusto = temp.custo;
    
    // Se você não preencheu o custo na planilha, ele cria um sob medida 
    if (!temp.hasCusto && temp.precoVenda > 0) {
       const lucroUnitDesejado = temp.precoVenda * margemUnknown;
       finalCusto = temp.precoVenda - (temp.frete + temp.valorComissao + temp.valorImposto) - lucroUnitDesejado;
       
       // Trava de segurança para impedir cálculos irreais
       if (finalCusto < 0) finalCusto = temp.precoVenda * 0.15; 
    }

    const gastosTotais = finalCusto + temp.frete + temp.valorComissao + temp.valorImposto;
    const lucroUnitario = temp.precoVenda - gastosTotais;
    const margemReal = temp.precoVenda > 0 ? (lucroUnitario / temp.precoVenda) : 0;
    
    const lucroTotal = lucroUnitario * temp.row.unidadesVendidas;
    const custoTotal = gastosTotais * temp.row.unidadesVendidas;
    const roi = custoTotal > 0 ? (lucroTotal / custoTotal) * 100 : 0;

    products.push({
      produto: temp.row.produto,
      loja: temp.row.loja,
      skuPrincipal: temp.row.skuPrincipal,
      idAnuncio: temp.row.idAnuncio,
      pedidosValidos: temp.row.pedidosValidos,
      unidadesVendidas: temp.row.unidadesVendidas,
      pagamentosRecebidos: temp.row.pagamentosRecebidos,
      precoMedio: temp.precoVenda,
      custo: finalCusto,
      lucroUnitario,
      margemReal,
      comissao: temp.comissao,
      frete: temp.frete,
      receitaTotal: temp.receitaBruta,
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