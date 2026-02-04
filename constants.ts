
import { Order, User, Status } from './types';

export const DEFAULT_ADMIN_LOGIN = 'adm';
export const DEFAULT_ADMIN_PASS = '@dm123';
export const DEFAULT_USER_PASS = '1234';

export const STATUS_COLORS = {
  'Pendente': 'bg-slate-100 text-slate-500 border-slate-200',
  'Em Produção': 'bg-amber-100 text-amber-700 border-amber-200',
  'Concluído': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Atrasado': 'bg-red-100 text-red-700 border-red-200'
};

export const MOCK_USERS: User[] = [
  { id: 'admin-id', nome: 'DIRETORIA', email: 'adm', role: 'Admin', cargo: 'ADMINISTRADOR', departamento: 'Geral', password: DEFAULT_ADMIN_PASS, isLeader: true },
  { id: 'u2', nome: 'RICARDO SILVA', email: 'ricardo', role: 'Operador', cargo: 'LÍDER PRÉ-IMP', departamento: 'preImpressao', password: DEFAULT_USER_PASS, isLeader: true },
  { id: 'u3', nome: 'BEATRIZ COSTA', email: 'bia', role: 'Operador', cargo: 'OP. IMPRESSÃO UV', departamento: 'impressao', password: DEFAULT_USER_PASS, isLeader: false },
  { id: 'u4', nome: 'CARLOS MENDES', email: 'carlos', role: 'Operador', cargo: 'SERRALHEIRO SR', departamento: 'producao', password: DEFAULT_USER_PASS, isLeader: true },
  { id: 'u5', nome: 'EQUIPE EXTERNA 01', email: 'equipe1', role: 'Operador', cargo: 'INSTALAÇÃO', departamento: 'instalacao', password: DEFAULT_USER_PASS, isLeader: false },
  { id: 'u6', nome: 'ROBERTO LOG', email: 'beto', role: 'Operador', cargo: 'EXPEDIÇÃO', departamento: 'expedicao', password: DEFAULT_USER_PASS, isLeader: false },
  { id: 'u7', nome: 'ANA DESIGN', email: 'ana', role: 'Operador', cargo: 'DESIGNER JR', departamento: 'preImpressao', password: DEFAULT_USER_PASS, isLeader: false },
  { id: 'u8', nome: 'JOÃO ACABAMENTO', email: 'joao', role: 'Operador', cargo: 'AUXILIAR', departamento: 'producao', password: DEFAULT_USER_PASS, isLeader: false }
];

export const VENDORS = ['ALINE M.', 'BRUNO S.', 'CARLA D.', 'FELIPE J.', 'MARIANA L.', 'RODRIGO P.'];

const CLIENTS = [
    'GRUPO PÃO DE AÇÚCAR', 'REDE SMART FIT', 'BANCO SANTANDER', 'CONST. TENDA', 
    'FARMÁCIAS PAGUE MENOS', 'PETROBRAS', 'SHOPPING IGUATEMI', 'REDE GRAAL', 
    'HOSPITAL SÍRIO LIBANÊS', 'BURGER KING', 'LOCALIZA HERTZ', 'VIVARA'
];

const ITEMS = [
    'LETREIRO CAIXA ALTA INOX ESCOVADO (50CM)', 
    'ADESIVAÇÃO DE FROTA - KIT COMPLETO FIORINO', 
    'TÓTEM SINALIZAÇÃO INTERNA MDF 15MM', 
    'LONA BACKLIGHT 440G - IMPRESSÃO UV (5X2M)', 
    'FAIXA DE GÔNDOLA EM PETG 1MM', 
    'REVESTIMENTO EM ACM - FACHADA PRINCIPAL', 
    'SINALIZAÇÃO DE SEGURANÇA (KIT 50 PLACAS)', 
    'DISPLAY DE MESA ACRÍLICO 3MM DOBRADO', 
    'ADESIVO JATEADO COM RECORTE ELETRÔNICO', 
    'PAINEL DE GESTÃO À VISTA (QUADRO BRANCO)',
    'BANNER PROMOCIONAL COM BASTÃO E CORDÃO',
    'PLACAS DE OBRA EM PS 2MM COM ILHÓS'
];

