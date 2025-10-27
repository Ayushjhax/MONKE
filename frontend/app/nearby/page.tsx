import NearbyDealsMap from '@/components/geo/NearbyDealsMap';

export default function NearbyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <NearbyDealsMap />
      </div>
    </div>
  );
}

