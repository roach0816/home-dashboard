import { readData } from "@/lib/store";
import Dashboard from "@/components/Dashboard";
import packageJson from "../../package.json";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await readData();
  return <Dashboard initialData={data} version={packageJson.version} />;
}
