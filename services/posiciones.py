"""Servicio: puntos (RN2) y clasificación (RN7, RN8)."""
from functools import cmp_to_key
import models as M

def tabla(grupo_id):
    eqs = M.todos('SELECT id,nombre,logo FROM equipos WHERE grupo_id=?', (grupo_id,))
    pj = M.todos("SELECT * FROM partidos WHERE grupo_id=? AND estado='jugado'", (grupo_id,))
    T = {e['id']: dict(equipo_id=e['id'], equipo=e['nombre'], logo=e['logo'], pj=0, pg=0, pe=0, pp=0, gf=0, gc=0, dg=0, pts=0) for e in eqs}
    for p in pj:
        a, b = T.get(p['equipo_local_id']), T.get(p['equipo_visitante_id'])
        if not a or not b: continue
        gl, gv = p['goles_local'], p['goles_visitante']
        a['pj'] += 1; b['pj'] += 1; a['gf'] += gl; a['gc'] += gv; b['gf'] += gv; b['gc'] += gl
        if gl > gv: a['pg'] += 1; b['pp'] += 1; a['pts'] += 3
        elif gl < gv: b['pg'] += 1; a['pp'] += 1; b['pts'] += 3
        else: a['pe'] += 1; b['pe'] += 1; a['pts'] += 1; b['pts'] += 1
    rows = list(T.values())
    for r in rows: r['dg'] = r['gf'] - r['gc']
    def directo(x, y):  # resultado entre ellos: <0 si x le ganó a y
        for p in pj:
            if {p['equipo_local_id'], p['equipo_visitante_id']} == {x['equipo_id'], y['equipo_id']}:
                gx, gy = (p['goles_local'], p['goles_visitante']) if p['equipo_local_id'] == x['equipo_id'] else (p['goles_visitante'], p['goles_local'])
                return gy - gx
        return 0
    def cmp(x, y):
        for c in (y['pts'] - x['pts'], y['dg'] - x['dg'], directo(x, y), y['gf'] - x['gf']):
            if c: return c
        return (x['equipo'] > y['equipo']) - (x['equipo'] < y['equipo'])
    rows.sort(key=cmp_to_key(cmp))
    for i, r in enumerate(rows): r['pos'] = i + 1; r['clasifica'] = i < 4
    return rows
