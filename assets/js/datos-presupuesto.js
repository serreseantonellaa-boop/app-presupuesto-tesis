// DATOS DEL PRESUPUESTO - INSTALACIÓN "EN UNA CABEZA MONOMARENTAL"
// Este archivo define los números de la experiencia:
// - El ingreso mensual, dividido en sus fuentes
// - Los rubros del presupuesto con sus montos y fuentes
// - La duración del temporizador
//
// HOGAR SIMULADO:
// Madre sola (30 a 45 años) y un hijo de 10 años, en CABA.
// El ingreso sale solo de la madre: dos trabajos registrados
// y trabajos freelance. Tiene obra social por el trabajo
// registrado, por eso la salud no aparece como rubro.
//
// FUENTES (actualizado 12/11/2026):
// - Canasta de crianza INDEC, septiembre 2026 (publicada 16/10/2026)
// - Reporte Inmobiliario, alquiler 2 ambientes en Liniers, septiembre 2026
// - Focus Market (Damián Di Pace), internet hogar, proyección marzo 2026
// - IIEP UBA-CONICET, servicios públicos hogar tipo AMBA, julio 2026
// - iProfesional, plan de celular más barato (Tuenti), febrero 2026
// - IPCBA (Estadística CABA), precios de limpieza e higiene, junio 2026
// - Tarifa de colectivo CABA desde 1/11/2026
// - IDECBA, Canasta Alimentaria sectores medios, septiembre 2026
// - Promedio de expensas CABA, agosto 2026 (iProfesional)
//
// DECISIÓN DE DISEÑO:
// Los 11 rubros suman $2.221.027. El ingreso del mes es de
// $1.800.000 (SUPUESTO, sin dato publicado): dos trabajos
// registrados ($900.000 + $600.000) y freelance ($300.000).
// Al empezar solo está cobrado lo de los dos trabajos
// ($1.500.000, cubre el 68% de los gastos). El freelance
// figura "a cobrar": se ve, pero no se puede gastar, y llega
// recién cuando quedan 20 segundos, sin tiempo para usarlo.
// Así la persona tiene que elegir qué no pagar, pero no se
// rinde de entrada.


