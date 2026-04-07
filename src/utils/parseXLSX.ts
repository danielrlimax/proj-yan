import * as XLSX from 'xlsx';
import type { XLSXRow } from '../types';

function parseNumber(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const s = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export async function parseXLSXFile(file: File): Promise<XLSXRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
        });

        // Find header row (looking for "Produtos" or similar)
        let headerIdx = 0;
        for (let i = 0; i < Math.min(5, rows.length); i++) {
          const row = rows[i] as string[];
          const joined = row.join(' ').toLowerCase();
          if (joined.includes('produto') || joined.includes('loja') || joined.includes('pedido')) {
            headerIdx = i;
            break;
          }
        }

        const dataRows = rows.slice(headerIdx + 1);
        const result: XLSXRow[] = [];

        for (const row of dataRows as unknown[][]) {
          const r = row as unknown[];
          const produto = String(r[0] ?? '').trim();
          if (!produto) continue;

          result.push({
            produto,
            loja: String(r[1] ?? '').trim(),
            skuPrincipal: String(r[2] ?? '').trim(),
            idAnuncio: String(r[3] ?? '').trim(),
            pedidosValidos: parseNumber(r[4]),
            unidadesVendidas: parseNumber(r[5]),
            pagamentosRecebidos: parseNumber(r[6]),
            precoMedio: parseNumber(r[7]),
          });
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
