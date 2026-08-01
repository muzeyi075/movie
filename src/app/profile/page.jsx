import Navigation from "@/components/navigation";
import Link from "next/link";

export default function ProfilePage() {
  return <main className="app-shell"><Navigation/><section className="content page-content"><span className="eyebrow">YOUR ACCOUNT</span><h1 className="page-title">Welcome back, <i>Jordan.</i></h1><div className="profile-card"><span className="profile-avatar">JM</span><div><h2>Jordan Miller</h2><p>jordan@example.com</p></div><span className="plan-pill">Premium trial</span></div><div className="settings-card"><h2>Account settings</h2><p>Manage your profile, preferences, and subscription from one place.</p><Link className="watch-button" href="/premium">View membership</Link></div></section></main>;
}
