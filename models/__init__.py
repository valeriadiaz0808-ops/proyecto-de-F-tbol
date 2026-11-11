"""Models: solo consultas a la base de datos."""
from database.db import all as todos, get as uno, run

COLS = {'torneos': ['nombre', 'anio', 'fecha_inicio', 'fecha_fin', 'estado'], 'grupos': ['torneo_id', 'nombre'],
        'equipos': ['grupo_id', 'nombre', 'logo', 'entrenador'], 'jugadores': ['equipo_id', 'nombre', 'apellido', 'carnet'],
        'partidos': ['grupo_id', 'equipo_local_id', 'equipo_visitante_id', 'tecnico_local', 'tecnico_visitante', 'jornada', 'fecha', 'hora', 'cancha', 'estado']}

class Crud:
    def __init__(self, t): self.t = t
    def _d(self, o): return {k: o[k] for k in COLS[self.t] if k in o}
    def crear(self, o):
        d = self._d(o); k = list(d)
        return run(f"INSERT INTO {self.t}({','.join(k)}) VALUES({','.join('?' * len(k))})", [d[x] for x in k])
    def actualizar(self, id, o):
        d = self._d(o)
        if d: run(f"UPDATE {self.t} SET {','.join(k + '=?' for k in d)} WHERE id=?", [*d.values(), id])
    def borrar(self, id): run(f'DELETE FROM {self.t} WHERE id=?', (id,))
    def buscar(self, id): return uno(f'SELECT * FROM {self.t} WHERE id=?', (id,))

class Usuarios:
    def por_correo(self, c): return uno('SELECT * FROM usuarios WHERE correo=?', (c,))
    def crear(self, correo, nombre, rol, password_hash=None):
        run('INSERT INTO usuarios(correo,nombre,rol,password_hash) VALUES(?,?,?,?)', (correo, nombre, rol, password_hash)); return self.por_correo(correo)
    def a_comision(self, id): run("UPDATE usuarios SET rol='comision' WHERE id=?", (id,))
    def poner_password(self, id, h): run('UPDATE usuarios SET password_hash=? WHERE id=?', (h, id))

class Torneos(Crud):
    def listar(self): return todos('SELECT * FROM torneos ORDER BY anio DESC,id DESC')
class Grupos(Crud):
    def listar(self, t): return todos('SELECT * FROM grupos WHERE torneo_id=? ORDER BY nombre', (t,))
class Equipos(Crud):
    def listar(self, t): return todos("""SELECT e.*,g.nombre grupo,(SELECT COUNT(*) FROM jugadores j WHERE j.equipo_id=e.id) n_jugadores,
      (SELECT COUNT(*) FROM partidos p WHERE p.estado='jugado' AND ((p.equipo_local_id=e.id AND p.goles_local>p.goles_visitante) OR (p.equipo_visitante_id=e.id AND p.goles_visitante>p.goles_local))) victorias
      FROM equipos e JOIN grupos g ON g.id=e.grupo_id WHERE g.torneo_id=? ORDER BY g.nombre,e.nombre""", (t,))

class Jugadores(Crud):
    def listar(self, e): return todos('SELECT j.*,EXISTS(SELECT 1 FROM sanciones s WHERE s.jugador_id=j.id AND s.activa=1) suspendido FROM jugadores j WHERE equipo_id=? ORDER BY apellido', (e,))
    def por_carnet(self, c): return uno('SELECT id FROM jugadores WHERE carnet=?', (c,))

PJOIN = 'SELECT p.*,el.nombre local,ev.nombre visitante,g.nombre grupo FROM partidos p JOIN equipos el ON el.id=p.equipo_local_id JOIN equipos ev ON ev.id=p.equipo_visitante_id JOIN grupos g ON g.id=p.grupo_id'
class Partidos(Crud):
    def listar(self, t): return todos(PJOIN + ' WHERE g.torneo_id=? ORDER BY p.jornada,p.fecha,p.hora', (t,))
    def detalle(self, id): return uno(PJOIN + ' WHERE p.id=?', (id,))
    def duplicado(self, g, a, b, ign=0):
        return uno('SELECT id FROM partidos WHERE grupo_id=? AND id!=? AND ((equipo_local_id=? AND equipo_visitante_id=?) OR (equipo_local_id=? AND equipo_visitante_id=?))', (g, ign, a, b, b, a))

class Sanciones:
    def activas(self, t): return todos("""SELECT s.*,j.nombre||' '||j.apellido jugador,j.carnet,e.nombre equipo FROM sanciones s JOIN jugadores j ON j.id=s.jugador_id
      JOIN equipos e ON e.id=j.equipo_id JOIN grupos g ON g.id=e.grupo_id WHERE s.activa=1 AND g.torneo_id=? ORDER BY s.id DESC""", (t,))

class Stats:
    def goleadores(self, t): return todos("""SELECT j.nombre||' '||j.apellido jugador,e.nombre equipo,SUM(s.goles) goles FROM estadisticas_partido s JOIN jugadores j ON j.id=s.jugador_id
      JOIN equipos e ON e.id=j.equipo_id JOIN grupos g ON g.id=e.grupo_id WHERE g.torneo_id=? GROUP BY j.id HAVING goles>0 ORDER BY goles DESC LIMIT 20""", (t,))
    def amonestados(self, t): return todos("""SELECT j.nombre||' '||j.apellido jugador,e.nombre equipo,SUM(s.amarillas) amarillas,SUM(s.rojas) rojas FROM estadisticas_partido s JOIN jugadores j ON j.id=s.jugador_id
      JOIN equipos e ON e.id=j.equipo_id JOIN grupos g ON g.id=e.grupo_id WHERE g.torneo_id=? GROUP BY j.id HAVING amarillas+rojas>0 ORDER BY rojas DESC,amarillas DESC LIMIT 20""", (t,))
    def jugador(self, id): return uno("""SELECT j.id jugador_id,j.nombre,j.apellido,j.carnet,e.nombre equipo,
        COALESCE(SUM(s.goles),0) goles,COALESCE(SUM(s.asistencias),0) asistencias,COALESCE(SUM(s.autogoles),0) autogoles,
        COALESCE(SUM(s.amarillas),0) amarillas,COALESCE(SUM(s.rojas),0) rojas,COALESCE(SUM(s.faltas_cometidas),0) faltas_cometidas,
        COALESCE(SUM(s.faltas_recibidas),0) faltas_recibidas,COALESCE(SUM(s.tiros),0) tiros,COALESCE(SUM(s.tiros_arco),0) tiros_arco,
        COALESCE(SUM(s.pases_intentados),0) pases_intentados,COALESCE(SUM(s.atajadas),0) atajadas,COUNT(s.id) partidos
        FROM jugadores j JOIN equipos e ON e.id=j.equipo_id LEFT JOIN estadisticas_partido s ON s.jugador_id=j.id
        WHERE j.id=? GROUP BY j.id,e.nombre""", (id,))

usuarios, torneos, grupos, equipos, jugadores, partidos, sanciones, stats = Usuarios(), Torneos('torneos'), Grupos('grupos'), Equipos('equipos'), Jugadores('jugadores'), Partidos('partidos'), Sanciones(), Stats()
