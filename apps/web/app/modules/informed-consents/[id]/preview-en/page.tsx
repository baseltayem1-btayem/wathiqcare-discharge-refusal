import { redirect } from "next/navigation";

export default async function ConsentEnglishPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/modules/informed-consents/${id}/preview?lang=en`);
}
