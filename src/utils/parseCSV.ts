import Papa from 'papaparse';
import type { CSVRow } from '../types';

// NOVO LINK ATUALIZADO
const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTRAvoDqn3ZCG2VltNonw3yIL80nYdtkBvNYalFdUey0B2fyVf26_6_Mxd9CLkrPK3g1EtszJAsZ7rF/pub?output=csv';

function parseBRL(val: unknown): number {
  if (!val) return 0;
  const s = String(val)
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace('.', '')
    .replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parsePercent(val: unknown): number {
  if (!val) return 0;
  const s = String(val).replace('%', '').replace(',', '.').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n / 100;
}

export async function fetchCSVData(): Promise<CSVRow[]> {
  const response = await fetch(CSV_URL);
  if (!response.ok) throw new Error('Falha ao buscar CSV: ' + response.statusText);
  const text = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(text, {
      header: false,
      skipEmptyLines: false,
      complete: (results) => {
        const rows = results.data as string[][];
        const csvRows: CSVRow[] = [];

        // ATENÇÃO: Confirme se as colunas do novo CSV batem com estes índices (A=0, B=1...)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const produto = (row[5] ?? '').trim();
          if (!produto) continue;

          // Os índices abaixo precisam refletir a estrutura exata do novo link.
          const custoStr = (row[14] ?? '').trim(); // Coluna O = Custo base do produto
          const lucroStr = (row[15] ?? '').trim(); 
          const margemRealStr = (row[10] ?? '').trim();
          const comissaoStr = (row[12] ?? row[1] ?? '').trim();
          const freteStr = (row[13] ?? row[2] ?? '').trim();
          const precoVendaStr = (row[7] ?? '').trim();
          const precoRealStr = (row[8] ?? '').trim();
          const margemAlvoStr = (row[6] ?? '').trim();
          const difPrecoStr = (row[9] ?? '').trim();

          csvRows.push({
            produto,
            margemAlvo: parsePercent(margemAlvoStr),
            precoVenda: parseBRL(precoVendaStr),
            precoRealPromo: parseBRL(precoRealStr),
            difPreco: parseBRL(difPrecoStr),
            margemReal: parsePercent(margemRealStr),
            mkt: (row[11] ?? row[0] ?? '').trim(),
            comissao: parsePercent(comissaoStr),
            frete: parseBRL(freteStr),
            custo: parseBRL(custoStr),
            lucroUnitario: parseBRL(lucroStr), // Mantido por compatibilidade, mas o cálculo final será refeito dinamicamente
          });
        }

        resolve(csvRows);
      },
      error: reject,
    });
  });
}