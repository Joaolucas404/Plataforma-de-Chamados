import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { supabase } from "../App";

const VR_DIA = 23.9;
const VA_MES = 340;
const DIAS_UTEIS_MES = 22;

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data) {
  if (!data) return "-";
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

function calcularIdade(dataNascimento) {
  if (!dataNascimento) return "-";

  const hoje = new Date();
  const nasc = new Date(dataNascimento + "T00:00:00");

  let idade = hoje.getFullYear() - nasc.getFullYear();
  const mes = hoje.getMonth() - nasc.getMonth();

  if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) idade--;

  return idade;
}

function addMeses(data, meses) {
  if (!data) return null;
  const d = new Date(data + "T00:00:00");
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

function beneficiosPadraoMensal() {
  return VA_MES + VR_DIA * DIAS_UTEIS_MES;
}

function limparTexto(texto) {
  return String(texto || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizarData(valor) {
  if (!valor) return null;

  if (valor instanceof Date && !isNaN(valor)) {
    return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(valor.getDate()).padStart(2, "0")}`;
  }

  if (typeof valor === "number") {
    const data = XLSX.SSF.parse_date_code(valor);
    if (!data) return null;

    return `${data.y}-${String(data.m).padStart(2, "0")}-${String(
      data.d
    ).padStart(2, "0")}`;
  }

  const texto = String(valor).trim();
  if (!texto) return null;

  if (texto.includes("/")) {
    const [dia, mes, ano] = texto.split("/");
    return `${String(ano).padStart(4, "20")}-${String(mes).padStart(
      2,
      "0"
    )}-${String(dia).padStart(2, "0")}`;
  }

  if (texto.includes("-")) return texto.slice(0, 10);

  return null;
}

function normalizarNumero(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;
  if (typeof valor === "number") return valor;

  return Number(
    String(valor)
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim() || 0
  );
}

function getValorLinha(linha, nomesPossiveis) {
  const chaves = Object.keys(linha);

  for (const nome of nomesPossiveis) {
    const chave = chaves.find((c) => limparTexto(c) === limparTexto(nome));
    if (chave) return linha[chave];
  }

  return "";
}

function statusFerias(funcionario) {
  if (funcionario?.data_ferias_inicio && funcionario?.data_ferias_fim) {
    return "Férias programadas";
  }

  if (!funcionario?.data_admissao) return "Sem admissão";

  const hoje = new Date();
  const vencimento = new Date(addMeses(funcionario.data_admissao, 12) + "T00:00:00");
  const prazo = new Date(addMeses(funcionario.data_admissao, 23) + "T00:00:00");

  if (hoje > prazo) return "Prazo vencido";
  if ((prazo - hoje) / 86400000 <= 60) return "Prazo próximo";
  if (hoje > vencimento) return "Férias vencidas";
  if ((vencimento - hoje) / 86400000 <= 60) return "Férias próximas";

  return "OK";
}

function corStatusFerias(status) {
  const s = limparTexto(status);

  if (s.includes("programada")) return "#1e9bff";
  if (s.includes("vencido") || s.includes("vencida")) return "#ff3131";
  if (s.includes("proximo")) return "#ff9f1a";
  return "#30d158";
}

const inicial = {
  nome: "",
  matricula: "",
  cargo: "",
  data_admissao: "",
  data_nascimento: "",
  salario: "",
  carga_horaria: "",
  ativo: true,
};

export default function FuncionariosPage({ styles, colors, usuario }) {
  const [funcionarios, setFuncionarios] = useState([]);
  const [form, setForm] = useState(inicial);
  const [busca, setBusca] = useState("");
  const [filtroCargo, setFiltroCargo] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [editandoId, setEditandoId] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [modalFuncionario, setModalFuncionario] = useState(null);
  const [importando, setImportando] = useState(false);
  const [importandoPonto, setImportandoPonto] = useState(false);

  const itensPorPagina = 6;
  const isGestor = usuario?.perfil === "gestor";

  useEffect(() => {
    carregarFuncionarios();
  }, []);

  async function carregarFuncionarios() {
    const { data, error } = await supabase
      .from("funcionarios")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error(error);
      setErro("Erro ao carregar funcionários.");
      return;
    }

    setFuncionarios(data || []);
  }

  const cargos = useMemo(() => {
    return [...new Set(funcionarios.map((f) => f.cargo).filter(Boolean))].sort();
  }, [funcionarios]);

  const funcionariosFiltrados = useMemo(() => {
    return funcionarios.filter((f) => {
      const termo = limparTexto(busca);

      const passaBusca =
        !termo ||
        limparTexto(f.nome).includes(termo) ||
        limparTexto(f.matricula).includes(termo) ||
        limparTexto(f.cargo).includes(termo);

      const passaCargo = filtroCargo === "todos" || f.cargo === filtroCargo;

      const passaStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "ativos" && f.ativo !== false) ||
        (filtroStatus === "inativos" && f.ativo === false);

      return passaBusca && passaCargo && passaStatus;
    });
  }, [funcionarios, busca, filtroCargo, filtroStatus]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(funcionariosFiltrados.length / itensPorPagina)
  );

  const funcionariosPagina = funcionariosFiltrados.slice(
    (pagina - 1) * itensPorPagina,
    pagina * itensPorPagina
  );

  const cargosGrafico = useMemo(() => {
    const mapa = {};

    funcionarios.forEach((f) => {
      const cargo = f.cargo || "Sem cargo";
      mapa[cargo] = (mapa[cargo] || 0) + 1;
    });

    return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
  }, [funcionarios]);

  const maiorCargo = Math.max(...cargosGrafico.map(([, qtd]) => qtd), 1);

  const resumo = useMemo(() => {
    const ativos = funcionarios.filter((f) => f.ativo !== false).length;
    const inativos = funcionarios.filter((f) => f.ativo === false).length;

    const folha = funcionarios
      .filter((f) => f.ativo !== false)
      .reduce(
        (total, f) => total + Number(f.salario || 0) + beneficiosPadraoMensal(),
        0
      );

    const mediaIdade =
      funcionarios.length > 0
        ? Math.round(
            funcionarios.reduce((total, f) => {
              const idade = calcularIdade(f.data_nascimento);
              return total + (idade === "-" ? 0 : Number(idade));
            }, 0) / funcionarios.length
          )
        : 0;

    return {
      total: funcionarios.length,
      ativos,
      inativos,
      folha,
      mediaIdade,
    };
  }, [funcionarios]);

  function alterar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function limparForm() {
    setForm(inicial);
    setEditandoId(null);
  }

  async function salvarFuncionario() {
    setErro("");
    setMensagem("");

    if (!form.nome.trim()) {
      setErro("Informe o nome do funcionário.");
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      matricula: String(form.matricula || "").trim(),
      cargo: form.cargo || "",
      data_admissao: form.data_admissao || null,
      data_nascimento: form.data_nascimento || null,
      salario: normalizarNumero(form.salario),
      beneficios: 0,
      carga_horaria: form.carga_horaria || "",
      ativo: form.ativo,
    };

    if (editandoId) {
      const { error } = await supabase
        .from("funcionarios")
        .update(payload)
        .eq("id", editandoId);

      if (error) {
        console.error(error);
        setErro("Erro ao atualizar funcionário.");
        return;
      }

      setMensagem("Funcionário atualizado com sucesso.");
    } else {
      const { error } = await supabase.from("funcionarios").insert(payload);

      if (error) {
        console.error(error);
        setErro("Erro ao cadastrar funcionário.");
        return;
      }

      setMensagem("Funcionário cadastrado com sucesso.");
    }

    limparForm();
    carregarFuncionarios();
  }

  function editarFuncionario(f) {
    setEditandoId(f.id);
    setForm({
      nome: f.nome || "",
      matricula: f.matricula || "",
      cargo: f.cargo || "",
      data_admissao: f.data_admissao || "",
      data_nascimento: f.data_nascimento || "",
      salario: f.salario || "",
      carga_horaria: f.carga_horaria || "",
      ativo: f.ativo !== false,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluirFuncionario(id) {
    const confirmar = confirm("Deseja excluir este funcionário?");
    if (!confirmar) return;

    const { error } = await supabase.from("funcionarios").delete().eq("id", id);

    if (error) {
      console.error(error);
      setErro("Erro ao excluir funcionário.");
      return;
    }

    setMensagem("Funcionário excluído com sucesso.");
    carregarFuncionarios();
  }

  async function importarExcel(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    setErro("");
    setMensagem("");
    setImportando(true);

    try {
      const buffer = await arquivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const linhas = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        range: 1,
      });

      const payload = linhas
        .map((linha) => {
          const nome = getValorLinha(linha, ["Nome"]);
          const matricula = getValorLinha(linha, ["Matrícula", "Matricula"]);
          const cargo = getValorLinha(linha, ["Cargo"]);
          const salario = getValorLinha(linha, ["Salário", "Salario"]);
          const admissao = getValorLinha(linha, ["Admissão", "Admissao"]);
          const nascimento = getValorLinha(linha, [
            "Nascimento",
            "Data de Nascimento",
            "Data Nascimento",
          ]);

          return {
            nome: String(nome || "").trim(),
            matricula: String(matricula || "").trim(),
            cargo: String(cargo || "").trim(),
            data_admissao: normalizarData(admissao),
            data_nascimento: normalizarData(nascimento),
            salario: normalizarNumero(salario),
            beneficios: 0,
            carga_horaria: "",
            ativo: true,
          };
        })
        .filter((item) => item.nome && limparTexto(item.nome) !== "nome");

      if (payload.length === 0) {
        setErro("Nenhum funcionário válido encontrado na planilha.");
        setImportando(false);
        return;
      }

      const { error } = await supabase.from("funcionarios").insert(payload);

      if (error) {
        console.error(error);
        setErro("Erro ao importar funcionários.");
        setImportando(false);
        return;
      }

      setMensagem(`${payload.length} funcionário(s) importado(s) com sucesso.`);
      setImportando(false);
      event.target.value = "";
      carregarFuncionarios();
    } catch (error) {
      console.error(error);
      setErro("Erro ao importar planilha.");
      setImportando(false);
    }
  }

  async function importarControlIdHtml(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    setImportandoPonto(true);
    setMensagem("HTML do Control iD carregado. Próximo passo: mapear o layout do relatório.");
    setImportandoPonto(false);
    event.target.value = "";
  }

  if (!isGestor) {
    return (
      <div style={styles.sectionCard}>
        <h2>Acesso restrito</h2>
      </div>
    );
  }

  return (
    <div className="func-page">
      <style>{`
        .func-page {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          box-sizing: border-box;
          color: white;
        }

        .func-hero {
          display: grid;
          grid-template-columns: minmax(320px, 1.2fr) minmax(0, 2fr);
          gap: 16px;
          margin-bottom: 18px;
        }

        .func-title {
          background:
            radial-gradient(circle at top left, rgba(30,155,255,.24), transparent 38%),
            linear-gradient(145deg, rgba(11,34,63,.96), rgba(2,11,22,.98));
          border: 1px solid rgba(30,155,255,.75);
          border-radius: 28px;
          padding: 26px;
          min-height: 180px;
          box-shadow: 0 18px 50px rgba(0,0,0,.25);
        }

        .func-title-icon {
          font-size: 42px;
          margin-bottom: 14px;
          filter: drop-shadow(0 0 16px rgba(168,85,247,.5));
        }

        .func-title h2 {
          margin: 0;
          font-size: 32px;
          line-height: 1.1;
        }

        .func-title p {
          color: #9fb1cc;
          line-height: 1.6;
          margin-bottom: 0;
        }

        .func-kpis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(165px, 1fr));
          gap: 14px;
        }

        .func-kpi {
          background:
            radial-gradient(circle at top right, rgba(30,155,255,.15), transparent 36%),
            linear-gradient(180deg, rgba(6,26,47,.95), rgba(2,11,22,.98));
          border: 1px solid rgba(30,155,255,.70);
          border-radius: 22px;
          padding: 18px;
          min-width: 0;
          box-shadow: 0 0 24px rgba(30,155,255,.10);
        }

        .func-kpi small {
          display: block;
          color: #9fb1cc;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: .05em;
          text-transform: uppercase;
        }

        .func-kpi strong {
          display: block;
          margin-top: 8px;
          font-size: clamp(22px, 2vw, 30px);
          line-height: 1.08;
          font-weight: 950;
          word-break: normal;
        }

        .func-box {
          background: linear-gradient(180deg, rgba(6,26,47,.90), rgba(2,11,22,.96));
          border: 1px solid rgba(30,107,184,.75);
          border-radius: 24px;
          padding: 20px;
          margin-bottom: 16px;
          box-sizing: border-box;
        }

        .func-two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .func-import-card {
          background: rgba(255,255,255,.045);
          border: 1px solid rgba(30,155,255,.35);
          border-radius: 18px;
          padding: 18px;
        }

        .func-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 14px;
          align-items: end;
        }

        .func-chart {
          display: grid;
          gap: 10px;
        }

        .func-chart-row {
          display: grid;
          grid-template-columns: 230px minmax(0, 1fr) 42px;
          gap: 12px;
          align-items: center;
        }

        .func-chart-label {
          color: #dce8f8;
          font-size: 13px;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .func-chart-track {
          height: 12px;
          border-radius: 999px;
          background: rgba(255,255,255,.07);
          overflow: hidden;
        }

        .func-chart-bar {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #3b82f6, #22d3ee);
          box-shadow: 0 0 18px rgba(34,211,238,.35);
          animation: growBar .6s ease both;
        }

        @keyframes growBar {
          from { width: 0; }
        }

        .func-cards {
          display: grid;
          grid-template-columns: repeat(3, minmax(280px, 1fr));
          gap: 16px;
        }

        .func-card {
          position: relative;
          background:
            radial-gradient(circle at top right, rgba(30,155,255,.14), transparent 34%),
            linear-gradient(180deg, rgba(17,47,82,.95), rgba(7,20,39,.98));
          border: 1px solid rgba(30,107,184,.65);
          border-radius: 22px;
          padding: 18px;
          min-height: 210px;
          cursor: pointer;
          overflow: hidden;
          transition: .22s ease;
          box-shadow: 0 14px 40px rgba(0,0,0,.18);
          animation: fadeUp .35s ease both;
        }

        .func-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent, rgba(30,155,255,.18), transparent);
          opacity: 0;
          transition: .25s ease;
        }

        .func-card:hover {
          transform: translateY(-5px) scale(1.01);
          border-color: #1e9bff;
          box-shadow: 0 0 32px rgba(30,155,255,.22);
        }

        .func-card:hover::before {
          opacity: 1;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .func-card-content {
          position: relative;
          z-index: 1;
        }

        .func-name {
          font-size: 17px;
          font-weight: 950;
          line-height: 1.25;
          padding-right: 70px;
        }

        .func-cargo {
          color: #9fb1cc;
          font-size: 13px;
          margin-top: 8px;
          text-transform: uppercase;
          min-height: 34px;
        }

        .func-info {
          display: grid;
          gap: 6px;
          margin-top: 14px;
          color: #dce8f8;
          font-size: 13px;
        }

        .func-active {
          position: absolute;
          top: 14px;
          right: 14px;
          background: linear-gradient(90deg, #22c55e, #16a34a);
          color: white;
          font-weight: 950;
          font-size: 11px;
          padding: 6px 10px;
          border-radius: 999px;
          animation: pulseActive 1.8s infinite;
          z-index: 2;
        }

        @keyframes pulseActive {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,.42); }
          70% { box-shadow: 0 0 0 9px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }

        .func-inactive {
          position: absolute;
          top: 14px;
          right: 14px;
          background: rgba(255,49,49,.18);
          color: #ff4d4d;
          border: 1px solid #ff4d4d;
          font-weight: 950;
          font-size: 11px;
          padding: 6px 10px;
          border-radius: 999px;
          z-index: 2;
        }

        .func-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 16px;
          position: relative;
          z-index: 2;
        }

        .func-pagination {
          margin-top: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .func-page-btn {
          min-width: 44px;
          height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.07);
          color: #dce8f8;
          font-weight: 950;
          cursor: pointer;
          transition: .2s ease;
        }

        .func-page-btn:hover {
          transform: translateY(-2px);
          border-color: #1e9bff;
        }

        .func-page-btn.active {
          background: linear-gradient(135deg, #2a67df, #1e9bff);
          border-color: #1e9bff;
          color: white;
          box-shadow: 0 0 20px rgba(30,155,255,.35);
        }

        .modal-func-overlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: rgba(0,0,0,.76);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 32px;
          overflow-y: auto;
          animation: modalFade .18s ease;
        }

        .modal-func-card {
          width: min(820px, 96vw);
          max-height: calc(100vh - 64px);
          overflow: auto;
          background: linear-gradient(180deg, #071d35 0%, #020b16 100%);
          border: 1px solid #1e9bff;
          border-radius: 28px;
          color: white;
          box-shadow: 0 40px 120px rgba(0,0,0,.65), 0 0 40px rgba(30,155,255,.22);
          animation: modalUp .2s ease;
        }

        .modal-func-header {
          padding: 26px;
          border-bottom: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(circle at top left, rgba(30,155,255,.24), transparent 35%),
            linear-gradient(135deg, rgba(30,155,255,.12), rgba(255,255,255,.03));
        }

        .modal-func-body {
          padding: 24px 26px 26px;
        }

        .modal-func-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 14px;
        }

        .modal-info-box {
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 18px;
          padding: 16px;
        }

        .modal-info-box small {
          color: #9fb1cc;
          font-weight: 900;
          text-transform: uppercase;
          font-size: 11px;
        }

        .modal-info-box strong {
          display: block;
          margin-top: 7px;
          font-size: 18px;
          color: white;
          word-break: break-word;
        }

        @keyframes modalFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalUp {
          from {
            opacity: 0;
            transform: translateY(18px) scale(.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 1100px) {
          .func-hero,
          .func-two {
            grid-template-columns: 1fr;
          }

          .func-cards {
            grid-template-columns: repeat(2, minmax(260px, 1fr));
          }
        }

        @media (max-width: 760px) {
          .func-cards {
            grid-template-columns: 1fr;
          }

          .func-chart-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="func-hero">
        <div className="func-title">
          <div className="func-title-icon">👥</div>
          <h2>Gestão de Funcionários</h2>
          <p>
            Controle corporativo de equipe, folha estimada, benefícios padrão,
            ponto Control iD e visão executiva por cargo.
          </p>
        </div>

        <div className="func-kpis">
          <Kpi title="Total funcionários" value={resumo.total} />
          <Kpi title="Ativos" value={resumo.ativos} color="#30d158" />
          <Kpi title="Inativos" value={resumo.inativos} color="#ff3131" />
          <Kpi
            title="Folha estimada"
            value={formatarMoeda(resumo.folha)}
            color="#1e9bff"
            subtitle="Salário + VR + VA"
          />
          <Kpi title="Média de idade" value={resumo.mediaIdade} color="#facc15" />
        </div>
      </div>

      {mensagem && (
        <div
          style={{
            ...styles.info,
            background: "#ecfff3",
            color: "#0f7a34",
            border: "1px solid #b7ecc8",
          }}
        >
          {mensagem}
        </div>
      )}

      {erro && (
        <div
          style={{
            ...styles.info,
            background: "#fff0f0",
            color: colors.danger,
            border: "1px solid #f3bbbb",
          }}
        >
          {erro}
        </div>
      )}

      <div className="func-two">
        <div className="func-box">
          <div style={styles.label}>📥 Importar funcionários</div>
          <div className="func-import-card">
            <p style={{ color: "#9fb1cc", marginTop: 0 }}>
              Aceita matrícula, nome, salário, cargo, admissão e nascimento.
            </p>

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={importarExcel}
              style={styles.input}
              disabled={importando}
            />

            {importando && (
              <div style={{ marginTop: 10, color: "#1e9bff", fontWeight: 900 }}>
                Importando funcionários...
              </div>
            )}
          </div>
        </div>

        <div className="func-box">
          <div style={styles.label}>⏱️ Control iD</div>
          <div className="func-import-card">
            <p style={{ color: "#9fb1cc", marginTop: 0 }}>
              Use o relatório em HTML para futura leitura automática do ponto.
            </p>

            <input
              type="file"
              accept=".html,.htm"
              onChange={importarControlIdHtml}
              style={styles.input}
              disabled={importandoPonto}
            />
          </div>
        </div>
      </div>

      <div className="func-box">
        <div style={styles.label}>
          {editandoId ? "✏️ Editar funcionário" : "➕ Cadastrar funcionário"}
        </div>

        <div className="func-form-grid">
          <Input label="Nome *" value={form.nome} onChange={(v) => alterar("nome", v)} styles={styles} />
          <Input label="Matrícula" value={form.matricula} onChange={(v) => alterar("matricula", v)} styles={styles} />
          <Input label="Cargo" value={form.cargo} onChange={(v) => alterar("cargo", v)} styles={styles} />

          <div>
            <div style={styles.label}>Data de admissão</div>
            <input
              type="date"
              style={styles.input}
              value={form.data_admissao}
              onChange={(e) => alterar("data_admissao", e.target.value)}
            />
          </div>

          <div>
            <div style={styles.label}>Data de nascimento</div>
            <input
              type="date"
              style={styles.input}
              value={form.data_nascimento}
              onChange={(e) => alterar("data_nascimento", e.target.value)}
            />
          </div>

          <Input
            label="Salário"
            type="number"
            value={form.salario}
            onChange={(v) => alterar("salario", v)}
            styles={styles}
          />

          <div>
            <div style={styles.label}>Benefícios padrão</div>
            <input
              style={styles.input}
              disabled
              value={`VR ${formatarMoeda(VR_DIA)}/dia + VA ${formatarMoeda(VA_MES)}/mês`}
            />
          </div>

          <Input
            label="Carga horária"
            value={form.carga_horaria}
            onChange={(v) => alterar("carga_horaria", v)}
            styles={styles}
            placeholder="Ex: 44h semanais"
          />

          <div>
            <div style={styles.label}>Status</div>
            <select
              style={styles.input}
              value={form.ativo ? "ativo" : "inativo"}
              onChange={(e) => alterar("ativo", e.target.value === "ativo")}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
          <button style={styles.primaryButton} onClick={salvarFuncionario}>
            {editandoId ? "Salvar alterações" : "Cadastrar funcionário"}
          </button>

          {editandoId && (
            <button style={styles.secondaryButton} onClick={limparForm}>
              Cancelar edição
            </button>
          )}
        </div>
      </div>

      <div className="func-box">
        <div style={styles.label}>📊 Funcionários por cargo</div>

        <div className="func-chart">
          {cargosGrafico.map(([cargo, qtd]) => (
            <div key={cargo} className="func-chart-row">
              <div className="func-chart-label">{cargo}</div>

              <div className="func-chart-track">
                <div
                  className="func-chart-bar"
                  style={{ width: `${(qtd / maiorCargo) * 100}%` }}
                />
              </div>

              <strong>{qtd}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="func-box">
        <div style={styles.label}>🔎 Filtros</div>

        <div className="func-form-grid">
          <input
            style={styles.input}
            placeholder="Buscar por nome, matrícula ou cargo..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
          />

          <select
            style={styles.input}
            value={filtroCargo}
            onChange={(e) => {
              setFiltroCargo(e.target.value);
              setPagina(1);
            }}
          >
            <option value="todos">Todos os cargos</option>
            {cargos.map((cargo) => (
              <option key={cargo} value={cargo}>
                {cargo}
              </option>
            ))}
          </select>

          <select
            style={styles.input}
            value={filtroStatus}
            onChange={(e) => {
              setFiltroStatus(e.target.value);
              setPagina(1);
            }}
          >
            <option value="todos">Todos os status</option>
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
          </select>
        </div>
      </div>

      <div style={{ ...styles.label, marginBottom: 14 }}>
        📋 Funcionários cadastrados
      </div>

      <div className="func-cards">
        {funcionariosPagina.map((f, index) => (
          <div
            key={f.id}
            className="func-card"
            style={{ animationDelay: `${index * 0.04}s` }}
            onClick={() => setModalFuncionario(f)}
          >
            <div className={f.ativo !== false ? "func-active" : "func-inactive"}>
              {f.ativo !== false ? "Ativo" : "Inativo"}
            </div>

            <div className="func-card-content">
              <div className="func-name">{f.nome}</div>
              <div className="func-cargo">{f.cargo || "Sem cargo"}</div>

              <div className="func-info">
                <div>👤 {calcularIdade(f.data_nascimento)} anos</div>
                <div>💰 {formatarMoeda(f.salario)}</div>
                <div>🍽 VR {formatarMoeda(VR_DIA)}/dia</div>
                <div>🏦 VA {formatarMoeda(VA_MES)}/mês</div>
                <div>🏖️ {statusFerias(f)}</div>
              </div>

              <div className="func-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  style={styles.secondaryButton}
                  onClick={() => editarFuncionario(f)}
                >
                  ✏️ Editar
                </button>

                <button
                  style={styles.dangerButton}
                  onClick={() => excluirFuncionario(f.id)}
                >
                  🗑️ Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Paginacao
        pagina={pagina}
        totalPaginas={totalPaginas}
        setPagina={setPagina}
        colors={colors}
      />

      {modalFuncionario && (
        <FuncionarioModal
          funcionario={modalFuncionario}
          styles={styles}
          onClose={() => setModalFuncionario(null)}
        />
      )}
    </div>
  );
}

function Kpi({ title, value, color = "white", subtitle }) {
  return (
    <div className="func-kpi">
      <small>{title}</small>
      <strong style={{ color }}>{value}</strong>
      {subtitle && (
        <div style={{ color: "#9fb1cc", fontSize: 12, marginTop: 8 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, styles, type = "text", placeholder = "" }) {
  return (
    <div>
      <div style={styles.label}>{label}</div>
      <input
        type={type}
        style={styles.input}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Paginacao({ pagina, totalPaginas, setPagina, colors }) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="func-pagination">
      <button
        className="func-page-btn"
        disabled={pagina === 1}
        onClick={() => setPagina((p) => Math.max(1, p - 1))}
        style={{ opacity: pagina === 1 ? 0.45 : 1 }}
      >
        ‹
      </button>

      {Array.from({ length: totalPaginas })
        .map((_, i) => i + 1)
        .filter((n) => n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 2)
        .map((n, index, arr) => (
          <React.Fragment key={n}>
            {index > 0 && n - arr[index - 1] > 1 && (
              <span style={{ color: colors.muted, padding: "0 4px" }}>
                ...
              </span>
            )}

            <button
              className={`func-page-btn ${pagina === n ? "active" : ""}`}
              onClick={() => setPagina(n)}
            >
              {n}
            </button>
          </React.Fragment>
        ))}

      <button
        className="func-page-btn"
        disabled={pagina === totalPaginas}
        onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
        style={{ opacity: pagina === totalPaginas ? 0.45 : 1 }}
      >
        ›
      </button>
    </div>
  );
}

function FuncionarioModal({ funcionario, styles, onClose }) {
  const idade = calcularIdade(funcionario.data_nascimento);
  const vencimento = addMeses(funcionario.data_admissao, 12);
  const prazo = addMeses(funcionario.data_admissao, 23);
  const status = statusFerias(funcionario);
  const custoMensal =
    Number(funcionario.salario || 0) + beneficiosPadraoMensal();

  return createPortal(
    <div className="modal-func-overlay" onClick={onClose}>
      <div className="modal-func-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-func-header">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
            <div>
              <div style={{ fontSize: 38, marginBottom: 10 }}>👤</div>
              <h2 style={{ margin: 0, fontSize: 28 }}>{funcionario.nome}</h2>
              <div style={{ color: "#9fb1cc", marginTop: 8 }}>
                {funcionario.cargo || "Sem cargo"} • Matrícula{" "}
                {funcionario.matricula || "-"}
              </div>
            </div>

            <span
              style={{
                height: "fit-content",
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${corStatusFerias(status)}`,
                color: corStatusFerias(status),
                background: `${corStatusFerias(status)}22`,
                fontWeight: 950,
              }}
            >
              {status}
            </span>
          </div>
        </div>

        <div className="modal-func-body">
          <div className="modal-func-grid">
            <InfoBox label="Idade" value={`${idade} anos`} />
            <InfoBox label="Admissão" value={formatarData(funcionario.data_admissao)} />
            <InfoBox label="Nascimento" value={formatarData(funcionario.data_nascimento)} />
            <InfoBox label="Carga horária" value={funcionario.carga_horaria || "-"} />
          </div>

          <div style={{ ...styles.label, marginTop: 24, marginBottom: 12 }}>
            💰 Financeiro
          </div>

          <div className="modal-func-grid">
            <InfoBox label="Salário" value={formatarMoeda(funcionario.salario)} />
            <InfoBox label="VR diário" value={formatarMoeda(VR_DIA)} />
            <InfoBox label="VA mensal" value={formatarMoeda(VA_MES)} />
            <InfoBox label="Benefícios/mês" value={formatarMoeda(beneficiosPadraoMensal())} />
            <InfoBox label="Custo mensal estimado" value={formatarMoeda(custoMensal)} />
          </div>

          <div style={{ ...styles.label, marginTop: 24, marginBottom: 12 }}>
            🏖️ Férias
          </div>

          <div className="modal-func-grid">
            <InfoBox label="Férias vencem em" value={formatarData(vencimento)} />
            <InfoBox label="Prazo máximo" value={formatarData(prazo)} />
            <InfoBox
              label="Programada"
              value={
                funcionario.data_ferias_inicio
                  ? `${formatarData(funcionario.data_ferias_inicio)} até ${formatarData(
                      funcionario.data_ferias_fim
                    )}`
                  : "-"
              }
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button style={styles.secondaryButton} onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="modal-info-box">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}