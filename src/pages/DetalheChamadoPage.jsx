import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase, getBadgeStyle } from "../App";

export default function DetalheChamadoPage({
  styles,
  colors,
  selecionado,
  usuario,
  carregarChamados,
}) {
  const navigate = useNavigate();
  const { id } = useParams();

  const [fotos, setFotos] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [historicoStatus, setHistoricoStatus] = useState([]);
  const [novaFoto, setNovaFoto] = useState([]);
  const [comentario, setComentario] = useState("");
  const [fotoAberta, setFotoAberta] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [statusAtual, setStatusAtual] = useState(selecionado?.status || "Aberto");

  const chamadoId = selecionado?.id || id;
  const isGestor = usuario?.perfil === "gestor";

  const statusOptions = ["Aberto", "Em andamento", "Aguardando compra", "Fechado"];

  useEffect(() => {
    if (chamadoId) {
      carregarFotos();
      carregarComentarios();
      carregarHistoricoStatus();
      setStatusAtual(selecionado?.status || "Aberto");
    }
  }, [chamadoId, selecionado?.status]);

  function corStatus(status) {
    if (status === "Aberto") return "#1e9bff";
    if (status === "Em andamento") return "#ff9f1a";
    if (status === "Aguardando compra") return "#a855f7";
    if (status === "Fechado") return "#30d158";
    return "#9ca3af";
  }

  function extrairPathStorage(url) {
    const marcador = "/anexos-chamados/";
    const index = url.indexOf(marcador);
    if (index === -1) return null;
    return decodeURIComponent(url.substring(index + marcador.length));
  }

  async function carregarFotos() {
    const { data, error } = await supabase
      .from("anexos_chamados")
      .select("*")
      .eq("chamado_id", chamadoId)
      .order("created_at", { ascending: false });

    if (!error) setFotos(data || []);
  }

  async function carregarComentarios() {
    const { data, error } = await supabase
      .from("comentarios_chamados")
      .select("*")
      .eq("chamado_id", chamadoId)
      .order("created_at", { ascending: true });

    if (!error) setComentarios(data || []);
  }

  async function carregarHistoricoStatus() {
    const { data, error } = await supabase
      .from("historico_status_chamados")
      .select("*")
      .eq("chamado_id", chamadoId)
      .order("created_at", { ascending: false });

    if (!error) setHistoricoStatus(data || []);
  }

  async function alterarStatus(novoStatus) {
    if (novoStatus === statusAtual) return;

    setErro("");
    setMensagem("");
    setSalvando(true);

    const statusAnterior = statusAtual;

    const { error } = await supabase
      .from("chamados")
      .update({
        status: novoStatus,
        ultima_atualizacao: new Date().toLocaleString("pt-BR"),
        atualizacao: `Status alterado de ${statusAnterior} para ${novoStatus}`,
      })
      .eq("id", chamadoId);

    if (error) {
      console.error(error);
      setErro("Não foi possível alterar o status.");
      setSalvando(false);
      return;
    }

    await supabase.from("historico_status_chamados").insert({
      chamado_id: chamadoId,
      status_anterior: statusAnterior,
      status_novo: novoStatus,
      alterado_por: usuario?.nome || usuario?.login || "Sistema",
      perfil: usuario?.perfil || "operador",
    });

    setStatusAtual(novoStatus);
    setMensagem(`Status alterado para ${novoStatus}.`);
    carregarHistoricoStatus();

    if (carregarChamados) carregarChamados();

    setSalvando(false);
  }

  function selecionarNovasFotos(event) {
    const arquivos = Array.from(event.target.files || []);

    if (fotos.length + novaFoto.length + arquivos.length > 4) {
      setErro("O limite é de 4 fotos por chamado.");
      return;
    }

    setErro("");
    setNovaFoto((atual) => [...atual, ...arquivos].slice(0, 4 - fotos.length));
  }

  function removerNovaFoto(index) {
    setNovaFoto((atual) => atual.filter((_, i) => i !== index));
  }

  async function enviarNovasFotos() {
    setErro("");
    setMensagem("");

    if (novaFoto.length === 0) {
      setErro("Selecione pelo menos uma foto.");
      return;
    }

    setSalvando(true);

    try {
      for (const foto of novaFoto) {
        const extensao = foto.name.split(".").pop();
        const nomeArquivo = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${extensao}`;

        const path = `chamado-${chamadoId}/${nomeArquivo}`;

        const { error: uploadError } = await supabase.storage
          .from("anexos-chamados")
          .upload(path, foto);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("anexos-chamados")
          .getPublicUrl(path);

        const { error: insertError } = await supabase
          .from("anexos_chamados")
          .insert({
            chamado_id: chamadoId,
            nome_arquivo: foto.name,
            url_arquivo: data.publicUrl,
            criado_por: usuario?.nome || usuario?.login || "Sistema",
          });

        if (insertError) throw insertError;
      }

      await supabase
        .from("chamados")
        .update({ anexos: fotos.length + novaFoto.length })
        .eq("id", chamadoId);

      setNovaFoto([]);
      setMensagem("Foto(s) adicionada(s) com sucesso.");
      carregarFotos();

      if (carregarChamados) carregarChamados();
    } catch (error) {
      console.error(error);
      setErro("Não foi possível enviar as fotos.");
    }

    setSalvando(false);
  }

  async function adicionarComentario() {
    setErro("");
    setMensagem("");

    if (!comentario.trim()) {
      setErro("Digite um comentário.");
      return;
    }

    setSalvando(true);

    const { error } = await supabase.from("comentarios_chamados").insert({
      chamado_id: chamadoId,
      comentario: comentario.trim(),
      autor: usuario?.nome || usuario?.login || "Sistema",
      perfil: usuario?.perfil || "operador",
    });

    if (error) {
      console.error(error);
      setErro("Não foi possível salvar o comentário.");
      setSalvando(false);
      return;
    }

    await supabase
      .from("chamados")
      .update({
        ultima_atualizacao: new Date().toLocaleString("pt-BR"),
        atualizacao: comentario.trim(),
      })
      .eq("id", chamadoId);

    setComentario("");
    setMensagem("Comentário adicionado com sucesso.");
    carregarComentarios();

    if (carregarChamados) carregarChamados();

    setSalvando(false);
  }

  async function excluirFoto(foto) {
    if (!isGestor) return;

    const confirmar = confirm("Deseja excluir esta foto?");
    if (!confirmar) return;

    setErro("");
    setMensagem("");

    try {
      const path = extrairPathStorage(foto.url_arquivo);

      if (path) {
        await supabase.storage.from("anexos-chamados").remove([path]);
      }

      const { error } = await supabase
        .from("anexos_chamados")
        .delete()
        .eq("id", foto.id);

      if (error) throw error;

      await supabase
        .from("chamados")
        .update({ anexos: Math.max(fotos.length - 1, 0) })
        .eq("id", chamadoId);

      setMensagem("Foto excluída com sucesso.");
      carregarFotos();

      if (carregarChamados) carregarChamados();
    } catch (error) {
      console.error(error);
      setErro("Não foi possível excluir a foto.");
    }
  }

  async function excluirComentario(comentarioId) {
    if (!isGestor) return;

    const confirmar = confirm("Deseja excluir este comentário?");
    if (!confirmar) return;

    setErro("");
    setMensagem("");

    const { error } = await supabase
      .from("comentarios_chamados")
      .delete()
      .eq("id", comentarioId);

    if (error) {
      console.error(error);
      setErro("Não foi possível excluir o comentário.");
      return;
    }

    setMensagem("Comentário excluído com sucesso.");
    carregarComentarios();
  }

  async function excluirChamado() {
    if (!isGestor) return;

    const confirmar = confirm(
      "Tem certeza que deseja excluir este chamado? Essa ação não pode ser desfeita."
    );

    if (!confirmar) return;

    setErro("");
    setMensagem("");
    setSalvando(true);

    try {
      const { data: anexos } = await supabase
        .from("anexos_chamados")
        .select("*")
        .eq("chamado_id", chamadoId);

      const paths = (anexos || [])
        .map((foto) => extrairPathStorage(foto.url_arquivo))
        .filter(Boolean);

      if (paths.length > 0) {
        await supabase.storage.from("anexos-chamados").remove(paths);
      }

      await supabase
        .from("comentarios_chamados")
        .delete()
        .eq("chamado_id", chamadoId);

      await supabase
        .from("anexos_chamados")
        .delete()
        .eq("chamado_id", chamadoId);

      await supabase
        .from("historico_status_chamados")
        .delete()
        .eq("chamado_id", chamadoId);

      const { error } = await supabase
        .from("chamados")
        .delete()
        .eq("id", chamadoId);

      if (error) throw error;

      if (carregarChamados) carregarChamados();

      navigate("/chamados");
    } catch (error) {
      console.error(error);
      setErro("Não foi possível excluir o chamado.");
    }

    setSalvando(false);
  }

  if (!selecionado || String(selecionado.id) !== String(id)) {
    return (
      <div style={styles.sectionCard}>
        <div>Abra um chamado pela lista para visualizar os detalhes.</div>

        <button
          style={{ ...styles.secondaryButton, marginTop: 12 }}
          onClick={() => navigate("/chamados")}
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div style={styles.sectionCard}>
      {fotoAberta && (
        <div
          onClick={() => setFotoAberta(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.82)",
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: 20,
            cursor: "zoom-out",
          }}
        >
          <img
            src={fotoAberta}
            alt="Foto ampliada"
            style={{
              maxWidth: "95vw",
              maxHeight: "90vh",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,.2)",
            }}
          />
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ ...styles.label, marginBottom: 8 }}>
            <span style={styles.labelIcon}>🧾</span>
            <span>Detalhe do chamado</span>
          </div>

          <div style={{ color: colors.muted }}>
            {selecionado.codigo} • {selecionado.localidade}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {isGestor && (
            <button
              style={styles.dangerButton}
              onClick={excluirChamado}
              disabled={salvando}
            >
              🗑️ Excluir chamado
            </button>
          )}

          <button
            style={styles.secondaryButton}
            onClick={() => navigate("/chamados")}
          >
            ← Voltar
          </button>
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

      <div style={styles.badgeRow}>
        <span style={{ ...styles.badge, fontWeight: 900 }}>
          {selecionado.codigo}
        </span>

        <span
          style={{
            ...styles.badge,
            borderColor: corStatus(statusAtual),
            color: corStatus(statusAtual),
            background: `${corStatus(statusAtual)}18`,
          }}
        >
          {statusAtual}
        </span>

        <span
          style={{
            ...styles.badge,
            ...getBadgeStyle(colors, "prioridade", selecionado.prioridade),
          }}
        >
          {selecionado.prioridade}
        </span>
      </div>

      <div style={{ marginTop: 16, marginBottom: 20 }}>
        <div style={styles.label}>🔄 Status do Chamado</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {statusOptions.map((status) => {
            const ativo = statusAtual === status;
            const cor = corStatus(status);

            return (
              <button
                key={status}
                type="button"
                disabled={salvando || ativo}
                onClick={() => alterarStatus(status)}
                style={{
                  border: `1px solid ${cor}`,
                  background: ativo ? cor : "transparent",
                  color: ativo ? "white" : cor,
                  borderRadius: 999,
                  padding: "12px 18px",
                  fontWeight: 900,
                  cursor: ativo ? "default" : "pointer",
                  opacity: salvando ? 0.6 : 1,
                  boxShadow: ativo ? `0 0 18px ${cor}55` : "none",
                }}
              >
                {status}
              </button>
            );
          })}
        </div>
      </div>

      <div style={styles.softBox}>
        <div style={{ fontWeight: 900, fontSize: 24 }}>
          {selecionado.equipamento}
        </div>

        <div style={{ color: colors.muted, marginTop: 6 }}>
          {selecionado.localidade} • {selecionado.tecnico || "Não atribuído"}
        </div>

        <div style={{ marginTop: 14 }}>{selecionado.problema}</div>
      </div>

      <div style={{ ...styles.softGrid, marginTop: 16 }}>
        <div style={styles.softBox}>
          <strong>Solicitante</strong>
          <br />
          {selecionado.solicitante || "Não informado"}
        </div>

        <div style={styles.softBox}>
          <strong>Contato</strong>
          <br />
          {selecionado.contato || "Não informado"}
        </div>

        <div style={styles.softBox}>
          <strong>Criticidade</strong>
          <br />
          {selecionado.criticidade || "Não informado"}
        </div>

        <div style={styles.softBox}>
          <strong>Impacto</strong>
          <br />
          {selecionado.impacto || "Não informado"}
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <div style={styles.label}>🕒 Histórico de status</div>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {historicoStatus.length === 0 && (
            <div style={{ color: colors.muted }}>
              Nenhuma alteração de status registrada.
            </div>
          )}

          {historicoStatus.map((item) => (
            <div key={item.id} style={styles.softBox}>
              <div style={{ fontWeight: 900 }}>
                <span style={{ color: corStatus(item.status_anterior) }}>
                  {item.status_anterior || "Sem status"}
                </span>
                {" → "}
                <span style={{ color: corStatus(item.status_novo) }}>
                  {item.status_novo}
                </span>
              </div>

              <div style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                Alterado por {item.alterado_por || "Sistema"} •{" "}
                {item.created_at
                  ? new Date(item.created_at).toLocaleString("pt-BR")
                  : ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={styles.label}>📸 Fotos do chamado</div>

        {fotos.length === 0 && (
          <div style={{ color: colors.muted }}>Nenhuma foto anexada.</div>
        )}

        {fotos.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 14,
              marginTop: 12,
            }}
          >
            {fotos.map((foto) => (
              <div key={foto.id} style={{ position: "relative" }}>
                <img
                  src={foto.url_arquivo}
                  alt={foto.nome_arquivo}
                  onClick={() => setFotoAberta(foto.url_arquivo)}
                  style={{
                    width: "100%",
                    height: 140,
                    objectFit: "cover",
                    borderRadius: 16,
                    cursor: "zoom-in",
                    border: `1px solid ${colors.border}`,
                    boxShadow: "0 12px 26px rgba(0,0,0,.18)",
                  }}
                />

                {isGestor && (
                  <button
                    type="button"
                    onClick={() => excluirFoto(foto)}
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      border: "none",
                      borderRadius: 999,
                      background: "#ff3131",
                      color: "white",
                      width: 30,
                      height: 30,
                      cursor: "pointer",
                      fontWeight: 900,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <input
            id="input-novas-fotos"
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={selecionarNovasFotos}
            style={{ display: "none" }}
          />

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() =>
              document.getElementById("input-novas-fotos").click()
            }
            disabled={fotos.length >= 4}
          >
            📷 Adicionar foto
          </button>

          <span style={{ marginLeft: 12, color: colors.muted }}>
            {fotos.length + novaFoto.length}/4 fotos
          </span>
        </div>

        {novaFoto.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            {novaFoto.map((foto, index) => (
              <div key={index} style={{ position: "relative" }}>
                <img
                  src={URL.createObjectURL(foto)}
                  alt="Prévia"
                  style={{
                    width: "100%",
                    height: 120,
                    objectFit: "cover",
                    borderRadius: 14,
                    border: `1px solid ${colors.border}`,
                  }}
                />

                <button
                  type="button"
                  onClick={() => removerNovaFoto(index)}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    border: "none",
                    borderRadius: 999,
                    background: "#ff3131",
                    color: "white",
                    width: 28,
                    height: 28,
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {novaFoto.length > 0 && (
          <button
            style={{ ...styles.primaryButton, marginTop: 14 }}
            onClick={enviarNovasFotos}
            disabled={salvando}
          >
            {salvando ? "Enviando..." : "Salvar novas fotos"}
          </button>
        )}
      </div>

      <div style={{ marginTop: 28 }}>
        <div style={styles.label}>💬 Conversa do chamado</div>

        <textarea
          style={styles.textarea}
          placeholder="Digite um comentário..."
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />

        <button
          style={{ ...styles.primaryButton, marginTop: 10 }}
          onClick={adicionarComentario}
          disabled={salvando}
        >
          {salvando ? "Salvando..." : "Enviar"}
        </button>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginTop: 20,
          }}
        >
          {comentarios.length === 0 && (
            <div style={{ color: colors.muted }}>Nenhum comentário ainda.</div>
          )}

          {comentarios.map((item) => {
            const isMeu = item.autor === (usuario?.nome || usuario?.login);

            const corPerfil =
              item.perfil === "gestor"
                ? "#8b5cf6"
                : item.perfil === "tecnico"
                ? "#22c55e"
                : "#3b82f6";

            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: isMeu ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "70%",
                    padding: 12,
                    borderRadius: 14,
                    background: isMeu ? "#1e3a8a" : "#020617",
                    border: `1px solid ${colors.border}`,
                    position: "relative",
                    color: "#fff",
                  }}
                >
                  {isGestor && (
                    <button
                      type="button"
                      onClick={() => excluirComentario(item.id)}
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        background: "transparent",
                        border: "none",
                        color: "#ff4d4d",
                        cursor: "pointer",
                        fontSize: 18,
                        fontWeight: 900,
                      }}
                    >
                      ×
                    </button>
                  )}

                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: corPerfil,
                      marginBottom: 4,
                      paddingRight: isGestor ? 22 : 0,
                    }}
                  >
                    {item.autor || "Usuário"} • {item.perfil || "operador"}
                  </div>

                  <div>{item.comentario}</div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      marginTop: 6,
                      textAlign: "right",
                    }}
                  >
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString("pt-BR")
                      : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}