import React, { useState } from "react";
import { supabase } from "../App";

const initialForm = {
  localidade: "",
  equipamento: "",
  tipo_falha: "Mecânica",
  prioridade: "Média",
  criticidade: "Moderada",
  solicitante: "",
  contato: "",
  tecnico: "Não atribuído",
  problema: "",
  impacto: "Médio",
};

const estacoes = [
  "EBAP Aribiri",
  "EBAP Comportas",
  "EBAP Foz da Costa",
  "EBAP Cobilândia",
  "EBAP Laranja",
  "EBAP Marinho",
  "EBAP Sitio de Batalha"
];

const prioridadeOptions = ["Baixa", "Média", "Alta", "Crítica"];
const criticidadeOptions = ["Baixa", "Moderada", "Alta", "Severa"];
const impactoOptions = ["Baixo", "Médio", "Alto"];

function getEquipeOptions(equipes = []) {
  return ["Não atribuído", ...equipes.map((e) => e.nome)];
}

function gerarCodigoChamado() {
  const numero = Math.floor(1000 + Math.random() * 9000);
  const ano = new Date().getFullYear();
  return `CH-${ano}-${numero}`;
}

function calcularSla(prioridade) {
  if (prioridade === "Crítica") return 12;
  if (prioridade === "Alta") return 24;
  if (prioridade === "Média") return 48;
  return 72;
}

