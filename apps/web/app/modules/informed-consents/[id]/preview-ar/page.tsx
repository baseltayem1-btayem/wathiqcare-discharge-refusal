import { redirect } from "next/navigation";

export default async function ConsentArabicPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/modules/informed-consents/${id}/preview?lang=ar`);
}
