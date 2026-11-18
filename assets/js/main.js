// =============================================================
// APP PRESUPUESTO - LÓGICA PRINCIPAL
// =============================================================

// --- REFERENCIAS AL DOM ---
let modalInicio = document.getElementById('modal-inicio');
let panelPresupuesto = document.getElementById('panel-presupuesto');
let modalCierre = document.getElementById('modal-cierre');
let dialogoSalir = document.getElementById('dialogo-salir');

let btnComenzar = document.getElementById('btn-comenzar');
let btnSalir = document.getElementById('btn-salir');
let btnConfirmarSalir = document.getElementById('btn-confirmar-salir');
let btnCancelarSalir = document.getElementById('btn-cancelar-salir');
let btnReiniciar = document.getElementById('btn-reiniciar');
let btnEncuesta = document.getElementById('btn-encuesta');

let temporizadorEl = document.getElementById('temporizador');
let saldoEl = document.getElementById('saldo');
let saldoLabelEl = document.getElementById('saldo-label');
let tbodyRubros = document.getElementById('tbody-rubros');
let toastContainer = document.getElementById('toast-container');
let winNotiContainer = document.getElementById('win-noti-container');
let alertaSaldo = document.getElementById('alerta-saldo');
let porPagarEl = document.getElementById('por-pagar');
let ingresosDetalleEl = document.getElementById('ingresos-detalle');

// --- Referencias del estrés y el autocuidado ---
let appEl = document.getElementById('app');
let avatarEl = document.getElementById('avatar');
let barraEstresEl = document.getElementById('barra-estres');
let nivelEstresEl = document.getElementById('nivel-estres');
let btnAspirina = document.getElementById('btn-aspirina');
let aspirinasRestantesEl = document.getElementById('aspirinas-restantes');
let overlayAspirina = document.getElementById('overlay-aspirina');
let aspirinaCuentaEl = document.getElementById('aspirina-cuenta');

// --- ESTADO DE NOTIFICACIONES WINDOWS 11 ---
let winNotisActivas = [];
let maxWinNotis = 4;

// --- ESTADO DE LA SESIÓN ---
let sesion = {
  saldoActual: 0,
  tiempoRestante: 0,
  rubros: [],
  debitosRecibidos: [],
  intervaloTemporizador: null,
  alertaMostrada: false,
  congelado: false,
  salidaAnticipada: false,
  timestampInicio: null,
  timestampFin: null,

  // Estrés (Capa 2)
  estres: 0,
  estresMaximo: 0,
  aspirinasUsadas: 0,
  bloqueado: false,          // true mientras dura la aspirina
  intervaloAspirina: null,

  // Freelance: llega cerca del final
  freelanceCobrado: false,

  // Llamadas entrantes
  llamadas: [],              // { quien, segundosHastaCortar }
  llamadaActiva: null,

  // Mail del EOE, glitches y aviso del máximo
  mailEOE: null,
  glitches: [],
  maximoPendiente: false
};

// --- URL DE LA ENCUESTA ---
let URL_ENCUESTA = 'https://forms.gle/XXXXXXXXXX';

// =============================================================
// 1. HABILITAR BOTÓN "COMENZAR" DESPUÉS DE 3 SEGUNDOS
// =============================================================

setTimeout(function() {
  btnComenzar.disabled = false;
}, 3000);

// =============================================================
// 2. GENERAR LA TABLA DE RUBROS
// =============================================================

function generarTabla() {
  tbodyRubros.innerHTML = '';

  sesion.rubros = datosPresupuesto.rubros.map(function(rubro) {
    return {
      id: rubro.id,
      nombre: rubro.nombre,
      monto: rubro.monto,
      fuente: rubro.fuente,
      categoria: rubro.categoria,
      estado: 'pendiente',
      esAutomatico: false
    };
  });

  sesion.rubros.forEach(function(rubro) {
    let fila = document.createElement('tr');
    fila.id = 'fila-' + rubro.id;

    let tdRubro = document.createElement('td');
    tdRubro.classList.add('td-rubro');
    tdRubro.textContent = rubro.nombre;

    // Fuente del dato, en gris chico al lado del nombre (si está activado)
    if (rubro.fuente && datosPresupuesto.mostrarFuentes) {
      let fuenteSpan = document.createElement('span');
      fuenteSpan.classList.add('td-fuente');
      fuenteSpan.textContent = rubro.fuente;
      tdRubro.appendChild(fuenteSpan);
    }

    let tdMonto = document.createElement('td');
    tdMonto.classList.add('td-monto');
    tdMonto.textContent = formatearMonto(rubro.monto);

    let tdAccion = document.createElement('td');
    tdAccion.classList.add('td-accion');

    let btnPagar = document.createElement('button');
    btnPagar.classList.add('btn-pagar');
    btnPagar.textContent = 'Pagar';
    btnPagar.addEventListener('click', function() {
      decidirRubro(rubro.id, 'pagado');
    });

    let btnPostergar = document.createElement('button');
    btnPostergar.classList.add('btn-postergar');
    btnPostergar.textContent = 'Postergar';
    btnPostergar.addEventListener('click', function() {
      decidirRubro(rubro.id, 'postergado');
    });

    tdAccion.appendChild(btnPagar);
    tdAccion.appendChild(btnPostergar);

    fila.appendChild(tdRubro);
    fila.appendChild(tdMonto);
    fila.appendChild(tdAccion);

    tbodyRubros.appendChild(fila);
  });

  // --- Fila del cuidado: sin botones, no se descuenta del saldo ---
  if (datosPresupuesto.cuidado) {
    let c = datosPresupuesto.cuidado;
    let filaCuidado = document.createElement('tr');
    filaCuidado.id = 'fila-cuidado';
    filaCuidado.classList.add('fila-cuidado');

    let tdNombre = document.createElement('td');
    tdNombre.classList.add('td-rubro');
    tdNombre.textContent = c.nombre;
    let fuenteC = document.createElement('span');
    fuenteC.classList.add('td-fuente');
    fuenteC.textContent = c.fuente;
    tdNombre.appendChild(fuenteC);

    let tdMontoC = document.createElement('td');
    tdMontoC.classList.add('td-monto');
    tdMontoC.textContent = formatearMonto(c.monto);

    let tdEtiqueta = document.createElement('td');
    tdEtiqueta.classList.add('td-accion');
    let etiqueta = document.createElement('span');
    etiqueta.classList.add('etiqueta-tiempo');
    etiqueta.textContent = c.etiqueta;
    tdEtiqueta.appendChild(etiqueta);

    filaCuidado.appendChild(tdNombre);
    filaCuidado.appendChild(tdMontoC);
    filaCuidado.appendChild(tdEtiqueta);
    tbodyRubros.appendChild(filaCuidado);
  }

  actualizarPorPagar();
}

// =============================================================
// 2b. DETALLE DEL INGRESO (debajo del saldo)
// =============================================================

