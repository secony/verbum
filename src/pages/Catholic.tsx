import { Link } from 'react-router-dom';
import { CalendarHeart, Church, CircleDot, HandHeart, Newspaper, ScrollText, ShieldCheck, Sparkles } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { useChurches, useIsAdmin, usePublishedArticles } from '../lib/catholic-data';
import { coverage } from '../lib/catholic';

export default function Catholic() {
  const articles = usePublishedArticles();
  const churches = useChurches();
  const admin = useIsAdmin();
  const nArticles = articles.data?.length ?? 0;
  const cov = churches.data ? coverage(churches.data) : null;

  const cards = [
    { icon: CircleDot, title: 'O Santo Terço', to: '/catolica/terco', text: 'Reze passo a passo, com o terço desenhado: as contas se preenchem conforme você avança nas orações e nos mistérios.', status: 'Mistérios gozosos, luminosos, dolorosos e gloriosos, com a sugestão do dia.' },
    { icon: HandHeart, title: 'Orações', to: '/catolica/oracoes', text: 'Sinal da Cruz, Pai-Nosso, Ave-Maria, Glória, Creio, Salve-Rainha e Oração de Fátima.', status: 'Versões tradicionais em português do Brasil.' },
    {
      icon: Sparkles, title: 'Entenda a Igreja', to: '/catolica/entenda',
      text: 'Estrutura da Igreja, sacramentos, liturgia e tradições, em textos curtos com as fontes.',
      status: nArticles ? `${nArticles} ${nArticles === 1 ? 'texto publicado' : 'textos publicados'}` : 'Em preparação: o conteúdo só é publicado depois de revisado.',
    },
    {
      icon: Church, title: 'Igrejas de São José do Rio Preto', to: '/catolica/igrejas',
      text: 'Endereços e horários de missa, cada um com sua fonte e a data da última verificação.',
      status: cov && cov.total ? `${cov.total} ${cov.total === 1 ? 'igreja' : 'igrejas'} no catálogo, ${cov.withConfirmed} com horário confirmado` : 'Em construção: só entram dados verificados.',
    },
    { icon: Newspaper, title: 'Notícias católicas', text: 'Vaticano, Igreja no Brasil e igreja local, com fonte, data e link para o original.', status: 'Em breve: depende da escolha das fontes e dos termos de uso de cada uma.' },
    { icon: CalendarHeart, title: 'Santo do dia', text: 'Memória litúrgica e breve biografia, no calendário do Brasil.', status: 'Em breve: depende de uma fonte verificável.' },
    { icon: ScrollText, title: 'Liturgia diária', text: 'Leituras, salmo e evangelho do dia, com link para a fonte oficial.', status: 'Em breve: depende de uma fonte oficial ou autorizada.' },
  ];

  return (
    <div>
      <PageHeader eyebrow="Formação e comunidade" title="Católica">Esta área reúne conteúdo da tradição católica. Nada aqui é inventado: cada seção só abre quando há fonte confiável e revisão.</PageHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ icon: Icon, title, text, status, to }) => {
          const body = (
            <>
              <div className="mb-3 flex items-center justify-between">
                <Icon className="h-6 w-6 text-gold" aria-hidden />
                {!to && <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">Em breve</span>}
              </div>
              <h2 className="text-2xl">{title}</h2>
              <p className="mt-2 text-sm text-muted">{text}</p>
              <p className="mt-3 border-l-2 border-gold pl-3 text-xs text-muted">{status}</p>
            </>
          );
          return to
            ? <Link key={title} to={to} className="surface block p-6 transition-colors hover:border-gold">{body}</Link>
            : <section key={title} className="surface p-6">{body}</section>;
        })}
      </div>
      {admin.data && (
        <Link to="/admin" className="btn-outline mt-8"><ShieldCheck className="h-4 w-4" aria-hidden /> Painel administrativo</Link>
      )}
    </div>
  );
}
