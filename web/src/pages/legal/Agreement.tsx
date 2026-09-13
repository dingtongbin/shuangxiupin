import { useNavigate } from "react-router";
import { NavBar } from "antd-mobile";
import { AGREEMENT_SECTIONS } from "./content";

export default function Agreement() {
  const navigate = useNavigate();
  return (
    <div>
      <NavBar onBack={() => navigate(-1)}>用户协议</NavBar>
      <LegalBody sections={AGREEMENT_SECTIONS} />
    </div>
  );
}

export function LegalBody({ sections }: { sections: { title: string; body: string[] }[] }) {
  return (
    <div className="sxu-card" style={{ lineHeight: 1.8 }}>
      {sections.map((s, i) => (
        <section key={i}>
          <h3 style={{ fontSize: 15, margin: "18px 0 8px" }}>
            {i + 1}. {s.title}
          </h3>
          {s.body.map((p, j) => (
            <p key={j} style={{ fontSize: 13.5, color: "#444", margin: "6px 0" }}>
              {p}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
