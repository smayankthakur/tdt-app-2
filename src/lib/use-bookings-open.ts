import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { StorePolicy } from '@/constants/config';
import { bookingsOpenCached, checkBookingsOpen, onBookingsOpen, savedBookings } from '@/lib/booking';

/**
 * Personal Reading is shown in the app only while the booking admin (booking.thedivinetarotonline.com/admin) has at
 * least one reading switched ON — the same as the website. Checked on every visit; the last answer is remembered.
 * Someone with a paid booking on this phone still sees it (to fill the form, join the call).
 */
export function useBookingsOpen(): boolean {
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState(false);
  useEffect(() => {
    let alive = true;
    bookingsOpenCached().then((o) => alive && setOpen(o));
    const off = onBookingsOpen((o) => alive && setOpen(o));
    return () => {
      alive = false;
      off();
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (!StorePolicy.personalReadingLink) return;
      checkBookingsOpen().catch(() => {});
      let alive = true;
      savedBookings()
        .then((list) => alive && setMine(list.some((b) => b.paid || b.done)))
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []),
  );
  return StorePolicy.personalReadingLink && (open || mine);
}
