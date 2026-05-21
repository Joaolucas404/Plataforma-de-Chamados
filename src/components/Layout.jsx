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
  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <aside style={styles.sidebar}>
          <Sidebar
            currentPath={currentPath}
            usuario={usuario}
            styles={styles}
            exportarChamados={exportarChamados}
            sair={sair}
          />
        </aside>

        <main style={styles.main}>
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
              notificacoes={notificacoes}
            />

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

            {children}

            <div style={styles.footer}>
              © 2025 Consórcio UNIÃO OBRACON. Plataforma corporativa de chamados e manutenção.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}