let datosPresupuesto = {

  // Plata disponible al empezar: solo lo ya cobrado
  // (suma de las fuentes con aCobrar: false).
  saldoInicial: 1500000,

  // De dónde sale el ingreso. Se muestra debajo del saldo.
  // "aCobrar: true" se muestra aparte, en amarillo: es plata que
  // todavía no llegó. No suma al saldo.
  fuentesIngreso: [
    { nombre: "Trabajo 1", monto: 900000, aCobrar: false },
    { nombre: "Trabajo 2", monto: 600000, aCobrar: false },
    { nombre: "Freelance", monto: 300000, aCobrar: true }
  ],

  // Cuándo llega el freelance: segundos que quedan en el reloj.
  // Llega al final, cuando ya no hay tiempo para reorganizar.
  freelanceLlegaConSegundosRestantes: 20,
  freelanceMensaje: "Plataforma freelance: te transfirieron el pago",

  // Mostrar la fuente de cada número al lado del rubro.
  // false = no se ven en la app (las fuentes quedan en este archivo
  // y en la parte escrita de la tesis). true = se ven en gris chico.
  mostrarFuentes: false,

  // Duración de la experiencia en segundos (2 minutos).
  tiempoTotal: 120,

  // Rubros del presupuesto.
  // Cada rubro tiene:
  //   id: identificador único
  //   nombre: lo que ve la persona en pantalla
  //   monto: costo mensual en pesos
  //   fuente: de dónde sale el número (se ve en gris debajo del nombre)
  //   categoria: para agrupar visualmente
  //   estado: arranca en "pendiente", la persona lo cambia a "pagado" o "postergado"
  //   esAutomatico: false = lo decide la persona, true = lo descontó el celular
  rubros: [
    {
      id: "alquiler",
      nombre: "Alquiler",
      monto: 661110,
      fuente: "Reporte Inmobiliario, Liniers, sept. 2026",
      categoria: "vivienda",
      estado: "pendiente",
      esAutomatico: false
    },
    {
      // Promedio de expensas en CABA, agosto 2026 (iProfesional, 10/10/2026).
      id: "expensas",
      nombre: "Expensas",
      monto: 309625,
      fuente: "Promedio CABA, agosto 2026",
      categoria: "vivienda",
      estado: "pendiente",
      esAutomatico: false
    },
    {
      id: "luz",
      nombre: "Luz",
      monto: 68210,
      fuente: "IIEP UBA-CONICET, AMBA, julio 2026",
      categoria: "servicios",
      estado: "pendiente",
      esAutomatico: false
    },
    {
      id: "gas",
      nombre: "Gas",
      monto: 64862,
      fuente: "IIEP UBA-CONICET, AMBA, julio 2026",
      categoria: "servicios",
      estado: "pendiente",
      esAutomatico: false
    },
    {
      id: "agua",
      nombre: "Agua",
      monto: 41724,
      fuente: "IIEP UBA-CONICET, AMBA, julio 2026",
      categoria: "servicios",
      estado: "pendiente",
      esAutomatico: false
    },
    {
      id: "internet",
      nombre: "Internet",
      monto: 81202,
      fuente: "Focus Market, internet hogar, marzo 2026",
      categoria: "servicios",
      estado: "pendiente",
      esAutomatico: false
    },
    {
      // Plan prepago más barato relevado por iProfesional (7/2/2026). Una sola línea, la de la madre.
      id: "celular",
      nombre: "Celular",
      monto: 11500,
      fuente: "Tuenti 6 GB prepago, feb. 2026",
      categoria: "servicios",
      estado: "pendiente",
      esAutomatico: false
    },
    {
      // Canasta Alimentaria IDECBA (Estadística CABA), sept. 2026: $1.016.090 para un hogar de 4
      // (pareja de 35 años con hijos de 9 y 6), consumo de sectores medios.
      // Proporcional a 2 personas (madre e hijo): $1.016.090 / 4 x 2 = $508.045.
      id: "alimentos",
      nombre: "Alimentos",
      monto: 508045,
      fuente: "Canasta Alimentaria IDECBA, sept. 2026, proporcional a 2 personas",
      categoria: "basico",
      estado: "pendiente",
      esAutomatico: false
    },
    {
      id: "hijo",
      nombre: "Gastos del hijo (ropa, escuela, salud)",
      monto: 377231,
      fuente: "Canasta de crianza INDEC, sept. 2026",
      categoria: "crianza",
      estado: "pendiente",
      esAutomatico: false
    },
    {
      // Supuesto: 44 viajes de colectivo (tramo 3 a 6 km, $1.062,70) para ir y volver de dos trabajos.
      id: "transporte",
      nombre: "Transporte",
      monto: 46759,
      fuente: "44 viajes de colectivo por mes (supuesto)",
      categoria: "basico",
      estado: "pendiente",
      esAutomatico: false
    },
    {
      // Precios promedio IPCBA (Estadística CABA) junio 2026. Cantidades supuestas para un mes: jabón en polvo x2, suavizante, detergente x2, limpiador, lavandina x2, bolsas, jabón de tocador x3, shampoo, crema dental, desodorante, tampones.
      id: "limpieza",
      nombre: "Limpieza e higiene",
      monto: 50759,
      fuente: "Precios IPCBA junio 2026 (canasta supuesta)",
      categoria: "basico",
      estado: "pendiente",
      esAutomatico: false
    }
  ],

  // =============================================================
  // ESTRÉS (Capa 2: gamificación del deterioro)
  // =============================================================
  // El estrés va de 0 a 100 y sube SOLO por interrupciones
  // (notificaciones y llamadas), no por el paso del tiempo.
  // Valores iniciales para probar; se ajustan después de testear.
  estres: {
    // Cuánto suma cada interrupción según su impacto emocional
    // Calibrado con la partitura (2026-11-16): naranja cerca del
    // segundo 16, rojo cerca del 46, fucsia cerca del 64 y máximo
    // entre el 81 y el 85 (lo suele disparar la llamada de cobranza).
    suma: {
      bajo: 1,
      medio: 1.5,
      alto: 6,
      llamada: 8
    },

    // Mientras el celular no mande el impacto de cada notificación,
    // se estima por su categoría.
    impactoPorCategoria: {
      cuidado: "medio",
      salud: "medio",
      dinero: "medio",
      trabajo: "bajo",
      recordatorio: "bajo",
      servicios: "bajo"
    },

    // Con cuánto estrés arranca la experiencia (0 a 100).
    // La madre no empieza el mes descansada: ya llega cargada.
    // Con 70 se arranca en Dolor: al poco tiempo hay que tomar la aspirina.
    inicial: 25,   // moderado, a punto de pasar al naranja (decidido 2026-11-16)

    // Imagen del avatar para cada nivel (Normal, Cansancio, Dolor, Crítico).
    // Son miniaturas de las ilustraciones de la tesis (boceto1, 2 y 3).
    // Para usar una sola imagen fija, repetir la misma en los cuatro.
    // Avatar en línea fucsia (cuadros generados por Antonella para la aspirina)
    avatarLinea: {
      abierto: "assets/imgs/aspirina/avatar-linea-0.webp",
      cerrado: "assets/imgs/aspirina/avatar-linea-parpadeo.webp",   // misma cara, solo cambian los ojos
      dolor: "assets/imgs/aspirina/avatar-linea-1.webp"
    },

    // Desde qué valor empieza cada nivel
    niveles: [
      { nombre: "Normal",    desde: 0  },
      { nombre: "Cansancio", desde: 30 },
      { nombre: "Dolor",     desde: 60 },
      { nombre: "Crítico",   desde: 80 }   // coincide con el paso al fucsia de la barra
    ],

    // Autocuidado: al tomarla, la barra vuelve al valor inicial.
    // Cuántas veces y cuánto congela.
    aspirina: {
      usos: 1,   // una sola, y se toma cuando el estrés llega al máximo
      segundos: 5
    }
  },

  // Glitch: se dispara cada vez que la barra cambia de color.
  // umbral = valor de estrés que hay que pasar; duracion en milisegundos.
  // En el máximo (100) aparece "Tomá una aspirina para continuar".
  // Sin destellos rápidos de luz (fotosensibilidad).
  glitch: [
    { umbral: 30,  tipo: "corto",  duracion: 450 },   // pasa al naranja
    { umbral: 60,  tipo: "medio",  duracion: 800 },   // pasa al rojo
    { umbral: 80,  tipo: "medio",  duracion: 1000 },  // pasa al fucsia
    { umbral: 100, tipo: "fuerte", duracion: 1800 }   // máximo
  ],

  // Mail urgente del Equipo de Orientación Escolar (EOE).
  // Una sola opción: asistir. Descuenta el día de presentismo.
  mailEOE: {
    segundo: 58,
    de: "EOE · Equipo de Orientación Escolar",
    asunto: "URGENTE: citación a reunión",
    cuerpo: "Le solicitamos presentarse hoy a las 14 hs en la escuela para una reunión con el Equipo de Orientación Escolar por una situación de su hijo. La asistencia es obligatoria.",
    boton: "Confirmar asistencia",
    descuento: 40000,
    origenDescuento: "Trabajo 1",
    mensajeDescuento: "Inasistencia: se descuenta el día de presentismo"
  },

  // Llamadas entrantes: parte de la partitura de los 2 minutos.
  // segundo = cuándo entra, contado desde que arranca la experiencia.
  // Bloquean la planilla hasta que se cortan. Solo se pueden cortar.
  // Las notificaciones fijas del celular caen en 20, 48, 72 y 95.
  llamadas: [
    {
      quien: "amiga",
      segundo: 35,
      encabezado: "WhatsApp · Videollamada entrante",
      nombre: "Amiga",
      sub: "Te está llamando…",
      mensaje: "holaa atendé que te tengo que contar algo 😂",
      boton: "Rechazar",
      // Tono de llamada de WhatsApp (Meta), recortado para sonar en loop
      sonido: "assets/sounds/llamada-amiga.mp3",
      // Sonido de cortar la llamada de WhatsApp (Meta)
      sonidoCortar: "assets/sounds/llamada-amiga-cortar.mp3"
    },
    {
      quien: "cobranza",
      segundo: 85,
      // Suena en el celular: la notebook muestra un cartel y espera
      // a que la persona cuelgue en el teléfono.
      dispositivo: "celular",
      nombre: "Estudio de Cobranzas",
      sub: "Número desconocido",
      // Tono de llamada (archivo en la app del celular). Mientras no
      // esté, el celular solo vibra.
      sonido: "assets/sounds/llamada-cobranza.mp3"
    }
  ],

  // El costo del cuidado ($351.619, Canasta de crianza INDEC, sept. 2026)
  // NO va en la planilla: se comunica en el video o en el fanzine.
  // Si alguna vez se quiere volver a mostrar como fila, se agrega acá:
  // cuidado: { nombre, monto, fuente, etiqueta }
};
