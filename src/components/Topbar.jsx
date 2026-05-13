import React, { useState } from "react";

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
  const isGestor = usuario?.perfil === "gestor";
  const [menuPerfilAberto, setMenuPerfilAberto] = useState(false);

  function sair() {
    localStorage.removeItem("usuario");
    localStorage.removeItem("usuarioLogado");
    sessionStorage.clear();
    window.location.reload();
  }

  const topCard = {
    ...styles.topCard,
    position: "relative",
    overflow: "visible",
    borderRadius: 28,
    padding: "22px 26px",
    marginBottom: 24,
    background: darkMode
      ? "linear-gradient(135deg, rgba(8,28,58,.96), rgba(5,17,35,.98))"
      : "linear-gradient(135deg, rgba(255,255,255,.98), rgba(238,246,255,.96))",
    border: darkMode
      ? "1px solid rgba(80,150,255,.24)"
      : "1px solid rgba(30,107,184,.16)",
    boxShadow: darkMode
      ? "0 24px 80px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.06)"
      : "0 18px 55px rgba(30,64,175,.12), inset 0 1px 0 rgba(255,255,255,.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 22,
  };

  return (
    <div style={topCard}>
      <div
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: darkMode
            ? "rgba(47,123,255,.18)"
            : "rgba(47,123,255,.10)",
          filter: "blur(75px)",
          top: -240,
          right: 130,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          ...styles.topTitleWrap,
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 18,
            display: "grid",
            placeItems: "center",
            background: darkMode
              ? "linear-gradient(145deg, rgba(47,123,255,.26), rgba(14,165,233,.10))"
              : "linear-gradient(145deg, rgba(30,107,184,.14), rgba(14,165,233,.08))",
            border: "1px solid rgba(95,165,255,.42)",
            boxShadow: darkMode
              ? "0 0 28px rgba(47,123,255,.26), inset 0 1px 0 rgba(255,255,255,.12)"
              : "0 14px 30px rgba(30,107,184,.12), inset 0 1px 0 rgba(255,255,255,.9)",
            fontSize: 24,
          }}
        >
          🧾
        </div>

        <div>
          <h1
            style={{
              ...styles.title,
              margin: 0,
              color: darkMode ? "#f4f8ff" : "#102a56",
              fontSize: 32,
              fontWeight: 950,
              letterSpacing: "-0.8px",
              lineHeight: 1.05,
            }}
          >
            Plataforma corporativa de chamados
          </h1>

          <div
            style={{
              ...styles.subtitle,
              marginTop: 8,
              color: darkMode ? "#9fb2d0" : "#59708f",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Painel gerencial, abertura, acompanhamento e relatórios.
          </div>
        </div>
      </div>

      <div
        style={{
          ...styles.topActions,
          position: "relative",
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          onClick={() => setDarkMode((v) => !v)}
          type="button"
          style={{
            height: 50,
            minWidth: 122,
            padding: "0 16px",
            borderRadius: 18,
            border: darkMode
              ? "1px solid rgba(96,165,250,.22)"
              : "1px solid rgba(30,107,184,.14)",
            background: darkMode
              ? "linear-gradient(145deg, rgba(8,24,48,.95), rgba(15,35,64,.92))"
              : "linear-gradient(145deg, rgba(255,255,255,.98), rgba(240,247,255,.92))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            cursor: "pointer",
            boxShadow: darkMode
              ? "0 10px 30px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.04)"
              : "0 10px 25px rgba(30,64,175,.08)",
            transition: "all .25s ease",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: darkMode
                ? "linear-gradient(145deg, #0f172a, #1e293b)"
                : "linear-gradient(145deg, #ffcf4d, #ff9f1a)",
              display: "grid",
              placeItems: "center",
              fontSize: 14,
            }}
          >
            {darkMode ? "🌙" : "☀️"}
          </div>

          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: darkMode ? "#6b85a8" : "#7b8ba5",
                textTransform: "uppercase",
                letterSpacing: ".6px",
              }}
            >
              Tema
            </span>

            <span
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: darkMode ? "#f4f8ff" : "#12315f",
              }}
            >
              {darkMode ? "Escuro" : "Claro"}
            </span>
          </div>
        </button>

        <div style={{ position: "relative" }}>
          <div
            onClick={() => setMenuPerfilAberto((v) => !v)}
            style={{
              height: 50,
              padding: "0 18px",
              borderRadius: 18,
              border: darkMode
                ? "1px solid rgba(96,165,250,.20)"
                : "1px solid rgba(30,107,184,.14)",
              background: darkMode
                ? "linear-gradient(145deg, rgba(10,24,45,.95), rgba(17,34,60,.92))"
                : "linear-gradient(145deg, rgba(255,255,255,.98), rgba(240,247,255,.92))",
              display: "flex",
              alignItems: "center",
              gap: 12,
              boxShadow: darkMode
                ? "0 10px 30px rgba(0,0,0,.28)"
                : "0 10px 25px rgba(30,64,175,.08)",
              backdropFilter: "blur(12px)",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 12,
                background: darkMode
                  ? "linear-gradient(145deg, rgba(124,58,237,.28), rgba(59,130,246,.18))"
                  : "linear-gradient(145deg, rgba(30,107,184,.14), rgba(59,130,246,.08))",
                display: "grid",
                placeItems: "center",
                fontSize: 15,
              }}
            >
              👤
            </div>

            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: darkMode ? "#6b85a8" : "#7b8ba5",
                  textTransform: "uppercase",
                  letterSpacing: ".6px",
                }}
              >
                Perfil
              </span>

              <span
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: darkMode ? "#f4f8ff" : "#12315f",
                }}
              >
                {usuario?.perfil || "usuário"}
              </span>
            </div>
          </div>

          {menuPerfilAberto && (
            <div
              style={{
                position: "absolute",
                top: 62,
                right: 0,
                width: 230,
                borderRadius: 18,
                overflow: "hidden",
                background: darkMode
                  ? "linear-gradient(180deg,#071426,#0b1d36)"
                  : "#ffffff",
                border: darkMode
                  ? "1px solid rgba(96,165,250,.20)"
                  : "1px solid rgba(30,107,184,.14)",
                boxShadow: "0 24px 70px rgba(0,0,0,.35)",
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  padding: "16px 18px",
                  borderBottom: darkMode
                    ? "1px solid rgba(255,255,255,.06)"
                    : "1px solid rgba(15,23,42,.06)",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: darkMode ? "#9fb1cc" : "#64748b",
                  }}
                >
                  Logado como
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontWeight: 900,
                    color: darkMode ? "#fff" : "#0f172a",
                  }}
                >
                  {usuario?.perfil || "usuário"}
                </div>
              </div>

              <button
                type="button"
                onClick={sair}
                style={{
                  width: "100%",
                  height: 52,
                  border: "none",
                  background: "transparent",
                  color: "#ef4444",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0 18px",
                }}
              >
                🚪 Sair da conta
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            border: darkMode
              ? "1px solid rgba(95,165,255,.24)"
              : "1px solid rgba(30,107,184,.18)",
            background: darkMode
              ? "linear-gradient(145deg, rgba(47,123,255,.18), rgba(8,24,48,.72))"
              : "linear-gradient(145deg, rgba(255,255,255,.92), rgba(231,242,255,.86))",
            cursor: isGestor ? "pointer" : "default",
            display: "grid",
            placeItems: "center",
            boxShadow: darkMode
              ? "0 0 24px rgba(47,123,255,.18)"
              : "0 10px 25px rgba(30,64,175,.10)",
            fontSize: 18,
            position: "relative",
          }}
          onClick={() => {
            if (isGestor) {
              const proximo = !mostrarNotificacoes;
              setMostrarNotificacoes(proximo);
              if (proximo) marcarNotificacoesComoLidas();
            }
          }}
        >
          🔔

          {isGestor && notificacoesNaoLidas > 0 && (
            <span
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                minWidth: 20,
                height: 20,
                padding: "0 6px",
                borderRadius: 999,
                background: "#ef4444",
                color: "#fff",
                fontSize: 11,
                fontWeight: 950,
                display: "grid",
                placeItems: "center",
                border: "2px solid " + (darkMode ? "#071426" : "#ffffff"),
              }}
            >
              {notificacoesNaoLidas}
            </span>
          )}
        </div>

        {isGestor && mostrarNotificacoes && (
          <div
            style={{
              position: "absolute",
              top: 66,
              right: 0,
              width: 400,
              maxWidth: "90vw",
              maxHeight: 460,
              overflowY: "auto",
              background: darkMode
                ? "linear-gradient(180deg, #071426, #0b1d36)"
                : "#ffffff",
              border: darkMode
                ? "1px solid rgba(95,165,255,.28)"
                : "1px solid rgba(30,107,184,.18)",
              borderRadius: 22,
              boxShadow: "0 28px 80px rgba(0,0,0,.38)",
              padding: 16,
              zIndex: 999,
            }}
          >
            <strong>🔔 Notificações</strong>

            {notificacoes.length === 0 && (
              <div style={{ color: darkMode ? "#9fb1cc" : "#6b7280", marginTop: 12 }}>
                Nenhuma notificação no momento.
              </div>
            )}

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {notificacoes.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: darkMode ? "#0c1d34" : "#f8fafc",
                    border: darkMode
                      ? "1px solid rgba(95,165,255,.20)"
                      : "1px solid rgba(30,107,184,.14)",
                    borderRadius: 16,
                    padding: 13,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{item.titulo || "Notificação"}</div>
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
                  <div style={{ marginTop: 8, lineHeight: 1.4 }}>{item.mensagem}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}