// Una fuente cuenta como cobrada si nunca estuvo pendiente,
// o si estaba "a cobrar" y ya llegó (el freelance al final).
function esCobrada(f) {
  return !f.aCobrar || sesion.freelanceCobrado;
}

function mostrarIngresos() {
  ingresosDetalleEl.innerHTML = '';

  // Línea 1: lo cobrado (forma el saldo)
  let cobrado = document.createElement('div');
  cobrado.appendChild(document.createTextNode('Cobrado: '));
  let primero = true;
  datosPresupuesto.fuentesIngreso.forEach(function(f) {
    if (!esCobrada(f)) return;
    if (!primero) cobrado.appendChild(document.createTextNode(' · '));
    primero = false;
    cobrado.appendChild(document.createTextNode(f.nombre + ' '));
    let b = document.createElement('b');
    b.textContent = formatearMonto(f.monto);
    if (f.aCobrar) b.classList.add('recien-cobrado');
    cobrado.appendChild(b);
  });
  ingresosDetalleEl.appendChild(cobrado);

  // Línea 2: lo que todavía no llegó (no suma al saldo)
  let pendientes = datosPresupuesto.fuentesIngreso.filter(function(f) {
    return !esCobrada(f);
  });
  if (pendientes.length > 0) {
    let aCobrar = document.createElement('div');
    aCobrar.classList.add('linea-a-cobrar');
    aCobrar.appendChild(document.createTextNode('A cobrar: '));
    pendientes.forEach(function(f, i) {
      if (i > 0) aCobrar.appendChild(document.createTextNode(' · '));
      aCobrar.appendChild(document.createTextNode(f.nombre + ' '));
      let b = document.createElement('b');
      b.classList.add('a-cobrar');
      b.textContent = formatearMonto(f.monto);
      aCobrar.appendChild(b);
    });
    ingresosDetalleEl.appendChild(aCobrar);
  }
}

// Plata que entró durante la experiencia (el freelance, si ya llegó)
function ingresosExtra() {
  if (!sesion.freelanceCobrado) return 0;
  let extra = 0;
  datosPresupuesto.fuentesIngreso.forEach(function(f) {
    if (f.aCobrar) extra += f.monto;
  });
  return extra;
}

// Llega el pago del freelance: sube el saldo y se avisa en verde
function cobrarFreelance() {
  if (sesion.congelado || sesion.freelanceCobrado) return;
  sesion.freelanceCobrado = true;
  recalcularSaldo();
  mostrarIngresos();
  mostrarToastIngreso(ingresosExtra(), datosPresupuesto.freelanceMensaje);
}

// =============================================================
// 2c. POR PAGAR (suma de rubros pendientes y postergados)
// =============================================================

function actualizarPorPagar() {
  let porPagar = 0;
  sesion.rubros.forEach(function(rubro) {
    if (rubro.estado !== 'pagado') {
      porPagar += rubro.monto;
    }
  });
  porPagarEl.textContent = formatearMonto(porPagar);
}

// =============================================================
// 3. FORMATEAR MONTOS
// =============================================================

function formatearMonto(numero) {
  let prefijo = numero < 0 ? '-$' : '$';
  let absoluto = Math.abs(numero);
  return prefijo + absoluto.toLocaleString('es-AR');
}

// =============================================================
// 4. DECIDIR RUBRO (PAGAR O POSTERGAR)
// =============================================================

function decidirRubro(rubroId, decision) {
  if (sesion.congelado || sesion.bloqueado) return;

  let rubro = sesion.rubros.find(function(r) {
    return r.id === rubroId;
  });
  if (!rubro || rubro.esAutomatico) return;

  // Opción C: si no alcanza el saldo, el pago sale con tarjeta y genera deuda
  if (decision === 'pagado' && rubro.estado !== 'pagado') {
    rubro.conTarjeta = rubro.monto > sesion.saldoActual;
  } else if (decision !== 'pagado') {
    rubro.conTarjeta = false;
  }

  rubro.estado = decision;

  let fila = document.getElementById('fila-' + rubroId);
  let btnPagar = fila.querySelector('.btn-pagar');
  let btnPostergar = fila.querySelector('.btn-postergar');

  btnPagar.classList.remove('activo');
  btnPostergar.classList.remove('activo');

  if (decision === 'pagado') {
    btnPagar.classList.add('activo');
  } else {
    btnPostergar.classList.add('activo');
  }

  recalcularSaldo();
  actualizarPorPagar();
}

// =============================================================
// 4b. BOTÓN "PAGAR CON TARJETA"
// Si el monto supera lo que queda, el botón avisa que el pago
// sale con tarjeta (deuda). Se actualiza cada vez que cambia el saldo.
// =============================================================

function actualizarBotonesPago() {
  sesion.rubros.forEach(function(rubro) {
    let fila = document.getElementById('fila-' + rubro.id);
    if (!fila) return;
    let btnPagar = fila.querySelector('.btn-pagar');
    if (!btnPagar) return;

    let conTarjeta;
    if (rubro.estado === 'pagado') {
      conTarjeta = !!rubro.conTarjeta;
    } else {
      conTarjeta = rubro.monto > sesion.saldoActual;
    }

    btnPagar.textContent = conTarjeta ? 'Pagar con tarjeta' : 'Pagar';
    btnPagar.classList.toggle('tarjeta', conTarjeta);
  });
}

// =============================================================
// 5. RECALCULAR SALDO
// =============================================================

function recalcularSaldo() {
  let gastado = 0;

  sesion.rubros.forEach(function(rubro) {
    if (rubro.estado === 'pagado') {
      gastado += rubro.monto;
    }
  });

  sesion.debitosRecibidos.forEach(function(debito) {
    gastado += debito.monto;
  });

  sesion.saldoActual = datosPresupuesto.saldoInicial + ingresosExtra() - gastado;

  saldoEl.textContent = formatearMonto(sesion.saldoActual);
  saldoLabelEl.textContent = sesion.saldoActual < 0 ? 'Deuda' : 'Saldo disponible';

  actualizarColorSaldo();
  actualizarBotonesPago();
}

// =============================================================
// 6. SEMÁFORO DE SALDO
// =============================================================

function actualizarColorSaldo() {
  let porcentaje = sesion.saldoActual / datosPresupuesto.saldoInicial;

  saldoEl.classList.remove('saldo-positivo', 'saldo-ajustado', 'saldo-negativo');

  if (sesion.saldoActual < 0) {
    saldoEl.classList.add('saldo-negativo');

    if (!sesion.alertaMostrada) {
      sesion.alertaMostrada = true;
      alertaSaldo.classList.remove('no-disp');
      alertaSaldo.classList.add('disp');

      setTimeout(function() {
        alertaSaldo.classList.remove('disp');
        alertaSaldo.classList.add('no-disp');
      }, 3000);
    }
  } else if (porcentaje <= 0.20) {
    saldoEl.classList.add('saldo-ajustado');
  } else {
    saldoEl.classList.add('saldo-positivo');
  }
}

