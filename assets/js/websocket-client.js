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
//   - "gasto"       → el celular avisa que hay un débito automático
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
      // Llamar a la función de main.js que maneja los débitos
      recibirDebito({
        id: datos.id,
        origen: datos.origen,
        monto: datos.monto
      });
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
// Se llama desde main.js cuando la persona presiona "Comenzar".
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
// Se llama desde main.js cuando el temporizador llega a 0 o la persona sale.
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
// Se llama desde main.js cuando se reinicia para el próximo visitante.
function enviarReset() {
  if (conectado && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      tipo: 'reset'
    }));
    console.log('RESET enviado al celular');
  }
}

// --- ENVIAR RESULTADO DE SESIÓN ---
// Se llama desde main.js cuando la experiencia termina.
// El servidor guarda estos datos en resultados-sesiones.json.
function enviarResultado(datosSesion) {
  if (conectado && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      tipo: 'resultado',
      sesion: datosSesion
    }));
    console.log('Resultado de sesión enviado al servidor');
  }
}

// --- INICIAR CONEXIÓN ---
conectarWebSocket();