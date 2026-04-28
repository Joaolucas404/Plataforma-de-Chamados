import React, { useEffect, useState } from "react";
import { supabase } from "../App";

const perfis = ["gestor", "tecnico", "operador", "prefeitura"];

const usuarioInicial = {
  nome: "",
  login: "",
  senha: "",
  perfil: "operador",
  ativo: true,
};

const equipeInicial = {
  nome: "",
  tipo: "Mecânica",
  ativo: true,
};

export default function AdminPage({ styles, colors, usuario }) {
  const [usuarios, setUsuarios] = useState([]);
  const [equipes, setEquipes] = useState([]);

  const [form, setForm] = useState(usuarioInicial);
  const [formEquipe, setFormEquipe] = useState(equipeInicial);

  const [editandoId, setEditandoId] = useState(null);
  const [editandoEquipeId, setEditandoEquipeId] = useState(null);

  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const isGestor = usuario?.perfil === "gestor";

  useEffect(() => {
    if (isGestor) {
      carregarUsuarios();
      carregarEquipes();
    }
  }, [isGestor]);

  async function carregarUsuarios() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("usuarios_sistema")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      setErro("Erro ao carregar usuários.");
      setCarregando(false);
      return;
    }

    setUsuarios(data || []);
    setCarregando(false);
  }

  async function carregarEquipes() {
    const { data, error } = await supabase
      .from("equipes")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error(error);
      setErro("Erro ao carregar equipes.");
      return;
    }

    setEquipes(data || []);
  }

  function limparFormulario() {
    setForm(usuarioInicial);
    setEditandoId(null);
    setErro("");
    setMensagem("");
  }

  function limparFormularioEquipe() {
    setFormEquipe(equipeInicial);
    setEditandoEquipeId(null);
    setErro("");
    setMensagem("");
  }

  async function salvarUsuario() {
    setErro("");
    setMensagem("");

    if (!form.nome || !form.login || !form.senha || !form.perfil) {
      setErro("Preencha nome, login, senha e perfil.");
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      login: form.login.trim().toLowerCase(),
      senha: form.senha,
      perfil: form.perfil,
      ativo: form.ativo,
    };

    if (editandoId) {
      const { error } = await supabase
        .from("usuarios_sistema")
        .update(payload)
        .eq("id", editandoId);

      if (error) {
        console.error(error);
        setErro("Erro ao atualizar usuário.");
        return;
      }

      setMensagem("Usuário atualizado com sucesso.");
    } else {
      const { error } = await supabase.from("usuarios_sistema").insert(payload);

      if (error) {
        console.error(error);
        setErro("Erro ao criar usuário. Verifique se o login já existe.");
        return;
      }

      setMensagem("Usuário criado com sucesso.");
    }

    limparFormulario();
    carregarUsuarios();
  }

  function editarUsuario(item) {
    setEditandoId(item.id);
    setForm({
      nome: item.nome || "",
      login: item.login || "",
      senha: item.senha || "",
      perfil: item.perfil || "operador",
      ativo: item.ativo !== false,
    });
    setMensagem("");
    setErro("");
  }

  async function excluirUsuario(id) {
    if (id === usuario?.id) {
      setErro("Você não pode excluir o próprio usuário logado.");
      return;
    }

    const confirmar = confirm("Deseja realmente excluir este usuário?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("usuarios_sistema")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      setErro("Erro ao excluir usuário.");
      return;
    }

    setMensagem("Usuário excluído com sucesso.");
    carregarUsuarios();
  }

  async function alternarAtivo(item) {
    if (item.id === usuario?.id) {
      setErro("Você não pode desativar o próprio usuário logado.");
      return;
    }

    const { error } = await supabase
      .from("usuarios_sistema")
      .update({ ativo: !item.ativo })
      .eq("id", item.id);

    if (error) {
      console.error(error);
      setErro("Erro ao alterar status do usuário.");
      return;
    }

    carregarUsuarios();
  }

  async function salvarEquipe() {
    setErro("");
    setMensagem("");

    if (!formEquipe.nome.trim()) {
      setErro("Informe o nome da equipe.");
      return;
    }

    const payload = {
      nome: formEquipe.nome.trim(),
      tipo: formEquipe.tipo || "Outro",
      ativo: formEquipe.ativo,
    };

    if (editandoEquipeId) {
      const { error } = await supabase
        .from("equipes")
        .update(payload)
        .eq("id", editandoEquipeId);

      if (error) {
        console.error(error);
        setErro("Erro ao atualizar equipe.");
        return;
      }

      setMensagem("Equipe atualizada com sucesso.");
    } else {
      const { error } = await supabase.from("equipes").insert(payload);

      if (error) {
        console.error(error);
        setErro("Erro ao cadastrar equipe.");
        return;
      }

      setMensagem("Equipe cadastrada com sucesso.");
    }

    limparFormularioEquipe();
    carregarEquipes();
  }

  function editarEquipe(item) {
    setEditandoEquipeId(item.id);
    setFormEquipe({
      nome: item.nome || "",
      tipo: item.tipo || "Outro",
      ativo: item.ativo !== false,
    });
    setMensagem("");
    setErro("");
  }

  async function excluirEquipe(id) {
    const confirmar = confirm("Deseja realmente excluir esta equipe?");
    if (!confirmar) return;

    const { error } = await supabase.from("equipes").delete().eq("id", id);

    if (error) {
      console.error(error);
      setErro("Erro ao excluir equipe.");
      return;
    }

    setMensagem("Equipe excluída com sucesso.");
    carregarEquipes();
  }

  async function alternarEquipeAtiva(item) {
    const { error } = await supabase
      .from("equipes")
      .update({ ativo: !item.ativo })
      .eq("id", item.id);

    if (error) {
      console.error(error);
      setErro("Erro ao alterar status da equipe.");
      return;
    }

    carregarEquipes();
  }

  if (!isGestor) {
    return (
      <div style={styles.sectionCard}>
        <h2>Acesso restrito</h2>
        <p style={{ color: colors.muted }}>
          Apenas usuários com perfil gestor podem gerenciar acessos.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.sectionCard}>
      <div style={{ ...styles.label, marginBottom: 16 }}>
        <span style={styles.labelIcon}>👥</span>
        <span>Administração</span>
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

      <div style={styles.formCard}>
        <div style={{ ...styles.label, marginBottom: 14 }}>
          {editandoId ? "✏️ Alterar usuário" : "➕ Criar novo usuário"}
        </div>

        <div style={styles.formGrid}>
          <div>
            <div style={styles.label}>Nome</div>
            <input
              style={styles.input}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>

          <div>
            <div style={styles.label}>Login</div>
            <input
              style={styles.input}
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
            />
          </div>

          <div>
            <div style={styles.label}>Senha</div>
            <input
              style={styles.input}
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
            />
          </div>

          <div>
            <div style={styles.label}>Perfil</div>
            <select
              style={styles.input}
              value={form.perfil}
              onChange={(e) => setForm({ ...form, perfil: e.target.value })}
            >
              {perfis.map((perfil) => (
                <option key={perfil} value={perfil}>
                  {perfil}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={styles.label}>Status</div>
            <select
              style={styles.input}
              value={form.ativo ? "ativo" : "inativo"}
              onChange={(e) =>
                setForm({ ...form, ativo: e.target.value === "ativo" })
              }
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
          <button style={styles.primaryButton} onClick={salvarUsuario}>
            {editandoId ? "Salvar alterações" : "Criar usuário"}
          </button>

          {editandoId && (
            <button style={styles.secondaryButton} onClick={limparFormulario}>
              Cancelar edição
            </button>
          )}
        </div>
      </div>

      <div style={{ ...styles.label, margin: "28px 0 14px" }}>
        📋 Usuários cadastrados
      </div>

      {carregando && <div>Carregando usuários...</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {usuarios.map((item) => (
          <div
            key={item.id}
            style={{
              ...styles.softBox,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 14,
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                {item.nome || "Sem nome"}
              </div>

              <div style={{ color: colors.muted, marginTop: 4 }}>
                Login: <strong>{item.login}</strong> • Perfil:{" "}
                <strong>{item.perfil}</strong>
              </div>

              <div style={{ marginTop: 8 }}>
                <span
                  style={{
                    ...styles.badge,
                    background: item.ativo ? "#eaf8ef" : "#fff0f0",
                    color: item.ativo ? "#0f7a34" : colors.danger,
                    borderColor: item.ativo ? "#bfe8cb" : "#f3bbbb",
                  }}
                >
                  {item.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={styles.secondaryButton} onClick={() => editarUsuario(item)}>
                ✏️ Editar
              </button>

              <button style={styles.secondaryButton} onClick={() => alternarAtivo(item)}>
                {item.ativo ? "🚫 Desativar" : "✅ Ativar"}
              </button>

              <button style={styles.dangerButton} onClick={() => excluirUsuario(item.id)}>
                🗑️ Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...styles.formCard, marginTop: 34 }}>
        <div style={{ ...styles.label, marginBottom: 14 }}>
          {editandoEquipeId ? "✏️ Alterar equipe" : "🛠️ Cadastrar equipe"}
        </div>

        <div style={styles.formGrid}>
          <div>
            <div style={styles.label}>Nome da equipe</div>
            <input
              style={styles.input}
              placeholder="Ex: Mecânica C"
              value={formEquipe.nome}
              onChange={(e) =>
                setFormEquipe({ ...formEquipe, nome: e.target.value })
              }
            />
          </div>

          <div>
            <div style={styles.label}>Tipo</div>
            <select
              style={styles.input}
              value={formEquipe.tipo}
              onChange={(e) =>
                setFormEquipe({ ...formEquipe, tipo: e.target.value })
              }
            >
              <option>Mecânica</option>
              <option>Elétrica</option>
              <option>Automação</option>
              <option>Hidráulica</option>
              <option>Operação</option>
              <option>Outro</option>
            </select>
          </div>

          <div>
            <div style={styles.label}>Status</div>
            <select
              style={styles.input}
              value={formEquipe.ativo ? "ativo" : "inativo"}
              onChange={(e) =>
                setFormEquipe({
                  ...formEquipe,
                  ativo: e.target.value === "ativo",
                })
              }
            >
              <option value="ativo">Ativa</option>
              <option value="inativo">Inativa</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
          <button style={styles.primaryButton} onClick={salvarEquipe}>
            {editandoEquipeId ? "Salvar equipe" : "Cadastrar equipe"}
          </button>

          {editandoEquipeId && (
            <button style={styles.secondaryButton} onClick={limparFormularioEquipe}>
              Cancelar edição
            </button>
          )}
        </div>
      </div>

      <div style={{ ...styles.label, margin: "28px 0 14px" }}>
        🛠️ Equipes cadastradas
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {equipes.map((item) => (
          <div
            key={item.id}
            style={{
              ...styles.softBox,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 14,
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                {item.nome}
              </div>

              <div style={{ color: colors.muted, marginTop: 4 }}>
                Tipo: <strong>{item.tipo || "Não informado"}</strong>
              </div>

              <div style={{ marginTop: 8 }}>
                <span
                  style={{
                    ...styles.badge,
                    background: item.ativo ? "#eaf8ef" : "#fff0f0",
                    color: item.ativo ? "#0f7a34" : colors.danger,
                    borderColor: item.ativo ? "#bfe8cb" : "#f3bbbb",
                  }}
                >
                  {item.ativo ? "Ativa" : "Inativa"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={styles.secondaryButton} onClick={() => editarEquipe(item)}>
                ✏️ Editar
              </button>

              <button style={styles.secondaryButton} onClick={() => alternarEquipeAtiva(item)}>
                {item.ativo ? "🚫 Desativar" : "✅ Ativar"}
              </button>

              <button style={styles.dangerButton} onClick={() => excluirEquipe(item.id)}>
                🗑️ Excluir
              </button>
            </div>
          </div>
        ))}

        {equipes.length === 0 && (
          <div style={{ color: colors.muted }}>Nenhuma equipe cadastrada.</div>
        )}
      </div>
    </div>
  );
}