// =============================================================
// 7. TEMPORIZADOR DE CUENTA REGRESIVA
// =============================================================

function iniciarTemporizador() {
  sesion.tiempoRestante = datosPresupuesto.tiempoTotal;
  actualizarTemporizadorUI();

  sesion.intervaloTemporizador = setInterval(function() {
    sesion.tiempoRestante--;
    actualizarTemporizadorUI();

    if (sesion.tiempoRestante <= 30) {
      temporizadorEl.classList.add('tiempo-bajo');
    }

    // Llamadas y mail de la partitura
    revisarLlamadas();
    revisarMailEOE();
    revisarMaximoPendiente();

    // El freelance llega recién al final
    if (sesion.tiempoRestante === datosPresupuesto.freelanceLlegaConSegundosRestantes) {
      cobrarFreelance();
    }

    if (sesion.tiempoRestante <= 0) {
      finalizarExperiencia(false);
    }
  }, 1000);
}

function actualizarTemporizadorUI() {
  let minutos = Math.floor(sesion.tiempoRestante / 60);
  let segundos = sesion.tiempoRestante % 60;
  if (segundos < 10) segundos = '0' + segundos;
  temporizadorEl.textContent = minutos + ':' + segundos;
}

// =============================================================
// 8. RECIBIR DÉBITO AUTOMÁTICO
// =============================================================

function recibirDebito(datos) {
  if (sesion.congelado) return;

  sesion.debitosRecibidos.push({
    id: datos.id,
    origen: datos.origen,
    mensaje: datos.mensaje,
    monto: datos.monto,
    timestamp: Date.now()
  });

  recalcularSaldo();

  mostrarToast(datos.origen, datos.monto, datos.mensaje);
}

// =============================================================
// 9. TOASTS DE DÉBITO
// =============================================================

