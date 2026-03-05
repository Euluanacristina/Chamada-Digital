import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export * from './calcularFaltas';

export const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date;
  return format(d, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
};

export const formatShortDate = (date: string) => {
  const d = new Date(date + 'T12:00:00');
  return format(d, 'dd/MM/yyyy');
};

export const getStatusLabel = (status: 'P' | 'F' | 'J') => {
  switch (status) {
    case 'P': return 'Present';
    case 'F': return 'Absent';
    case 'J': return 'Justified';
  }
};
