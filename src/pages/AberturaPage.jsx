import React, { useEffect, useState } from "react";
import { supabase } from "../App";

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
  "EBAP Guaranhuns",
];

const initialForm = {
  solicitante: "",
  contato: "",
  localidade: "",
  equipamento: "",
  tipo_falha: "",
  prioridade: "",
  criticidade: "",
  impacto: "",
  equipe: "",
  problema: "",
};

function gerarCodigoChamado() {
  const ano = new Date().getFullYear();
  const numero = Math.floor(1000 + Math.random() * 9000);
  return `CH-${ano}-${numero}`;
}

export default function AberturaPage({
  styles,
  colors,
  usuario,
  carregarChamados,
}) {
  const [form, setForm] = useState(initialForm);
  const [equipes, setEquipes] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarEquipes();
  }, []);

  async function carregarEquipes() {
    const { data, error } = await supabase
      .from("equipes")
      .select("*")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) {
      console.error(error);
      setErro("Erro ao carregar equipes.");
      return;
    }

    setEquipes(data || []);
  }

  function handleChange(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function selecionarFotos(event) {
    const arquivos = Array.from(event.target.files || []);

    if (fotos.length + arquivos.length > 4) {
      setErro("Máximo de 4 fotos por chamado.");
      return;
    }

    setErro("");
    setFotos((atual) => [...atual, ...arquivos]);
  }

  function removerFoto(index) {
    setFotos((atual) => atual.filter((_, i) => i !== index));
  }

  async function salvarFotos(chamadoId) {
    if (!fotos.length) return;

    for (const foto of fotos) {
      const extensao = foto.name.split(".").pop();
      const path = `chamado-${chamadoId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extensao}`;

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
      .update({ anexos: fotos.length })
      .eq("id", chamadoId);
  }

  async function abrirChamado() {
    setErro("");
    setMensagem("");

    if (
      !form.solicitante ||
      !form.localidade ||
      !form.equipamento ||
      !form.prioridade ||
      !form.equipe ||
      !form.problema
    ) {
      setErro(
        "Preencha solicitante, estação, equipamento, prioridade, equipe e problema."
      );
      return;
    }

    setSalvando(true);

    try {
      const codigo = gerarCodigoChamado();

      const { data, error } = await supabase
        .from("chamados")
        .insert({
          codigo,
          solicitante: form.solicitante,
          contato: form.contato,
          localidade: form.localidade,
          equipamento: form.equipamento,
          tipo_falha: form.tipo_falha,
          prioridade: form.prioridade,
          criticidade: form.criticidade,
          impacto: form.impacto,
          tecnico: form.equipe,
          status: "Aberto",
          problema: form.problema,
          atualizacao: "Chamado aberto",
          ultima_atualizacao: new Date().toLocaleString("pt-BR"),
          anexos: fotos.length,
          criado_por: usuario?.nome || usuario?.login || "Sistema",
        })
        .select()
        .single();

      if (error) throw error;

      await salvarFotos(data.id);

      setMensagem("✅ Chamado aberto com sucesso.");
      setForm(initialForm);
      setFotos([]);

      if (carregarChamados) carregarChamados();
    } catch (error) {
      console.error(error);
      setErro("Não foi possível abrir o chamado.");
    }

    setSalvando(false);
  }

  return (
    <div style={styles.sectionCard}>
      <div style={{ ...styles.label, marginBottom: 16 }}>
        📝 Abertura de chamado
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
          <div style={styles.label}>👤 Solicitante *</div>
          <input
            style={styles.input}
            value={form.solicitante}
            onChange={(e) => handleChange("solicitante", e.target.value)}
          />
        </div>

        <div>
          <div style={styles.label}>📞 Contato</div>
          <input
            style={styles.input}
            value={form.contato}
            onChange={(e) => handleChange("contato", e.target.value)}
          />
        </div>

        <div>
          <div style={styles.label}>📍 Estação / Localidade *</div>
          <select
            style={styles.input}
            value={form.localidade}
            onChange={(e) => handleChange("localidade", e.target.value)}
          >
            <option value="">Selecione a estação</option>
            {estacoes.map((estacao) => (
              <option key={estacao} value={estacao}>
                {estacao}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={styles.label}>⚙️ Equipamento *</div>
          <input
            style={styles.input}
            value={form.equipamento}
            onChange={(e) => handleChange("equipamento", e.target.value)}
          />
        </div>

        <div>
          <div style={styles.label}>🧩 Tipo de falha</div>
          <select
            style={styles.input}
            value={form.tipo_falha}
            onChange={(e) => handleChange("tipo_falha", e.target.value)}
          >
            <option value="">Selecione</option>
            <option>Mecânica</option>
            <option>Elétrica</option>
            <option>Automação</option>
            <option>Limpeza</option>
            
          </select>
        </div>

        <div>
          <div style={styles.label}>🚦 Prioridade *</div>
          <select
            style={styles.input}
            value={form.prioridade}
            onChange={(e) => handleChange("prioridade", e.target.value)}
          >
            <option value="">Selecione</option>
            <option>Baixa</option>
            <option>Média</option>
            <option>Alta</option>
            <option>Crítica</option>
          </select>
        </div>

        <div>
          <div style={styles.label}>🚨 Criticidade</div>
          <select
            style={styles.input}
            value={form.criticidade}
            onChange={(e) => handleChange("criticidade", e.target.value)}
          >
            <option value="">Selecione</option>
            <option>Baixa</option>
            <option>Média</option>
            <option>Alta</option>
            <option>Severa</option>
          </select>
        </div>

        <div>
          <div style={styles.label}>📊 Impacto</div>
          <select
            style={styles.input}
            value={form.impacto}
            onChange={(e) => handleChange("impacto", e.target.value)}
          >
            <option value="">Selecione</option>
            <option>Baixo</option>
            <option>Médio</option>
            <option>Alto</option>
          </select>
        </div>

        <div>
          <div style={styles.label}>👷 Equipe responsável *</div>
          <select
            style={styles.input}
            value={form.equipe}
            onChange={(e) => handleChange("equipe", e.target.value)}
          >
            <option value="">Selecione a equipe</option>
            {equipes.map((equipe) => (
              <option key={equipe.id} value={equipe.nome}>
                {equipe.nome}
                {equipe.especialidade ? ` - ${equipe.especialidade}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={styles.label}>📝 Problema / descrição *</div>
        <textarea
          style={styles.textarea}
          value={form.problema}
          onChange={(e) => handleChange("problema", e.target.value)}
          placeholder="Descreva o problema encontrado..."
        />
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={styles.label}>📸 Fotos do chamado</div>

        <input
          id="input-fotos-abertura"
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
          onClick={() =>
            document.getElementById("input-fotos-abertura").click()
          }
          disabled={fotos.length >= 4}
        >
          📷 Adicionar fotos
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

      <div style={{ marginTop: 24 }}>
        <button
          style={styles.primaryButton}
          onClick={abrirChamado}
          disabled={salvando}
        >
          {salvando ? "Abrindo chamado..." : "🚀 Abrir chamado"}
        </button>
      </div>
    </div>
  );
}