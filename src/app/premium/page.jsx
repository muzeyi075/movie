import Navigation from "@/components/navigation";
import Link from "next/link";

export default function PremiumPage() {
  return <main className="app-shell"><Navigation/><section className="content page-content"><span className="eyebrow">CINEMORA PREMIUM</span><h1 className="page-title">More stories. <i>No limits.</i></h1><div className="pricing-card"><span className="plan-pill">MOST POPULAR</span><h2>Premium membership</h2><strong>$8.99 <small>/ month</small></strong><p>Watch every title, create your personal list, and enjoy cinematic streaming on every device.</p><Link className="watch-button" href="/profile">Start premium trial</Link></div></section></main>;
}
