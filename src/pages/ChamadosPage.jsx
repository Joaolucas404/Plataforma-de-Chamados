import React from "react";
import { useNavigate } from "react-router-dom";
import { getBadgeStyle } from "../App";

export default function ChamadosPage({ styles, colors, tickets = [], loading, setSelecionado }) {
  const navigate = useNavigate();

  return (
    <div style={styles.sectionCard}>
      <div style={{ ...styles.label, marginBottom: 16 }}>
        <span style={styles.labelIcon}>📂</span>
        <span>Painel de chamados</span>
      </div>

      {loading ? (
        <div>Carregando chamados...</div>
      ) : (
        tickets.map((ticket) => (
          <div
            key={ticket.id}
            style={styles.ticket}
            onClick={() => {
              setSelecionado(ticket);
              navigate(`/chamados/${ticket.id}`);
            }}
          >
            <div style={styles.badgeRow}>
              <span style={{ ...styles.badge, fontWeight: 900 }}>{ticket.codigo}</span>
              <span style={{ ...styles.badge, ...getBadgeStyle(colors, "status", ticket.status) }}>
                {ticket.status}
              </span>
              <span style={{ ...styles.badge, ...getBadgeStyle(colors, "prioridade", ticket.prioridade) }}>
                {ticket.prioridade}
              </span>
            </div>

            <div style={{ fontSize: 20, fontWeight: 800 }}>{ticket.equipamento}</div>
            <div style={{ color: colors.muted, marginTop: 4 }}>
              {ticket.localidade} • {ticket.tecnico || "Não atribuído"}
            </div>
          </div>
        ))
      )}
    </div>
  );
}