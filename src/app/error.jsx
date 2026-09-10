"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) { useEffect(() => { console.error(error); }, [error]); return <main className="simple-state"><span className="eyebrow">SOMETHING WENT WRONG</span><h1>We could not load this <i>page.</i></h1><p>Please try again. If the issue continues, check your connection and configuration.</p><button className="watch-button" onClick={reset}>Try again</button></main>; }
