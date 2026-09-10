import Navigation from "@/components/navigation";
import WatchParties from "@/components/watch-party/WatchParties";
import { getCatalog } from "@/lib/catalog-store";

export default async function WatchPartiesPage() { return <main className="app-shell"><Navigation/><section className="content"><WatchParties movies={await getCatalog()}/></section></main>; }
