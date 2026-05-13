import { useRecourse } from "@/state/recourse";
import { Landing } from "@/components/hero/Landing";
import { CaseCanvas } from "@/components/case/CaseCanvas";

export default function App() {
  const { stage } = useRecourse();
  return stage === "landing" ? <Landing /> : <CaseCanvas />;
}
