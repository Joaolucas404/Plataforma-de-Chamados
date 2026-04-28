import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

import Layout from "./components/Layout";
import PainelGerencialPage from "./pages/PainelGerencialPage";
import AberturaPage from "./pages/AberturaPage";
import ChamadosPage from "./pages/ChamadosPage";
import DetalheChamadoPage from "./pages/DetalheChamadoPage";
import OperadorPage from "./pages/OperadorPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AdminPage from "./pages/AdminPage";

import { lightTheme, darkTheme } from "./theme";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export const LOGO_URL = "https://i.imgur.com/aAMds6C.jpeg";

export const statusOptions = [
  "Aberto",
  "Em andamento",
  "Aguardando Compra",
  "Concluído",
  "Encerrado",
];

export const prioridadeOptions = ["Baixa", "Média", "Alta", "Crítica"];

export const estacoes = [
  "EBAP Foz da Costa",
  "EBAP Marilândia",
  "EBAP Vila Nova",
  "Cabine Primária",
  "Eletrocentro Marilândia",
];

export function podeExportar(perfil) {
  return ["prefeitura", "gestor"].includes(perfil);
}

export function podeGerenciarEquipes(perfil) {
  return perfil === "gestor";
}

export function getBadgeStyle(colors, type, value) {
  const texto = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (type === "status") {
    if (texto === "aberto") {
      return {
        background: "rgba(30,155,255,.15)",
        color: "#1e9bff",
        borderColor: "#1e9bff",
      };
    }

    if (texto === "em andamento" || texto === "em execucao") {
      return {
        background: "rgba(255,159,26,.16)",
        color: "#ff9f1a",
        borderColor: "#ff9f1a",
      };
    }

    if (texto === "aguardando compra") {
      return {
        background: "rgba(168,85,247,.18)",
        color: "#a855f7",
        borderColor: "#a855f7",
      };
    }

    if (texto === "fechado" || texto === "finalizado" || texto === "concluido") {
      return {
        background: "rgba(48,209,88,.16)",
        color: "#30d158",
        borderColor: "#30d158",
      };
    }
  }

  if (type === "prioridade") {
    if (texto === "baixa") {
      return {
        background: "rgba(48,209,88,.16)",
        color: "#30d158",
        borderColor: "#30d158",
      };
    }

    if (texto === "media") {
      return {
        background: "rgba(250,204,21,.18)",
        color: "#facc15",
        borderColor: "#facc15",
      };
    }

    if (texto === "alta") {
      return {
        background: "rgba(255,159,26,.18)",
        color: "#ff9f1a",
        borderColor: "#ff9f1a",
      };
    }

    if (texto === "critica" || texto === "critico") {
      return {
        background: "rgba(255,49,49,.18)",
        color: "#ff3131",
        borderColor: "#ff3131",
      };
    }
  }

  return {
    background: colors?.chip || "rgba(255,255,255,.08)",
    color: colors?.text || "#ffffff",
    borderColor: colors?.border || "rgba(255,255,255,.18)",
  };
}

