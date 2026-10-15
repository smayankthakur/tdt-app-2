/**
 * Personal Reading content — copied from booking.thedivinetarotonline.com (components/Landing.tsx and
 * components/ReadingForm.tsx). `text` is sent to the booking server as it is, so keep it byte-for-byte the
 * same as the website's (typos included). `label` is the cleaned-up text shown on the chip.
 */
export const CONCERNS: { icon: string; text: string; label: string }[] = [
  { icon: '💍', text: 'Aapki Shaadi nahi horahi?', label: 'Shaadi nahi ho rahi?' },
  { icon: '💼', text: 'Career ko lekar Tension hai', label: 'Career ko lekar tension hai' },
  { icon: '🔀', text: 'Third Party situation main stuck hai', label: 'Third-party situation mein phanse hain' },
  { icon: '💭', text: 'Partner ki current feelings or actions jaanne hai', label: 'Partner ki abhi ki feelings aur actions jaanni hain' },
  { icon: '🤝', text: 'Partner ke sath reunion ya reconcilation ka pata lagana hai', label: 'Partner ke saath reunion ya patch-up hoga ya nahi' },
  { icon: '🕉️', text: 'Apni Spritual Journey Jaanni haii', label: 'Apni spiritual journey jaanni hai' },
  { icon: '🧭', text: 'Aapna Life Purpose Jaanna hai', label: 'Apna life purpose jaanna hai' },
  { icon: '💰', text: 'Financial tension bohot hai', label: 'Paison ki tension bahut hai' },
  { icon: '🧿', text: 'Black magic ka Doubt hai', label: 'Black magic ka shak hai' },
  { icon: '🩺', text: 'Health ko lekar pareshan hai', label: 'Health ko lekar pareshaan hain' },
  { icon: '👶', text: 'Bacha kab hoga?', label: 'Baccha kab hoga?' },
  { icon: '❤️', text: 'Current Ya Ex Partner se Shaadi hogi?', label: 'Current ya ex partner se shaadi hogi?' },
];

/** Full terms & conditions (English, as on the booking website). {urgent}/{price}/{regular}/{until} are filled in. */
export const TERMS: string[] = [
  'We are certified and experienced in Astrology, Numerology, Psychic Tarot Card Reading, Vedic Kundli Analysis, Candle Wax Reading, Coffee Cup Reading, and other spiritual guidance practices.',
  'We do not provide sugar-coated readings. Our purpose is to deliver honest messages as guided by the universe with complete sincerity.',
  'We strictly DO NOT offer any services related to Tantra, Vashikaran, black magic, or any unethical practices. Please do not request such services.',
  'We do not provide readings on: legal matters, court cases, share market, lottery, gambling, child gender prediction, or explicit/sexual questions.',
  'Appointment timing: slots run every day from 12 PM to 9 PM IST (last slot 9 PM). A standard booking gets the earliest free slot 7–10 days after payment. No appointments are given on festival days. If you need the reading sooner, book the Urgent reading ({urgent}), which gets a slot within 48 hours of payment.',
  '{offer}',
  'Your call takes place on Google Meet at the slot assigned to you — the slot, link and schedule are emailed to you as soon as you submit the form after payment. Please join on time from a stable network; if repeated connection issues occur, the appointment may be cancelled.',
  'Late arrival: we wait a maximum of 5 minutes after your slot starts. If you have not joined the Google Meet by then, the appointment is treated as missed. Once your slot time is over, the appointment cannot be rescheduled, and no refund is given.',
  'You may ask about up to 3 people in one reading, only those whose details you submit in the form.',
  'All readings are for guidance purposes only. Please use your own judgment and decision-making.',
  'When asking about another person’s feelings, please understand that energies and emotions can change over time, as every individual has free will.',
  'We do not offer FREE readings under any circumstances.',
  'No Refund Policy: once payment is made, it is non-refundable under any situation. Please make your payment only after reading all details carefully.',
  'Your privacy is our priority. All information shared (name, photos, personal details) is kept strictly confidential.',
  'This is a safe and judgment-free space. No matter your situation (including relationships, personal choices, or identity), you are respected and heard with compassion.',
  '“The Divine Tarot” is a legally registered brand. Any unauthorized copying of content, name, or material may lead to legal action.',
  'By paying, you agree to share the information entered with The Divine Tarot and Razorpay, in accordance with applicable laws.',
];
