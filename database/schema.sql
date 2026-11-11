CREATE TABLE IF NOT EXISTS usuarios(
  id INT AUTO_INCREMENT PRIMARY KEY,
  correo VARCHAR(150) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  rol ENUM('comision','estudiante','docente') NOT NULL,
  password_hash VARCHAR(255) NULL
);
CREATE TABLE IF NOT EXISTS torneos(
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150),
  anio INT NOT NULL,
  fecha_inicio VARCHAR(10) NOT NULL,
  fecha_fin VARCHAR(10) NOT NULL,
  estado ENUM('en_proceso','terminado') NOT NULL DEFAULT 'en_proceso'
);
CREATE TABLE IF NOT EXISTS grupos(
  id INT AUTO_INCREMENT PRIMARY KEY,
  torneo_id INT NOT NULL,
  nombre VARCHAR(50) NOT NULL,
  FOREIGN KEY (torneo_id) REFERENCES torneos(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS equipos(
  id INT AUTO_INCREMENT PRIMARY KEY,
  grupo_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  logo MEDIUMTEXT,
  entrenador VARCHAR(100),
  FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS jugadores(
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipo_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  carnet VARCHAR(30) NOT NULL UNIQUE,
  FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS partidos(
  id INT AUTO_INCREMENT PRIMARY KEY,
  grupo_id INT NOT NULL,
  equipo_local_id INT NOT NULL,
  equipo_visitante_id INT NOT NULL,
  tecnico_local VARCHAR(100),
  tecnico_visitante VARCHAR(100),
  jornada INT NOT NULL DEFAULT 1,
  fecha VARCHAR(10) NOT NULL,
  hora VARCHAR(8),
  cancha VARCHAR(100),
  goles_local INT,
  goles_visitante INT,
  estado ENUM('programado','jugado','suspendido','reprogramado') NOT NULL DEFAULT 'programado',
  FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
  FOREIGN KEY (equipo_local_id) REFERENCES equipos(id) ON DELETE CASCADE,
  FOREIGN KEY (equipo_visitante_id) REFERENCES equipos(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS estadisticas_partido(
  id INT AUTO_INCREMENT PRIMARY KEY,
  partido_id INT NOT NULL,
  jugador_id INT NOT NULL,
  goles INT DEFAULT 0,
  asistencias INT DEFAULT 0,
  autogoles INT DEFAULT 0,
  amarillas INT DEFAULT 0,
  rojas INT DEFAULT 0,
  faltas_cometidas INT DEFAULT 0,
  faltas_recibidas INT DEFAULT 0,
  tiros INT DEFAULT 0,
  tiros_arco INT DEFAULT 0,
  pases_intentados INT DEFAULT 0,
  atajadas INT DEFAULT 0,
  UNIQUE KEY uq_partido_jugador (partido_id, jugador_id),
  FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE,
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS sanciones(
  id INT AUTO_INCREMENT PRIMARY KEY,
  jugador_id INT NOT NULL,
  partido_origen_id INT,
  tipo ENUM('amarillas','roja','agresion') NOT NULL,
  partidos_suspendido INT NOT NULL,
  partidos_cumplidos INT NOT NULL DEFAULT 0,
  activa INT NOT NULL DEFAULT 1,
  quitada_por INT,
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE,
  FOREIGN KEY (partido_origen_id) REFERENCES partidos(id) ON DELETE CASCADE,
  FOREIGN KEY (quitada_por) REFERENCES usuarios(id)
);