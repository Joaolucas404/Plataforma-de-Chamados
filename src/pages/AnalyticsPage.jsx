import React, { useEffect, useMemo, useRef, useState } from "react";
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
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { supabase } from "../App";

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

export default function AnalyticsPage({ styles, colors }) {
  const reportRef = useRef(null);

  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [agora, setAgora] = useState(new Date());

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setAgora(new Date());
    }, 1000);

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

  async function exportarPDF() {
    if (!reportRef.current) return;

    setGerandoPdf(true);

    try {
      const elemento = reportRef.current;

      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#020b16",
        windowWidth: elemento.scrollWidth,
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const dataAtual = new Date().toLocaleDateString("pt-BR").replaceAll("/", "-");
      pdf.save(`relatorio-analytics-chamados-${dataAtual}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setGerandoPdf(false);
    }
  }

  const dados = useMemo(() => {
    const total = chamados.length;

    const abertos = chamados.filter((c) =>
      ["aberto", "aberta", "pendente"].includes(
        String(c.status || "").toLowerCase()
      )
    ).length;

    const execucao = chamados.filter((c) =>
      ["em execução", "em execucao", "andamento", "em andamento"].includes(
        String(c.status || "").toLowerCase()
      )
    ).length;

    const finalizados = chamados.filter((c) =>
      ["finalizado", "finalizada", "concluído", "concluido", "fechado"].includes(
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
      recentes: chamados.slice(0, 6),
    };
  }, [chamados]);

  return (
    <div className="analytics-premium">
      <style>{`
        .analytics-premium {
          width: 100%;
          color: #eaf3ff;
          overflow-x: hidden;
        }

        .analytics-actions {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 14px;
        }

        .pdf-button {
          border: 1px solid rgba(30,155,255,.65);
          background: linear-gradient(135deg, #1e9bff, #1658d1);
          color: white;
          border-radius: 16px;
          min-height: 48px;
          padding: 0 20px;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 16px 35px rgba(30,155,255,.22);
        }

        .pdf-button:disabled {
          opacity: .65;
          cursor: not-allowed;
        }

        .report-area {
          background: #020b16;
          border-radius: 18px;
          padding: 4px;
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

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(160px, 1fr));
          gap: 14px;
          margin-bottom: 16px;
        }

        .kpi-card {
          position: relative;
          min-height: 96px;
          padding: 18px;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--border);
          background:
            radial-gradient(circle at right bottom, var(--glow-soft), transparent 38%),
            linear-gradient(180deg, rgba(5,22,40,.96), rgba(2,10,20,.98));
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
            justify-content: stretch;
          }

          .pdf-button {
            width: 100%;
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

          .analytics-title span {
            letter-spacing: .12em;
            font-size: 11px;
          }
        }
      `}</style>

      <div className="analytics-actions">
        <button
          type="button"
          className="pdf-button"
          onClick={exportarPDF}
          disabled={gerandoPdf || carregando}
        >
          {gerandoPdf ? "Gerando PDF..." : "📄 Exportar PDF"}
        </button>
      </div>

      <div ref={reportRef} className="report-area">
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
                  {dados.recentes.length ? (
                    dados.recentes.map((c, i) => {
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
                    })
                  ) : (
                    <div className="empty">Nenhum chamado recente</div>
                  )}
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
    </div>
  );
}

function ChartPanel({ title, data, color }) {
  return (
    <Panel title={title}>
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#9fb1cc"
            tick={{ fill: "#9fb1cc", fontSize: 11 }}
            axisLine={{ stroke: "rgba(159,177,204,.6)" }}
            tickLine={false}
          />
          <YAxis
            stroke="#9fb1cc"
            allowDecimals={false}
            tick={{ fill: "#9fb1cc", fontSize: 12 }}
            axisLine={{ stroke: "rgba(159,177,204,.6)" }}
            tickLine={false}
          />
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