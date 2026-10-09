import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

type Tela =
  | 'dashboard'
  | 'clientes'
  | 'conteudo'
  | 'campanhas'
  | 'financeiro'
  | 'tarefas';

type Client = {
  id: number;
  name: string;
  legal_name: string | null;
  document: string | null;
  contact_name: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  monthly_fee: number;
  billing_day: number | null;
  start_date: string | null;
  end_date: string | null;
  status: 'active' | 'paused' | 'closed';
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ClientAccount = {
  id: number;
  client_id: number;
  platform: string;
  account_name: string | null;
  username: string | null;
  profile_url: string | null;
  account_id: string | null;
  business_manager_id: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
};

type ClientGuideline = {
  id: number;
  client_id: number;
  target_audience: string | null;
  tone_of_voice: string | null;
  preferred_words: string | null;
  avoided_words: string | null;
  visual_guidelines: string | null;
  content_guidelines: string | null;
  general_notes: string | null;
  updated_at: string;
};

type ClientBrandAsset = {
  id: number;
  client_id: number;
  asset_type: 'logo' | 'photo' | 'video' | 'palette' | 'font' | 'reference' | 'document' | 'other';
  title: string;
  file_url: string | null;
  text_value: string | null;
  notes: string | null;
  created_at: string;
};

type ContentItem = {
  id: number;
  client_id: number;
  content_type: 'feed' | 'story' | 'reel' | 'carousel' | 'other';
  title: string;
  caption: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: 'todo' | 'production' | 'approval' | 'approved' | 'scheduled' | 'published' | 'cancelled';
  media_url: string | null;
  approval_notes: string | null;
  published_url: string | null;
  responsible: string | null;
  created_at: string;
  updated_at: string;
};

type FinancialEntry = {
  id: number;
  client_id: number | null;
  entry_type: 'income' | 'expense';
  category: string | null;
  description: string;
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_method: string | null;
  recurring: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Campaign = {
  id: number;
  client_id: number;
  name: string;
  platform: string | null;
  objective: string | null;
  budget_daily: number | null;
  budget_total: number | null;
  start_date: string | null;
  end_date: string | null;
  status: 'draft' | 'active' | 'paused' | 'finished' | 'cancelled';
  audience: string | null;
  publication_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type CampaignResult = {
  id: number;
  campaign_id: number;
  reference_date: string;
  spent: number;
  reach: number;
  impressions: number;
  clicks: number;
  leads: number;
  messages: number;
  conversions: number;
  revenue: number;
  notes: string | null;
  created_at: string;
};

type TaskItem = {
  id: number;
  client_id: number | null;
  title: string;
  description: string | null;
  responsible: string | null;
  due_at: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'todo' | 'doing' | 'waiting_client' | 'done' | 'cancelled';
  reminder_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type AgendaEvent = {
  id: number;
  client_id: number | null;
  title: string;
  event_date: string;
  event_time: string | null;
  notes: string | null;
  created_at: string;
};

const menu: { id: Tela; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◫' },
  { id: 'clientes', label: 'Clientes', icon: '◉' },
  { id: 'conteudo', label: 'Conteúdo', icon: '▦' },
  { id: 'campanhas', label: 'Campanhas', icon: '◎' },
  { id: 'financeiro', label: 'Financeiro', icon: '◆' },
  { id: 'tarefas', label: 'Tarefas', icon: '✓' },
];

const plataformasPadrao = [
  'Instagram',
  'Facebook',
  'TikTok',
  'Google Business',
  'Google Ads',
  'Meta Ads',
  'YouTube',
  'Site',
  'Outro',
];

/** Exibe uma orientação clara sem alterar nem contornar as políticas do Supabase. */
function mensagemErroBanco(mensagem: string) {
  if (/row.level security|permission denied|42501/i.test(mensagem)) {
    const tabela = mensagem.match(/(?:for table|table)\s+["'`]?([a-zA-Z_][a-zA-Z_0-9]*)/i)?.[1];
    return `O Supabase bloqueou esta operação por uma regra de segurança (RLS)${tabela ? ` na tabela ${tabela}` : ''}. Os dados não foram salvos. É necessário revisar o acesso autorizado no Supabase.`;
  }
  return mensagem;
}

function moeda(valor: number) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function dataBR(valor: string | null) {
  if (!valor) return '—';
  const [ano, mes, dia] = valor.split('-');
  return `${dia}/${mes}/${ano}`;
}

function dataLocalHoje() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}


function rotuloAsset(tipo: ClientBrandAsset['asset_type']) {
  const rotulos: Record<ClientBrandAsset['asset_type'], string> = {
    logo: 'Logo',
    photo: 'Foto',
    video: 'Vídeo',
    palette: 'Paleta de cores',
    font: 'Fonte',
    reference: 'Referência',
    document: 'Documento',
    other: 'Outro',
  };
  return rotulos[tipo];
}

function rotuloConteudo(tipo: ContentItem['content_type']) {
  const rotulos: Record<ContentItem['content_type'], string> = {
    feed: 'Feed',
    story: 'Stories',
    reel: 'Reels',
    carousel: 'Carrossel',
    other: 'Outro',
  };
  return rotulos[tipo];
}

function rotuloStatusConteudo(status: ContentItem['status']) {
  const rotulos: Record<ContentItem['status'], string> = {
    todo: 'A fazer',
    production: 'Em produção',
    approval: 'Em aprovação',
    approved: 'Aprovado',
    scheduled: 'Agendado',
    published: 'Publicado',
    cancelled: 'Cancelado',
  };
  return rotulos[status];
}


function rotuloStatusCampanha(status: Campaign['status']) {
  const rotulos: Record<Campaign['status'], string> = {
    draft: 'Rascunho',
    active: 'Ativa',
    paused: 'Pausada',
    finished: 'Finalizada',
    cancelled: 'Cancelada',
  };
  return rotulos[status];
}

function numeroBR(valor: number) {
  return Number(valor || 0).toLocaleString('pt-BR');
}


function rotuloStatusFinanceiro(status: FinancialEntry['status'], dueDate?: string | null) {
  const hoje = dataLocalHoje();

  if (
    status !== 'paid' &&
    status !== 'cancelled' &&
    dueDate &&
    dueDate < hoje
  ) {
    return 'Atrasado';
  }

  const rotulos: Record<FinancialEntry['status'], string> = {
    pending: 'Pendente',
    paid: 'Pago',
    overdue: 'Atrasado',
    cancelled: 'Cancelado',
  };

  return rotulos[status];
}

function statusFinanceiroVisual(status: FinancialEntry['status'], dueDate?: string | null) {
  if (
    status !== 'paid' &&
    status !== 'cancelled' &&
    dueDate &&
    dueDate < dataLocalHoje()
  ) {
    return 'overdue';
  }

  return status;
}

function mesReferencia(data = new Date()) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}


function dataIsoLocal(valor: string | null) {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor.slice(0, 10);
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function horaIsoLocal(valor: string | null) {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function rotuloStatusTarefa(status: TaskItem['status']) {
  const rotulos: Record<TaskItem['status'], string> = {
    todo: 'A fazer',
    doing: 'Em andamento',
    waiting_client: 'Aguardando cliente',
    done: 'Concluída',
    cancelled: 'Cancelada',
  };
  return rotulos[status];
}

function rotuloPrioridade(prioridade: TaskItem['priority']) {
  const rotulos: Record<TaskItem['priority'], string> = {
    low: 'Baixa',
    normal: 'Normal',
    high: 'Alta',
    urgent: 'Urgente',
  };
  return rotulos[prioridade];
}

function Card({
  titulo,
  valor,
  detalhe,
  onClick,
}: {
  titulo: string;
  valor: string;
  detalhe: string;
  onClick?: () => void;
}) {
  return (
    <article
      className={`metric-card${onClick ? ' clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          onClick();
        }
      }}
    >
      <span>{titulo}</span>
      <strong>{valor}</strong>
      <small>{detalhe}</small>
    </article>
  );
}

const clienteVazio = {
  name: '',
  legal_name: '',
  document: '',
  contact_name: '',
  whatsapp: '',
  email: '',
  address: '',
  monthly_fee: '',
  billing_day: '',
  start_date: '',
  end_date: '',
  status: 'active' as Client['status'],
  notes: '',
};

export default function App() {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [autenticacaoPronta, setAutenticacaoPronta] = useState(false);
  const [permissaoVerificada, setPermissaoVerificada] = useState(false);
  const [administradorAutorizado, setAdministradorAutorizado] = useState(false);
  const [emailLogin, setEmailLogin] = useState('');
  const [senhaLogin, setSenhaLogin] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erroLogin, setErroLogin] = useState('');
  const [tela, setTela] = useState<Tela>('dashboard');
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [guidelines, setGuidelines] = useState<ClientGuideline[]>([]);
  const [assets, setAssets] = useState<ClientBrandAsset[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [mostrarFormularioCliente, setMostrarFormularioCliente] = useState(false);
  const [clienteEditandoId, setClienteEditandoId] = useState<number | null>(null);
  const [clienteForm, setClienteForm] = useState(clienteVazio);
  const [clienteAbertoId, setClienteAbertoId] = useState<number | null>(null);

  const [novaConta, setNovaConta] = useState({
    platform: 'Instagram',
    account_name: '',
    username: '',
    profile_url: '',
    account_id: '',
    business_manager_id: '',
    notes: '',
  });

  const [guidelineDraft, setGuidelineDraft] = useState({
    target_audience: '',
    tone_of_voice: '',
    preferred_words: '',
    avoided_words: '',
    visual_guidelines: '',
    content_guidelines: '',
    general_notes: '',
  });

  const [novoAsset, setNovoAsset] = useState({
    asset_type: 'palette' as ClientBrandAsset['asset_type'],
    title: '',
    text_value: '',
    notes: '',
  });
  const [arquivoAsset, setArquivoAsset] = useState<File | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [savingAsset, setSavingAsset] = useState(false);
  const [assetUrls, setAssetUrls] = useState<Record<number, string>>({});

  const [conteudos, setConteudos] = useState<ContentItem[]>([]);
  const [loadingConteudos, setLoadingConteudos] = useState(false);
  const [financeiroEntries, setFinanceiroEntries] = useState<FinancialEntry[]>([]);

  const [loadingFinanceiro, setLoadingFinanceiro] = useState(false);
  const [mostrarFormFinanceiro, setMostrarFormFinanceiro] = useState(false);
  const [financeiroEditandoId, setFinanceiroEditandoId] = useState<number | null>(null);
  const [filtroTipoFinanceiro, setFiltroTipoFinanceiro] = useState('');
  const [filtroStatusFinanceiro, setFiltroStatusFinanceiro] = useState('');
  const [filtroClienteFinanceiro, setFiltroClienteFinanceiro] = useState('');
  const [filtroMesFinanceiro, setFiltroMesFinanceiro] = useState(mesReferencia());
  const [financeiroForm, setFinanceiroForm] = useState({
    client_id: '',
    entry_type: 'income' as FinancialEntry['entry_type'],
    category: 'Mensalidade',
    description: '',
    amount: '',
    due_date: '',
    paid_date: '',
    status: 'pending' as FinancialEntry['status'],
    payment_method: '',
    recurring: false,
    notes: '',
  });

  const [tarefas, setTarefas] = useState<TaskItem[]>([]);
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([]);
  const [loadingTarefas, setLoadingTarefas] = useState(false);
  const [mostrarFormTarefa, setMostrarFormTarefa] = useState(false);
  const [tarefaEditandoId, setTarefaEditandoId] = useState<number | null>(null);
  const [filtroStatusTarefa, setFiltroStatusTarefa] = useState('');
  const [filtroPrioridadeTarefa, setFiltroPrioridadeTarefa] = useState('');
  const [filtroClienteTarefa, setFiltroClienteTarefa] = useState('');
  const [buscaTarefa, setBuscaTarefa] = useState('');
  const [tarefaForm, setTarefaForm] = useState({
    client_id: '',
    title: '',
    description: '',
    responsible: '',
    due_date: '',
    due_time: '',
    priority: 'normal' as TaskItem['priority'],
    status: 'todo' as TaskItem['status'],
    reminder_date: '',
    reminder_time: '',
  });
  const [agendaDataSelecionada, setAgendaDataSelecionada] = useState(dataLocalHoje());
  const [agendaMes, setAgendaMes] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  });
  const [mostrarFormCompromisso, setMostrarFormCompromisso] = useState(false);
  const [compromissoForm, setCompromissoForm] = useState({
    client_id: '',
    title: '',
    event_date: dataLocalHoje(),
    event_time: '',
    notes: '',
  });

  const [campanhas, setCampanhas] = useState<Campaign[]>([]);
  const [resultadosCampanhas, setResultadosCampanhas] = useState<CampaignResult[]>([]);
  const [loadingCampanhas, setLoadingCampanhas] = useState(false);
  const [mostrarFormCampanha, setMostrarFormCampanha] = useState(false);
  const [campanhaEditandoId, setCampanhaEditandoId] = useState<number | null>(null);
  const [campanhaAbertaId, setCampanhaAbertaId] = useState<number | null>(null);
  const [filtroClienteCampanha, setFiltroClienteCampanha] = useState('');
  const [filtroStatusCampanha, setFiltroStatusCampanha] = useState('');
  const [campanhaForm, setCampanhaForm] = useState({
    client_id: '',
    name: '',
    platform: 'Meta Ads',
    objective: '',
    budget_daily: '',
    budget_total: '',
    start_date: '',
    end_date: '',
    status: 'draft' as Campaign['status'],
    audience: '',
    publication_url: '',
    notes: '',
  });
  const [resultadoForm, setResultadoForm] = useState({
    reference_date: dataLocalHoje(),
    spent: '',
    reach: '',
    impressions: '',
    clicks: '',
    leads: '',
    messages: '',
    conversions: '',
    revenue: '',
    notes: '',
  });
  const [mostrarFormConteudo, setMostrarFormConteudo] = useState(false);
  const [conteudoEditandoId, setConteudoEditandoId] = useState<number | null>(null);
  const [filtroClienteConteudo, setFiltroClienteConteudo] = useState('');
  const [filtroStatusConteudo, setFiltroStatusConteudo] = useState('');
  const [filtroDataConteudo, setFiltroDataConteudo] = useState('');
  const [conteudoForm, setConteudoForm] = useState({
    client_id: '',
    content_type: 'feed' as ContentItem['content_type'],
    title: '',
    caption: '',
    scheduled_date: '',
    scheduled_time: '',
    status: 'todo' as ContentItem['status'],
    media_url: '',
    approval_notes: '',
    published_url: '',
    responsible: '',
  });

  const titulo = useMemo(
    () => menu.find((item) => item.id === tela)?.label ?? 'Dashboard',
    [tela]
  );

  const clientesFiltrados = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase();
    if (!termo) return clients;

    return clients.filter((client) =>
      [
        client.name,
        client.legal_name,
        client.contact_name,
        client.whatsapp,
        client.email,
      ]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo))
    );
  }, [clients, buscaCliente]);

  const clienteAberto = clients.find((item) => item.id === clienteAbertoId) ?? null;
  const contasCliente = accounts.filter((item) => item.client_id === clienteAbertoId);
  const guidelineCliente = guidelines.find((item) => item.client_id === clienteAbertoId) ?? null;
  const assetsCliente = assets.filter((item) => item.client_id === clienteAbertoId);

  // O aplicativo nunca consulta dados da agência antes da autenticação e autorização.
  useEffect(() => {
    let ativo = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, sessaoAtual) => {
      if (!ativo) return;
      setSessao(sessaoAtual);
      setAutenticacaoPronta(true);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!ativo) return;
      if (error) setErroLogin('Não foi possível restaurar sua sessão. Tente entrar novamente.');
      setSessao(data.session ?? null);
      setAutenticacaoPronta(true);
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let ativo = true;
    setAdministradorAutorizado(false);
    if (!sessao?.user.id) {
      setPermissaoVerificada(true);
      return;
    }

    setPermissaoVerificada(false);
    // A tabela agency_admins permite ler apenas a própria autorização.
    supabase.from('agency_admins')
      .select('user_id')
      .eq('user_id', sessao.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) {
          console.error('Erro de autorização:', error);
          setErroLogin('Não foi possível verificar seu acesso. Confirme a configuração no Supabase.');
        } else {
          setErroLogin('');
        }
        setAdministradorAutorizado(Boolean(data) && !error);
        setPermissaoVerificada(true);
      });

    return () => { ativo = false; };
  }, [sessao?.user.id]);

  useEffect(() => {
    if (!administradorAutorizado || !sessao) return;
    carregarClientes();
    carregarConteudos();
    carregarFinanceiroDashboard();
    carregarCampanhas();
    carregarTarefasAgenda();
  }, [administradorAutorizado, sessao?.user.id]);

  async function entrarNaAgencia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEntrando(true);
    setErroLogin('');
    const { error } = await supabase.auth.signInWithPassword({
      email: emailLogin.trim(),
      password: senhaLogin,
    });
    setEntrando(false);
    if (error) {
      setErroLogin(/invalid login credentials/i.test(error.message)
        ? 'E-mail ou senha incorretos.'
        : `Não foi possível entrar: ${error.message}`);
    } else {
      setSenhaLogin('');
    }
  }

  async function sairDaAgencia() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setErroLogin('Não foi possível sair da conta. Tente novamente.');
      return;
    }
    setAdministradorAutorizado(false);
    setClients([]);
    setAccounts([]);
    setGuidelines([]);
    setAssets([]);
    setConteudos([]);
    setFinanceiroEntries([]);
    setTarefas([]);
    setAgendaEvents([]);
    setCampanhas([]);
    setResultadosCampanhas([]);
    setErro('');
    setSucesso('');
  }

  useEffect(() => {
    if (!administradorAutorizado) {
      setAssetUrls({});
      return;
    }
    async function carregarUrlsPrivadas() {
      const comArquivo = assets.filter((asset) => Boolean(asset.file_url));
      if (comArquivo.length === 0) {
        setAssetUrls({});
        return;
      }

      const pares = await Promise.all(
        comArquivo.map(async (asset) => {
          const { data, error } = await supabase.storage
            .from('client-assets')
            .createSignedUrl(asset.file_url as string, 60 * 60);

          if (error || !data?.signedUrl) {
            console.warn('Não foi possível gerar URL temporária:', error);
            return [asset.id, ''] as const;
          }

          return [asset.id, data.signedUrl] as const;
        })
      );

      setAssetUrls(
        Object.fromEntries(
          pares.filter(([, url]) => Boolean(url))
        )
      );
    }

    carregarUrlsPrivadas();
  }, [assets, administradorAutorizado]);

  useEffect(() => {
    if (!clienteAbertoId) {
      setGuidelineDraft({
        target_audience: '',
        tone_of_voice: '',
        preferred_words: '',
        avoided_words: '',
        visual_guidelines: '',
        content_guidelines: '',
        general_notes: '',
      });
      return;
    }

    const item = guidelines.find((g) => g.client_id === clienteAbertoId);
    setGuidelineDraft({
      target_audience: item?.target_audience ?? '',
      tone_of_voice: item?.tone_of_voice ?? '',
      preferred_words: item?.preferred_words ?? '',
      avoided_words: item?.avoided_words ?? '',
      visual_guidelines: item?.visual_guidelines ?? '',
      content_guidelines: item?.content_guidelines ?? '',
      general_notes: item?.general_notes ?? '',
    });
  }, [clienteAbertoId, guidelines]);

  async function carregarClientes() {
    setLoadingClients(true);
    setErro('');

    const [clientesResult, contasResult, guidelinesResult, assetsResult] = await Promise.all([
      supabase.from('Clients').select('*').order('name'),
      supabase.from('ClientAccounts').select('*').order('created_at', { ascending: false }),
      supabase.from('ClientGuidelines').select('*'),
      supabase.from('ClientBrandAssets').select('*').order('created_at', { ascending: false }),
    ]);

    const erroCarregamento =
      clientesResult.error ||
      contasResult.error ||
      guidelinesResult.error ||
      assetsResult.error;

    if (erroCarregamento) {
      console.error(erroCarregamento);
      setErro('Não foi possível carregar os dados de clientes.');
    } else {
      setClients((clientesResult.data as Client[]) ?? []);
      setAccounts((contasResult.data as ClientAccount[]) ?? []);
      setGuidelines((guidelinesResult.data as ClientGuideline[]) ?? []);
      setAssets((assetsResult.data as ClientBrandAsset[]) ?? []);
    }

    setLoadingClients(false);
  }



  async function carregarFinanceiroDashboard() {
    setLoadingFinanceiro(true);

    const { data, error } = await supabase
      .from('FinancialEntries')
      .select('*')
      .order('due_date', { ascending: false });

    if (error) {
      console.error('Erro ao carregar financeiro:', error);
      setErro('Não foi possível carregar o Financeiro.');
    } else {
      setFinanceiroEntries((data as FinancialEntry[]) ?? []);
    }

    setLoadingFinanceiro(false);
  }




  async function carregarTarefasAgenda() {
    setLoadingTarefas(true);

    const [tarefasResult, agendaResult] = await Promise.all([
      supabase.from('Tasks').select('*').order('due_at', { ascending: true }),
      supabase.from('AgendaEvents').select('*').order('event_date', { ascending: true }),
    ]);

    if (tarefasResult.error || agendaResult.error) {
      console.error(tarefasResult.error || agendaResult.error);
      setErro('Não foi possível carregar tarefas/agenda.');
    } else {
      setTarefas((tarefasResult.data as TaskItem[]) ?? []);
      setAgendaEvents((agendaResult.data as AgendaEvent[]) ?? []);
    }

    setLoadingTarefas(false);
  }

  function novaTarefa() {
    setTarefaEditandoId(null);
    setTarefaForm({
      client_id: '',
      title: '',
      description: '',
      responsible: '',
      due_date: '',
      due_time: '',
      priority: 'normal',
      status: 'todo',
      reminder_date: '',
      reminder_time: '',
    });
    setMostrarFormTarefa(true);
    setErro('');
    setSucesso('');
  }

  function editarTarefa(tarefa: TaskItem) {
    setTarefaEditandoId(tarefa.id);
    setTarefaForm({
      client_id: tarefa.client_id ? String(tarefa.client_id) : '',
      title: tarefa.title ?? '',
      description: tarefa.description ?? '',
      responsible: tarefa.responsible ?? '',
      due_date: dataIsoLocal(tarefa.due_at),
      due_time: horaIsoLocal(tarefa.due_at),
      priority: tarefa.priority,
      status: tarefa.status,
      reminder_date: dataIsoLocal(tarefa.reminder_at),
      reminder_time: horaIsoLocal(tarefa.reminder_at),
    });
    setMostrarFormTarefa(true);
    setErro('');
    setSucesso('');
  }

  async function salvarTarefa(event: FormEvent) {
    event.preventDefault();

    if (!tarefaForm.title.trim()) {
      setErro('Informe o título da tarefa.');
      return;
    }

    setSaving(true);
    setErro('');

    const dueAt = tarefaForm.due_date
      ? `${tarefaForm.due_date}T${tarefaForm.due_time || '09:00'}:00`
      : null;

    const reminderAt = tarefaForm.reminder_date
      ? `${tarefaForm.reminder_date}T${tarefaForm.reminder_time || '09:00'}:00`
      : null;

    const payload = {
      client_id: tarefaForm.client_id ? Number(tarefaForm.client_id) : null,
      title: tarefaForm.title.trim(),
      description: tarefaForm.description.trim() || null,
      responsible: tarefaForm.responsible.trim() || null,
      due_at: dueAt,
      priority: tarefaForm.priority,
      status: tarefaForm.status,
      reminder_at: reminderAt,
      completed_at:
        tarefaForm.status === 'done' ? new Date().toISOString() : null,
    };

    let error;

    if (tarefaEditandoId) {
      ({ error } = await supabase.from('Tasks').update(payload).eq('id', tarefaEditandoId));
    } else {
      ({ error } = await supabase.from('Tasks').insert(payload));
    }

    setSaving(false);

    if (error) {
      setErro(mensagemErroBanco(error.message));
      return;
    }

    setSucesso(tarefaEditandoId ? 'Tarefa atualizada.' : 'Tarefa cadastrada.');
    setMostrarFormTarefa(false);
    await carregarTarefasAgenda();
  }

  async function excluirTarefa(id: number) {
    if (!window.confirm('Excluir definitivamente esta tarefa?')) return;
    const { error } = await supabase.from('Tasks').delete().eq('id', id);
    if (error) {
      setErro(mensagemErroBanco(error.message));
      return;
    }
    setSucesso('Tarefa excluída.');
    await carregarTarefasAgenda();
  }

  function abrirFormularioCompromisso() {
    setErro('');
    setCompromissoForm({
      client_id: '',
      title: '',
      event_date: agendaDataSelecionada,
      event_time: '',
      notes: '',
    });
    setMostrarFormCompromisso(true);
  }

  async function salvarCompromisso(event: FormEvent) {
    event.preventDefault();

    if (!compromissoForm.title.trim() || !compromissoForm.event_date) {
      setErro('Informe o compromisso e a data.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('AgendaEvents').insert({
      client_id: compromissoForm.client_id ? Number(compromissoForm.client_id) : null,
      title: compromissoForm.title.trim(),
      event_date: compromissoForm.event_date,
      event_time: compromissoForm.event_time || null,
      notes: compromissoForm.notes.trim() || null,
    });
    setSaving(false);

    if (error) {
      setErro(mensagemErroBanco(error.message));
      return;
    }

    setCompromissoForm({
      client_id: '',
      title: '',
      event_date: agendaDataSelecionada,
      event_time: '',
      notes: '',
    });
    setMostrarFormCompromisso(false);
    setSucesso('Compromisso adicionado à agenda.');
    await carregarTarefasAgenda();
  }

  async function excluirCompromisso(id: number) {
    if (!window.confirm('Excluir este compromisso?')) return;
    const { error } = await supabase.from('AgendaEvents').delete().eq('id', id);
    if (error) {
      setErro(mensagemErroBanco(error.message));
      return;
    }
    await carregarTarefasAgenda();
  }

  async function excluirConteudo(id: number) {
    if (!window.confirm('Excluir definitivamente este conteúdo?')) return;

    const { error } = await supabase
      .from('ContentCalendar')
      .delete()
      .eq('id', id);

    if (error) {
      setErro(mensagemErroBanco(error.message));
      return;
    }

    setSucesso('Conteúdo excluído.');
    await carregarConteudos();
  }

  async function excluirCliente(client: Client) {
    const confirmar = window.confirm(
      `ATENÇÃO: excluir "${client.name}" removerá também contas gerenciadas, materiais, orientações, conteúdos, campanhas, resultados, financeiro, tarefas e compromissos vinculados.\n\nDeseja continuar?`
    );

    if (!confirmar) return;

    setSaving(true);
    setErro('');

    try {
      const campanhasCliente = campanhas.filter((c) => c.client_id === client.id);
      const campanhaIds = campanhasCliente.map((c) => c.id);

      if (campanhaIds.length > 0) {
        const { error } = await supabase
          .from('CampaignResults')
          .delete()
          .in('campaign_id', campanhaIds);
        if (error) throw error;
      }

      for (const tabela of [
        'ClientAccounts',
        'ClientBrandAssets',
        'ClientGuidelines',
        'ContentCalendar',
        'Campaigns',
        'FinancialEntries',
        'Tasks',
        'AgendaEvents',
      ]) {
        const { error } = await supabase
          .from(tabela)
          .delete()
          .eq('client_id', client.id);

        if (error) throw error;
      }

      const { error } = await supabase.from('Clients').delete().eq('id', client.id);
      if (error) throw error;

      setSucesso('Cliente e dados vinculados excluídos.');
      setClienteAbertoId(null);

      await Promise.all([
        carregarClientes(),
        carregarConteudos(),
        carregarCampanhas(),
        carregarFinanceiroDashboard(),
        carregarTarefasAgenda(),
      ]);
    } catch (error: any) {
      console.error(error);
      setErro(error?.message || 'Não foi possível excluir o cliente.');
    } finally {
      setSaving(false);
    }
  }

  function limparFinanceiroForm() {
    setFinanceiroForm({
      client_id: '',
      entry_type: 'income',
      category: 'Mensalidade',
      description: '',
      amount: '',
      due_date: '',
      paid_date: '',
      status: 'pending',
      payment_method: '',
      recurring: false,
      notes: '',
    });
    setFinanceiroEditandoId(null);
  }

  function novoLancamentoFinanceiro() {
    limparFinanceiroForm();
    setMostrarFormFinanceiro(true);
    setErro('');
    setSucesso('');
  }

  function editarLancamentoFinanceiro(entry: FinancialEntry) {
    setFinanceiroEditandoId(entry.id);
    setFinanceiroForm({
      client_id: entry.client_id ? String(entry.client_id) : '',
      entry_type: entry.entry_type,
      category: entry.category ?? '',
      description: entry.description ?? '',
      amount: String(entry.amount ?? ''),
      due_date: entry.due_date ?? '',
      paid_date: entry.paid_date ?? '',
      status: entry.status,
      payment_method: entry.payment_method ?? '',
      recurring: Boolean(entry.recurring),
      notes: entry.notes ?? '',
    });
    setMostrarFormFinanceiro(true);
    setErro('');
    setSucesso('');
  }

  async function salvarLancamentoFinanceiro(event: FormEvent) {
    event.preventDefault();
    setErro('');
    setSucesso('');

    if (!financeiroForm.description.trim()) {
      setErro('Informe a descrição do lançamento.');
      return;
    }

    const valor = Number(financeiroForm.amount || 0);
    if (!Number.isFinite(valor) || valor <= 0) {
      setErro('Informe um valor maior que zero.');
      return;
    }

    setSaving(true);

    const statusFinal =
      financeiroForm.paid_date && financeiroForm.status !== 'cancelled'
        ? 'paid'
        : financeiroForm.status;

    const payload = {
      client_id: financeiroForm.client_id
        ? Number(financeiroForm.client_id)
        : null,
      entry_type: financeiroForm.entry_type,
      category: financeiroForm.category.trim() || null,
      description: financeiroForm.description.trim(),
      amount: valor,
      due_date: financeiroForm.due_date || null,
      paid_date: statusFinal === 'paid'
        ? financeiroForm.paid_date || dataLocalHoje()
        : null,
      status: statusFinal,
      payment_method: financeiroForm.payment_method.trim() || null,
      recurring: financeiroForm.recurring,
      notes: financeiroForm.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let error;

    if (financeiroEditandoId) {
      ({ error } = await supabase
        .from('FinancialEntries')
        .update(payload)
        .eq('id', financeiroEditandoId));
    } else {
      ({ error } = await supabase.from('FinancialEntries').insert(payload));
    }

    setSaving(false);

    if (error) {
      console.error(error);
      setErro(mensagemErroBanco(error.message));
      return;
    }

    setSucesso(
      financeiroEditandoId
        ? 'Lançamento atualizado com sucesso.'
        : 'Lançamento cadastrado com sucesso.'
    );

    setMostrarFormFinanceiro(false);
    limparFinanceiroForm();
    await carregarFinanceiroDashboard();
  }

  async function marcarLancamentoPago(entry: FinancialEntry) {
    const dataPagamento = dataLocalHoje();

    const { error } = await supabase
      .from('FinancialEntries')
      .update({
        status: 'paid',
        paid_date: dataPagamento,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entry.id);

    if (error) {
      setErro(mensagemErroBanco(error.message));
      return;
    }

    setSucesso('Pagamento registrado.');
    await carregarFinanceiroDashboard();
  }

  async function cancelarLancamento(entry: FinancialEntry) {
    if (!window.confirm('Cancelar este lançamento?')) return;

    const { error } = await supabase
      .from('FinancialEntries')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', entry.id);

    if (error) {
      setErro(mensagemErroBanco(error.message));
      return;
    }

    setSucesso('Lançamento cancelado.');
    await carregarFinanceiroDashboard();
  }

  async function excluirLancamentoFinanceiro(entry: FinancialEntry) {
    if (entry.status === 'paid') {
      window.alert('Lançamentos pagos não podem ser excluídos. Edite ou cancele o registro, se necessário.');
      return;
    }

    if (!window.confirm('Excluir definitivamente este lançamento?')) return;

    const { error } = await supabase
      .from('FinancialEntries')
      .delete()
      .eq('id', entry.id);

    if (error) {
      setErro(mensagemErroBanco(error.message));
      return;
    }

    setSucesso('Lançamento excluído.');
    await carregarFinanceiroDashboard();
  }

  async function gerarMensalidadesDoMes() {
    const confirmar = window.confirm(
      `Gerar as mensalidades dos clientes ativos para ${filtroMesFinanceiro || mesReferencia()}?`
    );

    if (!confirmar) return;

    const referencia = filtroMesFinanceiro || mesReferencia();
    const [ano, mes] = referencia.split('-').map(Number);

    const clientesAtivos = clients.filter(
      (client) =>
        client.status === 'active' &&
        Number(client.monthly_fee || 0) > 0
    );

    if (clientesAtivos.length === 0) {
      setErro('Não há clientes ativos com mensalidade cadastrada.');
      return;
    }

    const existentes = financeiroEntries.filter(
      (entry) =>
        entry.entry_type === 'income' &&
        entry.category === 'Mensalidade' &&
        entry.due_date?.startsWith(referencia) &&
        entry.client_id
    );

    const clientIdsExistentes = new Set(
      existentes.map((entry) => entry.client_id)
    );

    const novos = clientesAtivos
      .filter((client) => !clientIdsExistentes.has(client.id))
      .map((client) => {
        const ultimoDia = new Date(ano, mes, 0).getDate();
        const dia = Math.min(
          Math.max(Number(client.billing_day || 1), 1),
          ultimoDia
        );
        const dueDate =
          `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

        return {
          client_id: client.id,
          entry_type: 'income',
          category: 'Mensalidade',
          description: `Mensalidade ${String(mes).padStart(2, '0')}/${ano} • ${client.name}`,
          amount: Number(client.monthly_fee || 0),
          due_date: dueDate,
          paid_date: null,
          status: 'pending',
          payment_method: null,
          recurring: true,
          notes: 'Gerada automaticamente pelo Financeiro.',
        };
      });

    if (novos.length === 0) {
      setSucesso('As mensalidades deste mês já foram geradas.');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('FinancialEntries')
      .insert(novos);

    setSaving(false);

    if (error) {
      setErro(mensagemErroBanco(error.message));
      return;
    }

    setSucesso(`${novos.length} mensalidade(s) gerada(s) com sucesso.`);
    await carregarFinanceiroDashboard();
  }

  const financeiroFiltrado = financeiroEntries
    .filter((entry) => {
      const tipoOk =
        !filtroTipoFinanceiro ||
        entry.entry_type === filtroTipoFinanceiro;

      const statusVisual = statusFinanceiroVisual(
        entry.status,
        entry.due_date
      );

      const statusOk =
        !filtroStatusFinanceiro ||
        statusVisual === filtroStatusFinanceiro;

      const clienteOk =
        !filtroClienteFinanceiro ||
        String(entry.client_id || '') === filtroClienteFinanceiro;

      const mesOk =
        !filtroMesFinanceiro ||
        entry.due_date?.startsWith(filtroMesFinanceiro);

      return tipoOk && statusOk && clienteOk && mesOk;
    })
    .sort((a, b) =>
      (b.due_date || '').localeCompare(a.due_date || '')
    );

  const resumoFinanceiro = financeiroFiltrado.reduce(
    (acc, entry) => {
      if (entry.status === 'cancelled') return acc;

      const valor = Number(entry.amount || 0);

      if (entry.entry_type === 'income') {
        if (entry.status === 'paid') acc.recebido += valor;
        else acc.aReceber += valor;
      } else {
        if (entry.status === 'paid') acc.pago += valor;
        else acc.aPagar += valor;
      }

      return acc;
    },
    {
      recebido: 0,
      aReceber: 0,
      pago: 0,
      aPagar: 0,
    }
  );

  const saldoFinanceiro =
    resumoFinanceiro.recebido - resumoFinanceiro.pago;


  const tarefasPendentes = tarefas.filter(
    (tarefa) => !['done', 'cancelled'].includes(tarefa.status)
  );


  const tarefasAtrasadas = tarefas.filter(
    (tarefa) =>
      tarefa.due_at &&
      dataIsoLocal(tarefa.due_at) < dataLocalHoje() &&
      !['done', 'cancelled'].includes(tarefa.status)
  );

  const tarefasHoje = tarefas.filter(
    (tarefa) =>
      tarefa.due_at &&
      dataIsoLocal(tarefa.due_at) === dataLocalHoje() &&
      !['done', 'cancelled'].includes(tarefa.status)
  );

  const tarefasFiltradas = tarefas
    .filter((tarefa) => {
      const termo = buscaTarefa.trim().toLowerCase();
      const client = clients.find((c) => c.id === tarefa.client_id);

      const buscaOk =
        !termo ||
        [tarefa.title, tarefa.description, tarefa.responsible, client?.name]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(termo));

      const statusOk =
        !filtroStatusTarefa ||
        tarefa.status === filtroStatusTarefa;

      const prioridadeOk =
        !filtroPrioridadeTarefa ||
        tarefa.priority === filtroPrioridadeTarefa;

      const clienteOk =
        !filtroClienteTarefa ||
        String(tarefa.client_id || '') === filtroClienteTarefa;

      return buscaOk && statusOk && prioridadeOk && clienteOk;
    })
    .sort((a, b) => {
      const pesoPrioridade = (p: TaskItem['priority']) =>
        p === 'urgent' ? 0 : p === 'high' ? 1 : p === 'normal' ? 2 : 3;

      const diferencaPrioridade =
        pesoPrioridade(a.priority) - pesoPrioridade(b.priority);

      if (diferencaPrioridade !== 0) return diferencaPrioridade;

      return (a.due_at || '9999').localeCompare(b.due_at || '9999');
    });

  const limiteSemana = (() => {
    const data = new Date();
    data.setHours(0, 0, 0, 0);
    data.setDate(data.getDate() + 7);
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(
      data.getDate()
    ).padStart(2, '0')}`;
  })();

  const contasAPagarSemana = financeiroEntries
    .filter(
      (entry) =>
        entry.entry_type === 'expense' &&
        entry.due_date &&
        entry.due_date >= dataLocalHoje() &&
        entry.due_date <= limiteSemana &&
        !['paid', 'cancelled'].includes(entry.status)
    )
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  const totalContasAPagarSemana = contasAPagarSemana.reduce(
    (total, entry) => total + Number(entry.amount || 0),
    0
  );

  const agendaItensDia = (() => {
    const data = agendaDataSelecionada;
    const itens: Array<{
      tipo: string;
      titulo: string;
      subtitulo: string;
      hora?: string;
      ordem: string;
      statusTexto?: string;
      statusClasse?: string;
    }> = [];

    agendaEvents
      .filter((item) => item.event_date === data)
      .forEach((item) => {
        const client = clients.find((c) => c.id === item.client_id);
        itens.push({
          tipo: 'Compromisso',
          titulo: item.title,
          subtitulo: client?.name || item.notes || 'Compromisso',
          hora: item.event_time?.slice(0, 5) || '',
          ordem: `1-${item.event_time || '99:99'}`,
          statusTexto: 'Compromisso',
          statusClasse: 'neutral',
        });
      });

    conteudos
      .filter((item) => item.scheduled_date === data)
      .forEach((item) => {
        const client = clients.find((c) => c.id === item.client_id);
        itens.push({
          tipo: 'Conteúdo',
          titulo: item.title,
          subtitulo: `${client?.name || 'Cliente'} • ${rotuloConteudo(item.content_type)}`,
          hora: item.scheduled_time?.slice(0, 5) || '',
          ordem: `2-${item.scheduled_time || '99:99'}`,
          statusTexto: rotuloStatusConteudo(item.status),
          statusClasse:
            item.status === 'published'
              ? 'done'
              : item.status === 'cancelled'
              ? 'cancelled'
              : item.status === 'approved'
              ? 'approved'
              : 'pending',
        });
      });

    campanhas
      .filter(
        (item) =>
          item.start_date === data ||
          item.end_date === data
      )
      .forEach((item) => {
        const client = clients.find((c) => c.id === item.client_id);
        itens.push({
          tipo: 'Campanha',
          titulo: item.name,
          subtitulo: `${client?.name || 'Cliente'} • ${
            item.start_date === data ? 'Início' : 'Término'
          }`,
          ordem: '3-00:00',
          statusTexto: rotuloStatusCampanha(item.status),
          statusClasse:
            item.status === 'finished'
              ? 'done'
              : item.status === 'cancelled'
              ? 'cancelled'
              : item.status === 'active'
              ? 'active'
              : 'pending',
        });
      });

    financeiroEntries
      .filter((item) => item.due_date === data && item.status !== 'cancelled')
      .forEach((item) => {
        const client = clients.find((c) => c.id === item.client_id);
        const statusVisual = statusFinanceiroVisual(item.status, item.due_date);
        const quitado = item.status === 'paid';

        const statusTexto =
          item.entry_type === 'income'
            ? quitado
              ? 'Recebido'
              : statusVisual === 'overdue'
              ? 'Atrasado'
              : 'A receber'
            : quitado
            ? 'Pago'
            : statusVisual === 'overdue'
            ? 'Atrasado'
            : 'A pagar';

        itens.push({
          tipo:
            item.entry_type === 'income'
              ? item.category === 'Mensalidade'
                ? 'Mensalidade'
                : 'Recebimento'
              : 'Pagamento',
          titulo: item.description,
          subtitulo: `${client?.name ? `${client.name} • ` : ''}${moeda(
            Number(item.amount || 0)
          )}`,
          ordem: item.entry_type === 'income' ? '4-00:00' : '5-00:00',
          statusTexto,
          statusClasse: quitado ? 'done' : statusVisual === 'overdue' ? 'overdue' : 'pending',
        });
      });

    tarefas
      .filter((item) => dataIsoLocal(item.due_at) === data && item.status !== 'cancelled')
      .forEach((item) => {
        const client = clients.find((c) => c.id === item.client_id);
        itens.push({
          tipo: 'Tarefa',
          titulo: item.title,
          subtitulo: `${client?.name ? `${client.name} • ` : ''}${rotuloPrioridade(
            item.priority
          )}`,
          hora: horaIsoLocal(item.due_at),
          ordem: `6-${horaIsoLocal(item.due_at) || '99:99'}`,
          statusTexto: rotuloStatusTarefa(item.status),
          statusClasse:
            item.status === 'done'
              ? 'done'
              : item.status === 'cancelled'
              ? 'cancelled'
              : 'pending',
        });
      });

    return itens.sort((a, b) => a.ordem.localeCompare(b.ordem));
  })();

  const diasComItens = new Set<string>([
    ...agendaEvents.map((item) => item.event_date),
    ...conteudos.map((item) => item.scheduled_date).filter(Boolean) as string[],
    ...campanhas.flatMap((item) => [item.start_date, item.end_date]).filter(Boolean) as string[],
    ...financeiroEntries.map((item) => item.due_date).filter(Boolean) as string[],
    ...tarefas.map((item) => dataIsoLocal(item.due_at)).filter(Boolean),
  ]);

  function diasDoMesAgenda() {
    const ano = agendaMes.getFullYear();
    const mes = agendaMes.getMonth();
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    const dias: Array<number | null> = [];

    for (let i = 0; i < primeiroDiaSemana; i += 1) dias.push(null);
    for (let dia = 1; dia <= ultimoDia; dia += 1) dias.push(dia);

    return dias;
  }

  function selecionarDiaAgenda(dia: number) {
    const data = `${agendaMes.getFullYear()}-${String(
      agendaMes.getMonth() + 1
    ).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    setAgendaDataSelecionada(data);
  }

  function mudarMesAgenda(direcao: number) {
    setAgendaMes(
      new Date(
        agendaMes.getFullYear(),
        agendaMes.getMonth() + direcao,
        1
      )
    );
  }

  async function carregarCampanhas() {
    setLoadingCampanhas(true);

    const [campanhasResult, resultadosResult] = await Promise.all([
      supabase.from('Campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('CampaignResults').select('*').order('reference_date', { ascending: false }),
    ]);

    if (campanhasResult.error || resultadosResult.error) {
      console.error(campanhasResult.error || resultadosResult.error);
      setErro('Não foi possível carregar as campanhas.');
    } else {
      setCampanhas((campanhasResult.data as Campaign[]) ?? []);
      setResultadosCampanhas((resultadosResult.data as CampaignResult[]) ?? []);
    }

    setLoadingCampanhas(false);
  }

  function limparCampanhaForm() {
    setCampanhaForm({
      client_id: '',
      name: '',
      platform: 'Meta Ads',
      objective: '',
      budget_daily: '',
      budget_total: '',
      start_date: '',
      end_date: '',
      status: 'draft',
      audience: '',
      publication_url: '',
      notes: '',
    });
    setCampanhaEditandoId(null);
  }

  function novaCampanha() {
    limparCampanhaForm();
    setMostrarFormCampanha(true);
    setErro('');
    setSucesso('');
  }

  function editarCampanha(campanha: Campaign) {
    setCampanhaEditandoId(campanha.id);
    setCampanhaForm({
      client_id: String(campanha.client_id),
      name: campanha.name ?? '',
      platform: campanha.platform ?? 'Meta Ads',
      objective: campanha.objective ?? '',
      budget_daily: campanha.budget_daily != null ? String(campanha.budget_daily) : '',
      budget_total: campanha.budget_total != null ? String(campanha.budget_total) : '',
      start_date: campanha.start_date ?? '',
      end_date: campanha.end_date ?? '',
      status: campanha.status,
      audience: campanha.audience ?? '',
      publication_url: campanha.publication_url ?? '',
      notes: campanha.notes ?? '',
    });
    setMostrarFormCampanha(true);
    setErro('');
    setSucesso('');
  }

  async function salvarCampanha(event: FormEvent) {
    event.preventDefault();
    setErro('');
    setSucesso('');

    if (!campanhaForm.client_id) {
      setErro('Selecione o cliente.');
      return;
    }

    if (!campanhaForm.name.trim()) {
      setErro('Informe o nome da campanha.');
      return;
    }

    setSaving(true);

    const payload = {
      client_id: Number(campanhaForm.client_id),
      name: campanhaForm.name.trim(),
      platform: campanhaForm.platform.trim() || null,
      objective: campanhaForm.objective.trim() || null,
      budget_daily: campanhaForm.budget_daily ? Number(campanhaForm.budget_daily) : null,
      budget_total: campanhaForm.budget_total ? Number(campanhaForm.budget_total) : null,
      start_date: campanhaForm.start_date || null,
      end_date: campanhaForm.end_date || null,
      status: campanhaForm.status,
      audience: campanhaForm.audience.trim() || null,
      publication_url: campanhaForm.publication_url.trim() || null,
      notes: campanhaForm.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let error;

    if (campanhaEditandoId) {
      ({ error } = await supabase
        .from('Campaigns')
        .update(payload)
        .eq('id', campanhaEditandoId));
    } else {
      ({ error } = await supabase.from('Campaigns').insert(payload));
    }

    setSaving(false);

    if (error) {
      console.error(error);
      setErro(mensagemErroBanco(error.message));
      return;
    }

    setSucesso(
      campanhaEditandoId
        ? 'Campanha atualizada com sucesso.'
        : 'Campanha cadastrada com sucesso.'
    );
    setMostrarFormCampanha(false);
    limparCampanhaForm();
    await carregarCampanhas();
  }

  async function excluirCampanha(id: number) {
    if (!window.confirm('Excluir esta campanha e seus resultados?')) return;

    const { error: resultadosError } = await supabase
      .from('CampaignResults')
      .delete()
      .eq('campaign_id', id);

    if (resultadosError) {
      setErro(resultadosError.message);
      return;
    }

    const { error } = await supabase.from('Campaigns').delete().eq('id', id);

    if (error) {
      setErro(mensagemErroBanco(error.message));
      return;
    }

    if (campanhaAbertaId === id) setCampanhaAbertaId(null);
    setSucesso('Campanha excluída.');
    await carregarCampanhas();
  }

  async function salvarResultadoCampanha(event: FormEvent) {
    event.preventDefault();
    if (!campanhaAbertaId) return;

    setSaving(true);
    setErro('');

    const { error } = await supabase.from('CampaignResults').insert({
      campaign_id: campanhaAbertaId,
      reference_date: resultadoForm.reference_date || dataLocalHoje(),
      spent: Number(resultadoForm.spent || 0),
      reach: Number(resultadoForm.reach || 0),
      impressions: Number(resultadoForm.impressions || 0),
      clicks: Number(resultadoForm.clicks || 0),
      leads: Number(resultadoForm.leads || 0),
      messages: Number(resultadoForm.messages || 0),
      conversions: Number(resultadoForm.conversions || 0),
      revenue: Number(resultadoForm.revenue || 0),
      notes: resultadoForm.notes.trim() || null,
    });

    setSaving(false);

    if (error) {
      setErro(mensagemErroBanco(error.message));
      return;
    }

    setResultadoForm({
      reference_date: dataLocalHoje(),
      spent: '',
      reach: '',
      impressions: '',
      clicks: '',
      leads: '',
      messages: '',
      conversions: '',
      revenue: '',
      notes: '',
    });

    setSucesso('Resultado da campanha registrado.');
    await carregarCampanhas();
  }

  async function excluirResultadoCampanha(id: number) {
    if (!window.confirm('Excluir este resultado?')) return;

    const { error } = await supabase.from('CampaignResults').delete().eq('id', id);

    if (error) {
      setErro(mensagemErroBanco(error.message));
      return;
    }

    await carregarCampanhas();
  }

  const campanhasFiltradas = campanhas.filter((campanha) => {
    const clienteOk =
      !filtroClienteCampanha ||
      String(campanha.client_id) === filtroClienteCampanha;
    const statusOk =
      !filtroStatusCampanha ||
      campanha.status === filtroStatusCampanha;
    return clienteOk && statusOk;
  });

  const campanhaAberta =
    campanhas.find((campanha) => campanha.id === campanhaAbertaId) ?? null;

  const resultadosCampanhaAberta = resultadosCampanhas
    .filter((item) => item.campaign_id === campanhaAbertaId)
    .sort((a, b) => b.reference_date.localeCompare(a.reference_date));

  const totaisCampanhaAberta = resultadosCampanhaAberta.reduce(
    (acc, item) => ({
      spent: acc.spent + Number(item.spent || 0),
      reach: acc.reach + Number(item.reach || 0),
      impressions: acc.impressions + Number(item.impressions || 0),
      clicks: acc.clicks + Number(item.clicks || 0),
      leads: acc.leads + Number(item.leads || 0),
      messages: acc.messages + Number(item.messages || 0),
      conversions: acc.conversions + Number(item.conversions || 0),
      revenue: acc.revenue + Number(item.revenue || 0),
    }),
    {
      spent: 0,
      reach: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
      messages: 0,
      conversions: 0,
      revenue: 0,
    }
  );

  async function carregarConteudos() {
    setLoadingConteudos(true);

    const { data, error } = await supabase
      .from('ContentCalendar')
      .select('*')
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error(error);
      setErro('Não foi possível carregar o calendário de conteúdo.');
    } else {
      setConteudos((data as ContentItem[]) ?? []);
    }

    setLoadingConteudos(false);
  }

  function limparConteudoForm() {
    setConteudoForm({
      client_id: '',
      content_type: 'feed',
      title: '',
      caption: '',
      scheduled_date: '',
      scheduled_time: '',
      status: 'todo',
      media_url: '',
      approval_notes: '',
      published_url: '',
      responsible: '',
    });
    setConteudoEditandoId(null);
  }

  function novoConteudo() {
    limparConteudoForm();
    setMostrarFormConteudo(true);
    setErro('');
    setSucesso('');
  }

  function editarConteudo(item: ContentItem) {
    setConteudoEditandoId(item.id);
    setConteudoForm({
      client_id: String(item.client_id),
      content_type: item.content_type,
      title: item.title ?? '',
      caption: item.caption ?? '',
      scheduled_date: item.scheduled_date ?? '',
      scheduled_time: item.scheduled_time?.slice(0, 5) ?? '',
      status: item.status,
      media_url: item.media_url ?? '',
      approval_notes: item.approval_notes ?? '',
      published_url: item.published_url ?? '',
      responsible: item.responsible ?? '',
    });
    setMostrarFormConteudo(true);
    setErro('');
    setSucesso('');
  }

  async function salvarConteudo(event: FormEvent) {
    event.preventDefault();
    setErro('');
    setSucesso('');

    if (!conteudoForm.client_id) {
      setErro('Selecione o cliente.');
      return;
    }

    if (!conteudoForm.title.trim()) {
      setErro('Informe o título do conteúdo.');
      return;
    }

    setSaving(true);

    const payload = {
      client_id: Number(conteudoForm.client_id),
      content_type: conteudoForm.content_type,
      title: conteudoForm.title.trim(),
      caption: conteudoForm.caption.trim() || null,
      scheduled_date: conteudoForm.scheduled_date || null,
      scheduled_time: conteudoForm.scheduled_time || null,
      status: conteudoForm.status,
      media_url: conteudoForm.media_url.trim() || null,
      approval_notes: conteudoForm.approval_notes.trim() || null,
      published_url: conteudoForm.published_url.trim() || null,
      responsible: conteudoForm.responsible.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let error;

    if (conteudoEditandoId) {
      ({ error } = await supabase
        .from('ContentCalendar')
        .update(payload)
        .eq('id', conteudoEditandoId));
    } else {
      ({ error } = await supabase
        .from('ContentCalendar')
        .insert(payload));
    }

    setSaving(false);

    if (error) {
      console.error(error);
      setErro(mensagemErroBanco(error.message));
      return;
    }

    setSucesso(
      conteudoEditandoId
        ? 'Conteúdo atualizado com sucesso.'
        : 'Conteúdo adicionado ao calendário.'
    );
    setMostrarFormConteudo(false);
    limparConteudoForm();
    await carregarConteudos();
  }


  const hoje = dataLocalHoje();

  const conteudosFiltrados = conteudos.filter((item) => {
    const clienteOk =
      !filtroClienteConteudo ||
      String(item.client_id) === filtroClienteConteudo;
    const statusOk =
      !filtroStatusConteudo ||
      item.status === filtroStatusConteudo;
    const dataOk =
      !filtroDataConteudo ||
      item.scheduled_date === filtroDataConteudo;
    return clienteOk && statusOk && dataOk;
  });

  const conteudosAtrasados = conteudos
    .filter(
      (item) =>
        Boolean(item.scheduled_date) &&
        item.scheduled_date! < hoje &&
        !['published', 'cancelled'].includes(item.status)
    )
    .sort((a, b) =>
      `${a.scheduled_date || ''}${a.scheduled_time || ''}`.localeCompare(
        `${b.scheduled_date || ''}${b.scheduled_time || ''}`
      )
    );

  const conteudosHoje = conteudos
    .filter(
      (item) =>
        item.scheduled_date === hoje &&
        !['published', 'cancelled'].includes(item.status)
    )
    .sort((a, b) =>
      (a.scheduled_time || '').localeCompare(b.scheduled_time || '')
    );

  const conteudosAprovacao = conteudos
    .filter((item) => item.status === 'approval')
    .sort((a, b) =>
      `${a.scheduled_date || '9999-12-31'}${a.scheduled_time || ''}`.localeCompare(
        `${b.scheduled_date || '9999-12-31'}${b.scheduled_time || ''}`
      )
    );

  const proximosConteudos = conteudos
    .filter(
      (item) =>
        Boolean(item.scheduled_date) &&
        item.scheduled_date! > hoje &&
        !['published', 'cancelled'].includes(item.status)
    )
    .sort((a, b) =>
      `${a.scheduled_date || ''}${a.scheduled_time || ''}`.localeCompare(
        `${b.scheduled_date || ''}${b.scheduled_time || ''}`
      )
    )
    .slice(0, 5);


  const hojeFinanceiro = dataLocalHoje();
  const limiteProximoVencimento = (() => {
    const data = new Date();
    data.setHours(0, 0, 0, 0);
    data.setDate(data.getDate() + 7);
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  })();

  const mensalidadesEmAtraso = financeiroEntries
    .filter(
      (entry) =>
        entry.client_id &&
        entry.due_date &&
        entry.due_date < hojeFinanceiro &&
        !['paid', 'cancelled'].includes(entry.status)
    )
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  const mensalidadesProximas = financeiroEntries
    .filter(
      (entry) =>
        entry.client_id &&
        entry.due_date &&
        entry.due_date >= hojeFinanceiro &&
        entry.due_date <= limiteProximoVencimento &&
        !['paid', 'cancelled'].includes(entry.status)
    )
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  const totalMensalidadesAtraso = mensalidadesEmAtraso.reduce(
    (total, entry) => total + Number(entry.amount || 0),
    0
  );

  const totalMensalidadesProximas = mensalidadesProximas.reduce(
    (total, entry) => total + Number(entry.amount || 0),
    0
  );


  const campanhasAtrasadas = campanhas.filter(
    (campanha) =>
      campanha.end_date &&
      campanha.end_date < hoje &&
      !['finished', 'cancelled'].includes(campanha.status)
  );

  const campanhasHoje = campanhas.filter(
    (campanha) =>
      (
        campanha.start_date === hoje ||
        campanha.end_date === hoje
      ) &&
      !['finished', 'cancelled'].includes(campanha.status)
  );

  const campanhasEmAndamento = campanhas.filter(
    (campanha) =>
      campanha.status === 'active' &&
      campanha.start_date &&
      campanha.start_date <= hoje &&
      (!campanha.end_date || campanha.end_date >= hoje)
  );

  const proximasCampanhas = campanhas
    .filter(
      (campanha) =>
        campanha.start_date &&
        campanha.start_date > hoje &&
        !['finished', 'cancelled'].includes(campanha.status)
    )
    .sort((a, b) =>
      (a.start_date || '').localeCompare(b.start_date || '')
    )
    .slice(0, 5);

  const prioridadesAtrasadas = [
    ...conteudosAtrasados.map((item) => ({
      chave: `conteudo-${item.id}`,
      tipo: 'Conteúdo',
      titulo: item.title,
      subtitulo: `${clients.find((c) => c.id === item.client_id)?.name || 'Cliente'} • ${rotuloConteudo(item.content_type)}`,
      data: item.scheduled_date || '',
      acao: () => abrirConteudoPrioritario(item),
    })),
    ...campanhasAtrasadas.map((item) => ({
      chave: `campanha-${item.id}`,
      tipo: 'Campanha',
      titulo: item.name,
      subtitulo: `${clients.find((c) => c.id === item.client_id)?.name || 'Cliente'} • ${item.platform || 'Campanha'}`,
      data: item.end_date || '',
      acao: () => {
        setFiltroClienteCampanha(String(item.client_id));
        setFiltroStatusCampanha('');
        setTela('campanhas');
      },
    })),
  ].sort((a, b) => a.data.localeCompare(b.data));

  const prioridadesHoje = [
    ...conteudosHoje.map((item) => ({
      chave: `conteudo-${item.id}`,
      tipo: 'Conteúdo',
      titulo: item.title,
      subtitulo: `${clients.find((c) => c.id === item.client_id)?.name || 'Cliente'} • ${rotuloConteudo(item.content_type)}`,
      hora: item.scheduled_time?.slice(0, 5) || '',
      acao: () => abrirConteudoPrioritario(item),
    })),
    ...campanhasHoje.map((item) => ({
      chave: `campanha-${item.id}`,
      tipo: 'Campanha',
      titulo: item.name,
      subtitulo: `${clients.find((c) => c.id === item.client_id)?.name || 'Cliente'} • ${
        item.start_date === hoje && item.end_date === hoje
          ? 'Início e término hoje'
          : item.start_date === hoje
          ? 'Início hoje'
          : 'Término hoje'
      }`,
      hora: '',
      acao: () => {
        setFiltroClienteCampanha(String(item.client_id));
        setFiltroStatusCampanha('');
        setTela('campanhas');
      },
    })),
  ];

  const prioridadesEmAprovacaoOuAndamento = [
    ...conteudosAprovacao.map((item) => ({
      chave: `conteudo-${item.id}`,
      tipo: 'Conteúdo',
      titulo: item.title,
      subtitulo: `${clients.find((c) => c.id === item.client_id)?.name || 'Cliente'} • Em aprovação`,
      acao: () => abrirConteudoPrioritario(item),
    })),
    ...campanhasEmAndamento.map((item) => ({
      chave: `campanha-${item.id}`,
      tipo: 'Campanha',
      titulo: item.name,
      subtitulo: `${clients.find((c) => c.id === item.client_id)?.name || 'Cliente'} • Em andamento`,
      acao: () => {
        setFiltroClienteCampanha(String(item.client_id));
        setFiltroStatusCampanha('active');
        setTela('campanhas');
      },
    })),
  ];

  const prioridadesProximas = [
    ...proximosConteudos.map((item) => ({
      chave: `conteudo-${item.id}`,
      tipo: 'Conteúdo',
      titulo: item.title,
      subtitulo: `${clients.find((c) => c.id === item.client_id)?.name || 'Cliente'} • ${rotuloConteudo(item.content_type)}`,
      data: item.scheduled_date || '',
      acao: () => abrirConteudoPrioritario(item),
    })),
    ...proximasCampanhas.map((item) => ({
      chave: `campanha-${item.id}`,
      tipo: 'Campanha',
      titulo: item.name,
      subtitulo: `${clients.find((c) => c.id === item.client_id)?.name || 'Cliente'} • Campanha`,
      data: item.start_date || '',
      acao: () => {
        setFiltroClienteCampanha(String(item.client_id));
        setFiltroStatusCampanha('');
        setTela('campanhas');
      },
    })),
  ]
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 6);

  function abrirConteudosDoDia() {
    setFiltroDataConteudo(hoje);
    setFiltroStatusConteudo('');
    setFiltroClienteConteudo('');
    setTela('conteudo');
  }

  function abrirConteudoPrioritario(item: ContentItem) {
    editarConteudo(item);
    setTela('conteudo');
  }

  function novoCliente() {
    setClienteEditandoId(null);
    setClienteForm(clienteVazio);
    setMostrarFormularioCliente(true);
    setErro('');
    setSucesso('');
  }

  function editarCliente(client: Client) {
    setClienteEditandoId(client.id);
    setClienteForm({
      name: client.name ?? '',
      legal_name: client.legal_name ?? '',
      document: client.document ?? '',
      contact_name: client.contact_name ?? '',
      whatsapp: client.whatsapp ?? '',
      email: client.email ?? '',
      address: client.address ?? '',
      monthly_fee: String(client.monthly_fee ?? ''),
      billing_day: client.billing_day ? String(client.billing_day) : '',
      start_date: client.start_date ?? '',
      end_date: client.end_date ?? '',
      status: client.status,
      notes: client.notes ?? '',
    });
    setMostrarFormularioCliente(true);
    setErro('');
    setSucesso('');
  }

  async function salvarCliente(event: FormEvent) {
    event.preventDefault();
    setErro('');
    setSucesso('');

    if (!clienteForm.name.trim()) {
      setErro('Informe o nome do cliente.');
      return;
    }

    setSaving(true);

    const payload = {
      name: clienteForm.name.trim(),
      legal_name: clienteForm.legal_name.trim() || null,
      document: clienteForm.document.trim() || null,
      contact_name: clienteForm.contact_name.trim() || null,
      whatsapp: clienteForm.whatsapp.trim() || null,
      email: clienteForm.email.trim() || null,
      address: clienteForm.address.trim() || null,
      monthly_fee: Number(clienteForm.monthly_fee || 0),
      billing_day: clienteForm.billing_day ? Number(clienteForm.billing_day) : null,
      start_date: clienteForm.start_date || null,
      end_date: clienteForm.end_date || null,
      status: clienteForm.status,
      notes: clienteForm.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let error;
    let clienteSalvoId: number | null = clienteEditandoId;

    if (clienteEditandoId) {
      ({ error } = await supabase.from('Clients').update(payload).eq('id', clienteEditandoId));
    } else {
      // Ao cadastrar, trazemos o ID do registro criado para abrir imediatamente
      // a etapa de redes sociais e orientações, sem voltar à lista de clientes.
      const resultado = await supabase.from('Clients').insert(payload).select('id').single();
      error = resultado.error;
      clienteSalvoId = resultado.data?.id ?? null;
    }

    setSaving(false);

    if (error) {
      console.error(error);
      setErro(mensagemErroBanco(error.message));
      return;
    }

    setSucesso(
      clienteEditandoId
        ? 'Cliente atualizado com sucesso.'
        : 'Cliente cadastrado! Continue abaixo adicionando as redes sociais e as orientações da marca.'
    );
    setMostrarFormularioCliente(false);
    setClienteEditandoId(null);
    setClienteForm(clienteVazio);
    await carregarClientes();
    if (clienteSalvoId !== null) {
      setClienteAbertoId(clienteSalvoId);
    }
  }

  async function alterarStatusCliente(client: Client) {
    const proximo: Client['status'] =
      client.status === 'active' ? 'paused' : client.status === 'paused' ? 'closed' : 'active';

    const { error } = await supabase
      .from('Clients')
      .update({ status: proximo, updated_at: new Date().toISOString() })
      .eq('id', client.id);

    if (error) {
      setErro(mensagemErroBanco(error.message));
      return;
    }

    await carregarClientes();
  }

  async function salvarConta(event: FormEvent) {
    event.preventDefault();
    if (!clienteAbertoId) return;

    if (!novaConta.platform.trim()) {
      setErro('Informe a plataforma.');
      return;
    }

    setSaving(true);
    setErro('');

    const { error } = await supabase.from('ClientAccounts').insert({
      client_id: clienteAbertoId,
      platform: novaConta.platform,
      account_name: novaConta.account_name.trim() || null,
      username: novaConta.username.trim() || null,
      profile_url: novaConta.profile_url.trim() || null,
      account_id: novaConta.account_id.trim() || null,
      business_manager_id: novaConta.business_manager_id.trim() || null,
      notes: novaConta.notes.trim() || null,
      active: true,
    });

    setSaving(false);

    if (error) {
      setErro(mensagemErroBanco(error.message));
      return;
    }

    setNovaConta({
      platform: 'Instagram',
      account_name: '',
      username: '',
      profile_url: '',
      account_id: '',
      business_manager_id: '',
      notes: '',
    });

    setSucesso('Conta gerenciada adicionada.');
    await carregarClientes();
  }

  async function excluirConta(id: number) {
    if (!window.confirm('Excluir esta conta gerenciada?')) return;
    const { error } = await supabase.from('ClientAccounts').delete().eq('id', id);

    if (error) {
      setErro(mensagemErroBanco(error.message));
      return;
    }

    await carregarClientes();
  }

  async function salvarGuidelines(event: FormEvent) {
    event.preventDefault();
    if (!clienteAbertoId) return;

    setSaving(true);
    setErro('');

    const payload = {
      client_id: clienteAbertoId,
      target_audience: guidelineDraft.target_audience.trim() || null,
      tone_of_voice: guidelineDraft.tone_of_voice.trim() || null,
      preferred_words: guidelineDraft.preferred_words.trim() || null,
      avoided_words: guidelineDraft.avoided_words.trim() || null,
      visual_guidelines: guidelineDraft.visual_guidelines.trim() || null,
      content_guidelines: guidelineDraft.content_guidelines.trim() || null,
      general_notes: guidelineDraft.general_notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let error;

    if (guidelineCliente) {
      ({ error } = await supabase
        .from('ClientGuidelines')
        .update(payload)
        .eq('client_id', clienteAbertoId));
    } else {
      ({ error } = await supabase.from('ClientGuidelines').insert(payload));
    }

    setSaving(false);

    if (error) {
      setErro(mensagemErroBanco(error.message));
      return;
    }

    setSucesso('Orientações da marca salvas.');
    await carregarClientes();
  }

  function nomeArquivoSeguro(nome: string) {
    return nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  async function salvarAsset(event: FormEvent) {
    event.preventDefault();
    if (!clienteAbertoId) {
      window.alert('Abra a ficha de um cliente antes de adicionar o material.');
      return;
    }

    const tituloAutomatico =
      novoAsset.title.trim() ||
      (arquivoAsset
        ? arquivoAsset.name.replace(/\.[^/.]+$/, '').trim()
        : '');

    if (!tituloAutomatico) {
      const mensagem = 'Informe um título ou selecione um arquivo.';
      setErro(mensagem);
      window.alert(mensagem);
      return;
    }

    setSavingAsset(true);
    setUploadingAsset(Boolean(arquivoAsset));
    setErro('');
    setSucesso('');

    let caminhoArquivo: string | null = null;

    try {
      if (arquivoAsset) {
        const nomeSeguro = nomeArquivoSeguro(arquivoAsset.name) || 'arquivo';
        caminhoArquivo =
          `${clienteAbertoId}/${novoAsset.asset_type}/` +
          `${Date.now()}-${nomeSeguro}`;

        const { error: uploadError } = await supabase.storage
          .from('client-assets')
          .upload(caminhoArquivo, arquivoAsset, {
            cacheControl: '3600',
            upsert: false,
            contentType: arquivoAsset.type || undefined,
          });

        if (uploadError) {
          throw new Error(`Erro no envio do arquivo: ${uploadError.message}`);
        }
      }

      const { error: cadastroError } = await supabase
        .from('ClientBrandAssets')
        .insert({
          client_id: clienteAbertoId,
          asset_type: novoAsset.asset_type,
          title: tituloAutomatico,
          text_value: novoAsset.text_value.trim() || null,
          notes: novoAsset.notes.trim() || null,
          file_url: caminhoArquivo,
        });

      if (cadastroError) {
        if (caminhoArquivo) {
          await supabase.storage.from('client-assets').remove([caminhoArquivo]);
        }
        throw new Error(`Erro ao registrar o material: ${cadastroError.message}`);
      }

      setNovoAsset({
        asset_type: 'palette',
        title: '',
        text_value: '',
        notes: '',
      });
      setArquivoAsset(null);

      const fileInput = document.getElementById(
        'asset-file-input'
      ) as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';

      const mensagem = caminhoArquivo
        ? 'Arquivo enviado e material adicionado com sucesso.'
        : 'Material adicionado com sucesso.';

      setSucesso(mensagem);
      await carregarClientes();
    } catch (error: any) {
      console.error('Erro ao adicionar material:', error);
      const mensagem =
        error?.message || 'Não foi possível adicionar o material.';
      setErro(mensagem);
      window.alert(mensagem);
    } finally {
      setSavingAsset(false);
      setUploadingAsset(false);
    }
  }

  async function excluirAsset(asset: ClientBrandAsset) {
    if (!window.confirm('Excluir este material?')) return;

    setErro('');

    if (asset.file_url) {
      const { error: storageError } = await supabase.storage
        .from('client-assets')
        .remove([asset.file_url]);

      if (storageError) {
        console.error(storageError);
        setErro('Não foi possível excluir o arquivo do Storage.');
        return;
      }
    }

    const { error } = await supabase
      .from('ClientBrandAssets')
      .delete()
      .eq('id', asset.id);

    if (error) {
      setErro(mensagemErroBanco(error.message));
      return;
    }

    setSucesso('Material excluído.');
    await carregarClientes();
  }

  if (!autenticacaoPronta) {
    return <div className="auth-page"><p className="auth-progress">Verificando sua sessão...</p></div>;
  }

  if (!sessao) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <img className="auth-logo" src="/agencia-premium-logo.jpg" alt="Agência Premium" />
          <p className="auth-eyebrow">ÁREA RESTRITA</p>
          <h1>Acessar Agência Premium</h1>
          <p className="auth-description">Entre com seu e-mail e senha para acessar a agenda e os dados da agência.</p>
          <form onSubmit={entrarNaAgencia} className="auth-form">
            <label htmlFor="auth-email">E-mail</label>
            <input id="auth-email" type="email" autoComplete="username" required
              value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)}
              placeholder="seuemail@exemplo.com" />
            <label htmlFor="auth-password">Senha</label>
            <input id="auth-password" type="password" autoComplete="current-password" required
              value={senhaLogin} onChange={(e) => setSenhaLogin(e.target.value)}
              placeholder="Sua senha" />
            {erroLogin && <p className="auth-error" role="alert">{erroLogin}</p>}
            <button className="gold-button auth-submit" type="submit" disabled={entrando}>
              {entrando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <p className="auth-tip">Seu acesso deve ser criado e autorizado no Supabase. Não é necessário fazer login a cada visita neste dispositivo.</p>
        </section>
      </main>
    );
  }

  if (!permissaoVerificada) {
    return <div className="auth-page"><p className="auth-progress">Conferindo sua autorização...</p></div>;
  }

  if (!administradorAutorizado) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <img className="auth-logo" src="/agencia-premium-logo.jpg" alt="Agência Premium" />
          <h1>Acesso ainda não autorizado</h1>
          <p className="auth-description">A conta {sessao.user.email ?? ''} foi identificada, mas não está na lista de administradores da Agência Premium.</p>
          <p className="auth-description">Verifique a etapa de autorização no Supabase.</p>
          {erroLogin && <p className="auth-error" role="alert">{erroLogin}</p>}
          <button type="button" className="gold-button auth-submit" onClick={sairDaAgencia}>Sair da conta</button>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src="/agencia-premium-logo.jpg" alt="Agência Premium" />
        </div>

        <nav className="menu-nav" aria-label="Navegação principal">
          {menu.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`${tela === item.id ? 'active' : ''} ${item.id === 'campanhas' || item.id === 'financeiro' ? 'mobile-overflow-item' : ''}`.trim()}
              aria-current={tela === item.id ? 'page' : undefined}
              onClick={() => {
                setMenuMobileAberto(false);
                setTela(item.id);
                window.scrollTo(0, 0);
              }}
            >
              <span className="menu-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <button
            type="button"
            className={`mobile-more-button ${menuMobileAberto || tela === 'campanhas' || tela === 'financeiro' ? 'active' : ''}`}
            onClick={() => setMenuMobileAberto((aberto) => !aberto)}
            aria-expanded={menuMobileAberto}
            aria-controls="mobile-extra-menu"
            aria-label="Mais opções de navegação"
          >
            <span className="menu-icon" aria-hidden="true">•••</span>
            <span>Mais</span>
          </button>
        </nav>

        {menuMobileAberto && (
          <>
            <div className="mobile-more-sheet" id="mobile-extra-menu" role="dialog" aria-label="Mais opções">
              <div className="mobile-more-header">
                <strong>Mais opções</strong>
                <button type="button" aria-label="Fechar opções" onClick={() => setMenuMobileAberto(false)}>×</button>
              </div>
              {menu.filter((item) => item.id === 'campanhas' || item.id === 'financeiro').map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`mobile-more-option ${tela === item.id ? 'active' : ''}`}
                  onClick={() => {
                    setTela(item.id);
                    setMenuMobileAberto(false);
                    window.scrollTo(0, 0);
                  }}
                >
                  <span className="mobile-more-option-icon" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                  <span aria-hidden="true">›</span>
                </button>
              ))}
              <button type="button" className="mobile-more-option mobile-more-logout" onClick={() => {
                setMenuMobileAberto(false);
                void sairDaAgencia();
              }}>
                <span className="mobile-more-option-icon" aria-hidden="true">↪</span>
                <span>Sair da conta</span>
                <span aria-hidden="true">›</span>
              </button>
            </div>
          </>
        )}

        <div className="sidebar-footer">
          <small>ESTRATÉGIA • CRIATIVIDADE • RESULTADOS</small>
          <button className="auth-logout" type="button" onClick={sairDaAgencia}>Sair da conta</button>
        </div>
      </aside>

      {menuMobileAberto && (
        <button
          className="mobile-more-backdrop"
          type="button"
          aria-label="Fechar menu Mais"
          onClick={() => setMenuMobileAberto(false)}
        />
      )}

      <main className="main">
        <header className={`topbar ${tela === 'dashboard' ? 'dashboard-topbar' : ''}`}>
          <div className="topbar-title-wrap">
            {tela === 'dashboard' && (
              <div className="dashboard-logo-box">
                <img
                  src="/agencia-premium-logo.jpg"
                  alt="Agência Premium"
                  className="dashboard-logo"
                />
              </div>
            )}

            <div>
              <p className="eyebrow">AGÊNCIA PREMIUM</p>
              <h1 className={tela === 'dashboard' ? 'dashboard-title' : ''}>
                {titulo}
              </h1>
              {tela === 'dashboard' && (
                <p className="dashboard-subtitle">
                  Gestão, prioridades e resultados da sua agência.
                </p>
              )}
            </div>
          </div>

          {tela === 'clientes' ? (
            <button className="gold-button" onClick={novoCliente}>
              + Novo cliente
            </button>
          ) : tela === 'conteudo' ? (
            <button className="gold-button" onClick={novoConteudo}>
              + Novo conteúdo
            </button>
          ) : tela === 'campanhas' ? (
            <button className="gold-button" onClick={novaCampanha}>
              + Nova campanha
            </button>
          ) : tela === 'financeiro' ? (
            <button className="gold-button" onClick={novoLancamentoFinanceiro}>
              + Novo lançamento
            </button>
          ) : tela === 'tarefas' ? (
            <button className="gold-button" onClick={novaTarefa}>
              + Nova tarefa
            </button>
          ) : tela === 'dashboard' ? (
            <button
              className="gold-button"
              onClick={abrirFormularioCompromisso}
            >
              + Compromisso
            </button>
          ) : (
            <button className="gold-button">+ Novo</button>
          )}
        </header>

        {erro && <div className="msg erro">{erro}</div>}
        {sucesso && <div className="msg sucesso">{sucesso}</div>}

        {tela === 'dashboard' && (
          <>
            <section className="metrics dashboard-metrics">
              <Card
                titulo="Conteúdos hoje"
                valor={String(conteudosHoje.length)}
                detalhe="Clique para ver os conteúdos do dia"
                onClick={abrirConteudosDoDia}
              />
              <Card
                titulo="Em aprovação"
                valor={String(conteudos.filter((c) => c.status === 'approval').length)}
                detalhe="Aguardando cliente"
              />
              <Card
                titulo="Campanhas ativas"
                valor={String(campanhas.filter((c) => c.status === 'active').length)}
                detalhe="Monitoramento de mídia"
                onClick={() => {
                  setFiltroStatusCampanha('active');
                  setFiltroClienteCampanha('');
                  setTela('campanhas');
                }}
              />
              <Card
                titulo="Tarefas pendentes"
                valor={String(tarefasPendentes.length)}
                detalhe={`${tarefasAtrasadas.length} atrasada(s) • ${tarefasHoje.length} para hoje`}
                onClick={() => setTela('tarefas')}
              />

            </section>

            <section className="dashboard-agenda">
              <div className="agenda-calendar">
                <div className="agenda-calendar-header">
                  <button onClick={() => mudarMesAgenda(-1)}>‹</button>
                  <div>
                    <span>Agenda</span>
                    <strong>
                      {agendaMes.toLocaleDateString('pt-BR', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </strong>
                  </div>
                  <button onClick={() => mudarMesAgenda(1)}>›</button>
                </div>

                <div className="agenda-weekdays">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
                    <span key={dia}>{dia}</span>
                  ))}
                </div>

                <div className="agenda-days">
                  {diasDoMesAgenda().map((dia, index) => {
                    if (!dia) {
                      return <span key={`vazio-${index}`} className="agenda-day empty-day" />;
                    }

                    const data = `${agendaMes.getFullYear()}-${String(
                      agendaMes.getMonth() + 1
                    ).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

                    const selecionado = data === agendaDataSelecionada;
                    const hojeAgenda = data === dataLocalHoje();
                    const temItens = diasComItens.has(data);

                    return (
                      <button
                        key={data}
                        className={`agenda-day${selecionado ? ' selected' : ''}${
                          hojeAgenda ? ' today' : ''
                        }${temItens ? ' has-items' : ''}`}
                        onClick={() => selecionarDiaAgenda(dia)}
                      >
                        <span>{dia}</span>
                        {temItens && <i />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="agenda-day-panel">
                <div className="agenda-day-header">
                  <div>
                    <p className="eyebrow">AGENDA DO DIA</p>
                    <h3>{dataBR(agendaDataSelecionada)}</h3>
                  </div>
                  <button
                    className="ghost-button"
                    onClick={abrirFormularioCompromisso}
                  >
                    + Compromisso
                  </button>
                </div>

                {mostrarFormCompromisso && (
                  <div
                    className="agenda-modal-backdrop"
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget && !saving) {
                        setMostrarFormCompromisso(false);
                      }
                    }}
                  >
                    <section
                      className="agenda-modal-card"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="agenda-modal-title"
                      onKeyDown={(event) => {
                        if (event.key === 'Escape' && !saving) {
                          setMostrarFormCompromisso(false);
                        }
                      }}
                    >
                      <div className="agenda-modal-header">
                        <div>
                          <p className="eyebrow">AGÊNCIA PREMIUM · AGENDA</p>
                          <h2 id="agenda-modal-title">Novo compromisso</h2>
                          <p>Preencha os dados para adicionar à agenda.</p>
                        </div>
                        <button
                          className="agenda-modal-close"
                          type="button"
                          aria-label="Fechar formulário de compromisso"
                          disabled={saving}
                          onClick={() => setMostrarFormCompromisso(false)}
                        >
                          ×
                        </button>
                      </div>
                      <form className="agenda-event-form agenda-modal-form" onSubmit={salvarCompromisso}>
                        <label htmlFor="agenda-novo-cliente">
                          Cliente
                          <select
                            id="agenda-novo-cliente"
                            value={compromissoForm.client_id}
                            onChange={(e) =>
                              setCompromissoForm({ ...compromissoForm, client_id: e.target.value })
                            }
                          >
                            <option value="">Sem cliente</option>
                            {clients.map((client) => (
                              <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                          </select>
                        </label>
                        <label htmlFor="agenda-novo-titulo">
                          Compromisso
                          <input
                            id="agenda-novo-titulo"
                            placeholder="Digite o compromisso"
                            required
                            autoFocus
                            value={compromissoForm.title}
                            onChange={(e) =>
                              setCompromissoForm({ ...compromissoForm, title: e.target.value })
                            }
                          />
                        </label>
                        <label htmlFor="agenda-novo-data">
                          Data
                          <input
                            id="agenda-novo-data"
                            type="date"
                            required
                            value={compromissoForm.event_date}
                            onChange={(e) =>
                              setCompromissoForm({ ...compromissoForm, event_date: e.target.value })
                            }
                          />
                        </label>
                        <label htmlFor="agenda-novo-hora">
                          Horário (opcional)
                          <input
                            id="agenda-novo-hora"
                            type="time"
                            value={compromissoForm.event_time}
                            onChange={(e) =>
                              setCompromissoForm({ ...compromissoForm, event_time: e.target.value })
                            }
                          />
                        </label>
                        <label htmlFor="agenda-novo-notas" className="agenda-modal-full">
                          Observações (opcional)
                          <textarea
                            id="agenda-novo-notas"
                            placeholder="Informações adicionais"
                            rows={3}
                            value={compromissoForm.notes}
                            onChange={(e) =>
                              setCompromissoForm({ ...compromissoForm, notes: e.target.value })
                            }
                          />
                        </label>
                        {erro && <p className="agenda-modal-error" role="alert">{erro}</p>}
                        <div className="agenda-form-actions agenda-modal-full">
                          <button
                            type="button"
                            className="ghost-button"
                            disabled={saving}
                            onClick={() => setMostrarFormCompromisso(false)}
                          >
                            Cancelar
                          </button>
                          <button className="gold-button" type="submit" disabled={saving}>
                            {saving ? 'Salvando...' : 'Salvar compromisso'}
                          </button>
                        </div>
                      </form>
                    </section>
                  </div>
                )}

                <div className="agenda-day-list">
                  {agendaItensDia.map((item, index) => (
                    <div key={`${item.tipo}-${item.titulo}-${index}`} className="agenda-list-item">
                      <span className={`agenda-type ${item.tipo.toLowerCase().replaceAll(' ', '-')}`}>
                        {item.tipo}
                      </span>
                      <div>
                        <div className="agenda-item-title-row">
                          <strong>
                            {item.hora ? `${item.hora} • ` : ''}
                            {item.titulo}
                          </strong>
                          {item.statusTexto && (
                            <span className={`agenda-status ${item.statusClasse || 'neutral'}`}>
                              {item.statusTexto}
                            </span>
                          )}
                        </div>
                        <small>{item.subtitulo}</small>
                      </div>
                    </div>
                  ))}

                  {agendaItensDia.length === 0 && (
                    <div className="agenda-empty">
                      Nenhum compromisso, campanha, conteúdo, financeiro ou tarefa nesta data.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="priority-board">
              <article className={`priority-column overdue ${prioridadesAtrasadas.length ? 'has-items' : ''}`}>
                <div className="priority-title">
                  <span>Atrasados</span>
                  <strong>{prioridadesAtrasadas.length}</strong>
                </div>

                <div className="priority-list">
                  {prioridadesAtrasadas.slice(0, 6).map((item) => (
                    <button
                      key={item.chave}
                      className="priority-item"
                      onClick={item.acao}
                    >
                      <span className="priority-date">
                        {item.data ? dataBR(item.data) : item.tipo}
                      </span>
                      <strong>{item.titulo}</strong>
                      <small>{item.tipo} • {item.subtitulo}</small>
                    </button>
                  ))}

                  {prioridadesAtrasadas.length === 0 && (
                    <p className="priority-empty">
                      Nenhum conteúdo ou campanha atrasado.
                    </p>
                  )}
                </div>
              </article>

              <article className={`priority-column today ${prioridadesHoje.length ? 'has-items' : ''}`}>
                <div className="priority-title">
                  <span>A fazer hoje</span>
                  <strong>{prioridadesHoje.length}</strong>
                </div>

                <div className="priority-list">
                  {prioridadesHoje.slice(0, 6).map((item) => (
                    <button
                      key={item.chave}
                      className="priority-item"
                      onClick={item.acao}
                    >
                      <span className="priority-date">
                        {item.hora || item.tipo}
                      </span>
                      <strong>{item.titulo}</strong>
                      <small>{item.tipo} • {item.subtitulo}</small>
                    </button>
                  ))}

                  {prioridadesHoje.length === 0 && (
                    <p className="priority-empty">
                      Nenhum conteúdo ou campanha para hoje.
                    </p>
                  )}
                </div>
              </article>

              <article className={`priority-column approval ${prioridadesEmAprovacaoOuAndamento.length ? 'has-items' : ''}`}>
                <div className="priority-title">
                  <span>Em aprovação / andamento</span>
                  <strong>{prioridadesEmAprovacaoOuAndamento.length}</strong>
                </div>

                <div className="priority-list">
                  {prioridadesEmAprovacaoOuAndamento.slice(0, 6).map((item) => (
                    <button
                      key={item.chave}
                      className="priority-item"
                      onClick={item.acao}
                    >
                      <span className="priority-date">{item.tipo}</span>
                      <strong>{item.titulo}</strong>
                      <small>{item.tipo} • {item.subtitulo}</small>
                    </button>
                  ))}

                  {prioridadesEmAprovacaoOuAndamento.length === 0 && (
                    <p className="priority-empty">
                      Nenhum conteúdo em aprovação ou campanha em andamento.
                    </p>
                  )}
                </div>
              </article>

              <article className={`priority-column upcoming ${prioridadesProximas.length ? 'has-items' : ''}`}>
                <div className="priority-title">
                  <span>Próximos</span>
                  <strong>{prioridadesProximas.length}</strong>
                </div>

                <div className="priority-list">
                  {prioridadesProximas.map((item) => (
                    <button
                      key={item.chave}
                      className="priority-item"
                      onClick={item.acao}
                    >
                      <span className="priority-date">
                        {item.data ? dataBR(item.data) : item.tipo}
                      </span>
                      <strong>{item.titulo}</strong>
                      <small>{item.tipo} • {item.subtitulo}</small>
                    </button>
                  ))}

                  {prioridadesProximas.length === 0 && (
                    <p className="priority-empty">
                      Nenhum conteúdo ou campanha próximo.
                    </p>
                  )}
                </div>
              </article>
            </section>

            <section className="grid-2 dashboard-finance-grid">
              <article className="panel finance-alert-panel overdue-panel">
                <div className="panel-title">
                  <h3>Mensalidades em atraso</h3>
                  <span>{mensalidadesEmAtraso.length} pendência(s)</span>
                </div>

                <div className="mini-list">
                  {mensalidadesEmAtraso.slice(0, 6).map((entry) => {
                    const client = clients.find((c) => c.id === entry.client_id);
                    return (
                      <div key={entry.id} className="mini-row finance-row">
                        <div>
                          <strong>{client?.name || entry.description}</strong>
                          <small>Venceu em {dataBR(entry.due_date)}</small>
                        </div>
                        <span>{moeda(Number(entry.amount || 0))}</span>
                      </div>
                    );
                  })}

                  {mensalidadesEmAtraso.length === 0 && (
                    <div className="finance-empty">
                      <strong>Nenhuma mensalidade em atraso.</strong>
                    </div>
                  )}
                </div>
              </article>

              <article className="panel finance-alert-panel upcoming-panel">
                <div className="panel-title">
                  <h3>Próximas do vencimento</h3>
                  <span>Próximos 7 dias</span>
                </div>

                <div className="mini-list">
                  {mensalidadesProximas.slice(0, 6).map((entry) => {
                    const client = clients.find((c) => c.id === entry.client_id);
                    return (
                      <div key={entry.id} className="mini-row finance-row">
                        <div>
                          <strong>{client?.name || entry.description}</strong>
                          <small>Vence em {dataBR(entry.due_date)}</small>
                        </div>
                        <span>{moeda(Number(entry.amount || 0))}</span>
                      </div>
                    );
                  })}

                  {mensalidadesProximas.length === 0 && (
                    <div className="finance-empty">
                      <strong>Nenhuma mensalidade vencendo nos próximos 7 dias.</strong>
                    </div>
                  )}
                </div>
              </article>

              <article className="panel finance-alert-panel payable-panel">
                <div className="panel-title">
                  <h3>Contas a pagar esta semana</h3>
                  <span>{moeda(totalContasAPagarSemana)}</span>
                </div>

                <div className="mini-list">
                  {contasAPagarSemana.slice(0, 6).map((entry) => (
                    <div key={entry.id} className="mini-row finance-row">
                      <div>
                        <strong>{entry.description}</strong>
                        <small>Vence em {dataBR(entry.due_date)}</small>
                      </div>
                      <span>{moeda(Number(entry.amount || 0))}</span>
                    </div>
                  ))}

                  {contasAPagarSemana.length === 0 && (
                    <div className="finance-empty">
                      <strong>Nenhuma conta a pagar nos próximos 7 dias.</strong>
                    </div>
                  )}
                </div>
              </article>
            </section>
          </>
        )}

        {tela === 'clientes' && (
          <section className="clientes-area">
            <div className="toolbar">
              <input
                type="search"
                placeholder="Buscar cliente, responsável, WhatsApp ou e-mail..."
                value={buscaCliente}
                onChange={(event) => setBuscaCliente(event.target.value)}
              />
              <span>{clientesFiltrados.length} cliente(s)</span>
            </div>

            {mostrarFormularioCliente && (
              <form className="panel form-grid" onSubmit={salvarCliente}>
                <div className="section-title full">
                  <h3>{clienteEditandoId ? 'Editar cliente' : 'Novo cliente'}</h3>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setMostrarFormularioCliente(false)}
                  >
                    Fechar
                  </button>
                </div>

                <label>
                  Nome / Marca *
                  <input
                    value={clienteForm.name}
                    onChange={(e) => setClienteForm({ ...clienteForm, name: e.target.value })}
                    required
                  />
                </label>

                <label>
                  Razão social
                  <input
                    value={clienteForm.legal_name}
                    onChange={(e) => setClienteForm({ ...clienteForm, legal_name: e.target.value })}
                  />
                </label>

                <label>
                  CPF / CNPJ
                  <input
                    value={clienteForm.document}
                    onChange={(e) => setClienteForm({ ...clienteForm, document: e.target.value })}
                  />
                </label>

                <label>
                  Responsável
                  <input
                    value={clienteForm.contact_name}
                    onChange={(e) => setClienteForm({ ...clienteForm, contact_name: e.target.value })}
                  />
                </label>

                <label>
                  WhatsApp
                  <input
                    value={clienteForm.whatsapp}
                    onChange={(e) => setClienteForm({ ...clienteForm, whatsapp: e.target.value })}
                  />
                </label>

                <label>
                  E-mail
                  <input
                    type="email"
                    value={clienteForm.email}
                    onChange={(e) => setClienteForm({ ...clienteForm, email: e.target.value })}
                  />
                </label>

                <label className="full">
                  Endereço
                  <input
                    value={clienteForm.address}
                    onChange={(e) => setClienteForm({ ...clienteForm, address: e.target.value })}
                  />
                </label>

                <label>
                  Mensalidade
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={clienteForm.monthly_fee}
                    onChange={(e) => setClienteForm({ ...clienteForm, monthly_fee: e.target.value })}
                  />
                </label>

                <label>
                  Dia do vencimento
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={clienteForm.billing_day}
                    onChange={(e) => setClienteForm({ ...clienteForm, billing_day: e.target.value })}
                  />
                </label>

                <label>
                  Data de início
                  <input
                    type="date"
                    value={clienteForm.start_date}
                    onChange={(e) => setClienteForm({ ...clienteForm, start_date: e.target.value })}
                  />
                </label>

                <label>
                  Data de encerramento
                  <input
                    type="date"
                    value={clienteForm.end_date}
                    onChange={(e) => setClienteForm({ ...clienteForm, end_date: e.target.value })}
                  />
                </label>

                <label>
                  Status
                  <select
                    value={clienteForm.status}
                    onChange={(e) =>
                      setClienteForm({
                        ...clienteForm,
                        status: e.target.value as Client['status'],
                      })
                    }
                  >
                    <option value="active">Ativo</option>
                    <option value="paused">Pausado</option>
                    <option value="closed">Encerrado</option>
                  </select>
                </label>

                <label className="full">
                  Observações
                  <textarea
                    rows={4}
                    value={clienteForm.notes}
                    onChange={(e) => setClienteForm({ ...clienteForm, notes: e.target.value })}
                  />
                </label>

                <div className="full form-actions">
                  <button className="gold-button" type="submit" disabled={saving}>
                    {saving ? 'Salvando...' : clienteEditandoId ? 'Salvar alterações' : 'Salvar e continuar'}
                  </button>
                </div>
              </form>
            )}

            {loadingClients ? (
              <div className="panel">Carregando clientes...</div>
            ) : (
              <div className="clients-grid">
                {clientesFiltrados.map((client) => {
                  const qtdContas = accounts.filter((a) => a.client_id === client.id).length;

                  return (
                    <article key={client.id} className="client-card">
                      <div className="client-card-top">
                        <div>
                          <span className={`status-pill ${client.status}`}>
                            {client.status === 'active'
                              ? 'Ativo'
                              : client.status === 'paused'
                              ? 'Pausado'
                              : 'Encerrado'}
                          </span>
                          <h3>{client.name}</h3>
                          <p>{client.contact_name || 'Sem responsável informado'}</p>
                        </div>
                        <strong>{moeda(Number(client.monthly_fee || 0))}</strong>
                      </div>

                      <div className="client-data">
                        <span>📱 {client.whatsapp || '—'}</span>
                        <span>✉️ {client.email || '—'}</span>
                        <span>📆 Vencimento: {client.billing_day ? `dia ${client.billing_day}` : '—'}</span>
                        <span>🔗 {qtdContas} conta(s) gerenciada(s)</span>
                      </div>

                      <div className="client-actions">
                        <button onClick={() => setClienteAbertoId(client.id)}>Abrir ficha</button>
                        <button onClick={() => editarCliente(client)}>Editar</button>
                        <button onClick={() => alterarStatusCliente(client)}>Mudar status</button>
                        <button className="danger-button" onClick={() => excluirCliente(client)}>
                          Excluir
                        </button>
                      </div>
                    </article>
                  );
                })}

                {clientesFiltrados.length === 0 && (
                  <div className="panel empty-state">
                    <strong>Nenhum cliente encontrado.</strong>
                    <p>Cadastre o primeiro cliente da Agência Premium.</p>
                  </div>
                )}
              </div>
            )}

            {clienteAberto && (
              <div className="client-detail-overlay">
                <div className="client-detail">
                  <div className="detail-header">
                    <div>
                      <p className="eyebrow">FICHA DO CLIENTE</p>
                      <h2>{clienteAberto.name}</h2>
                      <p>
                        {clienteAberto.contact_name || 'Sem responsável'} •{' '}
                        {clienteAberto.whatsapp || 'Sem WhatsApp'}
                      </p>
                    </div>
                    <button className="ghost-button" onClick={() => setClienteAbertoId(null)}>
                      Fechar
                    </button>
                  </div>

                  {erro && <div className="msg erro">{erro}</div>}
                  {sucesso && <div className="msg sucesso">{sucesso}</div>}

                  <section className="detail-summary">
                    <div>
                      <span>Mensalidade</span>
                      <strong>{moeda(Number(clienteAberto.monthly_fee || 0))}</strong>
                    </div>
                    <div>
                      <span>Vencimento</span>
                      <strong>{clienteAberto.billing_day ? `Dia ${clienteAberto.billing_day}` : '—'}</strong>
                    </div>
                    <div>
                      <span>Início</span>
                      <strong>{dataBR(clienteAberto.start_date)}</strong>
                    </div>
                    <div>
                      <span>Status</span>
                      <strong>
                        {clienteAberto.status === 'active'
                          ? 'Ativo'
                          : clienteAberto.status === 'paused'
                          ? 'Pausado'
                          : 'Encerrado'}
                      </strong>
                    </div>
                  </section>

                  <section className="detail-section">
                    <div className="section-title">
                      <h3>Contas gerenciadas</h3>
                    </div>

                    <div className="accounts-list">
                      {contasCliente.map((conta) => (
                        <div key={conta.id} className="account-row">
                          <div>
                            <strong>{conta.platform}</strong>
                            <span>
                              {conta.username || conta.account_name || 'Sem usuário informado'}
                            </span>
                          </div>
                          <button onClick={() => excluirConta(conta.id)}>Excluir</button>
                        </div>
                      ))}
                      {contasCliente.length === 0 && <p>Nenhuma conta adicionada.</p>}
                    </div>

                    <form className="subform" onSubmit={salvarConta}>
                      <select
                        value={novaConta.platform}
                        onChange={(e) => setNovaConta({ ...novaConta, platform: e.target.value })}
                      >
                        {plataformasPadrao.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>

                      <input
                        placeholder="Nome da conta"
                        value={novaConta.account_name}
                        onChange={(e) => setNovaConta({ ...novaConta, account_name: e.target.value })}
                      />

                      <input
                        placeholder="@usuario"
                        value={novaConta.username}
                        onChange={(e) => setNovaConta({ ...novaConta, username: e.target.value })}
                      />

                      <input
                        placeholder="Link do perfil"
                        value={novaConta.profile_url}
                        onChange={(e) => setNovaConta({ ...novaConta, profile_url: e.target.value })}
                      />

                      <input
                        placeholder="ID da conta"
                        value={novaConta.account_id}
                        onChange={(e) => setNovaConta({ ...novaConta, account_id: e.target.value })}
                      />

                      <input
                        placeholder="Business Manager ID"
                        value={novaConta.business_manager_id}
                        onChange={(e) =>
                          setNovaConta({ ...novaConta, business_manager_id: e.target.value })
                        }
                      />

                      <textarea
                        placeholder="Observações da conta"
                        value={novaConta.notes}
                        onChange={(e) => setNovaConta({ ...novaConta, notes: e.target.value })}
                      />

                      <button className="gold-button" type="submit" disabled={saving}>
                        + Adicionar conta
                      </button>
                    </form>
                  </section>

                  <section className="detail-section">
                    <div className="section-title">
                      <h3>Orientações da marca</h3>
                    </div>

                    <form className="form-grid" onSubmit={salvarGuidelines}>
                      <label>
                        Público-alvo
                        <textarea
                          rows={3}
                          value={guidelineDraft.target_audience}
                          onChange={(e) =>
                            setGuidelineDraft({
                              ...guidelineDraft,
                              target_audience: e.target.value,
                            })
                          }
                        />
                      </label>

                      <label>
                        Tom de voz
                        <textarea
                          rows={3}
                          value={guidelineDraft.tone_of_voice}
                          onChange={(e) =>
                            setGuidelineDraft({
                              ...guidelineDraft,
                              tone_of_voice: e.target.value,
                            })
                          }
                        />
                      </label>

                      <label>
                        Palavras preferidas
                        <textarea
                          rows={3}
                          value={guidelineDraft.preferred_words}
                          onChange={(e) =>
                            setGuidelineDraft({
                              ...guidelineDraft,
                              preferred_words: e.target.value,
                            })
                          }
                        />
                      </label>

                      <label>
                        Palavras a evitar
                        <textarea
                          rows={3}
                          value={guidelineDraft.avoided_words}
                          onChange={(e) =>
                            setGuidelineDraft({
                              ...guidelineDraft,
                              avoided_words: e.target.value,
                            })
                          }
                        />
                      </label>

                      <label className="full">
                        Diretrizes visuais
                        <textarea
                          rows={4}
                          value={guidelineDraft.visual_guidelines}
                          onChange={(e) =>
                            setGuidelineDraft({
                              ...guidelineDraft,
                              visual_guidelines: e.target.value,
                            })
                          }
                        />
                      </label>

                      <label className="full">
                        Diretrizes de conteúdo
                        <textarea
                          rows={4}
                          value={guidelineDraft.content_guidelines}
                          onChange={(e) =>
                            setGuidelineDraft({
                              ...guidelineDraft,
                              content_guidelines: e.target.value,
                            })
                          }
                        />
                      </label>

                      <label className="full">
                        Observações gerais
                        <textarea
                          rows={4}
                          value={guidelineDraft.general_notes}
                          onChange={(e) =>
                            setGuidelineDraft({
                              ...guidelineDraft,
                              general_notes: e.target.value,
                            })
                          }
                        />
                      </label>

                      <div className="full form-actions">
                        <button className="gold-button" type="submit" disabled={saving}>
                          Salvar orientações
                        </button>
                      </div>
                    </form>
                  </section>

                  <section className="detail-section">
                    <div className="section-title">
                      <h3>Identidade visual e materiais</h3>
                    </div>

                    <div className="assets-grid">
                      {assetsCliente.map((asset) => {
                        const url = assetUrls[asset.id];
                        const ehImagem =
                          asset.asset_type === 'logo' ||
                          asset.asset_type === 'photo';

                        return (
                          <div key={asset.id} className="asset-card">
                            {url && ehImagem && (
                              <img
                                className="asset-preview"
                                src={url}
                                alt={asset.title}
                              />
                            )}

                            <span>{rotuloAsset(asset.asset_type)}</span>
                            <strong>{asset.title}</strong>
                            <p>{asset.text_value || asset.notes || 'Sem detalhes'}</p>

                            <div className="asset-actions">
                              {url && (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="asset-link"
                                >
                                  Abrir arquivo
                                </a>
                              )}

                              <button onClick={() => excluirAsset(asset)}>
                                Excluir
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <form className="subform" onSubmit={salvarAsset}>
                      <select
                        value={novoAsset.asset_type}
                        onChange={(e) =>
                          setNovoAsset({
                            ...novoAsset,
                            asset_type: e.target.value as ClientBrandAsset['asset_type'],
                          })
                        }
                      >
                        <option value="logo">Logo</option>
                        <option value="photo">Foto</option>
                        <option value="video">Vídeo</option>
                        <option value="palette">Paleta de cores</option>
                        <option value="font">Fonte</option>
                        <option value="reference">Referência</option>
                        <option value="document">Documento</option>
                        <option value="other">Outro</option>
                      </select>

                      <input
                        placeholder="Título (opcional se escolher um arquivo)"
                        value={novoAsset.title}
                        onChange={(e) => setNovoAsset({ ...novoAsset, title: e.target.value })}
                      />

                      <input
                        placeholder="Valor / cores / fonte / referência"
                        value={novoAsset.text_value}
                        onChange={(e) =>
                          setNovoAsset({ ...novoAsset, text_value: e.target.value })
                        }
                      />

                      <textarea
                        placeholder="Observações"
                        value={novoAsset.notes}
                        onChange={(e) => setNovoAsset({ ...novoAsset, notes: e.target.value })}
                      />

                      <label className="file-field">
                        Arquivo
                        <input
                          id="asset-file-input"
                          type="file"
                          accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                          onChange={(event) =>
                            setArquivoAsset(event.target.files?.[0] ?? null)
                          }
                        />
                        {arquivoAsset ? (
                          <small>
                            ✓ Selecionado: {arquivoAsset.name} •{' '}
                            {(arquivoAsset.size / 1024 / 1024).toFixed(2)} MB
                          </small>
                        ) : (
                          <small>Nenhum arquivo selecionado. Para paleta/fonte, o arquivo é opcional.</small>
                        )}
                      </label>

                      <button
                        className="gold-button"
                        type="submit"
                        disabled={savingAsset || uploadingAsset}
                      >
                        {uploadingAsset
                          ? 'Enviando arquivo...'
                          : savingAsset
                          ? 'Salvando...'
                          : '+ Adicionar material'}
                      </button>
                    </form>

                    <p className="hint">
                      Logos, fotos, vídeos e documentos ficam armazenados no bucket privado{' '}
                      <strong>client-assets</strong>. Paletas, fontes e orientações também podem ser
                      cadastradas somente em texto.
                    </p>
                  </section>
                </div>
              </div>
            )}
          </section>
        )}


        {tela === 'conteudo' && (
          <section className="conteudo-area">
            <div className="toolbar">
              <select
                value={filtroClienteConteudo}
                onChange={(e) => setFiltroClienteConteudo(e.target.value)}
              >
                <option value="">Todos os clientes</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>

              <select
                value={filtroStatusConteudo}
                onChange={(e) => setFiltroStatusConteudo(e.target.value)}
              >
                <option value="">Todos os status</option>
                <option value="todo">A fazer</option>
                <option value="production">Em produção</option>
                <option value="approval">Em aprovação</option>
                <option value="approved">Aprovado</option>
                <option value="scheduled">Agendado</option>
                <option value="published">Publicado</option>
                <option value="cancelled">Cancelado</option>
              </select>

              <input
                className="content-date-filter"
                type="date"
                value={filtroDataConteudo}
                onChange={(e) => setFiltroDataConteudo(e.target.value)}
                title="Filtrar por data"
              />

              {(filtroClienteConteudo || filtroStatusConteudo || filtroDataConteudo) && (
                <button
                  className="ghost-button"
                  onClick={() => {
                    setFiltroClienteConteudo('');
                    setFiltroStatusConteudo('');
                    setFiltroDataConteudo('');
                  }}
                >
                  Limpar filtros
                </button>
              )}

              <span>{conteudosFiltrados.length} conteúdo(s)</span>
            </div>

            {mostrarFormConteudo && (
              <form className="panel form-grid" onSubmit={salvarConteudo}>
                <div className="section-title full">
                  <h3>{conteudoEditandoId ? 'Editar conteúdo' : 'Novo conteúdo'}</h3>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setMostrarFormConteudo(false)}
                  >
                    Fechar
                  </button>
                </div>

                <label>
                  Cliente *
                  <select
                    value={conteudoForm.client_id}
                    onChange={(e) =>
                      setConteudoForm({ ...conteudoForm, client_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Selecione</option>
                    {clients
                      .filter((c) => c.status !== 'closed')
                      .map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  Tipo
                  <select
                    value={conteudoForm.content_type}
                    onChange={(e) =>
                      setConteudoForm({
                        ...conteudoForm,
                        content_type: e.target.value as ContentItem['content_type'],
                      })
                    }
                  >
                    <option value="feed">Feed</option>
                    <option value="story">Stories</option>
                    <option value="reel">Reels</option>
                    <option value="carousel">Carrossel</option>
                    <option value="other">Outro</option>
                  </select>
                </label>

                <label className="full">
                  Título *
                  <input
                    value={conteudoForm.title}
                    onChange={(e) =>
                      setConteudoForm({ ...conteudoForm, title: e.target.value })
                    }
                    required
                  />
                </label>

                <label>
                  Data
                  <input
                    type="date"
                    value={conteudoForm.scheduled_date}
                    onChange={(e) =>
                      setConteudoForm({
                        ...conteudoForm,
                        scheduled_date: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Horário
                  <input
                    type="time"
                    value={conteudoForm.scheduled_time}
                    onChange={(e) =>
                      setConteudoForm({
                        ...conteudoForm,
                        scheduled_time: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Status
                  <select
                    value={conteudoForm.status}
                    onChange={(e) =>
                      setConteudoForm({
                        ...conteudoForm,
                        status: e.target.value as ContentItem['status'],
                      })
                    }
                  >
                    <option value="todo">A fazer</option>
                    <option value="production">Em produção</option>
                    <option value="approval">Em aprovação</option>
                    <option value="approved">Aprovado</option>
                    <option value="scheduled">Agendado</option>
                    <option value="published">Publicado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </label>

                <label>
                  Responsável
                  <input
                    value={conteudoForm.responsible}
                    onChange={(e) =>
                      setConteudoForm({
                        ...conteudoForm,
                        responsible: e.target.value,
                      })
                    }
                  />
                </label>

                <label className="full">
                  Legenda / texto
                  <textarea
                    rows={5}
                    value={conteudoForm.caption}
                    onChange={(e) =>
                      setConteudoForm({ ...conteudoForm, caption: e.target.value })
                    }
                  />
                </label>

                <label className="full">
                  Observações de aprovação
                  <textarea
                    rows={3}
                    value={conteudoForm.approval_notes}
                    onChange={(e) =>
                      setConteudoForm({
                        ...conteudoForm,
                        approval_notes: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Link da mídia
                  <input
                    placeholder="https://..."
                    value={conteudoForm.media_url}
                    onChange={(e) =>
                      setConteudoForm({ ...conteudoForm, media_url: e.target.value })
                    }
                  />
                </label>

                <label>
                  Link publicado
                  <input
                    placeholder="https://..."
                    value={conteudoForm.published_url}
                    onChange={(e) =>
                      setConteudoForm({
                        ...conteudoForm,
                        published_url: e.target.value,
                      })
                    }
                  />
                </label>

                <div className="full form-actions">
                  <button className="gold-button" type="submit" disabled={saving}>
                    {saving
                      ? 'Salvando...'
                      : conteudoEditandoId
                      ? 'Salvar alterações'
                      : 'Adicionar ao calendário'}
                  </button>
                </div>
              </form>
            )}

            {loadingConteudos ? (
              <div className="panel">Carregando conteúdos...</div>
            ) : (
              <div className="content-list">
                {conteudosFiltrados.map((item) => {
                  const client = clients.find((c) => c.id === item.client_id);
                  return (
                    <article className="content-card" key={item.id}>
                      <div className="content-date">
                        <strong>
                          {item.scheduled_date ? dataBR(item.scheduled_date) : 'Sem data'}
                        </strong>
                        <span>{item.scheduled_time?.slice(0, 5) || '—'}</span>
                      </div>

                      <div className="content-main">
                        <div className="content-tags">
                          <span className="content-type">
                            {rotuloConteudo(item.content_type)}
                          </span>
                          <span className={`content-status ${item.status}`}>
                            {rotuloStatusConteudo(item.status)}
                          </span>
                        </div>

                        <h3>{item.title}</h3>
                        <p>{client?.name || 'Cliente não encontrado'}</p>
                        {item.caption && <small>{item.caption}</small>}
                      </div>

                      <div className="content-actions">
                        <button onClick={() => editarConteudo(item)}>Editar</button>
                        <button onClick={() => excluirConteudo(item.id)}>Excluir</button>
                      </div>
                    </article>
                  );
                })}

                {conteudosFiltrados.length === 0 && (
                  <div className="panel empty-state">
                    <strong>Nenhum conteúdo encontrado.</strong>
                    <p>Use “+ Novo conteúdo” para começar o calendário.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}


        {tela === 'campanhas' && (
          <section className="campaigns-area">
            <div className="toolbar">
              <select
                value={filtroClienteCampanha}
                onChange={(e) => setFiltroClienteCampanha(e.target.value)}
              >
                <option value="">Todos os clientes</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>

              <select
                value={filtroStatusCampanha}
                onChange={(e) => setFiltroStatusCampanha(e.target.value)}
              >
                <option value="">Todos os status</option>
                <option value="draft">Rascunho</option>
                <option value="active">Ativa</option>
                <option value="paused">Pausada</option>
                <option value="finished">Finalizada</option>
                <option value="cancelled">Cancelada</option>
              </select>

              <span>{campanhasFiltradas.length} campanha(s)</span>
            </div>

            {mostrarFormCampanha && (
              <form className="panel form-grid" onSubmit={salvarCampanha}>
                <div className="section-title full">
                  <h3>{campanhaEditandoId ? 'Editar campanha' : 'Nova campanha'}</h3>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setMostrarFormCampanha(false)}
                  >
                    Fechar
                  </button>
                </div>

                <label>
                  Cliente *
                  <select
                    value={campanhaForm.client_id}
                    onChange={(e) =>
                      setCampanhaForm({ ...campanhaForm, client_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Selecione</option>
                    {clients
                      .filter((c) => c.status !== 'closed')
                      .map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  Plataforma
                  <select
                    value={campanhaForm.platform}
                    onChange={(e) =>
                      setCampanhaForm({ ...campanhaForm, platform: e.target.value })
                    }
                  >
                    <option>Meta Ads</option>
                    <option>Google Ads</option>
                    <option>Instagram</option>
                    <option>Facebook</option>
                    <option>TikTok Ads</option>
                    <option>YouTube Ads</option>
                    <option>Outro</option>
                  </select>
                </label>

                <label className="full">
                  Nome da campanha *
                  <input
                    value={campanhaForm.name}
                    onChange={(e) =>
                      setCampanhaForm({ ...campanhaForm, name: e.target.value })
                    }
                    required
                  />
                </label>

                <label className="full">
                  Objetivo
                  <input
                    placeholder="Ex.: mensagens no WhatsApp, leads, vendas, alcance..."
                    value={campanhaForm.objective}
                    onChange={(e) =>
                      setCampanhaForm({ ...campanhaForm, objective: e.target.value })
                    }
                  />
                </label>

                <label>
                  Orçamento diário
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={campanhaForm.budget_daily}
                    onChange={(e) =>
                      setCampanhaForm({ ...campanhaForm, budget_daily: e.target.value })
                    }
                  />
                </label>

                <label>
                  Orçamento total
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={campanhaForm.budget_total}
                    onChange={(e) =>
                      setCampanhaForm({ ...campanhaForm, budget_total: e.target.value })
                    }
                  />
                </label>

                <label>
                  Início
                  <input
                    type="date"
                    value={campanhaForm.start_date}
                    onChange={(e) =>
                      setCampanhaForm({ ...campanhaForm, start_date: e.target.value })
                    }
                  />
                </label>

                <label>
                  Término
                  <input
                    type="date"
                    value={campanhaForm.end_date}
                    onChange={(e) =>
                      setCampanhaForm({ ...campanhaForm, end_date: e.target.value })
                    }
                  />
                </label>

                <label>
                  Status
                  <select
                    value={campanhaForm.status}
                    onChange={(e) =>
                      setCampanhaForm({
                        ...campanhaForm,
                        status: e.target.value as Campaign['status'],
                      })
                    }
                  >
                    <option value="draft">Rascunho</option>
                    <option value="active">Ativa</option>
                    <option value="paused">Pausada</option>
                    <option value="finished">Finalizada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </label>

                <label className="full">
                  Link da publicação / anúncio
                  <input
                    type="url"
                    placeholder="https://..."
                    value={campanhaForm.publication_url}
                    onChange={(e) =>
                      setCampanhaForm({
                        ...campanhaForm,
                        publication_url: e.target.value,
                      })
                    }
                  />
                </label>

                <label className="full">
                  Público / segmentação
                  <textarea
                    rows={3}
                    value={campanhaForm.audience}
                    onChange={(e) =>
                      setCampanhaForm({ ...campanhaForm, audience: e.target.value })
                    }
                  />
                </label>

                <label className="full">
                  Observações
                  <textarea
                    rows={3}
                    value={campanhaForm.notes}
                    onChange={(e) =>
                      setCampanhaForm({ ...campanhaForm, notes: e.target.value })
                    }
                  />
                </label>

                <div className="full form-actions">
                  <button className="gold-button" type="submit" disabled={saving}>
                    {saving
                      ? 'Salvando...'
                      : campanhaEditandoId
                      ? 'Salvar alterações'
                      : 'Cadastrar campanha'}
                  </button>
                </div>
              </form>
            )}

            {loadingCampanhas ? (
              <div className="panel">Carregando campanhas...</div>
            ) : (
              <div className="campaign-grid">
                {campanhasFiltradas.map((campanha) => {
                  const client = clients.find((c) => c.id === campanha.client_id);
                  const resultados = resultadosCampanhas.filter(
                    (item) => item.campaign_id === campanha.id
                  );

                  const resumo = resultados.reduce(
                    (acc, item) => ({
                      spent: acc.spent + Number(item.spent || 0),
                      reach: acc.reach + Number(item.reach || 0),
                      impressions: acc.impressions + Number(item.impressions || 0),
                      clicks: acc.clicks + Number(item.clicks || 0),
                      leads: acc.leads + Number(item.leads || 0),
                      messages: acc.messages + Number(item.messages || 0),
                      conversions: acc.conversions + Number(item.conversions || 0),
                      revenue: acc.revenue + Number(item.revenue || 0),
                    }),
                    {
                      spent: 0,
                      reach: 0,
                      impressions: 0,
                      clicks: 0,
                      leads: 0,
                      messages: 0,
                      conversions: 0,
                      revenue: 0,
                    }
                  );

                  const roas =
                    resumo.spent > 0 ? resumo.revenue / resumo.spent : 0;

                  return (
                    <article key={campanha.id} className="campaign-card">
                      <div className="campaign-card-header">
                        <div>
                          <span className={`campaign-status ${campanha.status}`}>
                            {rotuloStatusCampanha(campanha.status)}
                          </span>
                          <h3>{campanha.name}</h3>
                          <p>{client?.name || 'Cliente não encontrado'} • {campanha.platform || 'Sem plataforma'}</p>
                        </div>

                        <strong>{moeda(Number(campanha.budget_total || 0))}</strong>
                      </div>

                      <div className="campaign-info">
                        <span><b>Objetivo:</b> {campanha.objective || '—'}</span>
                        <span><b>Período:</b> {dataBR(campanha.start_date)} até {dataBR(campanha.end_date)}</span>
                        {campanha.publication_url && (
                          <span>
                            <b>Publicação:</b>{' '}
                            <a
                              className="campaign-publication-link"
                              href={campanha.publication_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Abrir publicação / anúncio
                            </a>
                          </span>
                        )}
                      </div>

                      <div className="campaign-results-title">
                        <span>Resultados da campanha</span>
                        <small>{resultados.length} lançamento(s)</small>
                      </div>

                      <div className="campaign-card-results">
                        <div>
                          <span>Investido</span>
                          <strong>{moeda(resumo.spent)}</strong>
                        </div>
                        <div>
                          <span>Alcance</span>
                          <strong>{numeroBR(resumo.reach)}</strong>
                        </div>
                        <div>
                          <span>Cliques</span>
                          <strong>{numeroBR(resumo.clicks)}</strong>
                        </div>
                        <div>
                          <span>Leads</span>
                          <strong>{numeroBR(resumo.leads)}</strong>
                        </div>
                        <div>
                          <span>Mensagens</span>
                          <strong>{numeroBR(resumo.messages)}</strong>
                        </div>
                        <div>
                          <span>Conversões</span>
                          <strong>{numeroBR(resumo.conversions)}</strong>
                        </div>
                        <div>
                          <span>Receita</span>
                          <strong>{moeda(resumo.revenue)}</strong>
                        </div>
                        <div>
                          <span>ROAS</span>
                          <strong>{roas > 0 ? `${roas.toFixed(2)}x` : '—'}</strong>
                        </div>
                      </div>

                      <div className="campaign-actions">
                        <button onClick={() => setCampanhaAbertaId(campanha.id)}>
                          + Lançar / ver resultados
                        </button>
                        <button onClick={() => editarCampanha(campanha)}>Editar</button>
                        <button onClick={() => excluirCampanha(campanha.id)}>Excluir</button>
                      </div>
                    </article>
                  );
                })}

                {campanhasFiltradas.length === 0 && (
                  <div className="panel empty-state">
                    <strong>Nenhuma campanha encontrada.</strong>
                    <p>Use “+ Nova campanha” para começar.</p>
                  </div>
                )}
              </div>
            )}

            {campanhaAberta && (
              <div className="client-detail-overlay">
                <div className="client-detail campaign-detail">
                  <div className="detail-header">
                    <div>
                      <p className="eyebrow">RESULTADOS DA CAMPANHA</p>
                      <h2>{campanhaAberta.name}</h2>
                      <p>
                        {clients.find((c) => c.id === campanhaAberta.client_id)?.name || 'Cliente'} •{' '}
                        {campanhaAberta.platform || 'Sem plataforma'}
                      </p>

                      {campanhaAberta.publication_url && (
                        <a
                          className="campaign-publication-link detail-link"
                          href={campanhaAberta.publication_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          🔗 Abrir publicação / anúncio
                        </a>
                      )}
                    </div>
                    <button
                      className="ghost-button"
                      onClick={() => setCampanhaAbertaId(null)}
                    >
                      Fechar
                    </button>
                  </div>

                  <section className="campaign-result-summary">
                    <div><span>Investido</span><strong>{moeda(totaisCampanhaAberta.spent)}</strong></div>
                    <div><span>Receita</span><strong>{moeda(totaisCampanhaAberta.revenue)}</strong></div>
                    <div><span>Alcance</span><strong>{numeroBR(totaisCampanhaAberta.reach)}</strong></div>
                    <div><span>Cliques</span><strong>{numeroBR(totaisCampanhaAberta.clicks)}</strong></div>
                    <div><span>Leads</span><strong>{numeroBR(totaisCampanhaAberta.leads)}</strong></div>
                    <div><span>Mensagens</span><strong>{numeroBR(totaisCampanhaAberta.messages)}</strong></div>
                    <div><span>Conversões</span><strong>{numeroBR(totaisCampanhaAberta.conversions)}</strong></div>
                    <div>
                      <span>ROAS</span>
                      <strong>
                        {totaisCampanhaAberta.spent > 0
                          ? `${(totaisCampanhaAberta.revenue / totaisCampanhaAberta.spent).toFixed(2)}x`
                          : '—'}
                      </strong>
                    </div>
                  </section>

                  <section className="detail-section">
                    <div className="section-title">
                      <div>
                        <h3>Adicionar resultado da campanha</h3>
                        <p className="section-subtitle">
                          Registre os números do Gerenciador de Anúncios para acompanhar a evolução.
                        </p>
                      </div>
                    </div>

                    <form className="result-form" onSubmit={salvarResultadoCampanha}>
                      <label>
                        Data
                        <input
                          type="date"
                          value={resultadoForm.reference_date}
                          onChange={(e) =>
                            setResultadoForm({
                              ...resultadoForm,
                              reference_date: e.target.value,
                            })
                          }
                        />
                      </label>

                      <label>
                        Valor gasto
                        <input type="number" min="0" step="0.01" value={resultadoForm.spent}
                          onChange={(e) => setResultadoForm({...resultadoForm, spent:e.target.value})} />
                      </label>

                      <label>
                        Alcance
                        <input type="number" min="0" value={resultadoForm.reach}
                          onChange={(e) => setResultadoForm({...resultadoForm, reach:e.target.value})} />
                      </label>

                      <label>
                        Impressões
                        <input type="number" min="0" value={resultadoForm.impressions}
                          onChange={(e) => setResultadoForm({...resultadoForm, impressions:e.target.value})} />
                      </label>

                      <label>
                        Cliques
                        <input type="number" min="0" value={resultadoForm.clicks}
                          onChange={(e) => setResultadoForm({...resultadoForm, clicks:e.target.value})} />
                      </label>

                      <label>
                        Leads
                        <input type="number" min="0" value={resultadoForm.leads}
                          onChange={(e) => setResultadoForm({...resultadoForm, leads:e.target.value})} />
                      </label>

                      <label>
                        Mensagens
                        <input type="number" min="0" value={resultadoForm.messages}
                          onChange={(e) => setResultadoForm({...resultadoForm, messages:e.target.value})} />
                      </label>

                      <label>
                        Conversões
                        <input type="number" min="0" value={resultadoForm.conversions}
                          onChange={(e) => setResultadoForm({...resultadoForm, conversions:e.target.value})} />
                      </label>

                      <label>
                        Receita gerada
                        <input type="number" min="0" step="0.01" value={resultadoForm.revenue}
                          onChange={(e) => setResultadoForm({...resultadoForm, revenue:e.target.value})} />
                      </label>

                      <label className="full">
                        Observações
                        <textarea
                          rows={3}
                          value={resultadoForm.notes}
                          onChange={(e) =>
                            setResultadoForm({ ...resultadoForm, notes: e.target.value })
                          }
                        />
                      </label>

                      <div className="full form-actions">
                        <button className="gold-button" type="submit" disabled={saving}>
                          Registrar resultado
                        </button>
                      </div>
                    </form>
                  </section>

                  <section className="detail-section">
                    <div className="section-title">
                      <h3>Histórico de resultados</h3>
                    </div>

                    <div className="result-history">
                      {resultadosCampanhaAberta.map((item) => (
                        <div key={item.id} className="result-row">
                          <div>
                            <strong>{dataBR(item.reference_date)}</strong>
                            <span>Gasto {moeda(Number(item.spent || 0))} • Leads {item.leads || 0} • Conversões {item.conversions || 0}</span>
                          </div>
                          <button onClick={() => excluirResultadoCampanha(item.id)}>
                            Excluir
                          </button>
                        </div>
                      ))}

                      {resultadosCampanhaAberta.length === 0 && (
                        <p className="priority-empty">Nenhum resultado registrado ainda.</p>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            )}
          </section>
        )}


        {tela === 'financeiro' && (
          <section className="financeiro-area">
            <div className="finance-toolbar-top">
              <div className="toolbar">
                <select
                  value={filtroTipoFinanceiro}
                  onChange={(e) => setFiltroTipoFinanceiro(e.target.value)}
                >
                  <option value="">Entradas e despesas</option>
                  <option value="income">Entradas</option>
                  <option value="expense">Despesas</option>
                </select>

                <select
                  value={filtroStatusFinanceiro}
                  onChange={(e) => setFiltroStatusFinanceiro(e.target.value)}
                >
                  <option value="">Todos os status</option>
                  <option value="pending">Pendente</option>
                  <option value="overdue">Atrasado</option>
                  <option value="paid">Pago</option>
                  <option value="cancelled">Cancelado</option>
                </select>

                <select
                  value={filtroClienteFinanceiro}
                  onChange={(e) => setFiltroClienteFinanceiro(e.target.value)}
                >
                  <option value="">Todos os clientes</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>

                <input
                  className="finance-month-filter"
                  type="month"
                  value={filtroMesFinanceiro}
                  onChange={(e) => setFiltroMesFinanceiro(e.target.value)}
                />
              </div>

              <button
                className="ghost-button finance-generate-button"
                onClick={gerarMensalidadesDoMes}
                disabled={saving}
              >
                Gerar mensalidades do mês
              </button>
            </div>

            <section className="finance-summary">
              <div>
                <span>Recebido</span>
                <strong>{moeda(resumoFinanceiro.recebido)}</strong>
              </div>
              <div>
                <span>A receber</span>
                <strong>{moeda(resumoFinanceiro.aReceber)}</strong>
              </div>
              <div>
                <span>Despesas pagas</span>
                <strong>{moeda(resumoFinanceiro.pago)}</strong>
              </div>
              <div>
                <span>A pagar</span>
                <strong>{moeda(resumoFinanceiro.aPagar)}</strong>
              </div>
              <div className="balance-card">
                <span>Saldo realizado</span>
                <strong>{moeda(saldoFinanceiro)}</strong>
              </div>
            </section>

            {mostrarFormFinanceiro && (
              <form className="panel form-grid" onSubmit={salvarLancamentoFinanceiro}>
                <div className="section-title full">
                  <h3>
                    {financeiroEditandoId
                      ? 'Editar lançamento'
                      : 'Novo lançamento'}
                  </h3>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setMostrarFormFinanceiro(false)}
                  >
                    Fechar
                  </button>
                </div>

                <label>
                  Tipo *
                  <select
                    value={financeiroForm.entry_type}
                    onChange={(e) =>
                      setFinanceiroForm({
                        ...financeiroForm,
                        entry_type: e.target.value as FinancialEntry['entry_type'],
                      })
                    }
                  >
                    <option value="income">Entrada / Receita</option>
                    <option value="expense">Despesa</option>
                  </select>
                </label>

                <label>
                  Cliente
                  <select
                    value={financeiroForm.client_id}
                    onChange={(e) =>
                      setFinanceiroForm({
                        ...financeiroForm,
                        client_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Sem cliente vinculado</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Categoria
                  <input
                    placeholder="Mensalidade, serviço extra, software, anúncio..."
                    value={financeiroForm.category}
                    onChange={(e) =>
                      setFinanceiroForm({
                        ...financeiroForm,
                        category: e.target.value,
                      })
                    }
                  />
                </label>

                <label className="full">
                  Descrição *
                  <input
                    value={financeiroForm.description}
                    onChange={(e) =>
                      setFinanceiroForm({
                        ...financeiroForm,
                        description: e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Valor *
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={financeiroForm.amount}
                    onChange={(e) =>
                      setFinanceiroForm({
                        ...financeiroForm,
                        amount: e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Vencimento
                  <input
                    type="date"
                    value={financeiroForm.due_date}
                    onChange={(e) =>
                      setFinanceiroForm({
                        ...financeiroForm,
                        due_date: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Status
                  <select
                    value={financeiroForm.status}
                    onChange={(e) =>
                      setFinanceiroForm({
                        ...financeiroForm,
                        status: e.target.value as FinancialEntry['status'],
                      })
                    }
                  >
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </label>

                <label>
                  Data do pagamento
                  <input
                    type="date"
                    value={financeiroForm.paid_date}
                    onChange={(e) =>
                      setFinanceiroForm({
                        ...financeiroForm,
                        paid_date: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Forma de pagamento
                  <select
                    value={financeiroForm.payment_method}
                    onChange={(e) =>
                      setFinanceiroForm({
                        ...financeiroForm,
                        payment_method: e.target.value,
                      })
                    }
                  >
                    <option value="">Não informado</option>
                    <option value="Pix">Pix</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Débito automático">Débito automático</option>
                    <option value="Outro">Outro</option>
                  </select>
                </label>

                <label className="finance-check">
                  <input
                    type="checkbox"
                    checked={financeiroForm.recurring}
                    onChange={(e) =>
                      setFinanceiroForm({
                        ...financeiroForm,
                        recurring: e.target.checked,
                      })
                    }
                  />
                  Lançamento recorrente
                </label>

                <label className="full">
                  Observações
                  <textarea
                    rows={3}
                    value={financeiroForm.notes}
                    onChange={(e) =>
                      setFinanceiroForm({
                        ...financeiroForm,
                        notes: e.target.value,
                      })
                    }
                  />
                </label>

                <div className="full form-actions">
                  <button className="gold-button" type="submit" disabled={saving}>
                    {saving
                      ? 'Salvando...'
                      : financeiroEditandoId
                      ? 'Salvar alterações'
                      : 'Cadastrar lançamento'}
                  </button>
                </div>
              </form>
            )}

            {loadingFinanceiro ? (
              <div className="panel">Carregando financeiro...</div>
            ) : (
              <div className="finance-list">
                {financeiroFiltrado.map((entry) => {
                  const client = clients.find(
                    (c) => c.id === entry.client_id
                  );

                  const statusVisual = statusFinanceiroVisual(
                    entry.status,
                    entry.due_date
                  );

                  return (
                    <article
                      key={entry.id}
                      className={`finance-entry ${entry.entry_type} ${statusVisual}`}
                    >
                      <div className="finance-entry-main">
                        <div className="finance-entry-tags">
                          <span className={`finance-type ${entry.entry_type}`}>
                            {entry.entry_type === 'income' ? 'Entrada' : 'Despesa'}
                          </span>
                          <span className={`finance-status ${statusVisual}`}>
                            {rotuloStatusFinanceiro(entry.status, entry.due_date)}
                          </span>
                          {entry.recurring && (
                            <span className="finance-recurring">Recorrente</span>
                          )}
                        </div>

                        <h3>{entry.description}</h3>

                        <p>
                          {entry.category || 'Sem categoria'}
                          {client ? ` • ${client.name}` : ''}
                        </p>

                        <div className="finance-entry-dates">
                          <span>
                            Vencimento: {dataBR(entry.due_date)}
                          </span>
                          {entry.paid_date && (
                            <span>
                              Pago em: {dataBR(entry.paid_date)}
                            </span>
                          )}
                          {entry.payment_method && (
                            <span>
                              Forma: {entry.payment_method}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="finance-entry-side">
                        <strong>
                          {entry.entry_type === 'expense' ? '- ' : ''}
                          {moeda(Number(entry.amount || 0))}
                        </strong>

                        <div className="finance-entry-actions">
                          {entry.status !== 'paid' &&
                            entry.status !== 'cancelled' && (
                              <button onClick={() => marcarLancamentoPago(entry)}>
                                Marcar pago
                              </button>
                            )}

                          <button onClick={() => editarLancamentoFinanceiro(entry)}>
                            Editar
                          </button>

                          {entry.status !== 'cancelled' && (
                            <button onClick={() => cancelarLancamento(entry)}>
                              Cancelar
                            </button>
                          )}

                          {entry.status !== 'paid' && (
                            <button onClick={() => excluirLancamentoFinanceiro(entry)}>
                              Excluir
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}

                {financeiroFiltrado.length === 0 && (
                  <div className="panel empty-state">
                    <strong>Nenhum lançamento encontrado.</strong>
                    <p>
                      Cadastre uma entrada, despesa ou gere as mensalidades do mês.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}


        {tela === 'tarefas' && (
          <section className="tasks-area">
            <section className="task-summary">
              <div>
                <span>Pendentes</span>
                <strong>{tarefasPendentes.length}</strong>
              </div>
              <div className="task-summary-overdue">
                <span>Atrasadas</span>
                <strong>{tarefasAtrasadas.length}</strong>
              </div>
              <div>
                <span>Para hoje</span>
                <strong>{tarefasHoje.length}</strong>
              </div>
              <div>
                <span>Concluídas</span>
                <strong>{tarefas.filter((t) => t.status === 'done').length}</strong>
              </div>
            </section>

            <div className="toolbar task-toolbar">
              <input
                type="search"
                placeholder="Buscar tarefa, cliente ou responsável..."
                value={buscaTarefa}
                onChange={(e) => setBuscaTarefa(e.target.value)}
              />

              <select
                value={filtroStatusTarefa}
                onChange={(e) => setFiltroStatusTarefa(e.target.value)}
              >
                <option value="">Todos os status</option>
                <option value="todo">A fazer</option>
                <option value="doing">Em andamento</option>
                <option value="waiting_client">Aguardando cliente</option>
                <option value="done">Concluída</option>
                <option value="cancelled">Cancelada</option>
              </select>

              <select
                value={filtroPrioridadeTarefa}
                onChange={(e) => setFiltroPrioridadeTarefa(e.target.value)}
              >
                <option value="">Todas as prioridades</option>
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="normal">Normal</option>
                <option value="low">Baixa</option>
              </select>

              <select
                value={filtroClienteTarefa}
                onChange={(e) => setFiltroClienteTarefa(e.target.value)}
              >
                <option value="">Todos os clientes</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>

              <span>{tarefasFiltradas.length} tarefa(s)</span>
            </div>

            {mostrarFormTarefa && (
              <form className="panel form-grid" onSubmit={salvarTarefa}>
                <div className="section-title full">
                  <h3>{tarefaEditandoId ? 'Editar tarefa' : 'Nova tarefa'}</h3>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setMostrarFormTarefa(false)}
                  >
                    Fechar
                  </button>
                </div>

                <label>
                  Cliente
                  <select
                    value={tarefaForm.client_id}
                    onChange={(e) =>
                      setTarefaForm({ ...tarefaForm, client_id: e.target.value })
                    }
                  >
                    <option value="">Sem cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Responsável
                  <input
                    value={tarefaForm.responsible}
                    onChange={(e) =>
                      setTarefaForm({ ...tarefaForm, responsible: e.target.value })
                    }
                  />
                </label>

                <label className="full">
                  Título *
                  <input
                    value={tarefaForm.title}
                    onChange={(e) =>
                      setTarefaForm({ ...tarefaForm, title: e.target.value })
                    }
                    required
                  />
                </label>

                <label className="full">
                  Descrição
                  <textarea
                    rows={3}
                    value={tarefaForm.description}
                    onChange={(e) =>
                      setTarefaForm({ ...tarefaForm, description: e.target.value })
                    }
                  />
                </label>

                <label>
                  Data
                  <input
                    type="date"
                    value={tarefaForm.due_date}
                    onChange={(e) =>
                      setTarefaForm({ ...tarefaForm, due_date: e.target.value })
                    }
                  />
                </label>

                <label>
                  Horário
                  <input
                    type="time"
                    value={tarefaForm.due_time}
                    onChange={(e) =>
                      setTarefaForm({ ...tarefaForm, due_time: e.target.value })
                    }
                  />
                </label>

                <label>
                  Prioridade
                  <select
                    value={tarefaForm.priority}
                    onChange={(e) =>
                      setTarefaForm({
                        ...tarefaForm,
                        priority: e.target.value as TaskItem['priority'],
                      })
                    }
                  >
                    <option value="low">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </label>

                <label>
                  Status
                  <select
                    value={tarefaForm.status}
                    onChange={(e) =>
                      setTarefaForm({
                        ...tarefaForm,
                        status: e.target.value as TaskItem['status'],
                      })
                    }
                  >
                    <option value="todo">A fazer</option>
                    <option value="doing">Em andamento</option>
                    <option value="waiting_client">Aguardando cliente</option>
                    <option value="done">Concluída</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </label>

                <label>
                  Lembrete - data
                  <input
                    type="date"
                    value={tarefaForm.reminder_date}
                    onChange={(e) =>
                      setTarefaForm({
                        ...tarefaForm,
                        reminder_date: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Lembrete - horário
                  <input
                    type="time"
                    value={tarefaForm.reminder_time}
                    onChange={(e) =>
                      setTarefaForm({
                        ...tarefaForm,
                        reminder_time: e.target.value,
                      })
                    }
                  />
                </label>

                <div className="full form-actions">
                  <button className="gold-button" type="submit" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar tarefa'}
                  </button>
                </div>
              </form>
            )}

            {loadingTarefas ? (
              <div className="panel">Carregando tarefas...</div>
            ) : (
              <div className="task-list">
                {tarefasFiltradas.map((tarefa) => {
                  const client = clients.find((c) => c.id === tarefa.client_id);
                  const atrasada =
                    tarefa.due_at &&
                    dataIsoLocal(tarefa.due_at) < dataLocalHoje() &&
                    !['done', 'cancelled'].includes(tarefa.status);

                  const hojeTarefa =
                    tarefa.due_at &&
                    dataIsoLocal(tarefa.due_at) === dataLocalHoje() &&
                    !['done', 'cancelled'].includes(tarefa.status);

                  return (
                    <article
                      key={tarefa.id}
                      className={`task-card ${tarefa.priority}${
                        atrasada ? ' overdue' : ''
                      }${hojeTarefa ? ' due-today' : ''}`}
                    >
                      <div>
                        <div className="task-tags">
                          <span>{rotuloPrioridade(tarefa.priority)}</span>
                          <span>{rotuloStatusTarefa(tarefa.status)}</span>
                          {atrasada && <span className="task-alert">Atrasada</span>}
                          {hojeTarefa && <span className="task-today">Hoje</span>}
                        </div>

                        <h3>{tarefa.title}</h3>
                        <p>
                          {client?.name || 'Sem cliente'}
                          {tarefa.responsible ? ` • ${tarefa.responsible}` : ''}
                        </p>

                        {tarefa.description && (
                          <p className="task-description">{tarefa.description}</p>
                        )}

                        <small>
                          {tarefa.due_at
                            ? `${dataBR(dataIsoLocal(tarefa.due_at))} ${horaIsoLocal(
                                tarefa.due_at
                              )}`
                            : 'Sem prazo'}
                        </small>
                      </div>

                      <div className="task-actions">
                        <button onClick={() => editarTarefa(tarefa)}>Editar</button>
                        <button
                          className="danger-button"
                          onClick={() => excluirTarefa(tarefa.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </article>
                  );
                })}

                {tarefasFiltradas.length === 0 && (
                  <div className="panel empty-state">
                    <strong>Nenhuma tarefa encontrada.</strong>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {!['dashboard', 'clientes', 'conteudo', 'campanhas', 'financeiro', 'tarefas'].includes(tela) && (
          <section className="panel module-placeholder">
            <span className="module-icon">
              {menu.find((item) => item.id === tela)?.icon}
            </span>
            <h2>{titulo}</h2>
            <p>
              Estrutura preparada. Este será o próximo módulo a receber cadastro,
              filtros, histórico e integração com o Supabase.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
