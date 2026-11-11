"""Controllers: reciben las acciones del usuario y llaman a models/services."""
import os, re, json, uuid, urllib.request, urllib.parse
from xml.sax.saxutils import escape
import models as M
from services import posiciones as pos, sanciones as san
from services.sanciones import Error

DOMINIO = 'clases.edu.sv'
CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
ADMINS = [s.strip().lower() for s in os.environ.get('ADMIN_EMAILS', 'admin@clases.edu.sv').split(',')]
SESIONES = {}

def _int(v):
    try: return int(v)
    except (TypeError, ValueError): return 0

def login(b):  # RN10 + no se guardan contraseñas
    if CLIENT_ID and b.get('credential'):
        try:
            with urllib.request.urlopen('https://oauth2.googleapis.com/tokeninfo?id_token=' + urllib.parse.quote(b['credential'])) as r: t = json.load(r)
        except Exception: raise Error('Token de Google inválido', 401)
        if t.get('aud') != CLIENT_ID: raise Error('Token de Google inválido', 401)
        correo, nombre = t['email'], t.get('name') or t['email']
    elif not CLIENT_ID:  # modo demostración
        correo = (b.get('correo') or '').strip(); nombre = b.get('nombre') or correo.split('@')[0]
    else: raise Error('Falta credencial')
    correo = correo.lower()
    if not correo.endswith('@' + DOMINIO): raise Error(f'Solo se permiten cuentas @{DOMINIO}', 403)
    u = M.usuarios.por_correo(correo)
    if not u: u = M.usuarios.crear(correo, nombre, 'comision' if correo in ADMINS else 'estudiante')
    elif correo in ADMINS and u['rol'] != 'comision': M.usuarios.a_comision(u['id']); u['rol'] = 'comision'
    token = str(uuid.uuid4()); SESIONES[token] = u['id']
    return dict(token=token, user=u)

def tid(q):
    if _int(q.get('torneo_id')): return _int(q['torneo_id'])
    t = M.torneos.listar(); return t[0]['id'] if t else 0

def validar_torneo(b):
    if b.get('fecha_inicio') and b.get('fecha_fin') and b['fecha_fin'] < b['fecha_inicio']: raise Error('La fecha de fin no puede ser anterior a la de inicio')
    if not b.get('anio'): raise Error('Falta el año')

def validar_partido(b, id=0):
    a, v = _int(b.get('equipo_local_id')), _int(b.get('equipo_visitante_id'))
    if not a or not v: raise Error('Selecciona ambos equipos')
    if a == v: raise Error('Un equipo no puede jugar contra sí mismo')
    L, V = M.equipos.buscar(a), M.equipos.buscar(v)
    if not L or not V or L['grupo_id'] != V['grupo_id']: raise Error('Ambos equipos deben ser del mismo grupo')
    if M.partidos.duplicado(L['grupo_id'], a, v, id): raise Error('Estos equipos ya se enfrentan (liga de una sola vuelta, RN1)')
    if not b.get('fecha'): raise Error('Falta la fecha')
    b['grupo_id'] = L['grupo_id']; b.setdefault('tecnico_local', L['entrenador']); b.setdefault('tecnico_visitante', V['entrenador'])

def dashboard(c):
    t = tid(c['query']); ps = M.partidos.listar(t); jug = [p for p in ps if p['estado'] == 'jugado']
    mj = max([p['jornada'] for p in ps], default=0); mjj = max([p['jornada'] for p in jug], default=0)
    pend = sorted([p for p in ps if p['estado'] != 'jugado'], key=lambda p: p['fecha'])
    return dict(equipos=len(M.equipos.listar(t)), jugados=len(jug), goles=sum(p['goles_local'] + p['goles_visitante'] for p in jug), rondas=f'{mjj}/{mj}',
                torneos_activos=len([x for x in M.torneos.listar() if x['estado'] == 'en_proceso']), sanciones=len(M.sanciones.activas(t)),
                ultimos=sorted(jug, key=lambda p: p['fecha'], reverse=True)[:3], proximo=pend[0] if pend else None)

