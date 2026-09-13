import { useNavigate } from "react-router";
import { NavBar } from "antd-mobile";
import { LegalBody } from "./Agreement";
import { PRIVACY_SECTIONS } from "./content";

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div>
      <NavBar onBack={() => navigate(-1)}>隐私政策</NavBar>
      <LegalBody sections={PRIVACY_SECTIONS} />
    </div>
  );
}
