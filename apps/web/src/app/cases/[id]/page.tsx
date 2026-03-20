type Params = {
  id: string;
};

export default async function LegacyCaseDetailsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;

  return (
    <main style={{ padding: "1.5rem" }}>
      <h1>Case {id}</h1>
      <p>Placeholder scaffold for legacy src/app case details route.</p>
    </main>
  );
}
