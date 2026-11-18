// =============================================================
// WEBSOCKET CLIENT - APP DE PRESUPUESTO (NOTEBOOK)
// =============================================================
// Este archivo conecta la notebook al servidor WebSocket.
//
// ENVÍA:
//   - "identificar" → le dice al servidor "soy la notebook"
//   - "start"       → le dice al celular que arranque las notificaciones
//   - "stop"        → le dice al celular que pare
//   - "reset"       → le dice al celular que se reinicie
//   - "resultado"   → manda los datos de la sesión para guardar en JSON
//
// RECIBE:
//   - "gasto"        → el celular avisa que hay un débito automático
//   - "notificacion" → el celular envía TODAS sus notificaciones para
//                       mostrarlas como popups estilo Windows 11
// =============================================================

// --- CONFIGURACIÓN ---
// Mientras pruebes en la misma PC, dejá "localhost".
// Para la instalación real, cambiá por la IP de la notebook.
let WS_URL = 'ws://localhost:8080';

let ws = null;
let conectado = false;

// --- CONECTAR AL SERVIDOR ---
function conectarWebSocket() {
  console.log('Intentando conectar a:', WS_URL);

  ws = new WebSocket(WS_URL);

  // Cuando la conexión se abre
  ws.onopen = function() {
    console.log('Conectado al servidor WebSocket');
    conectado = true;

    // Identificarse como "notebook"
    ws.send(JSON.stringify({
      tipo: 'identificar',
      rol: 'notebook'
    }));
  };

  // Cuando llega un mensaje del servidor
  ws.onmessage = function(evento) {
    let datos;
    try {
      datos = JSON.parse(evento.data);
    } catch (error) {
      console.log('Mensaje no válido:', evento.data);
      return;
    }

    console.log('Mensaje recibido:', datos.tipo);

    // --- GASTO: el celular avisa que descuente plata ---
    if (datos.tipo === 'gasto') {
      recibirDebito({
        id: datos.id,
        origen: datos.origen,
        mensaje: datos.mensaje,
        monto: datos.monto
      });
    }

    // --- NOTIFICACION: el celular envía una notificación para mostrar en pantalla ---
    // Esto incluye TODAS las notificaciones (gastos y no gastos).
    // Se muestran como popups estilo Windows 11 sobre la pantalla de presupuesto.
    if (datos.tipo === 'notificacion') {
      mostrarNotificacionWindows(datos);
    }

    // --- LLAMADA: el celular avisa que la persona colgó ---
    if (datos.tipo === 'llamada' && datos.estado === 'cortada') {
      llamadaCortadaEnCelular(datos.quien);
    }

    // --- IDENTIFICADO: confirmación del servidor ---
    if (datos.tipo === 'identificado') {
      console.log('Servidor confirmó:', datos.mensaje);
    }
  };

  // Cuando la conexión se cierra
  ws.onclose = function() {
    console.log('Conexión cerrada. Reintentando en 3 segundos...');
    conectado = false;

    setTimeout(function() {
      conectarWebSocket();
    }, 3000);
  };

  // Cuando hay un error
  ws.onerror = function(error) {
    console.log('Error de WebSocket:', error);
  };
}

// --- ENVIAR START AL CELULAR ---
function enviarStart() {
  if (conectado && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      tipo: 'start',
      timestamp: Date.now()
    }));
    console.log('START enviado al celular');
  }
}

// --- ENVIAR STOP AL CELULAR ---
function enviarStop() {
  if (conectado && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      tipo: 'stop',
      timestamp: Date.now()
    }));
    console.log('STOP enviado al celular');
  }
}

// --- ENVIAR RESET AL CELULAR ---
function enviarReset() {
  if (conectado && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      tipo: 'reset'
    }));
    console.log('RESET enviado al celular');
  }
}

// --- ENVIAR RESULTADO DE SESIÓN ---
function enviarResultado(datosSesion) {
  if (conectado && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      tipo: 'resultado',
      sesion: datosSesion
    }));
    console.log('Resultado de sesión enviado al servidor');
  }
}

// --- LLAMADA EN EL CELULAR ---
function enviarLlamada(datos) {
  if (conectado && ws.readyState === WebSocket.OPEN) {
    datos.tipo = 'llamada';
    ws.send(JSON.stringify(datos));
  }
}

// --- INICIAR CONEXIÓN ---
conectarWebSocket();