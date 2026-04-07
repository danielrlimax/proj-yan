let chartLucroInstance = null;
let chartVendasInstance = null;

const formatMoney = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPct = (val) => (val * 100).toFixed(2) + '%';

export function updateKPIs(data) {
    const totalLucro = data.reduce((acc, item) => acc + item.lucroTotal, 0);
    const totalReceita = data.reduce((acc, item) => acc + item.receitaTotal, 0);
    const totalUnidades = data.reduce((acc, item) => acc + item.unidadesTotal, 0);
    const margemMedia = totalReceita > 0 ? (totalLucro / totalReceita) : 0;

    document.getElementById('kpiLucroTotal').innerText = formatMoney(totalLucro);
    document.getElementById('kpiReceita').innerText = formatMoney(totalReceita);
    document.getElementById('kpiUnidades').innerText = totalUnidades.toLocaleString('pt-BR');
    document.getElementById('kpiMargem').innerText = formatPct(margemMedia);
}

export function updateTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${row.nomeAgrupado}</strong></td>
            <td>${row.anunciosContagem}</td>
            <td>${row.unidadesTotal}</td>
            <td>${formatMoney(row.receitaTotal)}</td>
            <td>${formatMoney(row.custoUnitarioReferencia)}</td>
            <td class="text-profit">${formatMoney(row.lucroTotal)}</td>
            <td>${formatPct(row.margemMedia)}</td>
        `;
        tbody.appendChild(tr);
    });
}

export function renderCharts(data) {
    const top10 = data.slice(0, 10);
    const labels = top10.map(d => d.nomeAgrupado.substring(0, 20) + '...');
    const lucros = top10.map(d => d.lucroTotal);
    const unidades = top10.map(d => d.unidadesTotal);

    const ctxLucro = document.getElementById('chartLucro').getContext('2d');
    if(chartLucroInstance) chartLucroInstance.destroy();
    chartLucroInstance = new Chart(ctxLucro, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'Lucro Líquido (R$)', data: lucros, backgroundColor: '#38bdf8', borderRadius: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, color: '#fff' }
    });

    const ctxVendas = document.getElementById('chartVendas').getContext('2d');
    if(chartVendasInstance) chartVendasInstance.destroy();
    chartVendasInstance = new Chart(ctxVendas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: unidades, backgroundColor: ['#38bdf8', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#fff' } } } }
    });
}