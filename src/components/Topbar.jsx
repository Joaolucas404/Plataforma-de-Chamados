import React from "react";

export default function Topbar({
  usuario,
  styles,
  darkMode,
  setDarkMode,
  notificacoesNaoLidas,
  setMostrarNotificacoes,
  mostrarNotificacoes,
  marcarNotificacoesComoLidas,
  notificacoes = [],
}) {
  return (
    <div style={styles.topCard}>
      <div style={styles.topTitleWrap}>
        <div style={styles.topIcon}>📋</div>
        <div>
          <h1 style={styles.title}>Plataforma corporativa de chamados</h1>
          <div style={styles.subtitle}>
            Painel gerencial, abertura, acompanhamento e relatórios.
          </div>
        </div>
      </div>

      <div style={{ ...styles.topActions, position: "relative" }}>
        <button
          style={styles.secondaryButton}
          onClick={() => setDarkMode((v) => !v)}
          type="button"
        >
          {darkMode ? "☀️ Light" : "🌙 Dark"}
        </button>

        <div style={styles.profileChip}>
          <span style={{ fontSize: 20 }}>👤</span>
          <span>{usuario?.perfil}</span>
        </div>

        <div
          style={{
            ...styles.bellWrap,
            cursor: usuario?.perfil === "gestor" ? "pointer" : "default",
          }}
          onClick={() => {
            if (usuario?.perfil === "gestor") {
              const proximo = !mostrarNotificacoes;
              setMostrarNotificacoes(proximo);
              if (proximo) marcarNotificacoesComoLidas();
            }
          }}
        >
          🔔
          {usuario?.perfil === "gestor" && notificacoesNaoLidas > 0 && (
            <span style={styles.badgeMini}>{notificacoesNaoLidas}</span>
          )}
        </div>

        {usuario?.perfil === "gestor" && mostrarNotificacoes && (
          <div
            style={{
              position: "absolute",
              top: 66,
              right: 0,
              width: 380,
              maxWidth: "90vw",
              maxHeight: 460,
              overflowY: "auto",
              background: darkMode ? "#071426" : "#ffffff",
              border: "1px solid rgba(30,107,184,.35)",
              borderRadius: 18,
              boxShadow: "0 24px 70px rgba(0,0,0,.35)",
              padding: 14,
              zIndex: 999,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <strong style={{ fontSize: 16 }}>🔔 Notificações</strong>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMostrarNotificacoes(false);
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: darkMode ? "#fff" : "#111827",
                  fontSize: 20,
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                ×
              </button>
            </div>

            {notificacoes.length === 0 && (
              <div style={{ color: darkMode ? "#9fb1cc" : "#6b7280" }}>
                Nenhuma notificação no momento.
              </div>
            )}

            <div style={{ display: "grid", gap: 10 }}>
              {notificacoes.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: darkMode ? "#0c1d34" : "#f8fafc",
                    border: "1px solid rgba(30,107,184,.22)",
                    borderRadius: 14,
                    padding: 12,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>
                    {item.titulo || "Notificação"}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: darkMode ? "#9fb1cc" : "#64748b",
                      marginTop: 3,
                    }}
                  >
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString("pt-BR")
                      : ""}
                  </div>

                  <div style={{ marginTop: 8, lineHeight: 1.4 }}>
                    {item.mensagem}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}