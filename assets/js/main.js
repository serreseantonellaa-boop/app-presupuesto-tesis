// APP PRESUPUESTO - LÓGICA PRINCIPAL
// Este archivo controla toda la experiencia:
// 1. Habilitar el botón "Comenzar" después de 5 segundos
// 2. Generar la tabla de rubros desde datos-presupuesto.js
// 3. Manejar el temporizador de cuenta regresiva
// 4. Actualizar el saldo cuando la persona paga o posterga
// 5. Recibir débitos automáticos (por ahora simulados, después via WebSocket)
// 6. Mostrar toasts de débito
// 7. Detectar saldo negativo y cambiar el semáforo de color
// 8. Congelar todo cuando el tiempo se agota
// 9. Mostrar el resumen final
// 10. Reiniciar para el próximo visitante

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
// Todo vive en memoria. Se borra al reiniciar. Despues lo voy a guardar en un Json

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
// me la reservo hasta tener el link que necesito
let URL_ENCUESTA = 'https://forms.gle/XXXXXXXXXX';


// 1. HABILITAR BOTÓN "COMENZAR" DESPUÉS DE 3 SEGUNDOS
// Le damos tiempo a la persona para leer la consigna.

setTimeout(function() {
  btnComenzar.disabled = false;
}, 3000);


// 2. GENERAR LA TABLA DE RUBROS
// Lee los datos de datos-presupuesto.js y crea una fila por cada rubro.

