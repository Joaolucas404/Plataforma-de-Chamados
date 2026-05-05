import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { supabase } from "../App";

const formInicial = {
  funcionario_id: "",
  data_inicio: "",
  data_fim: "",
  status: "Marcada",
  observacao: "",
};

const VR_DIA = 23.9;
const VA_MES = 340;

function formatarData(data) {
  if (!data) return "-";
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function diffDias(inicio, fim) {
  if (!inicio || !fim) return 0;
  const a = new Date(inicio + "T00:00:00");
  const b = new Date(fim + "T00:00:00");
  return Math.max(1, Math.ceil((b - a) / 86400000) + 1);
}

function adicionarDias(data, dias) {
  if (!data) return null;
  const d = new Date(`${data}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function addMeses(data, meses) {
  if (!data) return null;
  const d = new Date(data + "T00:00:00");
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
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
    const partes = texto.split("/");
    if (partes.length !== 3) return null;

    const [dia, mes, ano] = partes;
    return `${String(ano).padStart(4, "20")}-${String(mes).padStart(
      2,
      "0"
    )}-${String(dia).padStart(2, "0")}`;
  }

  if (texto.includes("-")) return texto.slice(0, 10);

  return null;
}

function getValorLinha(linha, nomesPossiveis) {
  const chaves = Object.keys(linha);

  for (const nome of nomesPossiveis) {
    const chave = chaves.find((c) => limparTexto(c) === limparTexto(nome));
    if (chave) return linha[chave];
  }

  return "";
}

function statusFerias(f) {
  if (!f?.data_admissao) return "Sem admissão";

  const hoje = new Date();
  const venc = new Date(addMeses(f.data_admissao, 12) + "T00:00:00");
  const prazo = new Date(addMeses(f.data_admissao, 23) + "T00:00:00");

  if (f.data_ferias_inicio && f.data_ferias_fim) return "Férias programadas";
  if (hoje > prazo) return "Prazo vencido";
  if ((prazo - hoje) / 86400000 <= 60) return "Prazo próximo";
  if (hoje > venc) return "Férias vencidas";
  if ((venc - hoje) / 86400000 <= 60) return "Férias próximas";

  return "OK";
}

function corStatus(status) {
  const s = String(status || "").toLowerCase();

  if (s.includes("programada")) return "#1e9bff";
  if (s.includes("vencido") || s.includes("vencida")) return "#ff3131";
  if (s.includes("próximo") || s.includes("proximo")) return "#ff9f1a";
  if (s.includes("marcada")) return "#a855f7";
  if (s.includes("andamento")) return "#1e9bff";
  if (s.includes("conclu")) return "#30d158";
  if (s.includes("cancel")) return "#9ca3af";

  return "#30d158";
}

function ModalPortal({ children }) {
  return createPortal(children, document.body);
}

export default function FeriasPage({ styles, colors, usuario }) {
  const [funcionarios, setFuncionarios] = useState([]);
  const [ferias, setFerias] = useState([]);
  const [form, setForm] = useState(formInicial);
  const [busca, setBusca] = useState("");
  const [filtroCargo, setFiltroCargo] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [paginaFeriasMarcadas, setPaginaFeriasMarcadas] = useState(1);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [modalFuncionario, setModalFuncionario] = useState(null);
  const [modalProgramadas, setModalProgramadas] = useState(false);

  const itensPorPagina = 6;
  const feriasMarcadasPorPagina = 8;
  const isGestor = usuario?.perfil === "gestor";

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data: funcs, error: erroFuncionarios } = await supabase
      .from("funcionarios")
      .select("*")
      .order("nome", { ascending: true });

    const { data: feriasData, error: erroFerias } = await supabase
      .from("ferias_funcionarios")
      .select("*, funcionarios(nome, cargo, matricula, salario, beneficios)")
      .order("data_inicio", { ascending: false });

    if (erroFuncionarios || erroFerias) {
      console.error(erroFuncionarios || erroFerias);
      setErro("Erro ao carregar dados de férias.");
      return;
    }

    setFuncionarios(funcs || []);
    setFerias(feriasData || []);
  }

  function alterar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  const funcionarioSelecionado = funcionarios.find(
    (f) => String(f.id) === String(form.funcionario_id)
  );

  const dias = diffDias(form.data_inicio, form.data_fim);

  const impacto =
    funcionarioSelecionado && dias
      ? ((Number(funcionarioSelecionado.salario || 0) +
          Number(funcionarioSelecionado.beneficios || 0)) /
          30) *
        dias
      : 0;

  const cargos = useMemo(() => {
    return [...new Set(funcionarios.map((f) => f.cargo).filter(Boolean))].sort();
  }, [funcionarios]);

  const funcionariosFiltrados = useMemo(() => {
    return funcionarios.filter((f) => {
      const status = statusFerias(f);
      const termo = busca.trim().toLowerCase();

      const passaBusca =
        !termo ||
        String(f.nome || "").toLowerCase().includes(termo) ||
        String(f.matricula || "").toLowerCase().includes(termo) ||
        String(f.cargo || "").toLowerCase().includes(termo);

      const passaCargo = filtroCargo === "todos" || f.cargo === filtroCargo;
      const passaStatus = filtroStatus === "todos" || status === filtroStatus;

      return passaBusca && passaCargo && passaStatus;
    });
  }, [funcionarios, busca, filtroCargo, filtroStatus]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(funcionariosFiltrados.length / itensPorPagina)
  );

  const lista = funcionariosFiltrados.slice(
    (pagina - 1) * itensPorPagina,
    pagina * itensPorPagina
  );

  const totalPaginasFeriasMarcadas = Math.max(
    1,
    Math.ceil(ferias.length / feriasMarcadasPorPagina)
  );

  const feriasMarcadasPaginadas = ferias.slice(
    (paginaFeriasMarcadas - 1) * feriasMarcadasPorPagina,
    paginaFeriasMarcadas * feriasMarcadasPorPagina
  );

  const resumo = useMemo(() => {
    const proximas = funcionarios.filter((f) =>
      ["Férias próximas", "Prazo próximo"].includes(statusFerias(f))
    ).length;

    const vencidas = funcionarios.filter((f) =>
      ["Férias vencidas", "Prazo vencido"].includes(statusFerias(f))
    ).length;

    const programadas = funcionarios.filter(
      (f) => statusFerias(f) === "Férias programadas"
    ).length;

    const impactoTotal = ferias.reduce(
      (total, item) => total + Number(item.impacto_financeiro || 0),
      0
    );

    return {
      proximas,
      vencidas,
      programadas,
      impactoTotal,
      totalFuncionarios: funcionarios.length,
    };
  }, [funcionarios, ferias]);

  async function salvarFerias() {
    setErro("");
    setMensagem("");

    if (!form.funcionario_id || !form.data_inicio || !form.data_fim) {
      setErro("Selecione funcionário, data inicial e data final.");
      return;
    }

    setSalvando(true);

    const payload = {
      funcionario_id: Number(form.funcionario_id),
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      dias,
      status: form.status,
      impacto_financeiro: impacto,
      observacao: form.observacao,
    };

    const { error } = await supabase.from("ferias_funcionarios").insert(payload);

    if (error) {
      console.error(error);
      setErro("Erro ao marcar férias.");
      setSalvando(false);
      return;
    }

    await supabase
      .from("funcionarios")
      .update({
        data_ferias_inicio: form.data_inicio,
        data_ferias_fim: form.data_fim,
      })
      .eq("id", form.funcionario_id);

    setMensagem("Férias marcadas com sucesso.");
    setForm(formInicial);
    setSalvando(false);
    carregar();
  }

  async function importarFeriasExcel(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    setErro("");
    setMensagem("");
    setImportando(true);

    try {
      const buffer = await arquivo.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
      });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const matriz = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
      });

      const linhaCabecalhoIndex = matriz.findIndex((linha) => {
        const temMatricula = linha.some((celula) =>
          limparTexto(celula).includes("matricula")
        );

        const temGozo = linha.some((celula) =>
          limparTexto(celula).includes("gozo")
        );

        return temMatricula && temGozo;
      });

      if (linhaCabecalhoIndex === -1) {
        setErro("Não encontrei as colunas Matrícula e gozo férias na planilha.");
        setImportando(false);
        return;
      }

      const cabecalhos = matriz[linhaCabecalhoIndex];

      const linhas = matriz.slice(linhaCabecalhoIndex + 1).map((linha) => {
        const obj = {};

        cabecalhos.forEach((cabecalho, index) => {
          if (cabecalho) obj[cabecalho] = linha[index];
        });

        return obj;
      });

      let importadas = 0;
      const naoEncontradas = [];
      const semData = [];

      for (const linha of linhas) {
        const matricula = String(
          getValorLinha(linha, ["Matrícula", "Matricula"])
        ).trim();

        const inicio = normalizarData(
          getValorLinha(linha, [
            "Início gozo férias",
            "Inicio gozo ferias",
            "Início Gozo Férias",
            "Inicio Gozo Ferias",
            "gozo férias",
            "Gozo Férias",
            "gozo ferias",
            "Gozo Ferias",
            "Início",
            "Inicio",
            "Data início",
            "Data Inicio",
          ])
        );

        if (!matricula && !inicio) continue;
        if (!matricula) continue;

        if (!inicio) {
          semData.push(matricula);
          continue;
        }

        const funcionario = funcionarios.find(
          (f) => String(f.matricula || "").trim() === matricula
        );

        if (!funcionario) {
          naoEncontradas.push(matricula);
          continue;
        }

        const fim = adicionarDias(inicio, 29);

        if (!fim) {
          semData.push(matricula);
          continue;
        }

        const impactoFerias =
          ((Number(funcionario.salario || 0) +
            Number(funcionario.beneficios || 0)) /
            30) *
          30;

        const { error } = await supabase.from("ferias_funcionarios").insert({
          funcionario_id: funcionario.id,
          data_inicio: inicio,
          data_fim: fim,
          dias: 30,
          status: "Marcada",
          impacto_financeiro: impactoFerias,
          observacao: "Importado por planilha de férias",
        });

        if (error) {
          console.error(error);
          continue;
        }

        await supabase
          .from("funcionarios")
          .update({
            data_ferias_inicio: inicio,
            data_ferias_fim: fim,
          })
          .eq("id", funcionario.id);

        importadas++;
      }

      let texto = `${importadas} férias importadas com sucesso.`;

      if (naoEncontradas.length) {
        texto += ` Matrículas não encontradas: ${naoEncontradas.join(", ")}.`;
      }

      if (semData.length) {
        texto += ` Matrículas sem data de início: ${semData.join(", ")}.`;
      }

      setMensagem(texto);
      setImportando(false);
      event.target.value = "";
      carregar();
    } catch (error) {
      console.error(error);
      setErro("Erro ao importar planilha de férias.");
      setImportando(false);
    }
  }

  async function excluirFerias(id) {
    const confirmar = confirm("Deseja excluir este registro de férias?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("ferias_funcionarios")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      setErro("Erro ao excluir férias.");
      return;
    }

    setMensagem("Férias excluídas com sucesso.");
    carregar();
  }

  function selecionarFuncionarioDoModal(f) {
    setForm((atual) => ({
      ...atual,
      funcionario_id: f.id,
    }));

    setModalFuncionario(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function historicoDoFuncionario(id) {
    return ferias.filter((item) => String(item.funcionario_id) === String(id));
  }

  if (!isGestor) {
    return (
      <div style={styles.sectionCard}>
        <h2>Acesso restrito</h2>
        <p style={{ color: colors.muted }}>Apenas gestor pode acessar férias.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        ...styles.sectionCard,
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .ferias-hero {
          display: grid;
          grid-template-columns: minmax(300px, 1.1fr) minmax(0, 2fr);
          gap: 16px;
          margin-bottom: 18px;
        }

        .ferias-title {
          background: linear-gradient(135deg, rgba(30,155,255,.15), rgba(2,11,22,.95));
          border: 1px solid #1e6bb8;
          border-radius: 24px;
          padding: 24px;
          color: white;
          min-height: 170px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .ferias-kpis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
        }

        .ferias-kpi {
          background: linear-gradient(180deg, rgba(6,26,47,.95), rgba(2,11,22,.98));
          border: 1px solid #1e6bb8;
          border-radius: 20px;
          padding: 18px;
          color: white;
          box-shadow: 0 0 24px rgba(30,155,255,.10);
          min-width: 0;
          transition: .2s ease;
        }

        .ferias-kpi.clickable {
          cursor: pointer;
        }

        .ferias-kpi.clickable:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 26px rgba(30,155,255,.22);
        }

        .ferias-kpi small {
          display: block;
          color: #9fb1cc;
          font-weight: 900;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: .04em;
        }

        .ferias-kpi strong {
          display: block;
          margin-top: 8px;
          font-size: clamp(22px, 2vw, 30px);
          font-weight: 950;
          word-break: break-word;
          line-height: 1.08;
        }

        .ferias-box {
          background: linear-gradient(180deg, rgba(6,26,47,.90), rgba(2,11,22,.96));
          border: 1px solid rgba(30,107,184,.75);
          border-radius: 24px;
          padding: 20px;
          color: white;
          margin-bottom: 16px;
          box-sizing: border-box;
        }

        .ferias-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 14px;
          align-items: end;
        }

        .func-ferias-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 14px;
          width: 100%;
          overflow: hidden;
        }

        .ferias-card {
          background: linear-gradient(180deg, rgba(17,47,82,.92), rgba(10,31,55,.92));
          border: 1px solid rgba(30,107,184,.65);
          border-radius: 20px;
          padding: 18px;
          min-width: 0;
          transition: .2s ease;
          box-shadow: 0 14px 40px rgba(0,0,0,.12);
          cursor: pointer;
        }

        .ferias-card:hover {
          transform: translateY(-3px);
          border-color: #1e9bff;
          box-shadow: 0 0 30px rgba(30,155,255,.22);
        }

        .ferias-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 11px;
          border-radius: 999px;
          border: 1px solid currentColor;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }

        .ferias-meta {
          display: grid;
          gap: 6px;
          margin-top: 12px;
          color: #b7c8dd;
          font-size: 14px;
          line-height: 1.45;
        }

        .ferias-meta strong {
          color: white;
        }

        .pagination-premium {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin-top: 18px;
          flex-wrap: wrap;
        }

        .page-btn {
          min-width: 42px;
          height: 42px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.06);
          color: #dce8f8;
          font-weight: 950;
          cursor: pointer;
          transition: .2s ease;
        }

        .page-btn:hover {
          transform: translateY(-2px);
          border-color: #1e9bff;
        }

        .page-btn.active {
          background: linear-gradient(135deg, #2a67df 0%, #1658d1 100%);
          color: white;
          border-color: #1e9bff;
          box-shadow: 0 0 18px rgba(30,155,255,.35);
        }

        .ferias-history {
          display: grid;
          gap: 12px;
        }

        .modal-ferias-overlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: rgba(0,0,0,.74);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 28px;
          overflow-y: auto;
          animation: modalFade .18s ease;
        }

        .modal-ferias-card {
          width: min(860px, 96vw);
          max-height: calc(100vh - 56px);
          overflow: auto;
          background: linear-gradient(180deg, #071d35 0%, #020b16 100%);
          border: 1px solid #1e9bff;
          border-radius: 28px;
          color: white;
          box-shadow: 0 40px 120px rgba(0,0,0,.65), 0 0 40px rgba(30,155,255,.22);
          animation: modalUp .2s ease;
        }

        .modal-header {
          padding: 26px;
          border-bottom: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(circle at top left, rgba(30,155,255,.22), transparent 35%),
            linear-gradient(135deg, rgba(30,155,255,.10), rgba(255,255,255,.03));
        }

        .modal-body {
          padding: 24px 26px 26px;
        }

        .modal-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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

        .modal-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 20px;
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

        @media (max-width: 1000px) {
          .ferias-hero {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ferias-hero">
        <div className="ferias-title">
          <div style={{ fontSize: 42, marginBottom: 12 }}>🏖️</div>
          <h2 style={{ margin: 0, fontSize: 30 }}>Gestão de Férias</h2>
          <p style={{ color: "#9fb1cc", lineHeight: 1.6, marginBottom: 0 }}>
            Controle vencimentos, prazos máximos, férias programadas e impacto
            financeiro da operação.
          </p>
        </div>

        <div className="ferias-kpis">
          <div className="ferias-kpi">
            <small>Total funcionários</small>
            <strong>{resumo.totalFuncionarios}</strong>
          </div>

          <div className="ferias-kpi">
            <small>Férias próximas</small>
            <strong style={{ color: "#facc15" }}>{resumo.proximas}</strong>
          </div>

          <div className="ferias-kpi">
            <small>Férias vencidas</small>
            <strong style={{ color: "#ff3131" }}>{resumo.vencidas}</strong>
          </div>

          <div
            className="ferias-kpi clickable"
            onClick={() => setModalProgramadas(true)}
            title="Clique para ver funcionários com férias programadas"
          >
            <small>Programadas</small>
            <strong style={{ color: "#1e9bff" }}>{resumo.programadas}</strong>
          </div>

          <div className="ferias-kpi">
            <small>Impacto financeiro</small>
            <strong style={{ color: "#a855f7", fontSize: 22 }}>
              {formatarMoeda(resumo.impactoTotal)}
            </strong>
          </div>
        </div>
      </div>

      {mensagem && (
        <div
          style={{
            ...styles.info,
            background: "#ecfff3",
            border: "1px solid #b7ecc8",
            color: "#0f7a34",
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
            border: "1px solid #f3bbbb",
            color: colors.danger,
          }}
        >
          {erro}
        </div>
      )}

      <div className="ferias-box">
        <div style={styles.label}>📥 Importar férias por Excel</div>

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={importarFeriasExcel}
          style={styles.input}
          disabled={importando}
        />

        <div style={{ marginTop: 10, color: "#9fb1cc", fontSize: 13 }}>
          O sistema procura automaticamente as colunas{" "}
          <strong>Matrícula</strong> e <strong>gozo férias</strong>. O fim será
          calculado automaticamente com 30 dias corridos.
        </div>

        {importando && (
          <div style={{ marginTop: 10, color: "#1e9bff", fontWeight: 900 }}>
            Importando férias...
          </div>
        )}
      </div>

      <div className="ferias-box">
        <div style={styles.label}>📅 Marcar férias</div>

        <div className="ferias-grid">
          <div>
            <div style={styles.label}>Funcionário</div>
            <select
              style={styles.input}
              value={form.funcionario_id}
              onChange={(e) => alterar("funcionario_id", e.target.value)}
            >
              <option value="">Selecione</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome} — {f.cargo || "Sem cargo"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={styles.label}>Data início</div>
            <input
              type="date"
              style={styles.input}
              value={form.data_inicio}
              onChange={(e) => alterar("data_inicio", e.target.value)}
            />
          </div>

          <div>
            <div style={styles.label}>Data fim</div>
            <input
              type="date"
              style={styles.input}
              value={form.data_fim}
              onChange={(e) => alterar("data_fim", e.target.value)}
            />
          </div>

          <div>
            <div style={styles.label}>Status</div>
            <select
              style={styles.input}
              value={form.status}
              onChange={(e) => alterar("status", e.target.value)}
            >
              <option>Marcada</option>
              <option>Em andamento</option>
              <option>Concluída</option>
              <option>Cancelada</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={styles.label}>Observação</div>
          <textarea
            style={styles.textarea}
            placeholder="Observação opcional..."
            value={form.observacao}
            onChange={(e) => alterar("observacao", e.target.value)}
          />
        </div>

        <div
          style={{
            ...styles.softBox,
            marginTop: 14,
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div>
            Dias: <strong>{dias}</strong>
          </div>

          <div>
            Impacto estimado: <strong>{formatarMoeda(impacto)}</strong>
          </div>
        </div>

        <button
          style={{ ...styles.primaryButton, marginTop: 16 }}
          onClick={salvarFerias}
          disabled={salvando}
        >
          {salvando ? "Salvando..." : "💾 Marcar férias"}
        </button>
      </div>

      <div className="ferias-box">
        <div style={styles.label}>🔎 Filtros</div>

        <div className="ferias-grid">
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
            <option>OK</option>
            <option>Férias próximas</option>
            <option>Férias vencidas</option>
            <option>Prazo próximo</option>
            <option>Prazo vencido</option>
            <option>Férias programadas</option>
          </select>
        </div>
      </div>

      <div style={{ ...styles.label, marginBottom: 14 }}>
        📋 Situação dos funcionários
      </div>

      <div className="func-ferias-grid">
        {lista.map((f) => {
          const status = statusFerias(f);
          const vencimento = addMeses(f.data_admissao, 12);
          const prazo = addMeses(f.data_admissao, 23);

          return (
            <div
              key={f.id}
              className="ferias-card"
              onClick={() => setModalFuncionario(f)}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "start",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: "white",
                      fontWeight: 950,
                      fontSize: 16,
                      lineHeight: 1.3,
                    }}
                  >
                    {f.nome}
                  </div>

                  <div style={{ color: "#9fb1cc", marginTop: 5, fontSize: 13 }}>
                    {f.cargo || "Sem cargo"}
                  </div>
                </div>

                <span
                  className="ferias-pill"
                  style={{
                    color: corStatus(status),
                    background: `${corStatus(status)}22`,
                  }}
                >
                  {status}
                </span>
              </div>

              <div className="ferias-meta">
                <div>
                  Matrícula: <strong>{f.matricula || "-"}</strong>
                </div>
                <div>
                  Admissão: <strong>{formatarData(f.data_admissao)}</strong>
                </div>
                <div>
                  Férias vencem em: <strong>{formatarData(vencimento)}</strong>
                </div>
                <div>
                  Prazo máximo: <strong>{formatarData(prazo)}</strong>
                </div>
                <div>
                  Programada:{" "}
                  <strong>
                    {f.data_ferias_inicio
                      ? `${formatarData(f.data_ferias_inicio)} até ${formatarData(
                          f.data_ferias_fim
                        )}`
                      : "-"}
                  </strong>
                </div>
              </div>
            </div>
          );
        })}

        {lista.length === 0 && (
          <div style={{ color: colors.muted }}>Nenhum funcionário encontrado.</div>
        )}
      </div>

      {totalPaginas > 1 && (
        <Paginacao
          pagina={pagina}
          totalPaginas={totalPaginas}
          setPagina={setPagina}
          colors={colors}
        />
      )}

      <div style={{ ...styles.label, marginTop: 28, marginBottom: 14 }}>
        🧾 Férias já marcadas
      </div>

      <div className="ferias-history">
        {feriasMarcadasPaginadas.map((item) => (
          <div
            key={item.id}
            style={{
              ...styles.softBox,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div>
              <strong>{item.funcionarios?.nome || "Funcionário"}</strong>

              <div style={{ color: colors.muted, marginTop: 5 }}>
                {formatarData(item.data_inicio)} até {formatarData(item.data_fim)} •{" "}
                {item.dias} dias • {formatarMoeda(item.impacto_financeiro)}
              </div>

              {item.observacao && (
                <div style={{ color: colors.muted, marginTop: 5 }}>
                  Obs: {item.observacao}
                </div>
              )}

              <div style={{ marginTop: 8 }}>
                <span
                  className="ferias-pill"
                  style={{
                    color: corStatus(item.status),
                    background: `${corStatus(item.status)}22`,
                  }}
                >
                  {item.status}
                </span>
              </div>
            </div>

            <button
              style={styles.dangerButton}
              onClick={() => excluirFerias(item.id)}
            >
              🗑️ Excluir
            </button>
          </div>
        ))}

        {ferias.length === 0 && (
          <div style={{ color: colors.muted }}>Nenhuma férias marcada.</div>
        )}
      </div>

      {ferias.length > feriasMarcadasPorPagina && (
        <Paginacao
          pagina={paginaFeriasMarcadas}
          totalPaginas={totalPaginasFeriasMarcadas}
          setPagina={setPaginaFeriasMarcadas}
          colors={colors}
        />
      )}

      {modalFuncionario && (
        <ModalFuncionario
          funcionario={modalFuncionario}
          historico={historicoDoFuncionario(modalFuncionario.id)}
          styles={styles}
          onClose={() => setModalFuncionario(null)}
          onSelect={() => selecionarFuncionarioDoModal(modalFuncionario)}
        />
      )}

      {modalProgramadas && (
        <ModalProgramadas
          ferias={ferias}
          styles={styles}
          onClose={() => setModalProgramadas(false)}
        />
      )}
    </div>
  );
}

function Paginacao({ pagina, totalPaginas, setPagina, colors }) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="pagination-premium">
      <button
        className="page-btn"
        disabled={pagina === 1}
        onClick={() => setPagina((p) => Math.max(1, p - 1))}
        style={{ opacity: pagina === 1 ? 0.4 : 1 }}
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
              className={`page-btn ${pagina === n ? "active" : ""}`}
              onClick={() => setPagina(n)}
            >
              {n}
            </button>
          </React.Fragment>
        ))}

      <button
        className="page-btn"
        disabled={pagina === totalPaginas}
        onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
        style={{ opacity: pagina === totalPaginas ? 0.4 : 1 }}
      >
        ›
      </button>
    </div>
  );
}

function ModalProgramadas({ ferias, styles, onClose }) {
  return (
    <ModalPortal>
      <div className="modal-ferias-overlay" onClick={onClose}>
        <div className="modal-ferias-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 style={{ margin: 0 }}>📅 Férias programadas</h2>
            <div style={{ color: "#9fb1cc", marginTop: 8 }}>
              Lista de colaboradores com férias marcadas/importadas.
            </div>
          </div>

          <div className="modal-body">
            <div style={{ display: "grid", gap: 10 }}>
              {ferias.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "rgba(255,255,255,.055)",
                    border: "1px solid rgba(255,255,255,.10)",
                    borderRadius: 16,
                    padding: 14,
                  }}
                >
                  <strong>{item.funcionarios?.nome || "Funcionário"}</strong>

                  <div style={{ color: "#9fb1cc", marginTop: 5 }}>
                    {item.funcionarios?.cargo || "-"} • Matrícula{" "}
                    {item.funcionarios?.matricula || "-"}
                  </div>

                  <div style={{ color: "#9fb1cc", marginTop: 5 }}>
                    {formatarData(item.data_inicio)} até {formatarData(item.data_fim)} •{" "}
                    {item.dias} dias • {formatarMoeda(item.impacto_financeiro)}
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <span
                      className="ferias-pill"
                      style={{
                        color: corStatus(item.status),
                        background: `${corStatus(item.status)}22`,
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}

              {ferias.length === 0 && (
                <div style={{ color: "#9fb1cc" }}>
                  Nenhuma férias programada.
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button style={styles.secondaryButton} onClick={onClose}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function ModalFuncionario({ funcionario, historico, styles, onClose, onSelect }) {
  const vencimento = addMeses(funcionario.data_admissao, 12);
  const prazo = addMeses(funcionario.data_admissao, 23);
  const status = statusFerias(funcionario);
  const vaDia = VA_MES / 30;
  const descontoDia = VR_DIA + vaDia;
  const salario = Number(funcionario.salario || 0);
  const beneficios = Number(funcionario.beneficios || 0);
  const custoDia = (salario + beneficios) / 30;

  return (
    <ModalPortal>
      <div className="modal-ferias-overlay" onClick={onClose}>
        <div className="modal-ferias-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "start",
              }}
            >
              <div>
                <div style={{ fontSize: 38, marginBottom: 8 }}>👤</div>
                <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1.2 }}>
                  {funcionario.nome}
                </h2>
                <div style={{ color: "#9fb1cc", marginTop: 8 }}>
                  {funcionario.cargo || "Sem cargo"} • Matrícula{" "}
                  {funcionario.matricula || "-"}
                </div>
              </div>

              <span
                className="ferias-pill"
                style={{
                  color: corStatus(status),
                  background: `${corStatus(status)}22`,
                }}
              >
                {status}
              </span>
            </div>
          </div>

          <div className="modal-body">
            <div className="modal-grid">
              <InfoBox label="Admissão" value={formatarData(funcionario.data_admissao)} />
              <InfoBox label="Férias vencem em" value={formatarData(vencimento)} />
              <InfoBox label="Prazo máximo" value={formatarData(prazo)} />
              <InfoBox
                label="Férias programadas"
                value={
                  funcionario.data_ferias_inicio
                    ? `${formatarData(funcionario.data_ferias_inicio)} até ${formatarData(
                        funcionario.data_ferias_fim
                      )}`
                    : "-"
                }
              />
            </div>

            <div style={{ ...styles.label, marginTop: 24, marginBottom: 12 }}>
              💰 Financeiro e benefícios
            </div>

            <div className="modal-grid">
              <InfoBox label="Salário" value={formatarMoeda(salario)} />
              <InfoBox label="Benefícios cadastrados" value={formatarMoeda(beneficios)} />
              <InfoBox label="Custo diário estimado" value={formatarMoeda(custoDia)} />
              <InfoBox label="VR por dia trabalhado" value={formatarMoeda(VR_DIA)} />
              <InfoBox label="VA mensal" value={formatarMoeda(VA_MES)} />
              <InfoBox label="VA proporcional/dia" value={formatarMoeda(vaDia)} />
              <InfoBox label="Desconto por falta" value={formatarMoeda(descontoDia)} />
            </div>

            <div style={{ ...styles.label, marginTop: 24, marginBottom: 12 }}>
              🧾 Histórico de férias
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {historico.length > 0 ? (
                historico.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: "rgba(255,255,255,.055)",
                      border: "1px solid rgba(255,255,255,.10)",
                      borderRadius: 16,
                      padding: 14,
                    }}
                  >
                    <strong>
                      {formatarData(item.data_inicio)} até {formatarData(item.data_fim)}
                    </strong>
                    <div style={{ color: "#9fb1cc", marginTop: 4 }}>
                      {item.dias} dias • {formatarMoeda(item.impacto_financeiro)}
                    </div>
                    {item.observacao && (
                      <div style={{ color: "#9fb1cc", marginTop: 4 }}>
                        Obs: {item.observacao}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ color: "#9fb1cc" }}>
                  Nenhum histórico de férias registrado.
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button style={styles.primaryButton} onClick={onSelect}>
                📅 Marcar férias deste funcionário
              </button>

              <button style={styles.secondaryButton} onClick={onClose}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
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