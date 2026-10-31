import json, re, subprocess, time, sys, base64
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

# --- dados de teste (versículos reais do banco) ---
V = json.load(open('/home/claude/verbum/e2e/verses.json'))
BOOKS = json.load(open('/home/claude/verbum/e2e/books.json'))
BYID = {b['id']: b for b in BOOKS}
def emb(v): 
    b = BYID[v['book_id']]
    return {**{k: v[k] for k in ('id','chapter','verse','text','translation','source')}, 'books': {'id': b['id'], 'name': b['name'], 'abbreviation': b['abbreviation'], 'testament': b['testament']}}
THEMES = [{'id': i+1, 'slug': s, 'name': n, 'position': i+1} for i, (s, n) in enumerate([('amor','Amor'),('fe','Fé'),('esperanca','Esperança'),('familia','Família'),('perdao','Perdão'),('gratidao','Gratidão'),('sabedoria','Sabedoria'),('momentos-dificeis','Momentos difíceis')])]

state = {'favorites': set(), 'logged': False, 'done': [], 'calls': [], 'plans': [], 'items': [], 'progress': [], 'admin': True, 'articles': [], 'churches': [], 'schedules': []}
CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range'}

def handle(route, request):
    url = urlparse(request.url); q = parse_qs(url.query); path = url.path
    if request.method == 'OPTIONS':
        return route.fulfill(status=204, headers=CORS)
    state['calls'].append(f"{request.method} {path}?{url.query[:80]}")
    def ok(body, status=200, extra=None):
        h = {**CORS, 'content-type': 'application/json'}; h.update(extra or {})
        route.fulfill(status=status, headers=h, body=json.dumps(body))
    accept = request.headers.get('accept', '')
    single = 'vnd.pgrst.object' in accept
    t = path.split('/rest/v1/')[-1] if '/rest/v1/' in path else None
    if t == 'books': return ok(BOOKS)
    if t == 'themes': return ok(THEMES)
    if t == 'verses':
        rows = V
        for k, key in (('book_id','book_id'),('chapter','chapter'),('verse','verse')):
            if k in q and q[k][0].startswith('eq.'): rows = [r for r in rows if str(r[key]) == q[k][0][3:]]
        if 'text' in q and q['text'][0].startswith('ilike.'):
            term = q['text'][0][6:].strip('%').lower(); rows = [r for r in rows if term in r['text'].lower()]
        if request.method == 'HEAD': return route.fulfill(status=200, headers={**CORS, 'content-range': f'*/35804'})
        out = [emb(r) for r in sorted(rows, key=lambda r: (r['chapter'], r['verse']) if 'chapter' in q else r['id'])]
        if single: return ok(out[0] if out else {}, 200)
        return ok(out)
    if t in ('editorial_reflections', 'verse_themes'): return ok(None if single else [])
    if t == 'favorites':
        if request.method == 'POST': 
            state['favorites'].add(json.loads(request.post_data)['verse_id']); return ok([], 201)
        if request.method == 'DELETE':
            vid = int(q['verse_id'][0][3:]); state['favorites'].discard(vid); return ok([], 204)
        sel = q.get('select', [''])[0]
        if 'verses(' in sel: return ok([{'verse_id': i, 'created_at': '2026-10-23T10:00:00Z', 'verses': emb(next(r for r in V if r['id'] == i))} for i in state['favorites']])
        return ok([{'verse_id': i} for i in state['favorites']])
    if t == 'user_roles': return ok([{'role': 'admin'}] if state['admin'] else [])
    if t == 'cities': return ok([{'id': 'city1', 'name': 'São José do Rio Preto'}])
    if t in ('favorite_churches', 'admin_audit_log'): return ok([], 201 if request.method == 'POST' else 200)
    if t == 'church_articles':
        if request.method in ('POST', 'PATCH', 'DELETE'):
            body = json.loads(request.post_data) if request.post_data else {}
            if request.method == 'POST': state['articles'].append({'id': f"a{len(state['articles'])+1}", 'updated_at': '2026-10-27T10:00:00Z', **body})
            return ok([], 201)
        rows = state['articles']
        if q.get('status', [''])[0] == 'eq.published': rows = [a for a in rows if a['status'] == 'published']
        return ok(rows)
    if t == 'churches':
        if request.method in ('POST', 'PATCH', 'DELETE'):
            body = json.loads(request.post_data) if request.post_data else {}
            if request.method == 'POST': state['churches'].append({'id': f"c{len(state['churches'])+1}", 'updated_at': '2026-10-27T10:00:00Z', **body})
            return ok([], 201)
        rows = state['churches']
        if q.get('published', [''])[0] == 'eq.true': rows = [c for c in rows if c['published']]
        return ok([{**c, 'mass_schedules': [s for s in state['schedules'] if s['church_id'] == c['id']]} for c in rows])
    if t == 'mass_schedules':
        if request.method in ('POST', 'PATCH', 'DELETE'): return ok([], 201)
        return ok(state['schedules'])
    if t == 'reading_plans':
        if request.method == 'POST':
            body = json.loads(request.post_data); pl = {'id': 'p1', 'title': body['title'], 'created_at': '2026-10-27T10:00:00Z'}; state['plans'].append(pl)
            return ok(pl if single else [pl], 201)
        return ok(state['plans'])
    if t == 'reading_plan_items':
        if request.method == 'POST':
            for b in json.loads(request.post_data): state['items'].append({'id': f"i{len(state['items'])+1}", **b})
            return ok([], 201)
        return ok(state['items'])
    if t == 'reading_plan_progress':
        if request.method == 'POST': state['progress'].append(json.loads(request.post_data)['item_id']); return ok([], 201)
        if request.method == 'DELETE': 
            iid = q['item_id'][0][3:]; state['progress'] = [x for x in state['progress'] if x != iid]; return ok([], 204)
        return ok([{'item_id': x} for x in state['progress']])
    if t in ('notes', 'collections', 'reading_history', 'collection_items'): return ok(None if single else [])
    if t == 'profiles':
        if request.method in ('POST', 'PATCH'): return ok([], 201)
        prof = {'display_name': 'Guilherme', 'timezone': 'America/Sao_Paulo', 'practice_goal': 4, 'last_book_id': 1, 'last_chapter': 1, 'theme': 'system', 'font_size': 'md', 'reading_mode': None}
        return ok(prof if single else [prof])
    if t == 'activity_types':
        if request.method in ('POST', 'PATCH'): return ok([], 201)
        return ok([{'id': f'a{i}', 'key': k, 'label': l, 'enabled': True} for i, (k, l) in enumerate([('bible','Ler a Bíblia'),('prayer','Oração'),('liturgy','Liturgia do dia'),('reflection','Reflexão'),('reading_plan','Plano de leitura')])])
    if 'rpc/get_walk' in path:
        return ok({'today': '2026-10-23', 'last_day': '2026-10-22', 'streak': {'current_streak': 3, 'longest_streak': 7, 'total_days': 12}, 'days': ['2026-10-18','2026-10-20','2026-10-21','2026-10-22'], 'done': state['done']})
    if 'rpc/set_practice_activity' in path:
        b = json.loads(request.post_data); 
        (state['done'].append(b['p_key']) if b['p_done'] and b['p_key'] not in state['done'] else (state['done'].remove(b['p_key']) if not b['p_done'] and b['p_key'] in state['done'] else None)); return ok(None)
    if '/auth/v1/user' in path: return ok({'id': 'u1', 'email': 'teste@exemplo.com', 'aud': 'authenticated', 'role': 'authenticated', 'user_metadata': {}})
    if '/auth/v1/' in path: return ok({})
    return ok([])

