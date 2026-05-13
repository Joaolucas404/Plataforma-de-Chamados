import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "equipamentos-ebap-storage";

const ebapsBase = [
  "EBAP Aribiri",
  "EBAP Comportas",
  "EBAP Foz da Costa",
  "EBAP Cobilândia",
  "EBAP Laranja",
  "EBAP Marinho",
  "EBAP Sitio de Batalha",
  "EBAP Bigossi",
  "EBAP Canal da Costa",
  "EBAP Marilândia",
  "EBAP Guaranhus",
];

function criarEquipamentos(tipo, total, prefixo) {
  return Array.from({ length: total }, (_, i) => ({
    id: `${tipo}-${i + 1}`,
    nome: `${prefixo} ${String(i + 1).padStart(2, "0")}`,
    status: "operando",
    observacao: "",
  }));
}

const dadosIniciais = ebapsBase.map((nome, index) => ({
  nome,
  id: `EBAP-${String(index + 1).padStart(3, "0")}`,
  bombas: criarEquipamentos("bomba", nome === "EBAP Foz da Costa" ? 8 : 2, "Bomba"),
  rastelos: criarEquipamentos("rastelo", 1, "Rastelo"),
  comportas: criarEquipamentos("comporta", 3, "Comporta"),
  inversores: [],
}));

function carregarEbaps() {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (!salvo) return dadosIniciais;

    return JSON.parse(salvo).map((ebap) => ({
      ...ebap,
      inversores: ebap.inversores || [],
    }));
  } catch {
    return dadosIniciais;
  }
}

function statusVisual(status) {
  if (status === "falha") {
    return {
      label: "COM DEFEITO",
      icon: "⚠",
      color: "#ff4b43",
      className: "error",
    };
  }

  if (status === "atencao") {
    return {
      label: "EM MANUTENÇÃO",
      icon: "⚙",
      color: "#ffc83d",
      className: "maintenance",
    };
  }

  return {
    label: "SEM DEFEITO",
    icon: "✓",
    color: "#2cff72",
    className: "ok",
  };
}

