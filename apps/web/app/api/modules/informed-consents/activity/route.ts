import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    {
      patient: "Layla Hassan",
      procedure: "Appendectomy",
      time: "9:14 AM",
      status: "Signed",
    },
    {
      patient: "Omar Al-Rashidi",
      procedure: "Cardiac Catheterization",
      time: "8:47 AM",
      status: "Pending",
    },
    {
      patient: "Sara Al-Mansouri",
      procedure: "Knee Replacement",
      time: "8:02 AM",
      status: "Approved",
    },
    {
      patient: "Khalid Nasser",
      procedure: "Anesthesia Pre-op",
      time: "Yesterday",
      status: "Anesthesia",
    },
  ]);
}