def fake_jwt():
    b = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b'=').decode()
    return f"{b({'alg':'HS256','typ':'JWT'})}.{b({'sub':'u1','aud':'authenticated','role':'authenticated','exp':4102444800})}.sig"

def session():
    return json.dumps({'access_token': fake_jwt(), 'refresh_token': 'r', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': 4102444800,
        'user': {'id': 'u1', 'aud': 'authenticated', 'role': 'authenticated', 'email': 'teste@exemplo.com', 'app_metadata': {}, 'user_metadata': {}, 'created_at': '2026-01-01T00:00:00Z'}})

BASE = 'http://127.0.0.1:4173'
results = []
def check(name, cond, extra=''):
    results.append((name, bool(cond), extra)); print(('PASS' if cond else 'FAIL'), name, extra)

with sync_playwright() as p:
    br = p.chromium.launch()
    def page_for(w, h, dark=False, logged=False):
        ctx = br.new_context(viewport={'width': w, 'height': h}, color_scheme='dark' if dark else 'light', locale='pt-BR', timezone_id='America/Sao_Paulo')
        if logged: ctx.add_init_script(f"localStorage.setItem('sb-frfklrtopivnyguoytrw-auth-token', {json.dumps(session())})")
        ctx.route('**/*.supabase.co/**', handle)
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text and 'fonts' not in m.text else None)
        return pg, errs
    S = lambda name: f'/home/claude/shots/{name}.png'

    # ---------- deslogado, desktop claro ----------
    pg, errs = page_for(1280, 900)
    pg.goto(BASE + '/'); pg.wait_for_selector('text=Palavra do dia'); pg.wait_for_timeout(600)
    check('home: saudação e Palavra do dia', pg.locator('h1').first.inner_text().endswith('.') and pg.locator('article').count() == 1)
    check('home: aviso de teste visível', pg.locator('text=Texto de teste em inglês').count() >= 1)
    pg.screenshot(path=S('home_desktop_light'), full_page=True)
    pg.goto(BASE + '/biblia'); pg.wait_for_selector('text=Antigo Testamento'); 
    check('bíblia: 73 livros listados', pg.locator('ul.surface li').count() == 73)
    pg.get_by_role('button', name=re.compile('^João')).click(); pg.wait_for_timeout(200)
    check('bíblia: João abre 21 capítulos', pg.locator('a[href^="/biblia/joao/"]').count() == 21)
    pg.screenshot(path=S('biblia_desktop'))
    # capítulo: contínuo por padrão em Gênesis
    pg.goto(BASE + '/biblia/genesis/1'); pg.wait_for_selector('sup'); 
    check('capítulo Gênesis 1: modo contínuo padrão', pg.get_by_role('button', name='Contínuo').get_attribute('aria-pressed') == 'true' and pg.locator('sup').count() == 8)
    pg.get_by_role('button', name=re.compile('Versículo 3:')).click(); pg.wait_for_timeout(700)
    check('contínuo: toolbar de ações ao tocar', pg.get_by_role('toolbar').count() == 1)
    pg.screenshot(path=S('capitulo_continuo_desktop'))
    pg.get_by_role('button', name='Versículos').click(); pg.wait_for_selector('ol li')
    check('alternar para versículos', pg.locator('ol li').count() == 8)
    # escolha explícita vale para todos os livros
    pg.goto(BASE + '/biblia/salmos/22'); pg.wait_for_selector('text=Salmos 22')
    check('Salmos: com escolha explícita "Versículos" segue em versículos', pg.get_by_role('button', name='Versículos').get_attribute('aria-pressed') == 'true')
    # padrão do livro sem escolha explícita
    pg2, errs2 = page_for(1280, 900)
    pg2.goto(BASE + '/biblia/salmos/22'); pg2.wait_for_selector('text=Salmos 22'); pg2.wait_for_timeout(400)
    check('Salmos: padrão = versículos', pg2.get_by_role('button', name='Versículos').get_attribute('aria-pressed') == 'true' and pg2.locator('ol li').count() == 5)
    pg2.screenshot(path=S('salmo22_desktop'))
    # João vs Jó: endereços
    pg2.goto(BASE + '/biblia/joao/3'); pg2.wait_for_selector('h1:has-text("João 3")')
    pg2.goto(BASE + '/biblia/jo/3'); pg2.wait_for_selector('h1:has-text("Jó 3")'); check('endereços: /jo = Jó, /joao = João', True)
    pg2.goto(BASE + '/biblia/xyz/1'); pg2.wait_for_selector('text=Capítulo não encontrado'); check('capítulo inexistente: mensagem', True)
    # compartilhar como imagem
    pg.goto(BASE + '/biblia/joao/3'); pg.wait_for_selector('ol li')
    pg.locator('ol li').nth(2).get_by_role('button', name='Compartilhar como imagem').click(); pg.wait_for_selector('dialog img'); pg.wait_for_timeout(500)
    dim = pg.evaluate("(() => { const i = document.querySelector('dialog img'); return [i.naturalWidth, i.naturalHeight]; })()")
    check('imagem: cartão 1080x1350', dim == [1080, 1350], str(dim))
    pg.screenshot(path=S('compartilhar_dialog'))
    with pg.expect_download() as dl: pg.get_by_role('button', name='Baixar').click()
    path = dl.value.path(); import os
    check('imagem: download PNG com conteúdo', dl.value.suggested_filename.endswith('.png') and os.path.getsize(path) > 8000, dl.value.suggested_filename)
    pg.locator('dialog').get_by_role('button', name='Escuro', exact=True).click(); pg.wait_for_timeout(700)
    check('imagem: alternar para escuro regenera', pg.locator('dialog img').count() == 1)
    pg.keyboard.press('Escape')
    # explorar: referência e texto
    pg2.goto(BASE + '/explorar'); pg2.wait_for_selector('article')
    pg2.get_by_label('Buscar versículos').fill('Jo 3,16'); pg2.keyboard.press('Enter'); pg2.wait_for_timeout(500)
    check('explorar: "Jo 3,16" → João 3,16', pg2.locator('article').count() == 1 and 'João 3,16' in pg2.locator('article').inner_text())
    pg2.get_by_label('Buscar versículos').fill('shepherd'); pg2.keyboard.press('Enter'); pg2.wait_for_timeout(400)
    check('explorar: busca por palavra sem resultado no mock mostra estado vazio', pg2.locator('text=Nenhum resultado').count() == 1)
    pg2.goto(BASE + '/explorar?tema=amor'); pg2.wait_for_selector('text=Este tema ainda não tem versículos'); check('explorar: tema sem associações → estado vazio honesto', True)
    pg2.goto(BASE + '/favoritos'); pg2.wait_for_selector('text=Entre na sua conta'); check('favoritos deslogado: convite para entrar', True)
    pg2.goto(BASE + '/caminhada'); pg2.wait_for_selector('text=Entre na sua conta'); check('caminhada deslogado: convite para entrar', True)
    pg2.goto(BASE + '/perfil'); pg2.wait_for_selector('text=Esqueci minha senha')
    pg2.get_by_label('E-mail').fill('x'); pg2.get_by_role('button', name='Entrar', exact=True).last.click(); pg2.wait_for_timeout(200)
    check('perfil: validação de e-mail', pg2.locator('text=Informe um e-mail válido').count() == 1)
    pg2.screenshot(path=S('perfil_deslogado'))
    pg2.goto(BASE + '/catolica'); pg2.wait_for_selector('span:text("Em breve")'); pg2.screenshot(path=S('catolica_desktop'))
    check('católica: 3 seções ainda "Em breve" (notícias, santo, liturgia)', pg2.locator('span:text-is("Em breve")').count() == 3)
    check('sem erros de console (deslogado)', not errs and not errs2, str(errs + errs2)[:300])

    # ---------- celular escuro deslogado ----------
    pm, errm = page_for(390, 844, dark=True)
    pm.goto(BASE + '/'); pm.wait_for_selector('text=Palavra do dia'); pm.wait_for_timeout(500)
    check('mobile: barra inferior com 6 destinos', pm.locator('nav[aria-label="Principal"]:visible a').count() == 6)
    check('mobile: modo escuro aplicado', pm.evaluate("document.documentElement.classList.contains('dark')"))
    check('mobile: sem rolagem horizontal', pm.evaluate("document.documentElement.scrollWidth <= window.innerWidth"))
    pm.screenshot(path=S('home_mobile_dark'), full_page=True)
    pm.goto(BASE + '/biblia/genesis/1'); pm.wait_for_selector('sup'); pm.screenshot(path=S('capitulo_mobile_dark'))
    check('mobile cap.: sem rolagem horizontal', pm.evaluate("document.documentElement.scrollWidth <= window.innerWidth"))

    # ---------- logado ----------
    pl, errl = page_for(1280, 900, logged=True)
    pl.goto(BASE + '/biblia/joao/3'); pl.wait_for_selector('sup'); pl.wait_for_timeout(500)
    pl.get_by_role('button', name=re.compile('Versículo 16:')).click()
    pl.get_by_role('toolbar').get_by_role('button', name='Favoritar').click(); pl.wait_for_timeout(500)
    check('logado: favoritar versículo (POST enviado)', 16 and any('POST /rest/v1/favorites' in c for c in state['calls']))
    pl.goto(BASE + '/favoritos'); pl.wait_for_selector('article'); 
    check('favoritos: lista o versículo favoritado', pl.locator('article').count() == 1 and 'João 3,16' in pl.locator('article').inner_text())
    pl.screenshot(path=S('favoritos_logado'))
    pl.goto(BASE + '/caminhada'); pl.wait_for_selector('text=Hoje'); pl.wait_for_timeout(400)
    check('caminhada: resumo (3 / 12 / 7)', pl.locator('text=dias seguidos').count() == 1 and pl.locator('p.font-serif').all_inner_texts()[:3] == ['3', '12', '7'])
    check('caminhada: 5 atividades', pl.locator('section[aria-labelledby="hoje"] li').count() == 5)
    pl.get_by_role('button', name='Oração').first.click(); pl.wait_for_timeout(500)
    check('caminhada: marcar atividade chama o backend', any('rpc/set_practice_activity' in c for c in state['calls']) and pl.get_by_role('button', name='Oração').first.get_attribute('aria-pressed') == 'true')
    pl.screenshot(path=S('caminhada_logado'), full_page=True)
    pl.goto(BASE + '/perfil'); pl.wait_for_selector('text=Leitura e aparência'); pl.screenshot(path=S('perfil_logado'), full_page=True)
    pl.get_by_role('button', name='Escuro', exact=True).click(); pl.wait_for_timeout(200)
    check('perfil: alternar para tema escuro', pl.evaluate("document.documentElement.classList.contains('dark')"))
    # planos de leitura
    pl.goto(BASE + '/planos'); pl.wait_for_selector('text=Começar plano'); 
    check('planos: 4 planos oferecidos', pl.locator('ul > li.surface').count() == 4)
    pl.locator('li.surface', has_text='Evangelhos').get_by_role('button', name='Começar plano').click(); pl.wait_for_url('**/planos/p1'); pl.wait_for_selector('text=Ler agora')
    check('plano: criou 89 itens (Mateus 28 + Marcos 16 + Lucas 24 + João 21)', len(state['items']) == 89)
    check('plano: próxima leitura é Mateus 1', pl.locator('a:has-text("Ler agora: Mateus 1")').count() == 1)
    pl.get_by_role('button', name='Mateus 1: não lido').click(); pl.wait_for_timeout(600)
    check('plano: marcar capítulo grava progresso e registra na caminhada', len(state['progress']) == 1 and 'reading_plan' in state['done'])
    check('plano: próxima leitura avança para Mateus 2', pl.locator('a:has-text("Ler agora: Mateus 2")').count() == 1)
    pl.screenshot(path=S('plano_detalhe'))
    pl.get_by_role('button', name='Mateus 1: lido').click(); pl.wait_for_timeout(400)
    check('plano: desmarcar remove o progresso', len(state['progress']) == 0)
    pl.goto(BASE + '/planos'); pl.wait_for_selector('text=Continuar'); check('planos: plano iniciado mostra "Continuar"', pl.locator('li.surface', has_text='Evangelhos').get_by_role('link', name='Continuar').count() == 1)
    check('sem erros de console (logado)', not errl, str(errl)[:300])

    # ---------- área Católica ----------
    CH = lambda i, **o: {'id': i, 'city_id': 'city1', 'name': 'Catedral', 'popular_name': None, 'parish': 'Paróquia Teste', 'diocese': None, 'address': 'Rua A, 100', 'neighborhood': 'Centro', 'latitude': None, 'longitude': None, 'phone': '(17) 3000-0000', 'website': 'javascript:alert(1)', 'social': None, 'accessibility': None, 'notes': None, 'source': 'Secretaria da paróquia', 'verified_at': '2026-10-20', 'published': True, **o}
    SC = lambda cid, **o: {'id': f"s{len(state['schedules'])}", 'church_id': cid, 'weekday': 0, 'time': '19:00:00', 'kind': 'missa', 'schedule_type': 'regular', 'confirmed': True, 'source': 'Secretaria', 'verified_at': '2026-10-20', 'note': None, **o}
    pc, errc = page_for(1280, 900)
    pc.goto(BASE + '/catolica'); pc.wait_for_selector('text=Entenda a Igreja'); pc.wait_for_timeout(500)
    check('católica: sem conteúdo publicado diz "Em preparação"', pc.locator('text=Em preparação').count() == 1)
    check('católica: visitante não vê link do painel', pc.locator('text=Painel administrativo').count() == 0)
    pc.goto(BASE + '/catolica/entenda'); pc.wait_for_selector('text=Conteúdo em revisão'); check('entenda: vazio honesto', True)
    pc.goto(BASE + '/catolica/igrejas'); pc.wait_for_selector('text=Catálogo em construção'); check('igrejas: vazio honesto', pc.locator('text=Ainda não há igrejas publicadas').count() == 1)
    state['articles'] = [
        {'id': 'a1', 'module': 'sacramentos', 'slug': 'batismo', 'title': 'Batismo', 'summary': 'Primeiro sacramento.', 'body': 'Texto do **batismo**.\n\n## Detalhes\n\n- um\n- dois', 'sources': [{'label': 'Catecismo'}, {'label': 'Link ruim', 'url': 'javascript:alert(1)'}, {'label': 'CNBB', 'url': 'https://www.cnbb.org.br'}], 'status': 'published', 'position': 1, 'reviewed_by': 'Pe. Teste', 'reviewed_at': '2026-10-20', 'updated_at': ''},
        {'id': 'a2', 'module': 'estrutura', 'slug': 'rascunho-secreto', 'title': 'Rascunho secreto', 'summary': '', 'body': '', 'sources': [], 'status': 'draft', 'position': 1, 'reviewed_by': None, 'reviewed_at': None, 'updated_at': ''}]
    pc.goto(BASE + '/catolica/entenda'); pc.wait_for_selector('text=Sacramentos')
    check('entenda: lista só textos publicados', pc.locator('text=Batismo').count() >= 1 and pc.locator('text=Rascunho secreto').count() == 0)
    pc.get_by_role('link', name=re.compile('Batismo')).click(); pc.wait_for_selector('article h1')
    check('artigo: mostra revisor, data e identifica como editorial', 'Revisado por Pe. Teste em 20/10/2026' in pc.locator('footer').inner_text() and 'Conteúdo editorial do Verbum' in pc.locator('footer').inner_text())
    check('artigo: link inseguro não vira link, link https vira', pc.locator('footer a[href^="javascript"]').count() == 0 and pc.locator('footer a[href="https://www.cnbb.org.br"]').count() == 1)
    check('artigo: lista e subtítulo renderizados', pc.locator('article .space-y-4 li').count() == 2 and pc.locator('article h2').count() == 1)
    pc.screenshot(path=S('artigo_entenda'))
    pc.goto(BASE + '/catolica/entenda/rascunho-secreto'); pc.wait_for_selector('text=Texto não encontrado'); check('artigo em rascunho não abre para o público', True)

    state['churches'] = [CH('c1', name='Catedral', neighborhood='Centro'), CH('c2', name='Capela São José', neighborhood='Boa Vista', published=True, website='https://exemplo.com.br'), CH('c3', name='Oculta', published=False)]
    state['schedules'] = [SC('c1', weekday=0, time='19:00:00'), SC('c1', weekday=0, time='08:00:00', confirmed=False, source=None, verified_at=None), SC('c1', weekday=3, time='07:00:00', verified_at='2026-03-01'), SC('c2', weekday=6, time='18:00:00', confirmed=False, source=None, verified_at=None)]
    pc.goto(BASE + '/catolica/igrejas'); pc.wait_for_selector('text=Catedral')
    check('igrejas: só publicadas aparecem (2 de 3)', pc.locator('ul.space-y-3 > li').count() == 2 and pc.locator('text=Oculta').count() == 0)
    check('igrejas: aviso de cobertura honesto', 'Não afirmamos que ele cobre todas as igrejas' in pc.locator('[role=note]').inner_text() and '1 com horário de missa confirmado' in pc.locator('[role=note]').inner_text())
    pc.get_by_label('Dia da semana').select_option('0'); pc.wait_for_timeout(200)
    check('filtro dia: domingo só com missa confirmada → Catedral', pc.locator('ul.space-y-3 > li').count() == 1 and 'Catedral' in pc.locator('ul.space-y-3').inner_text())
    pc.get_by_label('Dia da semana').select_option('6'); pc.wait_for_timeout(200)
    check('filtro dia: sábado só tem horário NÃO confirmado → ninguém', pc.locator('text=Nenhuma igreja encontrada').count() == 1)
    pc.get_by_label('Dia da semana').select_option(''); pc.get_by_label('Bairro').select_option('Boa Vista'); pc.wait_for_timeout(200)
    check('filtro bairro', pc.locator('ul.space-y-3 > li').count() == 1)
    pc.goto(BASE + '/catolica/igrejas/c1'); pc.wait_for_selector('text=Missas e confissões')
    txt = pc.locator('section[aria-labelledby=agenda]').inner_text()
    check('detalhe: confirmado, não confirmado e antigo (>3 meses) rotulados', 'Confirmado em 20/10/2026' in txt and 'Horário não confirmado' in txt and 'há mais de 3 meses' in txt, txt[:200].replace('\n', ' | '))
    check('detalhe: rota pelo endereço e site inseguro não vira link', pc.locator('a:has-text("Abrir rota")').get_attribute('href').startswith('https://www.google.com/maps/search') and pc.locator('dl a[target=_blank]').count() == 0)
    pc.screenshot(path=S('igreja_detalhe'))
    pc.goto(BASE + '/catolica/igrejas/c2'); pc.wait_for_selector('text=Missas e confissões')
    check('detalhe: sem horário confirmado mostra aviso e site', pc.locator('text=Horário não confirmado').count() >= 1)
    check('católica (público): sem erros de console', not errc, str(errc)[:300])

    # ---------- painel administrativo ----------
    pa0, e0 = page_for(1280, 900)
    pa0.goto(BASE + '/admin'); pa0.wait_for_selector('text=Área restrita'); check('admin: visitante vê convite para entrar', True)
    state['admin'] = False
    pn, en = page_for(1280, 900, logged=True)
    pn.goto(BASE + '/admin'); pn.wait_for_selector('text=Acesso restrito'); check('admin: usuário comum bloqueado', pn.locator('text=Novo texto').count() == 0)
    state['admin'] = True
    pa, ea = page_for(1280, 900, logged=True)
    pa.goto(BASE + '/catolica'); pa.wait_for_selector('text=Painel administrativo'); check('católica: administrador vê o atalho do painel', True)
    pa.goto(BASE + '/admin'); pa.wait_for_selector('text=Novo texto'); pa.wait_for_timeout(400)
    check('admin: lista com publicado e rascunho', pa.locator('text=Rascunho').count() >= 1 and pa.locator('text=Publicado').count() >= 1)
    pa.get_by_role('button', name='Editar Rascunho secreto').click(); pa.wait_for_selector('text=Editar texto')
    pa.get_by_label('Situação').select_option('published'); pa.get_by_role('button', name='Salvar').click(); pa.wait_for_timeout(400)
    check('admin: publicar sem revisor é bloqueado com aviso', pa.locator('text=informe quem revisou').count() == 1 and not any('PATCH /rest/v1/church_articles' in c for c in state['calls']))
    pa.get_by_label('Revisado por').fill('Pe. Teste'); pa.get_by_role('button', name='Salvar').click(); pa.wait_for_timeout(500)
    check('admin: publicar com revisor grava', any('PATCH /rest/v1/church_articles' in c for c in state['calls']))
    pa.get_by_role('tab', name='Igrejas e horários').click(); pa.wait_for_selector('text=Nova igreja')
    pa.get_by_role('button', name='Nova igreja').click(); pa.wait_for_selector('text=Nome oficial')
    pa.get_by_label('Nome oficial').fill('Igreja Nova'); pa.get_by_label('Publicada').check(); pa.get_by_role('button', name='Salvar igreja').click(); pa.wait_for_timeout(400)
    check('admin: publicar igreja sem fonte/data é bloqueado', pa.locator('text=informe a fonte dos dados').count() == 1 and not any('POST /rest/v1/churches' in c for c in state['calls']))
    pa.get_by_label('Publicada').uncheck(); pa.get_by_role('button', name='Salvar igreja').click(); pa.wait_for_timeout(500)
    check('admin: salvar igreja como rascunho grava', any('POST /rest/v1/churches' in c for c in state['calls']))
    pa.get_by_role('tab', name='Histórico').click(); pa.wait_for_selector('text=Sem alterações registradas'); check('admin: aba de histórico', True)
    pa.screenshot(path=S('admin_painel'))
    check('admin: sem erros de console', not (e0 + en + ea), str(e0 + en + ea)[:300])

    # ---------- terço ----------
    pt, errt = page_for(1280, 900)
    pt.goto(BASE + '/catolica/terco'); pt.wait_for_selector('text=Sugestão de hoje')
    check('terço: mostra 4 conjuntos de mistérios e a sugestão de hoje', pt.locator('ul > li.surface').count() == 4)
    pt.locator('li.surface').first.get_by_role('button', name='Rezar').click(); pt.wait_for_selector('svg[role=img]')
    check('terço: desenho com 59 contas (6 grandes + 53 pequenas)', pt.locator('circle[data-bead]').count() == 59)
    check('terço: começa com nenhuma conta preenchida', pt.locator('circle[data-bead].fill-olive').count() == 0)
    check('terço: primeiro passo é o Sinal da Cruz', pt.locator('h1').inner_text().startswith('Sinal da Cruz'))
    nxt = pt.get_by_role('button', name='Próxima conta')
    for _ in range(7): nxt.click()
    check('terço: após as orações iniciais chega ao 1º mistério', pt.locator('text=Anuncie o mistério').count() == 1 and 'Dezena 1 de 5' in pt.locator('svg[role=img]').get_attribute('aria-label'))
    pt.screenshot(path=S('terco_misterio'))
    nxt.click()
    check('terço: contas iniciais (3 Ave) ficaram preenchidas', pt.locator('circle[data-bead].fill-olive').count() == 5 and pt.locator('circle[data-bead].fill-gold').count() == 1)
    for _ in range(4): nxt.click()
    check('terço: Ave-Maria 5 de 10 e contas da dezena avançando', 'Ave-Maria' in pt.locator('h1').inner_text() and '5 de 10' in pt.locator('h1').inner_text() and pt.locator('circle[data-bead].fill-olive').count() == 5 + 4)
    pt.screenshot(path=S('terco_dezena'))
    pt.keyboard.press('ArrowLeft'); pt.wait_for_timeout(150)
    check('terço: seta ← volta uma conta', '4 de 10' in pt.locator('h1').inner_text())
    pt.keyboard.press('ArrowRight'); pt.wait_for_timeout(150)
    check('terço: seta → avança uma conta', '5 de 10' in pt.locator('h1').inner_text())
    pt.reload(); pt.wait_for_selector('text=Continuar de onde parei')
    check('terço: progresso salvo e oferecido ao voltar', pt.locator('text=Continuar de onde parei').count() == 1)
    pt.get_by_role('button', name='Continuar de onde parei').click(); pt.wait_for_selector('svg[role=img]')
    check('terço: continua exatamente do passo salvo', '5 de 10' in pt.locator('h1').inner_text())
    pt.get_by_role('button', name='Ocultar o texto da oração').click(); check('terço: oculta o texto da oração', pt.locator('p.verse-text').count() == 0)
    steps_left = 74 - 7 - 1 - 4 - 1 - 7   # passos que faltam até concluir (calculado abaixo pelo próprio botão)
    for _ in range(80):
        if pt.locator('text=Terço concluído').count() and pt.locator('h1').inner_text() == 'Terço concluído': break
        pt.get_by_role('button', name=re.compile('Próxima conta|Concluir')).click()
    check('terço: ao concluir mostra mensagem e todas as 59 contas preenchidas', pt.locator('h1', has_text='Terço concluído').count() == 1 and pt.locator('circle[data-bead].fill-olive').count() == 59)
    pt.screenshot(path=S('terco_concluido'))
    check('terço: visitante é convidado a entrar para registrar na caminhada', pt.locator('a:has-text("Entrar para registrar")').count() == 1)
    pt.goto(BASE + '/catolica/terco'); pt.wait_for_selector('text=Sugestão de hoje'); check('terço: depois de concluir não sobra progresso salvo', pt.locator('text=Continuar de onde parei').count() == 0)
    pt.goto(BASE + '/catolica/oracoes'); pt.wait_for_selector('text=Salve-Rainha'); check('orações: 7 orações listadas', pt.locator('ul > li.surface').count() == 7)
    check('terço/orações: sem erros de console', not errt, str(errt)[:300])
    ptl, errtl = page_for(1280, 900, logged=True)
    ptl.goto(BASE + '/catolica/terco'); ptl.wait_for_selector('text=Sugestão de hoje'); ptl.locator('li.surface').first.get_by_role('button', name='Rezar').click()
    for _ in range(80):
        if ptl.locator('h1', has_text='Terço concluído').count(): break
        ptl.get_by_role('button', name=re.compile('Próxima conta|Concluir')).click()
    ptl.get_by_role('button', name='Registrar na minha caminhada').click(); ptl.wait_for_timeout(500)
    check('terço: logado registra "Oração" na caminhada', 'prayer' in state['done'])
    ptm, errtm = page_for(390, 844, dark=True)
    ptm.goto(BASE + '/catolica/terco'); ptm.wait_for_selector('text=Sugestão de hoje'); ptm.locator('li.surface').first.get_by_role('button', name='Rezar').click(); ptm.wait_for_selector('svg[role=img]')
    for _ in range(12): ptm.get_by_role('button', name='Próxima conta').click()
    check('terço (celular): sem rolagem lateral', ptm.evaluate("document.documentElement.scrollWidth <= window.innerWidth"))
    ptm.screenshot(path=S('terco_mobile_dark'))
    br.close()

bad = [r for r in results if not r[1]]
print(f"\n{len(results)-len(bad)}/{len(results)} verificações ok")
sys.exit(1 if bad else 0)
