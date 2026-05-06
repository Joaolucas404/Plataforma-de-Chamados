import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  FileDown,
  Gauge,
  Save,
  ShieldAlert,
  X,
} from "lucide-react";

const LOGO_URL = "https://i.imgur.com/aAMds6C.jpeg";

const ebapsBase = [
  "EBAP Aribiri",
  "EBAP Comportas",
  "EBAP Foz da Costa",
  "EBAP Cobilândia",
  "EBAP Laranja",
  "EBAP Marinho",
  "EBAP Sitio de Batalha",
  "EBAP Bigossi",
  "EBAP Canal da Costa",
  "EBAP Marilândia",
  "EBAP Guaranhus",
];

const statusConfig = {
  operando: {
    label: "Operando",
    color: "#38e66b",
    bg: "rgba(56,230,107,.12)",
    border: "rgba(56,230,107,.45)",
  },
  atencao: {
    label: "Atenção",
    color: "#ffc83d",
    bg: "rgba(255,200,61,.12)",
    border: "rgba(255,200,61,.45)",
  },
  falha: {
    label: "Falha",
    color: "#ff5148",
    bg: "rgba(255,81,72,.12)",
    border: "rgba(255,81,72,.45)",
  },
};

function PumpIcon({ size = 58 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <path d="M32 10H48L52 18V30H28V18L32 10Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <path d="M30 30H50L56 42V58H24V42L30 30Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <path d="M22 58H58V68H22V58Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <path d="M28 68H52" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M36 10V5H44V10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 44H18C14 44 11 47 11 51V58" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M52 44H62C66 44 69 47 69 51V58" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M34 20H46" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".7" />
      <path d="M32 50H48" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

function GateIcon({ size = 58 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <path d="M16 24H64" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M20 24V66H60V24" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
      <path d="M28 32V62M40 32V62M52 32V62" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M24 62H56" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M26 16H54" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M34 8V16M46 8V16" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M24 62L56 24M56 62L24 24" stroke="currentColor" strokeWidth="3" opacity=".65" />
    </svg>
  );
}

function RakeIcon({ size = 58 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <path d="M18 18H62" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M20 18V62M28 18V62M36 18V62M44 18V62M52 18V62M60 18V62" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M14 62H66" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M16 68H64" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity=".65" />
      <path d="M22 62L18 70M30 62L26 70M38 62L34 70M46 62L42 70M54 62L50 70M62 62L58 70" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function criarEquipamentos(tipo, total, prefixo) {
  return Array.from({ length: total }, (_, i) => ({
    id: `${tipo}-${i + 1}`,
    nome: `${prefixo} ${String(i + 1).padStart(2, "0")}`,
    status: "operando",
    observacao: "",
  }));
}

const dadosIniciais = ebapsBase.map((nome, index) => ({
  nome,
  id: `EBAP-${String(index + 1).padStart(3, "0")}`,
  bombas: criarEquipamentos("bomba", nome === "EBAP Foz da Costa" ? 8 : 2, "Bomba"),
  rastelos: criarEquipamentos("rastelo", 1, "Rastelo"),
  comportas: criarEquipamentos("comporta", 3, "Comporta"),
}));

function resumo(lista) {
  const total = lista.length;
  const operando = lista.filter((e) => e.status === "operando").length;
  const atencao = lista.filter((e) => e.status === "atencao").length;
  const falha = lista.filter((e) => e.status === "falha").length;

  let status = "operando";
  if (falha > 0) status = "falha";
  else if (atencao > 0) status = "atencao";

  return { total, operando, atencao, falha, status };
}

export default function EquipamentosPage() {
  const [ebaps, setEbaps] = useState(dadosIniciais);
  const [editando, setEditando] = useState(false);
  const [modal, setModal] = useState(null);

  const totais = useMemo(() => {
    let operando = 0;
    let atencao = 0;
    let falha = 0;
    let total = 0;

    ebaps.forEach((ebap) => {
      ["bombas", "rastelos", "comportas"].forEach((tipo) => {
        const r = resumo(ebap[tipo]);
        operando += r.operando;
        atencao += r.atencao;
        falha += r.falha;
        total += r.total;
      });
    });

    return { operando, atencao, falha, total };
  }, [ebaps]);

  function exportarPDF() {
    setModal(null);
    setTimeout(() => window.print(), 250);
  }

  function alterarQuantidade(index, tipo, quantidade) {
    const qtd = Math.max(0, Number(quantidade || 0));

    setEbaps((prev) =>
      prev.map((ebap, i) => {
        if (i !== index) return ebap;

        const prefixo = tipo === "bombas" ? "Bomba" : tipo === "rastelos" ? "Rastelo" : "Comporta";
        const atuais = ebap[tipo];

        const novaLista =
          qtd > atuais.length
            ? [
                ...atuais,
                ...Array.from({ length: qtd - atuais.length }, (_, idx) => ({
                  id: `${tipo}-${atuais.length + idx + 1}`,
                  nome: `${prefixo} ${String(atuais.length + idx + 1).padStart(2, "0")}`,
                  status: "operando",
                  observacao: "",
                })),
              ]
            : atuais.slice(0, qtd);

        return { ...ebap, [tipo]: novaLista };
      })
    );
  }

  function alterarStatusEquipamento(ebapIndex, tipo, equipamentoId, status) {
    setEbaps((prev) =>
      prev.map((ebap, i) => {
        if (i !== ebapIndex) return ebap;

        return {
          ...ebap,
          [tipo]: ebap[tipo].map((eq) =>
            eq.id === equipamentoId
              ? {
                  ...eq,
                  status,
                  observacao: status === "operando" ? "" : eq.observacao,
                }
              : eq
          ),
        };
      })
    );
  }

  function alterarObservacaoEquipamento(ebapIndex, tipo, equipamentoId, observacao) {
    setEbaps((prev) =>
      prev.map((ebap, i) => {
        if (i !== ebapIndex) return ebap;

        return {
          ...ebap,
          [tipo]: ebap[tipo].map((eq) =>
            eq.id === equipamentoId ? { ...eq, observacao } : eq
          ),
        };
      })
    );
  }

  return (
    <>
     <style>{`
  .pdf-report {
    display: none;
  }

  @media print {
    @page {
      size: A4 landscape;
      margin: 0;
    }

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 297mm !important;
      height: 210mm !important;
      background: white !important;
      overflow: hidden !important;
    }

    body * {
      visibility: hidden !important;
    }

    .pdf-report,
    .pdf-report * {
      visibility: visible !important;
    }

    .pdf-report {
      display: block !important;
      position: fixed !important;
      inset: 0 !important;
      width: 297mm !important;
      height: 210mm !important;
      background: white !important;
      color: #111827 !important;
      font-family: Arial, sans-serif !important;
      z-index: 999999 !important;
      overflow: hidden !important;
    }

    .pdf-page {
      width: 297mm !important;
      height: 210mm !important;
      padding: 7mm !important;
      box-sizing: border-box !important;
      background: #f1f5f9 !important;
    }

    .pdf-content {
      width: 100% !important;
      height: 100% !important;
      background: white !important;
      border-radius: 12px !important;
      padding: 9mm !important;
      box-sizing: border-box !important;
      border: 1px solid #dbe3ef !important;
      overflow: hidden !important;
    }

    .screen-only,
    aside,
    header,
    nav,
    footer,
    button,
    .no-print {
      display: none !important;
      visibility: hidden !important;
    }
  }
`}</style>

      <div className="screen-only">
        <div style={{ minHeight: "100vh", color: "#ecf3ff", fontFamily: "Inter, Arial, sans-serif" }}>
          <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontSize: 32, fontWeight: 950, margin: 0 }}>
              Status de Equipamentos por EBAP
            </h1>

            <p style={{ color: "#9fb1cc", marginTop: 8 }}>
              Relatório de bombas, rastelos e comportas por unidade operacional.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(180px, 1fr))",
              gap: 16,
              marginBottom: 22,
            }}
          >
            <TopCard title="EBAPs" value={ebaps.length} icon={<Building2 />} />
            <TopCard title="Total" value={totais.total} icon={<Gauge />} />
            <TopCard title="Operando" value={totais.operando} color="#38e66b" icon={<Activity />} />
            <TopCard title="Atenção" value={totais.atencao} color="#ffc83d" icon={<AlertTriangle />} />
            <TopCard title="Falha" value={totais.falha} color="#ff5148" icon={<ShieldAlert />} />
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
            <button
              onClick={() => setEditando((v) => !v)}
              style={{
                background: editando
                  ? "linear-gradient(135deg, #14a44d, #0f7a34)"
                  : "linear-gradient(135deg, #2f7bff, #1658d1)",
                color: "white",
                border: "none",
                borderRadius: 16,
                padding: "14px 22px",
                fontWeight: 900,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Save size={18} />
              {editando ? "Salvar quantidades" : "Editar quantidades"}
            </button>

            <button
              onClick={exportarPDF}
              style={{
                background: "linear-gradient(135deg, #ff7a1a, #d85d00)",
                color: "white",
                border: "none",
                borderRadius: 16,
                padding: "14px 22px",
                fontWeight: 900,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <FileDown size={18} />
              Exportar PDF
            </button>
          </div>

          <div
            style={{
              background: "rgba(8,22,43,.86)",
              border: "1px solid rgba(130,170,220,.18)",
              borderRadius: 24,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 1fr 1fr 1fr",
                padding: "18px 22px",
                background: "rgba(255,255,255,.035)",
                color: "#b9c8df",
                fontWeight: 900,
                textTransform: "uppercase",
                fontSize: 13,
              }}
            >
              <div>EBAP</div>
              <HeaderIcon icon={<PumpIcon size={34} />} label="Bombas" />
              <HeaderIcon icon={<RakeIcon size={34} />} label="Rastelos" />
              <HeaderIcon icon={<GateIcon size={34} />} label="Comportas" />
            </div>

            {ebaps.map((ebap, index) => (
              <div
                key={ebap.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.1fr 1fr 1fr 1fr",
                  gap: 14,
                  padding: 18,
                  borderTop: "1px solid rgba(130,170,220,.13)",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>{ebap.nome}</div>
                  <div style={{ color: "#7f91ad", fontSize: 13 }}>{ebap.id}</div>
                </div>

                <StatusCard
                  icon={<PumpIcon />}
                  lista={ebap.bombas}
                  editando={editando}
                  onQtdChange={(qtd) => alterarQuantidade(index, "bombas", qtd)}
                  onClick={() => setModal({ ebapIndex: index, tipo: "bombas", titulo: "Bombas" })}
                />

                <StatusCard
                  icon={<RakeIcon />}
                  lista={ebap.rastelos}
                  editando={editando}
                  onQtdChange={(qtd) => alterarQuantidade(index, "rastelos", qtd)}
                  onClick={() => setModal({ ebapIndex: index, tipo: "rastelos", titulo: "Rastelos" })}
                />

                <StatusCard
                  icon={<GateIcon />}
                  lista={ebap.comportas}
                  editando={editando}
                  onQtdChange={(qtd) => alterarQuantidade(index, "comportas", qtd)}
                  onClick={() => setModal({ ebapIndex: index, tipo: "comportas", titulo: "Comportas" })}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <RelatorioPDF ebaps={ebaps} totais={totais} />

      {modal && (
        <DetalhesModal
          ebap={ebaps[modal.ebapIndex]}
          tipo={modal.tipo}
          titulo={modal.titulo}
          onClose={() => setModal(null)}
          onStatusChange={(equipamentoId, status) =>
            alterarStatusEquipamento(modal.ebapIndex, modal.tipo, equipamentoId, status)
          }
          onObservacaoChange={(equipamentoId, observacao) =>
            alterarObservacaoEquipamento(modal.ebapIndex, modal.tipo, equipamentoId, observacao)
          }
        />
      )}
    </>
  );
}

function HeaderIcon({ icon, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <span style={{ color: "#8ea3bd", opacity: 0.8 }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function StatusCard({ lista, icon, editando, onQtdChange, onClick }) {
  const r = resumo(lista);
  const cfg = statusConfig[r.status];

  return (
    <div
      onClick={!editando ? onClick : undefined}
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 18,
        padding: "18px 20px",
        minHeight: 120,
        cursor: editando ? "default" : "pointer",
        boxShadow: `0 0 28px ${cfg.bg}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ color: cfg.color, fontWeight: 900, fontSize: 18 }}>● {cfg.label}</div>

        <div style={{ fontSize: 34, fontWeight: 950, marginTop: 8 }}>
          {r.operando} / {r.total}
        </div>

        <div style={{ color: "#9fb1cc", fontSize: 12, marginTop: 4 }}>
          {r.operando} operando | {r.atencao} atenção | {r.falha} falha
        </div>

        {editando && (
          <input
            type="number"
            min="0"
            value={r.total}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onQtdChange(e.target.value)}
            style={{
              marginTop: 12,
              width: 90,
              height: 38,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(0,0,0,.25)",
              color: "white",
              padding: "0 12px",
              fontWeight: 900,
            }}
          />
        )}
      </div>

      <div style={{ opacity: 0.42, width: 66, height: 66, display: "grid", placeItems: "center", color: "#d7e8ff" }}>
        {icon}
      </div>
    </div>
  );
}

function TopCard({ title, value, icon, color = "#2f9bff" }) {
  return (
    <div
      style={{
        background: "rgba(9,25,48,.82)",
        border: "1px solid rgba(130,170,220,.18)",
        borderRadius: 20,
        padding: 18,
      }}
    >
      <div style={{ color, marginBottom: 10 }}>{icon}</div>
      <div style={{ color: "#9fb1cc", fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 950 }}>{value}</div>
    </div>
  );
}

function DetalhesModal({ ebap, tipo, titulo, onClose, onStatusChange, onObservacaoChange }) {
  const lista = ebap[tipo];
  const modalRef = useRef(null);

  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEsc);

    setTimeout(() => {
      modalRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.72)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflowY: "auto",
        zIndex: 9999,
        padding: 24,
      }}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(920px, calc(100vw - 40px))",
          maxHeight: "86vh",
          overflow: "auto",
          background: "linear-gradient(180deg, #071b32, #04101f)",
          border: "1px solid rgba(130,170,220,.25)",
          borderRadius: 26,
          padding: 24,
          color: "white",
          boxShadow: "0 30px 100px rgba(0,0,0,.55)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 22 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 950 }}>
              {titulo} - {ebap.nome}
            </h2>

            <p style={{ margin: "8px 0 0", color: "#9fb1cc" }}>
              Lista individual dos equipamentos da unidade.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 46,
              height: 46,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(255,255,255,.08)",
              color: "white",
              cursor: "pointer",
            }}
          >
            <X />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
          {lista.map((eq) => {
            const cfg = statusConfig[eq.status];

            return (
              <div
                key={eq.id}
                style={{
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 950 }}>{eq.nome}</div>

                <div style={{ marginTop: 8, color: cfg.color, fontWeight: 900 }}>
                  ● {cfg.label}
                </div>

                <select
                  value={eq.status}
                  onChange={(e) => onStatusChange(eq.id, e.target.value)}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.16)",
                    background: "#071426",
                    color: "white",
                    padding: "0 12px",
                    fontWeight: 800,
                  }}
                >
                  <option value="operando">🟢 Operando</option>
                  <option value="atencao">🟡 Atenção</option>
                  <option value="falha">🔴 Falha</option>
                </select>

                {eq.status !== "operando" && (
                  <textarea
                    value={eq.observacao || ""}
                    onChange={(e) => onObservacaoChange(eq.id, e.target.value)}
                    placeholder="Resumo da falha ou observação..."
                    style={{
                      marginTop: 12,
                      width: "100%",
                      minHeight: 72,
                      resize: "none",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,.16)",
                      background: "rgba(0,0,0,.22)",
                      color: "white",
                      padding: 12,
                      fontSize: 13,
                      outline: "none",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RelatorioPDF({ ebaps, totais }) {
  const data = new Date().toLocaleString("pt-BR");

  return (
    <div className="pdf-report">
      <div className="pdf-page">
        <div className="pdf-content">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "4px solid #0f3f9f",
              paddingBottom: 14,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <img
                src={LOGO_URL}
                alt="Logo"
                style={{
                  width: 82,
                  height: 58,
                  objectFit: "contain",
                }}
              />

              <div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a" }}>
                  Relatório Operacional de Equipamentos
                </div>

                <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>
                  Bombas, rastelos e comportas por EBAP
                </div>
              </div>
            </div>

            <div
              style={{
                textAlign: "right",
                color: "#475569",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              <strong>Consórcio União OBRACON</strong>
              <br />
              Gerado em: {data}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <PdfKpi title="EBAPs" value={ebaps.length} color="#2563eb" />
            <PdfKpi title="Equipamentos" value={totais.total} color="#0891b2" />
            <PdfKpi title="Operando" value={totais.operando} color="#15803d" />
            <PdfKpi title="Atenção" value={totais.atencao} color="#ca8a04" />
            <PdfKpi title="Falha" value={totais.falha} color="#dc2626" />
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: 10.2,
              overflow: "hidden",
              borderRadius: 12,
              border: "1px solid #dbe3ef",
            }}
          >
            <thead>
              <tr style={{ background: "#0f3f9f", color: "white" }}>
                <th style={th}>EBAP</th>
                <th style={th}>Bombas</th>
                <th style={th}>Rastelos</th>
                <th style={th}>Comportas</th>
                <th style={th}>Observações</th>
              </tr>
            </thead>

            <tbody>
              {ebaps.map((ebap, i) => (
                <tr
                  key={ebap.id}
                  style={{ background: i % 2 === 0 ? "#ffffff" : "#f1f5f9" }}
                >
                  <td style={td}>
                    <strong>{ebap.nome}</strong>
                    <br />
                    <span style={{ color: "#64748b" }}>{ebap.id}</span>
                  </td>

                  <td style={td}>{renderPdfResumo(ebap.bombas)}</td>
                  <td style={td}>{renderPdfResumo(ebap.rastelos)}</td>
                  <td style={td}>{renderPdfResumo(ebap.comportas)}</td>
                  <td style={td}>{renderObservacoes(ebap)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              marginTop: 10,
              fontSize: 10,
              color: "#64748b",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Relatório gerado automaticamente pelo sistema.</span>
            <span>Manutenção / Operação</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PdfKpi({ title, value, color }) {
  return (
    <div
      style={{
        border: `2px solid ${color}`,
        borderRadius: 14,
        padding: 12,
        background: "#ffffff",
      }}
    >
      <div style={{ color, fontWeight: 800, fontSize: 11 }}>{title}</div>
      <div style={{ marginTop: 4, fontSize: 26, fontWeight: 900, color: "#111827" }}>
        {value}
      </div>
    </div>
  );
}

function renderPdfResumo(lista) {
  const r = resumo(lista);
  const status = r.falha > 0 ? "Falha" : r.atencao > 0 ? "Atenção" : "Operando";
  const color = r.falha > 0 ? "#dc2626" : r.atencao > 0 ? "#ca8a04" : "#15803d";

  return (
    <div>
      <strong style={{ fontSize: 13 }}>{r.operando}/{r.total}</strong>
      <div style={{ marginTop: 3, color, fontWeight: 700 }}>{status}</div>
      <div style={{ color: "#64748b", fontSize: 9 }}>
        {r.operando} op. | {r.atencao} atenção | {r.falha} falha
      </div>
    </div>
  );
}

function renderObservacoes(ebap) {
  const todos = [...ebap.bombas, ...ebap.rastelos, ...ebap.comportas];

  const obs = todos.filter(
    (e) => e.status !== "operando" && e.observacao?.trim()
  );

  if (!obs.length) return <span style={{ color: "#15803d", fontWeight: 700 }}>Sem ocorrências</span>;

  return obs.map((o) => (
    <div key={o.id} style={{ marginBottom: 5 }}>
      <strong>{o.nome}:</strong> {o.observacao}
    </div>
  ));
}

const th = {
  padding: "9px 10px",
  textAlign: "left",
  fontWeight: 800,
  borderRight: "1px solid rgba(255,255,255,.25)",
};

const td = {
  padding: "9px 10px",
  borderBottom: "1px solid #dbe3ef",
  verticalAlign: "top",
};