function mostrarToast(origen, monto, mensaje) {
  let toast = document.createElement('div');
  toast.classList.add('toast');

  toast.innerHTML =
    '<span class="toast-origen">' + origen + '</span> ' +
    mensaje + ' <span class="toast-monto">-' + formatearMonto(monto) + '</span>';

  toastContainer.appendChild(toast);

  setTimeout(function() {
    toast.classList.add('mostrar');
  }, 10);

  setTimeout(function() {
    toast.classList.add('ocultar');
    toast.classList.remove('mostrar');
    setTimeout(function() {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 4000);
}

// Toast verde para plata que entra (el pago del freelance)
function mostrarToastIngreso(monto, mensaje) {
  let toast = document.createElement('div');
  toast.classList.add('toast', 'toast-ingreso');
  toast.innerHTML = mensaje + ' <span class="toast-monto">+' + formatearMonto(monto) + '</span>';
  toastContainer.appendChild(toast);
  setTimeout(function() { toast.classList.add('mostrar'); }, 10);
  setTimeout(function() {
    toast.classList.add('ocultar');
    toast.classList.remove('mostrar');
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 5000);
}

// =============================================================
// 10. NOTIFICACIONES ESTILO WINDOWS 11
// =============================================================
// Se llama desde websocket-client.js cuando llega un mensaje tipo "notificacion".
// Crea un popup visual estilo Windows 11 en la esquina inferior derecha.
// Representa las notificaciones del celular invadiendo la pantalla de presupuesto.

// -------------------------------------------------------------
// Aspecto de cada notificación según su app de origen
// (forma de Windows 11, piel de WhatsApp, Galicia, Gmail,
// Calendario u obra social). Sin bordes de color por impacto.
// -------------------------------------------------------------

let iconoFamilia = {
  whatsapp: 'assets/imgs/icono-wtsap.png',
  banco: 'assets/imgs/icono-banco.png',
  gmail: 'assets/imgs/icono-gmail.svg',
  calendario: 'assets/imgs/icono-calendario.svg',
  obrasocial: 'assets/imgs/icono-obrasocial.svg'
};

let nombreFamilia = {
  whatsapp: 'WhatsApp',
  banco: 'Galicia',
  gmail: 'Gmail',
  calendario: 'Calendario',
  obrasocial: 'SaludPlus'
};

let coloresAvatar = ['#6a4c93', '#3b5f7a', '#8a4b2d', '#2e7d6b', '#7a3b5f', '#4a5a8a'];

function colorAvatar(nombre) {
  let suma = 0;
  for (let i = 0; i < nombre.length; i++) suma += nombre.charCodeAt(i);
  return coloresAvatar[suma % coloresAvatar.length];
}

function crearEl(tag, clase, texto) {
  let el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function crearWinNoti(datos) {
  let familia = iconoFamilia[datos.familia] ? datos.familia : 'whatsapp';
  let remitente = datos.nombreApp || '';
  let mensaje = datos.mensaje || '';

  let noti = crearEl('div', 'win-noti wf-' + familia);

  // Encabezado: ícono + nombre de la app + cerrar
  let head = crearEl('div', 'wn-head');
  let mini = crearEl('img', 'wn-mini');
  mini.src = iconoFamilia[familia];
  mini.alt = '';
  head.appendChild(mini);
  head.appendChild(crearEl('span', 'wn-app', nombreFamilia[familia]));
  head.appendChild(crearEl('span', 'wn-x', '···   ✕'));
  noti.appendChild(head);

  let cuerpo = crearEl('div', 'wn-cuerpo');

  if (familia === 'whatsapp') {
    let avatar = crearEl('div', 'wn-avatar');
    avatar.style.background = colorAvatar(remitente);
    if (datos.esGrupo) {
      avatar.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="9" cy="9" r="3.2" fill="#fff"/><circle cx="16.5" cy="10" r="2.6" fill="#fff" opacity=".75"/><path d="M3 19c.5-3.5 3-5 6-5s5.5 1.5 6 5z" fill="#fff"/><path d="M14.5 14.3c2.5 0 4.6 1.3 5.1 4.7H16" fill="#fff" opacity=".75"/></svg>';
    } else {
      avatar.textContent = remitente.charAt(0).toUpperCase();
    }
    cuerpo.appendChild(avatar);
    let textos = crearEl('div', 'wn-textos');
    textos.appendChild(crearEl('div', 'wn-tit', remitente));
    textos.appendChild(crearEl('div', 'wn-msg', mensaje));
    cuerpo.appendChild(textos);
    noti.appendChild(cuerpo);
    let reply = crearEl('div', 'wn-reply');
    reply.innerHTML = '<span>Escribí una respuesta</span><svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 20l18-8L3 4l2 7 9 1-9 1z" fill="#8696a0"/></svg>';
    noti.appendChild(reply);
    return noti;
  }

  let textos = crearEl('div', 'wn-textos');

  if (familia === 'banco') {
    textos.appendChild(crearEl('div', 'wn-tit', datos.titulo || remitente));
    if (datos.afectaSaldo && datos.monto > 0) {
      textos.appendChild(crearEl('div', 'wn-monto', '-' + formatearMonto(datos.monto)));
    }
    textos.appendChild(crearEl('div', 'wn-msg', datos.detalle || mensaje));
  } else if (familia === 'obrasocial') {
    let partes = mensaje.split(': ');
    if (partes.length > 1) {
      let resto = partes.slice(1).join(': ');
      textos.appendChild(crearEl('div', 'wn-tit', partes[0]));
      textos.appendChild(crearEl('div', 'wn-msg', resto.charAt(0).toUpperCase() + resto.slice(1)));
    } else {
      textos.appendChild(crearEl('div', 'wn-tit', remitente));
      textos.appendChild(crearEl('div', 'wn-msg', mensaje));
    }
  } else {
    textos.appendChild(crearEl('div', 'wn-tit', remitente));
    textos.appendChild(crearEl('div', 'wn-msg', mensaje));
  }

  cuerpo.appendChild(textos);
  noti.appendChild(cuerpo);

  // Botones propios de cada app
  if (familia === 'gmail' || familia === 'calendario') {
    if (familia === 'calendario') {
      let sel = crearEl('div', 'wn-sel');
      sel.innerHTML = '<span>Recordarme en</span><span>5 minutos ▾</span>';
      noti.appendChild(sel);
    }
    let acc = crearEl('div', 'wn-acc');
    if (familia === 'gmail') {
      acc.appendChild(crearEl('div', 'wn-btn', 'Responder'));
      acc.appendChild(crearEl('div', 'wn-btn', 'Archivar'));
    } else {
      acc.appendChild(crearEl('div', 'wn-btn wn-pri', 'Posponer'));
      acc.appendChild(crearEl('div', 'wn-btn', 'Descartar'));
    }
    noti.appendChild(acc);
  }

  return noti;
}

function mostrarNotificacionWindows(datos) {
  if (sesion.congelado) return;

  // Cada notificación suma estrés según su impacto
  sumarEstres(datosPresupuesto.estres.suma[impactoDe(datos)]);

  let noti = crearWinNoti(datos);

  // Insertar en el contenedor
  winNotiContainer.appendChild(noti);

  // Animación de entrada (con pequeño delay para que el CSS transition funcione)
  setTimeout(function() {
    noti.classList.add('mostrar');
  }, 20);

  // Programar desaparición: todas duran lo mismo (igual que en el celular)
  let duracion = 6000;

  let notiObj = {
    element: noti,
    timeout: setTimeout(function() {
      removerWinNoti(notiObj);
    }, duracion)
  };

  winNotisActivas.push(notiObj);

  // Si hay demasiadas, sacar la más vieja
  while (winNotisActivas.length > maxWinNotis) {
    let vieja = winNotisActivas.shift();
    clearTimeout(vieja.timeout);
    forzarRemoverWinNoti(vieja.element);
  }
}

function removerWinNoti(notiObj) {
  let index = winNotisActivas.indexOf(notiObj);
  if (index > -1) {
    winNotisActivas.splice(index, 1);
    notiObj.element.classList.add('ocultar');
    notiObj.element.classList.remove('mostrar');
    setTimeout(function() {
      if (notiObj.element.parentNode) {
        notiObj.element.parentNode.removeChild(notiObj.element);
      }
    }, 250);
  }
}

function forzarRemoverWinNoti(element) {
  element.classList.add('ocultar');
  element.classList.remove('mostrar');
  setTimeout(function() {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }, 250);
}

// Limpiar todas las notificaciones Windows 11
function limpiarWinNotis() {
  winNotisActivas.forEach(function(notiObj) {
    clearTimeout(notiObj.timeout);
    if (notiObj.element.parentNode) {
      notiObj.element.parentNode.removeChild(notiObj.element);
    }
  });
  winNotisActivas = [];
  if (winNotiContainer) {
    winNotiContainer.innerHTML = '';
  }
}

// =============================================================
// 10b. ESTRÉS (Capa 2: gamificación del deterioro)
// =============================================================
// El estrés va de 0 a 100. Sube solo con interrupciones.
// Según el valor, la persona está en uno de 4 niveles:
// Normal, Cansancio, Dolor, Crítico.

// Figuras de línea del avatar, una por nivel.
// Son provisorias: después se reemplazan por el modelo 3D.
let posesAvatar = [
  // 0. Normal: parada, derecha
  '<circle cx="35" cy="14" r="9"/><path d="M35 23 V60"/><path d="M35 32 L24 50"/><path d="M35 32 L46 50"/><path d="M35 60 L27 98"/><path d="M35 60 L43 98"/>',
  // 1. Cansancio: encorvada, brazos caídos
  '<circle cx="40" cy="20" r="9"/><path d="M38 29 L32 62"/><path d="M36 35 L28 58"/><path d="M36 35 L40 60"/><path d="M32 62 L26 98"/><path d="M32 62 L40 98"/>',
  // 2. Dolor: mano en la cabeza
  '<circle cx="38" cy="18" r="9"/><path d="M36 27 L32 62"/><path d="M35 33 L46 30 L44 16"/><path d="M35 33 L26 54"/><path d="M32 62 L25 98"/><path d="M32 62 L40 98"/>',
  // 3. Crítico: de rodillas, cabeza abajo
  '<circle cx="44" cy="46" r="9"/><path d="M40 54 L30 76"/><path d="M37 60 L46 82"/><path d="M36 60 L26 80"/><path d="M30 76 L44 92 L44 100"/><path d="M30 76 L20 100 L34 100"/>'
];

// Dibuja los 10 segmentos vacíos de la barra (una sola vez)
function generarBarraEstres() {
  barraEstresEl.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    let seg = document.createElement('i');
    seg.classList.add('seg-' + i);
    barraEstresEl.appendChild(seg);
  }
}

// Devuelve el impacto de una notificación: "bajo", "medio" o "alto".
// Si el celular lo manda, se usa ese. Si no, se estima por la categoría.
function impactoDe(datos) {
  if (datos.impacto && datosPresupuesto.estres.suma[datos.impacto]) {
    return datos.impacto;
  }
  return datosPresupuesto.estres.impactoPorCategoria[datos.categoria] || 'bajo';
}

// Devuelve el número de nivel actual (0 a 3)
function nivelActual() {
  let niveles = datosPresupuesto.estres.niveles;
  let nivel = 0;
  for (let i = 0; i < niveles.length; i++) {
    if (sesion.estres >= niveles[i].desde) nivel = i;
  }
  return nivel;
}

// Suma estrés (nunca pasa de 100)
function sumarEstres(cantidad) {
  if (sesion.congelado || !cantidad) return;
  let antes = sesion.estres;
  sesion.estres = Math.min(100, sesion.estres + cantidad);
  if (sesion.estres > sesion.estresMaximo) {
    sesion.estresMaximo = sesion.estres;
  }
  actualizarEstresUI();
  revisarGlitch(antes, sesion.estres);
}

// Actualiza barra, nombre del nivel, avatar y botón de aspirina
function actualizarEstresUI() {
  let nivel = nivelActual();
  let llenos = Math.ceil(sesion.estres / 10);

  let segmentos = barraEstresEl.querySelectorAll('i');
  segmentos.forEach(function(seg, i) {
    seg.classList.toggle('lleno', i < llenos);
  });

  nivelEstresEl.textContent = datosPresupuesto.estres.niveles[nivel].nombre;
  nivelEstresEl.className = 'nivel-estres nivel-' + nivel;

  // Avatar: la madre en línea fucsia (mismo estilo que la animación de la aspirina).
  // Normal y Cansancio: ojos abiertos con parpadeo. Dolor y Crítico: la mano en la sien.
  // El nivel decide qué capa se ve y cuánto tiembla la línea (ver styles.css).
  if (!avatarEl.querySelector('.av-abierto')) {
    let fig = datosPresupuesto.estres.avatarLinea;
    avatarEl.innerHTML =
      '<img class="av-capa av-abierto" src="' + fig.abierto + '" alt="">' +
      '<img class="av-capa av-cerrado" src="' + fig.cerrado + '" alt="">' +
      '<img class="av-capa av-dolor" src="' + fig.dolor + '" alt="">';
  }
  let parpadeando = avatarEl.classList.contains('parpadea');
  avatarEl.className = 'avatar-nivel-' + nivel + (parpadeando ? ' parpadea' : '');

  // Clase de nivel en toda la app (para los efectos de degradación que vienen después)
  appEl.classList.remove('nivel-0', 'nivel-1', 'nivel-2', 'nivel-3');
  appEl.classList.add('nivel-' + nivel);

  // Botón de aspirina: aparece desde Cansancio, si quedan usos
  let quedan = datosPresupuesto.estres.aspirina.usos - sesion.aspirinasUsadas;
  aspirinasRestantesEl.textContent = quedan;
  // La aspirina ya no está en la barra: se toma desde el aviso del máximo
  btnAspirina.classList.add('oculto');
}

// =============================================================
// 10c. AUTOCUIDADO: TOMAR UNA ASPIRINA
// =============================================================
// Congela la planilla unos segundos. El reloj sigue corriendo.
// Al terminar, baja el estrés.

function tomarAspirina() {
  let config = datosPresupuesto.estres.aspirina;
  if (sesion.congelado || sesion.bloqueado) return;
  if (sesion.aspirinasUsadas >= config.usos) return;

  sesion.aspirinasUsadas++;
  sesion.bloqueado = true;
  actualizarEstresUI();

  let cuenta = config.segundos;
  aspirinaCuentaEl.textContent = cuenta;
  overlayAspirina.classList.remove('no-disp');
  overlayAspirina.classList.add('disp');

  // Arrancar la animación desde el primer cuadro
  overlayAspirina.classList.remove('anim-on');
  void overlayAspirina.offsetWidth;
  overlayAspirina.classList.add('anim-on');
  let escalaTemblor = document.getElementById('temblor-aspirina-escala');
  if (escalaTemblor && escalaTemblor.beginElement) escalaTemblor.beginElement();

  sesion.intervaloAspirina = setInterval(function() {
    cuenta--;
    aspirinaCuentaEl.textContent = cuenta;
    if (cuenta <= 0) {
      terminarAspirina();
      // La barra vuelve al punto donde empezó la experiencia
      sesion.estres = datosPresupuesto.estres.inicial;
      actualizarEstresUI();
    }
  }, 1000);
}

function terminarAspirina() {
  if (sesion.intervaloAspirina) {
    clearInterval(sesion.intervaloAspirina);
    sesion.intervaloAspirina = null;
  }
  sesion.bloqueado = false;
  overlayAspirina.classList.remove('disp');
  overlayAspirina.classList.add('no-disp');
}

// -------------------------------------------------------------
// Parpadeo del avatar, con ritmo irregular como uno real:
// cada 2 a 5 segundos, a veces doble. En Cansancio, más seguido
// y con los ojos cerrados un poco más de tiempo.
// -------------------------------------------------------------

function programarParpadeo() {
  let nivel = nivelActual();
  let espera = nivel === 1 ? 1200 + Math.random() * 2300 : 2000 + Math.random() * 3200;
  setTimeout(function() {
    parpadear(nivelActual() === 1 ? 260 : 140);
    // A veces, un segundo parpadeo seguido
    if (Math.random() < 0.2) {
      setTimeout(function() { parpadear(130); }, 330);
    }
    programarParpadeo();
  }, espera);
}

function parpadear(duracion) {
  avatarEl.classList.add('parpadea');
  setTimeout(function() { avatarEl.classList.remove('parpadea'); }, duracion);
}

programarParpadeo();

// Vuelve el estrés al valor inicial (al empezar y al reiniciar)
function reiniciarEstres() {
  terminarAspirina();
  sesion.estres = datosPresupuesto.estres.inicial || 0;
  sesion.estresMaximo = sesion.estres;
  sesion.aspirinasUsadas = 0;
  actualizarEstresUI();
}

generarBarraEstres();
reiniciarEstres();

// =============================================================
// GLITCH Y DEGRADACIÓN
// Cada vez que la barra cambia de color, la pantalla se rompe un
// instante. En el máximo, el glitch más fuerte y el aviso de la
// aspirina. Sin destellos de luz: se mueve y se desarma, no parpadea.
// =============================================================

let capaGlitch = document.getElementById('capa-glitch');
let overlayMaximo = document.getElementById('overlay-maximo');
let panelEl = document.getElementById('panel-presupuesto');
let timeoutGlitch = null;
let intervaloFranjas = null;

function revisarGlitch(antes, despues) {
  let cruzado = null;
  datosPresupuesto.glitch.forEach(function(g) {
    if (antes < g.umbral && despues >= g.umbral) cruzado = g;
  });
  if (!cruzado) return;

  sesion.glitches.push({ umbral: cruzado.umbral, segundo: segundosTranscurridos() });
  hacerGlitch(cruzado.tipo, cruzado.duracion);

  if (cruzado.umbral >= 100) {
    // El aviso aparece cuando termina el glitch fuerte
    sesion.maximoPendiente = true;
    setTimeout(revisarMaximoPendiente, cruzado.duracion);
  }
}

function hacerGlitch(tipo, duracion) {
  terminarGlitch();
  panelEl.classList.add('glitch', 'glitch-' + tipo);
  capaGlitch.className = 'disp glitch-' + tipo;

  let cantidad = tipo === 'fuerte' ? 7 : (tipo === 'medio' ? 4 : 2);
  moverFranjas(cantidad);
  intervaloFranjas = setInterval(function() { moverFranjas(cantidad); }, 140);

  timeoutGlitch = setTimeout(terminarGlitch, duracion);
}

// Franjas horizontales en lugares al azar que distorsionan lo de abajo
function moverFranjas(cantidad) {
  capaGlitch.innerHTML = '';
  for (let i = 0; i < cantidad; i++) {
    let f = document.createElement('i');
    f.style.top = (Math.random() * 92) + '%';
    f.style.height = (4 + Math.random() * 40) + 'px';
    f.style.transform = 'translateX(' + Math.round((Math.random() - 0.5) * 60) + 'px)';
    capaGlitch.appendChild(f);
  }
}

function terminarGlitch() {
  if (timeoutGlitch) clearTimeout(timeoutGlitch);
  if (intervaloFranjas) clearInterval(intervaloFranjas);
  timeoutGlitch = null;
  intervaloFranjas = null;
  panelEl.classList.remove('glitch', 'glitch-corto', 'glitch-medio', 'glitch-fuerte');
  capaGlitch.className = 'no-disp';
  capaGlitch.innerHTML = '';
}

// El aviso del máximo espera si hay una llamada, el mail o la aspirina
function revisarMaximoPendiente() {
  if (!sesion.maximoPendiente || sesion.congelado || sesion.bloqueado) return;
  sesion.maximoPendiente = false;

  let quedan = datosPresupuesto.estres.aspirina.usos - sesion.aspirinasUsadas;
  if (quedan <= 0) return;   // Supuesto: sin aspirinas, solo el glitch

  sesion.bloqueado = true;
  overlayMaximo.classList.remove('no-disp');
  overlayMaximo.classList.add('disp');
}

document.getElementById('btn-tomar-aspirina').addEventListener('click', function() {
  overlayMaximo.classList.remove('disp');
  overlayMaximo.classList.add('no-disp');
  sesion.bloqueado = false;
  tomarAspirina();
});

// =============================================================
// MAIL URGENTE DEL EOE
// Una sola opción: confirmar asistencia. Descuenta el día de
// presentismo y suma estrés como impacto alto.
// =============================================================

let overlayMail = document.getElementById('overlay-mail');

function revisarMailEOE() {
  let m = datosPresupuesto.mailEOE;
  if (!m || sesion.mailEOE || sesion.bloqueado || sesion.congelado) return;
  if (segundosTranscurridos() < m.segundo) return;

  sesion.mailEOE = { inicio: Date.now(), segundosHastaConfirmar: null };
  sesion.bloqueado = true;
  document.getElementById('mail-asunto').textContent = m.asunto;
  document.getElementById('mail-de').textContent = m.de;
  document.getElementById('mail-cuerpo').textContent = m.cuerpo;
  document.getElementById('btn-mail').textContent = m.boton;
  overlayMail.classList.remove('no-disp');
  overlayMail.classList.add('disp');
  sumarEstres(datosPresupuesto.estres.suma.alto);
}

document.getElementById('btn-mail').addEventListener('click', function() {
  let m = datosPresupuesto.mailEOE;
  sesion.mailEOE.segundosHastaConfirmar =
    Math.round((Date.now() - sesion.mailEOE.inicio) / 100) / 10;
  overlayMail.classList.remove('disp');
  overlayMail.classList.add('no-disp');
  sesion.bloqueado = false;

  // El descuento entra como un débito más
  recibirDebito({
    id: 'eoe',
    origen: m.origenDescuento,
    mensaje: m.mensajeDescuento,
    monto: m.descuento
  });
});

function cerrarMailEOE() {
  overlayMail.classList.remove('disp');
  overlayMail.classList.add('no-disp');
}

// =============================================================
// LLAMADAS ENTRANTES
// Entran en momentos fijos (datosPresupuesto.llamadas), suman
// estrés como impacto alto y bloquean la planilla. No se pueden
// atender: solo cortar. El reloj sigue corriendo.
// =============================================================

let overlayLlamada = document.getElementById('overlay-llamada');
let llamadaEl = document.getElementById('llamada');
let btnCortar = document.getElementById('btn-cortar');
let audioLlamada = null;

function segundosTranscurridos() {
  return datosPresupuesto.tiempoTotal - sesion.tiempoRestante;
}

function revisarLlamadas() {
  let t = segundosTranscurridos();
  datosPresupuesto.llamadas.forEach(function(ll) {
    let yaSonó = sesion.llamadas.some(function(r) { return r.quien === ll.quien; });
    if (yaSonó || sesion.llamadaActiva || t < ll.segundo) return;
    // Si está tomando la aspirina, la llamada espera a que termine
    if (sesion.bloqueado) return;
    entrarLlamada(ll);
  });
}

function entrarLlamada(ll) {
  if (sesion.congelado) return;

  if (ll.dispositivo === 'celular') {
    entrarLlamadaCelular(ll);
    return;
  }

  sesion.llamadaActiva = { quien: ll.quien, inicio: Date.now() };
  sesion.bloqueado = true;

  llamadaEl.className = 'llamada ll-' + ll.quien;
  document.getElementById('ll-encabezado').textContent = ll.encabezado;
  document.getElementById('ll-nombre').textContent = ll.nombre;
  document.getElementById('ll-sub').textContent = ll.sub;
  document.getElementById('ll-boton').textContent = ll.boton;

  let cara = document.getElementById('ll-cara');
  let mensaje = document.getElementById('ll-mensaje');
  if (ll.quien === 'cobranza') {
    cara.innerHTML = '<svg viewBox="0 0 24 24" width="52" height="52"><circle cx="12" cy="8" r="4" fill="#5a5a62"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="#5a5a62"/></svg>';
    mensaje.textContent = ll.mensaje;
  } else if (ll.mensaje) {
    cara.innerHTML = '<span>' + ll.nombre.charAt(0) + '</span>';
    mensaje.innerHTML = '';
    let b = document.createElement('b');
    b.textContent = ll.nombre + ': ';
    mensaje.appendChild(b);
    mensaje.appendChild(document.createTextNode(ll.mensaje));
  }
  // Si no hay mensaje, el recuadro no se muestra
  mensaje.style.display = ll.mensaje ? '' : 'none';

  overlayLlamada.classList.remove('no-disp');
  overlayLlamada.classList.add('disp');

  sumarEstres(datosPresupuesto.estres.suma.llamada);
  sonarLlamada(ll);
}

// --- Llamada que suena en el celular ---
// La notebook muestra un cartel y queda bloqueada hasta que el
// celular avisa que la persona colgó. Si el celular no está
// conectado, la llamada no se hace (no bloquea para siempre).
let overlayCelular = document.getElementById('overlay-celular');

function entrarLlamadaCelular(ll) {
  if (!conectado) {
    sesion.llamadas.push({ quien: ll.quien, segundosHastaCortar: null, sinCelular: true });
    return;
  }
  sesion.llamadaActiva = { quien: ll.quien, inicio: Date.now(), enCelular: true };
  sesion.bloqueado = true;
  overlayCelular.classList.remove('no-disp');
  overlayCelular.classList.add('disp');
  sumarEstres(datosPresupuesto.estres.suma.llamada);
  enviarLlamada({ estado: 'entrante', quien: ll.quien, nombre: ll.nombre, sub: ll.sub, sonido: ll.sonido, sonidoCortar: ll.sonidoCortar });
}

// La llama websocket-client.js cuando el celular avisa que colgaron
function llamadaCortadaEnCelular(quien) {
  if (!sesion.llamadaActiva || !sesion.llamadaActiva.enCelular) return;
  cortarLlamada();
}

function cortarLlamada() {
  if (!sesion.llamadaActiva) return;
  // Sonido de cortar, si la llamada tiene uno. Si la llamada es en el
  // celular, el sonido lo hace el celular.
  let config = datosPresupuesto.llamadas.find(function(l) { return l.quien === sesion.llamadaActiva.quien; });
  if (config && config.sonidoCortar && !sesion.llamadaActiva.enCelular) {
    new Audio(config.sonidoCortar).play().catch(function() {});
  }
  sesion.llamadas.push({
    quien: sesion.llamadaActiva.quien,
    segundosHastaCortar: Math.round((Date.now() - sesion.llamadaActiva.inicio) / 100) / 10
  });
  cerrarLlamada();
}

function cerrarLlamada() {
  if (sesion.llamadaActiva && sesion.llamadaActiva.enCelular) {
    // Si se cierra desde la notebook (fin del tiempo, reinicio), el celular deja de sonar
    enviarLlamada({ estado: 'terminar', quien: sesion.llamadaActiva.quien });
  }
  overlayCelular.classList.remove('disp');
  overlayCelular.classList.add('no-disp');
  sesion.llamadaActiva = null;
  sesion.bloqueado = false;
  callarLlamada();
  overlayLlamada.classList.remove('disp');
  overlayLlamada.classList.add('no-disp');
}

btnCortar.addEventListener('click', cortarLlamada);

// Ringtone provisorio con Web Audio (hasta tener el diseño sonoro).
// Sale por los parlantes de la notebook.
function sonarLlamada(ll) {
  let quien = ll.quien;

  // Si la llamada tiene su propio archivo de sonido, suena en loop
  if (ll.sonido) {
    let audio = new Audio(ll.sonido);
    audio.loop = true;
    audio.volume = 0.9;
    audio.play().catch(function() {});
    audioLlamada = { archivo: audio };
    return;
  }

  try {
    let ctx = new (window.AudioContext || window.webkitAudioContext)();
    let tonos = quien === 'cobranza' ? [440, 480] : [784, 988];
    let gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    let oscs = tonos.map(function(f) {
      let o = ctx.createOscillator();
      o.type = quien === 'cobranza' ? 'sine' : 'triangle';
      o.frequency.value = f;
      o.connect(gain);
      o.start();
      return o;
    });
    // 1 segundo sonando, 1 segundo de silencio, en loop
    let encendido = false;
    let intervalo = setInterval(function() {
      encendido = !encendido;
      gain.gain.setTargetAtTime(encendido ? 0.12 : 0, ctx.currentTime, 0.02);
    }, 1000);
    gain.gain.setTargetAtTime(0.12, ctx.currentTime, 0.02);
    audioLlamada = { ctx: ctx, oscs: oscs, intervalo: intervalo };
  } catch (e) {
    audioLlamada = null;
  }
}

function callarLlamada() {
  if (!audioLlamada) return;
  if (audioLlamada.archivo) {
    audioLlamada.archivo.pause();
    audioLlamada.archivo.currentTime = 0;
    audioLlamada = null;
    return;
  }
  clearInterval(audioLlamada.intervalo);
  audioLlamada.oscs.forEach(function(o) { try { o.stop(); } catch (e) {} });
  audioLlamada.ctx.close();
  audioLlamada = null;
}

// =============================================================
// 11. FINALIZAR LA EXPERIENCIA (antes sección 10)
// =============================================================

function finalizarExperiencia(fueSalidaAnticipada) {
  sesion.congelado = true;
  sesion.salidaAnticipada = fueSalidaAnticipada;
  sesion.timestampFin = Date.now();

  // Avisar al celular que pare
  enviarStop();

  // Si quedó una llamada sonando, se registra como no cortada
  if (sesion.llamadaActiva) {
    sesion.llamadas.push({ quien: sesion.llamadaActiva.quien, segundosHastaCortar: null });
    cerrarLlamada();
  }

  // Guardar resultado en el servidor
  enviarResultado({
    saldoInicial: datosPresupuesto.saldoInicial,
    saldoFinal: sesion.saldoActual,
    tiempoTotal: datosPresupuesto.tiempoTotal,
    rubros: sesion.rubros,
    debitosRecibidos: sesion.debitosRecibidos,
    salidaAnticipada: sesion.salidaAnticipada,
    timestampInicio: sesion.timestampInicio,
    timestampFin: sesion.timestampFin,
    estresFinal: sesion.estres,
    estresMaximo: sesion.estresMaximo,
    aspirinasUsadas: sesion.aspirinasUsadas,
    freelanceCobrado: sesion.freelanceCobrado,
    llamadas: sesion.llamadas,
    mailEOE: sesion.mailEOE,
    glitches: sesion.glitches,
    deuda: sesion.saldoActual < 0 ? -sesion.saldoActual : 0,
    pagadoConTarjeta: totalDe(sesion.rubros.filter(function(r) {
      return r.estado === 'pagado' && r.conTarjeta;
    })),
    sinPagar: sesion.rubros.filter(function(r) {
      return r.estado !== 'pagado';
    }).map(function(r) { return r.id; })
  });

  // Cerrar lo que haya quedado abierto
  cerrarMailEOE();
  terminarGlitch();
  overlayMaximo.classList.remove('disp');
  overlayMaximo.classList.add('no-disp');

  // Cortar la aspirina si estaba en curso y ocultar el botón
  terminarAspirina();
  btnAspirina.classList.add('oculto');

  if (sesion.intervaloTemporizador) {
    clearInterval(sesion.intervaloTemporizador);
    sesion.intervaloTemporizador = null;
  }

  let filas = tbodyRubros.querySelectorAll('tr');
  filas.forEach(function(fila) {
    fila.classList.add('fila-congelada');
  });

  toastContainer.innerHTML = '';
  limpiarWinNotis();

  llenarResumen();

  btnEncuesta.href = URL_ENCUESTA;

  setTimeout(function() {
    panelPresupuesto.classList.add('no-disp');
    modalCierre.classList.remove('no-disp');
    modalCierre.classList.add('disp');
  }, 1500);
}

// =============================================================
// 10b. RESUMEN DE CIERRE
// Saldo o deuda, lo pagado con tarjeta, los débitos y la lista
// de lo que quedó sin pagar.
// =============================================================

function totalDe(lista) {
  let total = 0;
  lista.forEach(function(item) { total += item.monto; });
  return total;
}

function llenarResumen() {
  let pagados = sesion.rubros.filter(function(r) { return r.estado === 'pagado'; });
  let conTarjeta = pagados.filter(function(r) { return r.conTarjeta; });
  let sinPagar = sesion.rubros.filter(function(r) { return r.estado !== 'pagado'; });

  // Saldo final o deuda
  let labelSaldo = document.getElementById('resumen-saldo-label');
  let valorSaldo = document.getElementById('resumen-saldo');
  if (sesion.saldoActual < 0) {
    labelSaldo.textContent = 'Terminaste el mes con deuda';
    valorSaldo.textContent = formatearMonto(sesion.saldoActual);
    valorSaldo.classList.add('resumen-rojo');
  } else {
    labelSaldo.textContent = 'Saldo final';
    valorSaldo.textContent = formatearMonto(sesion.saldoActual);
    valorSaldo.classList.remove('resumen-rojo');
  }

  // Pagado con tarjeta
  let valorTarjeta = document.getElementById('resumen-tarjeta');
  if (conTarjeta.length > 0) {
    valorTarjeta.textContent = formatearMonto(totalDe(conTarjeta)) +
      ' (' + conTarjeta.length + (conTarjeta.length === 1 ? ' rubro)' : ' rubros)');
    valorTarjeta.classList.add('resumen-rojo');
  } else {
    valorTarjeta.textContent = 'Nada';
    valorTarjeta.classList.remove('resumen-rojo');
  }

  // Débitos automáticos
  let cantDebitos = sesion.debitosRecibidos.length;
  document.getElementById('resumen-debitos').textContent = cantDebitos === 0
    ? 'Ninguno'
    : cantDebitos + ' · ' + formatearMonto(totalDe(sesion.debitosRecibidos));

  // Pagados
  document.getElementById('resumen-pagados').textContent =
    pagados.length + ' de ' + sesion.rubros.length;

  // Lista de lo que quedó sin pagar
  let listaEl = document.getElementById('lista-pendientes');
  let totalEl = document.getElementById('total-pendientes');
  let bloqueEl = document.getElementById('bloque-pendientes');
  listaEl.innerHTML = '';

  if (sinPagar.length === 0) {
    bloqueEl.classList.add('no-disp');
  } else {
    bloqueEl.classList.remove('no-disp');
    sinPagar.forEach(function(rubro) {
      let li = document.createElement('li');
      let nombre = document.createElement('span');
      nombre.textContent = rubro.nombre;
      let monto = document.createElement('span');
      monto.classList.add('pendiente-monto');
      monto.textContent = formatearMonto(rubro.monto);
      li.appendChild(nombre);
      li.appendChild(monto);
      listaEl.appendChild(li);
    });
    totalEl.textContent = formatearMonto(totalDe(sinPagar));
  }
}

// =============================================================
// 11. REINICIAR PARA EL PRÓXIMO VISITANTE
// =============================================================

function reiniciarApp() {
  // Avisar al celular que se reinicie
  enviarReset();

  sesion.saldoActual = 0;
  sesion.tiempoRestante = 0;
  sesion.rubros = [];
  sesion.debitosRecibidos = [];
  sesion.intervaloTemporizador = null;
  sesion.alertaMostrada = false;
  sesion.congelado = false;
  sesion.salidaAnticipada = false;
  sesion.timestampInicio = null;
  sesion.timestampFin = null;
  sesion.freelanceCobrado = false;
  sesion.llamadas = [];
  if (sesion.llamadaActiva) cerrarLlamada();
  sesion.mailEOE = null;
  sesion.glitches = [];
  sesion.maximoPendiente = false;
  cerrarMailEOE();
  terminarGlitch();
  overlayMaximo.classList.remove('disp');
  overlayMaximo.classList.add('no-disp');

  reiniciarEstres();

  temporizadorEl.classList.remove('tiempo-bajo');
  saldoEl.classList.remove('saldo-positivo', 'saldo-ajustado', 'saldo-negativo');
  saldoEl.classList.add('saldo-positivo');
  saldoEl.textContent = formatearMonto(datosPresupuesto.saldoInicial);
  saldoLabelEl.textContent = 'Saldo disponible';
  temporizadorEl.textContent = '2:00';
  toastContainer.innerHTML = '';
  limpiarWinNotis();
  alertaSaldo.classList.remove('disp');
  alertaSaldo.classList.add('no-disp');

  modalCierre.classList.remove('disp');
  modalCierre.classList.add('no-disp');
  panelPresupuesto.classList.add('no-disp');
  modalInicio.classList.remove('no-disp');
  modalInicio.classList.add('disp');

  btnComenzar.disabled = true;
  setTimeout(function() {
    btnComenzar.disabled = false;
  }, 3000);
}

// =============================================================
// 12. EVENTOS DE BOTONES
// =============================================================

// --- Botón COMENZAR ---
btnComenzar.addEventListener('click', function() {
  modalInicio.classList.remove('disp');
  modalInicio.classList.add('no-disp');

  panelPresupuesto.classList.remove('no-disp');
  panelPresupuesto.style.display = 'flex';

  sesion.saldoActual = datosPresupuesto.saldoInicial;
  sesion.timestampInicio = Date.now();
  sesion.freelanceCobrado = false;
  sesion.llamadas = [];
  sesion.llamadaActiva = null;
  sesion.mailEOE = null;
  sesion.glitches = [];
  sesion.maximoPendiente = false;

  reiniciarEstres();

  // Avisar al celular que arranque
  enviarStart();

  saldoEl.textContent = formatearMonto(sesion.saldoActual);

  mostrarIngresos();

  generarTabla();

  iniciarTemporizador();
});

// --- Botón SALIR (X) ---
btnSalir.addEventListener('click', function() {
  dialogoSalir.classList.remove('no-disp');
  dialogoSalir.classList.add('disp');
});

// --- Confirmar salida ---
btnConfirmarSalir.addEventListener('click', function() {
  dialogoSalir.classList.remove('disp');
  dialogoSalir.classList.add('no-disp');
  finalizarExperiencia(true);
});

// --- Cancelar salida ---
btnCancelarSalir.addEventListener('click', function() {
  dialogoSalir.classList.remove('disp');
  dialogoSalir.classList.add('no-disp');
});

// --- Botón TOMAR UNA ASPIRINA ---
btnAspirina.addEventListener('click', function() {
  tomarAspirina();
});

// --- Botón REINICIAR ---
btnReiniciar.addEventListener('click', function() {
  reiniciarApp();
});