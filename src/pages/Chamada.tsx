import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, IAluno, IRegistro, IChamada } from '../db';
import { Card, Badge, Input, ProgressBar, cn } from '../components/ui';
import { Button } from '../components/ui/Button';
import { Check, X, MessageSquare, Save, ChevronLeft, Loader2 } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { formatDate } from '../utils';

const Chamada: React.FC = () => {
  const { turmaId } = useParams<{ turmaId: string }>();
  const navigate = useNavigate();
  const { addToast } = useUIStore();

  const id = parseInt(turmaId || '0');
  const turma = useLiveQuery(() => db.turmas.get(id));
  const alunos = useLiveQuery(() => db.alunos.where('turmaId').equals(id).sortBy('nome'));

  const [dataChamada, setDataChamada] = useState(new Date().toISOString().split('T')[0]);
  const [registros, setRegistros] = useState<Record<number, { status: 'P' | 'F' | 'J'; justificativa: string | null }>>({});
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [existingChamadaId, setExistingChamadaId] = useState<number | null>(null);

  // Load existing attendance if it exists for this date
  useEffect(() => {
    const loadExisting = async () => {
      try {
        const chamada = await db.chamadas.where('[turmaId+data]').equals([id, dataChamada]).first();
        if (chamada) {
          const regs = await db.registros.where('chamadaId').equals(chamada.id!).toArray();
          const regsMap: Record<number, { status: 'P' | 'F' | 'J'; justificativa: string | null }> = {};
          regs.forEach(r => {
            regsMap[r.alunoId] = { status: r.status, justificativa: r.justificativa };
          });
          setRegistros(regsMap);
          setExistingChamadaId(chamada.id!);
          setIsEditing(true);
        } else {
          setRegistros({});
          setExistingChamadaId(null);
          setIsEditing(false);
        }
      } catch (err) {
        console.error('Error loading existing attendance:', err);
        addToast('Error loading existing data.', 'error');
      }
    };
    loadExisting();
  }, [id, dataChamada]);

  const stats = useMemo(() => {
    const values = Object.values(registros);
    return {
      presentes: values.filter(v => v.status === 'P').length,
      faltas: values.filter(v => v.status === 'F').length,
      justificadas: values.filter(v => v.status === 'J').length,
      totalMarcados: values.length,
      totalAlunos: alunos?.length || 0
    };
  }, [registros, alunos]);

  const handleStatusChange = (alunoId: number, status: 'P' | 'F' | 'J') => {
    setRegistros(prev => ({
      ...prev,
      [alunoId]: {
        status,
        justificativa: status === 'J' ? (prev[alunoId]?.justificativa || '') : null
      }
    }));
  };

  const handleJustificativaChange = (alunoId: number, text: string) => {
    setRegistros(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        justificativa: text
      }
    }));
  };

  const handleSave = async () => {
    if (stats.totalMarcados < stats.totalAlunos) {
      addToast('Please mark attendance for all students.', 'error');
      return;
    }

    setLoading(true);
    try {
      let chamadaId = existingChamadaId;
      
      if (isEditing && chamadaId) {
        // Update existing
        await db.registros.where('chamadaId').equals(chamadaId).delete();
      } else {
        // Create new
        chamadaId = await db.chamadas.add({
          turmaId: id,
          data: dataChamada,
          criadaEm: new Date()
        });
      }

      const registrosToSave: IRegistro[] = Object.entries(registros).map(([alunoId, data]) => ({
        chamadaId: chamadaId!,
        alunoId: parseInt(alunoId),
        status: data.status,
        justificativa: data.justificativa
      }));

      await db.registros.bulkAdd(registrosToSave);
      addToast(isEditing ? 'Attendance updated successfully!' : 'Attendance saved successfully!');
      navigate('/');
    } catch (error) {
      addToast('Error saving attendance.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!turma) return null;

  return (
    <div className="space-y-6 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">{turma.nome}</h1>
            <p className="text-gray-500 text-sm">{turma.curso} • {turma.semestre} {turma.ano}</p>
          </div>
        </div>
        <div className="w-full md:w-auto">
          <Input 
            type="date" 
            value={dataChamada} 
            onChange={e => setDataChamada(e.target.value)}
            className="md:w-48"
          />
        </div>
      </header>

      <Card className="sticky top-4 z-10 shadow-md border-slate/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <ProgressBar
              progress={(stats.totalMarcados / stats.totalAlunos) * 100}
              label={`${stats.totalMarcados} of ${stats.totalAlunos} marked`}
            />
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <div className="flex items-center gap-1.5 text-green-text">
              <div className="w-2 h-2 rounded-full bg-green-text" />
              <span>{stats.presentes} Present</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-text">
              <div className="w-2 h-2 rounded-full bg-red-text" />
              <span>{stats.faltas} Absent</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-text">
              <div className="w-2 h-2 rounded-full bg-amber-text" />
              <span>{stats.justificadas} Justified</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {alunos?.map((aluno) => (
          <Card key={aluno.id} className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">{aluno.nome}</h3>
                <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">{aluno.matricula}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStatusChange(aluno.id!, 'P')}
                  className={cn(
                    'flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold transition-all',
                    registros[aluno.id!]?.status === 'P' 
                      ? 'bg-green-bg text-green-text ring-2 ring-green-text/20' 
                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  )}
                >
                  <Check className="w-5 h-5" />
                  <span>P</span>
                </button>
                <button
                  onClick={() => handleStatusChange(aluno.id!, 'F')}
                  className={cn(
                    'flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold transition-all',
                    registros[aluno.id!]?.status === 'F' 
                      ? 'bg-red-bg text-red-text ring-2 ring-red-text/20' 
                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  )}
                >
                  <X className="w-5 h-5" />
                  <span>F</span>
                </button>
                <button
                  onClick={() => handleStatusChange(aluno.id!, 'J')}
                  className={cn(
                    'flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold transition-all',
                    registros[aluno.id!]?.status === 'J' 
                      ? 'bg-amber-bg text-amber-text ring-2 ring-amber-text/20' 
                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  )}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>J</span>
                </button>
              </div>
            </div>
            {registros[aluno.id!]?.status === 'J' && (
              <div className="mt-4 pt-4 border-t border-gray-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <Input 
                  placeholder="Enter justification..." 
                  value={registros[aluno.id!]?.justificativa || ''}
                  onChange={e => handleJustificativaChange(aluno.id!, e.target.value)}
                />
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 lg:left-64 z-30">
        <div className="max-w-7xl mx-auto flex justify-end">
          <Button 
            className="w-full sm:w-auto gap-2 h-12 text-lg px-8 shadow-lg shadow-slate/20"
            disabled={stats.totalMarcados < stats.totalAlunos}
            onClick={handleSave}
            loading={loading}
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            {isEditing ? 'Update Attendance' : 'Save Attendance'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chamada;