def exportar(c):  # Excel (SpreadsheetML)
    t = tid(c['query'])
    def hoja(n, cols, rows):
        cel = lambda v: f'<Cell><Data ss:Type="{"Number" if isinstance(v, (int, float)) else "String"}">{escape(str(v if v is not None else ""))}</Data></Cell>'
        return f'<Worksheet ss:Name="{escape(n)}"><Table><Row>{"".join(cel(x) for x in cols)}</Row>{"".join("<Row>" + "".join(cel(v) for v in r) + "</Row>" for r in rows)}</Table></Worksheet>'
    h = hoja('Sanciones', ['Jugador', 'Equipo', 'Motivo', 'Cumplidos', 'Total'], [[s['jugador'], s['equipo'], s['tipo'], s['partidos_cumplidos'], s['partidos_suspendido']] for s in M.sanciones.activas(t)])
    h += hoja('Goleadores', ['Jugador', 'Equipo', 'Goles'], [[s['jugador'], s['equipo'], s['goles']] for s in M.stats.goleadores(t)])
    h += hoja('Amonestados', ['Jugador', 'Equipo', 'Amarillas', 'Rojas'], [[s['jugador'], s['equipo'], s['amarillas'], s['rojas']] for s in M.stats.amonestados(t)])
    for g in M.grupos.listar(t):
        h += hoja('Pos ' + g['nombre'], ['Pos', 'Equipo', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'PTS'], [[r[k] for k in ('pos', 'equipo', 'pj', 'pg', 'pe', 'pp', 'gf', 'gc', 'dg', 'pts')] for r in pos.tabla(g['id'])])
    return dict(raw='<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' + h + '</Workbook>',
                type='application/vnd.ms-excel', file='informes-infravenz.xls')

def nuevo_jugador(c):
    b = c['body']
    if not (b.get('nombre') and b.get('apellido') and b.get('carnet')): raise Error('Nombre, apellido y carnet son obligatorios')
    if M.jugadores.por_carnet(b['carnet']): raise Error('Ese carnet ya está registrado')
    return dict(id=M.jugadores.crear(b))

def nuevo_equipo(c):
    if not (c['body'].get('nombre') and c['body'].get('grupo_id')): raise Error('Nombre y grupo son obligatorios')
    return dict(id=M.equipos.crear(c['body']))

def editar_partido(c):
    p = M.partidos.buscar(c['params']['id']); b = c['body']
    if p['estado'] == 'jugado' and b.get('estado') not in (None, 'jugado'): raise Error('Un partido jugado no se puede modificar')
    if b.get('equipo_local_id'): validar_partido(b, p['id'])
    M.partidos.actualizar(p['id'], b); return {}

def nuevo_partido(c):
    validar_partido(c['body']); c['body']['estado'] = 'programado'; return dict(id=M.partidos.crear(c['body']))

def nuevo_torneo(c): validar_torneo(c['body']); return dict(id=M.torneos.crear(c['body']))
def editar_torneo(c): validar_torneo({'anio': 1, **c['body']}); M.torneos.actualizar(c['params']['id'], c['body']); return {}
def nuevo_grupo(c):
    if not c['body'].get('nombre'): raise Error('Falta el nombre')
    return dict(id=M.grupos.crear(c['body']))
def ok(fn): return lambda c: (fn(c), {})[1]

