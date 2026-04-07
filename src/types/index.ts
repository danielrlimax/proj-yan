// XLSX input types (from uploaded spreadsheet)
export interface XLSXRow {
  produto: string;
  loja: string;
  skuPrincipal: string;
  idAnuncio: string;
  pedidosValidos: number;
  unidadesVendidas: number;
  pagamentosRecebidos: number;
  precoMedio: number;
}

// CSV cost table types (from Google Sheets)
export interface CSVRow {
  produto: string;          // col F - Produto
  margemAlvo: number;       // col G - Margem (target)
  precoVenda: number;       // col H - Preço de venda
  precoRealPromo: number;   // col I - Preço real/Promo
  difPreco: number;         // col J - Dif. Preço
  margemReal: number;       // col K - Margem real
  mkt: string;              // col L - MKT
  comissao: number;         // col M - Comissão %
  frete: number;            // col N - Frete + custo fixo
  custo: number;            // col O - Custo
  lucroUnitario: number;    // col P - lucro
}

// Matched product with full data
export interface ProductData {
  produto: string;
  loja: string;
  skuPrincipal: string;
  idAnuncio: string;
  pedidosValidos: number;
  unidadesVendidas: number;
  pagamentosRecebidos: number;
  precoMedio: number;
  // from CSV (matched by SKU / product name)
  custo: number;
  lucroUnitario: number;
  margemReal: number;
  comissao: number;
  frete: number;
  // computed
  receitaTotal: number;
  custoTotal: number;
  lucroTotal: number;
  roi: number;
}

export interface DashboardMetrics {
  totalReceita: number;
  totalCusto: number;
  totalLucro: number;
  totalPedidos: number;
  totalUnidades: number;
  margemMediaGeral: number;
  ticketMedio: number;
  roiMedio: number;
  topProdutos: ProductData[];
  porLoja: LojaMetric[];
  porSKU: SKUMetric[];
  lucroAcumulado: { index: number; label: string; lucro: number; receita: number }[];
  distribuicaoMargem: { faixa: string; count: number }[];
  produtos: ProductData[];
}

export interface LojaMetric {
  loja: string;
  receita: number;
  lucro: number;
  pedidos: number;
  unidades: number;
  margem: number;
}

export interface SKUMetric {
  sku: string;
  produto: string;
  receita: number;
  lucro: number;
  unidades: number;
  margem: number;
}
