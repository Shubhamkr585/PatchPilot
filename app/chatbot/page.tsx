"use client";

import { useEffect, useState } from "react";

export default function ChatbotPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchApiTest() {
      try {
        const response = await fetch("/api/test");

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        setCode(data.text ?? "");
      } catch (err) {
        console.error(err);
        setError("Failed to load API test output.");
      } finally {
        setLoading(false);
      }
    }

    fetchApiTest();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">API Test Output</h1>

        {loading ? (
          <p className="text-slate-300">Loading...</p>
        ) : error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </p>
        ) : (
          <pre className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900 p-5 text-sm leading-7 text-slate-100 shadow-lg">
            {code}
          </pre>
        )}
      </div>
    </main>
  );
}
