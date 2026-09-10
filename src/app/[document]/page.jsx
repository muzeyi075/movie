import { notFound } from "next/navigation";
import Navigation from "@/components/navigation";

const documents = {
  privacy: { title: "Privacy", text: "Cinemora keeps your account details and viewing preferences private. We only use this information to personalize your experience and improve the service." },
  terms: { title: "Terms of Use", text: "By using Cinemora, you agree to use the service responsibly and respect the rights of the creators whose stories you enjoy." },
  cookies: { title: "Cookie Policy", text: "Cinemora uses essential cookies to remember your session, settings, and watchlist preferences across visits." },
};

export default async function DocumentPage({ params }) {
  const { document } = await params;
  const page = documents[document];
  if (!page) notFound();
  return <main className="app-shell"><Navigation/><section className="content page-content legal-page"><span className="eyebrow">CINEMORA LEGAL</span><h1 className="page-title">{page.title}</h1><article className="legal-card"><h2>Your experience matters.</h2><p>{page.text}</p><p>For questions about this policy, contact support through your profile page.</p></article></section></main>;
}