# (método, ruta, solo_admin, handler)
RUTAS = [
    ('GET', '/api/config', 0, lambda c: dict(googleClientId=CLIENT_ID, dominio=DOMINIO)),
    ('GET', '/api/me', 0, lambda c: c['user']),
    ('GET', '/api/dashboard', 0, dashboard),
    ('GET', '/api/torneos', 0, lambda c: M.torneos.listar()),
    ('POST', '/api/torneos', 1, nuevo_torneo),
    ('PUT', '/api/torneos/:id', 1, editar_torneo),
    ('DELETE', '/api/torneos/:id', 1, ok(lambda c: M.torneos.borrar(c['params']['id']))),
    ('GET', '/api/grupos', 0, lambda c: M.grupos.listar(tid(c['query']))),
    ('POST', '/api/grupos', 1, nuevo_grupo),
    ('DELETE', '/api/grupos/:id', 1, ok(lambda c: M.grupos.borrar(c['params']['id']))),
    ('GET', '/api/equipos', 0, lambda c: M.equipos.listar(tid(c['query']))),
    ('POST', '/api/equipos', 1, nuevo_equipo),
    ('PUT', '/api/equipos/:id', 1, ok(lambda c: M.equipos.actualizar(c['params']['id'], c['body']))),
    ('DELETE', '/api/equipos/:id', 1, ok(lambda c: M.equipos.borrar(c['params']['id']))),
    ('GET', '/api/jugadores', 0, lambda c: M.jugadores.listar(_int(c['query'].get('equipo_id')))),
    ('POST', '/api/jugadores', 1, nuevo_jugador),
    ('PUT', '/api/jugadores/:id', 1, ok(lambda c: M.jugadores.actualizar(c['params']['id'], c['body']))),
    ('DELETE', '/api/jugadores/:id', 1, ok(lambda c: M.jugadores.borrar(c['params']['id']))),
    ('GET', '/api/partidos', 0, lambda c: M.partidos.listar(tid(c['query']))),
    ('POST', '/api/partidos', 1, nuevo_partido),
    ('PUT', '/api/partidos/:id', 1, editar_partido),
    ('DELETE', '/api/partidos/:id', 1, ok(lambda c: M.partidos.borrar(c['params']['id']))),
    ('GET', '/api/partidos/:id/planilla', 0, lambda c: san.planilla(c['params']['id'])),
    ('POST', '/api/partidos/:id/planilla', 1, lambda c: san.guardar(_int(c['params']['id']), c['body'].get('stats') or [])),
    ('GET', '/api/posiciones', 0, lambda c: pos.tabla(_int(c['query'].get('grupo_id')))),
    ('GET', '/api/sanciones', 0, lambda c: M.sanciones.activas(tid(c['query']))),
    ('POST', '/api/sanciones/:id/ajustar', 1, ok(lambda c: san.ajustar(c['params']['id'], c['body'], c['user']['id']))),
    ('GET', '/api/goleadores', 0, lambda c: M.stats.goleadores(tid(c['query']))),
    ('GET', '/api/amonestados', 0, lambda c: M.stats.amonestados(tid(c['query']))),
    ('GET', '/api/exportar', 1, exportar),
]
_R = [(m, re.compile('^' + re.sub(r':(\w+)', r'(?P<\1>[^/]+)', p) + '$'), a, h) for m, p, a, h in RUTAS]

def manejar(metodo, ruta, query, body, auth):
    """Devuelve (código, resultado). resultado = dict/list (JSON) o dict con 'raw' (archivo)."""
    try:
        if metodo == 'POST' and ruta == '/api/login': return 200, login(body)
        for m, rx, admin, h in _R:
            mt = rx.match(ruta)
            if m == metodo and mt:
                user = None
                if ruta != '/api/config':
                    uid = SESIONES.get(auth.replace('Bearer ', '') or query.get('token'))
                    user = uid and M.uno('SELECT * FROM usuarios WHERE id=?', (uid,))
                    if not user: return 401, {'error': 'Sesión no válida'}
                    if admin and user['rol'] != 'comision': return 403, {'error': 'No tienes permiso para esta acción'}
                return 200, h(dict(params=mt.groupdict(), query=query, body=body, user=user))
        return 404, {'error': 'No encontrado'}
    except Error as e: return e.code, {'error': str(e)}
    except Exception as e:
        return (400, {'error': 'Dato duplicado'}) if 'UNIQUE' in str(e) else (500, {'error': str(e)})
