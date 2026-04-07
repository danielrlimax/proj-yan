import Papa from 'papaparse';
import type { CSVRow } from '../types';

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQOKJdC-S3fLFW6t2E1CRKABogN-2dwhW7bQpyFldS-3uUf3oUnDsu6PNBbyyT8lsttYqJwNHgxLTSI/pub?gid=1183835234&single=true&output=csv';

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

        // CSV columns (0-indexed):
        // A=0: MKT, B=1: Comissão, C=2: Frete
        // F=5: Produto, G=6: Margem, H=7: Preço venda, I=8: Preço real/Promo
        // J=9: Dif Preço, K=10: Margem real, L=11: MKT, M=12: Comissão, N=13: Frete+custo fixo
        // O=14: Custo, P=15: lucro

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const produto = (row[5] ?? '').trim();
          if (!produto) continue;

          const lucroStr = (row[15] ?? '').trim();
          const custoStr = (row[14] ?? '').trim();
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
            lucroUnitario: parseBRL(lucroStr),
          });
        }

        resolve(csvRows);
      },
      error: reject,
    });
  });
}
