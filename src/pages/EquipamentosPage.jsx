import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Activity,
  AlertTriangle,
  Building2,
  Eye,
  FileDown,
  Gauge,
  Save,
  ShieldAlert,
  X,
} from "lucide-react";

const LOGO_URL = "https://i.imgur.com/aAMds6C.jpeg";
const STORAGE_KEY = "equipamentos-ebap-storage";

function pdfText(texto) {
  return String(texto).replaceAll(" ", "\u00A0");
}

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
  const [ebaps, setEbaps] = useState(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      if (salvo) return JSON.parse(salvo);
      return dadosIniciais;
    } catch {
      return dadosIniciais;
    }
  });

  const [editando, setEditando] = useState(false);
  const [modal, setModal] = useState(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [previewAberto, setPreviewAberto] = useState(false);

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ebaps));
  }, [ebaps]);

  async function exportarPDF() {
    setGerandoPdf(true);
    setModal(null);

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
          letterRendering: false,
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

      pdf.save(`relatorio-equipamentos-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error(error);
      alert("Não foi possível gerar o PDF.");
    }

    setGerandoPdf(false);
  }

  function alterarQuantidade(index, tipo, quantidade) {
    const qtd = Math.max(0, Number(quantidade || 0));

    setEbaps((prev) =>
      prev.map((ebap, i) => {
        if (i !== index) return ebap;

        const prefixo =
          tipo === "bombas" ? "Bomba" : tipo === "rastelos" ? "Rastelo" : "Comporta";

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
        .pdf-stage-hidden {
          position: fixed;
          left: -20000px;
          top: 0;
          width: 1123px;
          height: auto;
          opacity: 1;
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
      `}</style>

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
          <button onClick={() => setEditando((v) => !v)} style={buttonStyle(editando)}>
            <Save size={18} />
            {editando ? "Salvar quantidades" : "Editar quantidades"}
          </button>

          <button
            onClick={() => setPreviewAberto(true)}
            style={{
              ...buttonBase,
              background: "linear-gradient(135deg, #0ea5e9, #0369a1)",
            }}
          >
            <Eye size={18} />
            Pré-visualizar
          </button>

          <button
            onClick={exportarPDF}
            disabled={gerandoPdf}
            style={{
              ...buttonBase,
              background: "linear-gradient(135deg, #ff7a1a, #d85d00)",
              opacity: gerandoPdf ? 0.7 : 1,
            }}
          >
            <FileDown size={18} />
            {gerandoPdf ? "Gerando PDF..." : "Baixar PDF"}
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

      <div className="pdf-stage-hidden">
        <RelatorioCompleto ebaps={ebaps} totais={totais} />
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
              }}
            >
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
              }}
            >
              {gerandoPdf ? "Gerando PDF..." : "Baixar PDF"}
            </button>
          </div>

          <div className="preview-page">
            <RelatorioCompleto ebaps={ebaps} totais={totais} />
          </div>
        </div>
      )}

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

const buttonBase = {
  color: "white",
  border: "none",
  borderRadius: 16,
  padding: "14px 22px",
  fontWeight: 900,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 10,
};

