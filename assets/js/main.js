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
let tbodyRubros = document.getElementById('tbody-rubros');
let toastContainer = document.getElementById('toast-container');
let alertaSaldo = document.getElementById('alerta-saldo');

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
  timestampFin: null
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
  if (sesion.congelado) return;

  let rubro = sesion.rubros.find(function(r) {
    return r.id === rubroId;
  });
  if (!rubro || rubro.esAutomatico) return;

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

  sesion.saldoActual = datosPresupuesto.saldoInicial - gastado;

  saldoEl.textContent = formatearMonto(sesion.saldoActual);

  actualizarColorSaldo();
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

// =============================================================
// 10. FINALIZAR LA EXPERIENCIA
// =============================================================

function finalizarExperiencia(fueSalidaAnticipada) {
  sesion.congelado = true;
  sesion.salidaAnticipada = fueSalidaAnticipada;
  sesion.timestampFin = Date.now();

  // Avisar al celular que pare
  enviarStop();

  // Guardar resultado en el servidor
  enviarResultado({
    saldoInicial: datosPresupuesto.saldoInicial,
    saldoFinal: sesion.saldoActual,
    tiempoTotal: datosPresupuesto.tiempoTotal,
    rubros: sesion.rubros,
    debitosRecibidos: sesion.debitosRecibidos,
    salidaAnticipada: sesion.salidaAnticipada,
    timestampInicio: sesion.timestampInicio,
    timestampFin: sesion.timestampFin
  });

  if (sesion.intervaloTemporizador) {
    clearInterval(sesion.intervaloTemporizador);
    sesion.intervaloTemporizador = null;
  }

  let filas = tbodyRubros.querySelectorAll('tr');
  filas.forEach(function(fila) {
    fila.classList.add('fila-congelada');
  });

  toastContainer.innerHTML = '';

  let rubrosPagados = sesion.rubros.filter(function(r) {
    return r.estado === 'pagado';
  }).length;

  let rubrosPostergados = sesion.rubros.filter(function(r) {
    return r.estado === 'postergado';
  }).length;

  document.getElementById('resumen-saldo').textContent = formatearMonto(sesion.saldoActual);
  document.getElementById('resumen-debitos').textContent = sesion.debitosRecibidos.length;
  document.getElementById('resumen-pagados').textContent = rubrosPagados + ' de ' + sesion.rubros.length;
  document.getElementById('resumen-postergados').textContent = rubrosPostergados;

  let resumenSaldoEl = document.getElementById('resumen-saldo');
  if (sesion.saldoActual < 0) {
    resumenSaldoEl.style.color = '#e74c3c';
  } else {
    resumenSaldoEl.style.color = '#ffffff';
  }

  btnEncuesta.href = URL_ENCUESTA;

  setTimeout(function() {
    panelPresupuesto.classList.add('no-disp');
    modalCierre.classList.remove('no-disp');
    modalCierre.classList.add('disp');
  }, 1500);
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

  temporizadorEl.classList.remove('tiempo-bajo');
  saldoEl.classList.remove('saldo-positivo', 'saldo-ajustado', 'saldo-negativo');
  saldoEl.classList.add('saldo-positivo');
  saldoEl.textContent = formatearMonto(datosPresupuesto.saldoInicial);
  temporizadorEl.textContent = '2:00';
  toastContainer.innerHTML = '';
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

  // Avisar al celular que arranque
  enviarStart();

  saldoEl.textContent = formatearMonto(sesion.saldoActual);

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

// --- Botón REINICIAR ---
btnReiniciar.addEventListener('click', function() {
  reiniciarApp();
});