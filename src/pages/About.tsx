import { PageHeader } from '../components/ui';

export default function About() {
  return (
    <article className="max-w-2xl space-y-5">
      <PageHeader eyebrow="Transparência" title="Sobre o texto bíblico" />
      <p>O Verbum usa, por enquanto, a tradução <strong>Douay-Rheims (revisão de Challoner)</strong>, em inglês, como <strong>texto de teste</strong>. É uma tradução católica do século XVIII, de domínio público, com os 73 livros do cânon católico.</p>
      <p>O arquivo foi obtido do repositório <em>xxruyle/Bible-DouayRheims</em> (versão 24516e0), convertido por script e conferido por contagem de capítulos e versículos contra outra edição. Pode conter erros residuais. O repositório não documenta a origem exata do texto.</p>
      <p>A numeração é a da <strong>Vulgata</strong>: por exemplo, o Salmo 22 daqui é o Salmo 23 das Bíblias católicas em português.</p>
      <p>Esta tradução deve ser substituída por uma tradução em português com licença assim que houver. Nenhum texto bíblico, notícia, horário ou dado litúrgico é inventado: quando uma fonte não está configurada, o app diz isso.</p>
    </article>
  );
}
