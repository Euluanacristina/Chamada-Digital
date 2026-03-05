import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card, Badge } from '../components/ui';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/feedback';
import { 
  BookOpen, 
  Users, 
  ClipboardCheck, 
  AlertCircle,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate, calcularPorcentagemFaltas } from '../utils';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const turmas = useLiveQuery(() => db.turmas.toArray());
  const alunosCount = useLiveQuery(() => db.alunos.count());
  const chamadasMes = useLiveQuery(async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    return db.chamadas.where('data').aboveOrEqual(startOfMonth).count();
  });

  const alunosCriticos = useLiveQuery(async () => {
    try {
      const allAlunos = await db.alunos.toArray();
      const allTurmas = await db.turmas.toArray();
      const turmasMap = new Map(allTurmas.map(t => [t.id, t]));
      
      let criticosCount = 0;
      for (const aluno of allAlunos) {
        const turma = turmasMap.get(aluno.turmaId);
        if (!turma) continue;

        const totalChamadas = await db.chamadas.where('turmaId').equals(turma.id!).count();
        if (totalChamadas === 0) continue;

        const chamadasIds = await db.chamadas.where('turmaId').equals(turma.id!).primaryKeys();
        const faltas = await db.registros
          .where('[chamadaId+alunoId]')
          .anyOf(chamadasIds.map(cid => [cid, aluno.id!]))
          .filter(r => r.status === 'F' || r.status === 'J')
          .count();

        if (calcularPorcentagemFaltas(faltas) >= turma.limiteFaltas) {
          criticosCount++;
        }
      }
      return criticosCount;
    } catch (err) {
      console.error('Error calculating critical students:', err);
      return 0;
    }
  });

  // Check if any student in a specific class is critical
  const isTurmaCritica = async (turmaId: number) => {
    const turma = await db.turmas.get(turmaId);
    if (!turma) return false;

    const alunosTurma = await db.alunos.where('turmaId').equals(turmaId).toArray();
    const totalChamadas = await db.chamadas.where('turmaId').equals(turmaId).count();
    if (totalChamadas === 0) return false;

    const chamadasIds = await db.chamadas.where('turmaId').equals(turmaId).primaryKeys();

    for (const aluno of alunosTurma) {
      const faltas = await db.registros
        .where('alunoId').equals(aluno.id!)
        .filter(r => chamadasIds.includes(r.chamadaId) && (r.status === 'F' || r.status === 'J'))
        .count();
      
      if (calcularPorcentagemFaltas(faltas) >= turma.limiteFaltas) {
        return true;
      }
    }
    return false;
  };

  const [turmasCriticas, setTurmasCriticas] = React.useState<Record<number, boolean>>({});

  React.useEffect(() => {
    if (turmas) {
      turmas.forEach(async (t) => {
        const critica = await isTurmaCritica(t.id!);
        setTurmasCriticas(prev => ({ ...prev, [t.id!]: critica }));
      });
    }
  }, [turmas]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-gray-500 font-medium uppercase tracking-widest text-xs mb-1">Overview</p>
          <h1 className="text-3xl font-display font-bold text-gray-900">Hello, Professor</h1>
          <p className="text-slate-lt font-medium mt-1">{formatDate(new Date())}</p>
        </div>
        <Button onClick={() => navigate('/turmas')} className="gap-2">
          <Plus className="w-5 h-5" />
          New Class
        </Button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-slate-bg text-slate rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Classes</p>
            <p className="text-2xl font-display font-bold">{turmas?.length || 0}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-slate-bg text-slate rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Students</p>
            <p className="text-2xl font-display font-bold">{alunosCount || 0}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-slate-bg text-slate rounded-xl">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Attendance (Month)</p>
            <p className="text-2xl font-display font-bold">{chamadasMes || 0}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 border-red-text/20 bg-red-bg/5">
          <div className="p-3 bg-red-bg text-red-text rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Critical Students</p>
            <p className="text-2xl font-display font-bold text-red-text">{alunosCriticos || 0}</p>
          </div>
        </Card>
      </div>

      <section>
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">My Classes</h2>
        {!turmas || turmas.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-12 h-12" />}
            title="No classes registered"
            description="Start by creating your first class to manage students and take attendance."
            action={<Button onClick={() => navigate('/turmas')}>Create Class</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {turmas.map((turma) => (
              <Card
                key={turma.id}
                className="relative flex flex-col h-full group"
                onClick={() => navigate(`/chamada/${turma.id}`)}
              >
                {turmasCriticas[turma.id!] && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="critico" className="gap-1 flex items-center">
                      <AlertCircle className="w-3 h-3" />
                      Critical
                    </Badge>
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-xl font-display font-bold text-gray-900 group-hover:text-slate transition-colors">
                    {turma.nome}
                  </h3>
                  <p className="text-gray-500 text-sm">{turma.curso}</p>
                </div>
                <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    <span className="font-mono bg-gray-50 px-2 py-1 rounded">{turma.semestre} {turma.ano}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-slate font-semibold">
                    Start Attendance
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
