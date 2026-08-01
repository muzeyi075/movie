"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function Icon({ name, size = 20 }) {
  const paths = { home: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />, compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.4 4.1-4.2 2.4 2.4-4.2Z" /></>, bookmark: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />, user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4 3.4-6 8-6s7.2 2 8 6" /></>, chevron: <path d="m9 18 6-6-6-6" /> };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const links = [{ href: "/", label: "Home", icon: "home" }, { href: "/discover", label: "Discover", icon: "compass" }, { href: "/my-list", label: "My List", icon: "bookmark" }, { href: "/admin", label: "Admin", icon: "user" }];

export default function Navigation() {
  const pathname = usePathname();
  const isActive = (href) => pathname === href;

  return <>
    <aside className="sidebar"><Link className="brand" href="/"><span className="brand-mark">C</span>CINEMORA</Link><nav>{links.map((link) => <Link className={isActive(link.href) ? "active" : ""} href={link.href} key={link.href}><Icon name={link.icon} />{link.label}</Link>)}</nav><div className="side-promo"><span>PREMIUM</span><h3>Unlimited movies, one place.</h3><p>Unlock the full Cinemora experience.</p><Link href="/premium">Get Premium</Link></div><Link className="account" href="/profile"><span className="avatar">JM</span><span><b>Jordan Miller</b><small>Manage account</small></span><Icon name="chevron" size={16} /></Link></aside>
    <nav className="mobile-nav">{[...links, { href: "/profile", label: "Profile", icon: "user" }].map((link) => <Link className={isActive(link.href) ? "active" : ""} href={link.href} key={link.href}><Icon name={link.icon}/><span>{link.label}</span></Link>)}</nav>
  </>;
}
