import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card, Select, Table, Badge, Input, cn } from '../components/ui';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/feedback';
import {
  FileDown,
  Table as TableIcon,
  Printer,
  Search,
  AlertCircle
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { formatShortDate, calcularPorcentagemFaltas, isCritico, getSituacao } from '../utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const Relatorios: React.FC = () => {
  const turmas = useLiveQuery(() => db.turmas.toArray());
  const alunos = useLiveQuery(() => db.alunos.toArray());
  const { addToast } = useUIStore();

  const [reportType, setReportType] = useState<'turma' | 'aluno'>('turma');
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>('');
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const filteredAlunos = useMemo(() => {
    if (!alunos || !selectedTurmaId) return [];
    return alunos.filter(a => a.turmaId === parseInt(selectedTurmaId));
  }, [alunos, selectedTurmaId]);

  const reportData = useLiveQuery(async () => {
    try {
      if (reportType === 'turma') {
        if (!selectedTurmaId) return null;
        const turma = await db.turmas.get(parseInt(selectedTurmaId));
        if (!turma) return null;

        const chamadas = await db.chamadas
          .where('turmaId').equals(turma.id!)
          .filter(c => c.data >= startDate && c.data <= endDate)
          .toArray();

        const chamadasIds = chamadas.map(c => c.id!);
        const alunosTurma = await db.alunos.where('turmaId').equals(turma.id!).toArray();

        const results = [];
        for (const aluno of alunosTurma) {
          const regs = await db.registros
            .where('alunoId').equals(aluno.id!)
            .filter(r => chamadasIds.includes(r.chamadaId))
            .toArray();

          const presencas = regs.filter(r => r.status === 'P').length;
          const faltas = regs.filter(r => r.status === 'F').length;
          const justificadas = regs.filter(r => r.status === 'J').length;
          const totalFaltas = faltas + justificadas;
          const percFaltas = calcularPorcentagemFaltas(totalFaltas);
          const critico = isCritico(totalFaltas, turma.limiteFaltas);

          results.push({
            aluno,
            totalAulas: chamadas.length,
            presencas,
            faltas,
            justificadas,
            percFaltas,
            percPresenca: 100 - percFaltas,
            isCritico: critico
          });
        }
        return { type: 'turma' as const, turma, results };

      } else {
        if (!selectedAlunoId) return null;
        const aluno = await db.alunos.get(parseInt(selectedAlunoId));
        if (!aluno) return null;
        const turma = await db.turmas.get(aluno.turmaId);
        if (!turma) return null;

        const chamadas = await db.chamadas
          .where('turmaId').equals(aluno.turmaId)
          .filter(c => c.data >= startDate && c.data <= endDate)
          .toArray();

        const chamadasIds = chamadas.map(c => c.id!);
        const regs = await db.registros
          .where('alunoId').equals(aluno.id!)
          .filter(r => chamadasIds.includes(r.chamadaId))
          .toArray();

        const chamadasMap = new Map(chamadas.map(c => [c.id, c]));
        const results = regs
          .map(r => ({ ...r, data: chamadasMap.get(r.chamadaId)?.data || '' }))
          .sort((a, b) => b.data.localeCompare(a.data));

        const presencas = regs.filter(r => r.status === 'P').length;
        const faltas = regs.filter(r => r.status === 'F').length;
        const justificadas = regs.filter(r => r.status === 'J').length;

        return {
          type: 'aluno' as const,
          aluno,
          turma,
          results,
          stats: { presencas, faltas, justificadas, total: chamadas.length }
        };
      }
    } catch (err) {
      console.error('Error generating report data:', err);
      return null;
    }
  }, [reportType, selectedTurmaId, selectedAlunoId, startDate, endDate]);

  const exportPDF = () => {
    if (!reportData) return;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('Digital Attendance - Report', 14, 22);
    doc.setFontSize(12);

    if (reportData.type === 'turma') {
      doc.text(`Class: ${reportData.turma.nome}`, 14, 32);
      doc.text(`Period: ${formatShortDate(startDate)} to ${formatShortDate(endDate)}`, 14, 38);

      autoTable(doc, {
        startY: 45,
        head: [['Name', 'ID Number', 'Classes', 'P', 'F', 'J', '% Absences', 'Status']],
        body: reportData.results.map(r => [
          r.aluno.nome,
          r.aluno.matricula || '—',
          r.totalAulas.toString(),
          r.presencas.toString(),
          r.faltas.toString(),
          r.justificadas.toString(),
          `${calcularPorcentagemFaltas(r.faltas + r.justificadas)}%`,
          getSituacao(r.faltas + r.justificadas, reportData.turma.limiteFaltas)
        ]),
      });
    } else {
      doc.text(`Student: ${reportData.aluno.nome}`, 14, 32);
      doc.text(`Class: ${reportData.turma.nome}`, 14, 38);
      doc.text(`Período: ${formatShortDate(startDate)} até ${formatShortDate(endDate)}`, 14, 44);

      autoTable(doc, {
        startY: 50,
        head: [['Date', 'Status', 'Justification']],
        body: reportData.results.map(r => [
          formatShortDate(r.data),
          r.status,
          r.justificativa || '-'
        ]),
      });
    }

    doc.save(`report-${reportData.type}-${Date.now()}.pdf`);
    addToast('PDF exported successfully!');
  };

  const exportExcel = () => {
    if (!reportData) return;

    const data = reportData.type === 'turma'
      ? reportData.results.map(r => ({
          'Name': r.aluno.nome,
          'ID Number': r.aluno.matricula || '—',
          'Total Classes': r.totalAulas,
          'Attendance': r.presencas,
          'Absences': r.faltas,
          'Justified': r.justificadas,
          '% Absences': calcularPorcentagemFaltas(r.faltas + r.justificadas),
          'Status': getSituacao(r.faltas + r.justificadas, reportData.turma.limiteFaltas)
        }))
      : reportData.results.map(r => ({
          'Date': formatShortDate(r.data),
          'Status': r.status,
          'Justification': r.justificativa || '-'
        }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, `report-${reportData.type}-${Date.now()}.xlsx`);
    addToast('Excel exported successfully!');
  };

  const handlePrint = () => {
    if (!reportData) {
      addToast('No data to print. Select a class and period.', 'error');
      return;
    }

    // Monta cabeçalho do relatório
    const titulo =
      reportData.type === 'turma'
        ? `Class: ${reportData.turma.nome}`
        : `Student: ${reportData.aluno.nome}`;

    const periodo = `${formatShortDate(startDate)} to ${formatShortDate(endDate)}`;
    const dataGeracao = formatShortDate(new Date().toISOString().split('T')[0]); // Generated date

    // Monta linhas da tabela
    let cabecalho = '';
    let linhas = '';

    if (reportData.type === 'turma') {
      cabecalho = `
        <tr>
          <th>Name</th>
          <th>ID Number</th>
          <th>Classes</th>
          <th>Attendance</th>
          <th>Absences</th>
          <th>Justified</th>
          <th>% Absences</th>
          <th>Status</th>
        </tr>`;

      linhas = reportData.results.map(r => {
        const total = r.faltas + r.justificadas;
        const perc  = calcularPorcentagemFaltas(total);
        const sit   = getSituacao(total, reportData.turma.limiteFaltas);
        const crit  = isCritico(total, reportData.turma.limiteFaltas);
        return `
          <tr>
            <td>${r.aluno.nome}</td>
            <td class="mono">${r.aluno.matricula || '—'}</td>
            <td>${r.totalAulas}</td>
            <td class="p">${r.presencas}</td>
            <td class="f">${r.faltas}</td>
            <td class="j">${r.justificadas}</td>
            <td class="mono">${perc}%</td>
            <td><span class="badge ${crit ? 'bc' : 'br'}">${sit}</span></td>
          </tr>`;
      }).join('');

    } else {
      cabecalho = `
        <tr>
          <th>Date</th>
          <th>Status</th>
          <th>Justification</th>
        </tr>`;

      linhas = reportData.results.map(r => {
        const label = r.status === 'P' ? 'Present' : r.status === 'F' ? 'Absent' : 'Justified';
        const cls   = r.status === 'P' ? 'bp' : r.status === 'F' ? 'bf' : 'bj';
        return `
          <tr>
            <td class="mono">${formatShortDate(r.data)}</td>
            <td><span class="badge ${cls}">${label}</span></td>
            <td class="obs">${r.justificativa || '—'}</td>
          </tr>`;
      }).join('');
    }

    // HTML completo da janela de impressão — CSS isolado, sem Tailwind
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Relatório — Chamada Digital</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial, Helvetica, sans-serif;font-size:11pt;color:#1E1B18;background:#fff;padding:18mm 15mm}
    .topo{border-bottom:2px solid #1E3A5F;padding-bottom:10px;margin-bottom:18px}
    .topo h1{font-size:16pt;font-weight:700;color:#1E3A5F;margin-bottom:4px}
    .topo p{font-size:9pt;color:#7A7368}
    .topo p span{margin:0 5px;color:#B8B2A7}
    table{width:100%;border-collapse:collapse;font-size:10pt}
    thead tr{background:#1E3A5F;color:#fff}
    th{padding:7px 10px;text-align:left;font-size:8pt;font-weight:600;letter-spacing:.05em;text-transform:uppercase}
    td{padding:7px 10px;border-bottom:1px solid #E2DED6;vertical-align:middle}
    tr:last-child td{border-bottom:none}
    tr:nth-child(even) td{background:#F5F3EF}
    tr{page-break-inside:avoid}
    .mono{font-family:'Courier New',monospace;font-size:9pt;color:#7A7368}
    .obs{color:#7A7368;font-style:italic}
    .p{color:#2D6A4F;font-weight:700}
    .f{color:#A02020;font-weight:700}
    .j{color:#92600A;font-weight:700}
    .badge{display:inline-block;padding:2px 10px;border-radius:100px;font-size:9pt;font-weight:600;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .bp{background:#D8F0E6;color:#2D6A4F}
    .bf{background:#FAE0E0;color:#A02020}
    .bj{background:#FDF0D5;color:#92600A}
    .br{background:#D8F0E6;color:#2D6A4F}
    .bc{background:#FAE0E0;color:#A02020}
    .rodape{margin-top:20px;padding-top:8px;border-top:1px solid #E2DED6;font-size:8pt;color:#B8B2A7;text-align:right}
  </style>
</head>
<body>
  <div class="topo">
    <h1>Digital Attendance — Attendance Report</h1>
    <p>${titulo}<span>·</span>Period: ${periodo}<span>·</span>Generated: ${dataGeracao}</p>
  </div>
  <table>
    <thead>${cabecalho}</thead>
    <tbody>${linhas}</tbody>
  </table>
  <div class="rodape">Digital Attendance · Automatically generated report</div>
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`;

    // Abre a janela e imprime
    const janela = window.open('', '_blank', 'width=900,height=700');
    if (!janela) {
      addToast('Allow pop-ups for this site and try again.', 'error');
      return;
    }
    janela.document.write(html);
    janela.document.close();
  };

  return (
    <div className="space-y-8">

      {/* Title — hidden when printing */}
      <header className="no-print">
        <p className="text-gray-500 font-medium uppercase tracking-widest text-xs mb-1">
          Export
        </p>
        <h1 className="text-3xl font-display font-bold text-gray-900">Reports</h1>
      </header>

      {/*
        ✅ CRITICAL FIX:
        - Removed "no-print" from this parent div
        - Added "no-print" ONLY to the settings Card (col-span-1)
        - The print-area Card (col-span-2) now appears correctly when printing
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Settings Card — HIDDEN when printing */}
        <Card className="lg:col-span-1 space-y-6 no-print">
          <div className="space-y-4">
            <h3 className="text-lg font-display font-bold text-gray-900">Settings</h3>

            <div className="flex bg-gray-50 p-1 rounded-xl">
              <button
                onClick={() => setReportType('turma')}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
                  reportType === 'turma'
                    ? 'bg-white text-slate shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                By Class
              </button>
              <button
                onClick={() => setReportType('aluno')}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
                  reportType === 'aluno'
                    ? 'bg-white text-slate shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                By Student
              </button>
            </div>

            <Select
              label="Class"
              value={selectedTurmaId}
              onChange={e => { setSelectedTurmaId(e.target.value); setSelectedAlunoId(''); }}
            >
              <option value="" disabled>Select a class</option>
              {turmas?.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </Select>

            {reportType === 'aluno' && (
              <Select
                label="Student"
                value={selectedAlunoId}
                onChange={e => setSelectedAlunoId(e.target.value)}
                disabled={!selectedTurmaId}
              >
                <option value="" disabled>Select a student</option>
                {filteredAlunos.map(a => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </Select>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <Input
                label="End"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-50 space-y-3">
            <Button className="w-full gap-2" disabled={!reportData} onClick={exportPDF}>
              <FileDown className="w-5 h-5" />
              Export PDF
            </Button>
            <Button
              variant="secondary"
              className="w-full gap-2"
              disabled={!reportData}
              onClick={exportExcel}
            >
              <TableIcon className="w-5 h-5" />
              Export Excel
            </Button>
            <Button
              variant="ghost"
              className="w-full gap-2"
              disabled={!reportData}
              onClick={handlePrint}
            >
              <Printer className="w-5 h-5" />
              Print
            </Button>
          </div>
        </Card>

        {/* Report Card — VISIBLE when printing */}
        <Card className="lg:col-span-2 overflow-hidden print-area">
          {!reportData ? (
            <EmptyState
              icon={<Search className="w-12 h-12" />}
              title="Awaiting selection"
              description="Select the filters on the side to generate the report preview."
            />
          ) : (
            <div className="space-y-6">

              {/* Header visible ONLY when printing */}
              <div className="hidden print:block border-b border-gray-200 pb-4 mb-6">
                <h2 className="text-2xl font-display font-bold text-gray-900">
                  Digital Attendance — Attendance Report
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {reportData.type === 'turma'
                    ? `Class: ${reportData.turma.nome}`
                    : `Student: ${reportData.aluno.nome}`
                  } ·{' '}
                  Period: {formatShortDate(startDate)} to {formatShortDate(endDate)} ·{' '}
                  Generated: {formatShortDate(new Date().toISOString().split('T')[0])}
                </p>
              </div>

              {/* Preview title — hidden when printing (replaced by header above) */}
              <div className="flex items-center justify-between no-print">
                <h3 className="text-xl font-display font-bold text-gray-900">
                  Report Preview
                </h3>
                <Badge variant="info">
                  {reportData.type === 'turma'
                    ? `${reportData.results.length} Students`
                    : `${reportData.results.length} Records`
                  }
                </Badge>
              </div>

              {/* Table by class */}
              {reportData.type === 'turma' ? (
                <Table headers={['Name', 'ID Number', 'Classes', 'P', 'F', 'J', '% Absences', 'Status']}>
                  {reportData.results.map((r, i) => (
                    <tr key={i} className="text-sm border-b border-gray-50">
                      <td className="px-6 py-3 font-medium">{r.aluno.nome}</td>
                      <td className="px-6 py-3 font-mono text-xs">{r.aluno.matricula || '—'}</td>
                      <td className="px-6 py-3">{r.totalAulas}</td>
                      <td className="px-6 py-3 text-green-text font-bold">{r.presencas}</td>
                      <td className="px-6 py-3 text-red-text font-bold">{r.faltas}</td>
                      <td className="px-6 py-3 text-amber-text font-bold">{r.justificadas}</td>
                      <td className="px-6 py-3 font-mono font-bold">
                        {calcularPorcentagemFaltas(r.faltas + r.justificadas)}%
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          variant={r.isCritico ? 'critico' : 'regular'}
                          className="gap-1 flex items-center w-fit"
                        >
                          {r.isCritico && <AlertCircle className="w-3 h-3" />}
                          {getSituacao(r.faltas + r.justificadas, reportData.turma.limiteFaltas)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </Table>
              ) : (
                /* Table by student */
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-4 no-print">
                    <div className="p-3 bg-gray-50 rounded-xl text-center">
                      <p className="text-[10px] uppercase text-gray-400 font-bold">Total Classes</p>
                      <p className="text-lg font-bold">{reportData.stats.total}</p>
                    </div>
                    <div className="p-3 bg-green-bg/30 rounded-xl text-center">
                      <p className="text-[10px] uppercase text-green-text font-bold">Attendance</p>
                      <p className="text-lg font-bold text-green-text">{reportData.stats.presencas}</p>
                    </div>
                    <div className="p-3 bg-red-bg/30 rounded-xl text-center">
                      <p className="text-[10px] uppercase text-red-text font-bold">Absences</p>
                      <p className="text-lg font-bold text-red-text">{reportData.stats.faltas}</p>
                    </div>
                    <div className="p-3 bg-amber-bg/30 rounded-xl text-center">
                      <p className="text-[10px] uppercase text-amber-text font-bold">Justified</p>
                      <p className="text-lg font-bold text-amber-text">{reportData.stats.justificadas}</p>
                    </div>
                  </div>

                  <Table headers={['Date', 'Status', 'Justification']}>
                    {reportData.results.map((r, i) => (
                      <tr key={i} className="text-sm">
                        <td className="px-6 py-3 font-mono">{formatShortDate(r.data)}</td>
                        <td className="px-6 py-3">
                          <Badge
                            variant={
                              r.status === 'P' ? 'presente'
                              : r.status === 'F' ? 'falta'
                              : 'justificada'
                            }
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-gray-500 italic">
                          {r.justificativa || '-'}
                        </td>
                      </tr>
                    ))}
                  </Table>
                </div>
              )}

            </div>
          )}
        </Card>

      </div>
    </div>
  );
};

export default Relatorios;
