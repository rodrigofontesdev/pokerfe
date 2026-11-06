import { Link } from "@tanstack/react-router";

export function RoomNotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold">Sala não encontrada ou expirada</h1>
      <Link
        to="/"
        className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
      >
        Criar nova sala
      </Link>
    </main>
  );
}
