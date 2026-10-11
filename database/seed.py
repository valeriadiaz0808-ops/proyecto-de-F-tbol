"""Datos de ejemplo (solo se cargan si la base está vacía)."""
from database import db

def cargar():
    if db.get('SELECT COUNT(*) n FROM torneos')['n']: return
    T = db.run("INSERT INTO torneos(nombre,anio,fecha_inicio,fecha_fin) VALUES('Torneo Fútsal 2026 — Liga Académica',2026,'2026-09-15','2026-11-30')")
    G = {n: db.run('INSERT INTO grupos(torneo_id,nombre) VALUES(?,?)', (T, n)) for n in ('Grupo A', 'Grupo B')}
    eq = {'Grupo A': ['Titanes FC', 'Rayos del Sur', 'Atlético Central', 'Halcones 11', 'Real Informática', 'Leones FC'],
          'Grupo B': ['Élite 10', 'Cronos', 'Furia Académica', 'Águilas Negras', 'Fénix United', 'Lobos FC']}
    prof = ['Laura Vásquez', 'Mario Reyes', 'Sofía Martínez', 'Diego Herrera', 'Roberto Flores', 'Ana Campos']
    nom = ['Diego', 'Jorge', 'Kevin', 'Samuel', 'Mateo', 'Carlos', 'Ricardo', 'Joel']
    ape = ['Salazar', 'Molina', 'Arévalo', 'Pineda', 'Hernández', 'Henríquez', 'Montes', 'Romero']
    c, ids = 0, {}
    for g, nombres in eq.items():
        for i, n in enumerate(nombres):
            ids[n] = db.run('INSERT INTO equipos(grupo_id,nombre,entrenador) VALUES(?,?,?)', (G[g], n, 'Prof. ' + prof[i]))
            for j in range(7):
                c += 1
                db.run('INSERT INTO jugadores(equipo_id,nombre,apellido,carnet) VALUES(?,?,?,?)',
                       (ids[n], nom[(i + j) % 8], ape[(i * 3 + j) % 8] + ' ' + ape[(j + 2) % 8], f'2026-INF-{c:04d}'))
    def P(g, a, b, j, f, h, cancha, ga=None, gb=None):
        db.run('INSERT INTO partidos(grupo_id,equipo_local_id,equipo_visitante_id,tecnico_local,tecnico_visitante,jornada,fecha,hora,cancha,goles_local,goles_visitante,estado) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
               (G[g], ids[a], ids[b], 'Prof. ' + prof[eq[g].index(a)], 'Prof. ' + prof[eq[g].index(b)], j, f, h, cancha, ga, gb, 'programado' if ga is None else 'jugado'))
    P('Grupo A', 'Titanes FC', 'Rayos del Sur', 1, '2026-09-20', '14:00', 'Cancha Principal', 4, 2)
    P('Grupo A', 'Atlético Central', 'Halcones 11', 1, '2026-09-20', '15:30', 'Cancha Techada', 1, 1)
    P('Grupo A', 'Real Informática', 'Leones FC', 1, '2026-09-21', '14:00', 'Cancha Principal', 3, 0)
    P('Grupo B', 'Élite 10', 'Cronos', 1, '2026-09-22', '14:00', 'Cancha Principal', 1, 3)
    P('Grupo B', 'Furia Académica', 'Águilas Negras', 1, '2026-09-22', '15:30', 'Cancha Techada', 2, 2)
    P('Grupo B', 'Fénix United', 'Lobos FC', 1, '2026-09-23', '14:00', 'Cancha Principal', 0, 1)
    P('Grupo A', 'Titanes FC', 'Atlético Central', 2, '2026-10-11', '14:30', 'Cancha Techada')
    P('Grupo B', 'Fénix United', 'Águilas Negras', 2, '2026-10-11', '16:00', 'Cancha Principal')
    P('Grupo B', 'Cronos', 'Élite 10', 3, '2026-10-12', '15:30', 'Cancha Principal')
