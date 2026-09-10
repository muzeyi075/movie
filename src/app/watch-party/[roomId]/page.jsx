import Navigation from "@/components/navigation";
import WatchParty from "@/components/watch-party/WatchParty";

export default async function WatchPartyPage({ params }) { return <main className="app-shell"><Navigation/><section className="content"><WatchParty roomId={(await params).roomId}/></section></main>; }
