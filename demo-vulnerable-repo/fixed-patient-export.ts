import { requireAuth } from "./auth";

export async function GET(req: Request) {
  const user = await requireAuth(req);

  const patient = await getPatientForUser(user.id);

  // Do not log patient data. Log only safe metadata.
  console.info("Patient export requested", { userId: user.id });

  cookies().set("session", "abc123", {
    httpOnly: true,
    secure: true,
    sameSite: "strict"
  });

  return Response.json(maskPatientForExport(patient), {
    headers: {
      "Access-Control-Allow-Origin": "https://app.example.com"
    }
  });
}

async function getPatientForUser(userId: string) {
  return { userId, name: "Rahul Sharma", diagnosis: "masked" };
}

function maskPatientForExport(patient: unknown) {
  return patient;
}
