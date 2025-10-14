import { redirect } from 'next/navigation';

export default function RootPage() {
  // In a real app, you'd check for auth status here.
  // For this demo, we'll always start at the welcome page.
  redirect('/welcome');
}
