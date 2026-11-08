import { Link } from "@tanstack/react-router";
import { CREDITS } from "../credits.ts";

export function Credits() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-2 text-2xl font-bold">Créditos</h1>
      <p className="mb-4">Os avatares de animais usam ícones do Flaticon.</p>
      <ul className="space-y-2">
        {CREDITS.map((credit) => (
          <li key={credit.avatarId}>
            <span className="font-medium">{credit.avatarName}: </span>
            <a
              href={credit.href}
              title={credit.title}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline"
            >
              {credit.text}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-6">
        <Link to="/" className="text-blue-700 underline">
          Voltar ao início
        </Link>
      </p>
    </main>
  );
}

export function CreditsLink() {
  return (
    <footer className="mt-8 text-sm">
      <Link to="/creditos" className="text-blue-700 underline">
        Créditos
      </Link>
    </footer>
  );
}
