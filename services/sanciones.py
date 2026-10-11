"""Servicio: planilla del partido y sanciones automáticas (RN3, RN4, RN5, RN6)."""
import models as M
from database.db import tx
F = ['goles', 'asistencias', 'autogoles', 'amarillas', 'rojas', 'faltas_cometidas', 'faltas_recibidas', 'tiros', 'tiros_arco', 'pases_intentados', 'atajadas']

class Error(Exception):
    def __init__(self, msg, code=400): super().__init__(msg); self.code = code

def _int(v):
    try: return max(0, int(v))
    except (TypeError, ValueError): return 0

def planilla(pid):
    p = M.partidos.detalle(pid)
    if not p: return None
    def jug(e):
        cols = ','.join(f'COALESCE(st.{f},0) {f}' for f in F)
        return M.todos(f"""SELECT j.id,j.nombre,j.apellido,j.carnet,
          EXISTS(SELECT 1 FROM sanciones s WHERE s.jugador_id=j.id AND s.activa=1 AND s.partido_origen_id!=?) suspendido,{cols}
          FROM jugadores j LEFT JOIN estadisticas_partido st ON st.jugador_id=j.id AND st.partido_id=? WHERE j.equipo_id=? ORDER BY j.apellido""", (pid, pid, e))
    return dict(partido=p, local=jug(p['equipo_local_id']), visitante=jug(p['equipo_visitante_id']))

def guardar(pid, stats):
    pl = planilla(pid)
    if not pl: raise Error('Partido no existe', 404)
    p = pl['partido']
    if p['estado'] == 'jugado': raise Error('La planilla ya fue guardada')
    L, V = {j['id'] for j in pl['local']}, {j['id'] for j in pl['visitante']}
    susp = {j['id'] for j in pl['local'] + pl['visitante'] if j['suspendido']}
    with tx():
        # el partido cuenta como cumplido para las sanciones vigentes de ambos equipos
        for s in M.todos('SELECT s.* FROM sanciones s JOIN jugadores j ON j.id=s.jugador_id WHERE s.activa=1 AND j.equipo_id IN(?,?)', (p['equipo_local_id'], p['equipo_visitante_id'])):
            c = s['partidos_cumplidos'] + 1
            M.run('UPDATE sanciones SET partidos_cumplidos=?,activa=? WHERE id=?', (c, 0 if c >= s['partidos_suspendido'] else 1, s['id']))
        gl = gv = nuevas = 0
        for s in stats:
            jid = s.get('jugador_id'); lado = 'L' if jid in L else 'V' if jid in V else None
            if not lado or jid in susp: continue
            v = [_int(s.get(f)) for f in F]
            M.run(f"INSERT OR REPLACE INTO estadisticas_partido(partido_id,jugador_id,{','.join(F)}) VALUES(?,?,{','.join('?' * len(F))})", (pid, jid, *v))
            g, ag, ro = v[0], v[2], v[4]
            if lado == 'L': gl += g; gv += ag
            else: gv += g; gl += ag
            tot = M.uno('SELECT SUM(amarillas) a FROM estadisticas_partido st JOIN partidos p ON p.id=st.partido_id WHERE st.jugador_id=? AND p.grupo_id=?', (jid, p['grupo_id']))['a'] or 0
            ya = M.uno("SELECT COUNT(*) n FROM sanciones WHERE jugador_id=? AND tipo='amarillas'", (jid,))['n']
            for _ in range(ya, tot // 2):                      # RN3: 2 amarillas → 1 partido
                M.run("INSERT INTO sanciones(jugador_id,partido_origen_id,tipo,partidos_suspendido) VALUES(?,?,'amarillas',1)", (jid, pid)); nuevas += 1
            if ro > 0:                                         # RN4: roja → 2 partidos
                M.run("INSERT INTO sanciones(jugador_id,partido_origen_id,tipo,partidos_suspendido) VALUES(?,?,'roja',2)", (jid, pid)); nuevas += 1
            if s.get('agresion'):                              # RN5: agresión → 5 o más
                M.run("INSERT INTO sanciones(jugador_id,partido_origen_id,tipo,partidos_suspendido) VALUES(?,?,'agresion',5)", (jid, pid)); nuevas += 1
        M.run("UPDATE partidos SET goles_local=?,goles_visitante=?,estado='jugado' WHERE id=?", (gl, gv, pid))
    return dict(goles_local=gl, goles_visitante=gv, sanciones_nuevas=nuevas)

def ajustar(id, b, user_id):
    s = M.uno('SELECT * FROM sanciones WHERE id=?', (id,))
    if not s: raise Error('No existe', 404)
    if b.get('quitar'): M.run('UPDATE sanciones SET activa=0,quitada_por=? WHERE id=?', (user_id, id)); return
    n = max(1, _int(b.get('partidos_suspendido')) or 1)
    M.run('UPDATE sanciones SET partidos_suspendido=?,activa=? WHERE id=?', (n, 0 if s['partidos_cumplidos'] >= n else 1, id))
