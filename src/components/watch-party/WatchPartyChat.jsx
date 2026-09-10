"use client";
import { useState } from "react";

export default function WatchPartyChat({ messages, onSend }) {
  const [message, setMessage] = useState("");
  function submit(event) { event.preventDefault(); if (!message.trim()) return; onSend(message); setMessage(""); }
  return <section className="party-chat"><div className="party-panel-title"><span>Live chat</span><small>{messages.length} recent</small></div><div className="party-messages" aria-live="polite">{messages.length ? messages.map((item) => <article key={item._id || `${item.createdAt}-${item.userId}`}><strong>{item.username}</strong><p>{item.message}</p></article>) : <p className="party-empty">Start the conversation.</p>}</div><form className="party-chat-form" onSubmit={submit}><input value={message} maxLength={500} onChange={(event) => setMessage(event.target.value)} placeholder="Write a message..." aria-label="Chat message"/><button type="submit">Send</button></form></section>;
}
