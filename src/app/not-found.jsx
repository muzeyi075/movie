import Link from "next/link";

export default function NotFound() { return <main className="simple-state"><span className="eyebrow">404</span><h1>That title is <i>not here.</i></h1><p>It may have been removed or the link may be incorrect.</p><Link className="watch-button" href="/">Back to browsing</Link></main>; }
