export const CATEGORIES = [
  // Alimentação
  'Alimentação',
  'Restaurantes & Delivery',
  'Supermercado & Mercearia',
  'Padaria & Café',
  'Bebidas',

  // Transporte
  'Transporte',
  'Combustível',
  'Aplicativos de Transporte',
  'Transporte Público',
  'Pedágios & Estacionamento',
  'Manutenção do Veículo',

  // Moradia
  'Moradia',
  'Aluguel',
  'Condomínio',
  'Água / Luz / Gás',
  'Internet & TV',
  'Telefone / Celular',
  'Reforma & Decoração',

  // Saúde
  'Saúde',
  'Plano de Saúde',
  'Farmácia',
  'Consultas & Exames',
  'Academia & Esportes',

  // Educação
  'Educação',
  'Cursos & Assinaturas',
  'Material Escolar',
  'Livros',

  // Lazer
  'Lazer & Entretenimento',
  'Cinema & Shows',
  'Viagens & Hospedagem',
  'Jogos',

  // Compras
  'Vestuário',
  'Calçados & Acessórios',
  'Tecnologia & Eletrônicos',
  'Assinaturas Digitais',
  'Móveis & Eletrodomésticos',

  // Cuidados
  'Beleza & Cuidados Pessoais',
  'Pets',

  // Financeiro
  'Fatura do Cartão',
  'Investimentos',
  'Impostos & Taxas',
  'Empréstimos & Financiamentos',

  // Outros
  'Presentes & Doações',
  'Serviços Domésticos',
  'Alimentação Pets',
  'Outros',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CAT_COLOR: Record<string, string> = {
  'Alimentação':                '#f59e0b',
  'Restaurantes & Delivery':    '#f97316',
  'Supermercado & Mercearia':   '#eab308',
  'Padaria & Café':             '#d97706',
  'Bebidas':                    '#fb923c',

  'Transporte':                 '#3b82f6',
  'Combustível':                '#2563eb',
  'Aplicativos de Transporte':  '#60a5fa',
  'Transporte Público':         '#93c5fd',
  'Pedágios & Estacionamento':  '#1d4ed8',
  'Manutenção do Veículo':      '#1e40af',

  'Moradia':                    '#8b5cf6',
  'Aluguel':                    '#7c3aed',
  'Condomínio':                 '#a78bfa',
  'Água / Luz / Gás':           '#c4b5fd',
  'Internet & TV':              '#6d28d9',
  'Telefone / Celular':         '#5b21b6',
  'Reforma & Decoração':        '#9333ea',

  'Saúde':                      '#ec4899',
  'Plano de Saúde':             '#db2777',
  'Farmácia':                   '#f472b6',
  'Consultas & Exames':         '#be185d',
  'Academia & Esportes':        '#f9a8d4',

  'Educação':                   '#10b981',
  'Cursos & Assinaturas':       '#059669',
  'Material Escolar':           '#34d399',
  'Livros':                     '#6ee7b7',

  'Lazer & Entretenimento':     '#f43f5e',
  'Cinema & Shows':             '#e11d48',
  'Viagens & Hospedagem':       '#fb7185',
  'Jogos':                      '#fda4af',

  'Vestuário':                  '#06b6d4',
  'Calçados & Acessórios':      '#0891b2',
  'Tecnologia & Eletrônicos':   '#6366f1',
  'Assinaturas Digitais':       '#4f46e5',
  'Móveis & Eletrodomésticos':  '#818cf8',

  'Beleza & Cuidados Pessoais': '#e879f9',
  'Pets':                       '#a855f7',

  'Fatura do Cartão':           '#ef4444',
  'Investimentos':               '#22c55e',
  'Impostos & Taxas':           '#78716c',
  'Empréstimos & Financiamentos':'#a16207',

  'Presentes & Doações':        '#14b8a6',
  'Serviços Domésticos':        '#64748b',
  'Alimentação Pets':           '#c084fc',
  'Outros':                     '#475569',
};
