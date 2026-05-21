import React, { useEffect, useMemo, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Eye, FileDown, X } from "lucide-react";
import { supabase } from "../App";

const LOGO_URL = "https://i.imgur.com/aAMds6C.jpeg";

const azul = "#1e9bff";
const verde = "#22c55e";
const laranja = "#f59e0b";
const vermelho = "#ef4444";
const roxo = "#8b5cf6";
const amarelo = "#facc15";

const prioridadeCores = {
  Crítica: vermelho,
  Critica: vermelho,
  Alta: laranja,
  Média: amarelo,
  Media: amarelo,
  Baixa: verde,
};

function pdfText(texto) {
  return String(texto || "").replaceAll(" ", "\u00A0");
}

function normalizar(v, padrao = "Não informado") {
  return String(v || padrao).trim();
}

function formatarData(data) {
  if (!data) return "-";
  return new Date(data).toLocaleDateString("pt-BR");
}

function agrupar(lista, campo, limite = 8) {
  const mapa = {};

  lista.forEach((item) => {
    const chave = normalizar(item[campo]);
    mapa[chave] = (mapa[chave] || 0) + 1;
  });

  return Object.entries(mapa)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limite);
}

function agruparMultiCampo(lista, campos, limite = 8) {
  const mapa = {};

  lista.forEach((item) => {
    let chave = "Não informado";

    for (const campo of campos) {
      if (item[campo]) {
        chave = normalizar(item[campo]);
        break;
      }
    }

    mapa[chave] = (mapa[chave] || 0) + 1;
  });

  return Object.entries(mapa)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limite);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: "#061a2f",
        border: "1px solid rgba(30,155,255,.65)",
        borderRadius: 12,
        padding: "10px 12px",
        color: "#eaf3ff",
        boxShadow: "0 12px 35px rgba(0,0,0,.45)",
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      <div style={{ color: "#9fb1cc", marginBottom: 4 }}>
        {label || payload[0]?.name}
      </div>
      <div style={{ color: payload[0]?.color || azul }}>
        valor: {payload[0]?.value}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [agora, setAgora] = useState(new Date());
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [previewAberto, setPreviewAberto] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function carregar() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("chamados")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setChamados([]);
    } else {
      setChamados(data || []);
    }

    setCarregando(false);
  }

  const dados = useMemo(() => {
    const total = chamados.length;

    const abertos = chamados.filter((c) =>
      ["aberto", "aberta", "pendente"].includes(String(c.status || "").toLowerCase())
    ).length;

    const execucao = chamados.filter((c) =>
      ["em execução", "em execucao", "andamento", "em andamento"].includes(
        String(c.status || "").toLowerCase()
      )
    ).length;

    const finalizados = chamados.filter((c) =>
      ["finalizado", "finalizada", "concluído", "concluido", "fechado", "encerrado"].includes(
        String(c.status || "").toLowerCase()
      )
    ).length;

    const criticos = chamados.filter((c) =>
      String(c.prioridade || "").toLowerCase().includes("cr")
    ).length;

    const slaAtendido = total > 0 ? Math.round(((total - criticos) / total) * 100) : 0;

    return {
      total,
      abertos,
      execucao,
      finalizados,
      criticos,
      slaAtendido,
      porPrioridade: agrupar(chamados, "prioridade"),
      porEstacao: agruparMultiCampo(chamados, ["localidade", "estacao", "unidade"]),
      porEquipe: agruparMultiCampo(chamados, ["tecnico", "equipe", "responsavel"]),
      porTipo: agruparMultiCampo(chamados, ["tipo_falha", "tipo", "categoria"]),
      recentes: chamados.slice(0, 10),
    };
  }, [chamados]);

  async function exportarPDF() {
    setGerandoPdf(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const paginas = document.querySelectorAll(".pdf-stage-hidden .pdf-page");
      const pdf = new jsPDF("landscape", "mm", "a4");

      for (let i = 0; i < paginas.length; i++) {
        const canvas = await html2canvas(paginas[i], {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1123,
          windowHeight: 794,
        });

        const imgData = canvas.toDataURL("image/png");
        const largura = pdf.internal.pageSize.getWidth();
        const altura = pdf.internal.pageSize.getHeight();

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, 0, largura, altura);
      }

      pdf.save(`relatorio-analytics-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error(error);
      alert("Não foi possível gerar o PDF.");
    }

    setGerandoPdf(false);
  }

  return (
    <>
      <style>{`
        .pdf-stage-hidden {
          position: fixed;
          left: -20000px;
          top: 0;
          width: 1123px;
          height: auto;
          pointer-events: none;
          z-index: -10;
        }

        .pdf-page,
        .pdf-page * {
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif !important;
          -webkit-font-smoothing: antialiased;
          text-rendering: geometricPrecision;
        }

        .preview-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.82);
          z-index: 99999;
          overflow: auto;
          padding: 28px;
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
          margin: 0 auto 28px;
          box-shadow: 0 24px 70px rgba(0,0,0,.45);
          border-radius: 10px;
          overflow: hidden;
        }

        .analytics-premium {
          width: 100%;
          color: #eaf3ff;
          overflow-x: hidden;
        }

        .analytics-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .analytics-title h1 {
          margin: 0;
          font-size: clamp(24px, 3vw, 36px);
          font-weight: 950;
          letter-spacing: .03em;
          text-transform: uppercase;
          line-height: 1.12;
        }

        .analytics-title span {
          color: #00d9ff;
          font-size: 13px;
          font-weight: 950;
          letter-spacing: .22em;
          text-transform: uppercase;
        }

        .clock-card {
          min-width: 150px;
          padding: 15px 18px;
          border-radius: 18px;
          border: 1px solid rgba(30,155,255,.55);
          background:
            radial-gradient(circle at top right, rgba(30,155,255,.18), transparent 42%),
            linear-gradient(180deg, rgba(8,29,54,.98), rgba(2,10,22,.98));
          text-align: center;
        }

        .clock-card strong {
          display: block;
          font-size: 24px;
          font-weight: 950;
          color: white;
        }

        .clock-card small {
          display: block;
          margin-top: 3px;
          color: #9fb1cc;
          font-weight: 800;
        }

        .analytics-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .action-btn {
          color: white;
          border: none;
          border-radius: 16px;
          padding: 14px 22px;
          font-weight: 900;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(160px, 1fr));
          gap: 14px;
          margin-bottom: 16px;
        }

        .kpi-card {
          min-height: 96px;
          padding: 18px;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--border);
          background:
            radial-gradient(circle at right bottom, var(--glow-soft), transparent 38%),
            linear-gradient(180deg, rgba(5,22,40,.96), rgba(2,10,20,.98));
          box-shadow: 0 16px 45px rgba(0,0,0,.25);
        }

        .kpi-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .kpi-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          font-size: 23px;
          background: var(--bg);
        }

        .kpi-label {
          color: #b8c7dd;
          text-transform: uppercase;
          font-size: 12px;
          font-weight: 950;
        }

        .kpi-value {
          margin-top: 6px;
          font-size: 30px;
          font-weight: 950;
          line-height: 1;
          color: white;
        }

        .kpi-sub {
          margin-top: 6px;
          color: #00e5ff;
          font-size: 12px;
          font-weight: 900;
        }

        .dash-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 14px;
        }

        .dash-grid-bottom {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .panel {
          border-radius: 16px;
          border: 1px solid rgba(30,155,255,.55);
          background:
            radial-gradient(circle at top right, rgba(30,155,255,.10), transparent 36%),
            linear-gradient(180deg, rgba(5,22,40,.96), rgba(1,8,18,.98));
          padding: 18px;
          min-height: 260px;
          box-shadow: 0 16px 45px rgba(0,0,0,.22);
          overflow: hidden;
        }

        .panel h3 {
          margin: 0 0 14px;
          font-size: 15px;
          font-weight: 950;
          text-transform: uppercase;
          color: #f2f7ff;
        }

        .panel-foot {
          color: #9fb1cc;
          font-size: 12px;
          margin-top: 10px;
        }

        .recent-list {
          display: grid;
          gap: 10px;
        }

        .recent-item {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 10px;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .recent-item strong {
          font-size: 13px;
        }

        .recent-item small {
          color: #9fb1cc;
          display: block;
          margin-top: 3px;
        }

        .priority-pill {
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          border: 1px solid currentColor;
        }

        .sla-wrap {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 14px;
        }

        .sla-number {
          width: 170px;
          height: 170px;
          border-radius: 50%;
          margin: auto;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle, #09213d 55%, transparent 56%),
            conic-gradient(#1e9bff ${dados.slaAtendido}%, rgba(255,255,255,.08) 0);
          box-shadow: 0 0 30px rgba(30,155,255,.25);
        }

        .sla-number strong {
          font-size: 36px;
          display: block;
          text-align: center;
        }

        .sla-number span {
          font-size: 11px;
          color: #9fb1cc;
          font-weight: 900;
          display: block;
          text-align: center;
        }

        .sla-meta {
          display: grid;
          gap: 12px;
        }

        .sla-meta div {
          background: rgba(255,255,255,.045);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px;
          padding: 12px;
        }

        .empty {
          color: #9fb1cc;
          padding: 20px;
          text-align: center;
        }

        @media (max-width: 1300px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .dash-grid,
          .dash-grid-bottom {
            grid-template-columns: 1fr;
          }

          .analytics-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 600px) {
          .analytics-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .action-btn {
            justify-content: center;
          }

          .kpi-grid {
            grid-template-columns: 1fr;
          }

          .recent-item {
            grid-template-columns: 1fr;
          }

          .sla-wrap {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="analytics-premium">
        <div className="analytics-header">
          <div className="analytics-title">
            <h1>PAINEL GERENCIAL — GESTÃO DE CHAMADOS</h1>
            <span>Visão geral da operação em tempo real</span>
          </div>

          <div className="clock-card">
            <strong>
              {agora.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </strong>
            <small>{agora.toLocaleDateString("pt-BR")}</small>
          </div>
        </div>

        <div className="analytics-actions">
          <button
            onClick={() => setPreviewAberto(true)}
            className="action-btn"
            style={{ background: "linear-gradient(135deg, #0ea5e9, #0369a1)" }}
          >
            <Eye size={18} />
            Pré-visualizar
          </button>

          <button
            onClick={exportarPDF}
            disabled={gerandoPdf}
            className="action-btn"
            style={{
              background: "linear-gradient(135deg, #ff7a1a, #d85d00)",
              opacity: gerandoPdf ? 0.7 : 1,
            }}
          >
            <FileDown size={18} />
            {gerandoPdf ? "Gerando PDF..." : "Baixar PDF"}
          </button>
        </div>

        {carregando ? (
          <div className="panel">Carregando analytics...</div>
        ) : (
          <>
            <div className="kpi-grid">
              <Kpi icon="📂" label="Chamados abertos" value={dados.abertos} sub="operação ativa" color={azul} />
              <Kpi icon="⚙️" label="Em execução" value={dados.execucao} sub="em atendimento" color={amarelo} />
              <Kpi icon="✅" label="Finalizados" value={dados.finalizados} sub="histórico geral" color={verde} />
              <Kpi icon="🎯" label="SLA atendido" value={`${dados.slaAtendido}%`} sub="dados reais" color={roxo} />
              <Kpi icon="🚨" label="Críticos" value={dados.criticos} sub="atenção imediata" color={vermelho} />
            </div>

            <div className="dash-grid">
              <Panel title="Chamados por prioridade">
                {dados.porPrioridade.length ? (
                  <ResponsiveContainer width="100%" height={210}>
                    <PieChart>
                      <Pie data={dados.porPrioridade} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={2}>
                        {dados.porPrioridade.map((entry, index) => (
                          <Cell key={index} fill={prioridadeCores[entry.name] || azul} stroke="rgba(2,10,20,.98)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty">Sem dados</div>
                )}
                <div className="panel-foot">Últimos registros</div>
              </Panel>

              <ChartPanel title="Chamados por estação" data={dados.porEstacao} color={azul} />
              <ChartPanel title="Produtividade por equipe" data={dados.porEquipe} color={verde} />
              <ChartPanel title="Chamados por tipo" data={dados.porTipo} color={laranja} />
            </div>

            <div className="dash-grid-bottom">
              <Panel title="Chamados recentes">
                <div className="recent-list">
                  {dados.recentes.slice(0, 6).map((c, i) => {
                    const prio = normalizar(c.prioridade, "Média");
                    const cor = prioridadeCores[prio] || azul;

                    return (
                      <div className="recent-item" key={c.id || i}>
                        <div>
                          <strong>{c.codigo || c.titulo || `Chamado #${c.id || i + 1}`}</strong>
                          <small>{c.localidade || c.estacao || c.unidade || "-"}</small>
                        </div>

                        <span className="priority-pill" style={{ color: cor, background: `${cor}22` }}>
                          {prio}
                        </span>

                        <small>{formatarData(c.created_at)}</small>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              <Panel title="SLA - Acordos de nível de serviço">
                <div className="sla-wrap">
                  <div className="sla-number">
                    <div>
                      <strong>{dados.slaAtendido}%</strong>
                      <span>SLA atendido</span>
                    </div>
                  </div>

                  <div className="sla-meta">
                    <div>
                      <strong>Dentro do prazo</strong>
                      <br />
                      <span style={{ color: "#9fb1cc" }}>{dados.total - dados.criticos} chamados</span>
                    </div>

                    <div>
                      <strong>Fora do prazo / críticos</strong>
                      <br />
                      <span style={{ color: vermelho }}>{dados.criticos} chamados</span>
                    </div>
                  </div>
                </div>

                <div className="panel-foot">Indicador operacional</div>
              </Panel>
            </div>
          </>
        )}
      </div>

      <div className="pdf-stage-hidden">
        <RelatorioAnalytics dados={dados} chamados={chamados} />
      </div>

      {previewAberto && (
        <div className="preview-overlay">
          <div className="preview-actions">
            <button
              onClick={() => setPreviewAberto(false)}
              style={{
                background: "rgba(255,255,255,.12)",
                color: "white",
                border: "1px solid rgba(255,255,255,.22)",
                borderRadius: 14,
                padding: "12px 18px",
                fontWeight: 900,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <X size={18} />
              Fechar
            </button>

            <button
              onClick={exportarPDF}
              disabled={gerandoPdf}
              style={{
                background: "linear-gradient(135deg, #ff7a1a, #d85d00)",
                color: "white",
                border: "none",
                borderRadius: 14,
                padding: "12px 18px",
                fontWeight: 900,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <FileDown size={18} />
              {gerandoPdf ? "Gerando PDF..." : "Baixar PDF"}
            </button>
          </div>

          <div className="preview-page">
            <RelatorioAnalytics dados={dados} chamados={chamados} />
          </div>
        </div>
      )}
    </>
  );
}

function ChartPanel({ title, data, color }) {
  return (
    <Panel title={title}>
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
          <XAxis dataKey="name" stroke="#9fb1cc" tick={{ fill: "#9fb1cc", fontSize: 11 }} tickLine={false} />
          <YAxis stroke="#9fb1cc" allowDecimals={false} tick={{ fill: "#9fb1cc", fontSize: 12 }} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: `${color}14` }} />
          <Bar dataKey="value" fill={color} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="panel-foot">Base: chamados registrados</div>
    </Panel>
  );
}

function Kpi({ icon, label, value, sub, color }) {
  return (
    <div
      className="kpi-card"
      style={{
        "--glow": color,
        "--glow-soft": `${color}33`,
        "--border": `${color}cc`,
      }}
    >
      <div className="kpi-row">
        <div className="kpi-icon" style={{ "--bg": `${color}22` }}>
          {icon}
        </div>

        <div>
          <div className="kpi-label">{label}</div>
          <div className="kpi-value">{value}</div>
          <div className="kpi-sub">{sub}</div>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="panel">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function ReportPage({ children, pageNumber, totalPages }) {
  return (
    <div
      className="pdf-page"
      style={{
        width: 1123,
        height: 794,
        background: "#ffffff",
        color: "#0f172a",
        padding: 38,
        position: "relative",
        overflow: "hidden",
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
          whiteSpace: "nowrap",
        }}
      >
        {pdfText(`Página ${pageNumber} de ${totalPages}`)}
      </div>
    </div>
  );
}

function RelatorioAnalytics({ dados, chamados }) {
  const totalPaginas = 3;

  return (
    <>
      <ReportPage pageNumber={1} totalPages={totalPaginas}>
        <HeaderPdf titulo="RELATÓRIO GERENCIAL" subtitulo="Analytics de chamados operacionais" />

        <div style={{ marginTop: 54 }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: "#0f2f5f", lineHeight: 1.1 }}>
            {pdfText("PAINEL DE")}
          </div>

          <div style={{ fontSize: 44, fontWeight: 900, color: "#0f2f5f", lineHeight: 1.1 }}>
            {pdfText("CHAMADOS")}
          </div>

          <div style={{ marginTop: 22, width: 120, height: 5, background: "#1e9bff" }} />

          <div style={{ marginTop: 24, fontSize: 20, color: "#334155" }}>
            {pdfText("Resumo executivo da operação, prioridades, equipes e SLA.")}
          </div>

          <div style={{ marginTop: 8, color: "#64748b", fontSize: 16 }}>
            {pdfText(`Gerado em ${new Date().toLocaleString("pt-BR")}`)}
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
          <PdfKpi titulo="Total" valor={dados.total} detalhe="Chamados registrados" cor="#1e3a8a" />
          <PdfKpi titulo="Abertos" valor={dados.abertos} detalhe="Operação ativa" cor="#0284c7" />
          <PdfKpi titulo="Em execução" valor={dados.execucao} detalhe="Em atendimento" cor="#ca8a04" />
          <PdfKpi titulo="Finalizados" valor={dados.finalizados} detalhe="Histórico geral" cor="#16a34a" />
          <PdfKpi titulo="Críticos" valor={dados.criticos} detalhe="Atenção imediata" cor="#dc2626" />
        </div>
      </ReportPage>

      <ReportPage pageNumber={2} totalPages={totalPaginas}>
        <HeaderPdf titulo="INDICADORES OPERACIONAIS" subtitulo="Distribuição por prioridade, estação, equipe e tipo" />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
            marginTop: 26,
          }}
        >
          <PdfPanel titulo="Chamados por prioridade">
            <PdfList dados={dados.porPrioridade} colorMap={prioridadeCores} />
          </PdfPanel>

          <PdfPanel titulo="Chamados por estação">
            <PdfBars dados={dados.porEstacao} cor="#1e9bff" />
          </PdfPanel>

          <PdfPanel titulo="Produtividade por equipe">
            <PdfBars dados={dados.porEquipe} cor="#16a34a" />
          </PdfPanel>

          <PdfPanel titulo="Chamados por tipo">
            <PdfBars dados={dados.porTipo} cor="#f59e0b" />
          </PdfPanel>
        </div>
      </ReportPage>

      <ReportPage pageNumber={3} totalPages={totalPaginas}>
        <HeaderPdf titulo="CHAMADOS RECENTES E SLA" subtitulo="Últimos registros e status de atendimento" />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.35fr .65fr",
            gap: 18,
            marginTop: 26,
          }}
        >
          <PdfPanel titulo="Chamados recentes">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#0f2f5f", color: "white" }}>
                  <th style={th}>Chamado</th>
                  <th style={th}>Local</th>
                  <th style={th}>Prioridade</th>
                  <th style={th}>Data</th>
                </tr>
              </thead>

              <tbody>
                {dados.recentes.slice(0, 10).map((c, i) => (
                  <tr key={c.id || i}>
                    <td style={td}>{pdfText(c.codigo || c.titulo || `Chamado #${c.id || i + 1}`)}</td>
                    <td style={td}>{pdfText(c.localidade || c.estacao || c.unidade || "-")}</td>
                    <td style={td}>{pdfText(c.prioridade || "Média")}</td>
                    <td style={td}>{pdfText(formatarData(c.created_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PdfPanel>

          <PdfPanel titulo="SLA">
            <div style={{ textAlign: "center", marginTop: 18 }}>
              <div
                style={{
                  width: 180,
                  height: 180,
                  borderRadius: "50%",
                  margin: "0 auto",
                  border: "18px solid #1e9bff",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 42, fontWeight: 950, color: "#0f2f5f" }}>
                    {dados.slaAtendido}%
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                    {pdfText("SLA atendido")}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 28, display: "grid", gap: 12 }}>
                <PdfMiniBox label="Dentro do prazo" value={`${dados.total - dados.criticos} chamados`} color="#16a34a" />
                <PdfMiniBox label="Fora do prazo / críticos" value={`${dados.criticos} chamados`} color="#dc2626" />
              </div>
            </div>
          </PdfPanel>
        </div>
      </ReportPage>
    </>
  );
}

function HeaderPdf({ titulo, subtitulo }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <img
        src={LOGO_URL}
        alt="Logo"
        crossOrigin="anonymous"
        style={{ width: 160, background: "white", borderRadius: 8, display: "block" }}
      />

      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#0f2f5f", whiteSpace: "nowrap" }}>
          {pdfText(titulo)}
        </div>

        <div style={{ color: "#64748b", marginTop: 6, whiteSpace: "nowrap", fontSize: 16 }}>
          {pdfText(subtitulo)}
        </div>
      </div>
    </div>
  );
}

function PdfKpi({ titulo, valor, detalhe, cor }) {
  return (
    <div
      style={{
        border: `1px solid ${cor}`,
        background: "#ffffff",
        borderRadius: 16,
        padding: 16,
        color: "#0f172a",
        minHeight: 110,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 900, color: "#475569", whiteSpace: "nowrap" }}>
        {pdfText(titulo)}
      </div>

      <div style={{ fontSize: 32, fontWeight: 950, color: cor, lineHeight: 1.1 }}>
        {valor}
      </div>

      <div style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
        {pdfText(detalhe)}
      </div>
    </div>
  );
}

function PdfPanel({ titulo, children }) {
  return (
    <div
      style={{
        border: "1px solid #dbe3ef",
        borderRadius: 16,
        padding: 16,
        minHeight: 245,
      }}
    >
      <div style={{ fontSize: 17, color: "#0f2f5f", fontWeight: 900, marginBottom: 14 }}>
        {pdfText(titulo)}
      </div>
      {children}
    </div>
  );
}

function PdfBars({ dados, cor }) {
  const max = Math.max(...dados.map((d) => d.value), 1);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {dados.length ? (
        dados.map((item, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <strong>{pdfText(item.name)}</strong>
              <span>{item.value}</span>
            </div>

            <div style={{ height: 10, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.max(8, (item.value / max) * 100)}%`,
                  height: "100%",
                  background: cor,
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
        ))
      ) : (
        <div style={{ color: "#64748b" }}>{pdfText("Sem dados")}</div>
      )}
    </div>
  );
}

function PdfList({ dados, colorMap }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {dados.length ? (
        dados.map((item, i) => {
          const cor = colorMap[item.name] || "#1e9bff";

          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: cor, display: "inline-block" }} />
                <strong>{pdfText(item.name)}</strong>
              </div>

              <strong style={{ color: cor }}>{item.value}</strong>
            </div>
          );
        })
      ) : (
        <div style={{ color: "#64748b" }}>{pdfText("Sem dados")}</div>
      )}
    </div>
  );
}

function PdfMiniBox({ label, value, color }) {
  return (
    <div
      style={{
        border: `1px solid ${color}`,
        borderRadius: 14,
        padding: 14,
        textAlign: "left",
      }}
    >
      <div style={{ color: "#475569", fontSize: 12, fontWeight: 900 }}>{pdfText(label)}</div>
      <div style={{ color, fontSize: 20, fontWeight: 950 }}>{pdfText(value)}</div>
    </div>
  );
}

const th = {
  padding: 10,
  textAlign: "left",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const td = {
  padding: "9px 10px",
  borderBottom: "1px solid #dbe3ef",
  verticalAlign: "top",
  lineHeight: 1.2,
};