// Helper para gerar datas
const getDate = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const generateMockOrders = (): Order[] => {
    const orders: Order[] = [];
    let orCounter = 112050; // Começando de um número mais alto

    // Gerar 45 ordens distribuídas para um visual de tabela cheia mas organizada
    for (let i = -20; i <= 25; i++) {
        // Pula alguns dias para dar realismo
        if (Math.random() > 0.65) continue;

        const countPerDay = Math.floor(Math.random() * 3) + 1;

        for (let j = 0; j < countPerDay; j++) {
            orCounter++;
            const isPast = i < 0;
            const isToday = i === 0;
            
            // Lógica de Status Baseada na Data para parecer real
            let statusPre: Status = 'Pendente';
            let statusImp: Status = 'Pendente';
            let statusProd: Status = 'Pendente';
            let statusInst: Status = 'Pendente';
            let statusExp: Status = 'Pendente';
            let isArchived = false;
            let archivedAt = undefined;

            if (isPast) {
                // Passado: Maioria concluída
                if (Math.random() > 0.15) {
                    statusPre = 'Concluído'; statusImp = 'Concluído'; statusProd = 'Concluído'; statusInst = 'Concluído'; statusExp = 'Concluído';
                    isArchived = true;
                    archivedAt = getDate(i + 2); 
                } else {
                    // Alguns atrasados no processo
                    statusPre = 'Concluído'; statusImp = 'Em Produção'; 
                }
            } else if (isToday) {
                // Hoje: Foco total
                statusPre = 'Concluído'; statusImp = Math.random() > 0.5 ? 'Concluído' : 'Em Produção'; statusProd = statusImp === 'Concluído' ? 'Em Produção' : 'Pendente';
            } else {
                // Futuro
                if (i < 3) {
                    statusPre = 'Em Produção'; // Próximos dias começando
                }
            }

            orders.push({
                id: orCounter.toString(),
                or: orCounter.toString(),
                numeroItem: Math.random() > 0.3 ? `REF-${String(Math.floor(Math.random() * 900) + 100)}` : undefined,
                quantidade: String(Math.floor(Math.random() * 50) + 1),
                cliente: CLIENTS[Math.floor(Math.random() * CLIENTS.length)],
                vendedor: VENDORS[Math.floor(Math.random() * VENDORS.length)],
                item: ITEMS[Math.floor(Math.random() * ITEMS.length)],
                dataEntrega: getDate(i),
                createdAt: getDate(i - 15), 
                preImpressao: statusPre,
                impressao: statusImp,
                producao: statusProd,
                instalacao: statusInst,
                expedicao: statusExp,
                prioridade: Math.random() > 0.85 ? 'Alta' : Math.random() > 0.4 ? 'Média' : 'Baixa',
                isArchived: isArchived,
                archivedAt: archivedAt,
                isRemake: Math.random() > 0.97, 
                observacao: Math.random() > 0.8 ? 'CLIENTE EXIGE COR PANTONE 485C' : '',
                assignments: {}, // Inicializa vazio
                filePaths: [], // Inicializa vazio
                attachments: Math.random() > 0.7 ? [{id: '1', name: 'arte_final.pdf', type: 'application/pdf', size: 1024, dataUrl: '', uploadedAt: new Date().toISOString()}] : []
            });
        }
    }
    // Adicionar um item fixo de exemplo "Problemático" para teste visual
    orders.push({
        id: '999999',
        or: '112999',
        numeroItem: 'REF-URGENTE',
        quantidade: '1000',
        cliente: 'CLIENTE ESPECIAL VIP',
        vendedor: 'DIRETORIA',
        item: 'PROJETO ESPECIAL DE SINALIZAÇÃO COMPLETA (URGENTE)',
        dataEntrega: getDate(-1), // Atrasado ontem
        createdAt: getDate(-5),
        preImpressao: 'Concluído',
        impressao: 'Concluído',
        producao: 'Em Produção',
        instalacao: 'Pendente',
        expedicao: 'Pendente',
        prioridade: 'Alta',
        isArchived: false,
        isRemake: true,
        observacao: 'PRIORIDADE MÁXIMA - ENTREGAR AMANHÃ SEM FALTA',
        assignments: {
            producao: {
                userId: 'u4',
                userName: 'CARLOS MENDES',
                assignedBy: 'DIRETORIA',
                assignedAt: new Date().toISOString(),
                note: 'Atenção aos detalhes de solda.'
            }
        },
        filePaths: []
    });

    return orders.sort((a, b) => b.or.localeCompare(a.or));
};

export const MOCK_ORDERS: Order[] = generateMockOrders();
