import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PackageSelector from '../components/PackageSelector';
import AvailabilityChecker from '../components/AvailabilityChecker';
import BookingForm from '../components/BookingForm';
import BookingReceipt from '../components/BookingReceipt';

const VALID_EVENT_TYPES = ['wedding', 'birthday', 'bhagwat', 'jagran', 'orchestra', 'dj_night'];

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type');
  const initialEventType = VALID_EVENT_TYPES.includes(typeParam) ? typeParam : undefined;

  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSoundSet, setSelectedSoundSet] = useState(null);
  const [bookingResponse, setBookingResponse] = useState(null);

  const reset = () => {
    setSelectedPackage(null);
    setSelectedDate('');
    setSelectedSoundSet(null);
    setBookingResponse(null);
  };

  if (bookingResponse) {
    return <BookingReceipt bookingResponse={bookingResponse} onReset={reset} />;
  }

  return (
    <div>
      <PackageSelector
        selectedPackage={selectedPackage}
        onSelectPackage={setSelectedPackage}
        initialEventType={initialEventType}
      />
      <AvailabilityChecker
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        selectedSoundSet={selectedSoundSet}
        onSelectSoundSet={setSelectedSoundSet}
      />
      <BookingForm
        selectedPackage={selectedPackage}
        selectedSoundSet={selectedSoundSet}
        selectedDate={selectedDate}
        onBookingComplete={setBookingResponse}
      />
    </div>
  );
}
