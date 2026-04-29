import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Boat Simulator',
  description: 'Realtime bait-boat telemetry & control simulator',
};

export default function BoatSimulatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
