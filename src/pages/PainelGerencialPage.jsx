import React, { useEffect, useMemo, useState } from "react";
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

function corPrioridade(nome) {
  const n = String(nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (n === "baixa") return "#30d158";
  if (n === "media") return "#facc15";
  if (n === "alta") return "#ff9f1a";
  if (n === "critica" || n === "critico") return "#ff3131";
  return "#9ca3af";
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

function KpiCard({ icon, titulo, valor, detalhe, cor, critical }) {
  return (
    <div
      className={`dash-card ${critical ? "critical-pulse" : ""}`}
      style={{ borderColor: cor, boxShadow: `0 0 22px ${cor}33` }}
    >
      <div style={{ fontSize: 34 }}>{icon}</div>

      <div>
        <div className="dash-kpi-title">{titulo}</div>
        <div className="dash-kpi-value">{valor}</div>
        <div style={{ color: "#44ff8f", fontSize: 12 }}>{detalhe}</div>
      </div>
    </div>
  );
}

function Box({ title, children }) {
  return (
    <div className="dash-box">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

const renderPieLabel = ({ percent }) => `${(percent * 100).toFixed(0)}%`;

export default function PainelGerencialPage({ tickets = [], loading }) {
  const [agora, setAgora] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dados = useMemo(() => {
    const total = tickets.length;

    const finalizados = tickets.filter((t) =>
      ["Concluído", "Encerrado", "Finalizado", "Fechado"].includes(t.status)
    ).length;

    const execucao = tickets.filter((t) =>
      ["Em andamento", "Em execução"].includes(t.status)
    ).length;

    const abertos = tickets.filter(
      (t) =>
        !["Concluído", "Encerrado", "Finalizado", "Fechado"].includes(t.status)
    ).length;

    const criticos = tickets.filter((t) => {
      const p = String(t.prioridade || "").toLowerCase();
      const c = String(t.criticidade || "").toLowerCase();
      return p.includes("crít") || p.includes("crit") || c === "severa";
    }).length;

    const slaBase = tickets.filter((t) => t.sla);
    const slaOk = slaBase.filter(
      (t) => Number(t.sla_consumido || 0) <= Number(t.sla)
    ).length;

    const slaAtendido =
      slaBase.length > 0 ? Math.round((slaOk / slaBase.length) * 100) : 0;

    const porPrioridade = {};
    const porEstacao = {};
    const porTipo = {};
    const porEquipe = {};

    tickets.forEach((t) => {
      const prioridade = t.prioridade || "Sem prioridade";
      const estacao = t.localidade || "Sem estação";
      const tipo = t.tipo_falha || "Não informado";
      const equipe = t.tecnico || "Não atribuído";

      porPrioridade[prioridade] = (porPrioridade[prioridade] || 0) + 1;
      porEstacao[estacao] = (porEstacao[estacao] || 0) + 1;
      porTipo[tipo] = (porTipo[tipo] || 0) + 1;
      porEquipe[equipe] = (porEquipe[equipe] || 0) + 1;
    });

    return {
      total,
      abertos,
      execucao,
      finalizados,
      criticos,
      slaAtendido,
      prioridade: Object.entries(porPrioridade).map(([name, value]) => ({
        name,
        value,
      })),
      estacao: Object.entries(porEstacao).map(([name, value]) => ({
        name,
        value,
      })),
      tipo: Object.entries(porTipo).map(([name, value]) => ({
        name,
        value,
      })),
      equipe: Object.entries(porEquipe).map(([name, value]) => ({
        name,
        value,
      })),
    };
  }, [tickets]);

  if (loading) {
    return <div style={{ color: "white" }}>Carregando painel...</div>;
  }

  return (
    <div className="dashboard">
      <style>{`
        .dashboard {
          background: radial-gradient(circle at top, #06203a 0%, #020b16 45%, #010711 100%);
          color: white;
          padding: 20px;
          border-radius: 18px;
          border: 1px solid #12314d;
          min-height: 100vh;
          animation: fadeIn .55s ease;
          overflow-x: hidden;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pop {
          from { transform: scale(.96); opacity: .3; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes glowPulse {
          0% { box-shadow: 0 0 10px rgba(34,199,255,.15); }
          50% { box-shadow: 0 0 26px rgba(34,199,255,.35); }
          100% { box-shadow: 0 0 10px rgba(34,199,255,.15); }
        }

        @keyframes criticalPulse {
          0% { box-shadow: 0 0 12px rgba(255,49,49,.25); }
          50% { box-shadow: 0 0 34px rgba(255,49,49,.65); }
          100% { box-shadow: 0 0 12px rgba(255,49,49,.25); }
        }

        .critical-pulse {
          animation: criticalPulse 1.8s infinite ease-in-out !important;
        }

        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 22px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .dash-title {
          margin: 0;
          font-size: clamp(26px, 2.6vw, 38px);
          font-weight: 900;
          letter-spacing: 1px;
          color: #fff;
        }

        .dash-subtitle {
          color: #22c7ff;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .dash-clock {
          text-align: right;
          background: rgba(255,255,255,.04);
          border: 1px solid #173653;
          border-radius: 14px;
          padding: 12px 16px;
          animation: glowPulse 3s infinite ease-in-out;
        }

        .dash-grid-kpi {
          display: grid;
          grid-template-columns: repeat(5, minmax(180px, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }

        .dash-card {
          background: linear-gradient(135deg, rgba(30,155,255,.13), #05111f 72%);
          border: 1px solid;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 98px;
          animation: pop .45s ease;
          transition: .25s ease;
        }

        .dash-card:hover {
          transform: translateY(-3px);
          filter: brightness(1.12);
        }

        .dash-kpi-title {
          color: #b8c7dc;
          font-size: 12px;
          font-weight: 900;
        }

        .dash-kpi-value {
          font-size: 32px;
          font-weight: 900;
          color: #fff;
        }

        .dash-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(260px, 1fr));
          gap: 16px;
          align-items: start;
        }

        .dash-box {
          background: linear-gradient(180deg, rgba(6,26,47,.98) 0%, rgba(2,11,22,.98) 100%);
          border: 1px solid #1e6bb8;
          border-radius: 16px;
          padding: 16px;
          min-height: 330px;
          animation: fadeIn .65s ease;
          transition: .25s ease;
          box-shadow: 0 0 24px rgba(0,120,255,.10);
        }

        .dash-box:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(0,120,255,.25);
        }

        .dash-box h3 {
          margin: 0 0 14px;
          font-size: 15px;
          font-weight: 900;
          color: #f4f8ff;
          letter-spacing: .04em;
        }

        .recharts-tooltip-wrapper {
          outline: none;
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

        @media (max-width: 1200px) {
          .dash-grid-kpi {
            grid-template-columns: repeat(2, minmax(180px, 1fr));
          }

          .dash-grid {
            grid-template-columns: repeat(2, minmax(260px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .dash-grid-kpi,
          .dash-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="dash-header">
        <div>
          <h1 className="dash-title">PAINEL GERENCIAL — GESTÃO DE CHAMADOS</h1>
          <div className="dash-subtitle">
            VISÃO GERAL DA OPERAÇÃO EM TEMPO REAL
          </div>
        </div>

        <div className="dash-clock">
          <div style={{ fontSize: 26, fontWeight: 900 }}>
            {agora.toLocaleTimeString("pt-BR")}
          </div>
          <div style={{ color: "#9fb1cc" }}>
            {agora.toLocaleDateString("pt-BR")}
          </div>
        </div>
      </div>

      <div className="dash-grid-kpi">
        <KpiCard
          icon="📂"
          titulo="CHAMADOS ABERTOS"
          valor={dados.abertos}
          detalhe="operação ativa"
          cor="#1e9bff"
        />

        <KpiCard
          icon="⚙️"
          titulo="EM EXECUÇÃO"
          valor={dados.execucao}
          detalhe="em atendimento"
          cor="#ff9f1a"
        />

        <KpiCard
          icon="✅"
          titulo="FINALIZADOS"
          valor={dados.finalizados}
          detalhe="histórico geral"
          cor="#30d158"
        />

        <KpiCard
          icon="🎯"
          titulo="SLA ATENDIDO"
          valor={`${dados.slaAtendido}%`}
          detalhe="dados reais"
          cor="#ff5c7a"
        />

        <KpiCard
          icon="🚨"
          titulo="CRÍTICOS"
          valor={dados.criticos}
          detalhe="atenção imediata"
          cor="#ff3131"
          critical={dados.criticos > 0}
        />
      </div>

      <div className="dash-grid">
        <Box title="CHAMADOS POR PRIORIDADE">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={dados.prioridade}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={92}
                paddingAngle={4}
                label={renderPieLabel}
                labelLine={false}
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {dados.prioridade.map((item, i) => (
                  <Cell
                    key={i}
                    fill={corPrioridade(item.name)}
                    stroke="#020b16"
                    strokeWidth={2}
                    style={{
                      filter: `drop-shadow(0 0 7px ${corPrioridade(
                        item.name
                      )}88)`,
                    }}
                  />
                ))}
              </Pie>

              <TooltipDark />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>

        <Box title="CHAMADOS POR ESTAÇÃO">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dados.estacao}>
              <CartesianGrid stroke="#12314d" />
              <XAxis dataKey="name" tick={false} axisLine={false} />
              <YAxis stroke="#9fb1cc" allowDecimals={false} />
              <TooltipDark />
              <Bar
                dataKey="value"
                fill="#1e9bff"
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
                style={{ filter: "drop-shadow(0 0 6px #1e9bff88)" }}
              >
                <LabelList
                  dataKey="value"
                  position="top"
                  fill="#ffffff"
                  fontSize={12}
                  fontWeight={900}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>

        <Box title="PRODUTIVIDADE POR EQUIPE">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dados.equipe}>
              <CartesianGrid stroke="#12314d" />
              <XAxis dataKey="name" tick={false} axisLine={false} />
              <YAxis stroke="#9fb1cc" allowDecimals={false} />
              <TooltipDark />
              <Bar
                dataKey="value"
                fill="#30d158"
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
                style={{ filter: "drop-shadow(0 0 6px #30d15888)" }}
              >
                <LabelList
                  dataKey="value"
                  position="top"
                  fill="#ffffff"
                  fontSize={12}
                  fontWeight={900}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>

        <Box title="CHAMADOS POR TIPO">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dados.tipo}>
              <CartesianGrid stroke="#12314d" />
              <XAxis dataKey="name" tick={false} axisLine={false} />
              <YAxis stroke="#9fb1cc" allowDecimals={false} />
              <TooltipDark />
              <Bar
                dataKey="value"
                fill="#ff9f1a"
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
                style={{ filter: "drop-shadow(0 0 6px #ff9f1a88)" }}
              >
                <LabelList
                  dataKey="value"
                  position="top"
                  fill="#ffffff"
                  fontSize={12}
                  fontWeight={900}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </div>
    </div>
  );
}