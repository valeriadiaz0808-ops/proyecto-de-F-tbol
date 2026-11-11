"""Conexión a la base de datos (SQLite, incluido en Python)."""
import sqlite3, threading, os
RUTA = os.path.join(os.path.dirname(__file__), 'futsal.db')
_conn = sqlite3.connect(RUTA, check_same_thread=False, isolation_level=None)
_conn.row_factory = lambda c, r: {d[0]: v for d, v in zip(c.description, r)}
_conn.execute('PRAGMA foreign_keys=ON')
_conn.executescript(open(os.path.join(os.path.dirname(__file__), 'schema.sql'), encoding='utf-8').read())
LOCK = threading.RLock()

def all(sql, p=()):
    return _conn.execute(sql, p).fetchall()

def get(sql, p=()):
    return _conn.execute(sql, p).fetchone()

def run(sql, p=()):
    """Ejecuta y devuelve el id insertado."""
    return _conn.execute(sql, p).lastrowid

class tx:
    """with tx(): ...  → todo o nada."""
    def __enter__(self): _conn.execute('BEGIN')
    def __exit__(self, t, e, tb):
        _conn.execute('ROLLBACK' if t else 'COMMIT'); return False
