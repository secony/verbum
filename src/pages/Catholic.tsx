import { CalendarHeart, Church, Newspaper, ScrollText, Sparkles } from 'lucide-react';
import { PageHeader } from '../components/ui';

const SECTIONS = [
  { icon: Newspaper, t: 'Notícias católicas', d: 'Vaticano, Igreja no Brasil e igreja local, sempre com fonte, data de publicação e link para o original.', need: 'Falta: escolher as fontes (RSS ou API autorizada) e conferir os termos de uso de cada uma.' },
  { icon: Sparkles, t: 'Entenda a Igreja', d: 'Estrutura da Igreja, sacramentos, liturgia e tradições, em módulos curtos e com referências.', need: 'Falta: conteúdo escrito e revisado por pessoa responsável. Não será gerado automaticamente.' },
  { icon: CalendarHeart, t: 'Santo do dia', d: 'Nome, memória litúrgica e breve biografia, no calendário litúrgico do Brasil.', need: 'Falta: fonte verificável e autorizada.' },
  { icon: ScrollText, t: 'Liturgia diária', d: 'Leituras, salmo e evangelho do dia, com link para a fonte oficial.', need: 'Falta: fonte oficial ou autorizada para o calendário brasileiro.' },
  { icon: Church, t: 'Igrejas de São José do Rio Preto', d: 'Catálogo de igrejas e horários de missa com data da última verificação.', need: 'Falta: dados verificados (cadastro manual ou fornecidos pelas paróquias). Horário não confirmado nunca será exibido como certo.' },
];

export default function Catholic() {
  return (
    <div>
      <PageHeader eyebrow="Formação e comunidade" title="Católica">Esta área reúne conteúdo da tradição católica. Nada aqui é inventado: cada seção só abre quando houver fonte confiável.</PageHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map(({ icon: Icon, t, d, need }) => (
          <section key={t} className="surface p-6">
            <div className="mb-3 flex items-center justify-between">
              <Icon className="h-6 w-6 text-gold" aria-hidden />
              <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">Em breve</span>
            </div>
            <h2 className="text-2xl">{t}</h2>
            <p className="mt-2 text-sm text-muted">{d}</p>
            <p className="mt-3 border-l-2 border-gold pl-3 text-xs text-muted">{need}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
