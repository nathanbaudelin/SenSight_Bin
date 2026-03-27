import { NextResponse } from "next/server";

const mockNetworks = [
  {
    id: "bin-01",
    ssid: "BIN_BCN_001",
    rssi: -42,
    secure: true,
    channel: 6,
    distance: "20 m",
  },
  {
    id: "bin-02",
    ssid: "BIN_BCN_014",
    rssi: -55,
    secure: true,
    channel: 11,
    distance: "65 m",
  },
  {
    id: "bin-03",
    ssid: "BIN_BCN_027",
    rssi: -61,
    secure: false,
    channel: 1,
    distance: "110 m",
  },
  {
    id: "bin-04",
    ssid: "BIN_BCN_036",
    rssi: -72,
    secure: true,
    channel: 3,
    distance: "180 m",
  },
];

export async function GET() {
  return NextResponse.json({
    networks: mockNetworks,
    updatedAt: new Date().toISOString(),
  });
}
