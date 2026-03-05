import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, IAluno } from '../db';
import { Card, Badge, Input, Select, Modal, Table, cn } from '../components/ui';
import { Button } from '../components/ui/Button';
import { ConfirmDialog, EmptyState } from '../components/ui/feedback';
import { Users, Plus, Pencil, Trash2, Search, Loader2, AlertCircle } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { calcularPorcentagemFaltas, isCritico, getSituacao, faltasRestantes } from '../utils';

const Alunos: React.FC = () => {
  const turmas = useLiveQuery(() => db.turmas.toArray());
  const alunos = useLiveQuery(() => db.alunos.toArray());
  const { addToast } = useUIStore();

  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingAluno, setEditingAluno] = useState<IAluno | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    matricula: '',
    turmaId: ''
  });

  // Calculate stats for each student
  const studentStats = useLiveQuery(async () => {
    try {
      if (!alunos || !turmas) return {};
      
      const stats: Record<number, { faltas: number; total: number; limite: number }> = {};
      const turmasMap = new Map(turmas.map(t => [t.id, t]));

      for (const aluno of alunos) {
        const turma = turmasMap.get(aluno.turmaId);
        if (!turma) continue;

        const totalChamadas = await db.chamadas.where('turmaId').equals(turma.id!).count();
        const chamadasIds = await db.chamadas.where('turmaId').equals(turma.id!).primaryKeys();
        
        const faltas = await db.registros
          .where('alunoId').equals(aluno.id!)
          .filter(r => chamadasIds.includes(r.chamadaId) && (r.status === 'F' || r.status === 'J'))
          .count();

        stats[aluno.id!] = {
          faltas,
          total: totalChamadas,
          limite: turma.limiteFaltas
        };
      }
      return stats;
    } catch (err) {
      console.error('Error calculating student stats:', err);
      return {};
    }
  }, [alunos, turmas]);

  const filteredAlunos = useMemo(() => {
    if (!alunos) return [];
    return alunos.filter(aluno => {
      const matchesTurma = selectedTurmaId === 'all' || aluno.turmaId === parseInt(selectedTurmaId);
      const matchesSearch = aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            aluno.matricula.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTurma && matchesSearch;
    });
  }, [alunos, selectedTurmaId, searchTerm]);

  const handleOpenModal = (aluno?: IAluno) => {
    if (aluno) {
      setEditingAluno(aluno);
      setFormData({
        nome: aluno.nome,
        matricula: aluno.matricula,
        turmaId: aluno.turmaId.toString()
      });
    } else {
      setEditingAluno(null);
      setFormData({
        nome: '',
        matricula: '',
        turmaId: selectedTurmaId !== 'all' ? selectedTurmaId : (turmas?.[0]?.id?.toString() || '')
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.turmaId) {
      addToast('Name and class are required.', 'error');
      return;
    }

    setLoading(true);
    try {
      const turmaId = parseInt(formData.turmaId);
      
      const matriculaTrim = formData.matricula?.trim() || '';
      
      // Check for unique matricula in the same class (only if provided)
      if (matriculaTrim) {
        const existing = await db.alunos
          .where({ turmaId, matricula: matriculaTrim })
          .first();
        
        if (existing && (!editingAluno || existing.id !== editingAluno.id)) {
          addToast("There's already a student with this ID number in this class.", 'error');
          setLoading(false);
          return;
        }
      }

      if (editingAluno) {
        await db.alunos.update(editingAluno.id!, {
          nome: formData.nome.trim(),
          matricula: matriculaTrim || null,
          turmaId: turmaId
        });
        addToast('Student updated successfully!');
      } else {
        await db.alunos.add({
          nome: formData.nome.trim(),
          matricula: matriculaTrim || null,
          turmaId: turmaId,
          criadoEm: new Date()
        });
        addToast('Student registered successfully!');
      }
      setIsModalOpen(false);
    } catch (error) {
      addToast('Error saving student.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await db.registros.where('alunoId').equals(deletingId).delete();
      await db.alunos.delete(deletingId);
      addToast('Student and their attendance records deleted.');
    } catch (error) {
      addToast('Error deleting student.', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-gray-500 font-medium uppercase tracking-widest text-xs mb-1">Management</p>
          <h1 className="text-3xl font-display font-bold text-gray-900">Students</h1>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-5 h-5" />
          New Student
        </Button>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="w-full md:w-64">
          <Select
            value={selectedTurmaId}
            onChange={e => setSelectedTurmaId(e.target.value)}
          >
            <option value="all">All Classes</option>
            {turmas?.map(t => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </Select>
        </div>
        <div className="w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search by name or ID number..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate/20 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {!alunos || alunos.length === 0 ? (
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title="No students registered"
          description="You don't have any students yet. Add a new student to start taking attendance."
          action={<Button onClick={() => handleOpenModal()}>Add Student</Button>}
        />
      ) : (
        <Table headers={['Name', 'ID Number', 'Class', '% Attendance', 'Status', 'Actions']}>
          {filteredAlunos.map((aluno) => {
            const stats = studentStats?.[aluno.id!];
            const turma = turmas?.find(t => t.id === aluno.turmaId);
            const totalFaltas = stats?.faltas || 0;
            const percFaltas = calcularPorcentagemFaltas(totalFaltas);
            const critico = isCritico(totalFaltas, turma?.limiteFaltas);
            const restantes = faltasRestantes(totalFaltas, turma?.limiteFaltas);

            return (
              <tr key={aluno.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{aluno.nome}</td>
                <td className="px-6 py-4 font-mono text-xs text-gray-500">{aluno.matricula || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{turma?.nome || 'N/A'}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{percFaltas}%</span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={cn('h-full transition-all', critico ? 'bg-red-text' : 'bg-green-text')} 
                          style={{ width: `${Math.min(percFaltas, 100)}%` }}
                        />
                      </div>
                    </div>
                    {restantes === 1 && (
                      <span className="text-amber-text text-[10px] font-medium">
                        Attention: only 1 absence remaining
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={critico ? 'critico' : 'regular'} className="gap-1 flex items-center w-fit">
                    {critico && <AlertCircle className="w-3 h-3" />}
                    {getSituacao(totalFaltas, turma?.limiteFaltas)}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenModal(aluno)}
                      className="p-1.5 text-gray-400 hover:text-slate hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => { setDeletingId(aluno.id!); setIsConfirmOpen(true); }}
                      className="p-1.5 text-gray-400 hover:text-red-text hover:bg-red-bg/5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAluno ? 'Edit Student' : 'New Student'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={loading}>Save Student</Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Ex: John Smith"
            value={formData.nome}
            onChange={e => setFormData({ ...formData, nome: e.target.value })}
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              ID Number
              <span className="ml-1 text-xs text-gray-300 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.matricula || ''}
              onChange={e => setFormData({ ...formData, matricula: e.target.value })}
              placeholder="Ex: 2024001"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate/20 transition-all"
            />
          </div>
          <Select
            label="Class"
            value={formData.turmaId}
            onChange={e => setFormData({ ...formData, turmaId: e.target.value })}
            required
          >
            <option value="" disabled>Select a class</option>
            {turmas?.map(t => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </Select>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Student"
        message="Are you sure you want to delete this student? All linked attendance records will be permanently deleted."
      />
    </div>
  );
};

export default Alunos;
