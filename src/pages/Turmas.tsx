import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ITurma } from '../db';
import { Card, Badge, Input, Select, Modal } from '../components/ui';
import { Button } from '../components/ui/Button';
import { ConfirmDialog, EmptyState } from '../components/ui/feedback';
import { BookOpen, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useUIStore } from '../store/uiStore';

const Turmas: React.FC = () => {
  const turmas = useLiveQuery(() => db.turmas.toArray());
  const { addToast } = useUIStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<ITurma | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    curso: '',
    semestre: '1°',
    ano: new Date().getFullYear(),
    limiteFaltas: 25
  });

  const handleOpenModal = (turma?: ITurma) => {
    if (turma) {
      setEditingTurma(turma);
      setFormData({
        nome: turma.nome,
        curso: turma.curso,
        semestre: turma.semestre,
        ano: turma.ano,
        limiteFaltas: turma.limiteFaltas
      });
    } else {
      setEditingTurma(null);
      setFormData({
        nome: '',
        curso: '',
        semestre: '1°',
        ano: new Date().getFullYear(),
        limiteFaltas: 25
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.curso) {
      addToast('Please fill in all required fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      if (editingTurma) {
        await db.turmas.update(editingTurma.id!, {
          ...formData,
        });
        addToast('Class updated successfully!');
      } else {
        await db.turmas.add({
          ...formData,
          criadaEm: new Date()
        });
        addToast('Class registered successfully!');
      }
      setIsModalOpen(false);
    } catch (error) {
      addToast('Error saving class.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      // Cascade delete: students, calls, records
      const chamadas = await db.chamadas.where('turmaId').equals(deletingId).toArray();
      const chamadasIds = chamadas.map(c => c.id!);
      
      await db.registros.where('chamadaId').anyOf(chamadasIds).delete();
      await db.chamadas.where('turmaId').equals(deletingId).delete();
      await db.alunos.where('turmaId').equals(deletingId).delete();
      await db.turmas.delete(deletingId);
      
      addToast('Class and all linked data deleted.');
    } catch (error) {
      addToast('Error deleting class.', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-gray-500 font-medium uppercase tracking-widest text-xs mb-1">Management</p>
          <h1 className="text-3xl font-display font-bold text-gray-900">My Classes</h1>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-5 h-5" />
          New Class
        </Button>
      </header>

      {!turmas || turmas.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-12 h-12" />}
          title="No classes registered"
          description="You don't have any classes yet. Add a new class to start managing your students."
          action={<Button onClick={() => handleOpenModal()}>Add Class</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {turmas.map((turma) => (
            <Card key={turma.id} className="flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-display font-bold text-gray-900">{turma.nome}</h3>
                  <p className="text-gray-500 text-sm">{turma.curso}</p>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleOpenModal(turma)}
                    className="p-2 text-gray-400 hover:text-slate hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { setDeletingId(turma.id!); setIsConfirmOpen(true); }}
                    className="p-2 text-gray-400 hover:text-red-text hover:bg-red-bg/5 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 mt-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Semester/Year</span>
                  <span className="font-mono font-medium">{turma.semestre} {turma.ano}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Absence Limit</span>
                  <Badge variant="info">{turma.limiteFaltas}%</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTurma ? 'Edit Class' : 'New Class'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Class'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Subject Name"
            placeholder="Ex: Calculus II"
            value={formData.nome}
            onChange={e => setFormData({ ...formData, nome: e.target.value })}
            required
          />
          <Input
            label="Course"
            placeholder="Ex: Civil Engineering"
            value={formData.curso}
            onChange={e => setFormData({ ...formData, curso: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Semester"
              value={formData.semestre}
              onChange={e => setFormData({ ...formData, semestre: e.target.value })}
            >
              {[...Array(10)].map((_, i) => (
                <option key={i} value={`${i + 1}°`}>{i + 1}° Semester</option>
              ))}
            </Select>
            <Input
              label="Year"
              type="number"
              value={formData.ano}
              onChange={e => setFormData({ ...formData, ano: parseInt(e.target.value) })}
              required
            />
          </div>
          <Input
            label="Absence Limit (%)"
            type="number"
            min="0"
            max="100"
            value={formData.limiteFaltas}
            onChange={e => setFormData({ ...formData, limiteFaltas: parseInt(e.target.value) })}
            required
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Class"
        message="Are you sure you want to delete this class? All linked students, attendance records, and registrations will be permanently deleted."
      />
    </div>
  );
};

export default Turmas;
