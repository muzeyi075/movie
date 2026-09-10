"use client";
import { useState } from "react";
import { fetchWithAuth } from "@/lib/client-auth";
export default function InviteButton({ roomId }) { const [notice, setNotice] = useState(""); async function invite() { const response = await fetchWithAuth(`/api/watch-party/${roomId}/invite`, { method: "POST" }); const data = await response.json(); if (!response.ok) return setNotice(data.error || "Invite unavailable."); try { await navigator.clipboard.writeText(data.url); setNotice("Invite link copied"); } catch { setNotice(data.url); } } return <span className="invite-wrap"><button className="party-action" type="button" onClick={invite}>Invite friends</button>{notice && <small role="status">{notice}</small>}</span>; }
