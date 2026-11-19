/* Regras e constantes do Discipline (tudo vindo das notas do Obsidian) */
window.D = {
  APP: 'Discipline',

  SUBJECTS: [
    { id: 'matematica', name: 'Matemática' },
    { id: 'geometria', name: 'Geometria' },
    { id: 'biologia', name: 'Biologia' },
    { id: 'fisica', name: 'Física' },
    { id: 'quimica', name: 'Química' },
    { id: 'gramatica', name: 'Gramática' },
    { id: 'interpretacao', name: 'Interpretação' },
    { id: 'literatura', name: 'Literatura' },
    { id: 'historia', name: 'História' },
    { id: 'geografia', name: 'Geografia' },
    { id: 'filosofia', name: 'Filosofia' },
    { id: 'ingles', name: 'Inglês' }
  ],

  // XP inicial pelo ENEM 2026: [1-15, 16-30, 31-45]
  ENEM_AREAS: [
    { id: 'linguagens', name: 'Linguagens', tiers: [50, 100, 150] },
    { id: 'humanas', name: 'Humanas', tiers: [50, 150, 200] },
    { id: 'naturezas', name: 'Naturezas', tiers: [50, 175, 300] },
    { id: 'exatas', name: 'Exatas', tiers: [50, 175, 300] }
  ],

  XP: { hour: 100, hourDisliked: 120, question: 5, essay: 150 },

  LIMITS: {
    minPerSubject: 30,      // minutos
    maxMinutesDay: 20 * 60, // 20h
    maxQuestions: 1000,
    maxEssays: 10,
    maxPrefs: 3
  },

  // Nível 50 = equivalente a 1000 horas de estudo (1000h × 100 XP)
  LEVEL_MAX: 50,
  LEVEL_MAX_XP: 100000,
  LEVEL_CURVE: 1.6,

  TITLES: [
    [1, 'Aluno burrinho'],
    [5, 'Aluno decente'],
    [14, 'Aluno dedicado'],
    [20, 'Aluno inteligente'],
    [25, 'Aluno nota 10'],
    [30, 'Gabaritador de provas'],
    [35, 'Aluno médio do ITA'],
    [40, 'Mestre dos vestibulares'],
    [45, 'Detentor do conhecimento'],
    [50, 'Você escolhe o título']
  ],

  // c = { form:{minutes,questions}, hour, dayMinutes, dayQuestions, daySubjects30, streak, formsCount }
  ACHIEVEMENTS: [
    { id: 'madrugador', icon: '🌅', name: 'Madrugador', desc: 'Envie o formulário com pelo menos 5 horas de estudo antes das 8h', xp: 500, check: c => c.form.minutes >= 300 && c.hour < 8 },
    { id: 'maratona1', icon: '🏃', name: 'Maratona', desc: 'Estude 3 horas no mesmo dia', xp: 200, check: c => c.dayMinutes >= 180 },
    { id: 'maratona2', icon: '🏃', name: 'Maratona 2', desc: 'Estude 5 horas no mesmo dia', xp: 400, check: c => c.dayMinutes >= 300 },
    { id: 'maratona3', icon: '🏃', name: 'Maratona 3', desc: 'Estude 10 horas no mesmo dia', xp: 1000, check: c => c.dayMinutes >= 600 },
    { id: 'maratona4', icon: '🏃', name: 'Maratona 4', desc: 'Estude 14 horas no mesmo dia', xp: 1200, check: c => c.dayMinutes >= 840 },
    { id: 'polivalente', icon: '🧩', name: 'Polivalente', desc: 'Estude ao menos 30 min de 5 matérias diferentes no mesmo dia', xp: 250, check: c => c.daySubjects30 >= 5 },
    { id: 'seq7', icon: '🔥', name: 'Sequência semanal', desc: 'Envie formulários por 7 dias seguidos', xp: 300, check: c => c.streak >= 7 },
    { id: 'seq14', icon: '🔥', name: 'Sequência bissemanal', desc: 'Envie formulários por 14 dias seguidos', xp: 400, check: c => c.streak >= 14 },
    { id: 'seq30', icon: '🔥', name: 'Sequência mensal', desc: 'Envie formulários por 30 dias seguidos', xp: 750, check: c => c.streak >= 30 },
    { id: 'quest30', icon: '✏️', name: 'Máquina de questões', desc: 'Faça 30 questões no mesmo dia', xp: 100, check: c => c.dayQuestions >= 30 },
    { id: 'quest50', icon: '✏️', name: 'Máquina de questões 2', desc: 'Faça 50 questões no mesmo dia', xp: 200, check: c => c.dayQuestions >= 50 },
    { id: 'sim90', icon: '📝', name: 'Máquina de simulados', desc: 'Faça 90 questões no mesmo dia', xp: 250, check: c => c.dayQuestions >= 90 },
    { id: 'sim180', icon: '📝', name: 'Máquina de simulados 2', desc: 'Faça 180 questões no mesmo dia', xp: 450, check: c => c.dayQuestions >= 180 },
    { id: 'sim360', icon: '📝', name: 'Máquina de simulados 3', desc: 'Faça 360 questões no mesmo dia', xp: 1000, check: c => c.dayQuestions >= 360 },
    { id: 'comecando', icon: '🚀', name: 'Começando', desc: 'Faça seu primeiro formulário', xp: 50, check: c => c.formsCount >= 1 },
    { id: 'jeito', icon: '💡', name: 'Pegando o jeito', desc: 'Faça um formulário com ao menos 2 horas de estudo totais e no mínimo 10 questões', xp: 100, check: c => c.form.minutes >= 120 && c.form.questions >= 10 }
  ]
};
