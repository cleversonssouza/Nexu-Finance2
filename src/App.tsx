import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Users, 
  Calendar, 
  Settings, 
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Moon,
  Sun,
  Bell,
  MoreVertical,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatCurrency, CATEGORIES, safeFormatDate } from './lib/utils';
import { getFinancialInsights } from './services/geminiService';

// --- Components ---

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <div className={cn("bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm", className)} {...props}>
    {children}
  </div>
);

const StatCard = ({ title, value, icon: Icon, color, trend, onClick }: any) => (
  <Card 
    className={cn("flex items-center gap-4 transition-all duration-200", onClick && "cursor-pointer hover:scale-[1.02] hover:shadow-md active:scale-[0.98]")}
    onClick={onClick}
  >
    <div className={cn("p-3 rounded-xl", color)}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(value)}</h3>
      {trend && (
        <p className={cn("text-xs mt-1 font-medium", trend > 0 ? "text-emerald-500" : "text-rose-500")}>
          {trend > 0 ? '+' : ''}{trend}% em relação ao mês anterior
        </p>
      )}
    </div>
  </Card>
);

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
      active 
        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-lg" 
        : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
    )}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
  </button>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpenses: 0, paidExpenses: 0, cardTotal: 0, balance: 0 });
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, [currentDate, activeTab]);

  const fetchSummary = async () => {
    try {
      const month = format(currentDate, 'MM');
      const year = format(currentDate, 'yyyy');
      const res = await fetch(`/api/summary?month=${month}&year=${year}`);
      const data = await res.json();
      
      // Update summary state
      setSummary(prev => {
        // Only update if data actually changed to avoid unnecessary re-renders
        if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
        return data;
      });
      
      // Get AI insights only if on dashboard
      if (activeTab === 'dashboard') {
        const aiInsights = await getFinancialInsights(data);
        setInsights(aiInsights);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const [items, setItems] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense' | 'card' | 'debt' | 'card_transaction'>('income');
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [cardTransactions, setCardTransactions] = useState<any[]>([]);
  const [cardFilter, setCardFilter] = useState<'all' | 'user' | 'third_party'>('all');
  const [isThirdParty, setIsThirdParty] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [currentDate, activeTab]);

  useEffect(() => {
    if (selectedCard) fetchCardTransactions(selectedCard.id);
  }, [currentDate, selectedCard, cardFilter]);

  const fetchCardTransactions = async (cardId: number) => {
    try {
      const month = format(currentDate, 'MM');
      const year = format(currentDate, 'yyyy');
      const res = await fetch(`/api/cards/${cardId}/transactions?month=${month}&year=${year}&buyer_type=${cardFilter}`);
      const data = await res.json();
      setCardTransactions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchItems = async () => {
    if (activeTab === 'dashboard') return;
    try {
      const month = format(currentDate, 'MM');
      const year = format(currentDate, 'yyyy');
      let endpoint = '';
      if (activeTab === 'income') endpoint = `/api/income?month=${month}&year=${year}`;
      if (activeTab === 'expenses') endpoint = `/api/expenses?month=${month}&year=${year}`;
      if (activeTab === 'cards') endpoint = `/api/cards`;
      
      if (endpoint) {
        const res = await fetch(endpoint);
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      let endpoint = '';
      if (modalType === 'income') endpoint = '/api/income';
      if (modalType === 'expense') endpoint = '/api/expenses';
      if (modalType === 'card') endpoint = '/api/cards';
      if (modalType === 'debt') endpoint = '/api/debts';
      if (modalType === 'card_transaction' && selectedCard) endpoint = `/api/cards/${selectedCard.id}/transactions`;

      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount as string),
          amount_planned: parseFloat(data.amount_planned as string),
          credit_limit: parseFloat(data.credit_limit as string),
          closing_day: parseInt(data.closing_day as string),
          due_day: parseInt(data.due_day as string),
          installments_total: parseInt(data.installments_total as string || '1'),
          buyer_type: isThirdParty ? 'third_party' : 'user',
        }),
      });
      setShowModal(false);
      setIsThirdParty(false);
      fetchItems();
      fetchSummary();
      if (selectedCard) fetchCardTransactions(selectedCard.id);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStatus = async (item: any) => {
    try {
      let endpoint = '';
      let body = {};
      if (activeTab === 'expenses') {
        endpoint = `/api/expenses/${item.id}`;
        body = { status: item.status === 'paid' ? 'pending' : 'paid', amount_actual: item.status === 'paid' ? 0 : item.amount_planned };
      }

      if (endpoint) {
        await fetch(endpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        fetchItems();
        fetchSummary();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteItem = async (id: number, type?: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      let endpoint = '';
      const currentType = type || activeTab;
      if (currentType === 'income') endpoint = `/api/income/${id}`;
      if (currentType === 'expenses') endpoint = `/api/expenses/${id}`;
      if (currentType === 'card_transaction') endpoint = `/api/card_transactions/${id}`; // Need to add this endpoint to server.ts
      
      if (endpoint) {
        await fetch(endpoint, { method: 'DELETE' });
        fetchItems();
        fetchSummary();
        if (selectedCard) fetchCardTransactions(selectedCard.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={cn("min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex transition-colors duration-300", isDarkMode && "dark")}>
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-8 sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-2">
          <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white dark:text-zinc-900" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Nexu Finance</h1>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={TrendingUp} label="Receitas" active={activeTab === 'income'} onClick={() => setActiveTab('income')} />
          <SidebarItem icon={TrendingDown} label="Despesas" active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} />
          <SidebarItem icon={CreditCard} label="Cartões" active={activeTab === 'cards'} onClick={() => setActiveTab('cards')} />
          <SidebarItem icon={Calendar} label="Planejamento" active={activeTab === 'planning'} onClick={() => setActiveTab('planning')} />
        </nav>

        <div className="flex flex-col gap-2">
          <SidebarItem icon={Settings} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          <button 
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="font-medium">{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 relative">
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="text-center min-w-[160px] hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 py-2 rounded-xl transition-colors group"
              >
                <h2 className="text-lg font-semibold capitalize flex items-center justify-center gap-2">
                  {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                  <Calendar className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
                </h2>
              </button>

              <AnimatePresence>
                {showDatePicker && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowDatePicker(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-2 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-20 w-64"
                    >
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              const newDate = new Date(currentDate);
                              newDate.setMonth(i);
                              setCurrentDate(newDate);
                              setShowDatePicker(false);
                            }}
                            className={cn(
                              "py-2 text-xs font-bold rounded-lg transition-colors",
                              currentDate.getMonth() === i
                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                            )}
                          >
                            {format(new Date(2024, i, 1), 'MMM', { locale: ptBR })}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4">
                        <button 
                          onClick={() => {
                            const newDate = new Date(currentDate);
                            newDate.setFullYear(currentDate.getFullYear() - 1);
                            setCurrentDate(newDate);
                          }}
                          className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="font-bold">{currentDate.getFullYear()}</span>
                        <button 
                          onClick={() => {
                            const newDate = new Date(currentDate);
                            newDate.setFullYear(currentDate.getFullYear() + 1);
                            setCurrentDate(newDate);
                          }}
                          className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setModalType(activeTab as any || 'income');
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 rounded-xl text-sm font-medium transition-all shadow-md"
            >
              <Plus className="w-4 h-4" /> Novo Registro
            </button>
          </div>
        </header>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Saldo Disponível" value={summary.balance} icon={LayoutDashboard} color="bg-zinc-900 dark:bg-zinc-700" onClick={() => setActiveTab('dashboard')} />
                <StatCard title="Total Receitas" value={summary.totalIncome} icon={TrendingUp} color="bg-emerald-500" trend={12} onClick={() => setActiveTab('income')} />
                <StatCard title="Total Despesas" value={summary.totalExpenses} icon={TrendingDown} color="bg-rose-500" trend={-5} onClick={() => setActiveTab('expenses')} />
                <StatCard title="Contas a Vencer" value={summary.totalExpenses - summary.paidExpenses} icon={Clock} color="bg-amber-500" onClick={() => setActiveTab('expenses')} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart */}
                <Card className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg">Fluxo Financeiro</h3>
                    <select className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg text-sm px-3 py-1 focus:ring-2 ring-zinc-500">
                      <option>Últimos 6 meses</option>
                      <option>Este ano</option>
                    </select>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { name: 'Jan', income: 4000, expense: 2400 },
                        { name: 'Fev', income: 3000, expense: 1398 },
                        { name: 'Mar', income: 2000, expense: 9800 },
                        { name: 'Abr', income: 2780, expense: 3908 },
                        { name: 'Mai', income: 1890, expense: 4800 },
                        { name: 'Jun', income: 2390, expense: 3800 },
                      ]}>
                        <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} tickFormatter={(v) => `R$ ${v}`} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area name="Receita" type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                        <Area name="Despesa" type="monotone" dataKey="expense" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* AI Insights */}
                <Card className="flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="font-bold text-lg">Nexu Insights</h3>
                  </div>
                  <div className="space-y-4 flex-1">
                    {insights.map((insight, i) => (
                      <div key={i} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                        <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                          {insight}
                        </p>
                      </div>
                    ))}
                  </div>
                  <button className="mt-6 w-full py-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors">
                    Ver análise detalhada
                  </button>
                </Card>
              </div>

              {/* Bottom Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Transactions */}
                <Card>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg">Transações Recentes</h3>
                    <button className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">Ver tudo</button>
                  </div>
                  <div className="space-y-4">
                    {[
                      { desc: 'Supermercado', cat: 'Alimentação', val: -450.20, date: 'Hoje', status: 'paid' },
                      { desc: 'Salário Mensal', cat: 'Salário', val: 5500.00, date: 'Ontem', status: 'paid' },
                      { desc: 'Netflix', cat: 'Assinaturas', val: -55.90, date: '24 Fev', status: 'pending' },
                      { desc: 'Aluguel', cat: 'Moradia', val: -1800.00, date: '20 Fev', status: 'paid' },
                    ].map((t, i) => (
                      <div key={i} className="flex items-center justify-between t-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            t.val > 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                          )}>
                            {t.val > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{t.desc}</p>
                            <p className="text-xs text-zinc-500">{t.cat} • {t.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn("font-bold", t.val > 0 ? "text-emerald-600" : "text-rose-600")}>
                            {t.val > 0 ? '+' : ''}{formatCurrency(t.val)}
                          </p>
                          <span className={cn(
                            "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full",
                            t.status === 'paid' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {t.status === 'paid' ? 'Pago' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Credit Cards Summary */}
                <Card>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg">Meus Cartões</h3>
                    <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-6">
                    {[
                      { name: 'Nubank Platinum', limit: 12000, used: 4500.50, color: 'bg-purple-600' },
                      { name: 'Itaú Personalité', limit: 25000, used: 2100.00, color: 'bg-orange-500' },
                    ].map((card, i) => (
                      <div key={i} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-6 rounded-md", card.color)} />
                            <p className="font-semibold">{card.name}</p>
                          </div>
                          <p className="text-sm font-medium text-zinc-500">
                            Fatura: <span className="text-zinc-900 dark:text-zinc-100 font-bold">{formatCurrency(card.used)}</span>
                          </p>
                        </div>
                        <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(card.used / card.limit) * 100}%` }}
                            className={cn("h-full rounded-full", card.color)}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                          <span>Usado: {((card.used / card.limit) * 100).toFixed(1)}%</span>
                          <span>Limite: {formatCurrency(card.limit)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {(activeTab === 'income' || activeTab === 'expenses') && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg capitalize">
                    {activeTab === 'income' ? 'Minhas Receitas' : 'Minhas Despesas'}
                  </h3>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Buscar..." 
                      className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg text-sm px-4 py-2 focus:ring-2 ring-zinc-500"
                    />
                    <button className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-zinc-500 uppercase font-bold tracking-wider border-bottom border-zinc-100 dark:border-zinc-800">
                        <th className="pb-4 px-4">Descrição</th>
                        <th className="pb-4 px-4">Categoria</th>
                        <th className="pb-4 px-4">Data</th>
                        <th className="pb-4 px-4 text-right">Valor</th>
                        <th className="pb-4 px-4 text-center">Status</th>
                        <th className="pb-4 px-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="py-4 px-4 font-medium">{item.description || item.person_name}</td>
                          <td className="py-4 px-4 text-sm text-zinc-500">{item.category || item.origin}</td>
                          <td className="py-4 px-4 text-sm text-zinc-500">{safeFormatDate(item.date || item.due_date)}</td>
                          <td className={cn(
                            "py-4 px-4 text-sm font-bold text-right",
                            activeTab === 'income' ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {formatCurrency(item.amount || item.amount_planned)}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <button 
                              onClick={() => toggleStatus(item)}
                              className={cn(
                                "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full transition-colors",
                                item.status === 'paid' || item.status === 'received' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                              )}
                            >
                              {item.status === 'paid' ? 'Pago' : item.status === 'received' ? 'Recebido' : 'Pendente'}
                            </button>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button 
                              onClick={() => deleteItem(item.id)}
                              className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded transition-colors"
                            >
                              <TrendingDown className="w-4 h-4 text-rose-400" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'cards' && (
            <motion.div
              key="cards"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {items.map((card) => (
                  <Card 
                    key={card.id} 
                    onClick={() => setSelectedCard(card)}
                    className={cn(
                      "relative overflow-hidden group cursor-pointer transition-all duration-200",
                      selectedCard?.id === card.id ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : "hover:shadow-md"
                    )}
                  >
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-8 bg-zinc-800 rounded-md border border-zinc-700 flex items-center justify-center">
                          <div className="w-4 h-4 bg-amber-400 rounded-sm opacity-50" />
                        </div>
                        <CreditCard className="w-6 h-6 text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Nome do Cartão</p>
                        <h4 className="text-lg font-bold">{card.name}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Fechamento</p>
                          <p className="font-bold">Dia {card.closing_day}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Vencimento</p>
                          <p className="font-bold">Dia {card.due_day}</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-2">
                          <span className="text-zinc-500">LIMITE DISPONÍVEL</span>
                          <span>{formatCurrency(card.credit_limit)}</span>
                        </div>
                        <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-zinc-900 dark:bg-zinc-100 w-1/3 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                <button 
                  onClick={() => { setModalType('card'); setShowModal(true); }}
                  className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors group h-full min-h-[240px]"
                >
                  <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6 text-zinc-400" />
                  </div>
                  <p className="font-bold text-zinc-400">Adicionar Cartão</p>
                </button>
              </div>

              {selectedCard && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <Card>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <h3 className="font-bold text-lg">Transações: {selectedCard.name}</h3>
                        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                          <button 
                            onClick={() => setCardFilter('all')}
                            className={cn("px-3 py-1 text-xs font-bold rounded-md transition-all", cardFilter === 'all' ? "bg-white dark:bg-zinc-700 shadow-sm" : "text-zinc-500")}
                          >
                            Todas
                          </button>
                          <button 
                            onClick={() => setCardFilter('user')}
                            className={cn("px-3 py-1 text-xs font-bold rounded-md transition-all", cardFilter === 'user' ? "bg-white dark:bg-zinc-700 shadow-sm" : "text-zinc-500")}
                          >
                            Pessoais
                          </button>
                          <button 
                            onClick={() => setCardFilter('third_party')}
                            className={cn("px-3 py-1 text-xs font-bold rounded-md transition-all", cardFilter === 'third_party' ? "bg-white dark:bg-zinc-700 shadow-sm" : "text-zinc-500")}
                          >
                            Terceiros
                          </button>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setModalType('card_transaction'); setShowModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" /> Nova Compra
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-xs text-zinc-500 uppercase font-bold tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                            <th className="pb-4 px-4">Descrição</th>
                            <th className="pb-4 px-4">Data</th>
                            <th className="pb-4 px-4">Parcelas</th>
                            <th className="pb-4 px-4 text-right">Valor Total</th>
                            <th className="pb-4 px-4 text-right">Valor Parcela</th>
                            <th className="pb-4 px-4 text-center">Tipo</th>
                            <th className="pb-4 px-4"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {cardTransactions.map((t) => (
                            <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                              <td className="py-4 px-4 font-medium">
                                {t.description}
                                {t.buyer_type === 'third_party' && (
                                  <span className="block text-[10px] text-indigo-500 font-bold uppercase">
                                    Terceiro: {t.third_party_name}
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-sm text-zinc-500">{safeFormatDate(t.date)}</td>
                              <td className="py-4 px-4 text-sm text-zinc-500">{t.installments_total}x</td>
                              <td className="py-4 px-4 text-sm font-bold text-right">{formatCurrency(t.amount)}</td>
                              <td className="py-4 px-4 text-sm font-bold text-right text-zinc-500">
                                {formatCurrency(t.amount / t.installments_total)}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className={cn(
                                  "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full",
                                  t.buyer_type === 'third_party' ? "bg-indigo-100 text-indigo-700" : "bg-zinc-100 text-zinc-700"
                                )}>
                                  {t.buyer_type === 'third_party' ? 'Terceiro' : 'Pessoal'}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <button 
                                  onClick={() => deleteItem(t.id, 'card_transaction')}
                                  className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded transition-colors"
                                >
                                  <TrendingDown className="w-4 h-4 text-rose-400" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'planning' && (
             <motion.div
              key="planning"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4"
            >
              <div className="p-6 bg-zinc-100 dark:bg-zinc-900 rounded-full">
                <Clock className="w-12 h-12 text-zinc-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Planejamento em Breve</h3>
                <p className="text-zinc-500 max-w-md mx-auto mt-2">
                  Estamos construindo uma ferramenta poderosa de projeção anual para você.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
              >
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                  <h3 className="text-xl font-bold capitalize">
                    Novo {
                      modalType === 'income' ? 'Receita' :
                      modalType === 'expense' ? 'Despesa' :
                      modalType === 'card' ? 'Cartão' :
                      modalType === 'card_transaction' ? 'Compra no Cartão' :
                      'Registro'
                    }
                  </h3>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
                </div>
                <form onSubmit={handleAddItem} className="p-6 space-y-4">
                  {modalType === 'card' ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nome do Cartão</label>
                        <input name="name" required className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 focus:ring-2 ring-zinc-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Limite</label>
                          <input name="credit_limit" type="number" step="0.01" required className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 focus:ring-2 ring-zinc-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Dia de Fechamento</label>
                          <input name="closing_day" type="number" min="1" max="31" required className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 focus:ring-2 ring-zinc-500" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Dia de Vencimento</label>
                        <input name="due_day" type="number" min="1" max="31" required className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 focus:ring-2 ring-zinc-500" />
                      </div>
                    </>
                  ) : modalType === 'card_transaction' ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Descrição</label>
                        <input name="description" required className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 focus:ring-2 ring-zinc-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Valor Total</label>
                          <input name="amount" type="number" step="0.01" required className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 focus:ring-2 ring-zinc-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nº de Parcelas</label>
                          <input name="installments_total" type="number" min="1" defaultValue="1" required className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 focus:ring-2 ring-zinc-500" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Data</label>
                        <input name="date" type="date" required className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 focus:ring-2 ring-zinc-500" />
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                        <input 
                          type="checkbox" 
                          id="thirdParty" 
                          checked={isThirdParty} 
                          onChange={(e) => setIsThirdParty(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="thirdParty" className="text-sm font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                          Compra de Terceiro
                        </label>
                      </div>
                      {isThirdParty && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nome do Terceiro</label>
                          <input name="third_party_name" required className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 focus:ring-2 ring-zinc-500" />
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Descrição</label>
                        <input name={modalType === 'debt' ? 'person_name' : 'description'} required className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 focus:ring-2 ring-zinc-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Valor</label>
                          <input name={modalType === 'expense' ? 'amount_planned' : 'amount'} type="number" step="0.01" required className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 focus:ring-2 ring-zinc-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Categoria</label>
                          <select name={modalType === 'debt' ? 'origin' : 'category'} className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 focus:ring-2 ring-zinc-500">
                            {(modalType === 'income' ? CATEGORIES.income : CATEGORIES.expense).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Data</label>
                        <input name={modalType === 'expense' ? 'due_date' : 'date'} type="date" required className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 focus:ring-2 ring-zinc-500" />
                      </div>
                    </>
                  )}
                  <button type="submit" className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all mt-4">
                    Salvar Registro
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
