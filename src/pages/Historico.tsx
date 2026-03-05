import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, IChamada, IRegistro } from '../db';
import { Card, Badge, Select, Modal, Table } from '../components/ui';
import { Button } from '../components/ui/Button';
import { ConfirmDialog, EmptyState } from '../components/ui/feedback';
import { History, Search, Eye, Trash2, ChevronRight, Calendar, Users, Check, X, MessageSquare } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { formatShortDate, getStatusLabel } from '../utils';

const Historico: React.FC = () => {
  const turmas = useLiveQuery(() => db.turmas.toArray());
  const { addToast } = useUIStore();

  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [viewingChamada, setViewingChamada] = useState<IChamada | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const chamadas = useLiveQuery(async () => {
    try {
      let query = db.chamadas.orderBy('data').reverse();
      
      let results = await query.toArray();
      
      if (selectedTurmaId !== 'all') {
        results = results.filter(c => c.turmaId === parseInt(selectedTurmaId));
      }
      
      if (selectedMonth) {
        results = results.filter(c => c.data.startsWith(selectedMonth));
      }
      
      return results;
    } catch (err) {
      console.error('Error loading history:', err);
      return [];
    }
  }, [selectedTurmaId, selectedMonth]);

  const chamadaDetails = useLiveQuery(async () => {
    try {
      if (!viewingChamada) return null;
      const regs = await db.registros.where('chamadaId').equals(viewingChamada.id!).toArray();
      const alunos = await db.alunos.where('turmaId').equals(viewingChamada.turmaId).toArray();
      const alunosMap = new Map(alunos.map(a => [a.id, a]));
      
      return regs.map(r => ({
        ...r,
        aluno: alunosMap.get(r.alunoId)
      }));
    } catch (err) {
      console.error('Error loading history details:', err);
      return null;
    }
  }, [viewingChamada]);

  const statsMap = useLiveQuery(async () => {
    try {
      if (!chamadas) return {};
      const stats: Record<number, { P: number; F: number; J: number }> = {};
      for (const c of chamadas) {
        const regs = await db.registros.where('chamadaId').equals(c.id!).toArray();
        stats[c.id!] = {
          P: regs.filter(r => r.status === 'P').length,
          F: regs.filter(r => r.status === 'F').length,
          J: regs.filter(r => r.status === 'J').length
        };
      }
      return stats;
    } catch (err) {
      console.error('Error calculating history stats:', err);
      return {};
    }
  }, [chamadas]);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await db.registros.where('chamadaId').equals(deletingId).delete();
      await db.chamadas.delete(deletingId);
      addToast('Attendance deleted successfully.');
    } catch (error) {
      addToast('Error deleting attendance.', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-gray-500 font-medium uppercase tracking-widest text-xs mb-1">Query</p>
        <h1 className="text-3xl font-display font-bold text-gray-900">Attendance History</h1>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="w-full md:w-64">
          <Select
            label="Filter by Class"
            value={selectedTurmaId}
            onChange={e => setSelectedTurmaId(e.target.value)}
          >
            <option value="all">All Classes</option>
            {turmas?.map(t => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </Select>
        </div>
        <div className="w-full md:w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">Month/Year</label>
          <input 
            type="month"
            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate/20 transition-all"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>

      {!chamadas || chamadas.length === 0 ? (
        <EmptyState
          icon={<History className="w-12 h-12" />}
          title="No attendance found"
          description="No records found for the selected filters."
        />
      ) : (
        <div className="space-y-4">
          {chamadas.map((chamada) => {
            const turma = turmas?.find(t => t.id === chamada.turmaId);
            const stats = statsMap?.[chamada.id!];

            return (
              <Card key={chamada.id} className="p-4 hover:border-slate/20 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl text-gray-400">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{formatShortDate(chamada.data)}</h3>
                      <p className="text-sm text-slate font-medium">{turma?.nome || 'Turma Excluída'}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex gap-3">
                      <div className="text-center">
                        <p className="text-[10px] uppercase text-gray-400 font-bold">P</p>
                        <p className="text-sm font-bold text-green-text">{stats?.P || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase text-gray-400 font-bold">F</p>
                        <p className="text-sm font-bold text-red-text">{stats?.F || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase text-gray-400 font-bold">J</p>
                        <p className="text-sm font-bold text-amber-text">{stats?.J || 0}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setViewingChamada(chamada)} className="gap-1">
                        <Eye className="w-4 h-4" />
                        Details
                      </Button>
                      <button 
                        onClick={() => { setDeletingId(chamada.id!); setIsConfirmOpen(true); }}
                        className="p-2 text-gray-400 hover:text-red-text hover:bg-red-bg/5 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={!!viewingChamada}
        onClose={() => setViewingChamada(null)}
        title={`Details - ${viewingChamada ? formatShortDate(viewingChamada.data) : ''}`}
        footer={<Button onClick={() => setViewingChamada(null)}>Close</Button>}
      >
        {viewingChamada && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-bg rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-slate font-bold uppercase tracking-wider">Class</p>
                <p className="text-slate font-display font-bold">{turmas?.find(t => t.id === viewingChamada.turmaId)?.nome}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate font-bold uppercase tracking-wider">Date</p>
                <p className="text-slate font-mono">{formatShortDate(viewingChamada.data)}</p>
              </div>
            </div>

            <Table headers={['Student', 'Status', 'Justification']}>
              {chamadaDetails?.map((reg) => (
                <tr key={reg.id} className="text-sm">
                  <td className="px-6 py-3 font-medium">{reg.aluno?.nome || 'Deleted Student'}</td>
                  <td className="px-6 py-3">
                    <Badge variant={reg.status === 'P' ? 'presente' : reg.status === 'F' ? 'falta' : 'justificada'}>
                      {reg.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-gray-500 italic">
                    {reg.justificativa || '-'}
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Attendance"
        message="Are you sure you want to delete this attendance record? This action cannot be undone."
      />
    </div>
  );
};

export default Historico;
