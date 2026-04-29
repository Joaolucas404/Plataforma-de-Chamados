import { useNavigate } from "react-router-dom";

export default function Sidebar({
  styles,
  currentPath,
  usuario,
  sair,
}) {
  const navigate = useNavigate();

  function Item({ path, icon, label }) {
    const ativo = currentPath === path;

    return (
      <div
        style={styles.sideItem(ativo)}
        onClick={() => navigate(path)}
      >
        <span style={styles.sideIcon}>{icon}</span>
        {label}
      </div>
    );
  }

  return (
    <aside style={styles.sidebar}>
      {/* LOGO */}
      <div style={styles.logoWrap}>
        <img
          src="https://i.imgur.com/aAMds6C.jpeg"
          alt="Logo"
          style={styles.logo}
        />
      </div>

      {/* ======================== */}
      {/* MENU PRINCIPAL */}
      {/* ======================== */}
      <div style={styles.sideSectionTitle}>Sistema</div>

      <Item path="/painel" icon="📊" label="Painel" />
      <Item path="/abertura" icon="📝" label="Abrir chamado" />
      <Item path="/chamados" icon="📂" label="Chamados" />
      <Item path="/analytics" icon="📈" label="Analytics" />

      {/* ======================== */}
      {/* ADMIN */}
      {/* ======================== */}
      {usuario?.perfil === "gestor" && (
        <>
          <div style={styles.sideSectionTitle}>Administração</div>

          <Item path="/admin" icon="⚙️" label="Administração" />

          {/* NOVA PÁGINA */}
          <Item path="/funcionarios" icon="👥" label="Funcionários" />
        </>
      )}

      {/* ======================== */}
      {/* USUÁRIO */}
      {/* ======================== */}
      <div style={styles.userCard}>
        <div style={{ fontWeight: 900 }}>
          {usuario?.nome || usuario?.login}
        </div>

        <div style={{ fontSize: 13, opacity: 0.7 }}>
          {usuario?.perfil}
        </div>

        <button
          style={{
            ...styles.dangerButton,
            width: "100%",
            marginTop: 12,
          }}
          onClick={sair}
        >
          🚪 Sair
        </button>
      </div>
    </aside>
  );
}