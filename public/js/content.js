'use strict';
// Contenido educativo (editable). Cada valor alimenta la guía y el registro.
const VALORES = [
  { id: 'responsabilidad', nombre: 'Responsabilidad', color: '#3B6FB6',
    def: 'Hacerse cargo de lo que le toca y de las consecuencias de sus decisiones.',
    como: ['Dale una tarea fija y pequeña (tender su cama, alimentar a la mascota) y deja que la haga solo/a.', 'Cuando se equivoque, pregunta "¿qué pasó y cómo lo arreglamos?" en lugar de buscar culpables.', 'Deja que viva consecuencias razonables, sin rescatarlo de inmediato.'],
    preguntas: ['¿Qué decisión tomaste hoy de la que te sientes orgulloso/a?', 'Si pudieras repetir ese momento, ¿qué harías distinto?'],
    di: '"Confío en que puedes encargarte de esto."', evita: '"Mejor lo hago yo, para que quede bien."',
    reto: 'Esta semana, que cada integrante tenga una tarea fija en casa y la marquen juntos al terminar el día.' },
  { id: 'respeto', nombre: 'Respeto', color: '#7B5EA7',
    def: 'Tratar a los demás, y a sí mismo, con consideración, incluso cuando no está de acuerdo.',
    como: ['Habla a tu hijo/a como quieres que hable con otros: sin gritos ni burlas.', 'Usa "por favor" y "gracias" en casa todos los días.', 'En un desacuerdo, hablen por turnos: uno habla y el otro repite lo que entendió.'],
    preguntas: ['¿Cómo crees que se sintió esa persona cuando le dijiste eso?', '¿Cómo podemos decir que no estamos de acuerdo sin lastimar?'],
    di: '"Puedes estar enojado/a, pero no puedes gritarme. Respira y lo hablamos."', evita: '"Porque yo lo digo y punto."',
    reto: 'Durante una semana, nadie interrumpe en la mesa: quien interrumpe guarda silencio un turno.' },
  { id: 'honestidad', nombre: 'Honestidad', color: '#C98400',
    def: 'Decir la verdad y actuar con transparencia, incluso cuando cuesta.',
    como: ['Agradece la verdad antes de corregir el error: "gracias por decírmelo".', 'No castigues más fuerte al que confiesa que al que oculta.', 'Evita las mentiras pequeñas frente a tu hijo/a (excusas, edades en el cine): lo ve todo.'],
    preguntas: ['¿Qué es más difícil: decir la verdad o cargar con una mentira?', '¿Qué pasa con la confianza cuando alguien miente?'],
    di: '"Prefiero una verdad incómoda a una mentira cómoda. Gracias por confiar en mí."', evita: '"Si llaman, dile que no estoy."',
    reto: 'Una "hora de la verdad" semanal: cada quien cuenta un error y todos responden sin regaños.' },
  { id: 'empatia', nombre: 'Empatía', color: '#C94870',
    def: 'Entender lo que sienten los demás y actuar en consecuencia.',
    como: ['Nombra emociones en voz alta: "Veo que estás frustrado/a".', 'Antes de resolver, escucha un minuto sin interrumpir ni aconsejar.', 'Pregunta cómo se sentiría otra persona en una situación del día.'],
    preguntas: ['¿Qué crees que sentía tu compañero/a?', '¿Qué pudiste hacer para ayudarle?'],
    di: '"Entiendo que te duele. Estoy aquí contigo."', evita: '"No es para tanto, deja de llorar."',
    reto: 'Cada noche, cada quien cuenta cómo se sintió otra persona durante el día.' },
  { id: 'generosidad', nombre: 'Generosidad', color: '#2F8A68',
    def: 'Compartir lo que tiene (cosas, tiempo o ayuda) sin esperar algo a cambio.',
    como: ['Elijan juntos juguetes o ropa para donar, y que él/ella los lleve.', 'Pídele ayuda con una tarea para alguien de la familia o un vecino.', 'Reconoce el gesto, no el premio: "Vi cómo compartiste".'],
    preguntas: ['¿Qué compartiste hoy y cómo te sentiste?', '¿A quién podríamos ayudar esta semana?'],
    di: '"Gracias por compartir, eso hace más grande a la familia."', evita: '"Si compartes, te compro algo."',
    reto: 'Un acto de ayuda por semana para alguien fuera de casa, elegido por tu hijo/a.' },
  { id: 'perseverancia', nombre: 'Perseverancia', color: '#C2501F',
    def: 'Seguir intentando ante las dificultades hasta lograr la meta.',
    como: ['Elogia el esfuerzo y la estrategia, no solo el resultado.', 'Divide una meta grande en pasos pequeños y celebren cada uno.', 'Ante la frustración, pregunta "¿qué otra forma podemos probar?" en vez de resolverlo tú.'],
    preguntas: ['¿Qué fue lo más difícil y cómo lo superaste?', '¿Qué aprendiste de equivocarte?'],
    di: '"Todavía no te sale, pero cada intento te acerca."', evita: '"Es que tú no sirves para eso."',
    reto: 'Elijan una meta de la semana (por ejemplo, leer diez páginas al día) y márquenla juntos.' }
];

const ACCIONES = [
  { id: 'hable', t: 'Hablé del valor con mi hijo/a' },
  { id: 'ejemplo', t: 'Di el ejemplo con mis actos' },
  { id: 'elogio', t: 'Reconocí un buen acto' },
  { id: 'calma', t: 'Corregí con calma, sin gritos' },
  { id: 'tiempo', t: 'Dediqué tiempo sin pantallas' }
];

const TIPS = [
  'Tus hijos aprenden más de lo que haces que de lo que dices: elige un valor y practícalo frente a ellos.',
  'Dedica diez minutos sin pantallas a escuchar cómo estuvo su día.',
  'Reconoce un buen acto hoy y nómbralo: "Vi que fuiste responsable cuando…".',
  'Corrige la conducta, no a la persona: "Eso no estuvo bien", en vez de "eres malo".',
  'Cuando te equivoques, pide disculpas. Es la mejor lección de honestidad.',
  'Pregunta, no sermonees: una buena pregunta enseña más que un regaño largo.',
  'La constancia pesa más que la intensidad: los hábitos pequeños forman valores.'
];