export default function AberturaPage({
  styles,
  colors,
  usuario,
  equipes = [],
  carregarChamados,
}) {
  const [form, setForm] = useState(initialForm);
  const [fotos, setFotos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  function selecionarFotos(event) {
    const arquivos = Array.from(event.target.files || []);

    if (fotos.length + arquivos.length > 4) {
      setErro("Máximo de 4 fotos por chamado.");
      return;
    }

    setErro("");
    setFotos((prev) => [...prev, ...arquivos].slice(0, 4));
  }

  function removerFoto(index) {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function salvarFotos(chamadoId) {
    if (!supabase || fotos.length === 0) return;

    for (const foto of fotos) {
      const extensao = foto.name.split(".").pop();
      const path = `chamado-${chamadoId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extensao}`;

      const { error: uploadError } = await supabase.storage
        .from("anexos-chamados")
        .upload(path, foto);

      if (uploadError) {
        console.error(uploadError);
        throw new Error("Erro ao enviar imagem.");
      }

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

      if (insertError) {
        console.error(insertError);
        throw new Error("Erro ao salvar anexo no banco.");
      }
    }
  }

  async function abrirChamado() {
    setMensagem("");
    setErro("");

    if (!form.localidade || !form.equipamento || !form.problema || !form.solicitante) {
      setErro("Preencha estação, equipamento, descrição do problema e solicitante.");
      return;
    }

    if (!supabase) {
      setErro("Supabase não configurado.");
      return;
    }

    setSalvando(true);

    const payload = {
      codigo: gerarCodigoChamado(),
      localidade: form.localidade,
      equipamento: form.equipamento,
      tipo_falha: form.tipo_falha,
      problema: form.problema,
      prioridade: form.prioridade,
      criticidade: form.criticidade,
      status: "Aberto",
      solicitante: form.solicitante,
      contato: form.contato,
      tecnico: form.tecnico || "Não atribuído",
      sla: calcularSla(form.prioridade),
      sla_consumido: 0,
      ultima_atualizacao: new Date().toLocaleString("pt-BR"),
      atualizacao: "Chamado registrado e aguardando análise.",
      origem: "Portal",
      impacto: form.impacto,
      anexos: fotos.length,
    };

    const { data: chamadoCriado, error } = await supabase
      .from("chamados")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error(error);
      setErro("Não foi possível abrir o chamado. Verifique as colunas da tabela chamados.");
      setSalvando(false);
      return;
    }

    try {
      await salvarFotos(chamadoCriado.id);
    } catch (fotoError) {
      console.error(fotoError);
      setErro("Chamado criado, mas houve erro ao enviar uma ou mais imagens.");
      setMensagem("Chamado aberto com sucesso.");
      setSalvando(false);
      return;
    }

    await supabase.from("notificacoes_sistema").insert({
      tipo: "novo_chamado",
      titulo: "Novo chamado aberto",
      mensagem: `${usuario?.nome || usuario?.login || "Usuário"} abriu um novo chamado em ${form.localidade}.`,
      perfil_destino: "gestor",
      lida: false,
    });

    setMensagem("Chamado aberto com sucesso.");
    setForm(initialForm);
    setFotos([]);
    setSalvando(false);

    if (carregarChamados) carregarChamados();
  }

  return (
    <div style={styles.sectionCard}>
      <div style={{ ...styles.label, marginBottom: 18 }}>
        <span style={styles.labelIcon}>📝</span>
        <span>Abertura de chamado</span>
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

      <div style={styles.formGrid}>
        <div>
          <div style={styles.label}>🏢 Estação</div>
          <select
            style={styles.input}
            value={form.localidade}
            onChange={(e) => setForm({ ...form, localidade: e.target.value })}
          >
            <option value="">Selecione uma estação</option>
            {estacoes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={styles.label}>👥 Equipe responsável</div>
          <select
            style={styles.input}
            value={form.tecnico}
            onChange={(e) => setForm({ ...form, tecnico: e.target.value })}
          >
            {getEquipeOptions(equipes).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={styles.label}>🛠️ Equipamento</div>
          <input
            style={styles.input}
            placeholder="Ex: Bomba, Painel, Motor..."
            value={form.equipamento}
            onChange={(e) => setForm({ ...form, equipamento: e.target.value })}
          />
        </div>

        <div>
          <div style={styles.label}>🔧 Tipo de falha</div>
          <select
            style={styles.input}
            value={form.tipo_falha}
            onChange={(e) => setForm({ ...form, tipo_falha: e.target.value })}
          >
            <option>Mecânica</option>
            <option>Elétrica</option>
            <option>Automação</option>
            <option>Instrumentação</option>
            <option>Vedação</option>
            <option>Estrutural</option>
          </select>
        </div>

        <div>
          <div style={styles.label}>🟡 Prioridade</div>
          <select
            style={styles.input}
            value={form.prioridade}
            onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
          >
            {prioridadeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={styles.label}>🟠 Criticidade</div>
          <select
            style={styles.input}
            value={form.criticidade}
            onChange={(e) => setForm({ ...form, criticidade: e.target.value })}
          >
            {criticidadeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={styles.label}>📈 Impacto</div>
          <select
            style={styles.input}
            value={form.impacto}
            onChange={(e) => setForm({ ...form, impacto: e.target.value })}
          >
            {impactoOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={styles.label}>👤 Solicitante</div>
          <input
            style={styles.input}
            placeholder="Nome do solicitante"
            value={form.solicitante}
            onChange={(e) => setForm({ ...form, solicitante: e.target.value })}
          />
        </div>

        <div>
          <div style={styles.label}>📞 Contato</div>
          <input
            style={styles.input}
            placeholder="Telefone ou contato"
            value={form.contato}
            onChange={(e) => setForm({ ...form, contato: e.target.value })}
          />
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={styles.label}>📝 Descrição do problema</div>
        <textarea
          style={styles.textarea}
          placeholder="Descreva o problema encontrado..."
          value={form.problema}
          onChange={(e) => setForm({ ...form, problema: e.target.value })}
        />
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={styles.label}>📸 Fotos do chamado</div>

        <input
          id="input-fotos"
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={selecionarFotos}
          style={{ display: "none" }}
        />

        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => document.getElementById("input-fotos").click()}
          disabled={fotos.length >= 4}
        >
          📷 Anexar foto / câmera
        </button>

        <span style={{ marginLeft: 12, color: colors.muted }}>
          {fotos.length}/4 fotos
        </span>

        {fotos.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            {fotos.map((foto, index) => (
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
                  onClick={() => removerFoto(index)}
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
      </div>

      <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          style={{ ...styles.primaryButton, opacity: salvando ? 0.7 : 1 }}
          onClick={abrirChamado}
          disabled={salvando}
        >
          {salvando ? "Salvando..." : "📨 Abrir chamado"}
        </button>
      </div>
    </div>
  );
}