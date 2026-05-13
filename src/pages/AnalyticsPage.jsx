import React, { useEffect, useMemo, useState } from "react";
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
  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(true);
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

    const slaAtendido =
      total > 0 ? Math.round(((total - criticos) / total) * 100) : 0;

    const porPrioridade = agrupar(chamados, "prioridade");
    const porEstacao = agruparMultiCampo(chamados, [
      "localidade",
      "estacao",
      "unidade",
    ]);
    const porEquipe = agruparMultiCampo(chamados, [
      "tecnico",
      "equipe",
      "responsavel",
    ]);
    const porTipo = agruparMultiCampo(chamados, [
      "tipo_falha",
      "tipo",
      "categoria",
    ]);

    const recentes = chamados.slice(0, 6);

    return {
      total,
      abertos,
      execucao,
      finalizados,
      criticos,
      slaAtendido,
      porPrioridade,
      porEstacao,
      porEquipe,
      porTipo,
      recentes,
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

        .analytics-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .analytics-title h1 {
          margin: 0;
          font-size: 36px;
          font-weight: 950;
          letter-spacing: .03em;
          text-transform: uppercase;
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
          box-shadow:
            0 0 28px rgba(30,155,255,.18),
            inset 0 0 22px rgba(255,255,255,.03);
        }

        .clock-card strong {
          display: block;
          font-size: 24px;
          font-weight: 950;
          letter-spacing: .05em;
          color: white;
          text-shadow: 0 0 12px rgba(255,255,255,.18);
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
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border);
          background:
            radial-gradient(circle at right bottom, var(--glow-soft), transparent 38%),
            linear-gradient(180deg, rgba(5,22,40,.96), rgba(2,10,20,.98));
          box-shadow: 0 16px 45px rgba(0,0,0,.25);
        }

        .kpi-card::after {
          content: "";
          position: absolute;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          right: -44px;
          bottom: -44px;
          background: var(--glow);
          opacity: .14;
        }

        .kpi-row {
          display: flex;
          align-items: center;
          gap: 14px;
          position: relative;
          z-index: 1;
        }

        .kpi-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-size: 24px;
          background: var(--bg);
          box-shadow: 0 0 22px var(--shadow);
        }

        .kpi-label {
          color: #b8c7dd;
          text-transform: uppercase;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: .05em;
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
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 14px;
          margin-bottom: 14px;
        }

        .dash-grid-bottom {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .panel {
          border-radius: 12px;
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
          letter-spacing: .03em;
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

        .recharts-wrapper,
        .recharts-surface {
          background: transparent !important;
        }

        .recharts-default-tooltip {
          background: #061a2f !important;
          border: 1px solid rgba(30,155,255,.65) !important;
          border-radius: 12px !important;
          color: #eaf3ff !important;
          box-shadow: 0 12px 35px rgba(0,0,0,.45) !important;
        }

        .recharts-tooltip-label {
          color: #9fb1cc !important;
        }

        .recharts-legend-item-text {
          color: #cfe2ff !important;
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
      `}</style>

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
            <Kpi
              icon="📂"
              label="Chamados abertos"
              value={dados.abertos}
              sub="operação ativa"
              color={azul}
            />

            <Kpi
              icon="⚙️"
              label="Em execução"
              value={dados.execucao}
              sub="em atendimento"
              color={amarelo}
            />

            <Kpi
              icon="✅"
              label="Finalizados"
              value={dados.finalizados}
              sub="histórico geral"
              color={verde}
            />

            <Kpi
              icon="🎯"
              label="SLA atendido"
              value={`${dados.slaAtendido}%`}
              sub="dados reais"
              color={roxo}
            />

            <Kpi
              icon="🚨"
              label="Críticos"
              value={dados.criticos}
              sub="atenção imediata"
              color={vermelho}
            />
          </div>

          <div className="dash-grid">
            <Panel title="Chamados por prioridade">
              {dados.porPrioridade.length ? (
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dados.porPrioridade}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={84}
                      paddingAngle={2}
                    >
                      {dados.porPrioridade.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={prioridadeCores[entry.name] || azul}
                          stroke="rgba(2,10,20,.98)"
                          strokeWidth={2}
                        />
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

            <Panel title="Chamados por estação">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={dados.porEstacao}>
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
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(30,155,255,.08)" }} />
                  <Bar dataKey="value" fill={azul} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="panel-foot">Últimos 30 dias</div>
            </Panel>

            <Panel title="Produtividade por equipe">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={dados.porEquipe}>
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
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(34,197,94,.08)" }} />
                  <Bar dataKey="value" fill={verde} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="panel-foot">Base: chamados por equipe</div>
            </Panel>

            <Panel title="Chamados por tipo">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={dados.porTipo}>
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
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(245,158,11,.08)" }} />
                  <Bar dataKey="value" fill={laranja} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="panel-foot">Classificação geral</div>
            </Panel>
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
                          <strong>
                            {c.codigo || c.titulo || `Chamado #${c.id || i + 1}`}
                          </strong>
                          <small>
                            {c.localidade || c.estacao || c.unidade || "-"}
                          </small>
                        </div>

                        <span
                          className="priority-pill"
                          style={{
                            color: cor,
                            background: `${cor}22`,
                          }}
                        >
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
                    <span style={{ color: "#9fb1cc" }}>
                      {dados.total - dados.criticos} chamados
                    </span>
                  </div>

                  <div>
                    <strong>Fora do prazo / críticos</strong>
                    <br />
                    <span style={{ color: vermelho }}>
                      {dados.criticos} chamados
                    </span>
                  </div>
                </div>
              </div>

              <div className="panel-foot">Indicador operacional</div>
            </Panel>
          </div>
        </>
      )}
    </div>
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
        <div
          className="kpi-icon"
          style={{
            "--bg": `${color}22`,
            "--shadow": `${color}55`,
          }}
        >
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