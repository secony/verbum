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

state = {'favorites': set(), 'logged': False, 'done': [], 'calls': []}
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
    pg2.goto(BASE + '/catolica'); pg2.wait_for_selector('text=Em breve'); pg2.screenshot(path=S('catolica_desktop'))
    check('católica: 5 seções "Em breve"', pg2.locator('text=Em breve').count() == 5)
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
    check('sem erros de console (logado)', not errl, str(errl)[:300])
    br.close()

bad = [r for r in results if not r[1]]
print(f"\n{len(results)-len(bad)}/{len(results)} verificações ok")
sys.exit(1 if bad else 0)
