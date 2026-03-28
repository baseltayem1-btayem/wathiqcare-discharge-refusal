// Disabled: Use backend API for login. This route is intentionally disabled.
export async function POST() {
    return Response.json({ error: "This route is disabled. Use the backend API." }, { status: 410 });
}
