import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../App";

const inicial = {
  nome: "",
  matricula: "",
  cargo: "",
  data_admissao: "",
  data_nascimento: "",
  salario: "",
  beneficios: "",
  carga_horaria: "",
  ativo: true,
};

function limparTexto(texto) {
  return String(texto || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function calcularIdade(dataNascimento) {
  if (!dataNascimento) return "-";

  const hoje = new Date();
  const nascimento = new Date(dataNascimento + "T00:00:00");

  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();

  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }

  return idade;
}

function formatarData(data) {
  if (!data) return "-";
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizarData(valor) {
  if (!valor) return null;

  if (valor instanceof Date && !isNaN(valor)) {
    return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(valor.getDate()).padStart(2, "0")}`;
  }

  if (typeof valor === "number") {
    const data = XLSX.SSF.parse_date_code(valor);
    if (!data) return null;

    return `${data.y}-${String(data.m).padStart(2, "0")}-${String(
      data.d
    ).padStart(2, "0")}`;
  }

  const texto = String(valor).trim();

  if (!texto) return null;

  if (texto.includes("/")) {
    const partes = texto.split("/");
    if (partes.length !== 3) return null;

    const [dia, mes, ano] = partes;

    return `${String(ano).padStart(4, "20")}-${String(mes).padStart(
      2,
      "0"
    )}-${String(dia).padStart(2, "0")}`;
  }

  if (texto.includes("-")) {
    return texto.slice(0, 10);
  }

  return null;
}

function normalizarNumero(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;

  if (typeof valor === "number") return valor;

  const texto = String(valor)
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  return Number(texto || 0);
}

function getValorLinha(linha, nomesPossiveis) {
  const chaves = Object.keys(linha);

  for (const nome of nomesPossiveis) {
    const chaveEncontrada = chaves.find(
      (chave) => limparTexto(chave) === limparTexto(nome)
    );

    if (chaveEncontrada) return linha[chaveEncontrada];
  }

  return "";
}

export default function FuncionariosPage({ styles, colors, usuario }) {
  const [funcionarios, setFuncionarios] = useState([]);
  const [form, setForm] = useState(inicial);
  const [editandoId, setEditandoId] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [filtroCargo, setFiltroCargo] = useState("todos");
  const [busca, setBusca] = useState("");

  const isGestor = usuario?.perfil === "gestor";

  React.useEffect(() => {
    carregarFuncionarios();
  }, []);

  async function carregarFuncionarios() {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("funcionarios")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error(error);
      setErro("Erro ao carregar funcionários.");
      setCarregando(false);
      return;
    }

    setFuncionarios(data || []);
    setCarregando(false);
  }

  const cargos = useMemo(() => {
    return [...new Set(funcionarios.map((f) => f.cargo).filter(Boolean))].sort();
  }, [funcionarios]);

  const funcionariosFiltrados = useMemo(() => {
    return funcionarios.filter((item) => {
      const passaCargo = filtroCargo === "todos" || item.cargo === filtroCargo;

      const termo = limparTexto(busca);
      const passaBusca =
        !termo ||
        limparTexto(item.nome).includes(termo) ||
        limparTexto(item.matricula).includes(termo) ||
        limparTexto(item.cargo).includes(termo);

      return passaCargo && passaBusca;
    });
  }, [funcionarios, filtroCargo, busca]);

  const resumo = useMemo(() => {
    const ativos = funcionarios.filter((f) => f.ativo !== false).length;
    const inativos = funcionarios.filter((f) => f.ativo === false).length;

    const folha = funcionarios
      .filter((f) => f.ativo !== false)
      .reduce(
        (total, f) =>
          total + Number(f.salario || 0) + Number(f.beneficios || 0),
        0
      );

    return {
      total: funcionarios.length,
      ativos,
      inativos,
      folha,
    };
  }, [funcionarios]);

  function alterar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function limpar() {
    setForm(inicial);
    setEditandoId(null);
    setErro("");
    setMensagem("");
  }

  async function salvarFuncionario() {
    setErro("");
    setMensagem("");

    if (!isGestor) {
      setErro("Apenas gestor pode alterar funcionários.");
      return;
    }

    if (!form.nome.trim()) {
      setErro("Informe o nome do funcionário.");
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      matricula: String(form.matricula || "").trim(),
      cargo: form.cargo || "",
      data_admissao: form.data_admissao || null,
      data_nascimento: form.data_nascimento || null,
      salario: normalizarNumero(form.salario),
      beneficios: normalizarNumero(form.beneficios),
      carga_horaria: form.carga_horaria || "",
      ativo: form.ativo,
    };

    if (editandoId) {
      const { error } = await supabase
        .from("funcionarios")
        .update(payload)
        .eq("id", editandoId);

      if (error) {
        console.error(error);
        setErro("Erro ao atualizar funcionário.");
        return;
      }

      setMensagem("Funcionário atualizado com sucesso.");
    } else {
      const { error } = await supabase.from("funcionarios").insert(payload);

      if (error) {
        console.error(error);
        setErro("Erro ao cadastrar funcionário.");
        return;
      }

      setMensagem("Funcionário cadastrado com sucesso.");
    }

    limpar();
    carregarFuncionarios();
  }

  function editarFuncionario(item) {
    setEditandoId(item.id);
    setForm({
      nome: item.nome || "",
      matricula: item.matricula || "",
      cargo: item.cargo || "",
      data_admissao: item.data_admissao || "",
      data_nascimento: item.data_nascimento || "",
      salario: item.salario || "",
      beneficios: item.beneficios || "",
      carga_horaria: item.carga_horaria || "",
      ativo: item.ativo !== false,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluirFuncionario(id) {
    if (!isGestor) {
      setErro("Apenas gestor pode excluir funcionários.");
      return;
    }

    const confirmar = confirm("Deseja excluir este funcionário?");
    if (!confirmar) return;

    const { error } = await supabase.from("funcionarios").delete().eq("id", id);

    if (error) {
      console.error(error);
      setErro("Erro ao excluir funcionário.");
      return;
    }

    setMensagem("Funcionário excluído com sucesso.");
    carregarFuncionarios();
  }

  async function importarExcel(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    if (!isGestor) {
      setErro("Apenas gestor pode importar funcionários.");
      return;
    }

    setErro("");
    setMensagem("");
    setImportando(true);

    try {
      const buffer = await arquivo.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
      });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const linhas = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        range: 1,
      });

      const payload = linhas
        .map((linha) => {
          const nome = getValorLinha(linha, ["Nome"]);
          const matricula = getValorLinha(linha, ["Matrícula", "Matricula"]);
          const cargo = getValorLinha(linha, ["Cargo"]);
          const salario = getValorLinha(linha, ["Salário", "Salario"]);
          const admissao = getValorLinha(linha, ["Admissão", "Admissao"]);
          const nascimento = getValorLinha(linha, [
            "Nascimento",
            "Data de Nascimento",
            "Data Nascimento",
          ]);

          return {
            nome: String(nome || "").trim(),
            matricula: String(matricula || "").trim(),
            cargo: String(cargo || "").trim(),
            data_admissao: normalizarData(admissao),
            data_nascimento: normalizarData(nascimento),
            salario: normalizarNumero(salario),
            beneficios: 0,
            carga_horaria: "",
            ativo: true,
          };
        })
        .filter((item) => item.nome && item.nome.toLowerCase() !== "nome");

      if (payload.length === 0) {
        setErro("Nenhum funcionário válido encontrado na planilha.");
        setImportando(false);
        return;
      }

      const { error } = await supabase.from("funcionarios").insert(payload);

      if (error) {
        console.error(error);
        setErro("Erro ao importar funcionários. Verifique as colunas no banco.");
        setImportando(false);
        return;
      }

      setMensagem(`${payload.length} funcionário(s) importado(s) com sucesso.`);
      carregarFuncionarios();
      event.target.value = "";
    } catch (error) {
      console.error(error);
      setErro("Não foi possível ler a planilha.");
    }

    setImportando(false);
  }

  if (!isGestor) {
    return (
      <div style={styles.sectionCard}>
        <h2>Acesso restrito</h2>
        <p style={{ color: colors.muted }}>
          Apenas usuários gestores podem acessar o controle de funcionários.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.sectionCard}>
      <style>{`
        .func-grid-kpi {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 14px;
          margin: 18px 0 22px;
        }

        .func-kpi {
          background: linear-gradient(180deg, rgba(6,26,47,.95), rgba(2,11,22,.95));
          border: 1px solid #1e6bb8;
          border-radius: 18px;
          padding: 18px;
          color: white;
          box-shadow: 0 0 22px rgba(30,155,255,.12);
        }

        .func-kpi small {
          color: #9fb1cc;
          font-weight: 900;
          text-transform: uppercase;
          font-size: 12px;
        }

        .func-kpi strong {
          display: block;
          margin-top: 8px;
          font-size: 28px;
          font-weight: 950;
        }

        .func-card {
          transition: .2s ease;
        }

        .func-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 22px rgba(30,155,255,.16);
        }
      `}</style>

      <div style={{ ...styles.label, marginBottom: 10 }}>
        👥 Controle de funcionários
      </div>

      <div style={{ color: colors.muted, marginBottom: 16 }}>
        Importe sua planilha de funcionários e complete benefícios/carga horária
        manualmente depois.
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

      <div className="func-grid-kpi">
        <div className="func-kpi">
          <small>Total</small>
          <strong>{resumo.total}</strong>
        </div>

        <div className="func-kpi">
          <small>Ativos</small>
          <strong style={{ color: "#30d158" }}>{resumo.ativos}</strong>
        </div>

        <div className="func-kpi">
          <small>Inativos</small>
          <strong style={{ color: "#ff3131" }}>{resumo.inativos}</strong>
        </div>

        <div className="func-kpi">
          <small>Folha estimada</small>
          <strong style={{ color: "#1e9bff" }}>{formatarMoeda(resumo.folha)}</strong>
        </div>
      </div>

      <div style={styles.formCard}>
        <div style={{ ...styles.label, marginBottom: 14 }}>
          📥 Importar funcionários por Excel
        </div>

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={importarExcel}
          style={styles.input}
          disabled={importando}
        />

        <div style={{ marginTop: 10, color: colors.muted, fontSize: 13 }}>
          Colunas aceitas: <strong>Matrícula, Nome, Salário, Cargo, Admissão e
          Nascimento</strong>. Benefícios e Carga Horária podem ser preenchidos
          manualmente depois.
        </div>

        {importando && (
          <div style={{ marginTop: 10, color: "#1e9bff", fontWeight: 900 }}>
            Importando planilha...
          </div>
        )}
      </div>

      <div style={styles.formCard}>
        <div style={{ ...styles.label, marginBottom: 14 }}>
          {editandoId ? "✏️ Editar funcionário" : "➕ Cadastrar funcionário"}
        </div>

        <div style={styles.formGrid}>
          <div>
            <div style={styles.label}>Nome *</div>
            <input
              style={styles.input}
              value={form.nome}
              onChange={(e) => alterar("nome", e.target.value)}
            />
          </div>

          <div>
            <div style={styles.label}>Matrícula</div>
            <input
              style={styles.input}
              value={form.matricula}
              onChange={(e) => alterar("matricula", e.target.value)}
            />
          </div>

          <div>
            <div style={styles.label}>Cargo</div>
            <input
              style={styles.input}
              value={form.cargo}
              onChange={(e) => alterar("cargo", e.target.value)}
            />
          </div>

          <div>
            <div style={styles.label}>Data de admissão</div>
            <input
              type="date"
              style={styles.input}
              value={form.data_admissao}
              onChange={(e) => alterar("data_admissao", e.target.value)}
            />
          </div>

          <div>
            <div style={styles.label}>Data de nascimento</div>
            <input
              type="date"
              style={styles.input}
              value={form.data_nascimento}
              onChange={(e) => alterar("data_nascimento", e.target.value)}
            />
          </div>

          <div>
            <div style={styles.label}>Salário</div>
            <input
              type="number"
              style={styles.input}
              value={form.salario}
              onChange={(e) => alterar("salario", e.target.value)}
            />
          </div>

          <div>
            <div style={styles.label}>Benefícios</div>
            <input
              type="number"
              style={styles.input}
              value={form.beneficios}
              onChange={(e) => alterar("beneficios", e.target.value)}
            />
          </div>

          <div>
            <div style={styles.label}>Carga horária</div>
            <input
              style={styles.input}
              placeholder="Ex: 44h semanais"
              value={form.carga_horaria}
              onChange={(e) => alterar("carga_horaria", e.target.value)}
            />
          </div>

          <div>
            <div style={styles.label}>Status</div>
            <select
              style={styles.input}
              value={form.ativo ? "ativo" : "inativo"}
              onChange={(e) => alterar("ativo", e.target.value === "ativo")}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 22,
          }}
        >
          <button style={styles.primaryButton} onClick={salvarFuncionario}>
            {editandoId ? "Salvar alterações" : "Cadastrar funcionário"}
          </button>

          {editandoId && (
            <button style={styles.secondaryButton} onClick={limpar}>
              Cancelar edição
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 1fr) 280px",
          gap: 12,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <input
          style={styles.input}
          placeholder="Buscar por nome, matrícula ou cargo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <select
          style={styles.input}
          value={filtroCargo}
          onChange={(e) => setFiltroCargo(e.target.value)}
        >
          <option value="todos">Todos os cargos</option>
          {cargos.map((cargo) => (
            <option key={cargo} value={cargo}>
              {cargo}
            </option>
          ))}
        </select>
      </div>

      <div style={{ ...styles.label, marginBottom: 14 }}>
        📋 Funcionários cadastrados
      </div>

      {carregando && <div>Carregando funcionários...</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {funcionariosFiltrados.map((item) => (
          <div
            key={item.id}
            className="func-card"
            style={{
              ...styles.softBox,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 14,
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{item.nome}</div>

              <div style={{ color: colors.muted, marginTop: 4 }}>
                Matrícula: <strong>{item.matricula || "-"}</strong> • Cargo:{" "}
                <strong>{item.cargo || "-"}</strong> • Idade:{" "}
                <strong>
                  {calcularIdade(item.data_nascimento) !== "-"
                    ? `${calcularIdade(item.data_nascimento)} anos`
                    : "-"}
                </strong>
              </div>

              <div style={{ color: colors.muted, marginTop: 4 }}>
                Admissão: <strong>{formatarData(item.data_admissao)}</strong> •
                Nascimento:{" "}
                <strong>{formatarData(item.data_nascimento)}</strong> • Carga
                horária: <strong>{item.carga_horaria || "-"}</strong>
              </div>

              <div style={{ color: colors.muted, marginTop: 4 }}>
                Salário: <strong>{formatarMoeda(item.salario)}</strong> •
                Benefícios: <strong>{formatarMoeda(item.beneficios)}</strong>
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
              <button
                style={styles.secondaryButton}
                onClick={() => editarFuncionario(item)}
              >
                ✏️ Editar
              </button>

              <button
                style={styles.dangerButton}
                onClick={() => excluirFuncionario(item.id)}
              >
                🗑️ Excluir
              </button>
            </div>
          </div>
        ))}

        {funcionariosFiltrados.length === 0 && (
          <div style={{ color: colors.muted }}>
            Nenhum funcionário encontrado.
          </div>
        )}
      </div>
    </div>
  );
}