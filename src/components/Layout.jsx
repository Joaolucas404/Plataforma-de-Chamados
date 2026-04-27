import React from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({
  children,
  usuario,
  colors,
  styles,
  isMobile,
  currentPath,
  darkMode,
  setDarkMode,
  notificacoesNaoLidas,
  mostrarNotificacoes,
  setMostrarNotificacoes,
  marcarNotificacoesComoLidas,
  notificacoes,
  exportarChamados,
  sair,
  mensagem,
  erro,
}) {
  const shellStyle = isMobile ? { ...styles.shell, gridTemplateColumns: "1fr" } : styles.shell;
  const sidebarStyle = isMobile ? { ...styles.sidebar, position: "relative", height: "auto" } : styles.sidebar;
 const mainStyle = isMobile
  ? { ...styles.main, width: "100%", minHeight: "100vh", padding: "12px", boxSizing: "border-box" }
  : { ...styles.main, width: "100%", minHeight: "100vh", padding: "16px", boxSizing: "border-box" };

  return (
    <div style={styles.page}>
      <div style={shellStyle}>
        <div style={sidebarStyle}>
          <Sidebar
            currentPath={currentPath}
            usuario={usuario}
            styles={styles}
            exportarChamados={exportarChamados}
            sair={sair}
          />
        </div>

        <main style={mainStyle}>
          <div style={styles.container}>
            <Topbar
              usuario={usuario}
              styles={styles}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              notificacoesNaoLidas={notificacoesNaoLidas}
              mostrarNotificacoes={mostrarNotificacoes}
              setMostrarNotificacoes={setMostrarNotificacoes}
              marcarNotificacoesComoLidas={marcarNotificacoesComoLidas}
            />

            {mensagem && (
              <div style={{ ...styles.info, background: "#ecfff3", border: "1px solid #b7ecc8", color: "#0f7a34" }}>
                {mensagem}
              </div>
            )}

            {erro && (
              <div style={{ ...styles.info, background: "#fff0f0", border: "1px solid #f3bbbb", color: colors.danger }}>
                {erro}
              </div>
            )}

            {children}

            <div style={styles.footer}>
              © 2025 Consórcio União OBRACON. Plataforma corporativa de chamados e manutenção.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}