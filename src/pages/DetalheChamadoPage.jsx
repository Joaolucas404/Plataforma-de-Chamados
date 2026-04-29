import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase, getBadgeStyle } from "../App";

const estacoes = [
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

const statusOptions = ["Aberto", "Em andamento", "Aguardando compra", "Fechado"];
const prioridades = ["Baixa", "Média", "Alta", "Crítica"];
const criticidades = ["Baixa", "Média", "Alta", "Severa"];
const impactos = ["Baixo", "Médio", "Alto"];
const tiposFalha = ["Mecânica", "Elétrica", "Automação", "Operacional", "Outro"];

export default function DetalheChamadoPage({
  styles,
  colors,
  selecionado,
  usuario,
  carregarChamados,
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [chamado, setChamado] = useState(selecionado || null);
  const [form, setForm] = useState(selecionado || {});
  const [equipes, setEquipes] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [comentario, setComentario] = useState("");
  const [modalEdicao, setModalEdicao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [fotoAberta, setFotoAberta] = useState(null);

  const isGestor = usuario?.perfil === "gestor";
  const chamadoId = chamado?.id || selecionado?.id || id;

useEffect(() => {
  carregarDetalhes();

  if (!chamadoId || !supabase) return;

  const canal = supabase
    .channel(`comentarios-chamado-${chamadoId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "comentarios_chamados",
        filter: `chamado_id=eq.${chamadoId}`,
      },
      (payload) => {
        setComentarios((atuais) => {
          const existe = atuais.some((item) => item.id === payload.new.id);
          if (existe) return atuais;
          return [...atuais, payload.new];
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(canal);
  };
}, [chamadoId]);
  async function carregarEquipes() {
    const { data } = await supabase
      .from("equipes")
      .select("*")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    setEquipes(data || []);
  }

  async function carregarFotos() {
    const { data } = await supabase
      .from("anexos_chamados")
      .select("*")
      .eq("chamado_id", chamadoId)
      .order("created_at", { ascending: false });

    setFotos(data || []);
  }

  async function carregarComentarios() {
    const { data } = await supabase
      .from("comentarios_chamados")
      .select("*")
      .eq("chamado_id", chamadoId)
      .order("created_at", { ascending: true });

    setComentarios(data || []);
  }

  function alterarCampo(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvarEdicao() {
    setErro("");
    setMensagem("");
    setSalvando(true);

    const payload = {
      solicitante: form.solicitante || "",
      contato: form.contato || "",
      localidade: form.localidade || "",
      equipamento: form.equipamento || "",
      tipo_falha: form.tipo_falha || "",
      prioridade: form.prioridade || "",
      criticidade: form.criticidade || "",
      impacto: form.impacto || "",
      tecnico: form.tecnico || "",
      problema: form.problema || "",
      status: form.status || "Aberto",
      ultima_atualizacao: new Date().toLocaleString("pt-BR"),
    };

    const { data, error } = await supabase
      .from("chamados")
      .update(payload)
      .eq("id", chamadoId)
      .select()
      .single();

    if (error) {
      console.error(error);
      setErro("Erro ao salvar alterações.");
      setSalvando(false);
      return;
    }

    setChamado(data);
    setForm(data);
    setModalEdicao(false);
    setMensagem("Chamado atualizado com sucesso.");

    if (carregarChamados) carregarChamados();

    setSalvando(false);
  }

  async function alterarStatus(novoStatus) {
    if (!isGestor) return;

    setSalvando(true);

    const { data, error } = await supabase
      .from("chamados")
      .update({
        status: novoStatus,
        ultima_atualizacao: new Date().toLocaleString("pt-BR"),
      })
      .eq("id", chamadoId)
      .select()
      .single();

    if (error) {
      console.error(error);
      setErro("Erro ao alterar status.");
      setSalvando(false);
      return;
    }

    setChamado(data);
    setForm(data);

    if (carregarChamados) carregarChamados();

    setSalvando(false);
  }

  async function adicionarComentario() {
    if (!comentario.trim()) return;

    const { error } = await supabase.from("comentarios_chamados").insert({
      chamado_id: chamadoId,
      autor: usuario?.nome || usuario?.login || "Sistema",
      perfil: usuario?.perfil || "usuario",
      comentario: comentario.trim(),
    });

    if (error) {
      console.error(error);
      setErro("Erro ao adicionar comentário.");
      return;
    }

    setComentario("");
    carregarComentarios();
  }

  async function excluirComentario(idComentario) {
    if (!isGestor) return;

    const confirmar = confirm("Deseja excluir este comentário?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("comentarios_chamados")
      .delete()
      .eq("id", idComentario);

    if (error) {
      console.error(error);
      setErro("Erro ao excluir comentário.");
      return;
    }

    carregarComentarios();
  }

  async function excluirFoto(foto) {
    if (!isGestor) return;

    const confirmar = confirm("Deseja excluir esta imagem?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("anexos_chamados")
      .delete()
      .eq("id", foto.id);

    if (error) {
      console.error(error);
      setErro("Erro ao excluir imagem.");
      return;
    }

    carregarFotos();
  }

  const dadosResumo = useMemo(
    () => [
      ["👤 Solicitante", chamado?.solicitante],
      ["📞 Contato", chamado?.contato],
      ["📍 Estação", chamado?.localidade],
      ["⚙️ Equipamento", chamado?.equipamento],
      ["🧩 Tipo de falha", chamado?.tipo_falha],
      ["🚨 Criticidade", chamado?.criticidade],
      ["📊 Impacto", chamado?.impacto],
      ["👷 Equipe", chamado?.tecnico],
    ],
    [chamado]
  );

  if (!chamado) {
    return (
      <div style={styles.sectionCard}>
        <button style={styles.secondaryButton} onClick={() => navigate("/chamados")}>
          ← Voltar
        </button>
        <p style={{ marginTop: 20 }}>Chamado não encontrado.</p>
      </div>
    );
  }

  return (
    <div style={styles.sectionCard}>
      <style>{`
        .modal-edicao-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.72);
          z-index: 9999;
          display: grid;
          place-items: center;
          padding: 24px;
        }

        .modal-edicao-card {
          width: min(1100px, 96vw);
          max-height: 92vh;
          overflow: auto;
          background: linear-gradient(180deg, #061a2f 0%, #020b16 100%);
          border: 1px solid #1e6bb8;
          border-radius: 26px;
          padding: 24px;
          color: white;
          box-shadow: 0 30px 90px rgba(0,0,0,.55);
        }

        .status-workflow-btn {
          transition: .2s ease;
        }

        .status-workflow-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.18);
        }

        .chat-area {
          display: grid;
          gap: 14px;
          max-height: 520px;
          overflow-y: auto;
          padding-right: 6px;
        }

        .chat-bubble {
          max-width: 76%;
          padding: 14px 16px;
          border-radius: 18px;
          line-height: 1.5;
          word-break: break-word;
          border: 1px solid rgba(255,255,255,.09);
        }

        .chat-bubble.me {
          margin-left: auto;
          background: linear-gradient(135deg, #1658d1, #1e9bff);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .chat-bubble.other {
          margin-right: auto;
          background: rgba(255,255,255,.06);
          color: inherit;
          border-bottom-left-radius: 4px;
        }

        .chat-meta {
          font-size: 12px;
          opacity: .78;
          margin-bottom: 6px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <button style={styles.secondaryButton} onClick={() => navigate("/chamados")}>
          ← Voltar
        </button>

        {isGestor && (
          <button
            style={styles.primaryButton}
            onClick={() => {
              setForm(chamado);
              setModalEdicao(true);
            }}
          >
            ✏️ Editar chamado
          </button>
        )}
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={styles.badgeRow}>
          <span style={styles.badge}>{chamado.codigo || `CH-${chamado.id}`}</span>

          <span style={{ ...styles.badge, ...getBadgeStyle(colors, "status", chamado.status) }}>
            {chamado.status}
          </span>

          <span style={{ ...styles.badge, ...getBadgeStyle(colors, "prioridade", chamado.prioridade) }}>
            {chamado.prioridade || "Sem prioridade"}
          </span>
        </div>

        <h2 style={{ margin: "14px 0 4px", fontSize: 30 }}>
          {chamado.equipamento || "Equipamento não informado"}
        </h2>

        <div style={{ color: colors.muted }}>
          {chamado.localidade || "Sem localidade"} • {chamado.tecnico || "Sem equipe"}
        </div>
      </div>

      {mensagem && (
        <div style={{ ...styles.info, background: "#ecfff3", border: "1px solid #b7ecc8", color: "#0f7a34", marginTop: 16 }}>
          {mensagem}
        </div>
      )}

      {erro && (
        <div style={{ ...styles.info, background: "#fff0f0", border: "1px solid #f3bbbb", color: colors.danger, marginTop: 16 }}>
          {erro}
        </div>
      )}

      {isGestor && (
        <div style={{ marginTop: 24 }}>
          <div style={styles.label}>🔄 Status do chamado</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {statusOptions.map((status) => {
              const ativo = normalizar(status) === normalizar(chamado.status);

              return (
                <button
                  key={status}
                  className="status-workflow-btn"
                  style={{
                    ...styles.secondaryButton,
                    minHeight: 48,
                    ...getBadgeStyle(colors, "status", status),
                    fontWeight: 900,
                    boxShadow: ativo ? "0 0 20px currentColor" : "none",
                    opacity: ativo ? 1 : 0.72,
                  }}
                  onClick={() => alterarStatus(status)}
                  disabled={salvando}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <div style={styles.label}>📋 Dados do chamado</div>

        <div style={styles.formGrid}>
          {dadosResumo.map(([label, valor]) => (
            <div key={label} style={styles.softBox}>
              <strong>{label}</strong>
              <div style={{ color: colors.muted, marginTop: 6 }}>{valor || "-"}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={styles.label}>📝 Problema / descrição</div>
          <div style={styles.softBox}>{chamado.problema || "Sem descrição."}</div>
        </div>
      </div>

      <div style={{ marginTop: 30 }}>
        <div style={styles.label}>📸 Imagens do chamado</div>

        {fotos.length === 0 && <div style={styles.softBox}>Nenhuma imagem anexada.</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
          {fotos.map((foto) => (
            <div key={foto.id} style={{ ...styles.softBox, padding: 8 }}>
              <img
                src={foto.url_arquivo}
                alt={foto.nome_arquivo}
                onClick={() => setFotoAberta(foto.url_arquivo)}
                style={{
                  width: "100%",
                  height: 140,
                  objectFit: "cover",
                  borderRadius: 14,
                  cursor: "pointer",
                }}
              />

              <div style={{ fontSize: 12, color: colors.muted, marginTop: 8 }}>
                {foto.nome_arquivo}
              </div>

              {isGestor && (
                <button
                  style={{ ...styles.dangerButton, minHeight: 40, marginTop: 8, width: "100%" }}
                  onClick={() => excluirFoto(foto)}
                >
                  🗑️ Excluir
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 30 }}>
        <div style={styles.label}>💬 Chat do chamado</div>

        <div style={{ ...styles.softBox, padding: 18 }}>
          <div className="chat-area">
            {comentarios.map((item) => {
              const meuComentario =
                item.autor === usuario?.nome || item.autor === usuario?.login;

              return (
                <div key={item.id} className={`chat-bubble ${meuComentario ? "me" : "other"}`}>
                  <div className="chat-meta">
                    <strong>{item.autor || "Sistema"}</strong>
                    <span>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString("pt-BR")
                        : ""}
                    </span>
                  </div>

                  <div>{item.comentario}</div>

                  {isGestor && (
                    <button
                      onClick={() => excluirComentario(item.id)}
                      style={{
                        marginTop: 10,
                        border: "none",
                        background: "rgba(255,255,255,.12)",
                        color: "inherit",
                        borderRadius: 10,
                        padding: "6px 10px",
                        cursor: "pointer",
                        fontWeight: 800,
                      }}
                    >
                      🗑️ Excluir
                    </button>
                  )}
                </div>
              );
            })}

            {comentarios.length === 0 && (
              <div style={{ color: colors.muted }}>Nenhuma mensagem no chamado.</div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <input
              style={{ ...styles.input, flex: 1, minWidth: 260 }}
              placeholder="Digite uma mensagem..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") adicionarComentario();
              }}
            />

            <button style={styles.primaryButton} onClick={adicionarComentario}>
              Enviar
            </button>
          </div>
        </div>
      </div>

      {modalEdicao && (
        <div className="modal-edicao-overlay">
          <div className="modal-edicao-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0 }}>✏️ Editar chamado</h2>
                <div style={{ color: "#9fb1cc", marginTop: 6 }}>
                  Altere os dados do chamado selecionado.
                </div>
              </div>

              <button
                style={styles.dangerButton}
                onClick={() => {
                  setForm(chamado);
                  setModalEdicao(false);
                }}
              >
                Fechar
              </button>
            </div>

            <div style={styles.formGrid}>
              <Field label="Solicitante">
                <input style={styles.input} value={form.solicitante || ""} onChange={(e) => alterarCampo("solicitante", e.target.value)} />
              </Field>

              <Field label="Contato">
                <input style={styles.input} value={form.contato || ""} onChange={(e) => alterarCampo("contato", e.target.value)} />
              </Field>

              <Field label="Estação / Localidade">
                <select style={styles.input} value={form.localidade || ""} onChange={(e) => alterarCampo("localidade", e.target.value)}>
                  <option value="">Selecione</option>
                  {estacoes.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </Field>

              <Field label="Equipamento">
                <input style={styles.input} value={form.equipamento || ""} onChange={(e) => alterarCampo("equipamento", e.target.value)} />
              </Field>

              <Field label="Tipo de falha">
                <select style={styles.input} value={form.tipo_falha || ""} onChange={(e) => alterarCampo("tipo_falha", e.target.value)}>
                  <option value="">Selecione</option>
                  {tiposFalha.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </Field>

              <Field label="Prioridade">
                <select style={styles.input} value={form.prioridade || ""} onChange={(e) => alterarCampo("prioridade", e.target.value)}>
                  <option value="">Selecione</option>
                  {prioridades.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </Field>

              <Field label="Criticidade">
                <select style={styles.input} value={form.criticidade || ""} onChange={(e) => alterarCampo("criticidade", e.target.value)}>
                  <option value="">Selecione</option>
                  {criticidades.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </Field>

              <Field label="Impacto">
                <select style={styles.input} value={form.impacto || ""} onChange={(e) => alterarCampo("impacto", e.target.value)}>
                  <option value="">Selecione</option>
                  {impactos.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </Field>

              <Field label="Equipe responsável">
                <select style={styles.input} value={form.tecnico || ""} onChange={(e) => alterarCampo("tecnico", e.target.value)}>
                  <option value="">Selecione</option>
                  {equipes.map((item) => (
                    <option key={item.id} value={item.nome}>{item.nome}</option>
                  ))}
                </select>
              </Field>

              <Field label="Status">
                <select
                  style={{
                    ...styles.input,
                    ...getBadgeStyle(colors, "status", form.status),
                    fontWeight: 900,
                  }}
                  value={form.status || ""}
                  onChange={(e) => alterarCampo("status", e.target.value)}
                >
                  {statusOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div style={{ marginTop: 18 }}>
              <Field label="Problema / descrição">
                <textarea
                  style={styles.textarea}
                  value={form.problema || ""}
                  onChange={(e) => alterarCampo("problema", e.target.value)}
                />
              </Field>
            </div>

            <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button style={styles.primaryButton} onClick={salvarEdicao} disabled={salvando}>
                {salvando ? "Salvando..." : "💾 Salvar alterações"}
              </button>

              <button
                style={styles.secondaryButton}
                onClick={() => {
                  setForm(chamado);
                  setModalEdicao(false);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {fotoAberta && (
        <div
          onClick={() => setFotoAberta(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.85)",
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: 24,
          }}
        >
          <img
            src={fotoAberta}
            alt="Imagem ampliada"
            style={{
              maxWidth: "95vw",
              maxHeight: "90vh",
              borderRadius: 18,
            }}
          />
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}