export default function EBAPStatusPage() {
  const [now, setNow] = useState(new Date());
  const [ebaps, setEbaps] = useState(carregarEbaps);
  const [ebapSelecionada, setEbapSelecionada] = useState("EBAP Canal da Costa");

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    const storageTimer = setInterval(() => setEbaps(carregarEbaps()), 3000);

    return () => {
      clearInterval(timer);
      clearInterval(storageTimer);
    };
  }, []);

  const date = now.toLocaleDateString("pt-BR");
  const time = now.toLocaleTimeString("pt-BR");

  const ebapAtual =
    ebaps.find((e) => e.nome === ebapSelecionada) || ebaps[0] || dadosIniciais[0];

  const grupos = useMemo(
    () => [
      {
        key: "rastelos",
        title: "RASTELOS",
        label: "rastelo",
        items: ebapAtual?.rastelos || [],
        Icon: Rake3D,
      },
      {
        key: "comportas",
        title: "COMPORTAS",
        label: "comporta",
        items: ebapAtual?.comportas || [],
        Icon: Gate3D,
      },
      {
        key: "inversores",
        title: "INVERSORES DE FREQUÊNCIA",
        label: "inversor",
        items: ebapAtual?.inversores || [],
        Icon: Inverter3D,
      },
      {
        key: "bombas",
        title: "BOMBAS",
        label: "bomba",
        items: ebapAtual?.bombas || [],
        Icon: Pump3D,
      },
    ],
    [ebapAtual]
  );

  const todos = grupos.flatMap((g) => g.items);
  const total = todos.length;
  const ok = todos.filter((e) => e.status === "operando").length;
  const falha = todos.filter((e) => e.status === "falha").length;
  const manutencao = todos.filter((e) => e.status === "atencao").length;
  const disponibilidade = total ? Math.round((ok / total) * 100) : 0;

  const alertas = todos
    .filter((e) => e.status !== "operando")
    .map((e) => ({
      nome: e.nome,
      status: e.status,
      desc:
        e.observacao ||
        (e.status === "falha" ? "Defeito detectado" : "Em manutenção preventiva"),
    }));

  return (
    <div className="ebap-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .ebap-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 20% 0%, rgba(47, 123, 255, 0.22), transparent 30%),
            radial-gradient(circle at 100% 100%, rgba(0, 255, 190, 0.09), transparent 34%),
            linear-gradient(135deg, #020b18 0%, #03172e 48%, #010812 100%);
          color: white;
          padding: 14px;
          font-family: Inter, Arial, Helvetica, sans-serif;
          overflow-x: hidden;
        }

        .top {
          display: grid;
          grid-template-columns: 1fr 220px;
          align-items: center;
          gap: 18px;
          margin-bottom: 12px;
        }

        .title {
          text-align: center;
        }

        .title h1 {
          margin: 0;
          font-size: clamp(26px, 2.3vw, 38px);
          letter-spacing: 4px;
          font-weight: 950;
          text-shadow: 0 0 18px rgba(255,255,255,.18);
        }

        .title p {
          margin: 5px 0 0;
          color: #b7cbe2;
          font-size: 17px;
        }

        .clockBox {
          text-align: right;
        }

        .date {
          font-size: 14px;
          color: #c8d8ed;
          font-weight: 800;
        }

        .time {
          font-size: 30px;
          font-weight: 950;
          letter-spacing: 1px;
        }

        .systemOk {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #2cff72;
          font-size: 12px;
          font-weight: 900;
        }

        .pulseDot {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: #2cff72;
          animation: pulseDot 1.4s infinite;
        }

        @keyframes pulseDot {
          0% { box-shadow: 0 0 0 0 rgba(44,255,114,.8); }
          70% { box-shadow: 0 0 0 10px rgba(44,255,114,0); }
          100% { box-shadow: 0 0 0 0 rgba(44,255,114,0); }
        }

        .tabs {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 4px 0 12px;
          margin-bottom: 2px;
        }

        .tab {
          min-width: max-content;
          border: 1px solid rgba(77, 190, 255, 0.32);
          background: linear-gradient(180deg, rgba(7, 35, 68, .95), rgba(3, 18, 39, .95));
          color: #d7eaff;
          border-radius: 12px;
          padding: 11px 20px;
          font-weight: 950;
          cursor: pointer;
          box-shadow: inset 0 0 20px rgba(72, 180, 255, .05);
          transition: .2s;
        }

        .tab.active {
          background: linear-gradient(135deg, #2f7bff, #1658d1);
          color: white;
          border-color: rgba(82, 170, 255, .9);
          box-shadow: 0 0 22px rgba(47,123,255,.65);
          transform: translateY(-1px);
        }

        .summaryCards {
          display: grid;
          grid-template-columns: repeat(7, minmax(140px, 1fr));
          gap: 10px;
          margin-bottom: 12px;
        }

        .summaryCard {
          min-height: 76px;
          border: 1px solid rgba(71, 176, 255, .28);
          background: linear-gradient(180deg, rgba(9, 36, 69, .92), rgba(3, 18, 38, .98));
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          overflow: hidden;
          box-shadow: inset 0 0 22px rgba(75,180,255,.06);
        }

        .summaryCard.green {
          border-color: rgba(44,255,114,.5);
          background: linear-gradient(180deg, rgba(10,74,48,.78), rgba(3,25,26,.96));
        }

        .summaryCard.red {
          border-color: rgba(255,75,67,.5);
        }

        .summaryCard.yellow {
          border-color: rgba(255,200,61,.5);
        }

        .sumIcon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          color: #4ed0ff;
          filter: drop-shadow(0 0 9px rgba(78,208,255,.7));
        }

        .sumIcon svg {
          width: 42px;
          height: 42px;
        }

        .sumIcon.spin {
          animation: spin 4s linear infinite;
        }

        .sumLabel {
          font-size: 11px;
          font-weight: 950;
          color: #b8d3ee;
          text-transform: uppercase;
        }

        .sumNumber {
          font-size: 29px;
          font-weight: 950;
          line-height: 1;
        }

        .main {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 310px;
          gap: 12px;
        }

        .equipmentArea {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .groupRow {
          display: grid;
          grid-template-columns: 145px minmax(0, 1fr);
          gap: 8px;
          align-items: stretch;
        }

        .groupLabel {
          min-height: 118px;
          border: 1px solid rgba(71,176,255,.28);
          border-radius: 11px;
          background: linear-gradient(180deg, rgba(5,42,75,.9), rgba(3,19,41,.98));
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 10px;
          overflow: hidden;
        }

        .groupIcon {
          width: 74px;
          height: 74px;
          color: #4ed0ff;
          filter: drop-shadow(0 0 13px rgba(78,208,255,.7));
          animation: floatIcon 3.2s ease-in-out infinite;
        }

        .groupIcon.spinIcon {
          animation: floatIcon 3.2s ease-in-out infinite, slowTurn 7s linear infinite;
        }

        .groupTitle {
          margin-top: 8px;
          font-size: 18px;
          font-weight: 950;
          line-height: 1.15;
        }

        .cardsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          min-width: 0;
        }

        .equipmentCard {
          min-height: 128px;
          border: 1px solid rgba(71,176,255,.27);
          border-radius: 11px;
          background:
            radial-gradient(circle at 70% 25%, rgba(61,160,255,.16), transparent 34%),
            linear-gradient(180deg, rgba(7,34,64,.94), rgba(3,17,37,.98));
          padding: 12px;
          position: relative;
          overflow: hidden;
          min-width: 0;
        }

        .equipmentCard::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent, rgba(105,210,255,.1), transparent);
          transform: translateX(-120%);
          animation: shine 4.8s infinite;
        }

        @keyframes shine {
          0% { transform: translateX(-120%); }
          50%, 100% { transform: translateX(120%); }
        }

        .emptyCard {
          min-height: 118px;
          border: 1px solid rgba(71,176,255,.24);
          border-radius: 11px;
          background: linear-gradient(180deg, rgba(7,34,64,.72), rgba(3,17,37,.78));
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 26px;
          color: #9fb1cc;
          font-weight: 850;
          grid-column: 1 / -1;
          opacity: .9;
        }

        .emptyCard .emptyIcon {
          width: 70px;
          height: 70px;
          color: #8ab0c9;
          opacity: .48;
        }

        .equipmentName {
          position: relative;
          z-index: 1;
          font-size: 16px;
          font-weight: 950;
          margin-bottom: 8px;
          white-space: nowrap;
        }

        .equipmentBody {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 86px 1fr;
          gap: 10px;
          align-items: center;
        }

        .equipmentIcon {
          width: 82px;
          height: 72px;
          color: #c9d8e7;
          filter: drop-shadow(0 9px 8px rgba(0,0,0,.5));
          animation: floatIcon 3.4s ease-in-out infinite;
        }

        .statusBox {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .statusIcon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 31px;
          font-weight: 950;
          border: 3px solid currentColor;
          text-shadow: 0 0 10px currentColor;
          box-shadow: 0 0 18px currentColor;
        }

        .statusIcon.error {
          animation: blinkRed 1s infinite;
        }

        .statusIcon.maintenance {
          animation: spin 3s linear infinite;
        }

        .statusBadge {
          border: none;
          border-radius: 7px;
          color: white;
          padding: 7px 11px;
          font-size: 10px;
          font-weight: 950;
          white-space: nowrap;
        }

        .statusBadge.ok {
          background: linear-gradient(180deg, #12b94d, #07692c);
          box-shadow: 0 0 15px rgba(44,255,114,.42);
        }

        .statusBadge.error {
          background: linear-gradient(180deg, #ff453d, #8d1111);
          box-shadow: 0 0 16px rgba(255,75,67,.5);
          animation: blinkBadge 1s infinite;
        }

        .statusBadge.maintenance {
          background: linear-gradient(180deg, #ffd447, #c98900);
          color: #121212;
        }

        .updated {
          position: relative;
          z-index: 1;
          color: #c7d7eb;
          font-size: 10px;
          margin-top: 8px;
          white-space: nowrap;
        }

        .side {
          display: grid;
          gap: 12px;
          align-content: start;
          min-width: 0;
        }

        .panel {
          border: 1px solid rgba(71,176,255,.32);
          border-radius: 11px;
          background: linear-gradient(180deg, rgba(6,32,61,.96), rgba(2,13,29,.99));
          overflow: hidden;
          box-shadow: 0 0 24px rgba(0,0,0,.25);
        }

        .panelTitle {
          padding: 12px 14px;
          background: rgba(73,172,255,.09);
          color: #cfe6ff;
          font-size: 16px;
          font-weight: 950;
          letter-spacing: 1px;
          border-bottom: 1px solid rgba(71,176,255,.2);
        }

        .alertItem {
          display: grid;
          grid-template-columns: 30px 1fr 58px;
          gap: 8px;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255,255,255,.065);
          align-items: center;
        }

        .alertIcon {
          font-size: 22px;
          text-align: center;
        }

        .alertIcon.error {
          color: #ff4b43;
          animation: blinkRed 1s infinite;
        }

        .alertIcon.maintenance {
          color: #ffc83d;
          animation: spin 3s linear infinite;
        }

        .alertName {
          font-weight: 950;
          font-size: 12px;
        }

        .alertDesc {
          font-size: 11px;
          color: #bdcce0;
        }

        .alertTime {
          color: #ff4b43;
          font-size: 11px;
          font-weight: 950;
          text-align: right;
        }

        .resume {
          padding: 14px;
        }

        .resumeLine {
          display: flex;
          justify-content: space-between;
          margin-bottom: 11px;
          font-size: 13px;
          color: #d7e7f8;
        }

        .resumeLine b.green { color: #2cff72; }
        .resumeLine b.red { color: #ff4b43; }
        .resumeLine b.yellow { color: #ffc83d; }

        .availability {
          margin-top: 12px;
          padding-top: 14px;
          border-top: 1px solid rgba(255,255,255,.1);
          display: grid;
          grid-template-columns: 96px 1fr;
          gap: 10px;
          align-items: center;
        }

        .circle {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: conic-gradient(#23d65b ${disponibilidade * 3.6}deg, #303849 0deg);
          display: grid;
          place-items: center;
          position: relative;
          box-shadow: 0 0 18px rgba(35,214,91,.22);
        }

        .circle::after {
          content: "";
          width: 65px;
          height: 65px;
          position: absolute;
          border-radius: 50%;
          background: #07162b;
        }

        .circle span {
          position: relative;
          z-index: 1;
          font-size: 24px;
          font-weight: 950;
        }

        .footer {
          margin-top: 10px;
          height: 50px;
          border-top: 1px solid rgba(71,176,255,.25);
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #cfe6ff;
          padding: 0 10px;
          font-size: 13px;
        }

        .footerBrand {
          color: #4ed0ff;
          font-size: 17px;
          font-weight: 950;
        }

        @keyframes floatIcon {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        @keyframes slowTurn {
          from { rotate: 0deg; }
          to { rotate: 360deg; }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes blinkRed {
          0%, 100% {
            opacity: 1;
            filter: drop-shadow(0 0 9px rgba(255,75,67,.95));
          }
          50% {
            opacity: .35;
            filter: drop-shadow(0 0 1px rgba(255,75,67,.2));
          }
        }

        @keyframes blinkBadge {
          0%, 100% { opacity: 1; }
          50% { opacity: .72; }
        }

        svg .rotor {
          transform-origin: center;
          animation: rotorSpin 2.8s linear infinite;
        }

        svg .gear {
          transform-origin: center;
          animation: rotorSpin 4s linear infinite;
        }

        svg .water {
          animation: waterMove 1.8s ease-in-out infinite;
        }

        @keyframes rotorSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes waterMove {
          0%, 100% { transform: translateY(0); opacity: .7; }
          50% { transform: translateY(-3px); opacity: 1; }
        }

        @media (max-width: 1450px) {
          .summaryCards {
            grid-template-columns: repeat(4, minmax(140px, 1fr));
          }

          .cardsGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 1200px) {
          .main {
            grid-template-columns: 1fr;
          }

          .cardsGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .top {
            grid-template-columns: 1fr;
          }

          .clockBox {
            text-align: center;
          }

          .summaryCards {
            grid-template-columns: repeat(2, minmax(140px, 1fr));
          }

          .groupRow {
            grid-template-columns: 1fr;
          }

          .cardsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .summaryCards,
          .cardsGrid {
            grid-template-columns: 1fr;
          }

          .footer {
            height: auto;
            padding: 12px 6px;
            flex-direction: column;
            gap: 8px;
          }
        }
      `}</style>

      <header className="top">
        <div className="title">
          <h1>{ebapSelecionada.toUpperCase()} - STATUS OPERACIONAL</h1>
          <p>Rastelos, Comportas, Inversores de Frequência e Bombas</p>
        </div>

        <div className="clockBox">
          <div className="date">🗓️ {date}</div>
          <div className="time">{time}</div>
          <div className="systemOk">
            <span className="pulseDot" />
            Sistema Normal
          </div>
        </div>
      </header>

      <nav className="tabs">
        {ebaps.map((ebap) => (
          <button
            key={ebap.id}
            className={`tab ${ebapSelecionada === ebap.nome ? "active" : ""}`}
            onClick={() => setEbapSelecionada(ebap.nome)}
          >
            {ebap.nome.replace("EBAP ", "")}
          </button>
        ))}
      </nav>

      <section className="summaryCards">
        <SummaryCard Icon={Rake3D} label="Rastelos Totais" value={ebapAtual?.rastelos?.length || 0} />
        <SummaryCard Icon={Gate3D} label="Comportas Totais" value={ebapAtual?.comportas?.length || 0} />
        <SummaryCard Icon={Inverter3D} label="Inversores Totais" value={ebapAtual?.inversores?.length || 0} />
        <SummaryCard Icon={Pump3D} label="Bombas Totais" value={ebapAtual?.bombas?.length || 0} />
        <SummaryCard iconText="✓" label="Sem Defeito" value={ok} type="green" />
        <SummaryCard iconText="⚠" label="Com Defeito" value={falha} type="red" />
        <SummaryCard iconText="⚙" label="Em Manutenção" value={manutencao} type="yellow" spin />
      </section>

      <main className="main">
        <section className="equipmentArea">
          {grupos.map((grupo) => {
            const Icon = grupo.Icon;

            return (
              <div className="groupRow" key={grupo.key}>
                <div className="groupLabel">
                  <div className={`groupIcon ${grupo.key === "inversores" ? "spinIcon" : ""}`}>
                    <Icon />
                  </div>
                  <div className="groupTitle">{grupo.title}</div>
                </div>

                <div className="cardsGrid">
                  {grupo.items.length === 0 ? (
                    <div className="emptyCard">
                      <div className="emptyIcon">
                        <Icon />
                      </div>
                      Nenhum {grupo.label} cadastrado
                    </div>
                  ) : (
                    grupo.items.map((eq) => {
                      const cfg = statusVisual(eq.status);

                      return (
                        <div className="equipmentCard" key={eq.id}>
                          <div className="equipmentName">{eq.nome}</div>

                          <div className="equipmentBody">
                            <div className="equipmentIcon">
                              <Icon />
                            </div>

                            <div className="statusBox">
                              <div
                                className={`statusIcon ${cfg.className}`}
                                style={{ color: cfg.color }}
                              >
                                {cfg.icon}
                              </div>

                              <div className={`statusBadge ${cfg.className}`}>
                                {cfg.label}
                              </div>
                            </div>
                          </div>

                          <div className="updated">
                            ◷ Última atualização: {date} {time.slice(0, 5)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <aside className="side">
          <div className="panel">
            <div className="panelTitle">🔔 ÚLTIMOS ALERTAS</div>

            {alertas.length === 0 ? (
              <div style={{ padding: 18, color: "#9fb1cc", fontWeight: 900 }}>
                Nenhum alerta ativo
              </div>
            ) : (
              alertas.map((alerta, index) => {
                const cfg = statusVisual(alerta.status);

                return (
                  <div className="alertItem" key={`${alerta.nome}-${index}`}>
                    <div className={`alertIcon ${cfg.className}`}>{cfg.icon}</div>

                    <div>
                      <div className="alertName">{alerta.nome}</div>
                      <div className="alertDesc">{alerta.desc}</div>
                    </div>

                    <div className="alertTime">
                      {time.slice(0, 5)}
                      <br />
                      {date}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="panel">
            <div className="panelTitle">📊 RESUMO OPERACIONAL</div>

            <div className="resume">
              <div className="resumeLine">
                <span>✓ Sem Defeito</span>
                <b className="green">{ok}</b>
              </div>

              <div className="resumeLine">
                <span>⚠ Com Defeito</span>
                <b className="red">{falha}</b>
              </div>

              <div className="resumeLine">
                <span>⚙ Em Manutenção</span>
                <b className="yellow">{manutencao}</b>
              </div>

              <div className="resumeLine">
                <span>⊙ Total de Equipamentos</span>
                <b>{total}</b>
              </div>

              <div className="availability">
                <div className="circle">
                  <span>{disponibilidade}%</span>
                </div>

                <div>
                  <strong>DISPONIBILIDADE OPERACIONAL</strong>
                  <br />
                  <br />
                  Disponível:
                  <br />
                  <b style={{ color: "#2cff72" }}>{ok} equipamentos</b>
                  <br />
                  Indisponível:
                  <br />
                  <b style={{ color: "#ff4b43" }}>{falha + manutencao} equipamentos</b>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>

      <footer className="footer">
        <div>
          <span className="footerBrand">≋ {ebapSelecionada.toUpperCase()}</span> • Monitoramento em tempo real
        </div>

        <div>⟳ Atualização automática a cada 30 segundos</div>
      </footer>
    </div>
  );
}

function SummaryCard({ Icon, iconText, label, value, type = "", spin = false }) {
  return (
    <div className={`summaryCard ${type}`}>
      <div className={`sumIcon ${spin ? "spin" : ""}`}>
        {Icon ? <Icon /> : iconText}
      </div>

      <div>
        <div className="sumLabel">{label}</div>
        <div className="sumNumber">{String(value).padStart(2, "0")}</div>
      </div>
    </div>
  );
}

function Pump3D() {
  return (
    <svg viewBox="0 0 120 120" fill="none">
      <defs>
        <linearGradient id="pumpA" x1="20" y1="20" x2="100" y2="105">
          <stop stopColor="#80e7ff" />
          <stop offset=".45" stopColor="#1599e9" />
          <stop offset="1" stopColor="#063a75" />
        </linearGradient>
        <linearGradient id="pumpB" x1="15" y1="10" x2="80" y2="85">
          <stop stopColor="#d6fbff" />
          <stop offset="1" stopColor="#1b6fb4" />
        </linearGradient>
      </defs>

      <ellipse cx="56" cy="98" rx="38" ry="8" fill="#00101e" opacity=".55" />
      <rect x="29" y="72" width="61" height="15" rx="4" fill="#06558d" />
      <rect x="22" y="86" width="76" height="8" rx="3" fill="#0b77be" />
      <rect x="31" y="94" width="58" height="6" rx="3" fill="#04345d" />

      <circle cx="43" cy="59" r="28" fill="url(#pumpA)" stroke="#89eaff" strokeWidth="3" />
      <circle cx="43" cy="59" r="16" fill="#08345d" stroke="#a7f3ff" strokeWidth="3" />
      <circle className="rotor" cx="43" cy="59" r="8" fill="#58d9ff" />

      <rect x="62" y="39" width="36" height="34" rx="8" fill="url(#pumpB)" stroke="#7ee7ff" strokeWidth="3" />
      <path d="M66 45H96M66 53H96M66 61H96M66 69H96" stroke="#07375f" strokeWidth="3" opacity=".55" />

      <path d="M24 57H8C5 57 3 59 3 62V72H24" stroke="#5fdcff" strokeWidth="6" strokeLinecap="round" />
      <path d="M71 58H111C115 58 117 61 117 65V74H96" stroke="#5fdcff" strokeWidth="6" strokeLinecap="round" />

      <rect x="70" y="24" width="17" height="15" rx="4" fill="#0b77be" stroke="#91edff" strokeWidth="3" />
      <rect x="66" y="16" width="25" height="10" rx="4" fill="#075996" />
    </svg>
  );
}

function Gate3D() {
  return (
    <svg viewBox="0 0 120 120" fill="none">
      <defs>
        <linearGradient id="gateA" x1="20" y1="15" x2="100" y2="105">
          <stop stopColor="#e5f7ff" />
          <stop offset=".42" stopColor="#6c90a6" />
          <stop offset="1" stopColor="#263748" />
        </linearGradient>
        <linearGradient id="gateB" x1="25" y1="18" x2="90" y2="95">
          <stop stopColor="#8feeff" />
          <stop offset="1" stopColor="#0b4d82" />
        </linearGradient>
      </defs>

      <ellipse cx="60" cy="101" rx="42" ry="7" fill="#000a14" opacity=".55" />

      <rect x="21" y="22" width="10" height="78" rx="2" fill="url(#gateA)" />
      <rect x="89" y="22" width="10" height="78" rx="2" fill="url(#gateA)" />
      <rect x="15" y="17" width="90" height="10" rx="3" fill="url(#gateB)" />
      <rect x="18" y="92" width="84" height="9" rx="3" fill="#31566f" />

      <rect x="32" y="31" width="56" height="58" rx="3" fill="#142234" stroke="#b5d9e9" strokeWidth="4" />
      <path d="M34 33L86 87M86 33L34 87" stroke="#a9c7d9" strokeWidth="4" />
      <path d="M45 31V89M60 31V89M75 31V89" stroke="#5e7f93" strokeWidth="3" />

      <rect x="42" y="8" width="36" height="9" rx="4" fill="#7bdfff" />
      <path d="M51 8V2M69 8V2" stroke="#7bdfff" strokeWidth="5" strokeLinecap="round" />

      <path className="water" d="M23 107C34 101 45 113 56 107C67 101 78 113 91 107" stroke="#33caff" strokeWidth="4" strokeLinecap="round" opacity=".75" />
    </svg>
  );
}

function Rake3D() {
  return (
    <svg viewBox="0 0 120 120" fill="none">
      <defs>
        <linearGradient id="rakeA" x1="20" y1="10" x2="100" y2="110">
          <stop stopColor="#8feeff" />
          <stop offset=".5" stopColor="#168bd3" />
          <stop offset="1" stopColor="#05375f" />
        </linearGradient>
      </defs>

      <ellipse cx="60" cy="102" rx="42" ry="7" fill="#000a14" opacity=".5" />
      <rect x="20" y="18" width="80" height="9" rx="4" fill="url(#rakeA)" />
      <rect x="17" y="91" width="86" height="9" rx="4" fill="#126da7" />

      {[25, 37, 49, 61, 73, 85].map((x) => (
        <rect key={x} x={x} y="26" width="7" height="66" rx="2" fill="url(#rakeA)" stroke="#b5f4ff" strokeWidth="1.5" />
      ))}

      {[28, 40, 52, 64, 76, 88].map((x) => (
        <path key={x} d={`M${x} 96L${x - 5} 108`} stroke="#46cbff" strokeWidth="4" strokeLinecap="round" />
      ))}

      <path className="water" d="M19 109C31 103 43 115 55 109C67 103 79 115 101 108" stroke="#38d9ff" strokeWidth="4" strokeLinecap="round" opacity=".75" />
    </svg>
  );
}

function Inverter3D() {
  return (
    <svg viewBox="0 0 120 120" fill="none">
      <defs>
        <linearGradient id="invA" x1="23" y1="12" x2="98" y2="110">
          <stop stopColor="#d8edf5" />
          <stop offset=".45" stopColor="#516779" />
          <stop offset="1" stopColor="#1a2634" />
        </linearGradient>
        <linearGradient id="invB" x1="35" y1="20" x2="82" y2="62">
          <stop stopColor="#28394a" />
          <stop offset="1" stopColor="#071426" />
        </linearGradient>
      </defs>

      <ellipse cx="62" cy="101" rx="32" ry="8" fill="#000a14" opacity=".55" />
      <rect x="34" y="15" width="53" height="84" rx="8" fill="url(#invA)" stroke="#9fb7c6" strokeWidth="3" />
      <rect x="42" y="25" width="37" height="28" rx="4" fill="url(#invB)" stroke="#8edcff" strokeWidth="2" />

      <circle cx="51" cy="66" r="5" fill="#35d4ff" />
      <circle cx="67" cy="66" r="5" fill="#ffc83d" />
      <circle cx="51" cy="81" r="5" fill="#2cff72" />
      <circle cx="67" cy="81" r="5" fill="#ff4b43" />

      <path d="M47 39H73" stroke="#35d4ff" strokeWidth="3" strokeLinecap="round" />
      <path d="M47 46H63" stroke="#35d4ff" strokeWidth="3" strokeLinecap="round" opacity=".65" />

      <path className="gear" d="M94 58L99 61L97 67L91 68L88 73L82 70L82 64L77 60L80 54L86 54L90 49L95 52L94 58Z" fill="#2f9bff" opacity=".9" />
    </svg>
  );
}