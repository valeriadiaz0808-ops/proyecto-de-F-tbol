"""Conexión a la base de datos (MySQL con PyMySQL)."""
import os, threading
import pymysql
from pymysql.constants import FIELD_TYPE

HOST = os.environ.get('DB_HOST', '127.0.0.1')
PORT = int(os.environ.get('DB_PORT', 3307))
USER = os.environ.get('DB_USER', 'futsal')
PASSWORD = os.environ.get('DB_PASSWORD', 'futsal123')
NAME = os.environ.get('DB_NAME', 'futsal')

# En MySQL, SUM() devuelve Decimal, que rompe el JSON y range(). Lo convertimos a int.
_conv = pymysql.converters.conversions.copy()
_conv[FIELD_TYPE.NEWDECIMAL] = int
_conv[FIELD_TYPE.DECIMAL] = int

# 1) Crear la base de datos si no existe
_tmp = pymysql.connect(host=HOST, port=PORT, user=USER, password=PASSWORD, charset='utf8mb4', autocommit=True)
with _tmp.cursor() as c:
    c.execute(f'CREATE DATABASE IF NOT EXISTS `{NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
_tmp.close()

# 2) Conexión principal (autocommit, filas como diccionarios)
_conn = pymysql.connect(host=HOST, port=PORT, user=USER, password=PASSWORD, database=NAME,
                        charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor,
                        autocommit=True, conv=_conv)
LOCK = threading.RLock()

# 3) Crear las tablas (MySQL no tiene executescript, así que separamos por ;)
for _s in open(os.path.join(os.path.dirname(__file__), 'schema.sql'), encoding='utf-8').read().split(';'):
    if _s.strip():
        with _conn.cursor() as c:
            c.execute(_s)

def _ejecutar(sql, p=()):
    _conn.ping(reconnect=True)                   # MySQL cierra conexiones inactivas
    c = _conn.cursor()
    c.execute(sql.replace('?', '%s'), p)
    return c

def all(sql, p=()):
    c = _ejecutar(sql, p); r = list(c.fetchall()); c.close(); return r

def get(sql, p=()):
    c = _ejecutar(sql, p); r = c.fetchone(); c.close(); return r

def run(sql, p=()):
    """Ejecuta y devuelve el id insertado."""
    c = _ejecutar(sql, p); i = c.lastrowid; c.close(); return i

class tx:
    """with tx(): ...  → todo o nada."""
    def __enter__(self): _conn.begin()
    def __exit__(self, t, e, tb):
        _conn.rollback() if t else _conn.commit()
        return False