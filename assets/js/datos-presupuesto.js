
// DATOS DEL PRESUPUESTO - INSTALACIÓN "EN UNA CABEZA MONOMARENTAL"
// Este archivo define los números de la experiencia:
// - El saldo inicial (ingreso mensual simulado)
// - Los rubros del presupuesto con sus montos
// - La duración del temporizador
//
// FUENTES DE CALIBRACIÓN:
// - Índice Crianza (DNEIyG, 2023)
// - UNICEF Argentina, Encuesta Rápida 2024
// - ENUT 2021 (INDEC)
//
// DECISIÓN DE DISEÑO:
// Los rubros suman $467.000 y el saldo es $450.000.
// El presupuesto arranca en déficit (-$17.000) ANTES de los
// débitos automáticos del celular. La persona no puede ganar.
// Esto traduce el dato de que el 61% de los hogares no logra
// cubrir gastos corrientes mensuales (UNICEF, 2024).


let datosPresupuesto = {

  // Ingreso mensual simulado.
  // Representa un salario bajo/informal en Argentina.
  saldoInicial: 450000,

  // Duración de la experiencia en segundos (3 minutos).
  tiempoTotal: 120,

  // Rubros del presupuesto.
  // Cada rubro tiene:
  //   id: identificador único
  //   nombre: lo que ve la persona en pantalla
  //   monto: costo mensual en pesos
  //   categoria: para agrupar visualmente
  //   estado: arranca en "pendiente", la persona lo cambia a "pagado" o "postergado"
  //   esAutomatico: false = lo decide la persona, true = lo descontó el celular
  rubros: [
    {
      id: "alquiler",
      nombre: "Alquiler",
      monto: 150000,
      categoria: "vivienda",
      estado: "pendiente",
      esAutomatico: false
    },
    {
      id: "alimentos",
      nombre: "Alimentos",
      monto: 120000,
      categoria: "basico",
      estado: "pendiente",
      esAutomatico: false
    },
    {
      id: "transporte",
      nombre: "Transporte",
      monto: 25000,
      categoria: "basico",
      estado: "pendiente",
      esAutomatico: false
    },
    {
      id: "escolar",
      nombre: "Cuota escolar y materiales",
      monto: 45000,
      categoria: "educacion",
      estado: "pendiente",
      esAutomatico: false
    },
    {
      id: "salud",
      nombre: "Prepaga y medicamentos",
      monto: 38000,
      categoria: "salud",
      estado: "pendiente",
      esAutomatico: false
    },
    {
      id: "servicios",
      nombre: "Servicios (luz, gas, internet, celular)",
      monto: 52000,
      categoria: "vivienda",
      estado: "pendiente",
      esAutomatico: false
    },
    {
      id: "higiene",
      nombre: "Limpieza e higiene",
      monto: 15000,
      categoria: "basico",
      estado: "pendiente",
      esAutomatico: false
    },
    {
      id: "deudas",
      nombre: "Pago mínimo tarjeta",
      monto: 22000,
      categoria: "deudas",
      estado: "pendiente",
      esAutomatico: false
    }
  ]
};