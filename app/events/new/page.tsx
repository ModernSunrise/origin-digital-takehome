import { redirect } from 'next/navigation';

// Create is now an in-app modal (opened from the header / empty state). Keep this URL
// working for deep links by sending it home, where "Create talk" lives.
export default function NewTalkPage(): never {
  redirect('/');
}
