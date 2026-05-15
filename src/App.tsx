import { useRecourse } from "@/state/recourse";
import { Landing } from "@/components/hero/Landing";
import { CaseCanvas } from "@/components/case/CaseCanvas";
import { UploadFlow } from "@/components/upload/UploadFlow";

export default function App() {
  const { stage, mode } = useRecourse();

  if (mode === "upload") return <UploadFlow />;
  return stage === "landing" ? <Landing /> : <CaseCanvas />;
}
