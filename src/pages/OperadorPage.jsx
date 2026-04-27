import React, { useState } from "react";

export default function OperadorPage({ styles, colors, tickets = [] }) {
  const [consulta, setConsulta] = useState("");
  const [resultado, setResultado] = useState(null);

  function consultarChamado() {
    const busca = consulta.trim().toLowerCase();
    if (!busca) return setResultado(null);

    const encontrado = tickets.find((ticket) => (ticket.codigo || "").toLowerCase() === busca);
    setResultado(encontrado || false);
  }

  return (
    <div style={styles.sectionCard}>
      <div style={{ ...styles.label, marginBottom: 16 }}>
        <span style={styles.labelIcon}>🔎</span>
        <span>Portal do operador</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 14 }}>
        <input
          style={styles.input}
          placeholder="Digite o número do chamado"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
        />
        <button style={styles.primaryButton} onClick={consultarChamado}>Consultar</button>
      </div>

      {resultado && (
        <div style={{ ...styles.softBox, marginTop: 16 }}>
          <strong>{resultado.codigo}</strong>
          <div>{resultado.equipamento}</div>
          <div style={{ color: colors.muted }}>{resultado.localidade}</div>
        </div>
      )}

      {resultado === false && (
        <div style={{ ...styles.info, background: "#fff0f0", border: "1px solid #f3bbbb", color: colors.danger, marginTop: 16 }}>
          Chamado não encontrado.
        </div>
      )}
    </div>
  );
}