function buildStyles(colors, darkMode) {
  return {
    page: {
      minHeight: "100vh",
      background: darkMode
        ? "linear-gradient(180deg, #071426 0%, #08192d 100%)"
        : "linear-gradient(180deg, #f4f7fb 0%, #edf3f9 100%)",
      fontFamily: "Inter, Arial, sans-serif",
      color: colors.text,
      width: "100vw",
      overflowX: "hidden",
    },

    shell: {
      display: "grid",
      gridTemplateColumns: "260px minmax(0, 1fr)",
      minHeight: "100vh",
      width: "100vw",
    },

    sidebar: {
      background: `linear-gradient(180deg, ${colors.sidebar} 0%, ${colors.sidebarDark} 100%)`,
      color: "white",
      padding: "22px 16px",
      display: "flex",
      flexDirection: "column",
      minWidth: 0,
      position: "sticky",
      top: 0,
      height: "100vh",
      zIndex: 5,
      boxShadow: "12px 0 34px rgba(6,40,91,0.22)",
    },

    logoWrap: {
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: "22px",
      padding: "14px",
      marginBottom: "18px",
    },

    logo: {
      width: "100%",
      borderRadius: "12px",
      display: "block",
      background: "white",
      objectFit: "contain",
    },

    sideSectionTitle: {
      color: "rgba(255,255,255,0.7)",
      fontSize: "13px",
      fontWeight: 800,
      letterSpacing: "0.04em",
      margin: "18px 12px 10px",
      textTransform: "uppercase",
    },

    sideItem: (active) => ({
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "15px 16px",
      borderRadius: "18px",
      background: active
        ? "linear-gradient(135deg, #2a67df 0%, #1658d1 100%)"
        : "transparent",
      color: "white",
      fontWeight: 800,
      cursor: "pointer",
      border: active ? "1px solid rgba(255,255,255,0.15)" : "1px solid transparent",
      boxShadow: active ? "0 14px 28px rgba(22,88,209,0.32)" : "none",
      marginBottom: "8px",
      transition: "all .2s ease",
    }),

    sideIcon: {
      width: "22px",
      textAlign: "center",
      opacity: 0.95,
    },

    userCard: {
      marginTop: "auto",
      padding: "14px 16px",
      borderRadius: "18px",
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.09)",
    },

    main: {
      padding: "24px 28px",
      minWidth: 0,
      width: "100%",
    },

   container: {
     width: "100%",
     maxWidth: "100%",   // 🔥 ESSENCIAL
     margin: 0,          // 🔥 REMOVE centralização
     padding: 0,
     boxSizing: "border-box",
    },

    topCard: {
      background: colors.panel,
      border: `1px solid ${colors.border}`,
      borderRadius: "26px",
      padding: "20px 24px",
      boxShadow: "0 20px 50px rgba(20,40,90,0.08)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "18px",
      flexWrap: "wrap",
      marginBottom: "16px",
      width: "100%",
      boxSizing: "border-box",
    },

    topTitleWrap: {
      display: "flex",
      gap: "16px",
      alignItems: "flex-start",
      minWidth: 0,
      flex: 1,
    },

    topIcon: {
      width: "52px",
      height: "52px",
      borderRadius: "16px",
      border: `2px solid ${colors.primary}`,
      color: colors.primary,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "26px",
      fontWeight: 800,
      flexShrink: 0,
    },

    title: {
      margin: 0,
      fontSize: "clamp(26px, 2.3vw, 38px)",
      fontWeight: 900,
      color: colors.text,
      lineHeight: 1.08,
      letterSpacing: "-0.02em",
    },

    subtitle: {
      marginTop: "8px",
      color: colors.muted,
      fontSize: "16px",
    },

    topActions: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      flexWrap: "wrap",
    },

    profileChip: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      border: `1px solid ${colors.border}`,
      borderRadius: "18px",
      padding: "12px 16px",
      background: colors.panelSolid,
      fontWeight: 800,
      color: colors.text,
    },

    bellWrap: {
      width: "52px",
      height: "52px",
      borderRadius: "18px",
      border: `1px solid ${colors.border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: colors.panelSolid,
      position: "relative",
      fontSize: "22px",
    },

    badgeMini: {
      position: "absolute",
      top: "-4px",
      right: "-4px",
      width: "24px",
      height: "24px",
      borderRadius: "50%",
      background: "#ff4747",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      fontWeight: 800,
      border: `3px solid ${colors.panelSolid}`,
    },

    sectionCard: {
      background: colors.panel,
      border: `1px solid ${colors.border}`,
      borderRadius: "24px",
      padding: "22px",
      boxShadow: "0 20px 50px rgba(20,40,90,0.08)",
      minWidth: 0,
      color: colors.text,
    },

    formCard: {
      background: colors.panel,
      border: `1px solid ${colors.border}`,
      borderRadius: "26px",
      padding: "26px",
      boxShadow: "0 20px 50px rgba(20,40,90,0.08)",
      marginBottom: "18px",
      width: "100%",
      boxSizing: "border-box",
    },

    formGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      gap: "22px",
      width: "100%",
    },

    label: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      fontWeight: 800,
      color: colors.text,
      marginBottom: "10px",
      fontSize: "15px",
    },

    labelIcon: {
      color: colors.primary,
      fontSize: "22px",
      width: "24px",
      textAlign: "center",
      flexShrink: 0,
    },

    input: {
      width: "100%",
      height: "62px",
      padding: "0 20px",
      borderRadius: "18px",
      border: `1px solid ${colors.border}`,
      background: colors.panelSolid,
      color: colors.text,
      fontSize: "17px",
      boxSizing: "border-box",
      outline: "none",
      minWidth: 0,
    },

    textarea: {
      width: "100%",
      minHeight: "124px",
      padding: "18px 20px",
      borderRadius: "18px",
      border: `1px solid ${colors.border}`,
      background: colors.panelSolid,
      color: colors.text,
      fontSize: "17px",
      boxSizing: "border-box",
      resize: "vertical",
      outline: "none",
    },

    primaryButton: {
      background: "linear-gradient(135deg, #2a67df 0%, #1658d1 100%)",
      color: "white",
      border: "none",
      borderRadius: "18px",
      padding: "0 28px",
      minHeight: "62px",
      display: "inline-flex",
      alignItems: "center",
      gap: "12px",
      fontWeight: 800,
      fontSize: "16px",
      cursor: "pointer",
    },

    secondaryButton: {
      background: colors.panelSolid,
      color: colors.text,
      border: `1px solid ${colors.border}`,
      borderRadius: "18px",
      padding: "0 26px",
      minHeight: "62px",
      display: "inline-flex",
      alignItems: "center",
      gap: "12px",
      fontWeight: 800,
      fontSize: "16px",
      cursor: "pointer",
    },

    dangerButton: {
      background: colors.panelSolid,
      color: colors.danger,
      border: "1px solid #f0b8b8",
      borderRadius: "18px",
      padding: "0 26px",
      minHeight: "58px",
      display: "inline-flex",
      alignItems: "center",
      gap: "12px",
      fontWeight: 800,
      fontSize: "15px",
      cursor: "pointer",
    },

    info: {
      padding: "14px 16px",
      borderRadius: "14px",
      marginBottom: "14px",
      fontSize: "14px",
      fontWeight: 600,
    },

    ticket: {
      background: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: "22px",
      padding: "18px",
      marginBottom: "14px",
      cursor: "pointer",
      color: colors.text,
    },

    badgeRow: {
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
      marginBottom: "10px",
    },

    badge: {
      padding: "6px 10px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: 800,
      border: `1px solid ${colors.border}`,
      background: colors.panelSolid,
    },

    softGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: "10px",
      marginTop: "14px",
    },

    softBox: {
      background: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: "18px",
      padding: "14px",
      fontSize: "14px",
      lineHeight: 1.55,
      minWidth: 0,
      color: colors.text,
    },

    footer: {
      textAlign: "center",
      color: colors.muted,
      fontSize: "14px",
      padding: "10px 0 18px",
    },

    loginWrap: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: `linear-gradient(135deg, ${colors.sidebar} 0%, ${colors.primaryDark} 100%)`,
      padding: "20px",
    },

    loginCard: {
      width: "100%",
      maxWidth: "520px",
      background: colors.panelSolid,
      borderRadius: "28px",
      padding: "30px",
      boxShadow: "0 30px 60px rgba(0,0,0,0.22)",
    },
  };
}

function LoginScreen({ authForm, setAuthForm, fazerLogin, mensagem, erro, styles, colors }) {
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [entrando, setEntrando] = useState(false);

  async function handleLogin() {
    setEntrando(true);
    await fazerLogin();
    setEntrando(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "grid",
        placeItems: "center",
        padding: 22,
        boxSizing: "border-box",
        background:
          "radial-gradient(circle at top left, rgba(30,155,255,.35), transparent 34%), linear-gradient(135deg, #020b16 0%, #061a2f 45%, #020b16 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "rgba(30,155,255,.12)",
          filter: "blur(70px)",
          top: -120,
          right: -100,
        }}
      />

      <div
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: "rgba(48,209,88,.08)",
          filter: "blur(80px)",
          bottom: -120,
          left: -80,
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 1080,
          display: "grid",
          gridTemplateColumns: "1fr 470px",
          gap: 28,
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ color: "white", padding: 20 }}>
          <img
            src={LOGO_URL}
            alt="Logo"
            style={{
              width: 220,
              maxWidth: "100%",
              background: "white",
              borderRadius: 18,
              padding: 8,
              marginBottom: 28,
            }}
          />

          <h1
            style={{
              fontSize: "clamp(34px, 4vw, 58px)",
              lineHeight: 1.05,
              margin: 0,
              fontWeight: 950,
              letterSpacing: "-0.04em",
            }}
          >
            Gestão inteligente de chamados operacionais
          </h1>

          <p
            style={{
              color: "#b8c7dc",
              fontSize: 18,
              lineHeight: 1.6,
              maxWidth: 560,
              marginTop: 20,
            }}
          >
            Controle chamados, equipes, fotos, comentários, status e relatórios
            em uma plataforma corporativa.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
              marginTop: 28,
              maxWidth: 560,
            }}
          >
            {[
              ["📊", "Dashboard"],
              ["📸", "Fotos"],
              ["🧾", "Relatórios"],
            ].map(([icon, text]) => (
              <div
                key={text}
                style={{
                  border: "1px solid rgba(255,255,255,.12)",
                  background: "rgba(255,255,255,.06)",
                  borderRadius: 18,
                  padding: 14,
                  fontWeight: 900,
                  color: "#e5f2ff",
                }}
              >
                <div style={{ fontSize: 24 }}>{icon}</div>
                <div style={{ marginTop: 6 }}>{text}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,.08)",
            backdropFilter: "blur(22px)",
            border: "1px solid rgba(255,255,255,.16)",
            borderRadius: 30,
            padding: 30,
            boxShadow: "0 30px 80px rgba(0,0,0,.38)",
            color: "white",
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #1e9bff, #1658d1)",
                fontSize: 28,
                marginBottom: 16,
                boxShadow: "0 0 30px rgba(30,155,255,.35)",
              }}
            >
              🔐
            </div>

            <h2 style={{ margin: 0, fontSize: 30, fontWeight: 950 }}>
              Acessar sistema
            </h2>

            <p style={{ color: "#9fb1cc", marginTop: 8, lineHeight: 1.5 }}>
              Entre com seu login corporativo para continuar.
            </p>
          </div>

          {mensagem && (
            <div
              style={{
                ...styles.info,
                background: "rgba(48,209,88,.14)",
                border: "1px solid rgba(48,209,88,.35)",
                color: "#7cffaa",
              }}
            >
              {mensagem}
            </div>
          )}

          {erro && (
            <div
              style={{
                ...styles.info,
                background: "rgba(255,49,49,.14)",
                border: "1px solid rgba(255,49,49,.35)",
                color: "#ff8b8b",
              }}
            >
              {erro}
            </div>
          )}

          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>👤 Login</div>
              <input
                style={{
                  ...styles.input,
                  background: "rgba(2,11,22,.72)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,.14)",
                }}
                placeholder="Digite seu login"
                value={authForm.login}
                onChange={(e) =>
                  setAuthForm({ ...authForm, login: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLogin();
                }}
              />
            </div>

            <div>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>🔑 Senha</div>

              <div style={{ position: "relative" }}>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  style={{
                    ...styles.input,
                    background: "rgba(2,11,22,.72)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,.14)",
                    paddingRight: 64,
                  }}
                  placeholder="Digite sua senha"
                  value={authForm.senha}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, senha: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogin();
                  }}
                />

                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: 10,
                    height: 42,
                    width: 42,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,.12)",
                    background: "rgba(255,255,255,.08)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 18,
                  }}
                >
                  {mostrarSenha ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              style={{
                ...styles.primaryButton,
                width: "100%",
                justifyContent: "center",
                marginTop: 8,
                opacity: entrando ? 0.75 : 1,
                boxShadow: "0 18px 38px rgba(30,155,255,.28)",
              }}
              onClick={handleLogin}
              disabled={entrando}
            >
              {entrando ? "Entrando..." : "🚀 Entrar no sistema"}
            </button>
          </div>

          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: "1px solid rgba(255,255,255,.10)",
              color: "#9fb1cc",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Ambiente seguro • Plataforma corporativa de chamados
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 1fr 470px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("dark_theme") === "true"
  );

  const colors = darkMode ? darkTheme : lightTheme;
  const styles = useMemo(() => buildStyles(colors, darkMode), [colors, darkMode]);

  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1280
  );

  const isMobile = viewportWidth <= 900;

  const [usuario, setUsuario] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authForm, setAuthForm] = useState({ login: "", senha: "" });

  const [tickets, setTickets] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [selecionado, setSelecionado] = useState(null);
  const [notificacoes, setNotificacoes] = useState([]);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);

  useEffect(() => {
    localStorage.setItem("dark_theme", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const salvo = sessionStorage.getItem("usuario_sistema_logado");

    if (salvo) {
      try {
        setUsuario(JSON.parse(salvo));
      } catch {
        sessionStorage.removeItem("usuario_sistema_logado");
      }
    }

    setAuthLoading(false);
  }, []);

  useEffect(() => {
    if (usuario) {
      carregarChamados();
      carregarEquipes();
      if (usuario.perfil === "gestor") carregarNotificacoes();
    }
  }, [usuario?.id, usuario?.perfil]);

  async function carregarChamados() {
    if (!supabase) {
      setErro("Configure o arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("chamados")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErro("Erro ao carregar chamados.");
      setLoading(false);
      return;
    }

    setTickets(data || []);
    setLoading(false);
  }

  async function carregarEquipes() {
    if (!supabase) return;

    const { data } = await supabase
      .from("equipes")
      .select("*")
      .order("nome", { ascending: true });

    setEquipes(data || []);
  }

  async function carregarNotificacoes() {
    if (!supabase || usuario?.perfil !== "gestor") return;

    const { data } = await supabase
      .from("notificacoes_sistema")
      .select("*")
      .eq("perfil_destino", "gestor")
      .order("created_at", { ascending: false })
      .limit(30);

    setNotificacoes(data || []);
  }

  async function marcarNotificacoesComoLidas() {
    if (!supabase || usuario?.perfil !== "gestor") return;

    await supabase
      .from("notificacoes_sistema")
      .update({ lida: true })
      .eq("perfil_destino", "gestor")
      .eq("lida", false);

    carregarNotificacoes();
  }

  async function fazerLogin() {
    if (!supabase) {
      setErro("Supabase não configurado. Verifique seu arquivo .env.");
      return;
    }

    setErro("");

    const login = authForm.login.trim().toLowerCase();
    const senha = authForm.senha;

    const { data, error } = await supabase
      .from("usuarios_sistema")
      .select("*")
      .eq("login", login)
      .eq("senha", senha)
      .eq("ativo", true)
      .single();

    if (error || !data) {
      setErro("Login ou senha inválidos.");
      return;
    }

    setUsuario(data);
    sessionStorage.setItem("usuario_sistema_logado", JSON.stringify(data));
    navigate("/painel", { replace: true });
  }

  function sair() {
    sessionStorage.removeItem("usuario_sistema_logado");
    setUsuario(null);
    navigate("/login", { replace: true });
  }

  function exportarChamados() {
    const blob = new Blob([JSON.stringify(tickets, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "chamados_consorcio_uniao_obracon.json";
    link.click();

    URL.revokeObjectURL(url);
  }

  if (authLoading) {
    return (
      <div style={styles.loginWrap}>
        <div style={styles.loginCard}>Carregando...</div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <LoginScreen
        authForm={authForm}
        setAuthForm={setAuthForm}
        fazerLogin={fazerLogin}
        mensagem={mensagem}
        erro={erro}
        styles={styles}
        colors={colors}
      />
    );
  }

  const currentPath = location.pathname;
  const notificacoesNaoLidas = notificacoes.filter((item) => !item.lida).length;

  return (
    <Layout
      usuario={usuario}
      colors={colors}
      styles={styles}
      isMobile={isMobile}
      currentPath={currentPath}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      notificacoesNaoLidas={notificacoesNaoLidas}
      mostrarNotificacoes={mostrarNotificacoes}
      setMostrarNotificacoes={setMostrarNotificacoes}
      marcarNotificacoesComoLidas={marcarNotificacoesComoLidas}
      notificacoes={notificacoes}
      exportarChamados={exportarChamados}
      sair={sair}
      mensagem={mensagem}
      erro={erro}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/painel" replace />} />
        <Route path="/login" element={<Navigate to="/painel" replace />} />

        <Route
          path="/painel"
          element={
            <PainelGerencialPage
              styles={styles}
              colors={colors}
              tickets={tickets}
              loading={loading}
            />
          }
        />

        <Route
          path="/abertura"
          element={
            <AberturaPage
              styles={styles}
              colors={colors}
              usuario={usuario}
              equipes={equipes}
              carregarChamados={carregarChamados}
            />
          }
        />

        <Route
          path="/chamados"
          element={
            <ChamadosPage
              styles={styles}
              colors={colors}
              tickets={tickets}
              loading={loading}
              setSelecionado={setSelecionado}
            />
          }
        />

        <Route
          path="/chamados/:id"
          element={
            <DetalheChamadoPage
              styles={styles}
              colors={colors}
              selecionado={selecionado}
              usuario={usuario}
              carregarChamados={carregarChamados}
            />
          }
        />

        <Route
          path="/operador"
          element={
            <OperadorPage
              styles={styles}
              colors={colors}
              tickets={tickets}
            />
          }
        />

        <Route
          path="/analytics"
          element={
            <AnalyticsPage
              styles={styles}
              colors={colors}
              tickets={tickets}
            />
          }
        />

        <Route
          path="/admin"
          element={
            <AdminPage
              styles={styles}
              colors={colors}
              usuario={usuario}
              equipes={equipes}
              carregarEquipes={carregarEquipes}
            />
          }
        />

        <Route path="*" element={<Navigate to="/painel" replace />} />
      </Routes>
    </Layout>
  );
}