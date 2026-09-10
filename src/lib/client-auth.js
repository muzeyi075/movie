import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

function waitForAuthReady() {
  if (auth.currentUser !== null) return Promise.resolve(auth.currentUser);
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function authHeaders() {
  const user = await waitForAuthReady();
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function fetchWithAuth(input, init = {}) {
  const headers = new Headers(init.headers || {});
  const authHeader = await authHeaders();
  Object.entries(authHeader).forEach(([key, value]) => headers.set(key, value));
  return fetch(input, { ...init, headers, credentials: "include" });
}
