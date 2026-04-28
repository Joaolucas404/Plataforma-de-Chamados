import React, { useMemo, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { LOGO_URL } from "../App";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
  CartesianGrid,
} from "recharts";

function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function corPrioridade(nome) {
  const n = normalizar(nome);
  if (n === "baixa") return "#30d158";
  if (n === "media") return "#facc15";
  if (n === "alta") return "#ff9f1a";
  if (n === "critica" || n === "critico") return "#ff3131";
  return "#9ca3af";
}

function agrupar(lista, campo) {
  const mapa = {};
  lista.forEach((item) => {
    const chave = item[campo] || "Não informado";
    mapa[chave] = (mapa[chave] || 0) + 1;
  });

  return Object.entries(mapa)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function TooltipDark() {
  return (
    <Tooltip
      contentStyle={{
        background: "#061a2f",
        border: "1px solid #1e6bb8",
        borderRadius: 12,
        color: "#fff",
        boxShadow: "0 0 20px rgba(30,155,255,.35)",
      }}
      labelStyle={{ color: "#9fb1cc" }}
      itemStyle={{ color: "#fff" }}
      cursor={{ fill: "rgba(30,155,255,0.08)" }}
    />
  );
}

function CardKpi({ titulo, valor, detalhe, cor = "#1e9bff" }) {
  return (
    <div
      style={{
        border: `1px solid ${cor}`,
        background: "#ffffff",
        borderRadius: 16,
        padding: 16,
        color: "#0f172a",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 900, color: "#475569" }}>
        {titulo}
      </div>
      <div style={{ fontSize: 32, fontWeight: 950, color: cor }}>{valor}</div>
      <div style={{ fontSize: 12, color: "#64748b" }}>{detalhe}</div>
    </div>
  );
}

function TextoResumo({ titulo, dados }) {
  return (
    <div
      style={{
        border: "1px solid #cbd5e1",
        borderRadius: 16,
        padding: 18,
        background: "#ffffff",
      }}
    >
      <h3 style={{ marginTop: 0, color: "#0f2f5f" }}>{titulo}</h3>

      {dados.length === 0 && (
        <div style={{ color: "#64748b" }}>Nenhum dado encontrado.</div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {dados.map((item) => (
          <div
            key={item.name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              borderBottom: "1px solid #e2e8f0",
              paddingBottom: 7,
              color: "#334155",
              fontSize: 16,
            }}
          >
            <strong>{item.name}</strong>
            <span>
              {item.value} chamado{item.value > 1 ? "s" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportPage({ children, pageNumber, totalPages }) {
  return (
    <div
      className="pdf-page"
      style={{
        width: 1123,
        minHeight: 794,
        background: "#ffffff",
        color: "#0f172a",
        padding: 38,
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
        position: "relative",
      }}
    >
      {children}

      <div
        style={{
          position: "absolute",
          bottom: 18,
          right: 38,
          color: "#64748b",
          fontSize: 13,
        }}
      >
        Página {pageNumber} de {totalPages}
      </div>
    </div>
  );
}

export default function AnalyticsPage({ styles, tickets = [] }) {
  const [periodo, setPeriodo] = useState("todos");
  const [localidade, setLocalidade] = useState("todas");
  const [status, setStatus] = useState("todos");
  const [prioridade, setPrioridade] = useState("todas");
  const [equipe, setEquipe] = useState("todas");
  const [previewAberto, setPreviewAberto] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const localidades = [...new Set(tickets.map((t) => t.localidade).filter(Boolean))];
  const statusList = [...new Set(tickets.map((t) => t.status).filter(Boolean))];
  const prioridades = [...new Set(tickets.map((t) => t.prioridade).filter(Boolean))];
  const equipes = [...new Set(tickets.map((t) => t.tecnico).filter(Boolean))];

  const filtrados = useMemo(() => {
    const hoje = new Date();

    return tickets.filter((t) => {
      const dataChamado = t.created_at ? new Date(t.created_at) : null;

      if (periodo !== "todos" && dataChamado) {
        const diff = Math.floor((hoje - dataChamado) / (1000 * 60 * 60 * 24));
        if (periodo === "7" && diff > 7) return false;
        if (periodo === "30" && diff > 30) return false;
        if (periodo === "90" && diff > 90) return false;
      }

      if (localidade !== "todas" && t.localidade !== localidade) return false;
      if (status !== "todos" && t.status !== status) return false;
      if (prioridade !== "todas" && t.prioridade !== prioridade) return false;
      if (equipe !== "todas" && t.tecnico !== equipe) return false;

      return true;
    });
  }, [tickets, periodo, localidade, status, prioridade, equipe]);

  const dados = useMemo(() => {
    const total = filtrados.length;

    const fechados = filtrados.filter((t) =>
      ["Fechado", "Concluído", "Finalizado", "Encerrado"].includes(t.status)
    ).length;

    const abertos = total - fechados;

    const emAndamento = filtrados.filter((t) =>
      ["Em andamento", "Em execução"].includes(t.status)
    ).length;

    const criticos = filtrados.filter((t) => {
      const p = normalizar(t.prioridade);
      const c = normalizar(t.criticidade);
      return p.includes("crit") || c === "severa";
    }).length;

    const slaBase = filtrados.filter((t) => t.sla);
    const slaOk = slaBase.filter(
      (t) => Number(t.sla_consumido || 0) <= Number(t.sla)
    ).length;

    const sla = slaBase.length ? Math.round((slaOk / slaBase.length) * 100) : 0;
    const taxaResolucao = total ? Math.round((fechados / total) * 100) : 0;

    return {
      total,
      abertos,
      fechados,
      emAndamento,
      criticos,
      sla,
      taxaResolucao,
      porPrioridade: agrupar(filtrados, "prioridade"),
      porLocalidade: agrupar(filtrados, "localidade"),
      porStatus: agrupar(filtrados, "status"),
      porTipo: agrupar(filtrados, "tipo_falha"),
      porEquipe: agrupar(filtrados, "tecnico"),
    };
  }, [filtrados]);

  const periodoTexto =
    periodo === "todos" ? "Todo o período" : `Últimos ${periodo} dias`;

  async function exportarPDF() {
    setGerandoPdf(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const paginas = document.querySelectorAll(".pdf-stage-hidden .pdf-page");
      const pdf = new jsPDF("landscape", "mm", "a4");

      for (let i = 0; i < paginas.length; i++) {
        const canvas = await html2canvas(paginas[i], {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/png");
        const largura = pdf.internal.pageSize.getWidth();
        const altura = pdf.internal.pageSize.getHeight();

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, 0, largura, altura);
      }

      pdf.save(
        `relatorio-executivo-${new Date().toISOString().slice(0, 10)}.pdf`
      );
    } catch (error) {
      console.error(error);
      alert("Não foi possível gerar o PDF.");
    }

    setGerandoPdf(false);
  }

  function RelatorioCompleto() {
    const totalPaginas = 4;

    return (
      <>
        <ReportPage pageNumber={1} totalPages={totalPaginas}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <img
              src={LOGO_URL}
              alt="Logo"
              style={{ width: 170, background: "white", borderRadius: 8 }}
            />

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f2f5f" }}>
                RELATÓRIO EXECUTIVO
              </div>
              <div style={{ color: "#64748b", marginTop: 4 }}>
                Gestão de Chamados
              </div>
            </div>
          </div>

          <div style={{ marginTop: 70 }}>
            <div
              style={{
                fontSize: 46,
                fontWeight: 900,
                color: "#0f2f5f",
                lineHeight: 1.1,
              }}
            >
              RELATÓRIO ANALÍTICO
              <br />
              DE CHAMADOS
            </div>

            <div
              style={{
                marginTop: 22,
                width: 120,
                height: 5,
                background: "#1e9bff",
              }}
            />

            <div style={{ marginTop: 24, fontSize: 20, color: "#334155" }}>
              Período: <strong>{periodoTexto}</strong>
            </div>

            <div style={{ marginTop: 8, color: "#64748b", fontSize: 16 }}>
              Estação: {localidade === "todas" ? "Todas" : localidade} • Status:{" "}
              {status === "todos" ? "Todos" : status} • Prioridade:{" "}
              {prioridade === "todas" ? "Todas" : prioridade} • Equipe:{" "}
              {equipe === "todas" ? "Todas" : equipe}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: 38,
              right: 38,
              bottom: 65,
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 16,
            }}
          >
            <CardKpi titulo="Total" valor={dados.total} detalhe="Chamados filtrados" cor="#1e3a8a" />
            <CardKpi titulo="Abertos" valor={dados.abertos} detalhe="Pendentes" cor="#2563eb" />
            <CardKpi titulo="Fechados" valor={dados.fechados} detalhe="Concluídos" cor="#16a34a" />
            <CardKpi titulo="Críticos" valor={dados.criticos} detalhe="Alta atenção" cor="#dc2626" />
            <CardKpi titulo="SLA" valor={`${dados.sla}%`} detalhe="Atendido" cor="#7c3aed" />
          </div>

          <div style={{ position: "absolute", bottom: 40, right: 38, color: "#64748b" }}>
            Gerado em {new Date().toLocaleString("pt-BR")}
          </div>
        </ReportPage>

        <ReportPage pageNumber={2} totalPages={totalPaginas}>
          <h1 style={{ color: "#0f2f5f", margin: 0 }}>Sumário Executivo</h1>

          <p style={{ color: "#475569", fontSize: 18, marginTop: 16, lineHeight: 1.6 }}>
            Este relatório apresenta uma visão consolidada dos chamados registrados
            na plataforma, considerando os filtros aplicados. O objetivo é apoiar
            a análise operacional, priorização de atendimento, acompanhamento de SLA
            e tomada de decisão gerencial.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 16,
              marginTop: 32,
            }}
          >
            <CardKpi titulo="Total" valor={dados.total} detalhe="Chamados" cor="#1e3a8a" />
            <CardKpi titulo="Abertos" valor={dados.abertos} detalhe="Pendentes" cor="#2563eb" />
            <CardKpi titulo="Fechados" valor={dados.fechados} detalhe="Finalizados" cor="#16a34a" />
            <CardKpi titulo="Críticos" valor={dados.criticos} detalhe="Atenção imediata" cor="#dc2626" />
            <CardKpi titulo="SLA" valor={`${dados.sla}%`} detalhe="Atendido" cor="#7c3aed" />
          </div>

          <div
            style={{
              marginTop: 40,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 26,
            }}
          >
            <div>
              <h2 style={{ color: "#0f2f5f" }}>Resumo Operacional</h2>
              <ul style={{ fontSize: 17, lineHeight: 1.8, color: "#334155" }}>
                <li>Taxa de resolução: {dados.taxaResolucao}%</li>
                <li>Chamados em andamento: {dados.emAndamento}</li>
                <li>Chamados críticos: {dados.criticos}</li>
                <li>SLA atendido: {dados.sla}%</li>
              </ul>
            </div>

            <div>
              <h2 style={{ color: "#0f2f5f" }}>Filtros Aplicados</h2>
              <ul style={{ fontSize: 17, lineHeight: 1.8, color: "#334155" }}>
                <li>Período: {periodoTexto}</li>
                <li>Estação: {localidade === "todas" ? "Todas" : localidade}</li>
                <li>Status: {status === "todos" ? "Todos" : status}</li>
                <li>Prioridade: {prioridade === "todas" ? "Todas" : prioridade}</li>
                <li>Equipe: {equipe === "todas" ? "Todas" : equipe}</li>
              </ul>
            </div>
          </div>

          <div style={{ position: "absolute", bottom: 40, left: 38, color: "#64748b" }}>
            Consórcio União OBRACON • Relatório Executivo
          </div>
        </ReportPage>

        <ReportPage pageNumber={3} totalPages={totalPaginas}>
          <h1 style={{ color: "#0f2f5f", margin: 0 }}>
            Distribuição dos Chamados
          </h1>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 22,
              marginTop: 28,
            }}
          >
            <TextoResumo titulo="Chamados por estação" dados={dados.porLocalidade} />
            <TextoResumo titulo="Chamados por equipe" dados={dados.porEquipe} />
            <TextoResumo titulo="Chamados por status" dados={dados.porStatus} />
            <TextoResumo titulo="Chamados por prioridade" dados={dados.porPrioridade} />
          </div>

          <div style={{ position: "absolute", bottom: 40, left: 38, color: "#64748b" }}>
            Documento pronto para impressão • Dados organizados para leitura gerencial
          </div>
        </ReportPage>

        <ReportPage pageNumber={4} totalPages={totalPaginas}>
          <h1 style={{ color: "#0f2f5f", margin: 0 }}>Conclusão Gerencial</h1>

          <div style={{ marginTop: 30, fontSize: 18, lineHeight: 1.7, color: "#334155" }}>
            <p>
              A base analisada contém <strong>{dados.total}</strong> chamados dentro dos
              filtros selecionados. Deste total, <strong>{dados.abertos}</strong> permanecem
              em aberto e <strong>{dados.fechados}</strong> encontram-se fechados.
            </p>

            <p>
              O índice de SLA atendido está em <strong>{dados.sla}%</strong>, enquanto
              a taxa de resolução do período está em <strong>{dados.taxaResolucao}%</strong>.
            </p>

            <p>
              Foram identificados <strong>{dados.criticos}</strong> chamados classificados
              como críticos ou severos, recomendando acompanhamento prioritário.
            </p>
          </div>

          <div
            style={{
              marginTop: 36,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              borderRadius: 14,
              padding: 20,
            }}
          >
            <h2 style={{ color: "#0f2f5f", marginTop: 0 }}>Recomendações</h2>
            <ul style={{ fontSize: 17, lineHeight: 1.8, color: "#334155" }}>
              <li>Monitorar chamados críticos diariamente.</li>
              <li>Acompanhar chamados em andamento e aguardando compra.</li>
              <li>Usar os dados por estação para identificar recorrências operacionais.</li>
              <li>Revisar causas de falhas recorrentes e priorizar ações preventivas.</li>
            </ul>
          </div>

          <div style={{ position: "absolute", bottom: 40, left: 38, color: "#64748b" }}>
            Consórcio União OBRACON • Plataforma Corporativa de Chamados
          </div>
        </ReportPage>
      </>
    );
  }

  return (
    <div style={styles.sectionCard}>
      <style>{`
        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 16px;
        }

        .analytics-card {
          background: linear-gradient(180deg, #061a2f 0%, #020b16 100%);
          border: 1px solid #1e6bb8;
          border-radius: 16px;
          padding: 16px;
          color: white;
          min-height: 310px;
          box-shadow: 0 0 24px rgba(0,120,255,.10);
        }

        .analytics-card h3 {
          margin: 0 0 14px;
          font-size: 15px;
          font-weight: 900;
          color: #f4f8ff;
        }

        .pdf-stage-hidden {
          position: absolute;
          left: -99999px;
          top: 0;
          width: 1123px;
          z-index: -1;
        }

        .preview-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.78);
          z-index: 9999;
          overflow: auto;
          padding: 30px;
        }

        .preview-actions {
          position: sticky;
          top: 0;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-bottom: 20px;
          z-index: 2;
        }

        .preview-page {
          width: 1123px;
          margin: 0 auto 26px;
          box-shadow: 0 20px 60px rgba(0,0,0,.45);
        }

        .recharts-default-tooltip {
          background: #061a2f !important;
          border: 1px solid #1e6bb8 !important;
          border-radius: 12px !important;
          color: white !important;
          box-shadow: 0 0 20px rgba(30,155,255,.35) !important;
        }

        .recharts-legend-item-text {
          color: #dce8f8 !important;
        }

        .recharts-text {
          fill: #cfe8ff;
          font-weight: 700;
        }
      `}</style>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ ...styles.label, marginBottom: 6 }}>
            📊 Analytics / Relatório Executivo
          </div>
          <div style={{ color: "#9fb1cc" }}>
            Pré-visualize e baixe um relatório profissional com logo, resumo e dados organizados.
          </div>
        </div>

        <img
          src={LOGO_URL}
          alt="Logo"
          style={{ width: 120, borderRadius: 12, background: "white" }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginTop: 22,
        }}
      >
        <select style={styles.input} value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
          <option value="todos">Todo período</option>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
        </select>

        <select style={styles.input} value={localidade} onChange={(e) => setLocalidade(e.target.value)}>
          <option value="todas">Todas as estações</option>
          {localidades.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <select style={styles.input} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="todos">Todos os status</option>
          {statusList.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <select style={styles.input} value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
          <option value="todas">Todas as prioridades</option>
          {prioridades.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <select style={styles.input} value={equipe} onChange={(e) => setEquipe(e.target.value)}>
          <option value="todas">Todas as equipes</option>
          {equipes.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <button style={styles.secondaryButton} onClick={() => setPreviewAberto(true)}>
          👁️ Pré-visualizar
        </button>

        <button style={styles.primaryButton} onClick={exportarPDF} disabled={gerandoPdf}>
          {gerandoPdf ? "Gerando PDF..." : "📄 Baixar PDF"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginTop: 24,
        }}
      >
        <div style={styles.softBox}><strong>Total</strong><br />{dados.total}</div>
        <div style={styles.softBox}><strong>Abertos</strong><br />{dados.abertos}</div>
        <div style={styles.softBox}><strong>Fechados</strong><br />{dados.fechados}</div>
        <div style={styles.softBox}><strong>Críticos</strong><br />{dados.criticos}</div>
        <div style={styles.softBox}><strong>SLA atendido</strong><br />{dados.sla}%</div>
      </div>

      <div className="analytics-grid" style={{ marginTop: 24 }}>
        <div className="analytics-card">
          <h3>Chamados por prioridade</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={dados.porPrioridade}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                label
                paddingAngle={4}
              >
                {dados.porPrioridade.map((item, i) => (
                  <Cell key={i} fill={corPrioridade(item.name)} stroke="#020b16" strokeWidth={2} />
                ))}
              </Pie>
              <TooltipDark />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card">
          <h3>Chamados por estação</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dados.porLocalidade}>
              <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
              <XAxis dataKey="name" hide />
              <YAxis stroke="#9fb1cc" allowDecimals={false} />
              <TooltipDark />
              <Bar dataKey="value" fill="#1e9bff" radius={[8, 8, 0, 0]}>
                <LabelList dataKey="value" position="top" fill="#fff" fontWeight={900} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card">
          <h3>Chamados por status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dados.porStatus}>
              <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
              <XAxis dataKey="name" hide />
              <YAxis stroke="#9fb1cc" allowDecimals={false} />
              <TooltipDark />
              <Bar dataKey="value" fill="#30d158" radius={[8, 8, 0, 0]}>
                <LabelList dataKey="value" position="top" fill="#fff" fontWeight={900} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card">
          <h3>Chamados por equipe</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dados.porEquipe}>
              <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
              <XAxis dataKey="name" hide />
              <YAxis stroke="#9fb1cc" allowDecimals={false} />
              <TooltipDark />
              <Bar dataKey="value" fill="#ff9f1a" radius={[8, 8, 0, 0]}>
                <LabelList dataKey="value" position="top" fill="#fff" fontWeight={900} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="pdf-stage-hidden">
        <RelatorioCompleto />
      </div>

      {previewAberto && (
        <div className="preview-overlay">
          <div className="preview-actions">
            <button style={styles.secondaryButton} onClick={() => setPreviewAberto(false)}>
              Fechar
            </button>

            <button style={styles.primaryButton} onClick={exportarPDF} disabled={gerandoPdf}>
              {gerandoPdf ? "Gerando PDF..." : "📄 Baixar PDF"}
            </button>
          </div>

          <div className="preview-page">
            <RelatorioCompleto />
          </div>
        </div>
      )}
    </div>
  );
}