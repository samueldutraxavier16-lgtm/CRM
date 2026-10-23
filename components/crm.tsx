"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, BriefcaseBusiness,
  CalendarDays, Check, ChevronDown, CircleDollarSign, ClipboardList, Clock3,
  Columns3, Filter, LayoutDashboard, LogOut, Mail, MapPin, Menu, MessageCircle, MoreHorizontal,
  Phone, Plus, Search, Sparkles, Store, Target, X,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Opportunity, Priority, Prospect, Stage } from "@/lib/types";

type View = "painel" | "oportunidades" | "kanban" | "salvamentos" | "prospeccao";
const TODAY = "2026-10-23";
const stages: Stage[] = ["Novo", "Em contato", "Proposta", "Ganho", "Perdido"];
const priorities: Priority[] = ["Baixa", "Normal", "Alta", "Urgente"];
const money = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
const fmtDate = (s?: string) => s ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${s.slice(0, 10)}T12:00:00`)).replace(" de ", " ") : "—";
const whatsappUrl = (phone: string) => { const digits = phone.replace(/\D/g, ""); return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`; };

const demoOpportunities: Opportunity[] = [
  { id: "d1", company: "Café do Ponto", contact: "Marina Oliveira", phone: "(61) 98145-2280", email: "marina@cafedoponto.com.br", stage: "Proposta", amount: 0, owner: "Você", createdAt: "2026-10-20", closeDate: "2026-10-30", notes: "Implantação de sistema de pedidos." },
  { id: "d2", company: "Studio Clara", contact: "Clara Mendes", phone: "(61) 99214-0318", stage: "Em contato", amount: 0, owner: "Você", createdAt: "2026-10-17", closeDate: "2026-11-02" },
  { id: "d3", company: "Mercado Estação", contact: "Paulo Henrique", phone: "(61) 99820-4712", stage: "Ganho", amount: 0, owner: "Você", createdAt: "2026-10-19", closeDate: TODAY },
  { id: "d4", company: "Oficina Avenida", contact: "Rafael Costa", phone: "(61) 98330-1142", stage: "Ganho", amount: 0, owner: "Você", createdAt: "2026-10-12", closeDate: "2026-10-21" },
  { id: "d5", company: "Sabor da Vila", contact: "André Lima", phone: "(61) 99112-8057", stage: "Novo", amount: 0, owner: "Você", createdAt: "2026-10-22", closeDate: "2026-10-31" },
  { id: "d6", company: "Ateliê Aurora", contact: "Bianca Souza", phone: "(61) 98110-7724", stage: "Proposta", amount: 0, owner: "Você", createdAt: "2026-10-09", closeDate: "2026-10-28" },
];

const initialProspects: Prospect[] = [
  { id: "p1", name: "Cab Burger", category: "Hamburgueria", phone: "+55 61 99288-4866", address: "QN 7D, 1ª Etapa, Riacho Fundo II", source: "https://mindtrip.ai/restaurant/riacho-fundo-federal-district/cab-burger-hamburgueria-no-riacho-fundo-ii/re-X5o4Tk3p", checkedAt: TODAY, status: "Novo" },
  { id: "p2", name: "Seleto Burger", category: "Hamburgueria", phone: "+55 61 99272-2058", address: "QN 10, Conjunto 3, Riacho Fundo II", source: "https://wanderlog.com/place/details/10096272/seleto-burger", checkedAt: TODAY, status: "Novo" },
  { id: "p3", name: "Felipe Martins Barbearia Club", category: "Barbearia", phone: "(61) 3574-6580", address: "QN 8C, Conjunto 3, Riacho Fundo II", source: "https://www.trinks.com/felipe-martins-barbearia-club", checkedAt: TODAY, status: "Novo" },
  { id: "p4", name: "Barbearia Rodrigues", category: "Barbearia", phone: "(61) 99815-6077", address: "QN 21, Conjunto 2, Riacho Fundo II", source: "https://barbeariaspertodemim.com/e/barbearia-rodrigues-atnhod/", checkedAt: TODAY, status: "Novo" },
  { id: "p5", name: "La Fornace", category: "Lanchonete", phone: "+55 61 99824-3832", address: "1ª Etapa, Riacho Fundo II", source: "https://www.benditoguia.com.br/empresa/la-fornace-riacho-fundo-ii-brasilia", checkedAt: TODAY, status: "Novo" },
];

function readDemo<T,>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}

function mapOpportunity(row: Record<string, unknown>): Opportunity {
  return { id: String(row.id), company: String(row.company), contact: String(row.contact ?? ""), phone: String(row.phone ?? ""), email: row.email ? String(row.email) : undefined, stage: row.stage as Stage, amount: Number(row.amount ?? 0), owner: String(row.owner_name ?? "Equipe"), ownerId: String(row.owner_id ?? ""), createdAt: String(row.created_at ?? "").slice(0, 10), closeDate: row.close_date ? String(row.close_date).slice(0, 10) : undefined, nextContactAt: row.next_contact_at ? String(row.next_contact_at).slice(0, 10) : undefined, priority: (row.priority as Priority) || "Normal", isSaved: row.is_saved !== false, notes: row.notes ? String(row.notes) : undefined };
}
function mapProspect(row: Record<string, unknown>): Prospect {
  return { id: String(row.id), name: String(row.name), category: row.category as Prospect["category"], phone: String(row.phone), address: String(row.address ?? ""), source: String(row.source_url ?? ""), checkedAt: String(row.checked_at ?? "").slice(0, 10), status: row.status as Prospect["status"] };
}

