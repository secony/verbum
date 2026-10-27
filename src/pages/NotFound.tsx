import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <EmptyState icon={<Compass className="h-8 w-8" />} title="Página não encontrada" action={{ to: '/', label: 'Voltar ao início' }}>
      O endereço não existe ou foi movido.
    </EmptyState>
  );
}
