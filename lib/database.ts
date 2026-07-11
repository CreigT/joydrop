export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function databaseUnavailableResponse() {
  return Response.json(
    { error: "JoyDrop data is temporarily unavailable." },
    { status: 503 }
  );
}
