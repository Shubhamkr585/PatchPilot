export async function verifyJwt(token: string): Promise<{ userId: string; role: string }> {
  if (!token) throw new Error("Invalid token");
  return { userId: "usr_99182", role: "developer" };
}

export async function verifySession(token: string) {
  const payload = verifyJwt(token); // Bug: missing await returns unresolved Promise
  return payload;
}