export default function CRM() {
  const [view, setView] = useState<View>("painel");
  const [opportunities, setOpportunities] = useState<Opportunity[]>(demoOpportunities);
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [email, setEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas as categorias");
  const [stageFilter, setStageFilter] = useState("Todas as etapas");
  const [modal, setModal] = useState<"deal" | "prospect" | null>(null);
  const [editTarget, setEditTarget] = useState<Opportunity | Prospect | null>(null);
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      const savedDeals = readDemo("raiz-crm-opportunities", demoOpportunities);
      if (!localStorage.getItem("raiz-crm-manual-values-v1")) {
        setOpportunities(savedDeals.map(item => ({ ...item, amount: 0 })));
        localStorage.setItem("raiz-crm-manual-values-v1", "done");
      } else setOpportunities(savedDeals);
      setProspects(readDemo("raiz-crm-prospects", initialProspects));
      return;
    }
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ? { id: data.session.user.id, email: data.session.user.email ?? "" } : null); setAuthReady(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ? { id: session.user.id, email: session.user.email ?? "" } : null));
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadRemote = useCallback(async () => {
    if (!supabase || !user) return;
    const [{ data: deals, error: dealError }, { data: targets, error: targetError }] = await Promise.all([
      supabase.from("opportunities").select("*, owner:profiles(full_name,email)").order("created_at", { ascending: false }),
      supabase.from("prospects").select("*").order("name"),
    ]);
    if (dealError || targetError) { setNotice("Confira se o schema SQL foi aplicado no Supabase."); return; }
    setOpportunities((deals ?? []).map((row: Record<string, unknown>) => { const profile = row.owner as { full_name?: string; email?: string } | null; return mapOpportunity({ ...row, owner_name: profile?.full_name || profile?.email || "Equipe" }); }));
    setProspects((targets ?? []).map((row: Record<string, unknown>) => mapProspect(row)));
  }, [user]);

  useEffect(() => { void loadRemote(); }, [loadRemote]);
  useEffect(() => { if (!isSupabaseConfigured) { localStorage.setItem("raiz-crm-opportunities", JSON.stringify(opportunities)); } }, [opportunities]);
  useEffect(() => { if (!isSupabaseConfigured) { localStorage.setItem("raiz-crm-prospects", JSON.stringify(prospects)); } }, [prospects]);

  const periods = useMemo(() => {
    const now = new Date();
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    const [y, m, d] = today.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, d));
    const weekday = (start.getUTCDay() + 6) % 7;
    const weekStart = new Date(start); weekStart.setUTCDate(start.getUTCDate() - weekday);
    const dateKey = (date: Date) => date.toISOString().slice(0, 10);
    const wins = opportunities.filter(item => item.stage === "Ganho" && item.closeDate);
    const total = (predicate: (date: string) => boolean) => wins.filter(item => predicate(item.closeDate!.slice(0, 10))).reduce((sum, item) => sum + item.amount, 0);
    return { today, weekStart: dateKey(weekStart), monthStart: `${y}-${String(m).padStart(2, "0")}-01`, day: total(date => date === today), week: total(date => date >= dateKey(weekStart) && date <= today), month: total(date => date >= `${y}-${String(m).padStart(2, "0")}-01` && date <= today) };
  }, [opportunities]);

  const forecast = opportunities.filter(item => !["Ganho", "Perdido"].includes(item.stage)).reduce((sum, item) => sum + item.amount, 0);
  const filteredDeals = opportunities.filter(item => `${item.company} ${item.contact} ${item.phone} ${item.owner} ${item.notes ?? ""}`.toLowerCase().includes(search.toLowerCase()) && (stageFilter === "Todas as etapas" || item.stage === stageFilter));
  const filteredProspects = prospects.filter(item => `${item.name} ${item.phone} ${item.address}`.toLowerCase().includes(search.toLowerCase()) && (category === "Todas as categorias" || item.category === category));
  const wonTotal = opportunities.filter(item => item.stage === "Ganho").length;
  const nextFollowUp = opportunities.filter(item => item.nextContactAt && !["Ganho", "Perdido"].includes(item.stage)).sort((a, b) => a.nextContactAt!.localeCompare(b.nextContactAt!))[0];
  const welcomeDate = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date(`${periods.today}T12:00:00-03:00`)).toLocaleUpperCase("pt-BR");

  const sendLink = async (event: React.FormEvent) => {
    event.preventDefault(); if (!supabase || !email) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}${window.location.pathname}` } });
    setBusy(false); if (error) setNotice(error.message); else setMagicSent(true);
  };

  const saveDeal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const stage = String(form.get("stage")) as Stage;
    const row: Opportunity = { id: editTarget?.id ?? crypto.randomUUID(), company: String(form.get("company")), contact: String(form.get("contact")), phone: String(form.get("phone")), email: String(form.get("email") ?? "") || undefined, stage, amount: Number(form.get("amount") ?? 0), owner: String(form.get("owner") || user?.email || "Você"), ownerId: user?.id, createdAt: String(form.get("createdAt") || TODAY), closeDate: String(form.get("closeDate") || (stage === "Ganho" ? periods.today : "")) || undefined, nextContactAt: String(form.get("nextContactAt") || "") || undefined, priority: String(form.get("priority") || "Normal") as Priority, isSaved: (editTarget as Opportunity | null)?.isSaved !== false, notes: String(form.get("notes") || "") };
    if (isSupabaseConfigured && supabase && user) {
      const { error } = await supabase.from("opportunities").upsert({ id: row.id, company: row.company, contact: row.contact, phone: row.phone, email: row.email, stage: row.stage, amount: row.amount, owner_id: row.ownerId, close_date: row.closeDate || null, next_contact_at: row.nextContactAt || null, priority: row.priority, is_saved: row.isSaved, notes: row.notes || null, created_at: `${row.createdAt}T12:00:00-03:00` });
      if (error) { setNotice(error.message); return; }
      await loadRemote();
    } else setOpportunities(current => current.some(item => item.id === row.id) ? current.map(item => item.id === row.id ? row : item) : [row, ...current]);
    setModal(null); setEditTarget(null); setNotice("Oportunidade salva.");
  };

  const removeSavedDeal = async (item: Opportunity) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("opportunities").update({ is_saved: false }).eq("id", item.id);
      if (error) { setNotice(`Não foi possível remover dos salvamentos: ${error.message}`); return; }
      await loadRemote();
    } else setOpportunities(current => current.map(deal => deal.id === item.id ? { ...deal, isSaved: false } : deal));
    setNotice("Removida dos Salvamentos. A oportunidade continua no pipeline.");
  };

  const saveDealToList = async (item: Opportunity) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("opportunities").update({ is_saved: true }).eq("id", item.id);
      if (error) { setNotice(`Não foi possível salvar: ${error.message}`); return; }
      await loadRemote();
    } else setOpportunities(current => current.map(deal => deal.id === item.id ? { ...deal, isSaved: true } : deal));
    setNotice("Oportunidade adicionada aos Salvamentos.");
  };

  const changeStage = async (item: Opportunity, stage: Stage) => {
    const updated = { ...item, stage, closeDate: stage === "Ganho" ? item.closeDate || periods.today : item.closeDate };
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("opportunities").update({ stage, close_date: updated.closeDate || null }).eq("id", item.id);
      if (error) { setNotice(error.message); return; } await loadRemote();
    } else setOpportunities(current => current.map(deal => deal.id === item.id ? updated : deal));
    setNotice(stage === "Ganho" ? "Venda marcada como ganha." : "Etapa atualizada.");
  };

  const saveProspect = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const row: Prospect = { id: editTarget?.id ?? crypto.randomUUID(), name: String(form.get("name")), category: String(form.get("category")) as Prospect["category"], phone: String(form.get("phone")), address: String(form.get("address")), source: String(form.get("source")), checkedAt: String(form.get("checkedAt") || periods.today), status: String(form.get("status")) as Prospect["status"] };
    if (!/riacho fundo\s*(ii|2)/i.test(row.address)) { setNotice("Informe o endereço do negócio em Riacho Fundo II."); return; }
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("prospects").upsert({ id: row.id, name: row.name, category: row.category, phone: row.phone, address: row.address, source_url: row.source, checked_at: row.checkedAt, status: row.status });
      if (error) { setNotice(error.message); return; } await loadRemote();
    } else setProspects(current => editTarget ? current.map(item => item.id === row.id ? row : item) : [row, ...current]);
    setModal(null); setEditTarget(null); setNotice("Contato atualizado.");
  };

  const convertProspect = (prospect: Prospect) => {
    setEditTarget({ id: crypto.randomUUID(), company: prospect.name, contact: "", phone: prospect.phone, stage: "Novo", amount: 0, owner: user?.email || "Você", ownerId: user?.id, createdAt: periods.today, notes: `Prospect de ${prospect.category}. Fonte: ${prospect.source}` });
    setView("oportunidades"); setModal("deal");
  };

  const savedDeals = opportunities.filter(item => item.isSaved !== false).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (isSupabaseConfigured && authReady && !user) return <main className="auth-screen"><div className="auth-card"><div className="brand-mark"><CircleDollarSign size={25}/></div><span className="eyebrow">XAVIER CRM · ESPAÇO DA EQUIPE</span><h1>Vendas com<br/><em>direção.</em></h1><p>Acesse com o e-mail que recebeu um convite da equipe.</p>{magicSent ? <div className="sent-box"><BadgeCheck size={20}/> Link enviado. Confira sua caixa de entrada e volte para continuar.</div> : <form onSubmit={sendLink}><label htmlFor="login-email">Seu e-mail</label><div className="input-icon"><Mail size={17}/><input id="login-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@empresa.com.br" /></div><button className="primary full" disabled={busy}>{busy ? "Enviando…" : "Receber link de acesso"}<ArrowRight size={16}/></button></form>}{notice && <div className="notice error">{notice}</div>}<small>O acesso é liberado apenas para contas convidadas no Supabase.</small></div></main>;
  if (isSupabaseConfigured && !authReady) return <main className="loading-screen"><div className="brand-mark"><CircleDollarSign size={25}/></div><span>Preparando seu espaço…</span></main>;

  return <main className="app-shell dark-theme">
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><CircleDollarSign size={25} strokeWidth={2.5}/></div><div><strong>Xavier CRM</strong></div></div>
      <div className="workspace"><div className="workspace-avatar">RF</div><div><b>Equipe comercial</b><small>Riacho Fundo II · DF</small></div><ChevronDown size={15}/></div>
      <div className="nav-label">ESPAÇO DE TRABALHO</div>
      <nav>
        <button className={`nav-link ${view === "painel" ? "active" : ""}`} onClick={() => { setView("painel"); setMobileNav(false); }}><LayoutDashboard size={18}/>Painel</button>
        <button className={`nav-link ${view === "oportunidades" ? "active" : ""}`} onClick={() => { setView("oportunidades"); setMobileNav(false); }}><BriefcaseBusiness size={18}/>Oportunidades<span className="nav-count">{opportunities.filter(d => !["Ganho", "Perdido"].includes(d.stage)).length}</span></button>
        <button className={`nav-link ${view === "kanban" ? "active" : ""}`} onClick={() => { setView("kanban"); setMobileNav(false); }}><Columns3 size={18}/>Kanban<span className="nav-count muted-count">{opportunities.filter(d => !["Ganho", "Perdido"].includes(d.stage)).length}</span></button>
        <button className={`nav-link ${view === "salvamentos" ? "active" : ""}`} onClick={() => { setView("salvamentos"); setMobileNav(false); }}><ClipboardList size={18}/>Salvamentos<span className="nav-count muted-count">{opportunities.length}</span></button>
        <button className={`nav-link ${view === "prospeccao" ? "active" : ""}`} onClick={() => { setView("prospeccao"); setMobileNav(false); }}><Target size={18}/>Prospecção local<span className="nav-count muted-count">{prospects.length}</span></button>
      </nav>
      <div className="sidebar-bottom">
        <div className="target-card"><div className="target-icon"><Sparkles size={16}/></div><b>Uma boa conversa<br/>abre uma oportunidade.</b><span>Registre seu próximo contato.</span><button onClick={() => { setEditTarget(null); setModal("deal"); }}>+ Nova oportunidade</button></div>
        <div className="profile-row"><div className="profile-avatar">{user?.email ? user.email.slice(0, 1).toUpperCase() : "AM"}</div><div className="profile-text"><b>{user?.email?.split("@")[0] || "Ana Martins"}</b><span>{user?.email || "Administradora"}</span></div>{isSupabaseConfigured && <button className="icon-btn" title="Sair" onClick={() => supabase?.auth.signOut()}><LogOut size={16}/></button>}</div>
      </div>
    </aside>
    <section className="main-area">
      <button className="mobile-menu icon-btn mobile-nav-toggle" onClick={() => setMobileNav(!mobileNav)} aria-label="Abrir menu"><Menu size={19}/></button>
      <div className="page-content">
        {notice && <button className={`notice ${notice.toLowerCase().includes("erro") || notice.includes("Confira") ? "error" : ""}`} onClick={() => setNotice("")}>{notice}<X size={14}/></button>}
        {view === "painel" && <>
          <div className="dashboard-visual"><svg className="dashboard-chart-bg" aria-hidden="true" viewBox="0 0 1000 360" preserveAspectRatio="none"><path d="M0 270 C70 250 90 290 160 240 S260 260 320 190 S420 220 490 165 S600 200 670 130 S770 175 830 90 S930 120 1000 40"/><path d="M0 310 C80 280 110 320 180 275 S280 295 350 235 S440 265 510 215 S610 245 690 185 S790 215 860 155 S940 180 1000 120"/></svg>
          <div className="welcome-row"><div><div className="eyebrow">{welcomeDate}</div><h1 className="animated-greeting">Olá, Samuel!</h1><p>Veja como estão as suas vendas e o que vem pela frente.</p></div><button className="primary" onClick={() => { setEditTarget(null); setModal("deal"); }}><Plus size={17}/>Nova oportunidade</button></div>
          <div className="stat-grid">
            <StatCard icon={<CircleDollarSign size={17}/>} label="Vendido hoje" amount={periods.day} tag="Hoje" tone="orange" change="Fechamentos do dia" />
            <StatCard icon={<CalendarDays size={17}/>} label="Vendido na semana" amount={periods.week} tag="Esta semana" tone="blue" change={`Desde ${fmtDate(periods.weekStart)}`} />
            <StatCard icon={<ArrowUpRight size={17}/>} label="Vendido no mês" amount={periods.month} tag="Outubro" tone="green" change={`${wonTotal} vendas ganhas`} />
            <StatCard icon={<Target size={17}/>} label="Em negociação" amount={forecast} tag="Previsão" tone="purple" change={`${opportunities.filter(d => !["Ganho", "Perdido"].includes(d.stage)).length} oportunidades abertas`} forecast />
          </div>
          <div className="insight-strip"><div className="insight-star"><Sparkles size={17}/></div><div><b>Tem oportunidade boa no seu radar.</b><span> Você tem <strong>{money(forecast)}</strong> em negociações abertas para movimentar.</span></div><button onClick={() => setView("oportunidades")}>Ver oportunidades <ArrowRight size={15}/></button></div>
          <div className="section-heading"><div><h2>Oportunidades recentes</h2><p>Acompanhe cada conversa até o fechamento.</p></div><button className="text-link" onClick={() => setView("oportunidades")}>Ver todas <ArrowRight size={15}/></button></div>
          <div className="table-card"><div className="table-toolbar"><div className="toolbar-title"><ClipboardList size={16}/><span>Suas negociações</span><span className="light-count">{filteredDeals.length}</span></div><button className="filter-button" onClick={() => setView("oportunidades")}><Filter size={15}/>Filtros</button></div><DealsTable deals={filteredDeals.slice(0, 5)} onStage={changeStage} onEdit={item => { setEditTarget(item); setModal("deal"); }} onSave={saveDealToList} /></div>
          <div className="bottom-grid"><div className="next-card"><div className="next-icon"><Clock3 size={17}/></div><div><b>{nextFollowUp ? `Próximo contato · ${fmtDate(nextFollowUp.nextContactAt)}` : "Agende seu próximo contato"}</b><p>{nextFollowUp ? `${nextFollowUp.company} · prioridade ${nextFollowUp.priority || "Normal"}` : "Defina uma data de retorno em cada oportunidade para não deixar conversas esfriarem."}</p></div>{nextFollowUp ? <button onClick={() => { setEditTarget(nextFollowUp); setModal("deal"); }}>Ver negócio <ArrowRight size={15}/></button> : <button onClick={() => setView("oportunidades")}>Abrir pipeline <ArrowRight size={15}/></button>}</div><div className="lead-card"><div className="lead-card-icon"><Store size={17}/></div><div><b>Tem negócio novo por perto</b><p>Explore alvos locais de Riacho Fundo II.</p><button onClick={() => setView("prospeccao")}>Ver prospecção <ArrowRight size={14}/></button></div><span className="lead-card-count">{prospects.length}<small>alvos</small></span></div></div></div>
        </>}
        {view === "oportunidades" && <>
          <div className="welcome-row"><div><div className="eyebrow">PIPELINE COMERCIAL</div><h1>Oportunidades <span className="soft-count">{opportunities.length}</span></h1><p>Organize os próximos passos e acompanhe o valor em jogo.</p></div><button className="primary" onClick={() => { setEditTarget(null); setModal("deal"); }}><Plus size={17}/>Nova oportunidade</button></div>
          <div className="pipeline-mini"><div><span>Em negociação</span><b>{money(forecast)}</b></div><div><span>Oportunidades abertas</span><b>{opportunities.filter(d => !["Ganho", "Perdido"].includes(d.stage)).length}</b></div><div><span>Ganhos no mês</span><b>{money(periods.month)}</b></div></div>
          <div className="table-card full-table"><div className="table-toolbar"><div className="toolbar-title"><ClipboardList size={16}/><span>Todas as oportunidades</span><span className="light-count">{filteredDeals.length}</span></div><div className="table-controls"><label className="search-field"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente ou telefone..." /></label><select className="filter-select" value={stageFilter} onChange={e => setStageFilter(e.target.value)}><option>Todas as etapas</option>{stages.map(stage => <option key={stage}>{stage}</option>)}</select></div></div><DealsTable deals={filteredDeals} onStage={changeStage} onEdit={item => { setEditTarget(item); setModal("deal"); }} onSave={saveDealToList} /></div>
        </>}
        {view === "kanban" && <>
          <div className="welcome-row"><div><div className="eyebrow">PIPELINE VISUAL</div><h1>Quadro Kanban <span className="soft-count">{filteredDeals.length}</span></h1><p>Acompanhe cada negócio por etapa. Arraste os cartões ou use o seletor para avançá-los.</p></div><button className="primary" onClick={() => { setEditTarget(null); setModal("deal"); }}><Plus size={17}/>Nova oportunidade</button></div>
          <div className="table-toolbar kanban-toolbar"><div className="toolbar-title"><Columns3 size={16}/><span>Oportunidades por etapa</span></div><div className="table-controls"><label className="search-field"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar negócio ou telefone..." /></label><select className="filter-select" value={stageFilter} onChange={e => setStageFilter(e.target.value)}><option>Todas as etapas</option>{stages.map(stage => <option key={stage}>{stage}</option>)}</select></div></div>
          <div className="kanban-board">{stages.filter(stage => stageFilter === "Todas as etapas" || stageFilter === stage).map(stage => {
            const columnDeals = filteredDeals.filter(item => item.stage === stage);
            return <section className="kanban-column" key={stage} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const id = event.dataTransfer.getData("text/plain"); const item = opportunities.find(deal => deal.id === id); if (item && item.stage !== stage) void changeStage(item, stage); }}>
              <header className="kanban-column-head"><span className={`kanban-stage-dot stage-dot-${stage.toLowerCase().replace(" ", "-")}`} /> <b>{stage}</b><span className="light-count">{columnDeals.length}</span></header>
              <div className="kanban-cards">{columnDeals.length ? columnDeals.map(item => <article className="kanban-card" key={item.id} draggable onDragStart={event => { event.dataTransfer.setData("text/plain", item.id); event.dataTransfer.effectAllowed = "move"; }}>
                <div className="kanban-card-top"><span className={`priority-pill priority-${(item.priority || "Normal").toLowerCase()}`}>{item.priority || "Normal"}</span><button className="icon-btn row-menu" title="Editar oportunidade" onClick={() => { setEditTarget(item); setModal("deal"); }}><MoreHorizontal size={17}/></button></div>
                <button className="kanban-company" onClick={() => { setEditTarget(item); setModal("deal"); }}>{item.company}</button><span className="kanban-contact">{item.contact || "Sem contato cadastrado"}</span>
                <div className="kanban-card-value">{item.amount > 0 ? <><small>Valor estimado</small><b>{money(item.amount)}</b></> : <button className="amount-entry" onClick={() => { setEditTarget(item); setModal("deal"); }}><Plus size={13}/>Definir valor</button>}</div>
                <div className="kanban-card-meta"><span><Clock3 size={12}/>Retorno: {fmtDate(item.nextContactAt)}</span><span>{item.owner}</span></div>
                <div className="kanban-card-actions"><a className="phone-pill" href={`tel:${item.phone.replace(/[^\d+]/g, "")}`} aria-label={`Ligar para ${item.company}`}><Phone size={13}/></a><a className="whatsapp-pill" href={whatsappUrl(item.phone)} target="_blank" rel="noreferrer" aria-label={`Abrir WhatsApp para ${item.company}`}><MessageCircle size={13}/><span>WhatsApp</span></a><label className={`stage-pill stage-${item.stage.toLowerCase().replace(" ", "-")}`}><select value={item.stage} onChange={event => void changeStage(item, event.target.value as Stage)} aria-label={`Mover ${item.company} para outra etapa`}>{stages.map(option => <option key={option}>{option}</option>)}</select><ChevronDown size={12}/></label></div>
              </article>) : <div className="kanban-empty">Solte uma oportunidade aqui</div>}</div>
            </section>;
          })}</div>
        </>}
        {view === "salvamentos" && <>
          <div className="welcome-row"><div><div className="eyebrow">SUAS OPORTUNIDADES</div><h1>Salvamentos <span className="soft-count">{savedDeals.length}</span></h1><p>Todas as oportunidades que você salvou, da mais recente à mais antiga.</p></div><button className="primary" onClick={() => { setEditTarget(null); setModal("deal"); }}><Plus size={17}/>Nova oportunidade</button></div>
          <div className="table-card full-table"><div className="table-toolbar"><div className="toolbar-title"><ClipboardList size={16}/><span>Oportunidades salvas</span><span className="light-count">{savedDeals.length}</span></div><div className="table-controls"><label className="search-field"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome ou telefone..." /></label><select className="filter-select" value={stageFilter} onChange={e => setStageFilter(e.target.value)}><option>Todas as etapas</option>{stages.map(stage => <option key={stage}>{stage}</option>)}</select></div></div><DealsTable deals={savedDeals.filter(item => filteredDeals.some(filtered => filtered.id === item.id))} onStage={changeStage} onEdit={item => { setEditTarget(item); setModal("deal"); }} onRemoveSaved={removeSavedDeal} /></div>
        </>}
        {view === "prospeccao" && <>
          <div className="welcome-row"><div><div className="eyebrow">PROSPECÇÃO · BRASÍLIA, DF</div><h1>Negócios por perto <span className="wave">✳</span></h1><p>Hamburguerias, barbearias e lanchonetes de Riacho Fundo II.</p></div><button className="primary" onClick={() => { setEditTarget(null); setModal("prospect"); }}><Plus size={17}/>Adicionar negócio</button></div>
          <div className="prospect-summary"><div className="location-badge"><MapPin size={16}/></div><div><b>Riacho Fundo II</b><span>Brasília · Distrito Federal · Região selecionada</span></div><div className="category-pills"><span><i className="dot orange-dot"/>{prospects.filter(p => p.category === "Hamburgueria").length} hamburguerias</span><span><i className="dot blue-dot"/>{prospects.filter(p => p.category === "Barbearia").length} barbearias</span><span><i className="dot green-dot"/>{prospects.filter(p => p.category === "Lanchonete").length} lanchonetes</span></div></div>
          <div className="table-card lead-table-card"><div className="table-toolbar"><div className="toolbar-title"><Target size={16}/><span>Alvos locais</span><span className="light-count">{filteredProspects.length}</span></div><div className="table-controls"><label className="search-field"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar negócio..." /></label><select className="filter-select" value={category} onChange={e => setCategory(e.target.value)}><option>Todas as categorias</option><option>Hamburgueria</option><option>Barbearia</option><option>Lanchonete</option></select></div></div>
            <div className="prospect-list">{filteredProspects.length ? filteredProspects.map(p => <div className="prospect-row" key={p.id}><div className={`business-icon ${p.category === "Barbearia" ? "blue-business" : p.category === "Lanchonete" ? "green-business" : "orange-business"}`}><Store size={18}/></div><div className="business-main"><div className="business-title"><b>{p.name}</b><span className={`category-tag ${p.category === "Barbearia" ? "tag-blue" : p.category === "Lanchonete" ? "tag-green" : "tag-orange"}`}>{p.category}</span></div><div className="business-address"><MapPin size={13}/>{p.address || "Endereço não informado"}</div><div className="business-source">Fonte: <a href={p.source} target="_blank" rel="noreferrer">Ver origem <ArrowUpRight size={11}/></a><span>· Conferido em {fmtDate(p.checkedAt)}</span></div></div><div className="deal-contact"><a className="phone-pill" href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}><Phone size={14}/>{p.phone}</a><a className="whatsapp-pill" href={whatsappUrl(p.phone)} target="_blank" rel="noreferrer" aria-label={`Abrir WhatsApp para ${p.name}`}><MessageCircle size={15}/><span>WhatsApp</span></a></div><div className="prospect-actions"><button className="outline-small" onClick={() => convertProspect(p)}><Plus size={14}/>Definir valor</button><button className="icon-btn row-menu" title="Editar negócio" onClick={() => { setEditTarget(p); setModal("prospect"); }}><MoreHorizontal size={19}/></button></div></div>) : <div className="empty-state"><Search size={22}/><b>Nenhum negócio encontrado</b><span>Tente outro nome ou categoria.</span></div>}</div>
            <div className="source-note"><BadgeCheck size={15}/><span>Contatos encontrados em fontes públicas. Confirme o telefone antes do primeiro contato; os dados podem mudar.</span></div>
          </div>
        </>}
        <footer className="page-footer"><span>XAVIER CRM</span><span>Feito para conversas que viram negócio <span className="footer-flower">✳</span></span></footer>
      </div>
    </section>
    {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Fechar menu"/>}
        {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) { setModal(null); setEditTarget(null); } }}><div className="modal"><div className="modal-head"><div><span className="eyebrow">{modal === "deal" ? "PIPELINE COMERCIAL" : "PROSPECÇÃO LOCAL"}</span><h2>{editTarget ? "Editar" : "Nova"} {modal === "deal" ? "oportunidade" : "negócio"}</h2></div><button className="icon-btn" onClick={() => { setModal(null); setEditTarget(null); }}><X size={19}/></button></div>{modal === "deal" ? <form onSubmit={saveDeal} className="modal-form"><div className="form-grid"><Field label="Nome do negócio" name="company" required defaultValue={(editTarget as Opportunity | null)?.company}/><Field label="Pessoa de contato" name="contact" required defaultValue={(editTarget as Opportunity | null)?.contact}/><Field label="Telefone" name="phone" required defaultValue={(editTarget as Opportunity | null)?.phone}/><Field label="E-mail" name="email" type="email" defaultValue={(editTarget as Opportunity | null)?.email}/><Field label="Valor manual (R$) · opcional" name="amount" type="number" min="0" defaultValue={(editTarget as Opportunity | null)?.amount || ""}/><label className="field"><span>Etapa</span><select name="stage" defaultValue={(editTarget as Opportunity | null)?.stage ?? "Novo"}>{stages.map(s => <option key={s}>{s}</option>)}</select></label><label className="field"><span>Prioridade</span><select name="priority" defaultValue={(editTarget as Opportunity | null)?.priority ?? "Normal"}>{priorities.map(p => <option key={p}>{p}</option>)}</select></label><label className="field"><span>Próximo contato</span><input name="nextContactAt" type="date" defaultValue={(editTarget as Opportunity | null)?.nextContactAt || ""}/></label><label className="field"><span>Data de entrada</span><input name="createdAt" type="date" defaultValue={(editTarget as Opportunity | null)?.createdAt || periods.today}/></label><label className="field"><span>Data prevista / fechamento</span><input name="closeDate" type="date" defaultValue={(editTarget as Opportunity | null)?.closeDate || ""}/></label><Field label="Responsável" name="owner" defaultValue={(editTarget as Opportunity | null)?.owner || user?.email || "Você"}/></div><label className="field"><span>Notas</span><textarea name="notes" rows={3} defaultValue={(editTarget as Opportunity | null)?.notes} placeholder="Contexto, próximos passos, necessidades..."/></label><div className="modal-actions"><button type="button" className="secondary" onClick={() => { setModal(null); setEditTarget(null); }}>Cancelar</button><button className="primary"><Check size={16}/>{editTarget ? "Salvar alterações" : "Salvar oportunidade"}</button></div></form> : <form onSubmit={saveProspect} className="modal-form"><div className="form-grid"><Field label="Nome do negócio" name="name" required defaultValue={(editTarget as Prospect | null)?.name}/><label className="field"><span>Categoria</span><select name="category" defaultValue={(editTarget as Prospect | null)?.category ?? "Hamburgueria"}><option>Hamburgueria</option><option>Barbearia</option><option>Lanchonete</option></select></label><Field label="Telefone público" name="phone" required defaultValue={(editTarget as Prospect | null)?.phone}/><Field label="Endereço em Riacho Fundo II" name="address" required defaultValue={(editTarget as Prospect | null)?.address}/><Field label="URL da fonte" name="source" required defaultValue={(editTarget as Prospect | null)?.source}/><label className="field"><span>Conferido em</span><input name="checkedAt" type="date" required defaultValue={(editTarget as Prospect | null)?.checkedAt || periods.today}/></label><label className="field"><span>Status</span><select name="status" defaultValue={(editTarget as Prospect | null)?.status ?? "Novo"}><option>Novo</option><option>Contatado</option></select></label></div><div className="modal-actions"><button type="button" className="secondary" onClick={() => { setModal(null); setEditTarget(null); }}>Cancelar</button><button className="primary"><Check size={16}/>{editTarget ? "Salvar alterações" : "Adicionar negócio"}</button></div></form>}</div></div>}
  </main>;
}

function StatCard({ icon, label, amount, tag, tone, change, forecast }: { icon: React.ReactNode; label: string; amount: number; tag: string; tone: string; change: string; forecast?: boolean }) {
  return <article className="stat-card"><div className="stat-top"><div className={`stat-icon ${tone}`}>{icon}</div><span className="stat-tag">{tag}</span></div><span className="stat-label">{label}</span><strong className="stat-value">{money(amount)}</strong><div className="stat-bottom">{forecast ? <ArrowUpRight size={14}/> : amount ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}<span>{change}</span>{forecast && <span className="forecast-label">Valor manual</span>}</div></article>;
}

function DealsTable({ deals, onStage, onEdit, onRemoveSaved, onSave }: { deals: Opportunity[]; onStage: (item: Opportunity, stage: Stage) => void; onEdit: (item: Opportunity) => void; onRemoveSaved?: (item: Opportunity) => void; onSave?: (item: Opportunity) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>NEGÓCIO</th><th>CONTATO</th><th>PRIORIDADE</th><th>ETAPA</th><th>VALOR</th><th>RESPONSÁVEL</th><th>PRÓXIMOS PASSOS</th><th/></tr></thead><tbody>{deals.length ? deals.map(item => <tr key={item.id}><td><button className="client-cell" onClick={() => onEdit(item)}><span className="client-avatar">{item.company.slice(0, 1).toUpperCase()}</span><span><b>{item.company}</b><small>{item.contact}</small></span></button></td><td><div className="deal-contact"><a className="phone-pill" href={`tel:${item.phone.replace(/[^\d+]/g, "")}`} aria-label={`Ligar para ${item.company}`}><Phone size={13}/>{item.phone}</a><a className="whatsapp-pill" href={whatsappUrl(item.phone)} target="_blank" rel="noreferrer" aria-label={`Abrir WhatsApp para ${item.company}`}><MessageCircle size={14}/><span>WhatsApp</span></a></div></td><td><span className={`priority-pill priority-${(item.priority || "Normal").toLowerCase()}`}>{item.priority || "Normal"}</span></td><td><label className={`stage-pill stage-${item.stage.toLowerCase().replace(" ", "-")}`}><i/><select value={item.stage} onChange={e => onStage(item, e.target.value as Stage)} aria-label={`Etapa de ${item.company}`}>{stages.map(stage => <option key={stage}>{stage}</option>)}</select><ChevronDown size={12}/></label></td><td>{item.amount > 0 ? <b className="amount-cell">{money(item.amount)}</b> : <button className="amount-entry" onClick={() => onEdit(item)}><Plus size={13}/>Definir valor</button>}</td><td><span className="owner-cell"><span className="owner-avatar">{item.owner.slice(0, 1).toUpperCase()}</span>{item.owner}</span></td><td><span className="deal-dates"><span>Retorno: {fmtDate(item.nextContactAt)}</span><span>Fechamento: {fmtDate(item.closeDate)}</span></span></td><td><div className="row-actions"><button className="icon-btn row-menu" title="Editar oportunidade" onClick={() => onEdit(item)}><MoreHorizontal size={18}/></button>{onSave && item.isSaved === false && <button className="icon-btn row-save" title={`Adicionar ${item.company} aos salvamentos`} aria-label={`Adicionar ${item.company} aos salvamentos`} onClick={() => onSave(item)}><Plus size={16}/></button>}{onRemoveSaved && <button className="icon-btn row-delete" title={`Remover ${item.company} dos salvamentos`} aria-label={`Remover ${item.company} dos salvamentos`} onClick={() => onRemoveSaved(item)}><X size={16}/></button>}</div></td></tr>) : <tr><td colSpan={8}><div className="empty-state"><BriefcaseBusiness size={22}/><b>Nenhuma oportunidade encontrada</b><span>Ajuste a busca ou salve uma nova oportunidade para vê-la aqui.</span></div></td></tr>}</tbody></table></div>;
}

function Field({ label, name, defaultValue, type = "text", required, min }: { label: string; name: string; defaultValue?: string | number; type?: string; required?: boolean; min?: string }) {
  return <label className="field"><span>{label}</span><input name={name} type={type} defaultValue={defaultValue} required={required} min={min}/></label>;
}
