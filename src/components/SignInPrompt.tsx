import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { EmptyState } from './ui';

export function SignInPrompt({ title = 'Entre para continuar', text }: { title?: string; text: string }) {
  return (
    <EmptyState icon={<LogIn className="h-8 w-8" />} title={title} action={{ to: '/perfil', label: 'Entrar ou criar conta' }}>
      {text}
    </EmptyState>
  );
}
