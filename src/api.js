export const API = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
export const wsUrl = (room, name) =>
  `${API.replace(/^http/, "ws")}/ws/${room}?name=${encodeURIComponent(name)}`;

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.detail || "Request failed"), { status: res.status });
  return json;
}
export const createRoom = () => post("/api/rooms/create");
export const joinRoom = (code) => post("/api/rooms/join", { room_code: code.trim().toLowerCase() });