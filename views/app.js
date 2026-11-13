// Views + lógica de pantallas (cliente). Habla con /api/* (controllers)
const S = { token: localStorage.getItem('tk'), user: null, tab: 'inicio', torneo: null, torneos: [], grupos: [], grupoF: 'todos', q: '', abierto: null, jug: [], jornada: null, posG: null, sub: 'sanciones', pl: null, cfg: {} };
const $ = s => document.querySelector(s), esc = s => String(s ?? '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const isAdmin = () => S.user?.rol === 'comision';
const IC = { home: 'M3 11l9-8 9 8M5 10v10h14V10', trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3', cal: 'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4', table: 'M4 4h16v16H4zM4 10h16M4 15h16M10 4v16', file: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6', bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4', alert: 'M12 3L2 20h20zM12 10v5M12 17.5v.5', plus: 'M12 5v14M5 12h14', dl: 'M12 4v12M7 11l5 5 5-5M5 20h14', pin: 'M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11zM12 12a2 2 0 100-4 2 2 0 000 4', clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2', chev: 'M9 6l6 6-6 6', down: 'M6 9l6 6 6-6', search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5', back: 'M15 6l-6 6 6 6', edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4', trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13', out: 'M10 4H4v16h6M15 8l4 4-4 4M19 12H9',users: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8' };
const ico = (n, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${IC[n]}"/></svg>`;
const COL = ['#4a9eff', '#ff9f1a', '#00d26a', '#a78bfa', '#ff4d5e', '#22d3ee', '#fb923c', '#f472b6'];
const sig = n => { const w = n.replace(/[^\p{L} ]/gu, '').split(' ').filter(Boolean); return (w.length > 1 ? w.map(x => x[0]).join('') : w[0]).slice(0, 3).toUpperCase(); };
const col = n => COL[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % COL.length];
const shield = (n, logo, sz = 46) => logo ? `<img src="${esc(logo)}" width="${sz}" height="${sz}" style="object-fit:contain">` : `<svg class="shield" style="width:${sz}px;height:${sz * 1.08}px" viewBox="0 0 46 50"><path d="M23 2l19 6v16c0 12-8 19-19 24C12 43 4 36 4 24V8z" fill="${col(n)}22" stroke="${col(n)}" stroke-width="2"/><text x="23" y="30" text-anchor="middle" font-family="Barlow Condensed,Impact" font-weight="800" font-size="13" fill="${col(n)}">${sig(n)}</text></svg>`;
const fmtF = (f, h) => { if (!f) return ''; const d = new Date(f + 'T12:00'), hoy = new Date().toISOString().slice(0, 10); const t = f === hoy ? 'HOY' : d.toLocaleDateString('es', { weekday: 'short' }).replace('.', '').toUpperCase(); return `${t} · ${d.getDate()} ${d.toLocaleDateString('es', { month: 'short' }).replace('.', '').toUpperCase()}${h ? ' · ' + h : ''}`; };
const hoy = () => new Date().toISOString().slice(0, 10);
const ROLES_UI = [['comision', 'Comisión'], ['docente', 'Docente'], ['estudiante', 'Estudiante']];

async function api(p, m = 'GET', b) {
  const r = await fetch('/api' + p, { method: m, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + S.token }, body: b ? JSON.stringify(b) : undefined });
  const j = await r.json().catch(() => ({})); if (r.status === 401 && S.user) { logout(); } if (!r.ok) throw new Error(j.error || 'Error'); return j;
}
function toast(m, e) { const t = $('#toast'); t.textContent = m; t.className = e ? 'e' : ''; t.style.display = 'block'; clearTimeout(t.h); t.h = setTimeout(() => t.style.display = 'none', 3200); }
const tryDo = async fn => { try { await fn(); } catch (e) { toast(e.message, 1); } };

// ---------- Modal de formularios ----------
function modal(title, fields, onSubmit, extra = []) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<form><h2>${title}</h2>${fields.map(f => `<div class="fld"><label>${f.l}</label>${f.t === 'select' ? `<select name="${f.n}">${f.o.map(([v, l]) => `<option value="${esc(v)}" ${v == f.v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>` : `<input name="${f.n}" type="${f.t || 'text'}" value="${esc(f.v ?? '')}" ${f.min != null ? `min="${f.min}"` : ''}>`}</div>`).join('')}
  <div class="err"></div><div class="row"><button type="button" class="btn out sp" data-x>Cancelar</button><button class="btn sp">Guardar</button></div>${extra.map((e, i) => `<button type="button" class="btn red w" style="margin-top:10px" data-e="${i}">${e.label}</button>`).join('')}</form>`;
  document.body.append(m); const f = m.querySelector('form');
  m.onclick = e => { if (e.target === m || e.target.dataset.x != null) m.remove(); };
  extra.forEach((e, i) => f.querySelector(`[data-e="${i}"]`).onclick = async () => { try { await e.fn(); m.remove(); } catch (x) { f.querySelector('.err').textContent = x.message; } });
  f.onsubmit = async ev => { ev.preventDefault(); const v = Object.fromEntries(new FormData(f)); try { await onSubmit(v); m.remove(); } catch (x) { f.querySelector('.err').textContent = x.message; } };
  return m;
}
const confirmar = (msg, fn) => { if (confirm(msg)) tryDo(fn); };

// ---------- Estructura ----------
function logout() { localStorage.removeItem('tk'); S.token = null; S.user = null; render(); }
function shell(inner, fab = '') {
  const u = S.user, rol = u.rol === 'comision' ? 'Administrador · Comité Deportivo' : u.rol === 'docente' ? 'Docente' : 'Estudiante';
  const ini = u.nombre.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
  const N = [['inicio', 'home', 'Inicio'], ['torneos', 'trophy', 'Torneos'], ['partidos', 'cal', 'Partidos'], ['posiciones', 'table', 'Posiciones'], ['informes', 'file', 'Informes'], ...(isAdmin() ? [['comision', 'users', 'Comisión']] : [])];
  return `<header><div class="av" style="width:34px;height:34px;background:var(--gd);color:var(--g)">${ico('trophy', 16)}</div><div class="brand">Infravenz<b>Fútbol</b><small>TORNEO ACADÉMICO ${S.torneo?.anio || ''}</small></div>
  <button class="ib" data-act="bell">${ico('bell')}${S.alertas ? '<i></i>' : ''}</button><div class="me">${esc(u.nombre.split(' ').slice(0, 2).join(' '))}<br><span class="badge">● ${rol}</span></div><div class="av" data-act="logout" title="Cerrar sesión">${ini}</div></header>
  <main>${inner}</main>${fab}<nav>${N.map(([k, i, l]) => `<button class="${S.tab === k ? 'on' : ''}" data-act="tab" data-v="${k}">${ico(i, 20)}${l}</button>`).join('')}</nav>`;
}
async function render() {
  const app = $('#app');
  if (!S.token) return loginView(app);
  if (!S.user) { try { S.user = await api('/me'); } catch { return logout(); } }
  if (!S.torneos.length) { S.torneos = await api('/torneos'); S.torneo = S.torneos.find(t => t.estado === 'en_proceso') || S.torneos[0] || null; }
  const y = scrollY; try { app.innerHTML = await VIEWS[S.tab](); } catch (e) { app.innerHTML = shell(`<p class="err">${esc(e.message)}</p>`); } scrollTo(0, y);
}
const tq = () => S.torneo ? '?torneo_id=' + S.torneo.id : '';

// ---------- Pantalla 1: Login ----------
async function loginView(app) {
  S.cfg = await fetch('/api/config').then(r => r.json());
  const reg = S.modoReg;
  app.innerHTML = `<div class="login"><div class="logo">${ico('trophy', 38)}</div><div class="eyebrow">Instituto Nacional profesor Francisco Ventura Zelaya</div><h1>Infravenz<br><span style="color:var(--g)">Fútbol</span></h1><p class="sub" style="margin:14px 0 30px">Torneo académico de Fútsal. Consulta partidos, resultados y posiciones.</p>
    ${S.cfg.googleClientId ? '<div id="gbtn" style="display:flex;justify-content:center"></div>' : ''}  <p class="sub" style="margin-top:40px;font-size:11px">Acceso restringido a personal y estudiantes de INFRAVENZ</p></div>`;
  if (S.cfg.googleClientId) { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.onload = () => { google.accounts.id.initialize({ client_id: S.cfg.googleClientId, callback: r => entrar({ credential: r.credential }) }); google.accounts.id.renderButton($('#gbtn'), { theme: 'filled_black', size: 'large', text: 'signin_with', width: 320 }); }; document.head.append(s); }
}
const G = () => '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800z"/><path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.700-6c-2.100 1.400-4.900 2.300-8.200 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z"/></svg>';
async function entrar(b, ruta = '/api/login') { try { const r = await fetch(ruta, { method: 'POST', body: JSON.stringify(b) }); const j = await r.json(); if (!r.ok) throw new Error(j.error); S.token = j.token; S.user = j.user; localStorage.setItem('tk', j.token); render(); } catch (e) { toast(e.message, 1); } }

// ---------- Pantalla 2: Inicio ----------
const matchRow = p => `<button class="card mrow" data-act="tab" data-v="partidos"><span class="t">${esc(p.local)}</span><span class="sc"><span class="${p.goles_local > p.goles_visitante ? 'w' : ''}">${p.goles_local}</span> — <span class="${p.goles_local < p.goles_visitante ? 'w' : ''}">${p.goles_visitante}</span></span><span class="t2">${esc(p.visitante)}</span><small>${fmtF(p.fecha).split(' · ')[0] === 'HOY' ? 'Hoy' : p.fecha.slice(5)}</small></button>`;
const VIEWS = {
  async inicio() {
    const d = await api('/dashboard' + tq()), n = S.user.nombre.split(' ')[0], h = new Date().getHours(), p = d.proximo; S.alertas = d.sanciones;
    const QA = (c, i, t, s, a, v, bd) => `<button class="qa ${c}" data-act="${a}" data-v="${v}"><div class="ic" style="background:#ffffff10">${ico(i, 20)}</div>${bd ? `<em style="background:#ffffff18">${bd}</em>` : ''}<b>${t}</b><small>${s}</small></button>`;
    return shell(`<div class="sub" style="margin:0">${new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div><h1 style="margin-top:6px">${h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'},<br><span style="color:var(--g)">${esc(n)}</span></h1>
    <div class="stats">${[[d.equipos, 'Equipos'], [d.jugados, 'Partidos jugados'], [d.goles, 'Goles totales'], [d.rondas, 'Rondas']].map(([a, b]) => `<div class="stat"><b>${a}</b><span>${b}</span></div>`).join('')}</div>
    <div class="sec">Acceso rápido</div><div class="grid2">${QA('c-g', 'trophy', 'Torneos Activos', d.torneos_activos + ' en curso', 'tab', 'torneos', d.torneos_activos)}
    ${QA('c-b', 'cal', 'Programar Partido', p ? 'Próximo: ' + fmtF(p.fecha) : 'Sin partidos', isAdmin() ? 'nuevoPartido' : 'tab', isAdmin() ? '' : 'partidos')}${QA('c-o', 'table', 'Tabla de Posiciones', 'Ver clasificación', 'tab', 'posiciones')}${QA('c-r', 'alert', 'Sanciones Pendientes', d.sanciones + ' casos activos', 'tab', 'informes', d.sanciones)}</div>
    <div class="sec">Últimos partidos</div>${d.ultimos.map(matchRow).join('') || '<p class="sub">Aún no hay partidos jugados.</p>'}
    ${p ? `<div class="sec">Próximo partido</div><div class="card next"><span class="pill p-g">● ${fmtF(p.fecha, p.hora)}</span><div class="row" style="margin:18px 0"><div class="sp f" style="font-size:22px;font-weight:800">${esc(p.local)}<small style="display:block;font:400 11px Inter;color:var(--mut)">Local</small></div><b class="f" style="color:var(--mut)">VS</b><div class="sp f" style="font-size:22px;font-weight:800;text-align:right">${esc(p.visitante)}<small style="display:block;font:400 11px Inter;color:var(--mut)">Visitante</small></div></div><div class="sub" style="text-align:center;border-top:1px solid #0f5a3a;padding-top:12px;margin:0">${esc(p.cancha || 'Cancha por definir')} · Jornada ${p.jornada} · ${esc(p.grupo)}</div></div>` : ''}`);
  },

  // ---------- Pantalla 3: Equipos y jugadores ----------
  async torneos() {
    const [eq, gr] = await Promise.all([api('/equipos' + tq()), api('/grupos' + tq())]); S.grupos = gr; S.eq = eq;
    const q = S.q.toLowerCase(), lista = eq.filter(e => (S.grupoF === 'todos' || e.grupo_id == S.grupoF) && (e.nombre + e.entrenador).toLowerCase().includes(q));
    const open = S.abierto;
    return shell(`<div class="row"><div class="sp"><h1 style="font-size:30px">Equipos</h1><div class="sub" style="margin:2px 0 0">${eq.length} equipos · ${eq.reduce((a, e) => a + e.n_jugadores, 0)} jugadores</div></div>${isAdmin() ? `<button class="btn sm" data-act="nuevoEquipo">${ico('plus', 16)} Agregar Equipo</button>` : ''}</div>
    <select data-act="selTorneo" style="margin:14px 0 8px">${S.torneos.map(t => `<option value="${t.id}" ${t.id == S.torneo?.id ? 'selected' : ''}>${esc(t.nombre || 'Torneo ' + t.anio)}</option>`).join('')}</select>
    ${isAdmin() ? `<div class="chips"><button class="chip" data-act="nuevoTorneo">+ Torneo</button><button class="chip" data-act="editTorneo">Editar torneo</button><button class="chip" data-act="delTorneo">Eliminar torneo</button><button class="chip" data-act="nuevoGrupo">+ Grupo</button></div>` : ''}
    <div class="row" style="position:relative"><span style="position:absolute;left:12px;color:var(--mut)">${ico('search', 16)}</span><input id="busq" placeholder="Buscar equipo o entrenador..." value="${esc(S.q)}" style="padding-left:36px"></div>
    <div class="chips"><button class="chip ${S.grupoF === 'todos' ? 'on' : ''}" data-act="grupoF" data-v="todos">Todos</button>${gr.map(g => `<button class="chip ${S.grupoF == g.id ? 'on' : ''}" data-act="grupoF" data-v="${g.id}">${esc(g.nombre)}${isAdmin() ? '' : ''}</button>`).join('')}</div>
    ${lista.map(e => `<div class="card"><button class="team" data-act="abrir" data-v="${e.id}">${shield(e.nombre, e.logo)}<div class="sp"><h3>${esc(e.nombre)}</h3><span class="pill p-g" style="font-size:9px">${esc(e.grupo)}</span> <small>· ${e.n_jugadores} jugadores</small><br><small>${esc(e.entrenador || 'Sin entrenador')}</small></div><div style="text-align:right"><b class="f" style="font-size:18px">${e.victorias}V</b><br>${ico('down', 14)}</div></button>
    ${open == e.id ? `<div>${S.jug.map(j => `<div class="pl"><div class="th">${(j.nombre[0] + j.apellido[0]).toUpperCase()}</div><div class="sp"><b>${esc(j.nombre + ' ' + j.apellido)}</b><br><small style="color:var(--mut)">${esc(j.carnet)}</small></div><span class="pill ${j.suspendido ? 'p-r' : 'p-g'}">${j.suspendido ? 'Suspendido' : 'Activo'}</span>${isAdmin() ? `<button data-act="editJug" data-v="${j.id}">${ico('edit', 16)}</button><button data-act="delJug" data-v="${j.id}" style="color:var(--r)">${ico('trash', 16)}</button>` : ''}</div>`).join('') || '<div class="pl sub">Sin jugadores</div>'}
    ${isAdmin() ? `<div class="pl"><button class="btn sm out" data-act="nuevoJug" data-v="${e.id}">+ Jugador</button><button class="btn sm out" data-act="editEquipo" data-v="${e.id}">Editar equipo</button><button class="btn sm red" data-act="delEquipo" data-v="${e.id}">Eliminar</button></div>` : ''}</div>` : ''}</div>`).join('') || '<p class="sub">No hay equipos.</p>'}`);
  },

  // ---------- Pantalla 4: Calendario ----------
  async partidos() {
    const ps = await api('/partidos' + tq()); S.ps = ps; const mj = Math.max(3, ...ps.map(p => p.jornada));
    if (S.jornada == null) S.jornada = (ps.find(p => p.estado !== 'jugado') || { jornada: 1 }).jornada;
    const lista = ps.filter(p => p.jornada == S.jornada);
    return shell(`<div class="eyebrow">Liga Académica · ${S.torneo?.anio || ''}</div><h1>Calendario de partidos</h1><div class="sub">Programa y administra los encuentros del torneo</div>
    <div class="tabs">${Array.from({ length: mj }, (_, i) => `<button class="${S.jornada == i + 1 ? 'on' : ''}" data-act="jornada" data-v="${i + 1}">Jornada ${i + 1}</button>`).join('')}</div>
    <div class="row sub" style="margin:0 0 10px"><b class="sp" style="color:var(--tx);font-size:11px">${lista.length} ENCUENTROS</b>Hora local</div>
    ${lista.map(p => { const live = p.estado === 'programado' && p.fecha === hoy(); const st = p.estado === 'jugado' ? ['Finalizado', 'p-g'] : live ? ['● En vivo', 'p-g'] : p.estado === 'programado' ? ['Programado', 'p-b'] : [p.estado, 'p-o'];
      return `<div class="card match ${live ? 'live' : ''}"><div class="top"><span>${ico('clock', 12)} ${fmtF(p.fecha, p.hora)}</span><span class="pill ${st[1]}">${st[0]}</span></div>
      <div class="vs"><div>${shield(p.local, null, 52)}<h3>${esc(p.local)}</h3><small>${esc(p.tecnico_local || '')}</small></div><div class="mid">${p.estado === 'jugado' ? `<span style="color:var(--g)">${p.goles_local} — ${p.goles_visitante}</span>` : 'VS'}<br><span class="pill p-g">${esc(p.grupo)}</span></div><div>${shield(p.visitante, null, 52)}<h3>${esc(p.visitante)}</h3><small>${esc(p.tecnico_visitante || '')}</small></div></div>
      <div class="foot"><span>${ico('pin', 13)} ${esc(p.cancha || 'Por definir')}</span></div>
      <div class="foot" style="border-top:0;padding-top:0">${isAdmin() && p.estado !== 'jugado' ? `<button class="btn out sp" data-act="planilla" data-v="${p.id}">Abrir planilla digital</button>` : p.estado === 'jugado' ? `<button class="btn out sp" data-act="planilla" data-v="${p.id}">Ver estadísticas</button>` : ''}
      ${isAdmin() ? `<button class="btn sm out" data-act="editPartido" data-v="${p.id}">${ico('edit', 14)}</button><button class="btn sm red" data-act="delPartido" data-v="${p.id}">${ico('trash', 14)}</button>` : ''}</div></div>`; }).join('') || '<p class="sub">Sin partidos en esta jornada.</p>'}`,
      isAdmin() ? `<button class="btn fab" data-act="nuevoPartido">${ico('plus', 18)} Agendar Partido</button>` : '');
  },

  // ---------- Pantalla 6: Posiciones ----------
  async posiciones() {
    const gr = await api('/grupos' + tq()); if (!S.posG || !gr.find(g => g.id == S.posG)) S.posG = gr[0]?.id;
    const rows = S.posG ? await api('/posiciones?grupo_id=' + S.posG) : [];
    return shell(`<div class="eyebrow">Liga Académica · Fase de grupos</div><h1>Tabla de posiciones</h1><div class="sub">Clasificación actualizada del torneo</div>
    <div class="tabs">${gr.map(g => `<button class="${S.posG == g.id ? 'on' : ''}" data-act="posG" data-v="${g.id}">${esc(g.nombre)}</button>`).join('')}</div>
    <div class="row sub" style="margin:0 0 8px"><span class="sp" style="color:var(--g)">● Clasificados a Liguilla</span><span>Desliza →</span></div>
    <div class="tw"><table><tr><th>Pos</th><th>Equipo</th>${['PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'PTS'].map(c => `<th>${c}</th>`).join('')}</tr>
    ${rows.map(r => `<tr class="${r.clasifica ? 'q' : ''}"><td class="f" style="font-size:16px">${r.pos}</td><td><div class="row">${shield(r.equipo, r.logo, 24)}<div><b>${esc(r.equipo)}</b>${r.clasifica ? '<small>Zona de Liguilla</small>' : ''}</div></div></td><td>${r.pj}</td><td>${r.pg}</td><td>${r.pe}</td><td>${r.pp}</td><td>${r.gf}</td><td>${r.gc}</td><td>${r.dg > 0 ? '+' : ''}${r.dg}</td><td><b style="color:var(--g)">${r.pts}</b></td></tr>`).join('')}</table></div>
    <p class="sub" style="font-size:10px;margin-top:10px">PJ jugados · PG ganados · PE empatados · PP perdidos · GF/GC goles a favor/contra · DG diferencia · PTS puntos. Desempate: puntos, diferencia de goles, resultado entre ellos.</p>`);
  },

  // ---------- Pantalla 7: Informes ----------
  async informes() {
    let body = '';
    if (S.sub === 'sanciones') { const s = await api('/sanciones' + tq()); S.sanc = s; const T = { amarillas: ['2 Amarillas', 'p-y'], roja: ['Roja Directa', 'p-r'], agresion: ['Agresión', 'p-r'] };
      body = `<div class="row"><h2 class="sp" style="font-size:22px">Jugadores suspendidos<div class="sub" style="font:400 11px Inter;margin:2px 0 0">${s.length} sanciones activas</div></h2><span class="pill p-r">Control disciplinario</span></div><div class="tw" style="margin-top:12px"><table><tr><th style="text-align:left">Jugador</th><th>Equipo</th><th>Motivo</th><th>Restantes</th>${isAdmin() ? '<th>Acción</th>' : ''}</tr>
      ${s.map(x => `<tr><td style="text-align:left"><b style="font-family:Inter;text-transform:none">${esc(x.jugador)}</b><small style="color:var(--mut)">${esc(x.carnet)}</small></td><td style="text-align:left">${esc(x.equipo)}</td><td><span class="pill ${T[x.tipo][1]}">${T[x.tipo][0]}</span></td><td>${x.partidos_suspendido - x.partidos_cumplidos} de ${x.partidos_suspendido}</td>${isAdmin() ? `<td><button class="btn sm out" data-act="ajustar" data-v="${x.id}">Ajustar Sanción</button></td>` : ''}</tr>`).join('') || '<tr><td colspan="5" class="sub">Sin sanciones activas 🎉</td></tr>'}</table></div>`; }
    else if (S.sub === 'goleadores') { const g = await api('/goleadores' + tq()); body = `<h2 style="font-size:22px">Máximos goleadores</h2><div class="sub">Ranking individual de anotaciones</div><div class="card">${g.map((x, i) => `<div class="gl"><span class="n" ${i > 2 ? 'style="color:var(--mut)"' : ''}>${i + 1}</span>${shield(x.equipo, null, 30)}<div class="sp"><b>${esc(x.jugador)}</b><br><small style="color:var(--mut)">${esc(x.equipo)}</small></div><big>${x.goles}</big><small style="color:var(--mut)">GOLES</small></div>`).join('') || '<p class="sub" style="padding:14px">Aún no hay goles registrados.</p>'}</div>`; }
    else { const a = await api('/amonestados' + tq()); body = `<h2 style="font-size:22px">Jugadores amonestados</h2><div class="sub">Acumulado de tarjetas del torneo</div><div class="card">${a.map((x, i) => `<div class="gl"><span class="n" ${i > 2 ? 'style="color:var(--mut)"' : ''}>${i + 1}</span>${shield(x.equipo, null, 30)}<div class="sp"><b>${esc(x.jugador)}</b><br><small style="color:var(--mut)">${esc(x.equipo)}</small></div><span class="tag p-y">${x.amarillas} TA</span><span class="tag p-r">${x.rojas} TR</span></div>`).join('') || '<p class="sub" style="padding:14px">Sin tarjetas registradas.</p>'}</div>`; }
    return shell(`<div class="eyebrow">Comité deportivo · Administración</div><h1>Sanciones e informes</h1><div class="sub">Control disciplinario y estadísticas oficiales</div>${isAdmin() ? `<div style="text-align:right"><button class="btn sm" data-act="exportar">${ico('dl', 16)} Exportar a Excel (.xlsx)</button></div>` : ''}
    <div class="tabs">${[['sanciones', 'Sanciones'], ['goleadores', 'Máximos Goleadores'], ['amonestados', 'Amonestados']].map(([k, l]) => `<button class="${S.sub === k ? 'on' : ''}" data-act="sub" data-v="${k}">${l}</button>`).join('')}</div>${body}`);
  },

// ---------- Pantalla:  gestion comicion ----------
  async comision() {
  const us = await api('/usuarios'); S.us = us;
  const R = { comision: ['Comisión', 'p-g'], docente: ['Docente', 'p-b'], estudiante: ['Estudiante', 'p-o'] };
  return shell(`<div class="row"><div class="sp"><h1 style="font-size:30px">Usuarios</h1><div class="sub" style="margin:2px 0 0">${us.length} cuentas · ${us.filter(u => u.rol === 'comision').length} en la comisión</div></div><button class="btn sm" data-act="nuevoUsuario">${ico('plus', 16)} Agregar</button></div>
  <div class="card" style="margin-top:14px">${us.map(u => `<div class="pl"><div class="th">${esc(u.nombre.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase())}</div><div class="sp"><b>${esc(u.nombre)}</b><br><small style="color:var(--mut)">${esc(u.correo)}</small></div><span class="pill ${(R[u.rol] || R.estudiante)[1]}">${(R[u.rol] || R.estudiante)[0]}</span><button data-act="editUsuario" data-v="${u.id}">${ico('edit', 16)}</button></div>`).join('')}</div>`);
},

  // ---------- Pantalla 5: Planilla digital ----------
  async planilla() {
    const pl = S.pl, p = pl.partido, ro = p.estado === 'jugado' || !isAdmin(); const tot = (a, b) => a.reduce((s, j) => s + j.goles, 0) + b.reduce((s, j) => s + j.autogoles, 0);
    const C = [['goles', 'Goles'], ['asistencias', 'Asist.'], ['autogoles', 'Autog.'], ['amarillas', 'T. Am.'], ['rojas', 'T. Roja'], ['faltas_cometidas', 'Faltas'], ['tiros_arco', 'Tiros a gol'], ['atajadas', 'Atajadas']];
    const eq = (n, js) => `<div class="sec" style="color:var(--g)">${esc(n)}</div><div class="card">${js.map(j => `<div class="pw ${j.suspendido ? 'sus' : ''}"><div class="nm">${esc(j.nombre + ' ' + j.apellido)}<small>${esc(j.carnet)} ${j.suspendido ? '· <span style="color:var(--r)">SUSPENDIDO — no puede jugar</span>' : ''}</small>
      ${j.suspendido ? '' : `<div class="pls" style="margin-top:8px">${C.map(([f, l]) => `<div class="ctr"><span>${l}</span><div>${ro ? '' : `<button data-act="cnt" data-j="${j.id}" data-f="${f}" data-d="-1">−</button>`}<b>${j[f]}</b>${ro ? '' : `<button data-act="cnt" data-j="${j.id}" data-f="${f}" data-d="1">+</button>`}</div></div>`).join('')}
      ${ro ? '' : `<label class="ctr"><span>Agresión</span><input type="checkbox" data-act="agr" data-j="${j.id}" ${j.agresion ? 'checked' : ''} style="width:22px;height:22px"></label>`}</div>`}</div></div>`).join('')}</div>`;
    return `<header><button class="ib" data-act="tab" data-v="partidos">${ico('back')}</button><div class="brand">Planilla digital<b>${esc(p.grupo)} · Jornada ${p.jornada}</b></div></header><main>
    <div class="score">${esc(p.local)} <em>${tot(pl.local, pl.visitante)} - ${tot(pl.visitante, pl.local)}</em> ${esc(p.visitante)}</div>${ro ? '<p class="sub" style="text-align:center">Solo lectura</p>' : '<p class="sub" style="text-align:center">Los jugadores suspendidos no pueden registrarse (RN3–RN5).</p>'}
    ${eq(p.local, pl.local)}${eq(p.visitante, pl.visitante)}${ro ? '' : '<button class="btn w" style="margin-top:16px" data-act="guardarPlanilla">Guardar Planilla y Calcular Sanciones</button>'}</main>`;
  }
};

// ---------- Acciones (botones) ----------
const optG = () => S.grupos.map(g => [g.id, g.nombre]);
const ACT = {
  nuevoUsuario: () => modal('Agregar usuario', [{ n: 'nombre', l: 'Nombre completo' }, { n: 'correo', l: 'Correo (@clases.edu.sv)', t: 'email' }, { n: 'rol', l: 'Rol', t: 'select', v: 'comision', o: ROLES_UI }], async v => { await api('/usuarios', 'POST', v); render(); }),
  editUsuario: v => { const u = S.us.find(x => x.id == v); modal('Editar usuario', [{ n: 'nombre', l: 'Nombre', v: u.nombre }, { n: 'rol', l: 'Rol', t: 'select', v: u.rol, o: ROLES_UI }], async b => { await api('/usuarios/' + v, 'PUT', b); if (u.id == S.user.id) { S.user = null; S.tab = 'inicio'; } render(); }); },
  tab: v => { S.tab = v; render(); }, logout: () => confirm('¿Cerrar sesión?') && logout(), bell: () => toast(S.alertas ? S.alertas + ' sanciones activas' : 'Sin notificaciones'),
  login: () => entrar({ correo: $('#correo').value, password: $('#clave').value }),
  registrar: () => entrar({ nombre: $('#nombre').value, correo: $('#correo').value, password: $('#clave').value }, '/api/registro'),
  cambiarModo: () => { S.modoReg = !S.modoReg; render(); },
  grupoF: v => { S.grupoF = v; render(); }, jornada: v => { S.jornada = +v; render(); }, posG: v => { S.posG = +v; render(); }, sub: v => { S.sub = v; render(); },
  selTorneo: (v, el) => { S.torneo = S.torneos.find(t => t.id == el.value); S.grupoF = 'todos'; S.abierto = null; S.jornada = null; S.posG = null; render(); },
  abrir: async v => { if (S.abierto == v) S.abierto = null; else { S.abierto = v; S.jug = await api('/jugadores?equipo_id=' + v); } render(); },
  nuevoTorneo: () => modal('Nuevo torneo', [{ n: 'nombre', l: 'Nombre' }, { n: 'anio', l: 'Año', t: 'number', v: new Date().getFullYear() }, { n: 'fecha_inicio', l: 'Fecha inicio', t: 'date' }, { n: 'fecha_fin', l: 'Fecha fin', t: 'date' }], async v => { v.anio = +v.anio; const r = await api('/torneos', 'POST', v); S.torneos = []; await render(); S.torneo = S.torneos.find(t => t.id == r.id); render(); }),
  editTorneo: () => S.torneo && modal('Editar torneo', [{ n: 'nombre', l: 'Nombre', v: S.torneo.nombre }, { n: 'fecha_inicio', l: 'Fecha inicio', t: 'date', v: S.torneo.fecha_inicio }, { n: 'fecha_fin', l: 'Fecha fin', t: 'date', v: S.torneo.fecha_fin }, { n: 'estado', l: 'Estado', t: 'select', v: S.torneo.estado, o: [['en_proceso', 'En proceso'], ['terminado', 'Terminado']] }], async v => { await api('/torneos/' + S.torneo.id, 'PUT', v); const id = S.torneo.id; S.torneos = []; await render(); S.torneo = S.torneos.find(t => t.id == id); render(); }),
  delTorneo: () => S.torneo && confirmar(`¿Eliminar "${S.torneo.nombre}" con todos sus equipos y partidos?`, async () => { await api('/torneos/' + S.torneo.id, 'DELETE'); S.torneos = []; S.torneo = null; render(); }),
  nuevoGrupo: () => S.torneo && modal('Nuevo grupo', [{ n: 'nombre', l: 'Nombre (ej. Grupo C)' }], async v => { await api('/grupos', 'POST', { ...v, torneo_id: S.torneo.id }); render(); }),
  nuevoEquipo: () => S.grupos.length ? modal('Agregar equipo', [{ n: 'nombre', l: 'Nombre' }, { n: 'entrenador', l: 'Entrenador' }, { n: 'grupo_id', l: 'Grupo', t: 'select', o: optG() }, { n: 'logo', l: 'URL del logo (opcional)' }], async v => { await api('/equipos', 'POST', v); render(); }) : toast('Primero crea un grupo', 1),
  editEquipo: v => { const e = S.eq.find(x => x.id == v); modal('Editar equipo', [{ n: 'nombre', l: 'Nombre', v: e.nombre }, { n: 'entrenador', l: 'Entrenador', v: e.entrenador }, { n: 'grupo_id', l: 'Grupo', t: 'select', o: optG(), v: e.grupo_id }, { n: 'logo', l: 'URL del logo', v: e.logo }], async b => { await api('/equipos/' + v, 'PUT', b); render(); }); },
  delEquipo: v => confirmar('¿Eliminar este equipo, sus jugadores y partidos?', async () => { await api('/equipos/' + v, 'DELETE'); S.abierto = null; render(); }),
  nuevoJug: v => modal('Nuevo jugador', [{ n: 'nombre', l: 'Nombre' }, { n: 'apellido', l: 'Apellido' }, { n: 'carnet', l: 'Carnet (ej. 2026-INF-0100)' }], async b => { await api('/jugadores', 'POST', { ...b, equipo_id: +v }); S.jug = await api('/jugadores?equipo_id=' + v); render(); }),
  editJug: v => { const j = S.jug.find(x => x.id == v); modal('Editar jugador', [{ n: 'nombre', l: 'Nombre', v: j.nombre }, { n: 'apellido', l: 'Apellido', v: j.apellido }, { n: 'carnet', l: 'Carnet', v: j.carnet }], async b => { await api('/jugadores/' + v, 'PUT', b); S.jug = await api('/jugadores?equipo_id=' + S.abierto); render(); }); },
  delJug: v => confirmar('¿Eliminar jugador?', async () => { await api('/jugadores/' + v, 'DELETE'); S.jug = await api('/jugadores?equipo_id=' + S.abierto); render(); }),
  nuevoPartido: async () => { S.eq = await api('/equipos' + tq()); if (S.eq.length < 2) return toast('Registra al menos 2 equipos', 1); const o = S.eq.map(e => [e.id, `${e.nombre} (${e.grupo})`]);
    modal('Agendar partido', [{ n: 'equipo_local_id', l: 'Local', t: 'select', o }, { n: 'equipo_visitante_id', l: 'Visitante', t: 'select', o, v: o[1][0] }, { n: 'jornada', l: 'Jornada', t: 'number', v: S.jornada || 1, min: 1 }, { n: 'fecha', l: 'Fecha', t: 'date', v: hoy() }, { n: 'hora', l: 'Hora', t: 'time', v: '15:00' }, { n: 'cancha', l: 'Cancha', v: 'Cancha Principal' }], async v => { v.jornada = +v.jornada; v.equipo_local_id = +v.equipo_local_id; v.equipo_visitante_id = +v.equipo_visitante_id; await api('/partidos', 'POST', v); S.jornada = v.jornada; S.tab = 'partidos'; render(); toast('Partido agendado'); }); },
  editPartido: v => { const p = S.ps.find(x => x.id == v); modal('Editar partido', [{ n: 'jornada', l: 'Jornada', t: 'number', v: p.jornada }, { n: 'fecha', l: 'Fecha', t: 'date', v: p.fecha }, { n: 'hora', l: 'Hora', t: 'time', v: p.hora }, { n: 'cancha', l: 'Cancha', v: p.cancha }, { n: 'tecnico_local', l: 'Técnico local', v: p.tecnico_local }, { n: 'tecnico_visitante', l: 'Técnico visitante', v: p.tecnico_visitante },
    ...(p.estado !== 'jugado' ? [{ n: 'estado', l: 'Estado', t: 'select', v: p.estado, o: [['programado', 'Programado'], ['suspendido', 'Suspendido'], ['reprogramado', 'Reprogramado']] }] : [])], async b => { b.jornada = +b.jornada; await api('/partidos/' + v, 'PUT', b); render(); }); },
  delPartido: v => confirmar('¿Eliminar partido?', async () => { await api('/partidos/' + v, 'DELETE'); render(); }),
  planilla: async v => { S.pl = await api(`/partidos/${v}/planilla`); S.tab = 'planilla'; render(); },
  cnt: (v, el) => { const j = [...S.pl.local, ...S.pl.visitante].find(x => x.id == el.dataset.j), f = el.dataset.f; j[f] = Math.max(0, j[f] + +el.dataset.d); render(); },
  agr: (v, el) => { [...S.pl.local, ...S.pl.visitante].find(x => x.id == el.dataset.j).agresion = el.checked; },
  guardarPlanilla: () => confirm('Se guardará el resultado y se calcularán las sanciones. ¿Continuar?') && tryDo(async () => { const js = [...S.pl.local, ...S.pl.visitante].filter(j => !j.suspendido).map(j => ({ ...j, jugador_id: j.id }));
    const r = await api(`/partidos/${S.pl.partido.id}/planilla`, 'POST', { stats: js }); toast(`Guardado ${r.goles_local}-${r.goles_visitante}. Sanciones nuevas: ${r.sanciones_nuevas}`); S.tab = 'partidos'; render(); }),
  ajustar: v => { const s = S.sanc.find(x => x.id == v); modal('Ajustar sanción — ' + s.jugador, [{ n: 'partidos_suspendido', l: 'Total de partidos de suspensión', t: 'number', v: s.partidos_suspendido, min: 1 }], async b => { await api(`/sanciones/${v}/ajustar`, 'POST', b); render(); }, [{ label: 'Quitar sanción (habilitar jugador)', fn: async () => { await api(`/sanciones/${v}/ajustar`, 'POST', { quitar: true }); render(); toast('Sanción quitada'); } }]); },
  exportar: () => tryDo(async () => { const r = await fetch('/api/exportar' + tq(), { headers: { Authorization: 'Bearer ' + S.token } }); if (!r.ok) throw new Error('No se pudo exportar'); const a = document.createElement('a'); a.href = URL.createObjectURL(await r.blob()); a.download = 'informes-infravenz.xls'; a.click(); })
};
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el || el.tagName === 'SELECT' || el.type === 'checkbox') return; const f = ACT[el.dataset.act]; if (f) tryDo(() => f(el.dataset.v, el)); });
document.addEventListener('change', e => { const el = e.target; if (el.dataset.act && (el.tagName === 'SELECT' || el.type === 'checkbox')) ACT[el.dataset.act](el.value, el); });
document.addEventListener('input', e => { if (e.target.id === 'busq') { S.q = e.target.value; clearTimeout(S.t); S.t = setTimeout(async () => { await render(); const i = $('#busq'); i.focus(); i.setSelectionRange(99, 99); }, 250); } });
VIEWS.planilla = VIEWS.planilla; render();
