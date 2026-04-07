import { useState, useCallback } from 'react';
import UploadScreen from './components/UploadScreen';
import Dashboard from './components/Dashboard';
import { parseXLSXFile } from './utils/parseXLSX';
import { fetchCSVData } from './utils/parseCSV';
import { computeDashboard } from './utils/calculations';
import type { DashboardMetrics } from './types';

type AppState = 'upload' | 'loading' | 'dashboard' | 'error';

export default function App() {
  const [state, setState] = useState<AppState>('upload');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(async (file: File) => {
    setState('loading');
    setError(null);

    try {
      // Parse XLSX and fetch CSV concurrently
      const [xlsxRows, csvRows] = await Promise.all([
        parseXLSXFile(file),
        fetchCSVData(),
      ]);

      if (xlsxRows.length === 0) {
        throw new Error('Nenhum dado encontrado na planilha. Verifique o formato do arquivo.');
      }

      const computed = computeDashboard(xlsxRows, csvRows);
      setMetrics(computed);
      setState('dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido ao processar dados.';
      setError(msg);
      setState('upload');
    }
  }, []);

  const handleReset = useCallback(() => {
    setMetrics(null);
    setError(null);
    setState('upload');
  }, []);

  if (state === 'dashboard' && metrics) {
    return <Dashboard metrics={metrics} onReset={handleReset} />;
  }

  return (
    <UploadScreen
      onUpload={handleUpload}
      loading={state === 'loading'}
      error={error}
    />
  );
}
