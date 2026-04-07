import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend
} from 'recharts';
import type { DashboardMetrics, ProductData } from '../types';
import MetricCard from './MetricCard';
import { formatBRL, formatPercent, formatNumber, shortLabel } from '../utils/format';

interface DashboardProps {
  metrics: DashboardMetrics;
  onReset: () => void;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
const LOJA_COLORS: Record<string, string> = {
  'SHEIN': '#10b981',
  'Shopee': '#f59e0b',
  'Mercado Livre': '#3b82f6',
  'Meli': '#3b82f6',
  'TikTok': '#ec4899',
  'Tik Tok': '#ec4899',
};

function getLojaColor(loja: string, idx: number): string {
  for (const [key, color] of Object.entries(LOJA_COLORS)) {
    if (loja.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return COLORS[idx % COLORS.length];
}

const CustomTooltipBRL = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="text-gray-300 text-xs mb-2 font-medium">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-gray-400">{entry.name}:</span>
            <span className="text-white font-semibold">{formatBRL(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomTooltipPct = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="text-gray-300 text-xs mb-2 font-medium">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-gray-400">{entry.name}:</span>
            <span className="text-white font-semibold">{formatPercent(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const TAB_OPTIONS = ['Visão Geral', 'Por Loja', 'Por Produto', 'Tabela Completa'] as const;
type Tab = typeof TAB_OPTIONS[number];

export default function Dashboard({ metrics, onReset }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Visão Geral');

  const lojaChartData = metrics.porLoja.map((l, i) => ({
    name: l.loja.length > 16 ? l.loja.substring(0, 16) + '…' : l.loja,
    Receita: l.receita,
    Lucro: l.lucro,
    Margem: l.margem,
    fill: getLojaColor(l.loja, i),
  }));

  const skuChartData = metrics.porSKU.slice(0, 10).map((s) => ({
    name: shortLabel(s.sku || s.produto, 18),
    Receita: s.receita,
    Lucro: s.lucro,
    Margem: s.margem,
  }));

  const pieData = metrics.porLoja.map((l, i) => ({
    name: l.loja,
    value: l.receita,
    color: getLojaColor(l.loja, i),
  }));

  const margemData = metrics.distribuicaoMargem;

  const icons = {
    receita: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-full h-full">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    lucro: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-full h-full">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
      </svg>
    ),
    margem: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-full h-full">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    pedidos: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-full h-full">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
    unidades: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-full h-full">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    ticket: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-full h-full">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
      </svg>
    ),
    roi: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-full h-full">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
      </svg>
    ),
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Bar */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-tight">Dashboard Financeiro</h1>
              <p className="text-gray-500 text-xs">{metrics.produtos.length} produtos analisados</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-xs font-medium">Dados carregados</span>
            </div>
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-gray-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Nova Planilha
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-900 border border-gray-800 rounded-xl w-fit mb-8">
          {TAB_OPTIONS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                activeTab === tab
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* === VISÃO GERAL === */}
        {activeTab === 'Visão Geral' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              <MetricCard
                title="Receita Total"
                value={formatBRL(metrics.totalReceita)}
                icon={icons.receita}
                color="emerald"
              />
              <MetricCard
                title="Lucro Total"
                value={formatBRL(metrics.totalLucro)}
                icon={icons.lucro}
                color="blue"
              />
              <MetricCard
                title="Custo Total"
                value={formatBRL(metrics.totalCusto)}
                icon={icons.roi}
                color="rose"
              />
              <MetricCard
                title="Margem Média"
                value={formatPercent(metrics.margemMediaGeral)}
                icon={icons.margem}
                color="violet"
              />
              <MetricCard
                title="Pedidos Válidos"
                value={formatNumber(metrics.totalPedidos)}
                icon={icons.pedidos}
                color="amber"
              />
              <MetricCard
                title="Unidades Vendidas"
                value={formatNumber(metrics.totalUnidades)}
                icon={icons.unidades}
                color="cyan"
              />
              <MetricCard
                title="Ticket Médio"
                value={formatBRL(metrics.ticketMedio)}
                icon={icons.ticket}
                color="emerald"
              />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Receita vs Lucro por Loja */}
              <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-1">Receita × Lucro por Loja</h3>
                <p className="text-gray-500 text-xs mb-5">Comparativo financeiro por canal de venda</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={lojaChartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltipBRL />} />
                    <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                    <Bar dataKey="Receita" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Lucro" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Receita por canal - Pie */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-1">Receita por Canal</h3>
                <p className="text-gray-500 text-xs mb-5">Participação percentual</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" stroke="none">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => [formatBRL(Number(val)), 'Receita']}
                      contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                      labelStyle={{ color: '#e5e7eb' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span className="text-gray-400 text-xs truncate max-w-[120px]">{d.name}</span>
                      </div>
                      <span className="text-white text-xs font-semibold">
                        {metrics.totalReceita > 0 ? formatPercent((d.value / metrics.totalReceita) * 100) : '0%'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lucro acumulado */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-1">Lucro Acumulado</h3>
                <p className="text-gray-500 text-xs mb-5">Evolução cumulativa por produto (ordenado por receita)</p>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={metrics.lucroAcumulado}>
                    <defs>
                      <linearGradient id="lucroGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="index" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(val: unknown) => [formatBRL(Number(val)), 'Lucro Acumulado']}
                      contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                      labelStyle={{ color: '#e5e7eb' }}
                    />
                    <Area type="monotone" dataKey="lucro" stroke="#10b981" strokeWidth={2} fill="url(#lucroGrad)" name="Lucro Acumulado" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Distribuição de Margem */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-1">Distribuição de Margem</h3>
                <p className="text-gray-500 text-xs mb-5">Quantidade de produtos por faixa de margem real</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={margemData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="faixa" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={(val: unknown) => [String(val) + ' produtos', 'Quantidade']}
                      contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                      labelStyle={{ color: '#e5e7eb' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                      {margemData.map((_, i) => (
                        <Cell key={i} fill={['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'][i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top 10 produtos */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-1">Top 10 Produtos por Receita</h3>
              <p className="text-gray-500 text-xs mb-5">Produtos com maior faturamento</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.topProdutos.map((p) => ({
                  name: shortLabel(p.skuPrincipal || p.produto, 20),
                  Receita: p.receitaTotal,
                  Lucro: p.lucroTotal,
                }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
                  <Tooltip content={<CustomTooltipBRL />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Bar dataKey="Receita" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={16} />
                  <Bar dataKey="Lucro" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* === POR LOJA === */}
        {activeTab === 'Por Loja' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {metrics.porLoja.map((loja, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full" style={{ background: getLojaColor(loja.loja, i) }} />
                      <h3 className="text-white font-semibold text-sm">{loja.loja}</h3>
                    </div>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{
                        background: `${getLojaColor(loja.loja, i)}20`,
                        color: getLojaColor(loja.loja, i),
                      }}
                    >
                      {formatPercent(loja.margem)} margem
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800 rounded-xl p-3">
                      <p className="text-gray-500 text-xs mb-1">Receita</p>
                      <p className="text-white font-bold text-sm">{formatBRL(loja.receita)}</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-3">
                      <p className="text-gray-500 text-xs mb-1">Lucro</p>
                      <p className="text-blue-400 font-bold text-sm">{formatBRL(loja.lucro)}</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-3">
                      <p className="text-gray-500 text-xs mb-1">Pedidos</p>
                      <p className="text-white font-bold text-sm">{formatNumber(loja.pedidos)}</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-3">
                      <p className="text-gray-500 text-xs mb-1">Unidades</p>
                      <p className="text-white font-bold text-sm">{formatNumber(loja.unidades)}</p>
                    </div>
                  </div>
                  {/* Mini progress */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>Participação na Receita</span>
                      <span>{metrics.totalReceita > 0 ? formatPercent((loja.receita / metrics.totalReceita) * 100) : '0%'}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: metrics.totalReceita > 0 ? `${(loja.receita / metrics.totalReceita) * 100}%` : '0%',
                          background: getLojaColor(loja.loja, i),
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Margem por loja chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-1">Margem por Canal de Venda</h3>
              <p className="text-gray-500 text-xs mb-5">Comparativo de margem real por loja</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={lojaChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                  <Tooltip content={<CustomTooltipPct />} />
                  <Bar dataKey="Margem" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {lojaChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* === POR PRODUTO === */}
        {activeTab === 'Por Produto' && (
          <div className="space-y-6">
            {/* SKU performance chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-1">Top 10 SKUs — Receita e Lucro</h3>
              <p className="text-gray-500 text-xs mb-5">Agrupado por SKU Principal</p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={skuChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={150} />
                  <Tooltip content={<CustomTooltipBRL />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Bar dataKey="Receita" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={14} />
                  <Bar dataKey="Lucro" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* SKU margem */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-1">Margem por SKU</h3>
              <p className="text-gray-500 text-xs mb-5">Rentabilidade individual por produto agrupado</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={skuChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                  <Tooltip content={<CustomTooltipPct />} />
                  <Line type="monotone" dataKey="Margem" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* SKU cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {metrics.porSKU.map((sku, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-white text-sm font-semibold leading-tight line-clamp-2">{sku.sku || sku.produto}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-lg flex-shrink-0 ${
                      sku.margem >= 15 ? 'bg-emerald-500/15 text-emerald-400' :
                      sku.margem >= 10 ? 'bg-blue-500/15 text-blue-400' :
                      sku.margem >= 5 ? 'bg-amber-500/15 text-amber-400' :
                      'bg-rose-500/15 text-rose-400'
                    }`}>
                      {formatPercent(sku.margem)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Receita</span>
                      <span className="text-white font-medium">{formatBRL(sku.receita)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Lucro</span>
                      <span className="text-emerald-400 font-medium">{formatBRL(sku.lucro)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Unidades</span>
                      <span className="text-white font-medium">{formatNumber(sku.unidades)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === TABELA COMPLETA === */}
        {activeTab === 'Tabela Completa' && (
          <FullTable products={metrics.produtos} />
        )}
      </main>
    </div>
  );
}

function FullTable({ products }: { products: ProductData[] }) {
  const [sortKey, setSortKey] = useState<keyof ProductData>('receitaTotal');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');

  const handleSort = (key: keyof ProductData) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filtered = products
    .filter(p =>
      search === '' ||
      p.produto.toLowerCase().includes(search.toLowerCase()) ||
      p.loja.toLowerCase().includes(search.toLowerCase()) ||
      p.skuPrincipal.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === 'asc' ? av - bv : bv - av;
    });

  const SortIcon = ({ k }: { k: keyof ProductData }) => (
    <span className={`ml-1 text-xs ${sortKey === k ? 'text-emerald-400' : 'text-gray-600'}`}>
      {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  const cols: { key: keyof ProductData; label: string; format: (v: ProductData) => string }[] = [
    { key: 'produto', label: 'Produto', format: (p) => shortLabel(p.produto, 30) },
    { key: 'loja', label: 'Loja', format: (p) => p.loja },
    { key: 'skuPrincipal', label: 'SKU', format: (p) => p.skuPrincipal || '—' },
    { key: 'pedidosValidos', label: 'Pedidos', format: (p) => formatNumber(p.pedidosValidos) },
    { key: 'unidadesVendidas', label: 'Unidades', format: (p) => formatNumber(p.unidadesVendidas) },
    { key: 'precoMedio', label: 'Preço Médio', format: (p) => formatBRL(p.precoMedio) },
    { key: 'receitaTotal', label: 'Receita', format: (p) => formatBRL(p.receitaTotal) },
    { key: 'custoTotal', label: 'Custo Total', format: (p) => formatBRL(p.custoTotal) },
    { key: 'lucroTotal', label: 'Lucro', format: (p) => formatBRL(p.lucroTotal) },
    { key: 'margemReal', label: 'Margem', format: (p) => formatPercent(p.margemReal * 100) },
    { key: 'roi', label: 'ROI', format: (p) => formatPercent(p.roi) },
  ];

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar produto, loja ou SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <span className="text-gray-500 text-sm">{filtered.length} produto{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                {cols.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white select-none whitespace-nowrap"
                  >
                    {col.label} <SortIcon k={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((p, i) => (
                <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                  {cols.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 whitespace-nowrap ${
                        col.key === 'produto' ? 'text-white font-medium' :
                        col.key === 'lucroTotal' ? 'text-emerald-400 font-semibold' :
                        col.key === 'receitaTotal' ? 'text-blue-400 font-semibold' :
                        col.key === 'margemReal' ? (
                          p.margemReal * 100 >= 15 ? 'text-emerald-400' :
                          p.margemReal * 100 >= 10 ? 'text-amber-400' : 'text-rose-400'
                        ) :
                        col.key === 'roi' ? (
                          p.roi >= 20 ? 'text-emerald-400' :
                          p.roi >= 10 ? 'text-amber-400' : 'text-gray-400'
                        ) :
                        'text-gray-300'
                      }`}
                    >
                      {col.format(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              Nenhum produto encontrado para "{search}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
