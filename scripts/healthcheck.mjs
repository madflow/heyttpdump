try {
  const response = await fetch(`http://127.0.0.1:${process.env.API_PORT || "3001"}/ready`, {
    signal: AbortSignal.timeout(2000),
  });
  await response.body?.cancel();
  process.exitCode = response.ok ? 0 : 1;
} catch {
  process.exitCode = 1;
}
