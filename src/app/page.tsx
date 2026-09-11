import { readData } from "@/lib/store";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await readData();
  return <Dashboard initialData={data} />;
}
