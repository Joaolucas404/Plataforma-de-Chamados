import React from "react";
import { NavLink } from "react-router-dom";
import { LOGO_URL, podeExportar, podeGerenciarEquipes } from "../App";

export default function Sidebar({ currentPath, usuario, styles, exportarChamados, sair }) {
  const isActive = (path) => currentPath.startsWith(path);

  return (
    <>
      <div style={styles.logoWrap}>
        <img src={LOGO_URL} alt="Logo" style={styles.logo} />
      </div>

      <NavLink to="/painel" style={{ textDecoration: "none" }}>
        <div style={styles.sideItem(isActive("/painel"))}>
          <span style={styles.sideIcon}>📊</span>
          <span>Visão Geral</span>
        </div>
      </NavLink>

      <NavLink to="/abertura" style={{ textDecoration: "none" }}>
        <div style={styles.sideItem(isActive("/abertura"))}>
          <span style={styles.sideIcon}>📝</span>
          <span>Abertura</span>
        </div>
      </NavLink>

      <NavLink to="/chamados" style={{ textDecoration: "none" }}>
        <div style={styles.sideItem(isActive("/chamados"))}>
          <span style={styles.sideIcon}>📂</span>
          <span>Chamados</span>
        </div>
      </NavLink>

      <NavLink to="/operador" style={{ textDecoration: "none" }}>
        <div style={styles.sideItem(isActive("/operador"))}>
          <span style={styles.sideIcon}>👤</span>
          <span>Portal do operador</span>
        </div>
      </NavLink>

      {podeExportar(usuario?.perfil) && (
        <NavLink to="/analytics" style={{ textDecoration: "none" }}>
          <div style={styles.sideItem(isActive("/analytics"))}>
            <span style={styles.sideIcon}>📈</span>
            <span>Analytics</span>
          </div>
        </NavLink>
      )}

      {podeGerenciarEquipes(usuario?.perfil) && <div style={styles.sideSectionTitle}>Administração</div>}

      {podeGerenciarEquipes(usuario?.perfil) && (
        <NavLink to="/admin" style={{ textDecoration: "none" }}>
          <div style={styles.sideItem(isActive("/admin"))}>
            <span style={styles.sideIcon}>👥</span>
            <span>Gerenciar acessos</span>
          </div>
        </NavLink>
      )}

      {podeExportar(usuario?.perfil) && (
        <div style={styles.sideItem(false)} onClick={exportarChamados}>
          <span style={styles.sideIcon}>⬇️</span>
          <span>Exportar base</span>
        </div>
      )}

      <div style={styles.sideItem(false)} onClick={sair}>
        <span style={styles.sideIcon}>↩️</span>
        <span>Sair</span>
      </div>

      <div style={styles.userCard}>
        <div style={{ fontWeight: 800 }}>{usuario?.nome || usuario?.login}</div>
        <div style={{ color: "rgba(255,255,255,0.72)", marginTop: 4, fontSize: 14 }}>
          {usuario?.perfil}
        </div>
      </div>
    </>
  );
}