function generarTabla() {
  // Limpiar tabla
  tbodyRubros.innerHTML = '';

  // Crear una copia de los rubros para esta sesión
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

  // Crear fila HTML por cada rubro
  sesion.rubros.forEach(function(rubro) {
    let fila = document.createElement('tr');
    fila.id = 'fila-' + rubro.id;

    // Celda: nombre del rubro
    let tdRubro = document.createElement('td');
    tdRubro.classList.add('td-rubro');
    tdRubro.textContent = rubro.nombre;

    // Celda: monto
    let tdMonto = document.createElement('td');
    tdMonto.classList.add('td-monto');
    tdMonto.textContent = formatearMonto(rubro.monto);

    // Celda: botones de decisión
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


// 3. FORMATEAR MONTOS
// Convierte 450000 en "$450.000"

function formatearMonto(numero) {
  let prefijo = numero < 0 ? '-$' : '$';
  let absoluto = Math.abs(numero);
  return prefijo + absoluto.toLocaleString('es-AR');
}

// 4. DECIDIR RUBRO (PAGAR O POSTERGAR)
// Cuando la persona hace click en "Pagar" o "Postergar":
// - Actualiza el estado del rubro
// - Recalcula el saldo
// - Actualiza la UI

function decidirRubro(rubroId, decision) {
  // Si la experiencia terminó, no hacer nada
  if (sesion.congelado) return;

  // Buscar el rubro en la sesión
  let rubro = sesion.rubros.find(function(r) {
    return r.id === rubroId;
  });
  if (!rubro || rubro.esAutomatico) return;

  // Actualizar estado
  rubro.estado = decision;

  // Actualizar botones en la UI
  let fila = document.getElementById('fila-' + rubroId);
  let btnPagar = fila.querySelector('.btn-pagar');
  let btnPostergar = fila.querySelector('.btn-postergar');

  // Limpiar estados activos
  btnPagar.classList.remove('activo');
  btnPostergar.classList.remove('activo');

  // Marcar el botón elegido
  if (decision === 'pagado') {
    btnPagar.classList.add('activo');
  } else {
    btnPostergar.classList.add('activo');
  }

  // Recalcular saldo
  recalcularSaldo();
}


// 5. RECALCULAR SALDO
// El saldo es: ingreso inicial - rubros pagados - débitos automáticos

function recalcularSaldo() {
  let gastado = 0;

  // Sumar rubros marcados como "pagado"
  sesion.rubros.forEach(function(rubro) {
    if (rubro.estado === 'pagado') {
      gastado += rubro.monto;
    }
  });

  // Sumar débitos automáticos del celular
  sesion.debitosRecibidos.forEach(function(debito) {
    gastado += debito.monto;
  });

  sesion.saldoActual = datosPresupuesto.saldoInicial - gastado;

  // Actualizar número en pantalla
  saldoEl.textContent = formatearMonto(sesion.saldoActual);

  // Actualizar semáforo de color
  actualizarColorSaldo();
}

// 6. SEMÁFORO DE SALDO
// Verde/blanco: más del 20% disponible
// Amarillo: entre 0% y 20%
// Rojo: negativo

function actualizarColorSaldo() {
  let porcentaje = sesion.saldoActual / datosPresupuesto.saldoInicial;

  saldoEl.classList.remove('saldo-positivo', 'saldo-ajustado', 'saldo-negativo');

  if (sesion.saldoActual < 0) {
    saldoEl.classList.add('saldo-negativo');

    // Mostrar alerta una sola vez
    if (!sesion.alertaMostrada) {
      sesion.alertaMostrada = true;
      alertaSaldo.classList.remove('no-disp');
      alertaSaldo.classList.add('disp');

      // La alerta se desvanece sola con la animación CSS (2.5s)
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

// 7. TEMPORIZADOR DE CUENTA REGRESIVA

function iniciarTemporizador() {
  sesion.tiempoRestante = datosPresupuesto.tiempoTotal;
  actualizarTemporizadorUI();

  sesion.intervaloTemporizador = setInterval(function() {
    sesion.tiempoRestante--;
    actualizarTemporizadorUI();

    // Cuando queda menos de 30 segundos, el temporizador se pone rojo
    if (sesion.tiempoRestante <= 30) {
      temporizadorEl.classList.add('tiempo-bajo');
    }

    // Cuando llega a 0, terminar la experiencia
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


// 8. RECIBIR DÉBITO AUTOMÁTICO
// Esta función se llama cuando llega un gasto desde el celular
// (por ahora la llamo simulación, después WebSocket).

function recibirDebito(datos) {
  // datos = { id: "d01", origen: "Banco Galicia", monto: 8000 }

  if (sesion.congelado) return;

  // Registrar el débito
  sesion.debitosRecibidos.push({
    id: datos.id,
    origen: datos.origen,
    monto: datos.monto,
    timestamp: Date.now()
  });

  // Recalcular saldo
  recalcularSaldo();

  // Mostrar toast
  mostrarToast(datos.origen, datos.monto);
}


// 9. TOASTS DE DÉBITO
// Aparecen abajo a la derecha, avisan que se descontó plata.

function mostrarToast(origen, monto) {
  let toast = document.createElement('div');
  toast.classList.add('toast');

  toast.innerHTML =
    '<span class="toast-origen">Débito automático:</span> ' +
    origen + ' <span class="toast-monto">-' + formatearMonto(monto) + '</span>';

  toastContainer.appendChild(toast);

  // Animación de entrada
  setTimeout(function() {
    toast.classList.add('mostrar');
  }, 10);

  // Desaparece después de 4 segundos
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


// 10. FINALIZAR LA EXPERIENCIA
// Se llama cuando el temporizador llega a 0 o la persona sale.

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

  // Detener el temporizador
  if (sesion.intervaloTemporizador) {
    clearInterval(sesion.intervaloTemporizador);
    sesion.intervaloTemporizador = null;
  }

  // Congelar la tabla (deshabilitar clicks)
  let filas = tbodyRubros.querySelectorAll('tr');
  filas.forEach(function(fila) {
    fila.classList.add('fila-congelada');
  });

  // Limpiar toasts pendientes
  toastContainer.innerHTML = '';

  // Armar el resumen
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

  // Colorear el saldo final en el resumen
  let resumenSaldoEl = document.getElementById('resumen-saldo');
  if (sesion.saldoActual < 0) {
    resumenSaldoEl.style.color = '#e74c3c';
  } else {
    resumenSaldoEl.style.color = '#ffffff';
  }

  // Configurar link de encuesta
  btnEncuesta.href = URL_ENCUESTA;

  // Mostrar modal de cierre después de un breve silencio (1.5 segundos)
  setTimeout(function() {
    panelPresupuesto.classList.add('no-disp');
    modalCierre.classList.remove('no-disp');
    modalCierre.classList.add('disp');
  }, 1500);
}


// 11. REINICIAR PARA EL PRÓXIMO VISITANTE

function reiniciarApp() {
  // Resetear estado
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

  // Limpiar UI
  temporizadorEl.classList.remove('tiempo-bajo');
  saldoEl.classList.remove('saldo-positivo', 'saldo-ajustado', 'saldo-negativo');
  saldoEl.classList.add('saldo-positivo');
  saldoEl.textContent = formatearMonto(datosPresupuesto.saldoInicial);
  temporizadorEl.textContent = '3:00';
  toastContainer.innerHTML = '';
  alertaSaldo.classList.remove('disp');
  alertaSaldo.classList.add('no-disp');

  // Ocultar cierre, mostrar inicio
  modalCierre.classList.remove('disp');
  modalCierre.classList.add('no-disp');
  panelPresupuesto.classList.add('no-disp');
  modalInicio.classList.remove('no-disp');
  modalInicio.classList.add('disp');

  // Deshabilitar botón de comenzar (3 segundos otra vez)
  btnComenzar.disabled = true;
  setTimeout(function() {
    btnComenzar.disabled = false;
  }, 3000);
}


// 12. SIMULACIÓN DE DÉBITOS (TEMPORAL)
// Esto reemplaza al WebSocket hasta que se conecten las apps.
// Dispara débitos aleatorios del pool de notificaciones de gasto.

let simulacionDebitos = null;

// Débitos que pueden llegar (sacados de datos-notificaciones.js)
let poolDebitosSimulados = [
  { id: "d01", origen: "Netflix", monto: 8000 },
  { id: "d02", origen: "Disney+", monto: 11000 },
  { id: "d03", origen: "Cuota escolar", monto: 45000 },
  { id: "d04", origen: "Prepaga SaludPlus", monto: 38000 },
  { id: "d05", origen: "Spotify", monto: 6000 },
  { id: "d06", origen: "Comisión banco", monto: 3200 },
  { id: "sv01", origen: "Factura de luz", monto: 18500 },
  { id: "sv02", origen: "Factura de gas", monto: 9800 },
  { id: "sv04", origen: "Internet", monto: 15200 },
  { id: "sv05", origen: "Expensas", monto: 32000 },
  { id: "s04", origen: "Medicamentos", monto: 12500 },
  { id: "sv07", origen: "Celular", monto: 7600 }
];

let debitosYaUsados = [];

function iniciarSimulacionDebitos() {
  programarProximoDebito();
}

function programarProximoDebito() {
  if (sesion.congelado) return;

  // Intervalo aleatorio: entre 15 y 35 segundos
  let intervalo = Math.random() * 10000 + 8000;

  simulacionDebitos = setTimeout(function() {
    if (sesion.congelado) return;

    // Elegir un débito que no se haya usado
    let disponibles = poolDebitosSimulados.filter(function(d) {
      return debitosYaUsados.indexOf(d.id) === -1;
    });

    if (disponibles.length > 0) {
      let elegido = disponibles[Math.floor(Math.random() * disponibles.length)];
      debitosYaUsados.push(elegido.id);
      recibirDebito(elegido);
    }

    // Programar el siguiente
    programarProximoDebito();
  }, intervalo);
}

function detenerSimulacionDebitos() {
  if (simulacionDebitos) {
    clearTimeout(simulacionDebitos);
    simulacionDebitos = null;
  }
  debitosYaUsados = [];
}

// =============================================================
// 13. EVENTOS DE BOTONES
// =============================================================

// --- Botón COMENZAR ---
btnComenzar.addEventListener('click', function() {
  // Ocultar modal de inicio
  modalInicio.classList.remove('disp');
  modalInicio.classList.add('no-disp');

  // Mostrar panel de presupuesto
  panelPresupuesto.classList.remove('no-disp');
  panelPresupuesto.style.display = 'flex';

  // Inicializar sesión
  sesion.saldoActual = datosPresupuesto.saldoInicial;
  sesion.timestampInicio = Date.now();
  // Avisar al celular que arranque
  enviarStart();
  saldoEl.textContent = formatearMonto(sesion.saldoActual);

  // Generar tabla de rubros
  generarTabla();

  // Arrancar temporizador
  iniciarTemporizador();

  // Arrancar simulación de débitos (temporal, después será WebSocket)
  iniciarSimulacionDebitos();
});

// --- Botón SALIR (X) ---
btnSalir.addEventListener('click', function() {
  // Mostrar diálogo de confirmación
  dialogoSalir.classList.remove('no-disp');
  dialogoSalir.classList.add('disp');
});

// --- Confirmar salida ---
btnConfirmarSalir.addEventListener('click', function() {
  dialogoSalir.classList.remove('disp');
  dialogoSalir.classList.add('no-disp');
  detenerSimulacionDebitos();
  finalizarExperiencia(true);
});

// --- Cancelar salida ---
btnCancelarSalir.addEventListener('click', function() {
  dialogoSalir.classList.remove('disp');
  dialogoSalir.classList.add('no-disp');
});

// --- Botón REINICIAR ---
btnReiniciar.addEventListener('click', function() {
  detenerSimulacionDebitos();
  reiniciarApp();
});