function buttonStyle(editando) {
  return {
    ...buttonBase,
    background: editando
      ? "linear-gradient(135deg, #14a44d, #0f7a34)"
      : "linear-gradient(135deg, #2f7bff, #1658d1)",
  };
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
        boxSizing: "border-box",
        fontFamily: "Arial, Helvetica, sans-serif",
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

function RelatorioCompleto({ ebaps, totais }) {
  const ebapsPorPagina = 7;
  const paginasTabela = [];

  for (let i = 0; i < ebaps.length; i += ebapsPorPagina) {
    paginasTabela.push(ebaps.slice(i, i + ebapsPorPagina));
  }

  const totalPaginas = 1 + paginasTabela.length;

  return (
    <>
      <ReportPage pageNumber={1} totalPages={totalPaginas}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <img
            src={LOGO_URL}
            alt="Logo"
            crossOrigin="anonymous"
            style={{ width: 160, background: "white", borderRadius: 8, display: "block" }}
          />

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#0f2f5f", whiteSpace: "nowrap" }}>
              {pdfText("RELATÓRIO OPERACIONAL")}
            </div>

            <div style={{ color: "#64748b", marginTop: 6, whiteSpace: "nowrap", fontSize: 16 }}>
              {pdfText("Status de Equipamentos por EBAP")}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 60 }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: "#0f2f5f", lineHeight: 1.1 }}>
            {pdfText("RELATÓRIO DE")}
          </div>

          <div style={{ fontSize: 44, fontWeight: 900, color: "#0f2f5f", lineHeight: 1.1 }}>
            {pdfText("EQUIPAMENTOS")}
          </div>

          <div style={{ marginTop: 22, width: 120, height: 5, background: "#1e9bff" }} />

          <div style={{ marginTop: 24, fontSize: 20, color: "#334155" }}>
            {pdfText("Bombas, rastelos e comportas por unidade operacional.")}
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
          <PdfKpi titulo="EBAPs" valor={ebaps.length} detalhe="Unidades monitoradas" cor="#1e3a8a" />
          <PdfKpi titulo="Equipamentos" valor={totais.total} detalhe="Total cadastrado" cor="#0891b2" />
          <PdfKpi titulo="Operando" valor={totais.operando} detalhe="Funcionando" cor="#16a34a" />
          <PdfKpi titulo="Atenção" valor={totais.atencao} detalhe="Acompanhamento" cor="#ca8a04" />
          <PdfKpi titulo="Falha" valor={totais.falha} detalhe="Intervenção" cor="#dc2626" />
        </div>
      </ReportPage>

      {paginasTabela.map((grupo, index) => (
        <ReportPage key={index} pageNumber={index + 2} totalPages={totalPaginas}>
          <div style={{ color: "#0f2f5f", margin: 0, fontSize: 30, fontWeight: 900 }}>
            {pdfText("Resumo por EBAP")}
          </div>

          <table
            style={{
              marginTop: 24,
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              tableLayout: "fixed",
            }}
          >
            <thead>
              <tr style={{ background: "#0f2f5f", color: "white" }}>
                <th style={{ ...th, width: "20%" }}>{pdfText("EBAP")}</th>
                <th style={{ ...th, width: "19%" }}>{pdfText("Bombas")}</th>
                <th style={{ ...th, width: "19%" }}>{pdfText("Rastelos")}</th>
                <th style={{ ...th, width: "19%" }}>{pdfText("Comportas")}</th>
                <th style={{ ...th, width: "23%" }}>{pdfText("Observações")}</th>
              </tr>
            </thead>

            <tbody>
              {grupo.map((ebap) => (
                <tr key={ebap.id}>
                  <td style={td}>
                    <strong>{pdfText(ebap.nome)}</strong>
                    <br />
                    <span style={{ color: "#64748b", fontSize: 11 }}>{pdfText(ebap.id)}</span>
                  </td>

                  <td style={td}>{renderPdfResumo(ebap.bombas)}</td>
                  <td style={td}>{renderPdfResumo(ebap.rastelos)}</td>
                  <td style={td}>{renderPdfResumo(ebap.comportas)}</td>
                  <td style={td}>{renderObservacoes(ebap)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportPage>
      ))}
    </>
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

function renderPdfResumo(lista) {
  const r = resumo(lista);
  const status = r.falha > 0 ? "Falha" : r.atencao > 0 ? "Atenção" : "Operando";
  const color = r.falha > 0 ? "#dc2626" : r.atencao > 0 ? "#ca8a04" : "#15803d";

  return (
    <div>
      <strong style={{ fontSize: 12 }}>
        {r.operando}/{r.total}
      </strong>

      <div style={{ color, fontWeight: 800, fontSize: 13 }}>
        {pdfText(status)}
      </div>

      <div style={{ color: "#64748b", fontSize: 10, whiteSpace: "nowrap" }}>
        {pdfText(`${r.operando} op. | ${r.atencao} atenção | ${r.falha} falha`)}
      </div>
    </div>
  );
}

function renderObservacoes(ebap) {
  const todos = [...ebap.bombas, ...ebap.rastelos, ...ebap.comportas];
  const obs = todos.filter((e) => e.status !== "operando" && e.observacao?.trim());

  if (!obs.length) {
    return (
      <div style={{ color: "#15803d", fontWeight: 800, whiteSpace: "nowrap" }}>
        {pdfText("Sem ocorrências")}
      </div>
    );
  }

  return obs.map((o) => (
    <div key={o.id} style={{ marginBottom: 4 }}>
      <strong>{pdfText(o.nome)}:</strong>{" "}
      {pdfText(o.observacao)}
    </div>
  ));
}

const th = {
  padding: 12,
  textAlign: "left",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const td = {
  padding: "9px 12px",
  borderBottom: "1px solid #dbe3ef",
  verticalAlign: "top",
  wordBreak: "normal",
  lineHeight: 1.15,
};